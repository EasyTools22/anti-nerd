"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { Badge, Tabs } from "@/components/ui/primitives";
import { useDemo } from "@/components/intelligence/demo-provider";
import { BusinessHero, BusinessImpact } from "./business-hero";
import { LiveActivity } from "@/components/intelligence/live-activity";
import { AgentCards } from "./agent-cards";
import { DashboardMetrics } from "./dashboard-metrics";
import { DashboardPerformance } from "./dashboard-performance";
import { CustomizeDashboard } from "./customize-dashboard";
import type { DashboardSection } from "@/types/intelligence";
export function Overview({ approvals }: { approvals: ReactNode }) {
  const [period, setPeriod] = useState("30 days");
  const [customizing, setCustomizing] = useState(false);
  const { dashboard, agents } = useDemo();
  const sections: Record<DashboardSection, ReactNode> = {
    attention: approvals,
    metrics: (
      <>
        <div className="section-heading">
          <div>
            <h2>Your numbers</h2>
            <p>The big picture, at a glance.</p>
          </div>
        </div>
        <DashboardMetrics period={period} />
      </>
    ),
    performance: <DashboardPerformance />,
    activity: <LiveActivity />,
    team: (
      <>
        <div className="section-heading">
          <div>
            <h2>
              Your AI team <Badge>{agents.length} teammates</Badge>
            </h2>
            <p>The boring parts? They’ve got them.</p>
          </div>
          <Link href="/ai-team">
            Meet your team <ArrowRight size={15} />
          </Link>
        </div>
        <AgentCards />
      </>
    ),
  };
  return (
    <div className={`overview-experience density-${dashboard.density}`}>
      <div className="overview-toolbar">
        <span className="section-kicker">YOUR WORKSPACE</span>
        <div>
          <Tabs
            options={["Today", "7 days", "30 days"]}
            value={period}
            onChange={setPeriod}
          />
          <button
            className="icon-button"
            aria-label="Customize dashboard"
            title="Customize dashboard"
            onClick={() => setCustomizing(true)}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>
      <BusinessHero period={period} />
      <BusinessImpact />
      <div className="dashboard-sections">
        {dashboard.order
          .filter((id) => !dashboard.hidden.includes(id))
          .map((id) => (
            <section className="dashboard-section" data-section={id} key={id}>
              {sections[id]}
            </section>
          ))}
      </div>
      {dashboard.hidden.length === dashboard.order.length && (
        <div className="empty">
          <SlidersHorizontal size={28} />
          <h3>A little more space</h3>
          <p>Your sections are hidden. Bring them back whenever you want.</p>
          <button className="button" onClick={() => setCustomizing(true)}>
            Choose sections
          </button>
        </div>
      )}
      {customizing && (
        <CustomizeDashboard onClose={() => setCustomizing(false)} />
      )}
    </div>
  );
}
