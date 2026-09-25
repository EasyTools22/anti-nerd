"use client";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Compass,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Badge, Card, useFeedback } from "@/components/ui/primitives";
import { useDemo } from "@/components/intelligence/demo-provider";
import { autonomyOptions } from "@/lib/mock-data/intelligence";
import { BusinessGoals } from "@/components/intelligence/business-goals";
import { BusinessRules } from "@/components/intelligence/business-rules";
import { ApprovalCenter } from "@/components/intelligence/approval-card";
const icons = [Compass, ShieldCheck, Sparkles];
export function ControlCenterPage() {
  const { mode, setMode, approvals } = useDemo();
  const { notify } = useFeedback();
  return (
    <div className="control-center">
      <div className="control-hero">
        <div>
          <Badge tone="gray">CONTROL CENTER · DEMO WORKSPACE</Badge>
          <h1>
            Your business. Your rules.
            <br />
            <span>Anti-Nerd does the work.</span>
          </h1>
          <p>
            Decide how you want your company to run. Anti-Nerd works within your
            rules and continuously looks for ways to improve.
          </p>
        </div>
        <span className="control-hero-icon">
          <SlidersHorizontal size={37} strokeWidth={1.2} />
        </span>
      </div>
      <Card
        title="How much control should Anti-Nerd have?"
        subtitle="Start with what feels right. You can change it anytime."
      >
        <div
          className="autonomy-options"
          role="group"
          aria-label="Autonomy mode"
        >
          {autonomyOptions.map((option, index) => {
            const Icon = icons[index];
            return (
              <button
                className={`autonomy-option ${mode === option.name ? "selected" : ""}`}
                key={option.name}
                aria-pressed={mode === option.name}
                onClick={() => {
                  setMode(option.name);
                  notify(
                    `${option.name} selected for this demo. Your limits still come first.`,
                  );
                }}
              >
                <div>
                  <span className="agent-icon tone-3">
                    <Icon size={22} />
                  </span>
                  <span className="selection-dot">
                    {mode === option.name && <Check size={12} />}
                  </span>
                </div>
                <h3>{option.name}</h3>
                <p>{option.description}</p>
                <small>{option.hint}</small>
              </button>
            );
          })}
        </div>
        <p className="control-caption">
          Local preferences only. No agent can take real actions in this
          preview.
        </p>
      </Card>
      <BusinessGoals />
      <BusinessRules />
      <div className="section-heading">
        <div>
          <h2>
            Needs you{" "}
            <Badge tone="amber">
              {approvals.filter((item) => item.status === "Pending").length}{" "}
              pending
            </Badge>
          </h2>
          <p>Good ideas. Your final say.</p>
        </div>
        <Link className="text-link" href="/activity">
          Your decisions <ArrowRight size={14} />
        </Link>
      </div>
      <ApprovalCenter />
      <div className="control-next">
        <span className="agent-icon tone-3">
          <Sparkles size={21} />
        </span>
        <div>
          <h3>Have a way you like things done?</h3>
          <p>Turn it into a simple flow, one step at a time.</p>
        </div>
        <Link className="button" href="/flows">
          Make it automatic <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
