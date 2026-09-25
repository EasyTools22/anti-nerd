"use client";
import { Confidence } from "@/components/ui/product-signals";
import { useBrain } from "@/components/brain/brain-provider";
import { SuccessBurst } from "@/components/motion/intelligence-motion";
import { useState } from "react";
import { Check, ChevronDown, ShieldCheck } from "lucide-react";
import { Badge, useFeedback } from "@/components/ui/primitives";
import { useDemo } from "./demo-provider";
import { AgentIcon } from "./agent-icon";
import type { Approval } from "@/types/intelligence";
export function ApprovalCard({ approval }: { approval: Approval }) {
  const { approve, running, state, reduced, next } = useBrain();
  const processing = running && state.events[0]?.approvalId === approval.id;
  const [details, setDetails] = useState(false);
  const { decideApproval, agents, rules } = useDemo();
  const { notify } = useFeedback();
  function decide(status: Exclude<Approval["status"], "Pending">) {
    if (status === "Approved") {
      approve(approval.id);
      return;
    }
    decideApproval(approval.id, status);
    notify(`${status} in this demo. No money moved and no settings changed.`);
  }
  const agent = agents.find((item) => item.id === approval.agentId);
  return (
    <article
      className={`approval-card ${approval.status !== "Pending" ? "resolved" : ""}`}
    >
      <div className="approval-top">
        <span className="agent-icon tone-3">
          <AgentIcon id={approval.agentId} />
        </span>
        <span>
          {agent?.name}
          <small>Anti-Nerd wants to</small>
        </span>
        <Badge
          tone={
            approval.status === "Pending"
              ? "amber"
              : approval.status === "Approved"
                ? "green"
                : "gray"
          }
        >
          {approval.status === "Pending" ? "Needs you" : approval.status}
        </Badge>
      </div>
      <h3>{approval.title}</h3>
      <strong className="approval-change">{approval.change}</strong>
      <p>
        <span>Why?</span> {approval.reason}
      </p>
      <div className="trust-preview">
        <Confidence level={approval.id === "refund" ? "Medium" : "High"} />
        <span>Owner approval required · Demo evidence</span>
      </div>
      {details && (
        <div className="approval-details">
          <dl className="trust-grid">
            <div>
              <dt>Data used</dt>
              <dd>
                {approval.id === "refund"
                  ? "Sample order, delivery tracking and support conversation"
                  : "Sample campaign performance over 3 days"}
              </dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>
                {approval.id === "refund"
                  ? "Delivery may still arrive. Review tracking before refunding."
                  : "Higher spend can lower profitability. Future performance is uncertain."}
              </dd>
            </div>
            <div>
              <dt>Owner control</dt>
              <dd>You decide. No external action runs in this preview.</dd>
            </div>
            <div>
              <dt>Confidence basis</dt>
              <dd>Illustrative assessment, not a calculated probability.</dd>
            </div>
          </dl>
          <strong>Expected effect</strong>
          <p>{approval.effect}</p>
          <p>
            <ShieldCheck size={14} />
            Your approval is required in this demo. Current rules apply to
            future actions only.
          </p>
          {approval.id === "refund" && (
            <p>
              Your current refund approval limit: €
              {String(rules.find((rule) => rule.id === "refund-limit")?.value)}.
            </p>
          )}
        </div>
      )}
      <div className="approval-actions">
        {approval.status === "Pending" ? (
          <>
            <button
              className="button primary"
              disabled={running}
              onClick={() => decide("Approved")}
            >
              <Check size={14} />
              {processing ? "Processing…" : "Approve"}
            </button>
            <button
              className="button"
              disabled={running}
              onClick={() =>
                decide(
                  approval.declineLabel === "Reject" ? "Rejected" : "Deferred",
                )
              }
            >
              {approval.declineLabel}
            </button>
          </>
        ) : (
          <SuccessBurst>{approval.status} · Demo decision saved</SuccessBurst>
        )}
        {processing && reduced && (
          <button className="text-link" onClick={next}>
            Next demo step
          </button>
        )}
        <button
          className="text-link"
          aria-expanded={details}
          onClick={() => setDetails(!details)}
        >
          {details ? "Less" : "Details"}
          <ChevronDown size={13} />
        </button>
      </div>
      <small className="approval-demo">
        Sample request · Nothing is executed
      </small>
    </article>
  );
}
export function ApprovalCenter() {
  const { approvals } = useDemo();
  return (
    <div className="approval-grid">
      {approvals.map((approval) => (
        <ApprovalCard key={approval.id} approval={approval} />
      ))}
    </div>
  );
}
