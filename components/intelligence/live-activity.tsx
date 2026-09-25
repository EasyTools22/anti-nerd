"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { useDemo } from "./demo-provider";
import { nextDemoActivities } from "@/lib/mock-data/intelligence";
import { AgentIcon } from "./agent-icon";

export function LiveActivity({ limit = 5 }: { limit?: number }) {
  const { activities, agents, addActivity } = useDemo();
  const [cursor, setCursor] = useState(0);
  return (
    <Card
      title="Live activity"
      subtitle="Your digital team, in motion. These are sample events, not live business results."
      action={<Badge tone="gray">Demo feed</Badge>}
      className="live-activity-card"
    >
      <div className="live-feed">
        {activities.slice(0, limit).map((event, i) => (
          <article className="live-feed-item" key={event.id}>
            <span className={`agent-icon tone-${i % 6}`}>
              <AgentIcon id={event.agentId} size={18} />
            </span>
            <div>
              <span className="live-feed-meta">
                {event.timeLabel}{" "}
                <span>
                  ·{" "}
                  {agents.find((agent) => agent.id === event.agentId)?.name ??
                    "Anti-Nerd"}
                </span>
              </span>
              <h3>{event.action}</h3>
              <p>{event.detail}</p>
            </div>
            <span
              className={`event-indicator ${event.kind}`}
              aria-label={event.kind}
            />
          </article>
        ))}
      </div>
      <div className="live-feed-footer">
        <div className="button-row">
          {cursor < nextDemoActivities.length && (
            <>
              <button
                className="text-link"
                onClick={() => {
                  addActivity(nextDemoActivities[cursor]);
                  setCursor((value) => value + 1);
                }}
              >
                <Plus size={13} />
                Next demo event
              </button>
            </>
          )}
          {cursor === nextDemoActivities.length && (
            <small className="muted">
              Preview complete. No background actions run.
            </small>
          )}
        </div>
        <Link className="text-link" href="/activity">
          All activity <ArrowRight size={13} />
        </Link>
      </div>
    </Card>
  );
}
