import { jsonResponse } from "@/lib/server/http";
import { getBackendStatus } from "@/lib/server/readiness";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const readiness = await getBackendStatus();
  if (!readiness.liveConnectionsEnabled)
    return jsonResponse(
      { code: "SHOPIFY_NOT_READY", blockers: readiness.blockers },
      503,
    );
  const { connect } = await import("@/lib/server/shopify/http");
  return connect(request);
}
