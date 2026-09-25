import "server-only";
import type { ActionProposal, Money, ToolCall } from "@/types/backend";
import { toolCatalog } from "@/lib/backend/tool-catalog";
import { BackendError } from "./errors";
export function invalid(): never {
  throw new BackendError(
    "INVALID_INPUT",
    "The request does not match an allowed action.",
  );
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((k) => !keys.includes(k))) invalid();
}
function text(value: unknown, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    invalid();
  return value;
}
function integer(value: unknown, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    invalid();
  return value;
}
function gid(value: unknown, kind: string) {
  const id = text(value, 140);
  if (!new RegExp(`^gid://shopify/${kind}/[1-9][0-9]*$`).test(id)) invalid();
  return id;
}
function money(value: unknown): Money {
  const v = record(value);
  exact(v, ["amountMinor", "currency"]);
  if (!["EUR", "USD", "GBP"].includes(String(v.currency))) invalid();
  return {
    amountMinor: integer(v.amountMinor, 0, 100_000_000),
    currency: v.currency as Money["currency"],
  };
}
export function parseToolCall(value: unknown): ToolCall {
  const v = record(value);
  exact(v, ["tool", "input"]);
  if (typeof v.tool !== "string" || !Object.hasOwn(toolCatalog, v.tool))
    invalid();
  const input = record(v.input);
  switch (v.tool) {
    case "getStore":
      exact(input, []);
      return { tool: v.tool, input: {} };
    case "listProducts":
    case "listOrders":
    case "listCustomers":
    case "getInventory":
      exact(input, ["first", "after"]);
      return {
        tool: v.tool,
        input: {
          first: input.first === undefined ? 10 : integer(input.first, 1, 50),
          ...(input.after === undefined
            ? {}
            : { after: text(input.after, 512) }),
        },
      };
    case "getProduct":
      exact(input, ["productId"]);
      return {
        tool: v.tool,
        input: { productId: gid(input.productId, "Product") },
      };
    case "getOrder":
      exact(input, ["orderId"]);
      return { tool: v.tool, input: { orderId: gid(input.orderId, "Order") } };
    case "updateProduct":
      exact(input, ["productId", "title"]);
      return {
        tool: v.tool,
        input: {
          productId: gid(input.productId, "Product"),
          title: text(input.title, 200),
        },
      };
    case "updateProductPrice":
      exact(input, ["productId", "variantId", "currentPrice", "newPrice"]);
      return {
        tool: v.tool,
        input: {
          productId: gid(input.productId, "Product"),
          variantId: gid(input.variantId, "ProductVariant"),
          currentPrice: money(input.currentPrice),
          newPrice: money(input.newPrice),
        },
      };
    case "updateInventory":
      exact(input, ["inventoryItemId", "locationId", "quantity"]);
      return {
        tool: v.tool,
        input: {
          inventoryItemId: gid(input.inventoryItemId, "InventoryItem"),
          locationId: gid(input.locationId, "Location"),
          quantity: integer(input.quantity, 0, 1_000_000),
        },
      };
    case "createDiscount":
      exact(input, ["code", "percentage", "endsAt"]);
      {
        const endsAt = text(input.endsAt, 40);
        if (
          !/^\d{4}-\d{2}-\d{2}T/.test(endsAt) ||
          !Number.isFinite(Date.parse(endsAt))
        )
          invalid();
        return {
          tool: v.tool,
          input: {
            code: text(input.code, 64),
            percentage: integer(input.percentage, 1, 100),
            endsAt,
          },
        };
      }
    case "refundOrder":
      exact(input, ["orderId", "amount"]);
      return {
        tool: v.tool,
        input: {
          orderId: gid(input.orderId, "Order"),
          amount: money(input.amount),
        },
      };
    case "publishStoreChange":
      exact(input, ["changeId"]);
      return { tool: v.tool, input: { changeId: text(input.changeId, 100) } };
    default:
      return invalid();
  }
}
export function parseProposal(value: unknown): ActionProposal {
  const v = record(value);
  exact(v, ["tool", "input", "reason", "confidence"]);
  if (
    typeof v.confidence !== "number" ||
    !Number.isFinite(v.confidence) ||
    v.confidence < 0 ||
    v.confidence > 1
  )
    invalid();
  return {
    ...parseToolCall({ tool: v.tool, input: v.input }),
    reason: text(v.reason, 1000),
    confidence: v.confidence,
  };
}
