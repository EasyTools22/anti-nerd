import type { KnowledgeCategory, KnowledgeItem } from "@/types/brain";
export const categories: KnowledgeCategory[] = [
  "Customers",
  "Ads",
  "Products",
  "Brand",
  "Finance",
  "Store",
  "Operations",
  "Market",
  "Competitors",
  "Marketing",
];
const rows: [
  KnowledgeCategory,
  KnowledgeItem["type"],
  string,
  string,
  KnowledgeItem["confidence"],
  string[],
][] = [
  [
    "Customers",
    "pattern",
    "Repeat customers spend 38% more.",
    "Returning customers produce higher order value in this illustrative cohort. Most sample customers are from the Netherlands and Belgium.",
    "High",
    ["Orders · 184 sample orders", "Customer profiles"],
  ],
  [
    "Customers",
    "insight",
    "Customers care more about delivery speed than expected.",
    "Delivery questions appear frequently. Meta-acquired customers also show stronger repeat purchase behavior in the sample.",
    "High",
    ["47 customer conversations", "Ad attribution"],
  ],
  [
    "Ads",
    "pattern",
    "Show the product in the first 2 seconds.",
    "The strongest sample video creatives introduce the product immediately. Video ads outperform static ads for Product X.",
    "High",
    ["38 advertisements"],
  ],
  [
    "Finance",
    "insight",
    "Returning customers generate a higher margin.",
    "Acquisition costs are lower for returning customers. Revenue alone does not explain profitability.",
    "Medium",
    ["Order + cost data"],
  ],
  [
    "Store",
    "pattern",
    "People leave Product X mostly on mobile.",
    "The sample suggests a mobile product-page friction point. This is a hypothesis to investigate.",
    "Medium",
    ["Store behavior · 2 weeks"],
  ],
  [
    "Products",
    "relationship",
    "Product A buyers often return for Product B.",
    "This sample purchase pattern could support a complementary-product recommendation.",
    "Medium",
    ["Order history"],
  ],
  [
    "Brand",
    "preference",
    "Recognizable products matter to this audience.",
    "Customers respond to familiar silhouettes and straightforward product stories.",
    "Medium",
    ["Customer conversations"],
  ],
  [
    "Operations",
    "fact",
    "Delivery questions create support workload.",
    "Proactive tracking updates could reduce repeated questions.",
    "High",
    ["Support inbox"],
  ],
  [
    "Market",
    "prediction",
    "Travel accessories may gain seasonal demand.",
    "An illustrative hypothesis; no live market research has been performed.",
    "Low",
    ["Sample market notes"],
  ],
  [
    "Competitors",
    "fact",
    "Competitors emphasize delivery reassurance.",
    "A sample observation from fictional competitor records.",
    "Medium",
    ["Demo competitor collection"],
  ],
  [
    "Marketing",
    "rule",
    "Protect profit over revenue growth.",
    "Review contribution margin before increasing promotional spend.",
    "Confirmed by owner",
    ["Owner instructions"],
  ],
  [
    "Customers",
    "preference",
    "Customers may prefer free shipping.",
    "A limited checkout sample suggests this; it has not been confirmed.",
    "Medium",
    ["2 weeks of checkout behavior"],
  ],
];
export const knowledgeSeed: KnowledgeItem[] = rows.map((r, i) => ({
  id: `knowledge-${i}`,
  category: r[0],
  type: r[1],
  title: r[2],
  summary: r[3],
  confidence: r[4],
  sources: r[5],
  createdAt: "2026-09-24T08:00:00Z",
  updatedAt: "2026-09-24T08:00:00Z",
  importance: "normal",
}));
export const dna = [
  ["Growth focus", 86],
  ["Profit sensitivity", 92],
  ["Brand importance", 58],
  ["Customer loyalty", 62],
  ["Paid ads dependency", 88],
  ["Operational load", 64],
  ["Price sensitivity", 82],
] as const;
export const relationships = [
  ["Fast delivery", "increases", "Customer satisfaction"],
  ["Video creatives", "improve", "Click-through rate"],
  ["Product A buyers", "often purchase", "Product B"],
  ["Discounts > 20%", "increase revenue, but reduce", "Contribution margin"],
];
export const businessSummary =
  "WK Exclusive is a fashion-focused e-commerce business primarily serving customers in the Netherlands and Belgium. Customers respond strongly to recognizable products and promotional offers. Paid social is an important acquisition channel. Delivery communication creates a significant share of support workload. Profitability depends on product costs, payment fees and advertising efficiency.";
export const summaryHistory = [
  { date: "Today · 09:42", text: businessSummary },
  {
    date: "Yesterday · 16:20",
    text: "WK Exclusive serves a largely Dutch audience. Paid social drives acquisition. Delivery communication is an area to investigate.",
  },
];
export const searchExamples = [
  "Who are my best customers?",
  "What has Anti-Nerd learned about my ads?",
  "What products have the best margins?",
  "What does Anti-Nerd know about delivery problems?",
];
export function searchKnowledge(items: KnowledgeItem[], query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return items;
  const topic = /customer|loyal/.test(q)
    ? "Customers"
    : /ad|creative/.test(q)
      ? "Ads"
      : /margin|profit/.test(q)
        ? "Finance"
        : /delivery|shipping/.test(q)
          ? "Operations"
          : null;
  return items.filter(
    (item) =>
      item.category === topic ||
      `${item.title} ${item.summary} ${item.category} ${item.sources.join(" ")}`
        .toLowerCase()
        .includes(q),
  );
}
