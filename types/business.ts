export type BusinessType =
  "E-commerce" | "Accommodation" | "Restaurant" | "Agency" | "Other";
export interface Workspace {
  id: string;
  name: string;
  type: BusinessType;
}
export interface Order {
  id: string;
  workspaceId: string;
  customer: string;
  email: string;
  amount: number;
  date: string;
  status: "Paid" | "Pending" | "Refunded";
  fulfillment: "Delivered" | "Processing" | "Delayed";
  source: "Shopify" | "WooCommerce";
}
export type { Agent } from "./intelligence";
export interface AuditEvent {
  id: string;
  workspaceId: string;
  timestamp: string;
  actor: string;
  action: string;
  result: string;
  status: "Completed" | "Awaiting approval" | "Approved";
}
