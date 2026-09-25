"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Badge, Modal, useFeedback } from "@/components/ui/primitives";
import { useDemo } from "@/components/intelligence/demo-provider";
import { AgentIcon } from "@/components/intelligence/agent-icon";
import type { Agent, AgentStatus } from "@/types/intelligence";
export function AgentCards({ detailed = false }: { detailed?: boolean }) {
  const { agents, setAgents, mode } = useDemo();
  const [selected, setSelected] = useState<string | null>(null);
  const { notify } = useFeedback();
  const agent = agents.find((item) => item.id === selected);
  function update(id: string, patch: Partial<Agent>) {
    setAgents((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    notify("Agent preference updated for this demo session.");
  }
  return (
    <>
      <div
        className={`agent-grid workforce-grid ${detailed ? "detailed" : ""}`}
      >
        {agents.map((item, i) => (
          <article
            className={`agent-card workforce-card specialist-${item.id}`}
            key={item.id}
          >
            <button
              className="agent-detail-trigger"
              onClick={() => setSelected(item.id)}
              aria-label={`View ${item.name}`}
            >
              <div className="agent-top">
                <span className={`agent-icon tone-${i % 6}`}>
                  <AgentIcon id={item.id} />
                </span>
                <Badge
                  tone={
                    item.status === "Working" || item.status === "Done"
                      ? "green"
                      : item.status === "Thinking"
                        ? "amber"
                        : "gray"
                  }
                >
                  <span
                    className={`agent-status-dot status-${item.status.toLowerCase()}`}
                  />
                  Demo · {item.status}
                </Badge>
              </div>
              <h3>{item.name}</h3>
              <p>
                {item.status === "Paused"
                  ? "On a break. You can resume this agent."
                  : item.task}
              </p>
              <div className="agent-count">
                <span>{item.actions} actions today</span>
                <ArrowRight size={14} />
              </div>
            </button>
            <div className="agent-autonomy">
              <ShieldCheck size={12} />
              {mode === "Copilot" ? "Ask before changes" : item.autonomy}
            </div>
            {detailed && <p className="agent-purpose">{item.purpose}</p>}
          </article>
        ))}
      </div>
      {agent && (
        <Modal
          title={agent.name}
          className="agent-context-drawer"
          onClose={() => setSelected(null)}
        >
          <Badge tone="gray">Digital teammate · Demo only</Badge>
          <h3>{agent.purpose}</h3>
          <div className="detail-row">
            <span>Current task</span>
            <strong>{agent.status === "Paused" ? "Paused" : agent.task}</strong>
          </div>
          <div className="detail-row">
            <span>Tasks completed today</span>
            <strong>{agent.actions}</strong>
          </div>
          <p className="muted">Last activity: {agent.lastActivity}</p>
          <div className="agent-detail-controls">
            <label className="field-label">
              Demo status
              <select
                value={agent.status}
                onChange={(e) =>
                  update(agent.id, { status: e.target.value as AgentStatus })
                }
              >
                {["Working", "Thinking", "Idle", "Done", "Paused"].map(
                  (status) => (
                    <option key={status}>{status}</option>
                  ),
                )}
              </select>
            </label>
            <label className="field-label">
              Autonomy preference
              <select
                value={agent.autonomy}
                onChange={(e) =>
                  update(agent.id, {
                    autonomy: e.target.value as Agent["autonomy"],
                  })
                }
              >
                {[
                  "Ask before changes",
                  "Everyday tasks only",
                  "Automatic within limits",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="insight">
            <strong>Your business rules come first.</strong>
            <p>
              Current mode: {mode}. Copilot requires approval for all changes;
              other modes stay within the rules you define. These controls do
              not run an agent.
            </p>
          </div>
          <Link
            className="button"
            href="/control-center"
            onClick={() => setSelected(null)}
          >
            Your rules <ArrowRight size={14} />
          </Link>
        </Modal>
      )}
    </>
  );
}
