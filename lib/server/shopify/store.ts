import "server-only";
import { persistenceClient, sessionClient, databaseError } from "../db/client";
import { BackendError } from "../errors";
import type {
  ShopifyStore,
  ShopifyContext,
  ShopifyRecord,
  StateRecord,
  CipherRecord,
  TokenSet,
  ShopifyHealth,
} from "./contracts";
function state(row: Record<string, unknown>): StateRecord {
  return {
    stateDigest: String(row.digest),
    organizationId: String(row.organization_id),
    businessId: String(row.business_id),
    actorId: String(row.actor_id),
    shopDomain: String(row.shop),
    expiresAt: String(row.expires_at),
    redirectUri: String(row.redirect_uri),
    connectionId: String(row.connection_id),
    generation: Number(row.generation),
  };
}
export class PostgresShopifyStore implements ShopifyStore {
  constructor(private context: ShopifyContext) {}
  async get(): Promise<ShopifyRecord | null> {
    const client = await sessionClient();
    const { data, error } = await client
      .from("integration_connections")
      .select(
        "id,organization_id,business_id,provider,external_account_identifier,display_name,status,credential_reference,granted_capabilities,connection_health,shop_id,currency,connected_at,last_verified_at,last_sync_at,generation,pending_shop,pending_expires_at,access_expires_at,refresh_expires_at",
      )
      .eq("organization_id", this.context.organizationId)
      .eq("business_id", this.context.businessId)
      .eq("provider", "shopify")
      .maybeSingle();
    databaseError(error);
    return data as ShopifyRecord | null;
  }
  private async operation(
    operation: string,
    payload: Record<string, unknown> = {},
  ) {
    const { data, error } = await persistenceClient().rpc("shopify_operation", {
      operation,
      org: this.context.organizationId,
      business: this.context.businessId,
      actor: this.context.actorId,
      payload,
    });
    if (error) {
      if (error.code === "23505")
        throw new BackendError(
          "SHOP_ALREADY_LINKED",
          "This store is already linked to a workspace.",
        );
      const safe = [
        "NOT_AUTHORIZED",
        "INVALID_STATE",
        "INVALID_LEASE",
        "SHOP_MISMATCH",
        "NOT_CONNECTED",
        "REFRESH_IN_PROGRESS",
        "SHOP_ALREADY_LINKED",
        "CONNECTION_CHANGED",
        "REPLACEMENT_CONFIRMATION_REQUIRED",
      ].includes(error.message)
        ? error.message
        : "DATABASE_UNAVAILABLE";
      throw new BackendError(
        safe,
        "The Shopify connection could not be updated.",
      );
    }
    return data;
  }
  async begin(
    shop: string,
    digest: string,
    redirectUri: string,
    options?: { replace: boolean; expectedGeneration: number },
  ) {
    return state(
      await this.operation("begin", { shop, digest, redirectUri, ...options }),
    );
  }
  async consume(digest: string, shop: string) {
    const row = await this.operation("consume", { digest, shop });
    return row ? state(row) : null;
  }
  async secret(reference: string, proof?: StateRecord): Promise<CipherRecord> {
    return await this.operation("secret", {
      reference,
      ...(proof ? { digest: proof.stateDigest } : {}),
    });
  }
  async stage(s: StateRecord, envelope: CipherRecord, t: TokenSet) {
    await this.operation("stage", {
      digest: s.stateDigest,
      envelope,
      accessExpiresAt: t.accessExpiresAt,
      refreshExpiresAt: t.refreshExpiresAt,
    });
  }
  async abort(s: StateRecord) {
    await this.operation("abort", { generation: s.generation });
  }
  async commit(
    s: StateRecord,
    envelope: CipherRecord,
    t: TokenSet,
    shop: { id: string; name: string; domain: string; currencyCode: string },
  ) {
    await this.operation("commit", {
      digest: s.stateDigest,
      envelope,
      shop,
      scopes: t.scopes,
      accessExpiresAt: t.accessExpiresAt,
      refreshExpiresAt: t.refreshExpiresAt,
    });
  }
  async lockRefresh(reference: string): Promise<string | null> {
    return await this.operation("lock_refresh", { reference });
  }
  async rotate(
    reference: string,
    lease: string,
    envelope: CipherRecord,
    t: TokenSet,
  ) {
    await this.operation("rotate", {
      reference,
      lease,
      envelope,
      accessExpiresAt: t.accessExpiresAt,
      refreshExpiresAt: t.refreshExpiresAt,
    });
  }
  async unhealthy(health: ShopifyHealth, lease?: string, generation?: number) {
    await this.operation("unhealthy", {
      health,
      ...(generation === undefined ? {} : { generation }),
      ...(lease ? { lease } : {}),
    });
  }
  async disconnect(expectedGeneration?: number) {
    await this.operation(
      "disconnect",
      expectedGeneration === undefined ? {} : { expectedGeneration },
    );
  }
  async observed(reference: string) {
    await this.operation("observed", { reference });
  }
}
