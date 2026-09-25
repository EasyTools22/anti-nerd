import "server-only";
import type {
  Capability,
  Page,
  ReadToolCall,
  ReadToolName,
  ToolOutputs,
} from "@/types/backend";
import type { IntegrationAdapter } from "./adapter";
import { parseToolCall } from "@/lib/server/validation";
import { BackendError } from "@/lib/server/errors";
export class MockShopifyAdapter implements IntegrationAdapter {
  readonly integration = "shopify" as const;
  readonly source = "mock" as const;
  readonly capabilities: Capability[] = [
    "store.read",
    "products.read",
    "orders.read",
    "customers.read",
    "inventory.read",
  ];
  constructor(readonly organizationId: string) {}
  async executeRead(raw: ReadToolCall): Promise<ToolOutputs[ReadToolName]> {
    const call = parseToolCall(raw);
    const product = {
      id: "gid://shopify/Product/1",
      title: "Everyday tote · Mock",
      status: "ACTIVE",
      updatedAt: "2026-09-24T00:00:00Z",
    };
    const order = {
      id: "gid://shopify/Order/1",
      name: "#MOCK-1001",
      createdAt: "2026-09-24T00:00:00Z",
      displayFinancialStatus: "PAID",
      totalPriceSet: { shopMoney: { amount: "89.00", currencyCode: "EUR" } },
    };
    const page = <T>(item: T): Page<T> => ({
      nodes: "after" in call.input && call.input.after ? [] : [item],
      pageInfo: { hasNextPage: false, endCursor: null },
    });
    switch (call.tool) {
      case "getStore":
        return {
          id: "gid://shopify/Shop/1",
          name: "Anti-Nerd mock store",
          domain: "anti-nerd-demo.myshopify.com",
          currencyCode: "EUR",
        };
      case "listProducts":
        return page(product);
      case "getProduct":
        return call.input.productId === product.id ? product : null;
      case "listOrders":
        return page(order);
      case "getOrder":
        return call.input.orderId === order.id ? order : null;
      case "listCustomers":
        return page({ id: "gid://shopify/Customer/1", numberOfOrders: "3" });
      case "getInventory":
        return page({
          id: "gid://shopify/InventoryItem/1",
          sku: "MOCK-TOTE",
          tracked: true,
        });
      default:
        throw new BackendError(
          "NOT_IMPLEMENTED",
          "Write tools have no execution handler.",
        );
    }
  }
}
