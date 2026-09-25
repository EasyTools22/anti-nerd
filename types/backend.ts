/** Safe contracts. No credentials, transports, SDKs or environment access here. */
export type ProviderId =
  "anti-nerd" | "openai" | "anthropic" | "google" | "mock";
export type IntegrationId =
  | "shopify"
  | "woocommerce"
  | "meta_ads"
  | "tiktok_ads"
  | "google_ads"
  | "email";
export type AgentId =
  | "store"
  | "product"
  | "research"
  | "ads"
  | "creative"
  | "support"
  | "finance"
  | "operations";
export type UsageMode = "credits" | "own_account";
export interface ProviderCapabilities {
  generateText: boolean;
  reason: boolean;
  structuredOutput: boolean;
  toolUse: boolean;
  vision: boolean;
  longContext: boolean;
  maxContextTokens: number;
}
export interface ProviderConnection {
  organizationId: string;
  provider: ProviderId;
  status: "not_connected" | "connected" | "unavailable";
  modelPreference: string | null;
  usageMode: UsageMode;
  persistence: "pending" | "durable";
}
export type Capability =
  | "store.read"
  | "store.write"
  | "store.publish"
  | "products.read"
  | "products.write"
  | "products.price.write"
  | "products.delete"
  | "orders.read"
  | "orders.write"
  | "orders.refund"
  | "customers.read"
  | "inventory.read"
  | "inventory.write"
  | "discounts.read"
  | "discounts.write"
  | "fulfillment.read"
  | "fulfillment.write";
export type PolicyMode =
  "DENIED" | "READ_ONLY" | "ASK_FIRST" | "AUTOMATIC_WITH_LIMITS" | "AUTOMATIC";
export type Impact = "read" | "write" | "high_impact";
export interface Money {
  amountMinor: number;
  currency: "EUR" | "USD" | "GBP";
}
export interface PageInput {
  first?: number;
  after?: string;
}
export interface Page<T> {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}
export interface StoreSummary {
  id: string;
  name: string;
  domain: string;
  currencyCode: string;
}
export interface ProductSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
}
export interface OrderSummary {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
}
export interface CustomerSummary {
  id: string;
  numberOfOrders: string;
}
export interface InventorySummary {
  id: string;
  sku: string | null;
  tracked: boolean;
}
export interface ToolInputs {
  getStore: Record<string, never>;
  listProducts: PageInput;
  getProduct: { productId: string };
  listOrders: PageInput;
  getOrder: { orderId: string };
  listCustomers: PageInput;
  getInventory: PageInput;
  updateProduct: { productId: string; title: string };
  updateProductPrice: {
    productId: string;
    variantId: string;
    currentPrice: Money;
    newPrice: Money;
  };
  updateInventory: {
    inventoryItemId: string;
    locationId: string;
    quantity: number;
  };
  createDiscount: { code: string; percentage: number; endsAt: string };
  refundOrder: { orderId: string; amount: Money };
  publishStoreChange: { changeId: string };
}
export interface ToolOutputs {
  getStore: StoreSummary;
  listProducts: Page<ProductSummary>;
  getProduct: ProductSummary | null;
  listOrders: Page<OrderSummary>;
  getOrder: OrderSummary | null;
  listCustomers: Page<CustomerSummary>;
  getInventory: Page<InventorySummary>;
}
export type ToolName = keyof ToolInputs;
export type ReadToolName = keyof ToolOutputs;
export type ToolCall = {
  [K in ToolName]: { tool: K; input: ToolInputs[K] };
}[ToolName];
export type ReadToolCall = Extract<ToolCall, { tool: ReadToolName }>;
export type ActionProposal = ToolCall & { reason: string; confidence: number };
export interface ToolDefinition {
  name: ToolName;
  actionType: string;
  capability: Capability;
  impact: Impact;
  implemented: boolean;
  description: string;
}
export interface PolicyRule {
  mode: PolicyMode;
  limits?: { currency: Money["currency"]; maxNewPriceMinor: number };
}
export interface OrganizationPolicy {
  organizationId: string;
  revision: number;
  rules: Partial<Record<Capability, PolicyRule>>;
}
export interface PolicyDecision {
  outcome: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
  mode: PolicyMode;
  reason: string;
  policyRevision: number;
}
export interface IntegrationConnection {
  id: string;
  organizationId: string;
  integration: "shopify";
  status: "not_connected" | "connected" | "revoked";
  shopDomain: string;
  grantedScopes: string[];
  lastSyncAt: string | null;
  health: "unknown" | "healthy" | "attention";
}
export interface AuditEvent {
  id: string;
  actionId: string;
  organizationId: string;
  actorId: string;
  agent: AgentId;
  provider: ProviderId;
  action: string;
  resource: string;
  reason: string;
  confidence: number;
  policyDecision: PolicyDecision;
  requestedAt: string;
  approvedBy: string | null;
  executedAt: string | null;
  result:
    | "denied"
    | "awaiting_approval"
    | "started"
    | "succeeded"
    | "failed"
    | "not_implemented";
  rollbackAvailable: false;
  source: "mock" | "live";
  /** Validated action parameters only, never tokens or raw API responses. */
  change: ToolCall;
}
export interface ActionReceipt {
  actionId: string;
  status: AuditEvent["result"];
  decision: PolicyDecision;
  approvalId?: string;
  data?: ToolOutputs[ReadToolName];
}
export interface BackendStatus {
  phase: "foundation";
  persistence: "pending" | "configured";
  authentication: "pending" | "configured";
  /** Configuration readiness only; not an installation or database health check. */
  liveConnectionsEnabled: boolean;
  previewAvailable: boolean;
  shopify: {
    status: "not_connected";
    lastSyncAt: null;
    health: "unknown";
    capabilities: string[];
  };
}
