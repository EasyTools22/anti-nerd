import "server-only";
import type { WorkspaceContext } from "../auth/context";
import type { ShopifySummary } from "@/types/shopify";
import { PostgresShopifyStore } from "./store";
import { getBackendStatus } from "../readiness";
export async function shopifySummary(
  context: WorkspaceContext,
): Promise<ShopifySummary> {
  const base: ShopifySummary = {
    configured: (await getBackendStatus()).liveConnectionsEnabled,
    available: true,
    owner: context.role === "owner",
    linked: false,
    connected: false,
    name: "Shopify",
    domain: null,
    health: "DISCONNECTED",
    verifiedAt: null,
    syncedAt: null,
    currency: null,
    features: {
      products: false,
      orders: false,
      customers: false,
      inventory: false,
    },
  };
  try {
    const row = await new PostgresShopifyStore(context).get();
    if (!row) return base;
    return {
      ...base,
      linked: !!row.external_account_identifier,
      connected: row.status === "connected",
      name: row.display_name,
      domain: row.external_account_identifier,
      health: row.connection_health,
      verifiedAt: row.last_verified_at,
      syncedAt: row.last_sync_at,
      currency: row.currency,
      features: {
        products: row.granted_capabilities.includes("read_products"),
        orders: row.granted_capabilities.includes("read_orders"),
        customers: row.granted_capabilities.includes("read_customers"),
        inventory: row.granted_capabilities.includes("read_inventory"),
      },
    };
  } catch {
    return { ...base, available: false, health: "ERROR" };
  }
}
