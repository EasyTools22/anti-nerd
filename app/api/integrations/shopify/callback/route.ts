export const runtime = "nodejs";
export async function GET(request: Request) {
  // The callback performs readiness with real user verification and handles
  // recoverable failures with a safe UI redirect, before any token exchange.
  const { callback } = await import("@/lib/server/shopify/http");
  return callback(request);
}
