import type { BrainEvent, BrainState, KnowledgeItem } from "@/types/brain";
import { knowledgeSeed } from "@/lib/mock-data/brain";
export const initialBrain: BrainState = {
  status: "idle",
  source: null,
  message: "Ready when you are.",
  items: knowledgeSeed,
  events: [],
  health: 72,
  connections: 3842,
};
export function applyBrainEvent(
  state: BrainState,
  event: BrainEvent,
): BrainState {
  if (state.events.some((e) => e.id === event.id)) return state;
  const fresh = event.item && !state.items.some((i) => i.id === event.item!.id);
  return {
    ...state,
    status: event.status,
    source: event.source,
    message: event.message,
    events: [event, ...state.events].slice(0, 100),
    items: fresh
      ? [event.item!, ...state.items]
      : event.status === "completed" && event.confirmedItemId
        ? state.items.map((item) =>
            item.id === event.confirmedItemId
              ? {
                  ...item,
                  confidence: "Confirmed by owner",
                  sources: [
                    ...new Set([...item.sources, "Owner confirmation"]),
                  ],
                  updatedAt: event.occurredAt ?? item.updatedAt,
                }
              : item,
          )
        : state.items,
    health: fresh ? Math.min(100, state.health + 1) : state.health,
    connections: state.connections + (fresh ? 3 : 0),
  };
}
export function learningScenario(
  item: KnowledgeItem,
  runId: string,
): BrainEvent[] {
  return [
    { status: "queued", message: "New information received" },
    { status: "thinking", message: "Understanding your instruction…" },
    {
      status: "analyzing",
      message: "Connecting to Products, Marketing and Finance…",
    },
    { status: "learning", message: "Connecting to 3 existing insights…" },
    {
      status: "completed",
      message: "Learned · Connected to 3 existing insights",
      item,
    },
  ].map(
    (event, index) =>
      ({
        ...event,
        id: `${runId}-${index}`,
        runId,
        source: "demo",
      }) as BrainEvent,
  );
}
export function discoveryScenario(runId: string): BrainEvent[] {
  return [
    { status: "queued", message: "Ad review queued" },
    { status: "thinking", message: "Understanding your campaign goals…" },
    { status: "researching", message: "Reviewing sample campaign context…" },
    {
      status: "analyzing",
      message: "3 ads are spending money without producing sales.",
    },
    { status: "executing", message: "Preparing a recommendation…" },
    {
      status: "learning",
      message: "Revenue and profit tell different stories.",
    },
    {
      status: "waiting_for_approval",
      message:
        "Recommendation ready · Your highest-revenue product is not your most profitable.",
    },
  ].map(
    (event, index) =>
      ({
        ...event,
        id: `${runId}-${index}`,
        runId,
        source: "demo",
      }) as BrainEvent,
  );
}
