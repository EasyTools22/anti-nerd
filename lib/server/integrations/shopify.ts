import "server-only";
import type {
  Capability,
  ReadToolCall,
  ReadToolName,
  ToolOutputs,
} from "@/types/backend";
import type {
  CredentialStore,
  ConnectionRepository,
  ExecutionContext,
} from "@/lib/server/security/credentials";
import { BackendError } from "@/lib/server/errors";
import { parseToolCall } from "@/lib/server/validation";
import type { IntegrationAdapter } from "./adapter";
/** Pinned stable version, verified against Shopify docs on 2026-09-24. */
export const SHOPIFY_API_VERSION = "2026-07";
const pageInfo = "pageInfo { hasNextPage endCursor }";
const product = "id title status updatedAt";
const order =
  "id name createdAt displayFinancialStatus totalPriceSet { shopMoney { amount currencyCode } }";
const documents: Record<
  ReadToolName,
  { query: string; scope: string | null; root: string }
> = {
  getStore: {
    query:
      "query AntiNerdStore { shop { id name myshopifyDomain currencyCode } }",
    scope: null,
    root: "shop",
  },
  listProducts: {
    query: `query AntiNerdProducts($first:Int!,$after:String){products(first:$first,after:$after){nodes{${product}} ${pageInfo}}}`,
    scope: "read_products",
    root: "products",
  },
  getProduct: {
    query: `query AntiNerdProduct($id:ID!){product(id:$id){${product}}}`,
    scope: "read_products",
    root: "product",
  },
  listOrders: {
    query: `query AntiNerdOrders($first:Int!,$after:String){orders(first:$first,after:$after){nodes{${order}} ${pageInfo}}}`,
    scope: "read_orders",
    root: "orders",
  },
  getOrder: {
    query: `query AntiNerdOrder($id:ID!){order(id:$id){${order}}}`,
    scope: "read_orders",
    root: "order",
  },
  listCustomers: {
    query: `query AntiNerdCustomers($first:Int!,$after:String){customers(first:$first,after:$after){nodes{id numberOfOrders} ${pageInfo}}}`,
    scope: "read_customers",
    root: "customers",
  },
  getInventory: {
    query: `query AntiNerdInventory($first:Int!,$after:String){inventoryItems(first:$first,after:$after){nodes{id sku tracked} ${pageInfo}}}`,
    scope: "read_inventory",
    root: "inventoryItems",
  },
};
export function validateShopDomain(domain: string): string {
  domain = domain.trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/.test(domain))
    throw new BackendError(
      "INVALID_SHOP",
      "Use a canonical myshopify.com domain.",
    );
  return domain;
}
function responseError(): never {
  throw new BackendError(
    "SHOPIFY_RESPONSE_INVALID",
    "Shopify returned an unexpected response.",
  );
}
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) responseError();
  return v as Record<string, unknown>;
}
function str(v: unknown): string {
  if (typeof v !== "string") responseError();
  return v;
}
function bool(v: unknown): boolean {
  if (typeof v !== "boolean") responseError();
  return v;
}
/** Project the response into minimal DTOs; never return transport/credential objects. */
function normalize(
  tool: ReadToolName,
  value: unknown,
): ToolOutputs[ReadToolName] {
  const productDTO = (v: unknown) => {
    const n = object(v);
    return {
      id: str(n.id),
      title: str(n.title),
      status: str(n.status),
      updatedAt: str(n.updatedAt),
    };
  };
  const orderDTO = (v: unknown) => {
    const n = object(v);
    const money = object(object(n.totalPriceSet).shopMoney);
    return {
      id: str(n.id),
      name: str(n.name),
      createdAt: str(n.createdAt),
      displayFinancialStatus: str(n.displayFinancialStatus),
      totalPriceSet: {
        shopMoney: {
          amount: str(money.amount),
          currencyCode: str(money.currencyCode),
        },
      },
    };
  };
  if (tool === "getProduct") return value === null ? null : productDTO(value);
  if (tool === "getOrder") return value === null ? null : orderDTO(value);
  const n = object(value);
  if (tool === "getStore")
    return {
      id: str(n.id),
      name: str(n.name),
      domain: str(n.myshopifyDomain),
      currencyCode: str(n.currencyCode),
    };
  const info = object(n.pageInfo);
  if (!Array.isArray(n.nodes) || n.nodes.length > 50) responseError();
  const pagination = {
    hasNextPage: bool(info.hasNextPage),
    endCursor: info.endCursor === null ? null : str(info.endCursor),
  };
  switch (tool) {
    case "listProducts":
      return { nodes: n.nodes.map(productDTO), pageInfo: pagination };
    case "listOrders":
      return { nodes: n.nodes.map(orderDTO), pageInfo: pagination };
    case "listCustomers":
      return {
        nodes: n.nodes.map((v) => {
          const r = object(v);
          return { id: str(r.id), numberOfOrders: str(r.numberOfOrders) };
        }),
        pageInfo: pagination,
      };
    case "getInventory":
      return {
        nodes: n.nodes.map((v) => {
          const r = object(v);
          return {
            id: str(r.id),
            sku: r.sku === null ? null : str(r.sku),
            tracked: bool(r.tracked),
          };
        }),
        pageInfo: pagination,
      };
  }
}
export class ShopifyAdapter implements IntegrationAdapter {
  readonly integration = "shopify" as const;
  readonly source = "live" as const;
  readonly capabilities: Capability[] = [
    "store.read",
    "products.read",
    "orders.read",
    "customers.read",
    "inventory.read",
  ];
  #context: ExecutionContext;
  #connections: ConnectionRepository;
  #credentials: CredentialStore;
  #connectionId: string;
  #fetch: typeof fetch;
  constructor(
    context: ExecutionContext,
    connectionId: string,
    connections: ConnectionRepository,
    credentials: CredentialStore,
    transport: typeof fetch = fetch,
  ) {
    this.#context = context;
    this.#connectionId = connectionId;
    this.#connections = connections;
    this.#credentials = credentials;
    this.#fetch = transport;
  }
  get organizationId() {
    return this.#context.organizationId;
  }
  async executeRead(raw: ReadToolCall): Promise<ToolOutputs[ReadToolName]> {
    const call = parseToolCall(raw);
    if (!Object.hasOwn(documents, call.tool))
      throw new BackendError("NOT_IMPLEMENTED", "Write tools are not enabled.");
    if (
      this.#context.source !== "live" ||
      this.#credentials.persistence !== "durable"
    )
      throw new BackendError(
        "STORAGE_REQUIRED",
        "A verified session and durable credential store are required.",
      );
    const connection = await this.#connections.get(
      this.organizationId,
      this.#connectionId,
    );
    if (
      !connection ||
      connection.organizationId !== this.organizationId ||
      connection.id !== this.#connectionId ||
      connection.status !== "connected"
    )
      throw new BackendError(
        "NOT_CONNECTED",
        "No authorized Shopify connection.",
      );
    const domain = validateShopDomain(connection.shopDomain);
    const definition = documents[call.tool as ReadToolName];
    if (
      definition.scope &&
      !connection.grantedScopes.includes(definition.scope)
    )
      throw new BackendError(
        "SCOPE_REQUIRED",
        "Shopify has not granted this read permission.",
      );
    const variables =
      call.tool === "getProduct"
        ? { id: call.input.productId }
        : call.tool === "getOrder"
          ? { id: call.input.orderId }
          : call.input;
    return this.#credentials.withSecret(
      this.organizationId,
      connection.credentialReference,
      "integration:shopify",
      async (token) => {
        let response: Response;
        try {
          response = await this.#fetch(
            `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
            {
              method: "POST",
              redirect: "error",
              cache: "no-store",
              signal: AbortSignal.timeout(10_000),
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": token,
              },
              body: JSON.stringify({ query: definition.query, variables }),
            },
          );
        } catch {
          throw new BackendError(
            "SHOPIFY_UNAVAILABLE",
            "Shopify could not be reached. No response details were logged.",
          );
        }
        if (response.status === 429)
          throw new BackendError(
            "SHOPIFY_THROTTLED",
            "Shopify rate limit reached. Try again later.",
          );
        if (response.status === 401)
          throw new BackendError(
            "NEEDS_REAUTHORIZATION",
            "Reconnect Shopify to restore access.",
          );
        if (response.status === 403)
          throw new BackendError(
            "SCOPE_REQUIRED",
            "This information is unavailable with the current permissions.",
          );
        if (!response.ok)
          throw new BackendError(
            "SHOPIFY_REQUEST_FAILED",
            "Shopify rejected the request. Check connection permissions.",
          );
        const version = response.headers.get("X-Shopify-API-Version");
        if (version && version !== SHOPIFY_API_VERSION)
          throw new BackendError(
            "SHOPIFY_VERSION_CHANGED",
            "Review the pinned API version before continuing.",
          );
        let payload: Record<string, unknown>;
        try {
          payload = object(await response.json());
        } catch {
          return responseError();
        }
        if (Array.isArray(payload.errors) && payload.errors.length) {
          const codes = payload.errors.map((e) =>
            e && typeof e === "object"
              ? (e as { extensions?: { code?: string } }).extensions?.code
              : undefined,
          );
          if (codes.includes("THROTTLED"))
            throw new BackendError(
              "SHOPIFY_THROTTLED",
              "Shopify is busy. Try again shortly.",
            );
          if (codes.includes("ACCESS_DENIED"))
            throw new BackendError(
              "SCOPE_REQUIRED",
              "This information is unavailable with the current permissions.",
            );
          throw new BackendError(
            "SHOPIFY_GRAPHQL_ERROR",
            "Shopify could not complete the query. Partial data was discarded.",
          );
        }
        return normalize(
          call.tool as ReadToolName,
          object(payload.data)[definition.root],
        );
      },
    );
  }
}
