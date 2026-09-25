"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useDemo } from "@/components/intelligence/demo-provider";
import {
  applyBrainEvent,
  initialBrain,
  learningScenario,
  discoveryScenario,
} from "@/lib/brain/events";
import type { BrainEvent, BrainState, KnowledgeItem } from "@/types/brain";
interface BrainContext {
  state: BrainState;
  running: boolean;
  paused: boolean;
  reduced: boolean;
  ingest: (event: BrainEvent) => void;
  teach: (text: string) => void;
  discover: () => void;
  next: () => void;
  pause: () => void;
  stop: () => void;
  edit: (id: string, change: Partial<KnowledgeItem>) => void;
  forget: (id: string) => void;
  confirmKnowledge: (id: string) => void;
  approve: (id: string) => void;
  simulate: (status: "failed" | "completed") => void;
}
const Context = createContext<BrainContext | null>(null);
export function BrainProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialBrain);
  const [queue, setQueue] = useState<BrainEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const counter = useRef(0);
  const reduced = useReducedMotion();
  const { addActivity, decideApproval } = useDemo();
  const seen = useRef(new Set<string>());
  const ingest = useCallback(
    (event: BrainEvent) => {
      if (seen.current.has(event.id)) return;
      seen.current.add(event.id);
      setState((s) => applyBrainEvent(s, event));
      if (
        event.approvalId &&
        event.status === "completed" &&
        event.source === "demo"
      )
        decideApproval(event.approvalId, "Approved");
      if (
        event.source === "demo" &&
        (event.status === "completed" ||
          event.status === "waiting_for_approval")
      )
        addActivity({
          id: event.id,
          agentId: "operations",
          action: event.message,
          detail: "Business Brain · Simulated event",
          timeLabel: "Just now",
          kind: event.status === "completed" ? "completed" : "approval",
          source: "demo",
        });
    },
    [addActivity, decideApproval],
  );
  function next() {
    if (!queue.length) return;
    ingest(queue[0]);
    setQueue((q) => q.slice(1));
  }
  useEffect(() => {
    if (!queue.length || paused || reduced) return;
    const timer = setTimeout(() => {
      if (document.visibilityState !== "visible") {
        setPaused(true);
        return;
      }
      const event = queue[0];
      ingest(event);
      setQueue((q) => q.slice(1));
    }, 1100);
    return () => clearTimeout(timer);
  }, [queue, paused, reduced, ingest]);
  function play(events: BrainEvent[]) {
    if (queue.length) return;
    ingest(events[0]);
    setQueue(events.slice(1));
    setPaused(false);
  }
  function teach(text: string) {
    if (!text.trim() || queue.length) return;
    const id = `taught-${++counter.current}`;
    const now = new Date().toISOString();
    play(
      learningScenario(
        {
          id,
          type: "business_instruction",
          category: "Marketing",
          title: text.trim(),
          summary:
            "Owner-provided instruction. Connections to pricing (Finance), Products and Marketing are illustrative demo links, not semantic analysis.",
          confidence: "Confirmed by owner",
          sources: ["Owner · Teach Anti-Nerd"],
          createdAt: now,
          updatedAt: now,
          importance: "pinned",
        },
        id,
      ),
    );
  }
  function simulate(status: "failed" | "completed") {
    if (queue.length) return;
    const id = `manual-${++counter.current}`;
    ingest({
      id,
      runId: id,
      source: "demo",
      status,
      message:
        status === "failed"
          ? "Demo task failed. No changes were made."
          : "Demo task completed.",
    });
  }
  function approve(approvalId: string) {
    const runId = `approval-${++counter.current}`;
    play([
      {
        id: `${runId}-start`,
        runId,
        source: "demo",
        status: "executing",
        message: "Recording your demo approval…",
        approvalId,
      },
      {
        id: `${runId}-done`,
        runId,
        source: "demo",
        status: "completed",
        message: "Done · Your approval is recorded",
        approvalId,
      },
    ]);
  }
  return (
    <Context.Provider
      value={{
        confirmKnowledge: (confirmedItemId) => {
          if (
            queue.length ||
            !state.items.some((item) => item.id === confirmedItemId)
          )
            return;
          const runId = `confirmation-${++counter.current}`;
          play([
            {
              id: `${runId}-start`,
              runId,
              source: "demo",
              status: "learning",
              confirmedItemId,
              message: "Connecting your confirmation to business memory…",
            },
            {
              id: `${runId}-done`,
              runId,
              source: "demo",
              status: "completed",
              confirmedItemId,
              occurredAt: new Date().toISOString(),
              message: "Memory strengthened · Confirmed by you",
            },
          ]);
        },
        approve,
        state,
        running: queue.length > 0,
        paused,
        reduced,
        ingest,
        teach,
        discover: () =>
          play(discoveryScenario(`discovery-${++counter.current}`)),
        next,
        pause: () => setPaused((v) => !v),
        stop: () => {
          setQueue([]);
          setState((s) => ({
            ...s,
            status: "idle",
            message: "Preview stopped. Ready when you are.",
          }));
        },
        edit: (id, change) =>
          setState((s) => ({
            ...s,
            items: s.items.map((i) =>
              i.id === id
                ? { ...i, ...change, updatedAt: new Date().toISOString() }
                : i,
            ),
          })),
        forget: (id) =>
          setState((s) => ({
            ...s,
            items: s.items.filter((i) => i.id !== id),
            health: s.items.some((i) => i.id === id && id.startsWith("taught-"))
              ? Math.max(72, s.health - 1)
              : s.health,
            connections: s.items.some(
              (i) => i.id === id && id.startsWith("taught-"),
            )
              ? Math.max(3842, s.connections - 3)
              : s.connections,
          })),
        simulate,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useBrain() {
  const value = useContext(Context);
  if (!value) throw new Error("BrainProvider required");
  return value;
}
