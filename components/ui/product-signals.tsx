import {
  BadgeCheck,
  ShieldCheck,
  Signal,
  SignalLow,
  SignalMedium,
  Sparkles,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
export function Confidence({
  level,
}: {
  level: "Learning" | "Low" | "Medium" | "High" | "Confirmed by owner";
}) {
  const Icon =
    level === "Confirmed by owner"
      ? BadgeCheck
      : level === "High"
        ? ShieldCheck
        : level === "Medium"
          ? SignalMedium
          : level === "Low"
            ? SignalLow
            : Signal;
  return (
    <span className="confidence" data-level={level}>
      <Icon size={14} />
      {level === "Confirmed by owner"
        ? "Owner confirmed"
        : level === "Medium"
          ? "Moderate confidence"
          : level === "Learning"
            ? "Learning"
            : `${level} confidence`}
    </span>
  );
}
export function KnowledgeKind({ kind }: { kind: string }) {
  const label =
    kind === "fact"
      ? "Fact"
      : kind === "pattern"
        ? "Pattern"
        : kind === "rule" || kind === "business_instruction"
          ? "Owner rule"
          : "AI interpretation";
  return (
    <span className="knowledge-kind" data-kind={kind}>
      {label}
    </span>
  );
}
export function ProgressRing({ value }: { value: number }) {
  return (
    <svg
      className="progress-ring"
      viewBox="0 0 70 70"
      role="img"
      aria-label={`${value}% understanding`}
    >
      <circle cx="35" cy="35" r="29" />
      <circle
        className="ring-value"
        cx="35"
        cy="35"
        r="29"
        strokeDasharray={182.2}
        strokeDashoffset={182.2 * (1 - value / 100)}
      />
    </svg>
  );
}
export function DiscoveryCard({ children }: { children: ReactNode }) {
  return (
    <section className="discovery-card">
      <small>
        <Sparkles size={13} /> NEW OPPORTUNITY · DEMO INSIGHT
      </small>
      {children}
    </section>
  );
}
export function MilestoneCard({ onClose }: { onClose: () => void }) {
  return (
    <section className="milestone-card" role="status">
      <button
        className="icon-button"
        aria-label="Close milestone preview"
        onClick={onClose}
      >
        <X size={17} />
      </button>
      <small>NEW RECORD · ILLUSTRATIVE MILESTONE</small>
      <strong>€3,842</strong>
      <h3>Highest daily profit yet.</h3>
      <p>
        24% above the previous record. In this fictional example, Meta scaling
        and Product B drove the increase.
      </p>
      <p>This is a design preview, not an achieved business result.</p>
    </section>
  );
}
