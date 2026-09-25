export interface AssistantReply {
  text: string;
  sources?: string[];
  source: "demo";
  nextStep?: { label: string; href: string };
}
export interface AssistantExchange {
  id: number;
  question: string;
  reply: AssistantReply;
}
export interface AssistantClient {
  reply: (prompt: string) => Promise<AssistantReply>;
}
