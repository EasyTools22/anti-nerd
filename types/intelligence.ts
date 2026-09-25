export type AutonomyMode = "Copilot" | "Assisted" | "Autopilot";
export type AgentStatus = "Working" | "Thinking" | "Idle" | "Done" | "Paused";
export interface Agent {
  id: string;
  name: string;
  purpose: string;
  task: string;
  actions: number;
  status: AgentStatus;
  autonomy:
    "Ask before changes" | "Everyday tasks only" | "Automatic within limits";
  lastActivity: string;
}
export interface AgentActivity {
  id: string;
  agentId: string;
  action: string;
  detail: string;
  timeLabel: string;
  kind: "insight" | "completed" | "approval";
  source: "demo";
}
export interface Approval {
  id: string;
  agentId: string;
  title: string;
  change: string;
  reason: string;
  effect: string;
  declineLabel: "Not now" | "Reject";
  status: "Pending" | "Approved" | "Deferred" | "Rejected";
}
export interface BusinessGoal {
  id: string;
  label: string;
  description: string;
}
interface RuleBase {
  id: string;
  category: "Ads" | "Customer service" | "Pricing" | "Finance";
  label: string;
  help: string;
}
export type BusinessRule = RuleBase &
  (
    | {
        kind: "number";
        value: number;
        unit: "€" | "%" | "x";
        min: number;
        max: number;
        step: number;
      }
    | { kind: "toggle"; value: boolean }
    | { kind: "choice"; value: string; options: string[] }
  );
export type FlowStepKind =
  "When" | "Anti-Nerd" | "If" | "Do" | "Then" | "Notify me";
export interface FlowStep {
  id: string;
  kind: FlowStepKind;
  text: string;
}
export interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  steps: FlowStep[];
  source: "template" | "demo-prompt";
}
export interface AIStatus {
  tasks: string[];
  summary: string;
  source: "demo";
}
export interface AIInstruction {
  communication: "Simple" | "Detailed" | "Expert";
  notifications: "Only important" | "Daily summary" | "Everything";
  decisions: "Careful" | "Balanced" | "Aggressive growth";
  businessInstructions: string;
}
export type DashboardSection =
  "attention" | "metrics" | "performance" | "activity" | "team";
export interface DashboardPreferences {
  order: DashboardSection[];
  hidden: DashboardSection[];
  density: "comfortable" | "compact";
}
