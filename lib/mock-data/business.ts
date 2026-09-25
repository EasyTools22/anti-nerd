import type { AuditEvent, Order, Workspace } from "@/types/business";
export const workspace: Workspace = {
  id: "wk-exclusive",
  name: "WK Exclusive",
  type: "E-commerce",
};
export const money = (value: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
export const orders: Order[] = [
  "Emma de Vries",
  "Lucas Bakker",
  "Sophie Jansen",
  "Noah Visser",
  "Olivia Smit",
  "Liam van Dijk",
  "Mila Peters",
  "James Wilson",
  "Isabella Rossi",
  "Finn Meijer",
  "Amelia Taylor",
  "Sem Bos",
].map((customer, i) => ({
  id: String(83921 - i),
  workspaceId: workspace.id,
  customer,
  email: customer.toLowerCase().split(" ")[0] + "@example.com",
  amount: [189, 249, 89, 320, 159, 78, 429, 210, 169, 95, 289, 129][i],
  date: `2026-09-${24 - Math.floor(i / 4)}`,
  status: i === 5 ? "Pending" : i === 9 ? "Refunded" : "Paid",
  fulfillment:
    i % 4 === 0 ? "Delayed" : i % 3 === 0 ? "Processing" : "Delivered",
  source: i % 3 === 0 ? "WooCommerce" : "Shopify",
}));
export { demoAgents as agents } from "./intelligence";
export const activity: AuditEvent[] = [
  [
    "10:42",
    "Support Agent",
    "Answered 8 customer conversations",
    "Responses prepared",
    "Completed",
  ],
  [
    "10:31",
    "Ads Agent",
    "Recommended reducing Campaign #12 budget",
    "Budget change of −15%",
    "Awaiting approval",
  ],
  [
    "10:14",
    "Operations Agent",
    "Flagged order #83921 as potentially delayed",
    "Owner notified",
    "Completed",
  ],
  [
    "09:58",
    "Finance Agent",
    "Updated today’s profit estimate",
    "Estimate ready to review",
    "Completed",
  ],
  [
    "09:42",
    "Creative Agent",
    "Prepared 4 new creative concepts",
    "Added to creative library",
    "Approved",
  ],
].map(([time, actor, action, result, status], i) => ({
  id: `evt-${i}`,
  workspaceId: workspace.id,
  timestamp: `2026-09-24T${time}:00`,
  actor,
  action,
  result,
  status: status as AuditEvent["status"],
}));
export const campaigns = [
  {
    name: "Everyday essentials · Prospecting",
    platform: "Meta",
    spend: 1680,
    revenue: 7224,
    roas: 4.3,
    cpa: 18.4,
    status: "Active",
  },
  {
    name: "Autumn collection · Retargeting",
    platform: "Meta",
    spend: 820,
    revenue: 4264,
    roas: 5.2,
    cpa: 12.8,
    status: "Active",
  },
  {
    name: "Made for your everyday",
    platform: "TikTok",
    spend: 760,
    revenue: 2052,
    roas: 2.7,
    cpa: 26.2,
    status: "Review",
  },
  {
    name: "Brand search · Netherlands",
    platform: "Google",
    spend: 620,
    revenue: 2232,
    roas: 3.6,
    cpa: 15.5,
    status: "Active",
  },
  {
    name: "New arrivals · Discovery",
    platform: "Snapchat",
    spend: 300,
    revenue: 570,
    roas: 1.9,
    cpa: 30,
    status: "Paused",
  },
];
export const products = [
  { name: "Everyday tote", category: "Accessories", price: 89, stock: 48 },
  { name: "Essential overshirt", category: "Clothing", price: 129, stock: 6 },
  { name: "Weekend carryall", category: "Accessories", price: 189, stock: 24 },
  { name: "Signature knit", category: "Clothing", price: 159, stock: 3 },
];
