import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { BackendError } from "../errors";
import { validateShopDomain } from "../integrations/shopify";
import type { ShopifyConfig } from "./config";
import type { TokenSet } from "./contracts";
export function digestState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}
export function callbackParameters(
  params: URLSearchParams,
  secret: string,
  browserState: string | undefined,
  now = Date.now(),
) {
  const invalid = (
    reason: "parameters" | "state_cookie" | "timestamp" | "hmac" = "parameters",
  ) => {
    // Fixed categories only; never log the callback, nonce or computed signature.
    console.warn("shopify_callback_validation", { reason });
    throw new BackendError(
      "INVALID_CALLBACK",
      "The connection link is invalid or expired. Please connect again.",
    );
  };
  if (params.toString().length > 8192) invalid();
  const seen = new Set<string>();
  for (const [key] of params) {
    if (seen.has(key)) invalid();
    seen.add(key);
  }
  const state = params.get("state") ?? "",
    hmac = params.get("hmac") ?? "",
    code = params.get("code") ?? "",
    shop = params.get("shop") ?? "",
    timestamp = params.get("timestamp") ?? "";
  if (!browserState || state !== browserState) invalid("state_cookie");
  if (
    !/^[a-f0-9]{64}$/.test(state) ||
    !/^[a-f0-9]{64}$/.test(hmac) ||
    !/^[A-Za-z0-9_-]{1,1024}$/.test(code) ||
    !/^\d{10}$/.test(timestamp)
  )
    invalid();
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) invalid("timestamp");
  if (validateShopDomain(shop) !== shop) invalid();
  const message = [...params.entries()]
    .filter(([key]) => key !== "hmac")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const expected = createHmac("sha256", secret).update(message).digest();
  if (!timingSafeEqual(expected, Buffer.from(hmac, "hex"))) invalid("hmac");
  return { state, code, shop };
}
export function verifyWebhook(
  body: Uint8Array,
  signature: string | null,
  secrets: string[],
) {
  if (!signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const supplied = Buffer.from(signature, "base64");
  return secrets.some((secret) =>
    timingSafeEqual(
      createHmac("sha256", secret).update(body).digest(),
      supplied,
    ),
  );
}
function tokenResponse(
  raw: unknown,
  required: string[],
  now: number,
): TokenSet {
  const fail = () => {
    throw new BackendError(
      "TOKEN_RESPONSE_INVALID",
      "Shopify authorization could not be completed.",
    );
  };
  if (!raw || typeof raw !== "object") return fail();
  const r = raw as Record<string, unknown>;
  if (
    typeof r.access_token !== "string" ||
    !r.access_token ||
    r.access_token.length > 8192 ||
    typeof r.refresh_token !== "string" ||
    !r.refresh_token ||
    r.refresh_token.length > 8192 ||
    typeof r.scope !== "string" ||
    typeof r.expires_in !== "number" ||
    !Number.isSafeInteger(r.expires_in) ||
    r.expires_in <= 0 ||
    typeof r.refresh_token_expires_in !== "number" ||
    !Number.isSafeInteger(r.refresh_token_expires_in) ||
    r.refresh_token_expires_in <= 0
  )
    return fail();
  const scopes = r.scope.split(",").map((s) => s.trim());
  if (
    scopes.some((s) => !required.includes(s)) ||
    required.some((s) => !scopes.includes(s))
  )
    throw new BackendError(
      "SCOPE_MISMATCH",
      "Reconnect Shopify with the requested read permissions.",
    );
  const access = new Date(now + r.expires_in * 1000),
    refresh = new Date(now + r.refresh_token_expires_in * 1000);
  if (!Number.isFinite(access.getTime()) || !Number.isFinite(refresh.getTime()))
    return fail();
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    scopes,
    accessExpiresAt: access.toISOString(),
    refreshExpiresAt: refresh.toISOString(),
  };
}
export async function requestTokens(
  config: ShopifyConfig,
  shop: string,
  grant: { code: string } | { refreshToken: string },
  transport: typeof fetch = fetch,
  now = Date.now(),
): Promise<TokenSet> {
  validateShopDomain(shop);
  let response: Response;
  try {
    response = await transport(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        ...("code" in grant
          ? { code: grant.code, expiring: "1" }
          : { grant_type: "refresh_token", refresh_token: grant.refreshToken }),
      }).toString(),
    });
  } catch {
    throw new BackendError(
      "TOKEN_EXCHANGE_FAILED",
      "Shopify authorization could not be completed. Please reconnect.",
    );
  }
  if (!response.ok)
    throw new BackendError(
      response.status === 401
        ? "NEEDS_REAUTHORIZATION"
        : "TOKEN_EXCHANGE_FAILED",
      "Shopify authorization could not be completed. Please reconnect.",
    );
  try {
    return tokenResponse(await response.json(), config.scopes, now);
  } catch (error) {
    if (error instanceof BackendError) throw error;
    throw new BackendError(
      "TOKEN_RESPONSE_INVALID",
      "Shopify authorization could not be completed.",
    );
  }
}
