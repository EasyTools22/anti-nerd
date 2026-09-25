"use client";
import type { ReactNode } from "react";
import { Check, Sparkles } from "lucide-react";
import type { AIJobStatus } from "@/types/brain";
export const activeStatuses: AIJobStatus[] = [
  "queued",
  "thinking",
  "researching",
  "analyzing",
  "executing",
  "learning",
];
export function LiveStatus({
  status,
  message,
  paused = false,
}: {
  status: AIJobStatus;
  message: string;
  paused?: boolean;
}) {
  return (
    <div className={`brain-live status-${status}`} role="status">
      <span
        className={
          !paused && activeStatuses.includes(status)
            ? "processing-indicator"
            : "status-dot"
        }
      />
      <span>
        <strong>{paused ? "Paused" : status.replaceAll("_", " ")}</strong>
        <small>{message}</small>
      </span>
    </div>
  );
}
export function SuccessBurst({ children }: { children: ReactNode }) {
  return (
    <div className="success-burst" role="status">
      <Check size={18} />
      {children}
    </div>
  );
}
export function ProgressReveal({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="brain-progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
export function InsightReveal({ children }: { children: ReactNode }) {
  return (
    <div className="insight-reveal">
      <Sparkles size={21} />
      <div>{children}</div>
    </div>
  );
}
export function ActivityTransition({ children }: { children: ReactNode }) {
  return <div className="activity-transition">{children}</div>;
}
