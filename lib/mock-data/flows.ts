import type { AutomationFlow, FlowStepKind } from "@/types/intelligence";
const template = (
  id: string,
  name: string,
  description: string,
  steps: [FlowStepKind, string][],
): AutomationFlow => ({
  id,
  name,
  description,
  source: "template",
  enabled: false,
  steps: steps.map(([kind, text], i) => ({ id: `${id}-${i}`, kind, text })),
});
export const flowTemplates: AutomationFlow[] = [
  template(
    "losing-ads",
    "Stop losing ads",
    "Catch wasted spend and make room for a better idea.",
    [
      ["When", "Ad spends €50 without a purchase"],
      ["Anti-Nerd", "Analyze why"],
      ["If", "Ad is likely losing money"],
      ["Do", "Pause ad"],
      ["Then", "Create 3 replacement creatives"],
      ["Notify me", "Ad replaced"],
    ],
  ),
  template(
    "winning-ad",
    "Winning ad found",
    "Give a good ad room to grow, one small step at a time.",
    [
      ["When", "A winning ad is found"],
      ["Do", "Increase budget gradually within my limits"],
      ["Then", "Watch performance"],
      ["If", "Profitability falls"],
      ["Do", "Stop increasing the budget"],
      ["Notify me", "Budget review ready"],
    ],
  ),
  template(
    "delayed-order",
    "Delayed order",
    "Keep your customer in the loop.",
    [
      ["When", "An order is delayed"],
      ["Anti-Nerd", "Check tracking"],
      ["Then", "Prepare customer message"],
      ["If", "My rules allow sending automatically"],
      ["Do", "Send the message; otherwise request approval"],
      ["Notify me", "Customer update prepared"],
    ],
  ),
  template(
    "negative-message",
    "Negative customer message",
    "Give difficult conversations a little extra care.",
    [
      ["When", "A negative customer message arrives"],
      ["Anti-Nerd", "Detect frustration"],
      ["Then", "Prepare a helpful response"],
      ["If", "A refund is requested"],
      ["Do", "Request approval"],
      ["Notify me", "Customer needs your attention"],
    ],
  ),
  template(
    "low-stock",
    "Low stock",
    "Protect your bestsellers before they sell out.",
    [
      ["When", "A product is low on stock"],
      ["Notify me", "Stock is running low"],
      ["Anti-Nerd", "Check current advertising"],
      ["If", "Stock cannot meet demand"],
      ["Do", "Prepare an advertising reduction for review"],
    ],
  ),
  template(
    "winning-product",
    "New winning product",
    "Turn a promising product into a thoughtful test.",
    [
      ["When", "A promising new product is found"],
      ["Anti-Nerd", "Create creative concepts"],
      ["Then", "Prepare an ad test"],
      ["Do", "Request launch approval"],
    ],
  ),
  template(
    "retention",
    "Customer hasn’t purchased recently",
    "Help customers find their way back.",
    [
      ["When", "A customer has not purchased in 90 days"],
      ["Do", "Add to a retention campaign draft"],
      ["Then", "Check consent before any future sending"],
      ["Notify me", "Retention audience ready to review"],
    ],
  ),
];
export const flowStepKinds: FlowStepKind[] = [
  "When",
  "Anti-Nerd",
  "If",
  "Do",
  "Then",
  "Notify me",
];
