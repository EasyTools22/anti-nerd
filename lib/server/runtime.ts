import "server-only";
import type { AgentId, ActionReceipt, ToolName } from "@/types/backend";
import { toolCatalog } from "@/lib/backend/tool-catalog";
import type { AIProvider } from "./ai/provider";
import type { BusinessBrain } from "./brain/context";
import type { ActionEngine } from "./actions/engine";
import type { ExecutionContext } from "./security/credentials";
import { parseProposal } from "./validation";
import { BackendError } from "./errors";
const agentTools: Record<AgentId, ToolName[]> = {
  store: [
    "getStore",
    "getProduct",
    "listProducts",
    "updateProduct",
    "publishStoreChange",
  ],
  product: [
    "getStore",
    "listProducts",
    "getProduct",
    "getInventory",
    "updateProduct",
    "updateProductPrice",
  ],
  research: ["getStore", "listProducts", "getProduct"],
  ads: ["getStore", "listProducts"],
  creative: ["getStore", "getProduct"],
  support: [
    "getStore",
    "listOrders",
    "getOrder",
    "listCustomers",
    "refundOrder",
  ],
  finance: ["getStore", "listOrders", "getOrder", "listProducts"],
  operations: [
    "getStore",
    "listOrders",
    "getOrder",
    "getInventory",
    "updateInventory",
    "createDiscount",
  ],
};
/** One orchestration runtime, specialized by a typed tool allowlist. No autonomous loops. */
export class AgentRuntime {
  constructor(
    private provider: AIProvider,
    private brain: BusinessBrain,
    private actions: ActionEngine,
  ) {}
  async run(
    context: ExecutionContext,
    agent: AgentId,
    request: string,
  ): Promise<ActionReceipt[]> {
    if (
      !Object.hasOwn(agentTools, agent) ||
      !request.trim() ||
      request.length > 2000
    )
      throw new BackendError(
        "INVALID_REQUEST",
        "Choose a supported agent and a short request.",
      );
    if (!this.provider.capabilities.toolUse)
      throw new BackendError(
        "CAPABILITY_UNAVAILABLE",
        "This provider does not support tool proposals.",
      );
    const knowledge = await this.brain.retrieve({
      organizationId: context.organizationId,
      agent,
      request,
      maxCharacters: 6000,
    });
    if (JSON.stringify(knowledge).length > 6000)
      throw new BackendError(
        "CONTEXT_TOO_LARGE",
        "Context retrieval exceeded its budget.",
      );
    const allowed = agentTools[agent].map((name) => toolCatalog[name]);
    const raw = await this.provider.toolUse(
      {
        request,
        context: knowledge,
        modelPreference: null,
        maxOutputTokens: 1000,
      },
      allowed,
    );
    if (!Array.isArray(raw) || raw.length > 3)
      throw new BackendError(
        "PROPOSAL_LIMIT",
        "Provider exceeded the proposal limit.",
      );
    // Validate every proposal before executing any of them.
    const proposals = raw.map(parseProposal);
    if (proposals.some((p) => !agentTools[agent].includes(p.tool)))
      throw new BackendError(
        "TOOL_NOT_ALLOWED",
        "The provider proposed a tool outside this agent's scope.",
      );
    const receipts: ActionReceipt[] = [];
    for (const proposal of proposals) {
      const receipt = await this.actions.propose(context, proposal, {
        agent,
        provider: this.provider.id,
      });
      receipts.push(receipt);
      if (receipt.status === "succeeded")
        await this.brain.learnFromResult(context.organizationId, receipt);
    }
    return receipts;
  }
}
