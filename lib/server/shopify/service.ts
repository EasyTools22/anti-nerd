import "server-only";
import type { WorkspaceContext } from "../auth/context";
import type { ReadToolCall } from "@/types/backend";
import {
  PostgresActionRepository,
  PostgresAuditRepository,
  PostgresPolicyRepository,
  PostgresConnectionRepository,
} from "../db/repositories";
import { ActionEngine } from "../actions/engine";
import { ShopifyAdapter } from "../integrations/shopify";
import { ShopifyConnectionService } from "../integrations/shopify-connection";
import { shopifyConfig } from "./config";
import { ShopifyVault } from "./vault";
import { ShopifyTokenStore } from "./tokens";
import { PostgresShopifyStore } from "./store";
import { BackendError } from "../errors";
/** Production Shopify composition root: verified tenant context, durable storage and encrypted credentials.
 * HTTP entry points must pass the shared readiness gate before constructing these services. */
export function connectionService(context: WorkspaceContext) {
  return new ShopifyConnectionService(
    context,
    new PostgresShopifyStore(context),
    shopifyConfig(),
    ShopifyVault.fromEnvironment(),
  );
}
export async function liveShopify(context: WorkspaceContext) {
  const store = new PostgresShopifyStore(context),
    record = await store.get();
  if (!record || record.status !== "connected")
    throw new BackendError(
      "NOT_CONNECTED",
      "Connect Shopify to see your store.",
    );
  const adapter = new ShopifyAdapter(
    context,
    record.id,
    new PostgresConnectionRepository(context),
    new ShopifyTokenStore(
      context,
      record.id,
      store,
      ShopifyVault.fromEnvironment(),
      shopifyConfig(),
    ),
  );
  let failure: string | undefined;
  const controlled = {
    integration: adapter.integration,
    source: adapter.source,
    organizationId: adapter.organizationId,
    capabilities: adapter.capabilities,
    executeRead: async (call: ReadToolCall) => {
      try {
        const result = await adapter.executeRead(call);
        await store.observed();
        return result;
      } catch (error) {
        failure =
          error instanceof BackendError ? error.code : "SHOPIFY_UNAVAILABLE";
        if (failure === "NEEDS_REAUTHORIZATION")
          await store.unhealthy(
            "NEEDS_REAUTHORIZATION",
            undefined,
            record.generation,
          );
        else if (failure === "SCOPE_REQUIRED")
          await store.unhealthy("MISSING_SCOPE", undefined, record.generation);
        // Throttling/transient network errors do not revoke an otherwise valid installation.
        throw new BackendError(
          failure,
          "Store information is temporarily unavailable.",
        );
      }
    },
  };
  const actions = new PostgresActionRepository(context),
    engine = new ActionEngine(
      controlled,
      new PostgresPolicyRepository(context),
      actions,
      new PostgresAuditRepository(context),
    );
  return {
    engine,
    actions,
    context,
    read: async (call: ReadToolCall) => {
      failure = undefined;
      const receipt = await engine.propose(
        context,
        {
          ...call,
          reason: "Workspace member requested this store information.",
          confidence: 1,
        },
        { agent: "store", provider: "anti-nerd" },
      );
      return { receipt, errorCode: failure };
    },
  };
}
