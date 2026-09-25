import "server-only";
import type { ActionReceipt, AgentId } from "@/types/backend";
export interface BrainContext {
  ownerInstructions: string[];
  businessGoals: string[];
  financialConstraints: string[];
  knowledge: { id: string; summary: string; source: string }[];
  productContext: string[];
}
export interface BusinessBrain {
  retrieve(input: {
    organizationId: string;
    agent: AgentId;
    request: string;
    maxCharacters: number;
  }): Promise<BrainContext>;
  learnFromResult(
    organizationId: string,
    receipt: ActionReceipt,
  ): Promise<void>;
}
/** Bounded fake retrieval for development. Not embeddings or the client demo memory. */
export class MockBusinessBrain implements BusinessBrain {
  #seen = new Set<string>();
  constructor(private organizationId: string) {}
  async retrieve(input: {
    organizationId: string;
    agent: AgentId;
    request: string;
    maxCharacters: number;
  }): Promise<BrainContext> {
    if (input.organizationId !== this.organizationId)
      throw new Error("Organization mismatch");
    const context: BrainContext = {
      ownerInstructions: ["Ask before changing prices."],
      businessGoals: ["Protect contribution margin."],
      financialConstraints: ["No automatic financial actions."],
      knowledge: [],
      productContext: [],
    };
    if (/pric|product/i.test(input.request)) {
      context.knowledge.push({
        id: "mock-margin",
        summary: "A mock product needs a margin review.",
        source: "Mock fixture; not verified business knowledge",
      });
      context.productContext.push(
        "Mock product gid://shopify/Product/1, variant gid://shopify/ProductVariant/1. Example EUR 89.00; not a verified current price.",
      );
    }
    if (JSON.stringify(context).length > input.maxCharacters)
      throw new Error("Context budget exceeded");
    return context;
  }
  async learnFromResult(org: string, receipt: ActionReceipt) {
    if (org !== this.organizationId) throw new Error("Organization mismatch");
    if (receipt.status === "succeeded") this.#seen.add(receipt.actionId);
  }
  get learnedActionCount() {
    return this.#seen.size;
  }
}
