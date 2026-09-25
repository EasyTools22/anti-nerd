import { connectionPendingResponse } from "@/lib/server/http";
import { shopifyConfigured } from "@/lib/server/shopify/config";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!shopifyConfigured()) return connectionPendingResponse();
  const { read } = await import("@/lib/server/shopify/http");
  return read(request);
}
