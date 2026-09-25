import { createBackend } from "@/lib/server/foundation";
import { jsonResponse } from "@/lib/server/http";
import { record } from "@/lib/server/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return jsonResponse({ code: "NOT_FOUND" }, 404);
  // This endpoint uses only hardcoded fixtures. It accepts no organization, keys or arbitrary prompt/tool.
  const url = new URL(request.url);
  if (
    request.headers.get("origin") !== url.origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return jsonResponse({ code: "ORIGIN_REJECTED" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return jsonResponse({ code: "INVALID_CONTENT_TYPE" }, 415);
  if (Number(request.headers.get("content-length")) > 1024)
    return jsonResponse({ code: "REQUEST_TOO_LARGE" }, 413);
  try {
    // Bounded read, including chunked requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return jsonResponse({ code: "INVALID_REQUEST" }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return jsonResponse({ code: "REQUEST_TOO_LARGE" }, 413);
      }
      chunks.push(value);
    }
    const body = record(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (
      Object.keys(body).some((key) => key !== "scenario") ||
      !["read", "price"].includes(String(body.scenario))
    )
      return jsonResponse({ code: "INVALID_REQUEST" }, 400);
    const backend = createBackend("mock");
    const receipts = await backend.runtime.run(
      backend.context,
      body.scenario === "price" ? "product" : "store",
      body.scenario === "price" ? "Review my product pricing" : "Read my store",
    );
    return jsonResponse({
      source: "mock",
      persistence: "request_only",
      receipts,
      audit: backend.audit.list(),
      learnedResults: backend.brain.learnedActionCount,
    });
  } catch {
    return jsonResponse(
      {
        code: "PREVIEW_FAILED",
        message: "The mock preview could not be completed.",
      },
      400,
    );
  }
}
