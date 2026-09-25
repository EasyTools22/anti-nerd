"use client";
import { IntelligenceCore } from "@/components/identity/intelligence-core";
import { useState } from "react";
import Link from "next/link";
import { useDemo } from "@/components/intelligence/demo-provider";
import { ArrowRight, FileText, Plus, Workflow } from "lucide-react";
import { activity, money } from "@/lib/mock-data/business";
import { AgentCards } from "@/components/dashboard/agent-cards";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import {
  Badge,
  Card,
  EmptyState,
  Modal,
  PageHeading,
  SearchField,
  Tabs,
  useFeedback,
} from "@/components/ui/primitives";
export function TeamPage() {
  return (
    <>
      <PageHeading
        title="Meet your AI team"
        description="Your digital team. Busy with the details, guided by you."
      >
        <Badge tone="gray">Preview · No agents running</Badge>
      </PageHeading>
      <div className="team-core-intro">
        <IntelligenceCore compact />
        <div>
          <span className="section-kicker">
            SPECIALISTS. ONE SHARED INTELLIGENCE.
          </span>
          <strong>You set the direction.</strong>
          <p>
            Choose how each specialist works with you. These controls
            demonstrate future behavior and apply only to this demo session.
          </p>
        </div>
        <Link href="/brain" className="text-link">
          Open Business Brain <ArrowRight size={14} />
        </Link>
      </div>
      <AgentCards detailed />
    </>
  );
}
const rules = [
  ["Delayed order detected", "Prepare customer message"],
  ["Ad exceeds target CPA", "Request budget adjustment"],
  ["New negative review", "Alert owner"],
  ["Low inventory", "Create warning"],
  ["Large refund", "Request owner approval"],
];
export function AutomationsPage() {
  const [active, setActive] = useState([true, true, true, false, true]);
  const { notify } = useFeedback();
  return (
    <>
      <PageHeading
        title="Automations"
        description="Let the little things take care of themselves."
      >
        <Link className="button primary" href="/flows">
          <Plus size={16} />
          Create automation
        </Link>
      </PageHeading>
      <div className="stack">
        {rules.map(([trigger, action], i) => (
          <Card key={trigger}>
            <div className="automation-row">
              <span className="agent-icon tone-0">
                <Workflow size={22} />
              </span>
              <div>
                <small className="muted">WHEN THIS HAPPENS</small>
                <h3>{trigger}</h3>
              </div>
              <ArrowRight size={20} />
              <div>
                <small className="muted">YOUR TEAM WILL</small>
                <h3>{action}</h3>
              </div>
              <button
                className={`toggle ${active[i] ? "on" : ""}`}
                role="switch"
                aria-checked={active[i]}
                aria-label={`Enable ${trigger}`}
                onClick={() => {
                  setActive(active.map((v, index) => (index === i ? !v : v)));
                  notify("Automation updated in this demo. No tasks will run.");
                }}
              >
                <span />
              </button>
              <Badge tone={active[i] ? "green" : "gray"}>
                {active[i] ? "Active" : "Paused"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
      <p className="demo-caption">
        Example workflows only. Background automation will be added in a later
        phase.
      </p>
    </>
  );
}
export function FinancePage() {
  const rows: [string, number][] = [
    ["Revenue", 24820],
    ["Cost of goods sold", -8420],
    ["Payment fees", -1180],
    ["Shipping", -920],
    ["Ad spend", -4180],
    ["Refunds", -640],
  ];
  return (
    <>
      <PageHeading
        title="Finance"
        description="Revenue is only part of the story. Here’s what stays with you."
      >
        <Badge tone="gray">September 2026 · Sample</Badge>
      </PageHeading>
      <div className="three-grid">
        {[
          ["Revenue", 24820],
          ["Gross profit", 16400],
          ["Net contribution", 9480],
        ].map(([name, value]) => (
          <Card key={name}>
            <div className="product-info">
              <p>{name}</p>
              <div className="metric-value">{money(Number(value))}</div>
              <Badge>
                {name === "Net contribution"
                  ? "38.2% contribution margin"
                  : "+18.2% vs. previous period"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
      <div className="finance-grid">
        <Card
          title="Where your money goes"
          subtitle="A transparent view of business profitability."
        >
          <div className="finance-breakdown">
            {rows.map(([name, value]) => (
              <div className="detail-row" key={name}>
                <span>{name}</span>
                <strong>{money(value)}</strong>
              </div>
            ))}
            <div className="detail-row total">
              <strong>Net contribution</strong>
              <strong>
                {money(rows.reduce((sum, [, value]) => sum + value, 0))}
              </strong>
            </div>
            <div className="detail-row">
              <span>Operating overhead</span>
              <strong>−€3,060</strong>
            </div>
            <div className="detail-row total">
              <strong>Estimated profit</strong>
              <strong>€6,420</strong>
            </div>
            <p className="muted">
              Gross profit is revenue less cost of goods. Contribution includes
              variable expenses; estimated profit also deducts operating
              overhead. Illustrative figures, before tax.
            </p>
          </div>
        </Card>
        <PerformanceChart profitOnly />
      </div>
    </>
  );
}
export function ReportsPage() {
  const [period, setPeriod] = useState("September 2026");
  const [report, setReport] = useState("");
  return (
    <>
      <PageHeading
        title="Reports"
        description="Step back. See the whole picture."
      >
        <select
          aria-label="Report period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option>September 2026</option>
          <option>August 2026</option>
          <option>July 2026</option>
        </select>
      </PageHeading>
      <div className="three-grid">
        {[
          "Daily Business Report",
          "Weekly Performance",
          "Monthly P&L",
          "Marketing Report",
          "Customer Service Report",
        ].map((name, i) => (
          <Card key={name}>
            <div className="product-info">
              <span className={`agent-icon tone-${i}`}>
                <FileText size={22} />
              </span>
              <h3>{name}</h3>
              <p>{period} · Preview report</p>
              <p className="muted">
                A focused summary of the numbers and decisions that matter.
              </p>
              <button className="button" onClick={() => setReport(name)}>
                View report <ArrowRight size={15} />
              </button>
            </div>
          </Card>
        ))}
      </div>
      {report && (
        <Modal title={report} onClose={() => setReport("")}>
          <Badge tone="gray">Sample · {period}</Badge>
          <h3>Your business at a glance</h3>
          <p>
            This is a preview of your future {report.toLowerCase()}. Connected
            reports will include period-specific metrics, trends, and
            recommended actions.
          </p>
          <div className="insight">
            <strong>What your report will cover</strong>
            <p>
              Performance over time, significant changes, and the next decisions
              for your business.
            </p>
          </div>
          <p className="muted">
            Live reports and downloads will be available after data connections
            are added.
          </p>
        </Modal>
      )}
    </>
  );
}
export function ActivityPage() {
  const { activities, agents } = useDemo();
  const sessionEvents = activities.map((event) => ({
    id: event.id,
    workspaceId: "wk-exclusive",
    timestamp: "2026-09-24T10:45:00",
    actor:
      agents.find((agent) => agent.id === event.agentId)?.name ?? "Anti-Nerd",
    action: event.action,
    result: event.detail,
    status: event.action.endsWith("approved")
      ? "Approved"
      : event.kind === "approval" && !event.id.startsWith("decision-")
        ? "Awaiting approval"
        : "Completed",
  }));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All activity");
  const filtered = [...sessionEvents, ...activity].filter(
    (e) =>
      `${e.actor} ${e.action}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All activity" || e.status === filter),
  );
  return (
    <>
      <PageHeading
        title="Activity"
        description="A clear record of what happened, who did it, and why."
      >
        <Badge tone="gray">Sample audit log</Badge>
      </PageHeading>
      <Card>
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search activity…"
          />
          <Tabs
            options={[
              "All activity",
              "Awaiting approval",
              "Approved",
              "Completed",
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {["When", "Team member", "Action", "Result", "Status"].map(
                  (v) => (
                    <th key={v}>{v}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.timestamp.slice(11, 16)}</strong>
                    <small>24 Sep 2026</small>
                  </td>
                  <td>{e.actor}</td>
                  <td>{e.action}</td>
                  <td>{e.result}</td>
                  <td>
                    <Badge
                      tone={
                        e.status === "Awaiting approval" ? "amber" : "green"
                      }
                    >
                      {e.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <EmptyState />}
      </Card>
    </>
  );
}
