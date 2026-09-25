import { connectionPendingResponse } from "@/lib/server/http";
import { shopifyConfigured } from "@/lib/server/shopify/config";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!shopifyConfigured()) return connectionPendingResponse();
  const { callback } = await import("@/lib/server/shopify/http");
  return callback(request);
}
