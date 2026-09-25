/** Browser-safe connection summary. Never includes a credential reference or encrypted envelope. */
export interface ShopifySummary {
  organizationId: string;
  businessId: string;
  generation: number;
  permissions: string[];
  connectedAt: string | null;
  pendingDomain: string | null;
  pendingExpiresAt: string | null;
  configured: boolean;
  available: boolean;
  owner: boolean;
  linked: boolean;
  connected: boolean;
  name: string;
  domain: string | null;
  health:
    | "CONNECTED"
    | "NEEDS_REAUTHORIZATION"
    | "MISSING_SCOPE"
    | "TOKEN_REFRESH_FAILED"
    | "DISCONNECTED"
    | "ERROR";
  verifiedAt: string | null;
  syncedAt: string | null;
  currency: string | null;
  features: {
    products: boolean;
    orders: boolean;
    customers: boolean;
    inventory: boolean;
  };
}
