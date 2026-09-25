"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  Agent,
  AgentActivity,
  AIInstruction,
  Approval,
  AutonomyMode,
  AutomationFlow,
  BusinessRule,
  DashboardPreferences,
} from "@/types/intelligence";
import {
  defaultDashboard,
  defaultInstructions,
  demoActivities,
  demoAgents,
  demoApprovals,
  demoRules,
} from "@/lib/mock-data/intelligence";
import { flowTemplates } from "@/lib/mock-data/flows";
interface DemoContextValue {
  agents: Agent[];
  setAgents: Dispatch<SetStateAction<Agent[]>>;
  activities: AgentActivity[];
  addActivity: (activity: AgentActivity) => void;
  approvals: Approval[];
  decideApproval: (
    id: string,
    status: Exclude<Approval["status"], "Pending">,
  ) => void;
  mode: AutonomyMode;
  setMode: (mode: AutonomyMode) => void;
  goals: string[];
  setGoals: Dispatch<SetStateAction<string[]>>;
  rules: BusinessRule[];
  setRules: Dispatch<SetStateAction<BusinessRule[]>>;
  instructions: AIInstruction;
  setInstructions: Dispatch<SetStateAction<AIInstruction>>;
  flows: AutomationFlow[];
  setFlows: Dispatch<SetStateAction<AutomationFlow[]>>;
  addFlow: (flow: AutomationFlow) => string;
  dashboard: DashboardPreferences;
  setDashboard: Dispatch<SetStateAction<DashboardPreferences>>;
}
const DemoContext = createContext<DemoContextValue | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState(demoAgents);
  const [activities, setActivities] = useState(demoActivities);
  const [approvals, setApprovals] = useState(demoApprovals);
  const [mode, setMode] = useState<AutonomyMode>("Assisted");
  const [goals, setGoals] = useState(["profit", "cash", "revenue"]);
  const [rules, setRules] = useState(demoRules);
  const [instructions, setInstructions] = useState(defaultInstructions);
  const [dashboard, setDashboard] = useState(defaultDashboard);
  const [flows, setFlows] = useState<AutomationFlow[]>([
    {
      ...flowTemplates[0],
      id: "flow-initial",
      enabled: true,
      steps: flowTemplates[0].steps.map((step) => ({ ...step })),
    },
  ]);
  const sequence = useRef(0);
  function addActivity(activity: AgentActivity) {
    setActivities((current) =>
      current.some((item) => item.id === activity.id)
        ? current
        : [activity, ...current].slice(0, 30),
    );
  }
  function decideApproval(
    id: string,
    status: Exclude<Approval["status"], "Pending">,
  ) {
    const approval = approvals.find((item) => item.id === id);
    if (!approval || approval.status !== "Pending") return;
    setApprovals((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    addActivity({
      id: `decision-${id}`,
      agentId: approval.agentId,
      action: `${approval.title} · ${status.toLowerCase()}`,
      detail: "Your demo decision was recorded. No external action was taken.",
      timeLabel: "Just now",
      kind: "approval",
      source: "demo",
    });
  }
  function addFlow(flow: AutomationFlow) {
    const id = `flow-${++sequence.current}`;
    setFlows((current) => [
      ...current,
      {
        ...flow,
        id,
        steps: flow.steps.map((step, index) => ({
          ...step,
          id: `${id}-step-${index}`,
        })),
      },
    ]);
    return id;
  }
  return (
    <DemoContext.Provider
      value={{
        agents,
        setAgents,
        activities,
        addActivity,
        approvals,
        decideApproval,
        mode,
        setMode,
        goals,
        setGoals,
        rules,
        setRules,
        instructions,
        setInstructions,
        flows,
        setFlows,
        addFlow,
        dashboard,
        setDashboard,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("DemoProvider is required");
  return context;
}
