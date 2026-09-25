import "server-only";
import type {
  CredentialStore,
  CredentialPurpose,
} from "../security/credentials";
import type { ShopifyStore, ShopifyContext, TokenSet } from "./contracts";
import type { ShopifyConfig } from "./config";
import { ShopifyVault } from "./vault";
import { requestTokens } from "./protocol";
import { BackendError } from "../errors";
function tokens(value: string): TokenSet {
  try {
    const data = JSON.parse(value);
    if (
      typeof data.accessToken !== "string" ||
      typeof data.refreshToken !== "string" ||
      !Number.isFinite(Date.parse(data.accessExpiresAt)) ||
      !Number.isFinite(Date.parse(data.refreshExpiresAt)) ||
      !Array.isArray(data.scopes)
    )
      throw new Error();
    return data;
  } catch {
    throw new BackendError(
      "VAULT_UNAVAILABLE",
      "Secure connection storage is unavailable.",
    );
  }
}
/** Existing CredentialStore contract: adapter receives an access token only, never refresh material. */
export class ShopifyTokenStore implements CredentialStore {
  readonly persistence = "durable" as const;
  constructor(
    private context: ShopifyContext,
    private connectionId: string,
    private store: ShopifyStore,
    private vault: ShopifyVault,
    private config: ShopifyConfig,
    private transport: typeof fetch = fetch,
    private now = () => Date.now(),
  ) {}
  async save(): Promise<string> {
    throw new BackendError(
      "NOT_AUTHORIZED",
      "Use the verified Shopify connection flow.",
    );
  }
  async revoke(org: string, reference: string) {
    if (
      org !== this.context.organizationId ||
      (await this.store.get())?.credential_reference !== reference
    )
      throw new BackendError("NOT_AUTHORIZED", "Connection mismatch.");
    await this.store.disconnect();
  }
  private async load(reference: string) {
    return tokens(
      this.vault.open(
        this.context,
        this.connectionId,
        reference,
        "integration:shopify",
        await this.store.secret(reference),
      ),
    );
  }
  async withSecret<T>(
    org: string,
    reference: string,
    purpose: CredentialPurpose,
    consumeSecret: (secret: string) => Promise<T>,
  ): Promise<T> {
    if (
      org !== this.context.organizationId ||
      purpose !== "integration:shopify"
    )
      throw new BackendError("NOT_AUTHORIZED", "Credential purpose mismatch.");
    let token = await this.load(reference);
    if (Date.parse(token.accessExpiresAt) <= this.now() + 60000) {
      const lease = await this.store.lockRefresh(reference);
      if (!lease) {
        token = await this.load(reference);
        if (Date.parse(token.accessExpiresAt) <= this.now() + 60000)
          throw new BackendError(
            "REFRESH_IN_PROGRESS",
            "The store connection is updating. Try again shortly.",
          );
      } else {
        try {
          token = await this.load(reference);
          if (Date.parse(token.refreshExpiresAt) <= this.now())
            throw new BackendError(
              "NEEDS_REAUTHORIZATION",
              "Reconnect Shopify to continue.",
            );
          const row = await this.store.get();
          if (!row?.external_account_identifier || row.id !== this.connectionId)
            throw new BackendError("NOT_CONNECTED", "Shopify is disconnected.");
          const updated = await requestTokens(
            this.config,
            row.external_account_identifier,
            { refreshToken: token.refreshToken },
            this.transport,
            this.now(),
          );
          const cipher = this.vault.seal(
            this.context,
            this.connectionId,
            JSON.stringify(updated),
            reference,
          );
          await this.store.rotate(reference, lease, cipher, updated);
          token = updated;
        } catch (error) {
          await this.store.unhealthy(
            error instanceof BackendError &&
              error.code === "NEEDS_REAUTHORIZATION"
              ? "NEEDS_REAUTHORIZATION"
              : "TOKEN_REFRESH_FAILED",
            lease,
          );
          throw new BackendError(
            "TOKEN_REFRESH_FAILED",
            "Reconnect Shopify to restore access.",
          );
        }
      }
    }
    // Recheck after the lease and before sending any request: a disconnect/reconnect may have intervened.
    const current = await this.store.get();
    if (
      current?.id !== this.connectionId ||
      current.status !== "connected" ||
      current.credential_reference !== reference
    )
      throw new BackendError("NOT_CONNECTED", "Shopify is disconnected.");
    return consumeSecret(token.accessToken);
  }
}
