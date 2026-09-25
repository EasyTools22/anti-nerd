import "server-only";
import { createHash } from "node:crypto";
import { verifyWebhook } from "./protocol";
import { validateShopDomain } from "../integrations/shopify";
import { boundedBody, privateHeaders } from "./requests";
import { persistenceClient } from "../db/client";
/** Raw body authentication precedes all parsing. Only minimized identifiers reach persistence. */
export async function webhook(request: Request) {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret)
    return new Response(null, { status: 503, headers: privateHeaders });
  try {
    const body = await boundedBody(request, 128 * 1024);
    if (
      !verifyWebhook(
        body,
        request.headers.get("x-shopify-hmac-sha256"),
        [secret, process.env.SHOPIFY_PREVIOUS_CLIENT_SECRET ?? ""].filter(
          Boolean,
        ),
      )
    )
      return new Response(null, { status: 401, headers: privateHeaders });
    const topic = request.headers.get("x-shopify-topic") ?? "",
      domain = validateShopDomain(
        request.headers.get("x-shopify-shop-domain") ?? "",
      );
    if (
      ![
        "app/uninstalled",
        "customers/data_request",
        "customers/redact",
        "shop/redact",
      ].includes(topic)
    )
      return new Response(null, { status: 400, headers: privateHeaders });
    const value = JSON.parse(new TextDecoder().decode(body));
    // The shop header is not signed; bind routing to the authenticated payload as well.
    if (
      (topic === "app/uninstalled"
        ? value.myshopify_domain
        : value.shop_domain) !== domain
    )
      return new Response(null, { status: 400, headers: privateHeaders });
    const occurred = request.headers.get("x-shopify-triggered-at");
    const time = Date.parse(occurred ?? "");
    if (!Number.isFinite(time) || time > Date.now() + 300000)
      return new Response(null, { status: 400, headers: privateHeaders });
    const identifiers: Record<string, unknown> = {};
    const safeId = (v: unknown) =>
      typeof v === "number" && Number.isSafeInteger(v) && v > 0
        ? String(v)
        : typeof v === "string" && /^\d{1,20}$/.test(v)
          ? v
          : undefined;
    if (topic.startsWith("customers/")) {
      const customer = safeId(value.customer?.id);
      if (customer) identifiers.customer_id = customer;
      else identifiers.no_customer_id = true; // Shopify can send email-only records; no email data is retained here.
      const list = value.orders_requested ?? value.orders_to_redact ?? [];
      if (
        !Array.isArray(list) ||
        list.length > 5000 ||
        list.some((v) => !safeId(v))
      )
        return new Response(null, { status: 400, headers: privateHeaders });
      identifiers.order_ids = list.map(safeId);
      if (value.data_request?.id)
        identifiers.request_id = safeId(value.data_request.id);
    }
    // Event time + body digest deduplicate retries while allowing identical payloads from a later uninstall.
    const delivery = createHash("sha256")
      .update(topic)
      .update(occurred!)
      .update(body)
      .digest("hex");
    const { error } = await persistenceClient().rpc("shopify_webhook", {
      delivery,
      topic,
      shop: domain,
      occurred_at: new Date(time).toISOString(),
      identifiers,
    });
    return new Response(null, {
      status: error ? 503 : 200,
      headers: privateHeaders,
    });
  } catch {
    return new Response(null, { status: 400, headers: privateHeaders });
  }
}
