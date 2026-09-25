export interface ResearchProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  margin: string;
  interest: string;
  competition: "Low" | "Moderate" | "High";
  potential: string;
  detail: string;
  initiallySaved?: boolean;
}
export interface MarketingCampaign {
  id: string;
  name: string;
  audience: string;
  channel: string;
  status: "Draft" | "Scheduled" | "Sent";
  date: string;
  recipients: number;
  orders: number;
}
