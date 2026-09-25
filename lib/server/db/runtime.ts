import "server-only";
import type { WorkspaceContext } from "../auth/context";
import {
  PostgresActionRepository,
  PostgresAuditRepository,
  PostgresPolicyRepository,
} from "./repositories";
import { ActionEngine } from "../actions/engine";
import { MockShopifyAdapter } from "../integrations/mock-shopify";
import { MockBusinessBrain } from "../brain/context";
import { MockAIProvider } from "../ai/mock-provider";
import { AgentRuntime } from "../runtime";
/** Real verified identity + durable records; execution source remains explicitly mock. */
export function durablePreview(context: WorkspaceContext) {
  const actions = new PostgresActionRepository(context);
  const engine = new ActionEngine(
    new MockShopifyAdapter(context.organizationId),
    new PostgresPolicyRepository(context),
    actions,
    new PostgresAuditRepository(context),
  );
  return {
    context: { ...context, source: "mock" as const },
    actions,
    engine,
    runtime: new AgentRuntime(
      new MockAIProvider(),
      new MockBusinessBrain(context.organizationId),
      engine,
    ),
  };
}
