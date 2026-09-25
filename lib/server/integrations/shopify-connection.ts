import "server-only";
import { randomBytes } from "node:crypto";
import { BackendError } from "../errors";
import { ShopifyAdapter, validateShopDomain } from "./shopify";
import type {
  CredentialStore,
  StoredIntegrationConnection,
} from "../security/credentials";
import type {
  ShopifyContext,
  ShopifyStore,
  StateRecord,
} from "../shopify/contracts";
import type { ShopifyConfig } from "../shopify/config";
import { ShopifyVault } from "../shopify/vault";
import {
  oauthTrace,
  credentialFingerprints,
  diagnosticCode,
  fingerprint,
} from "../shopify/diagnostics";
import {
  callbackParameters,
  digestState,
  requestTokens,
} from "../shopify/protocol";
export type ShopifyOAuthState = StateRecord;
export interface ShopifyOAuthStateStore {
  begin(
    shop: string,
    digest: string,
    redirectUri: string,
  ): Promise<StateRecord>;
  consume(digest: string, shop: string): Promise<StateRecord | null>;
}
export class ShopifyConnectionService {
  constructor(
    private context: ShopifyContext,
    private store: ShopifyStore,
    private config: ShopifyConfig,
    private vault: ShopifyVault,
    private transport: typeof fetch = fetch,
  ) {}
  private owner() {
    if (this.context.role !== "owner" || this.context.source !== "live")
      throw new BackendError(
        "NOT_AUTHORIZED",
        "Only a workspace owner can connect Shopify.",
      );
  }
  async begin(
    shopDomain: string,
    options?: { replace: boolean; expectedGeneration: number },
  ) {
    this.owner();
    const shop = validateShopDomain(shopDomain);
    const state = randomBytes(32).toString("hex");
    await this.store.begin(
      shop,
      digestState(state),
      this.config.redirectUri,
      options,
    );
    oauthTrace(state, this.context.businessId)("START", "PASS", {
      ...credentialFingerprints(this.config.clientId, this.config.clientSecret),
      shopHash: fingerprint(shop),
    });
    const url = new URL(`https://${shop}/admin/oauth/authorize`);
    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      scope: this.config.scopes.join(","),
      redirect_uri: this.config.redirectUri,
      state,
    }).toString();
    return { state, url: url.href };
  }
  async complete(params: URLSearchParams, browserState: string | undefined) {
    this.owner();
    const trace = oauthTrace(browserState, this.context.businessId);
    trace(
      "CONFIG",
      "INFO",
      credentialFingerprints(this.config.clientId, this.config.clientSecret),
    );
    const callback = callbackParameters(
      params,
      this.config.clientSecret,
      browserState,
      Date.now(),
      trace,
    );
    const state = await this.store
      .consume(digestState(callback.state), callback.shop)
      .catch((error: unknown) => {
        trace("U", "FAIL", { code: diagnosticCode(error) });
        throw error;
      });
    if (
      !state ||
      state.organizationId !== this.context.organizationId ||
      state.businessId !== this.context.businessId ||
      state.actorId !== this.context.actorId ||
      state.shopDomain !== callback.shop
    ) {
      trace("U", "FAIL", { code: "INVALID_STATE" });
      throw new BackendError(
        "INVALID_STATE",
        "The connection link expired. Please connect again.",
      );
    }
    // The existing consume RPC atomically enforces expiry, replay and shop binding.
    trace("U", "PASS");
    trace("I", "PASS");
    trace("J", "PASS");
    trace("K", "PASS", { shopHash: fingerprint(state.shopDomain) });
    let checkpoint: "O" | "R" | "STAGE" | "S" | "T" = "O";
    try {
      if (state.redirectUri !== this.config.redirectUri)
        throw new BackendError(
          "INVALID_STATE",
          "Start a new Shopify connection.",
        );
      const tokens = await requestTokens(
        this.config,
        callback.shop,
        { code: callback.code },
        this.transport,
        Date.now(),
        trace,
      );
      checkpoint = "R";
      const cipher = this.vault.seal(
        this.context,
        state.connectionId,
        JSON.stringify(tokens),
      );
      trace("R", "PASS");
      checkpoint = "STAGE";
      await this.store.stage(state, cipher, tokens);
      trace("STAGE", "PASS");
      checkpoint = "S";
      // Verify only this attempt’s staged credential. The current connection remains active until commit.
      const connection: StoredIntegrationConnection = {
        id: state.connectionId,
        organizationId: state.organizationId,
        integration: "shopify",
        status: "connected",
        shopDomain: state.shopDomain,
        grantedScopes: tokens.scopes,
        credentialReference: cipher.id,
        lastSyncAt: null,
        health: "unknown",
      };
      const credentials: CredentialStore = {
        persistence: "durable",
        save: async () => {
          throw new BackendError("NOT_AUTHORIZED", "Unavailable operation.");
        },
        revoke: async () => {
          throw new BackendError("NOT_AUTHORIZED", "Unavailable operation.");
        },
        withSecret: async (org, ref, purpose, consumeSecret) => {
          if (
            org !== state.organizationId ||
            ref !== cipher.id ||
            purpose !== "integration:shopify"
          )
            throw new BackendError("NOT_AUTHORIZED", "Credential mismatch.");
          const row = await this.store.secret(ref, state);
          const value = JSON.parse(
            this.vault.open(
              this.context,
              state.connectionId,
              ref,
              purpose,
              row,
            ),
          );
          return consumeSecret(value.accessToken);
        },
      };
      const adapter = new ShopifyAdapter(
        this.context,
        state.connectionId,
        {
          get: async (org, id) =>
            org === state.organizationId && id === state.connectionId
              ? connection
              : null,
        },
        credentials,
        async (url, options) => {
          const response = await this.transport(url, options);
          trace("S", "INFO", { httpStatus: response.status });
          return response;
        },
      );
      const shop = await adapter.executeRead({ tool: "getStore", input: {} });
      if (
        !shop ||
        !("domain" in shop) ||
        shop.domain !== state.shopDomain ||
        !/^gid:\/\/shopify\/Shop\/\d+$/.test(shop.id)
      )
        throw new BackendError(
          "SHOP_MISMATCH",
          "Shopify returned a different store.",
        );
      trace("S", "PASS");
      checkpoint = "T";
      await this.store.commit(state, cipher, tokens, shop);
      trace("T", "PASS");
      return shop;
    } catch (error) {
      trace(checkpoint, "FAIL", { code: diagnosticCode(error) });
      await this.store.abort(state);
      trace("CLEANUP", "PASS");
      throw new BackendError(
        "CONNECTION_FAILED",
        "Shopify could not be connected. Please try connecting again.",
      );
    }
  }
}
