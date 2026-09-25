"use client";
import Link from "next/link";
import { useIdentity } from "@/components/workspace/identity-provider";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { IntelligenceCore } from "@/components/identity/intelligence-core";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useBrain } from "@/components/brain/brain-provider";
import { useDemo } from "@/components/intelligence/demo-provider";
export function BusinessHero({ period }: { period: string }) {
  const identity = useIdentity();
  const business = identity.businesses.find(
    (b) => b.id === identity.businessId,
  )!;
  const { state, running, paused, discover, reduced, next, pause, stop } =
    useBrain();
  const { approvals } = useDemo();
  const pending = approvals.filter((a) => a.status === "Pending").length;
  const data =
    period === "Today"
      ? ["€321", "12", "€209"]
      : period === "7 days"
        ? ["€1,605", "46", "€1,045"]
        : ["€6,420", "184", "€4,180"];
  return (
    <section className="business-hero">
      <div className="hero-coordinate">
        {business.name}
        <span>{period.toUpperCase()} · SAMPLE METRICS</span>
      </div>
      <div className="business-hero-grid">
        <div className="hero-money">
          <h1>Welcome to {business.name}.</h1>
          <p>Your business, in focus.</p>
          <div className="hero-profit">
            <span>PROFIT</span>
            <strong>
              <AnimatedNumber value={data[0]} />
            </strong>
            <small>
              ↗ 16.4% <span>vs. previous period · Sample</span>
            </small>
          </div>
          <div className="hero-supporting">
            <div>
              <strong>{data[1]}</strong>
              <span>Orders</span>
            </div>
            <div>
              <strong>{data[2]}</strong>
              <span>Ad spend</span>
            </div>
            <div>
              <strong>3.8×</strong>
              <span>Ad return</span>
            </div>
          </div>
        </div>
        <div className="hero-intelligence">
          <IntelligenceCore status={state.status} paused={paused} />
          <div className="hero-core-copy">
            <span className="signal-label">
              <i />
              {paused
                ? "Preview paused"
                : running
                  ? "Demo in progress"
                  : "READY WHEN YOU ARE"}
            </span>
            <h2>
              {running
                ? state.message
                : "One intelligence. Your entire business."}
            </h2>
            <p>
              {running
                ? "A simulated task. You stay in control."
                : "No live jobs running. Start a preview to see Anti-Nerd work."}
            </p>
            {running ? (
              <div className="button-row">
                <button className="hero-link" onClick={reduced ? next : pause}>
                  {reduced
                    ? "Next demo step"
                    : paused
                      ? "Resume preview"
                      : "Pause preview"}
                </button>
                <button className="hero-link" onClick={stop}>
                  Stop preview
                </button>
              </div>
            ) : (
              <button className="hero-link" onClick={discover}>
                See Anti-Nerd work <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="hero-bottom">
        <Link href="/control-center">
          <span className="attention-count">
            {pending.toString().padStart(2, "0")}
          </span>
          <div>
            <strong>
              {pending
                ? `${pending} decisions need you.`
                : "Nothing needs you right now."}
            </strong>
            <small>Important changes stay in your hands.</small>
          </div>
          <ArrowUpRight size={18} />
        </Link>
        <Link href="/brain">
          <span className="brain-understanding-number">{state.health}%</span>
          <div>
            <strong>Your Business Brain</strong>
            <small>Explore what your company knows.</small>
          </div>
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </section>
  );
}
export function BusinessImpact() {
  return (
    <section className="business-impact">
      <div>
        <span className="section-kicker">ANTI-NERD IMPACT</span>
        <h2>
          Less busywork.
          <br />
          More room to grow.
        </h2>
        <small>Today · Illustrative value preview</small>
      </div>
      {[
        ["47", "Tasks handled"],
        ["2h 18m", "Estimated time saved"],
        ["€384", "Cost avoided"],
        ["€1,240", "Opportunities identified"],
      ].map(([value, label]) => (
        <div key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
      <p>
        Demo estimates, not measured results. Future totals must come from
        verified business events.
      </p>
    </section>
  );
}
