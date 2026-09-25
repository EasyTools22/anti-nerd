import "server-only";
import { createHash, createHmac } from "node:crypto";
import { BackendError } from "../errors";

// Temporary OAuth investigation. No request, query, error object or credential
// is logged. Remove after the first verified production connection.
type Checkpoint =
  | "START"
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V"
  | "CONTEXT"
  | "CLEANUP"
  | "CONFIG"
  | "CALLBACK"
  | "STAGE";
type Details = {
  code?: string;
  businessId?: string;
  httpStatus?: number;
  clientFingerprint?: string;
  secretFingerprint?: string;
  shopHash?: string;
  sdkHmacValid?: boolean;
  canonicalDiffers?: boolean;
};
const codes = new Set([
  "INVALID_CALLBACK",
  "INVALID_STATE",
  "INVALID_SHOP",
  "NOT_AUTHENTICATED",
  "NOT_AUTHORIZED",
  "DATABASE_UNAVAILABLE",
  "RATE_LIMITED",
  "UNAVAILABLE",
  "TOKEN_EXCHANGE_FAILED",
  "NEEDS_REAUTHORIZATION",
  "TOKEN_RESPONSE_INVALID",
  "SCOPE_MISMATCH",
  "VAULT_UNAVAILABLE",
  "SHOPIFY_UNAVAILABLE",
  "SHOPIFY_THROTTLED",
  "SCOPE_REQUIRED",
  "SHOPIFY_REQUEST_FAILED",
  "SHOPIFY_VERSION_CHANGED",
  "SHOPIFY_RESPONSE_INVALID",
  "SHOPIFY_GRAPHQL_ERROR",
  "SHOP_MISMATCH",
  "SHOP_ALREADY_LINKED",
  "CONNECTION_FAILED",
  "EXPIRED",
  "REDIRECT_FAILED",
  "REDIRECT_CONNECTED",
  "HMAC_INVALID",
  "PARAMETERS_INVALID",
  "TIMESTAMP_INVALID",
]);
export function diagnosticCode(error: unknown) {
  return error instanceof BackendError && codes.has(error.code)
    ? error.code
    : "UNAVAILABLE";
}
export const fingerprint = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 32);
export function credentialFingerprints(clientId: string, secret: string) {
  return {
    clientFingerprint: fingerprint(clientId),
    secretFingerprint: createHmac("sha256", secret)
      .update("anti-nerd:shopify:diagnostics:v1")
      .digest("hex")
      .slice(0, 32),
  };
}
export type OAuthTrace = ReturnType<typeof oauthTrace>;
export function oauthTrace(state: string | undefined, businessId?: string) {
  const attemptId =
    state && /^[a-f0-9]{64}$/.test(state) ? fingerprint(state) : undefined;
  return (
    checkpoint: Checkpoint,
    status: "PASS" | "FAIL" | "INFO",
    details: Details = {},
  ) => {
    // Project explicitly at runtime too: callers cannot accidentally spread secrets.
    const safe: Record<string, string | number | boolean | undefined> = {
      attemptId,
      checkpoint,
      status,
      timestamp: new Date().toISOString(),
    };
    const business = details.businessId ?? businessId;
    if (business && /^[a-f0-9-]{36}$/i.test(business))
      safe.businessId = business;
    if (details.code)
      safe.code = codes.has(details.code) ? details.code : "UNAVAILABLE";
    if (
      Number.isInteger(details.httpStatus) &&
      details.httpStatus! >= 100 &&
      details.httpStatus! <= 599
    )
      safe.httpStatus = details.httpStatus;
    for (const key of [
      "clientFingerprint",
      "secretFingerprint",
      "shopHash",
    ] as const)
      if (/^[a-f0-9]{32}$/.test(details[key] ?? "")) safe[key] = details[key];
    for (const key of ["sdkHmacValid", "canonicalDiffers"] as const)
      if (typeof details[key] === "boolean") safe[key] = details[key];
    // Logging must never change connection outcomes, even if the sink fails.
    try {
      console.info("shopify_oauth_checkpoint", JSON.stringify(safe));
    } catch {}
  };
}
