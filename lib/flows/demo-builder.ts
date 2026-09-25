import type { AutomationFlow } from "@/types/intelligence";
import { flowTemplates } from "@/lib/mock-data/flows";
export interface FlowBuildResult {
  flow: AutomationFlow;
  explanation: string;
}
export interface FlowBuilder {
  build: (request: string) => Promise<FlowBuildResult>;
}
/** Selects a local recipe; it never generates or executes a real automation. */
export const demoFlowBuilder: FlowBuilder = {
  async build(request) {
    const text = request.toLowerCase();
    const id = /stock|inventory/.test(text)
      ? "low-stock"
      : /delay|tracking|delivery/.test(text)
        ? "delayed-order"
        : /negative|complaint|frustrat|refund/.test(text)
          ? "negative-message"
          : /retention|recently|90 days/.test(text)
            ? "retention"
            : /winning product|new product/.test(text)
              ? "winning-product"
              : /winning ad|increase budget|scale/.test(text)
                ? "winning-ad"
                : "losing-ads";
    const recipe = flowTemplates.find((item) => item.id === id)!;
    const amount = request
      .match(/€\s*(\d+(?:[.,]\d{1,2})?)/)?.[1]
      ?.replace(",", ".");
    const flow: AutomationFlow = {
      ...recipe,
      source: "demo-prompt",
      enabled: false,
      steps: recipe.steps.map((step) => ({
        ...step,
        text:
          id === "losing-ads" && amount && step.kind === "When"
            ? `Ad spends €${amount} without a purchase`
            : step.text,
      })),
    };
    return {
      flow,
      explanation: `Demo recipe: “${recipe.name}”. This selects a predefined example${amount && id === "losing-ads" ? " using the euro amount you entered" : ""}; it does not understand every instruction. Review every step. Nothing runs.`,
    };
  },
};
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length ||
    from === to
  )
    return items;
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
