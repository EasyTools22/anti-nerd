import "server-only";
import type { BackendStatus, OrganizationPolicy } from "@/types/backend";
import { AgentRuntime } from "./runtime";
import { createAIProvider } from "./ai/registry";
import { MockShopifyAdapter } from "./integrations/mock-shopify";
import { MockBusinessBrain } from "./brain/context";
import { ActionEngine } from "./actions/engine";
import { MockActionRepository, MockAuditRepository } from "./actions/stores";
import type { ExecutionContext } from "./security/credentials";
import { pending } from "./errors";
import { shopifyConfigured } from "./shopify/config";
export function getBackendStatus(): BackendStatus {
  return {
    phase: "foundation",
    persistence:
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
        ? "configured"
        : "pending",
    authentication:
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ? "configured"
        : "pending",
    liveConnectionsEnabled: shopifyConfigured(),
    previewAvailable: process.env.NODE_ENV === "development",
    shopify: {
      status: "not_connected",
      lastSyncAt: null,
      health: "unknown",
      capabilities: ["Products", "Orders", "Customers", "Inventory", "Store"],
    },
  };
}
/** Composition root. One isolated fixture world per preview; no global mutable tenancy. */
export function createBackend(mode: "mock" | "live") {
  if (mode === "live") throw pending();
  const context: ExecutionContext = {
    organizationId: "mock-organization",
    actorId: "mock-owner",
    role: "owner",
    source: "mock",
  };
  const policy: OrganizationPolicy = {
    organizationId: context.organizationId,
    revision: 1,
    rules: {},
  };
  const audit = new MockAuditRepository();
  const brain = new MockBusinessBrain(context.organizationId);
  const actions = new ActionEngine(
    new MockShopifyAdapter(context.organizationId),
    { get: async () => structuredClone(policy) },
    new MockActionRepository(),
    audit,
  );
  return {
    context,
    audit,
    brain,
    actions,
    runtime: new AgentRuntime(createAIProvider("mock"), brain, actions),
  };
}
