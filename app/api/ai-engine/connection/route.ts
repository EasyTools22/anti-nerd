import { connectionPendingResponse } from "@/lib/server/http";
export const runtime = "nodejs";
/** No secret input parsing or storage in the foundation phase. */
export function POST() {
  return connectionPendingResponse();
}
