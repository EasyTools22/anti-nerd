import type { MarketingCampaign, ResearchProduct } from "@/types/product-shell";
export const researchProducts: ResearchProduct[] = [
  {
    id: "organizer",
    name: "Everyday travel organizer",
    category: "Travel accessories",
    price: 39,
    margin: "58%",
    interest: "Growing steadily",
    competition: "Moderate",
    potential: "Worth exploring",
    detail:
      "A compact way to keep cables and small essentials together. Explore who travels regularly and what they find frustrating about packing.",
    initiallySaved: true,
  },
  {
    id: "lamp",
    name: "Rechargeable desk lamp",
    category: "Home & living",
    price: 59,
    margin: "46%",
    interest: "Growing quickly",
    competition: "High",
    potential: "Needs a clear angle",
    detail:
      "A flexible light for smaller spaces. A future research report could help compare designs, supplier reliability, and what makes your offer different.",
  },
  {
    id: "bowl",
    name: "Slow-feeder pet bowl",
    category: "Pet essentials",
    price: 29,
    margin: "62%",
    interest: "Consistent interest",
    competition: "Moderate",
    potential: "Worth exploring",
    detail:
      "An everyday accessory for pet owners. Future research would help check customer concerns, materials, and product safety before making a buying decision.",
  },
];
export const marketOpportunities = [
  {
    title: "Small spaces, thoughtful living",
    description:
      "Explore practical home essentials for people making the most of a smaller home.",
    category: "Home & living",
  },
  {
    title: "A calmer daily commute",
    description:
      "Look at the little frustrations commuters face, from packing a bag to staying organized.",
    category: "Everyday travel",
  },
];
export const watchedProducts = [
  {
    name: "Modular drawer organizers",
    category: "Home organization",
    signal: "Compare materials and shipping costs",
  },
  {
    name: "Foldable weekend bag",
    category: "Travel accessories",
    signal: "Explore a lightweight, durable design",
  },
];
export const launchJourney = [
  {
    title: "Find your niche",
    description: "Discover who you want to help and what they need.",
    href: "/research",
  },
  {
    title: "Find products",
    description: "Explore products with a clear purpose and room for profit.",
    href: "/research",
  },
  {
    title: "Create your brand",
    description: "Give your business a name, a look, and a point of view.",
  },
  {
    title: "Build your store",
    description: "Bring your idea to life with a simple online storefront.",
    href: "/store",
  },
  {
    title: "Set up payments",
    description: "Make it easy for customers to pay.",
  },
  {
    title: "Create your first ads",
    description: "Introduce your business to the right people.",
    href: "/ads",
  },
  {
    title: "Launch",
    description: "Get ready to open your doors and learn as you grow.",
  },
];
export const marketingCampaigns: MarketingCampaign[] = [
  {
    id: "autumn",
    name: "A first look at autumn",
    audience: "Returning customers",
    channel: "Email",
    status: "Sent",
    date: "22 Sep 2026",
    recipients: 1240,
    orders: 18,
  },
  {
    id: "weekend",
    name: "Your weekend essentials",
    audience: "Engaged subscribers",
    channel: "Email",
    status: "Draft",
    date: "Not scheduled",
    recipients: 860,
    orders: 0,
  },
  {
    id: "welcome",
    name: "A warm welcome",
    audience: "New subscribers",
    channel: "Welcome flow",
    status: "Scheduled",
    date: "26 Sep 2026",
    recipients: 120,
    orders: 0,
  },
];
export const marketingModules = [
  {
    name: "Email campaigns",
    description:
      "Send the right message to the people who want to hear from you.",
    detail:
      "Prepare a campaign, choose who should receive it, and review a preview before sending. Sending and scheduling are not connected in this demo.",
  },
  {
    name: "Automated flows",
    description: "A helpful welcome or a gentle reminder, at the right moment.",
    detail:
      "A future flow can prepare a welcome email when someone signs up, or a reminder after an unfinished checkout. No messages or background tasks run here.",
  },
  {
    name: "Customer segments",
    description: "Group customers by what they like and how they shop.",
    detail:
      "Sample groups include returning customers, first-time buyers, and engaged subscribers. Real groups will use connected customer data later.",
  },
  {
    name: "Promotions",
    description: "Give customers a thoughtful reason to come back.",
    detail:
      "Plan an offer with a clear audience, start date, and end date. Nothing is published to your store in this preview.",
  },
  {
    name: "Discounts",
    description: "Create offers that work for your customers and your profit.",
    detail:
      "Preview an offer such as 10% off selected products. Future controls will help check the impact on your profit before a discount goes live.",
  },
];
