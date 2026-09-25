import "server-only";
export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function connectionPendingResponse() {
  return jsonResponse(
    {
      code: "FOUNDATION_PENDING",
      message:
        "This connection is not configured yet. No credentials were accepted or stored.",
    },
    503,
  );
}
