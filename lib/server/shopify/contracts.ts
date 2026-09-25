import "server-only";
import type { WorkspaceContext } from "../auth/context";
export type ShopifyHealth =
  | "CONNECTED"
  | "NEEDS_REAUTHORIZATION"
  | "MISSING_SCOPE"
  | "TOKEN_REFRESH_FAILED"
  | "DISCONNECTED"
  | "ERROR";
export interface ShopifyRecord {
  id: string;
  organization_id: string;
  business_id: string;
  external_account_identifier: string | null;
  display_name: string;
  status: string;
  credential_reference: string | null;
  granted_capabilities: string[];
  connection_health: ShopifyHealth;
  shop_id: string | null;
  currency: string | null;
  connected_at: string | null;
  last_verified_at: string | null;
  last_sync_at: string | null;
  generation: number;
  pending_shop: string | null;
  pending_expires_at: string | null;
  access_expires_at: string | null;
  refresh_expires_at: string | null;
}
export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  scopes: string[];
}
export interface CipherRecord {
  id: string;
  organizationId: string;
  businessId: string;
  connectionId: string;
  purpose: "integration:shopify";
  keyVersion: string;
  nonce: string;
  ciphertext: string;
  tag: string;
}
export interface StateRecord {
  stateDigest: string;
  organizationId: string;
  businessId: string;
  actorId: string;
  shopDomain: string;
  expiresAt: string;
  redirectUri: string;
  connectionId: string;
  generation: number;
}
export interface ShopifyStore {
  get(): Promise<ShopifyRecord | null>;
  begin(
    shop: string,
    digest: string,
    redirectUri: string,
    options?: { replace: boolean; expectedGeneration: number },
  ): Promise<StateRecord>;
  consume(digest: string, shop: string): Promise<StateRecord | null>;
  secret(reference: string, state?: StateRecord): Promise<CipherRecord>;
  stage(
    state: StateRecord,
    cipher: CipherRecord,
    tokens: TokenSet,
  ): Promise<void>;
  abort(state: StateRecord): Promise<void>;
  commit(
    state: StateRecord,
    cipher: CipherRecord,
    tokens: TokenSet,
    shop: { id: string; name: string; domain: string; currencyCode: string },
  ): Promise<void>;
  lockRefresh(reference: string): Promise<string | null>;
  rotate(
    reference: string,
    lease: string,
    cipher: CipherRecord,
    tokens: TokenSet,
  ): Promise<void>;
  unhealthy(
    health: ShopifyHealth,
    lease?: string,
    generation?: number,
  ): Promise<void>;
  disconnect(expectedGeneration?: number): Promise<void>;
  observed(reference: string): Promise<void>;
}
export type ShopifyContext = WorkspaceContext;
