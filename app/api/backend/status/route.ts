import { getBackendStatus } from "@/lib/server/foundation";
import { jsonResponse } from "@/lib/server/http";
export const runtime = "nodejs";
export function GET() {
  return jsonResponse(getBackendStatus());
}
