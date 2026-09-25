"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireUser,
  requireWorkspace,
  selectWorkspace,
} from "../auth/context";
import { sameOrigin, type FormState } from "../auth/actions";
import { sessionClient, databaseError } from "./client";
import { rateLimiter } from "../security/rate-limit";
import { BackendError } from "../errors";
import { liveShopify } from "../shopify/service";
import { durablePreview } from "./runtime";
function field(form: FormData, key: string, max = 120) {
  const value = String(form.get(key) ?? "").trim();
  if (value.length > max)
    throw new BackendError("INVALID_INPUT", "Check your input.");
  return value;
}
function uuid(value: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new BackendError("INVALID_INPUT", "Invalid identifier.");
  return value;
}
export async function workspaceAction(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  let destination = "";
  try {
    await sameOrigin();
    const user = await requireUser();
    const operation = field(form, "operation");
    await rateLimiter.consume(
      operation === "approve" || operation === "reject"
        ? "approval"
        : "mutation",
      user.id,
    );
    const client = await sessionClient();
    if (operation === "onboard") {
      const { data, error } = await client.rpc("create_workspace", {
        workspace_name: field(form, "organization"),
        business_name: field(form, "business"),
        kind: field(form, "kind"),
      });
      databaseError(error);
      await selectWorkspace(data, "");
      destination = "/";
    } else if (operation === "switch") {
      await selectWorkspace(
        uuid(field(form, "organization")),
        uuid(field(form, "business")),
      );
      const returnTo = field(form, "returnTo");
      destination = [
        "/products",
        "/orders",
        "/customers",
        "/inventory",
        "/store",
        "/integrations",
      ].includes(returnTo)
        ? returnTo
        : "/integrations";
    } else if (operation === "add-business") {
      const context = await requireWorkspace();
      if (
        field(form, "organization") !== context.organizationId ||
        field(form, "activeBusiness") !== context.businessId
      )
        throw new BackendError(
          "NOT_AUTHORIZED",
          "The business changed. Reload this page.",
        );
      const { data, error } = await client.rpc("create_business", {
        org: context.organizationId,
        business_name: field(form, "business"),
        kind: field(form, "kind"),
      });
      databaseError(error);
      await selectWorkspace(context.organizationId, data);
      destination = "/integrations";
    } else {
      const context = await requireWorkspace();
      if (operation === "instruction") {
        const { error } = await client.rpc("save_instruction", {
          org: context.organizationId,
          business:
            field(form, "scope") === "organization" ? null : context.businessId,
          item: field(form, "id") ? uuid(field(form, "id")) : null,
          body: field(form, "instruction", 5000),
          rank: Number(field(form, "priority")),
          enabled: form.get("active") === "on",
        });
        databaseError(error);
      } else if (operation === "policy") {
        const { error } = await client.rpc("set_policy", {
          org: context.organizationId,
          cap: field(form, "capability"),
          setting: field(form, "mode"),
          config:
            field(form, "mode") === "AUTOMATIC_WITH_LIMITS"
              ? {
                  currency: field(form, "currency"),
                  maxNewPriceMinor: Number(field(form, "limit")),
                }
              : null,
          expected_revision: Number(field(form, "revision")),
        });
        databaseError(error);
      } else if (operation === "preview") {
        if (process.env.NODE_ENV !== "development")
          throw new BackendError("NOT_AUTHORIZED", "Development only.");
        const preview = durablePreview(context),
          scenario = field(form, "scenario");
        if (!["read", "price"].includes(scenario))
          throw new BackendError("INVALID_INPUT", "Invalid scenario.");
        await preview.runtime.run(
          preview.context,
          "store",
          scenario === "price" ? "Review product price" : "Read store identity",
        );
      } else if (operation === "approve" || operation === "reject") {
        const preview = durablePreview(context);
        if (operation === "approve") {
          const actionId = uuid(field(form, "action"));
          const record = await preview.actions.get(
            context.organizationId,
            actionId,
          );
          const execution =
            record?.executionSource === "live"
              ? await liveShopify(context)
              : preview;
          const receipt = await execution.engine.approve(
            execution.context,
            actionId,
            uuid(field(form, "approval")),
          );
          if (record?.executionSource === "live") {
            // Keep the approved result in this response only; never save Shopify bodies to audit/storage.
            return receipt.status === "succeeded"
              ? {
                  ok: true,
                  message: "Approved store information is ready below.",
                  readResult: receipt.data,
                }
              : {
                  message:
                    "The approved read could not complete. Check the connection before requesting a new read.",
                };
          }
        } else await preview.actions.reject(uuid(field(form, "approval")));
      } else throw new BackendError("INVALID_INPUT", "Unavailable operation.");
    }
  } catch (error) {
    const code =
      error instanceof BackendError ? error.code : "DATABASE_UNAVAILABLE";
    const messages: Record<string, string> = {
      NOT_AUTHENTICATED: "Sign in again to continue.",
      NOT_AUTHORIZED: "Your role does not allow this change.",
      OWNER_REQUIRED: "Only a workspace owner can approve.",
      ORGANIZATION_NOT_FOUND: "This workspace is unavailable.",
      APPROVAL_EXPIRED: "This approval expired or was already handled.",
      POLICY_CHANGED: "The policy changed. Refresh and request a new review.",
      RATE_LIMITED: "Please wait before trying again.",
      INVALID_INPUT: "Check the form and try again.",
      INVALID_LIMIT: "Use a supported currency and a whole-number price limit.",
      WORKSPACE_LIMIT: "Your workspace limit has been reached.",
    };
    return {
      message:
        messages[code] ?? "The change could not be saved. Try again later.",
    };
  }
  revalidatePath("/", "layout");
  if (destination) redirect(destination);
  return { ok: true, message: "Saved to your workspace." };
}
