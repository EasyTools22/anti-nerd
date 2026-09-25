export const businessTerms = {
  ROAS: {
    label: "Return on ad spend",
    explanation:
      "How much sales revenue you get for each €1 spent on ads. A ROAS of 3.8x means €3.80 in sales per €1 spent. This is revenue, not profit; product costs and other expenses still need to be paid.",
  },
  CPA: {
    label: "Cost per purchase",
    explanation:
      "What you spend on advertising for each order attributed to your ads. A CPA of €24.80 means you are paying €24.80 in ads for each order. Lower is usually better, as long as those orders remain profitable.",
  },
  CTR: {
    label: "Click-through rate",
    explanation:
      "The share of people who click after seeing an ad. A CTR of 4% means about 4 clicks for every 100 times the ad is shown. A click does not necessarily lead to an order.",
  },
  Conversion: {
    label: "Visitors who buy",
    explanation:
      "The percentage of store visits that turn into an order. A conversion rate of 3.2% means roughly 3 orders for every 100 visits.",
  },
  Margin: {
    label: "Estimated margin",
    explanation:
      "The share of the selling price left after the estimated product cost. These sample estimates exclude advertising, shipping, fees, returns, and tax. They are not a forecast of your take-home profit.",
  },
} as const;
export type BusinessTerm = keyof typeof businessTerms;

export function explainMetric(term: BusinessTerm, value?: number): string {
  if (value === undefined || !Number.isFinite(value))
    return businessTerms[term].explanation;
  if (term === "ROAS")
    return `For every €1 spent on ads, your store generated €${value.toFixed(2)} in revenue. This is revenue, not profit; product costs and other expenses still need to be paid. These figures are sample data.`;
  if (term === "CPA")
    return `You’re spending €${value.toFixed(2)} in advertising to get one purchase in this sample. Compare this with the profit from each order to see whether the ad makes sense.`;
  if (term === "CTR")
    return `About ${value} out of every 100 people who see your ad click it. A click does not necessarily lead to a purchase. This is a sample rate.`;
  return businessTerms[term].explanation;
}
