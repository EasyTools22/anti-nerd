import "server-only";
import { ShopifyVault } from "./vault";
import { BackendError } from "../errors";
export const SHOPIFY_READ_SCOPES = [
  "read_products",
  "read_orders",
  "read_customers",
  "read_inventory",
] as const;
export interface ShopifyConfig {
  clientId: string;
  clientSecret: string;
  previousSecret?: string;
  scopes: string[];
  redirectUri: string;
  appOrigin: string;
}
export function shopifyConfig(): ShopifyConfig {
  const clientId = process.env.SHOPIFY_CLIENT_ID,
    clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  const redirect = process.env.SHOPIFY_REDIRECT_URI,
    base = process.env.APP_BASE_URL;
  if (!clientId || !clientSecret || !redirect || !base)
    throw new BackendError(
      "SHOPIFY_NOT_CONFIGURED",
      "Shopify connection setup is not configured.",
    );
  let app: URL, callback: URL;
  try {
    app = new URL(base);
    callback = new URL(redirect);
  } catch {
    throw new BackendError(
      "SHOPIFY_NOT_CONFIGURED",
      "Shopify connection setup is not configured.",
    );
  }
  if (
    app.protocol !== "https:" ||
    callback.origin !== app.origin ||
    callback.pathname !== "/api/integrations/shopify/callback" ||
    callback.search ||
    callback.hash ||
    callback.username ||
    callback.password ||
    app.pathname !== "/" ||
    app.search ||
    app.hash ||
    app.username ||
    app.password
  )
    throw new BackendError(
      "SHOPIFY_NOT_CONFIGURED",
      "A secure public app address is required.",
    );
  const scopes = (process.env.SHOPIFY_SCOPES ?? SHOPIFY_READ_SCOPES.join(","))
    .split(",")
    .map((s) => s.trim());
  if (
    new Set(scopes).size !== scopes.length ||
    scopes.some(
      (s) =>
        !SHOPIFY_READ_SCOPES.includes(
          s as (typeof SHOPIFY_READ_SCOPES)[number],
        ),
    ) ||
    !["read_products", "read_orders", "read_inventory"].every((s) =>
      scopes.includes(s),
    )
  )
    throw new BackendError(
      "SHOPIFY_NOT_CONFIGURED",
      "Only the supported read permissions are allowed.",
    );
  return {
    clientId,
    clientSecret,
    previousSecret: process.env.SHOPIFY_PREVIOUS_CLIENT_SECRET || undefined,
    scopes,
    redirectUri: callback.href,
    appOrigin: app.origin,
  };
}
export function shopifyConfigured() {
  try {
    shopifyConfig();
    ShopifyVault.fromEnvironment();
    return true;
  } catch {
    return false;
  }
}
