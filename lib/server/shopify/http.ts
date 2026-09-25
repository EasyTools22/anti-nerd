import "server-only";
import { cookies } from "next/headers";
import { requireWorkspace } from "../auth/context";
import { rateLimiter } from "../security/rate-limit";
import { BackendError } from "../errors";
import { shopifyConfig } from "./config";
import { connectionService, liveShopify } from "./service";
import { PostgresShopifyStore } from "./store";
import { parseToolCall } from "../validation";
import { toolCatalog } from "@/lib/backend/tool-catalog";
import type { ReadToolCall } from "@/types/backend";
const stateCookie = "__Secure-anti-nerd-shopify-state";
import { boundedBody, privateHeaders } from "./requests";
function redirect(path: string) {
  return new Response(null, {
    status: 303,
    headers: {
      ...privateHeaders,
      Location: new URL(path, shopifyConfig().appOrigin).href,
    },
  });
}
async function input(request: Request, needsShopify = true) {
  const appOrigin = needsShopify
    ? shopifyConfig().appOrigin
    : new URL(process.env.APP_BASE_URL ?? "").origin;
  if (
    request.headers.get("origin") !== appOrigin ||
    request.headers.get("content-type")?.split(";")[0] !== "application/json"
  )
    throw new BackendError("NOT_AUTHORIZED", "Request not allowed.");
  let value: unknown;
  try {
    value = JSON.parse(
      new TextDecoder().decode(await boundedBody(request, 2048)),
    );
  } catch {
    throw new BackendError("INVALID_INPUT", "Check your input.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new BackendError("INVALID_INPUT", "Check your input.");
  return value as Record<string, unknown>;
}
export function failure(error: unknown) {
  const code =
    error instanceof BackendError ? error.code : "SHOPIFY_UNAVAILABLE";
  const messages: Record<string, string> = {
    NOT_AUTHENTICATED: "Sign in again to continue.",
    NOT_AUTHORIZED: "Only a workspace owner can manage this connection.",
    INVALID_SHOP: "Enter your store’s myshopify.com domain.",
    SHOP_ALREADY_LINKED: "This store is already linked to a workspace.",
    CONNECTION_CHANGED:
      "The connection changed. Refresh this page before continuing.",
    REPLACEMENT_CONFIRMATION_REQUIRED: "Confirm the store replacement first.",
    SHOP_MISMATCH: "Reconnect the store already linked to this business.",
    RATE_LIMITED: "Please wait before trying again.",
    REFRESH_IN_PROGRESS:
      "A connection update is already in progress. Try again shortly.",
    SHOPIFY_NOT_CONFIGURED: "Shopify setup is not ready yet.",
    VAULT_UNAVAILABLE: "Secure connection storage is not ready yet.",
  };
  return Response.json(
    {
      message:
        messages[code] ??
        "Shopify could not complete this request. Please try again.",
    },
    {
      status:
        code === "NOT_AUTHENTICATED"
          ? 401
          : code === "NOT_AUTHORIZED"
            ? 403
            : code === "RATE_LIMITED"
              ? 429
              : 400,
      headers: privateHeaders,
    },
  );
}
async function requestContext(body: Record<string, unknown>) {
  const context = await requireWorkspace();
  if (
    body.organizationId !== context.organizationId ||
    body.businessId !== context.businessId
  )
    throw new BackendError(
      "NOT_AUTHORIZED",
      "The active business changed. Reload this page.",
    );
  return context;
}
function generation(body: Record<string, unknown>) {
  if (!Number.isSafeInteger(body.generation) || Number(body.generation) < 0)
    throw new BackendError("INVALID_INPUT", "Reload this page.");
  return Number(body.generation);
}
export async function connect(request: Request) {
  try {
    const body = await input(request);
    if (
      Object.keys(body).some(
        (k) =>
          ![
            "shop",
            "replace",
            "generation",
            "organizationId",
            "businessId",
          ].includes(k),
      ) ||
      typeof body.shop !== "string" ||
      typeof body.replace !== "boolean"
    )
      throw new BackendError("INVALID_INPUT", "Check your input.");
    const context = await requestContext(body);
    await rateLimiter.consume("mutation", context.actorId);
    const result = await connectionService(context).begin(body.shop, {
      replace: body.replace,
      expectedGeneration: generation(body),
    });
    (await cookies()).set(stateCookie, result.state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/integrations/shopify/callback",
      maxAge: 600,
    });
    return Response.json({ url: result.url }, { headers: privateHeaders });
  } catch (error) {
    return failure(error);
  }
}
export async function callback(request: Request) {
  const jar = await cookies();
  try {
    const context = await requireWorkspace();
    await rateLimiter.consume("mutation", context.actorId);
    await connectionService(context).complete(
      new URL(request.url).searchParams,
      jar.get(stateCookie)?.value,
    );
    return redirect("/integrations?shopify=connected");
  } catch {
    return redirect("/integrations?shopify=failed");
  } finally {
    jar.set(stateCookie, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/integrations/shopify/callback",
      maxAge: 0,
    });
  }
}
export async function disconnect(request: Request) {
  try {
    const body = await input(request, false);
    if (
      Object.keys(body).some(
        (k) =>
          !["confirm", "generation", "organizationId", "businessId"].includes(
            k,
          ),
      ) ||
      body.confirm !== "disconnect"
    )
      throw new BackendError("INVALID_INPUT", "Confirm disconnection first.");
    const context = await requestContext(body);
    if (context.role !== "owner")
      throw new BackendError("NOT_AUTHORIZED", "Only an owner can disconnect.");
    await rateLimiter.consume("mutation", context.actorId);
    await new PostgresShopifyStore(context).disconnect(generation(body));
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    return failure(error);
  }
}
export async function read(request: Request) {
  try {
    const body = await input(request),
      call = parseToolCall({ tool: body.tool, input: body.input });
    if (
      Object.keys(body).some(
        (k) =>
          ![
            "tool",
            "input",
            "generation",
            "organizationId",
            "businessId",
          ].includes(k),
      )
    )
      throw new BackendError("INVALID_INPUT", "Check your input.");
    if (toolCatalog[call.tool].impact !== "read")
      throw new BackendError(
        "NOT_AUTHORIZED",
        "Only store reads are available.",
      );
    const context = await requestContext(body);
    await rateLimiter.consume("mutation", context.actorId);
    const record = await new PostgresShopifyStore(context).get();
    if (record?.generation !== generation(body))
      throw new BackendError("CONNECTION_CHANGED", "Reload this page.");
    const result = await (
      await liveShopify(context)
    ).read(call as ReadToolCall);
    return Response.json(result, { headers: privateHeaders });
  } catch (error) {
    return failure(error);
  }
}
