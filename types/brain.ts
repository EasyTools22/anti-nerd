export type AIJobStatus =
  | "idle"
  | "queued"
  | "thinking"
  | "researching"
  | "analyzing"
  | "executing"
  | "learning"
  | "waiting_for_approval"
  | "completed"
  | "failed";
export type EventSource = "demo" | "backend";
export type KnowledgeCategory =
  | "Customers"
  | "Ads"
  | "Products"
  | "Brand"
  | "Finance"
  | "Store"
  | "Operations"
  | "Market"
  | "Competitors"
  | "Marketing";
export type KnowledgeType =
  | "fact"
  | "pattern"
  | "preference"
  | "rule"
  | "insight"
  | "relationship"
  | "prediction"
  | "business_instruction";
export interface KnowledgeItem {
  id: string;
  type: KnowledgeType;
  category: KnowledgeCategory;
  title: string;
  summary: string;
  confidence: "Low" | "Medium" | "High" | "Confirmed by owner";
  sources: string[];
  createdAt: string;
  updatedAt: string;
  importance: "normal" | "pinned";
}
export interface BrainEvent {
  id: string;
  runId: string;
  source: EventSource;
  status: AIJobStatus;
  message: string;
  item?: KnowledgeItem;
  approvalId?: string;
  confirmedItemId?: string;
  occurredAt?: string;
}
export interface BrainState {
  status: AIJobStatus;
  source: EventSource | null;
  message: string;
  items: KnowledgeItem[];
  events: BrainEvent[];
  health: number;
  connections: number;
}
