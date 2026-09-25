import { getBackendStatus } from "@/lib/server/readiness";
import { jsonResponse } from "@/lib/server/http";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  return jsonResponse(await getBackendStatus());
}
