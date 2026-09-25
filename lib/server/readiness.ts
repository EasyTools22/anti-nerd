import "server-only";
import type { BackendStatus } from "@/types/backend";
import { shopifyConfig } from "./shopify/config";
import { ShopifyVault } from "./shopify/vault";

type Transport = typeof fetch;
/** Only fixed, credential-free diagnostics leave this module. Public probes read
 * catalogs/settings only; a callback verifier additionally authenticates its user. */
export async function getBackendStatus(
  transport: Transport = fetch,
  // Callback callers verify the real Supabase user and workspace instead of
  // probing the unrelated public Auth settings endpoint. Never a client flag.
  verifyAuthentication?: () => Promise<void>,
): Promise<BackendStatus> {
  const blockers: string[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const requiredEnvironment = {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey,
    SUPABASE_SECRET_KEY: secret,
    APP_BASE_URL: process.env.APP_BASE_URL,
    SHOPIFY_CLIENT_ID: process.env.SHOPIFY_CLIENT_ID,
    SHOPIFY_CLIENT_SECRET: process.env.SHOPIFY_CLIENT_SECRET,
    SHOPIFY_REDIRECT_URI: process.env.SHOPIFY_REDIRECT_URI,
    SHOPIFY_VAULT_KEYS: process.env.SHOPIFY_VAULT_KEYS,
    SHOPIFY_VAULT_ACTIVE_KEY: process.env.SHOPIFY_VAULT_ACTIVE_KEY,
    ...(process.env.NODE_ENV === "production"
      ? { SHOPIFY_VAULT_KEY_SOURCE: process.env.SHOPIFY_VAULT_KEY_SOURCE }
      : {}),
  };
  const missingEnvironment = Object.entries(requiredEnvironment)
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name)
    .sort();
  let validUrl = false;
  try {
    const parsed = new URL(url ?? "");
    validUrl =
      parsed.protocol === "https:" &&
      parsed.pathname === "/" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash;
  } catch {
    /* Missing or malformed configuration is not ready. */
  }
  const validKey = (key: string | undefined, role: "anon" | "service_role") => {
    if (!key || /\s/.test(key)) return false;
    if (role === "anon" && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key))
      return true;
    if (role === "service_role" && /^sb_secret_[A-Za-z0-9_-]+$/.test(key))
      return true;
    try {
      const parts = key.split(".");
      return (
        parts.length === 3 &&
        JSON.parse(Buffer.from(parts[1], "base64url").toString()).role === role
      );
    } catch {
      return false;
    }
  };
  async function request(path: string, key: string, method = "GET") {
    return transport(new URL(path, url).href, {
      method,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
      headers: {
        apikey: key,
        ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}),
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: "{}" } : {}),
    });
  }
  let shopifyConfiguration: BackendStatus["shopifyConfiguration"] = "pending";
  try {
    shopifyConfig();
    shopifyConfiguration = "configured";
  } catch {
    blockers.push("SHOPIFY_APP_CONFIGURATION_INVALID");
  }
  let credentialVault: BackendStatus["credentialVault"] = "pending";
  try {
    ShopifyVault.fromEnvironment();
    credentialVault = "configured";
  } catch {
    blockers.push(
      process.env.NODE_ENV === "production" &&
        process.env.SHOPIFY_VAULT_KEY_SOURCE !== "managed-secret-store"
        ? "SHOPIFY_VAULT_KEY_SOURCE_INVALID"
        : "SHOPIFY_VAULT_CONFIGURATION_INVALID",
    );
  }
  const [authentication, persistence] = await Promise.all([
    (async () => {
      if (!validUrl || !validKey(publicKey, "anon")) {
        if (!validUrl)
          blockers.push("NEXT_PUBLIC_SUPABASE_URL_MISSING_OR_INVALID");
        if (!validKey(publicKey, "anon"))
          blockers.push(
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_MISSING_OR_INVALID",
          );
        return "pending" as const;
      }
      try {
        if (verifyAuthentication) {
          await verifyAuthentication();
        } else {
          // These are read-only probes. Retry one transient failure, never an
          // invalid key or disabled email provider, and never an OAuth exchange.
          for (let attempt = 0; attempt < 2; attempt++) {
            let response: Response;
            try {
              response = await request("/auth/v1/settings", publicKey!);
            } catch {
              if (attempt === 0) continue;
              console.warn("backend_readiness_auth", {
                reason: "transport_or_timeout",
              });
              throw new Error("unavailable");
            }
            if (
              attempt === 0 &&
              (response.status === 429 || response.status >= 500)
            ) {
              await response.body?.cancel();
              continue;
            }
            if (!response.ok) {
              console.warn("backend_readiness_auth", {
                reason: "http",
                status: response.status,
              });
              throw new Error("unavailable");
            }
            if ((await response.json())?.external?.email !== true)
              throw new Error("unavailable");
            break;
          }
        }
        return "configured" as const;
      } catch {
        blockers.push("SUPABASE_AUTH_UNAVAILABLE");
        return "pending" as const;
      }
    })(),
    (async () => {
      if (!validUrl || !validKey(secret, "service_role")) {
        if (!validUrl)
          blockers.push("NEXT_PUBLIC_SUPABASE_URL_MISSING_OR_INVALID");
        if (!validKey(secret, "service_role"))
          blockers.push("SUPABASE_SECRET_KEY_MISSING_OR_INVALID");
        return "pending" as const;
      }
      try {
        const response = await request(
          "/rest/v1/rpc/backend_readiness",
          secret!,
          "POST",
        );
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          blockers.push(
            error?.code === "PGRST202"
              ? "READINESS_MIGRATION_004_REQUIRED"
              : "SUPABASE_PERSISTENCE_UNAVAILABLE",
          );
          return "pending" as const;
        }
        const schema = await response.json();
        if (
          schema?.version !== 2 ||
          schema?.ready !== true ||
          schema?.migrations?.["001"] !== true ||
          schema?.migrations?.["002"] !== true ||
          schema?.migrations?.["003"] !== true ||
          schema?.migrations?.["005"] !== true ||
          schema?.rls !== true ||
          schema?.permissions !== true ||
          schema?.columns !== true
        ) {
          blockers.push(
            schema?.migrations?.["005"] !== true
              ? "COMMERCE_MIGRATION_005_REQUIRED"
              : "DATABASE_SCHEMA_OR_SECURITY_NOT_READY",
          );
          return "pending" as const;
        }
        return "configured" as const;
      } catch {
        blockers.push("SUPABASE_PERSISTENCE_UNAVAILABLE");
        return "pending" as const;
      }
    })(),
  ]);
  const liveConnectionsEnabled =
    authentication === "configured" &&
    persistence === "configured" &&
    shopifyConfiguration === "configured" &&
    credentialVault === "configured";
  return {
    phase: "shopify_read_only",
    authentication,
    persistence,
    shopifyConfiguration,
    credentialVault,
    liveConnectionsEnabled,
    missingEnvironment,
    blockers: [...new Set(blockers)].sort(),
    previewAvailable: process.env.NODE_ENV === "development",
    shopify: {
      status: "not_connected",
      lastSyncAt: null,
      health: "unknown",
      capabilities: ["Products", "Orders", "Customers", "Inventory", "Store"],
    },
  };
}
