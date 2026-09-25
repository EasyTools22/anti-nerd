import type { ToolDefinition, ToolName } from "@/types/backend";
/** Descriptions are safe to display. Executable handlers live on the server. */
export const toolCatalog = {
  getStore: {
    name: "getStore",
    actionType: "store.read",
    capability: "store.read",
    impact: "read",
    implemented: true,
    description: "Read store identity and currency.",
  },
  listProducts: {
    name: "listProducts",
    actionType: "products.list",
    capability: "products.read",
    impact: "read",
    implemented: true,
    description: "Read a bounded page of products.",
  },
  getProduct: {
    name: "getProduct",
    actionType: "product.read",
    capability: "products.read",
    impact: "read",
    implemented: true,
    description: "Read one product.",
  },
  listOrders: {
    name: "listOrders",
    actionType: "orders.list",
    capability: "orders.read",
    impact: "read",
    implemented: true,
    description: "Read order totals without contact details.",
  },
  getOrder: {
    name: "getOrder",
    actionType: "order.read",
    capability: "orders.read",
    impact: "read",
    implemented: true,
    description: "Read one order summary.",
  },
  listCustomers: {
    name: "listCustomers",
    actionType: "customers.list",
    capability: "customers.read",
    impact: "read",
    implemented: true,
    description: "Read customer IDs and order counts; no names or email.",
  },
  getInventory: {
    name: "getInventory",
    actionType: "inventory.read",
    capability: "inventory.read",
    impact: "read",
    implemented: true,
    description: "Read inventory item IDs, SKU and tracking status.",
  },
  updateProduct: {
    name: "updateProduct",
    actionType: "product.update",
    capability: "products.write",
    impact: "write",
    implemented: false,
    description: "Propose a product title change.",
  },
  updateProductPrice: {
    name: "updateProductPrice",
    actionType: "product.price.update",
    capability: "products.price.write",
    impact: "write",
    implemented: false,
    description: "Propose a variant price change. No execution in this phase.",
  },
  updateInventory: {
    name: "updateInventory",
    actionType: "inventory.update",
    capability: "inventory.write",
    impact: "write",
    implemented: false,
    description: "Propose an inventory change.",
  },
  createDiscount: {
    name: "createDiscount",
    actionType: "discount.create",
    capability: "discounts.write",
    impact: "write",
    implemented: false,
    description: "Propose a discount.",
  },
  refundOrder: {
    name: "refundOrder",
    actionType: "order.refund",
    capability: "orders.refund",
    impact: "high_impact",
    implemented: false,
    description: "Propose a refund. Owner review required by default.",
  },
  publishStoreChange: {
    name: "publishStoreChange",
    actionType: "store.publish",
    capability: "store.publish",
    impact: "high_impact",
    implemented: false,
    description: "Propose publishing an already reviewed store change.",
  },
} as const satisfies Record<ToolName, ToolDefinition>;
export const readTools = Object.values(toolCatalog).filter(
  (t) => t.impact === "read",
);
export const writeTools = Object.values(toolCatalog).filter(
  (t) => t.impact === "write",
);
export const highImpactTools = Object.values(toolCatalog).filter(
  (t) => t.impact === "high_impact",
);
