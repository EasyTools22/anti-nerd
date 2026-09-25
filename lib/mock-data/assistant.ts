import type { AssistantReply } from "@/types/assistant";
export const assistantExamples: { prompt: string; reply: AssistantReply }[] = [
  {
    prompt: "What does my Business Brain understand?",
    reply: {
      source: "demo",
      text: "The sample Brain connects customers, products, advertising and operations. Finance, inventory and email still have gaps. This answer is predefined; it does not read or reason over your edited memory.",
      sources: ["Business Brain · illustrative coverage"],
      nextStep: { label: "Explore the Brain", href: "/brain" },
    },
  },
  {
    prompt: "Which beliefs should I review?",
    reply: {
      source: "demo",
      text: "Start with low and moderate confidence knowledge. Review the sources, correct assumptions and pin owner rules that matter. This is a demo workflow, not a personalized assessment.",
      sources: ["Business Brain · example confidence states"],
      nextStep: { label: "Review knowledge", href: "/brain" },
    },
  },
  {
    prompt: "Pause losing ads.",
    reply: {
      source: "demo",
      text: "Nothing has been paused. Review the sample campaign evidence and owner limits before making a decision. This command illustrates a future approval workflow.",
      sources: ["Sample ads", "Owner rules"],
      nextStep: { label: "Review your rules", href: "/control-center" },
    },
  },
  {
    prompt: "Review decisions needing me.",
    reply: {
      source: "demo",
      text: "The demo approval center contains budget and refund examples. Review the evidence, expected impact and risk before deciding.",
      sources: ["Sample approval requests"],
      nextStep: { label: "Open approval center", href: "/control-center" },
    },
  },
  {
    prompt: "Make 10 new creatives.",
    reply: {
      source: "demo",
      text: "Creative generation is not connected. Explore the existing sample creative library to see formats and performance context.",
      sources: ["Demo creative library"],
      nextStep: { label: "Explore creatives", href: "/creatives" },
    },
  },
  {
    prompt: "Why was profit lower yesterday?",
    reply: {
      source: "demo",
      text: "In this demo example, revenue was almost unchanged, but ad costs increased 18% and Product A represented a larger share of orders. Product A has a lower margin. This is a predefined illustration, not an analysis of your business.",
      sources: ["Ads", "Orders", "Product costs", "Business Brain"],
      nextStep: { label: "Explore your finances", href: "/finance" },
    },
  },
  {
    prompt: "Find products I could sell.",
    reply: {
      source: "demo",
      text: "A useful starting point is a product that solves a clear problem, is easy to ship, and leaves room for profit. The sample research collection includes a travel organizer and a desk lamp. Their prices and potential are illustrative; live product research is not connected.",
      nextStep: { label: "Explore sample products", href: "/research" },
    },
  },
  {
    prompt: "Which ads need attention?",
    reply: {
      source: "demo",
      text: "In our sample campaigns, TikTok’s cost per purchase has risen 21%. That means each order is costing more in advertising. A possible next step is to review the creative and consider a smaller budget. This is a demo recommendation; no campaign has been changed.",
      nextStep: { label: "Review sample campaigns", href: "/ads" },
    },
  },
  {
    prompt: "How can I improve my store?",
    reply: {
      source: "demo",
      text: "One sample improvement: make product pages easier to scan on mobile. Put the price, three clear benefits, delivery information, and the buy button close together. This suggestion demonstrates the future experience; your live store has not been inspected or changed.",
      nextStep: { label: "See your store preview", href: "/store" },
    },
  },
  {
    prompt: "Create a promotion for this weekend.",
    reply: {
      source: "demo",
      text: "Sample promotion idea: “Your weekend essentials, with a little extra.” Offer free delivery on orders over €75, then prepare a short email for returning customers. Check your margin first. This is an example only: no discount, email, or promotion has been created.",
      nextStep: { label: "Explore marketing", href: "/marketing" },
    },
  },
];
