import "server-only";
import type { AIProvider, AIRequest } from "./provider";
import type {
  ActionProposal,
  ProviderCapabilities,
  ToolDefinition,
} from "@/types/backend";
export class MockAIProvider implements AIProvider {
  readonly id = "mock" as const;
  readonly capabilities: ProviderCapabilities = {
    generateText: true,
    reason: true,
    structuredOutput: true,
    toolUse: true,
    vision: false,
    longContext: false,
    maxContextTokens: 4096,
  };
  async generateText() {
    return { text: "Mock response. No AI provider was contacted." };
  }
  async reason() {
    return {
      summary: "Use the owner policy before taking action.",
      uncertainties: ["All input data is illustrative."],
    };
  }
  async structuredOutput<T>(
    _request: AIRequest,
    schema: { parse: (raw: unknown) => T },
  ): Promise<T> {
    return schema.parse({ summary: "Mock structured response" });
  }
  async toolUse(
    request: AIRequest,
    tools: readonly ToolDefinition[],
  ): Promise<ActionProposal[]> {
    const proposal: ActionProposal = /pric/i.test(request.request)
      ? {
          tool: "updateProductPrice",
          input: {
            productId: "gid://shopify/Product/1",
            variantId: "gid://shopify/ProductVariant/1",
            currentPrice: { amountMinor: 8900, currency: "EUR" },
            newPrice: { amountMinor: 9900, currency: "EUR" },
          },
          reason:
            "Mock recommendation: review the product margin before changing this price.",
          confidence: 0.91,
        }
      : {
          tool: "getStore",
          input: {},
          reason: "Read the mock store identity for this request.",
          confidence: 1,
        };
    return tools.some((t) => t.name === proposal.tool) ? [proposal] : [];
  }
}
