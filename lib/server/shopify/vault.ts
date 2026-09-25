import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { BackendError } from "../errors";
import type { CipherRecord, ShopifyContext } from "./contracts";
function blocked(): never {
  throw new BackendError(
    "VAULT_UNAVAILABLE",
    "Secure connection storage is unavailable.",
  );
}
/** Standard AES-256-GCM. Keys must be injected from the deployment's managed secret store. */
export class ShopifyVault {
  #keys: Map<string, Buffer>;
  #active: string;
  constructor(keys: Record<string, string>, active: string) {
    this.#keys = new Map();
    this.#active = active;
    for (const [version, encoded] of Object.entries(keys)) {
      if (!/^[a-zA-Z0-9_-]{1,40}$/.test(version) || typeof encoded !== "string")
        blocked();
      const key = Buffer.from(encoded, "base64");
      if (key.length !== 32 || key.toString("base64") !== encoded) blocked();
      this.#keys.set(version, key);
    }
    if (!this.#keys.has(active) || this.#keys.size > 5) blocked();
  }
  static fromEnvironment() {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.SHOPIFY_VAULT_KEY_SOURCE !== "managed-secret-store"
    )
      blocked();
    try {
      return new ShopifyVault(
        JSON.parse(process.env.SHOPIFY_VAULT_KEYS ?? "{}"),
        process.env.SHOPIFY_VAULT_ACTIVE_KEY ?? "",
      );
    } catch {
      return blocked();
    }
  }
  private aad(row: Omit<CipherRecord, "nonce" | "tag" | "ciphertext">) {
    return Buffer.from(
      JSON.stringify([
        "anti-nerd-shopify-v1",
        row.id,
        row.organizationId,
        row.businessId,
        row.connectionId,
        row.purpose,
        row.keyVersion,
      ]),
    );
  }
  seal(
    context: ShopifyContext,
    connectionId: string,
    value: string,
    id: string = randomUUID(),
  ): CipherRecord {
    if (context.source !== "live" || value.length > 20000) blocked();
    const row = {
      id,
      organizationId: context.organizationId,
      businessId: context.businessId,
      connectionId,
      purpose: "integration:shopify" as const,
      keyVersion: this.#active,
    };
    const nonce = randomBytes(12),
      cipher = createCipheriv(
        "aes-256-gcm",
        this.#keys.get(this.#active)!,
        nonce,
      );
    cipher.setAAD(this.aad(row));
    return {
      ...row,
      nonce: nonce.toString("base64"),
      ciphertext: Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final(),
      ]).toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
    };
  }
  open(
    context: ShopifyContext,
    connectionId: string,
    reference: string,
    purpose: string,
    row: CipherRecord,
  ): string {
    if (
      context.source !== "live" ||
      context.organizationId !== row.organizationId ||
      context.businessId !== row.businessId ||
      connectionId !== row.connectionId ||
      reference !== row.id ||
      purpose !== "integration:shopify" ||
      row.purpose !== purpose
    )
      blocked();
    try {
      const key = this.#keys.get(row.keyVersion);
      if (!key) blocked();
      const nonce = Buffer.from(row.nonce, "base64"),
        tag = Buffer.from(row.tag, "base64");
      if (nonce.length !== 12 || tag.length !== 16) blocked();
      const decipher = createDecipheriv("aes-256-gcm", key, nonce);
      decipher.setAAD(this.aad(row));
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(Buffer.from(row.ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      return blocked();
    }
  }
}
