"use client";
import {
  Confidence,
  KnowledgeKind,
  ProgressRing,
  DiscoveryCard,
  MilestoneCard,
} from "@/components/ui/product-signals";
import { IntelligenceCore } from "@/components/identity/intelligence-core";
import dynamic from "next/dynamic";
import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight, Pin, Check, Search, BookOpen } from "lucide-react";
import { Modal, Badge } from "@/components/ui/primitives";
import { useBrain } from "./brain-provider";
import {
  ActivityTransition,
  LiveStatus,
  ProgressReveal,
  SuccessBurst,
} from "@/components/motion/intelligence-motion";
import {
  businessSummary,
  dna,
  relationships,
  searchExamples,
  searchKnowledge,
  summaryHistory,
} from "@/lib/mock-data/brain";
import type { KnowledgeCategory, KnowledgeItem } from "@/types/brain";
const KnowledgeGraph = dynamic(() => import("./knowledge-graph"), {
  loading: () => (
    <div className="graph-loading">Opening the knowledge map…</div>
  ),
});
function KnowledgeCard({
  item,
  onEdit,
}: {
  item: KnowledgeItem;
  onEdit: (item: KnowledgeItem) => void;
}) {
  const { edit, forget, confirmKnowledge, state, running, reduced, next } =
    useBrain();
  const confirming = running && state.events[0]?.confirmedItemId === item.id;
  const justConfirmed =
    !running &&
    state.events[0]?.confirmedItemId === item.id &&
    state.status === "completed";
  const [confirm, setConfirm] = useState(false);
  return (
    <ActivityTransition>
      <article
        className={`knowledge-card ${justConfirmed ? "memory-confirmed" : ""}`}
      >
        <div className="knowledge-meta">
          <span>
            {item.category} · <KnowledgeKind kind={item.type} />
          </span>
          <Confidence level={item.confidence} />
        </div>
        <h3>
          {item.importance === "pinned" && <Pin size={14} />} {item.title}
        </h3>
        <p>{item.summary}</p>
        <small>Based on: {item.sources.join(" · ")}</small>
        <div className="knowledge-controls">
          <button
            className="text-link"
            disabled={running || item.confidence === "Confirmed by owner"}
            onClick={() => confirmKnowledge(item.id)}
          >
            <Check size={13} />
            {confirming
              ? "Connecting…"
              : item.confidence === "Confirmed by owner"
                ? "Owner confirmed"
                : "Confirm as correct"}
          </button>
          <button className="text-link" onClick={() => onEdit(item)}>
            Edit
          </button>
          <button
            className="text-link"
            onClick={() =>
              edit(item.id, {
                importance: item.importance === "pinned" ? "normal" : "pinned",
              })
            }
          >
            {item.importance === "pinned" ? "Unpin" : "Pin as important"}
          </button>
          <button className="text-link" onClick={() => setConfirm(true)}>
            Forget
          </button>
        </div>
        {confirming && (
          <div className="memory-feedback" role="status">
            <IntelligenceCore status="learning" compact />
            <span>Strengthening this memory…</span>
            {reduced && (
              <button className="button" onClick={next}>
                Next demo step
              </button>
            )}
          </div>
        )}
        {justConfirmed && (
          <p className="memory-feedback" role="status">
            <Check size={15} /> Memory strengthened · Confirmed by you
          </p>
        )}
        {confirm && (
          <div className="forget-confirm">
            <p>Remove this item from this demo session?</p>
            <button className="button" onClick={() => forget(item.id)}>
              Forget item
            </button>
            <button className="text-link" onClick={() => setConfirm(false)}>
              Keep it
            </button>
          </div>
        )}
      </article>
    </ActivityTransition>
  );
}
export function BrainPage() {
  const {
    state,
    running,
    paused,
    reduced,
    teach,
    discover,
    next,
    pause,
    stop,
    edit,
    simulate,
  } = useBrain();
  const [milestone, setMilestone] = useState(false);
  const [category, setCategory] = useState<KnowledgeCategory | null>(null);
  const [teaching, setTeaching] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState(false);
  const [why, setWhy] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const results = searchKnowledge(state.items, search);
  const learned = state.events.some((e) => e.item);
  const learning = state.status === "learning" && !paused;
  return (
    <div className="brain-page">
      <div className="brain-stage">
        <header className="brain-heading">
          <div>
            <span className="brain-eyebrow">
              <span className="identity-signal" /> YOUR COMPANY’S INTELLIGENCE
            </span>
            <h1>Business Brain</h1>
            <p>Everything Anti-Nerd understands about your business.</p>
          </div>
          <button className="button primary" onClick={() => setTeaching(true)}>
            <Plus size={16} />
            Teach Anti-Nerd
          </button>
        </header>
        <section
          className="brain-status-header"
          aria-label="Brain understanding status"
        >
          <div className="understanding-score">
            <ProgressRing value={state.health} />
            <div>
              <strong>{state.health}%</strong>
              <small>Understanding</small>
            </div>
          </div>
          <div className="brain-status-totals">
            <div>
              <strong>
                {(1284 + state.items.length - 12).toLocaleString("en-US")}
              </strong>
              <small>Things understood</small>
            </div>
            <div>
              <strong>+14</strong>
              <small>This week · Sample</small>
            </div>
          </div>
          <div className="brain-coverage-tags">
            <div>
              <b>UNDERSTANDS WELL</b>Products · Customers · Ads · Orders
            </div>
            <div>
              <b>STILL LEARNING</b>Finance · Inventory · Email
            </div>
          </div>
        </section>
        <p className="brain-status-footnote">
          Demo coverage, not AI accuracy ·{" "}
          {state.connections.toLocaleString("en-US")} illustrative connections ·
          Last learned {learned ? "just now" : "2 minutes ago"} ·{" "}
          {state.items.length} editable examples
        </p>
        <section className="brain-map-card">
          <div className="brain-map-heading">
            <div>
              <h2>A connected understanding.</h2>
              <p>One shared memory. Every part of your business.</p>
            </div>
            <Badge tone="gray">Demo knowledge graph</Badge>
          </div>
          <KnowledgeGraph
            onSelect={setCategory}
            learning={learning}
            status={state.status}
            paused={paused}
          />
          <div className="brain-event-bar">
            <LiveStatus
              status={state.status}
              message={state.message}
              paused={paused}
            />
            {running && (
              <div className="button-row">
                {reduced ? (
                  <button className="button" onClick={next}>
                    Next demo step
                  </button>
                ) : (
                  <button className="button" onClick={pause}>
                    {paused ? "Resume preview" : "Pause preview"}
                  </button>
                )}
                <button className="text-link" onClick={stop}>
                  Stop preview
                </button>
              </div>
            )}
            {state.status === "completed" && (
              <SuccessBurst>Done · Demo only</SuccessBurst>
            )}
          </div>
        </section>
      </div>
      <details className="brain-demo-controls">
        <summary>Preview intelligence · Demo controls</summary>
        <p>
          Explicit simulated events, never live AI. Previews stop at completion.
          Nothing runs until you start it.
        </p>
        <div className="button-row">
          <button className="button" onClick={() => setMilestone(true)}>
            Preview milestone
          </button>
          <button className="button" disabled={running} onClick={discover}>
            Preview discovery
          </button>
          <button
            className="button"
            disabled={running}
            onClick={() => simulate("completed")}
          >
            Preview completion
          </button>
          <button
            className="button"
            disabled={running}
            onClick={() => simulate("failed")}
          >
            Preview failure
          </button>
        </div>
      </details>
      {milestone && <MilestoneCard onClose={() => setMilestone(false)} />}
      {state.status === "waiting_for_approval" && (
        <DiscoveryCard>
          <Confidence level="Medium" />
          <h2>
            Your highest-revenue product is not your most profitable product.
          </h2>
          <p>
            Potential impact: <strong>€1,420/month</strong> · Illustrative
            estimate, not a forecast.
          </p>
          <button className="text-link" onClick={() => setWhy(true)}>
            See why <ArrowRight size={14} />
          </button>
        </DiscoveryCard>
      )}
      <section className="brain-search">
        <div>
          <Search size={20} />
          <h2>Search your business brain</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query.trim());
          }}
        >
          <input
            aria-label="Search your business brain"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to understand?"
            maxLength={300}
          />
          <button className="button primary">Search</button>
        </form>
        <div className="search-examples">
          {searchExamples.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuery(q);
                setSearch(q);
              }}
            >
              {q}
            </button>
          ))}
        </div>
        <small>Local example matching · No AI answer is generated.</small>
        {search && (
          <div className="brain-search-results">
            <h3>{results.length} matching examples</h3>
            <button
              className="text-link"
              onClick={() => {
                setSearch("");
                setQuery("");
              }}
            >
              Clear search
            </button>
            {results.map((item) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                onEdit={(i) => {
                  setEditing(i);
                  setDraft(i.title);
                }}
              />
            ))}
            {!results.length && (
              <p>
                No matching knowledge. Try a sample question, or teach Anti-Nerd
                something new.
              </p>
            )}
          </div>
        )}
      </section>
      <div className="brain-columns">
        <section>
          <div className="section-heading">
            <div>
              <h2>What Anti-Nerd learned</h2>
              <p>Today · Sample knowledge, open to correction.</p>
            </div>
            <BookOpen size={19} />
          </div>
          <div className="knowledge-timeline">
            {state.items.slice(0, 5).map((item) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                onEdit={(i) => {
                  setEditing(i);
                  setDraft(i.title);
                }}
              />
            ))}
          </div>
        </section>
        <aside>
          <section className="brain-summary">
            <span className="brain-eyebrow">A LIVING BUSINESS PROFILE</span>
            <h2>How Anti-Nerd sees your business</h2>
            <p>{businessSummary}</p>
            <small>Last updated: just now · Sample summary</small>
            <button className="text-link" onClick={() => setHistory(true)}>
              View history <ArrowRight size={14} />
            </button>
          </section>
          <section className="brain-dna">
            <h2>Business DNA</h2>
            <p>A portrait, not a score. Illustrative characteristics.</p>
            {dna.map(([label, value]) => (
              <div key={label}>
                <div className="dna-label">
                  <span>{label}</span>
                  <small>{value > 75 ? "HIGH" : "MEDIUM"}</small>
                </div>
                <ProgressReveal value={value} label={label} />
              </div>
            ))}
          </section>
        </aside>
      </div>
      <section className="brain-relationships">
        <h2>Connections Anti-Nerd discovered</h2>
        <p>
          How one part of the business affects another. Sample relationships,
          not proven causation.
        </p>
        <div>
          {relationships.map(([a, verb, b]) => (
            <article key={a}>
              <strong>{a}</strong>
              <span>
                <ArrowRight size={16} />
                {verb}
                <ArrowRight size={16} />
              </span>
              <strong>{b}</strong>
            </article>
          ))}
        </div>
      </section>
      <section className="brain-shared">
        <IntelligenceCore compact />
        <h2>One brain. A whole team.</h2>
        <p>Every agent works from the same company context.</p>
        <div className="shared-agents">
          {["Ads Agent", "Store Agent", "Support Agent"].map((name) => (
            <Link key={name} href="/ai-team">
              <span className="shared-connector" />
              <strong>{name}</strong>
              <small>Context → decisions → actions</small>
            </Link>
          ))}
        </div>
        <small>
          Future architecture · No agents are connected in this demo
        </small>
      </section>
      <section className="brain-loop">
        <h2>Better with every lesson.</h2>
        <p>A preview of how understanding becomes progress.</p>
        <div>
          {["Understand", "Decide", "Act", "Measure", "Learn"].map(
            (label, i) => (
              <div
                key={label}
                className={
                  running &&
                  [
                    "thinking",
                    "analyzing",
                    "executing",
                    "researching",
                    "learning",
                  ][i] === state.status
                    ? "loop-active"
                    : ""
                }
              >
                <span>0{i + 1}</span>
                <strong>{label}</strong>
                <ArrowRight size={15} />
              </div>
            ),
          )}
        </div>
        <p>
          Brain spots a UGC pattern → Creative Agent prepares concepts → Ads
          Agent tests → results are measured → the Brain learns which styles
          work. ↺
        </p>
      </section>
      <section className="brain-coverage">
        <div>
          <h2>{state.health}% understanding</h2>
          <p>Demo coverage estimate, not a measure of AI accuracy.</p>
          <ProgressReveal value={state.health} label="Knowledge coverage" />
          <div className="coverage-history">
            {[
              ["Day 1", "18%"],
              ["Integrations", "42%"],
              ["Order history", "61%"],
              ["Advertising", "72%"],
              ["Conversations", "81%"],
            ].map(([label, value]) => (
              <span key={label}>
                <strong>{value}</strong>
                {label}
              </span>
            ))}
          </div>
          <small>
            Illustrative journey · Future milestones are not completed
            connections.
          </small>
        </div>
        <div>
          <h3>Anti-Nerd understands</h3>
          <p>✓ Products · Orders · Advertising · Customers</p>
          <h3>Can learn more from</h3>
          <p>○ Accounting · Email history · Inventory</p>
          <Link href="/integrations" className="text-link">
            Explore connections <ArrowRight size={14} />
          </Link>
        </div>
      </section>
      {category && (
        <Modal
          title={`${category} knowledge`}
          className="brain-detail-panel"
          onClose={() => setCategory(null)}
        >
          <p>
            Review what Anti-Nerd knows, the evidence behind it and what still
            needs your judgment. All information is illustrative.
          </p>
          <div className="knowledge-context">
            <div>
              <span>CONNECTED CONTEXT</span>
              <p>
                {category === "Finance"
                  ? "Products · Ads · Orders"
                  : category === "Customers"
                    ? "Store · Marketing · Products"
                    : "Customers · Finance · Operations"}
              </p>
            </div>
            <div>
              <span>STILL UNKNOWN</span>
              <p>
                {category === "Finance"
                  ? "Actual net margin requires accounting and verified costs."
                  : "Live changes and recent results need a connected source."}
              </p>
            </div>
            <div>
              <span>NEXT OPPORTUNITY</span>
              <p>
                Confirm the assumptions below before using them in a decision.
              </p>
            </div>
          </div>
          {state.items
            .filter((i) => i.category === category)
            .map((item) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                onEdit={(i) => {
                  setCategory(null);
                  setEditing(i);
                  setDraft(i.title);
                }}
              />
            ))}
          {!state.items.some((i) => i.category === category) && (
            <div className="empty">
              No knowledge here yet. Teach Anti-Nerd to start.
            </div>
          )}
        </Modal>
      )}
      {teaching && (
        <Modal title="Teach Anti-Nerd" onClose={() => setTeaching(false)}>
          <p>Tell Anti-Nerd something important about your business.</p>
          <form
            className="teach-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!instruction.trim() || running) return;
              teach(instruction);
              setInstruction("");
              setTeaching(false);
            }}
          >
            <label className="field-label">
              Your business instruction
              <textarea
                rows={5}
                required
                maxLength={1000}
                placeholder="We never discount new collections more than 10%."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
            </label>
            <small>
              Stored only in this demo session. Refresh resets memory.
            </small>
            <button
              className="button primary"
              disabled={running || !instruction.trim()}
            >
              Remember this
            </button>
            {running && <p>Finish or stop the current preview first.</p>}
          </form>
        </Modal>
      )}
      {editing && (
        <Modal title="Edit knowledge" onClose={() => setEditing(null)}>
          <form
            className="teach-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              edit(editing.id, {
                title: draft.trim(),
                confidence: "Confirmed by owner",
                sources: [...new Set([...editing.sources, "Owner correction"])],
              });
              setEditing(null);
            }}
          >
            <label className="field-label">
              What should Anti-Nerd remember?
              <textarea
                rows={5}
                maxLength={1000}
                required
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </label>
            <button className="button primary" disabled={!draft.trim()}>
              Save correction
            </button>
          </form>
        </Modal>
      )}
      {history && (
        <Modal
          title="Business summary history"
          onClose={() => setHistory(false)}
        >
          {summaryHistory.map((entry) => (
            <article className="knowledge-card" key={entry.date}>
              <small>{entry.date} · Demo revision</small>
              <p>{entry.text}</p>
            </article>
          ))}
        </Modal>
      )}
      {why && (
        <Modal
          title="Revenue is only part of the story"
          onClose={() => setWhy(false)}
        >
          <p>
            In this fictional example, Product A earns more revenue but has
            higher product and advertising costs. Product B keeps more profit
            per sale.
          </p>
          <p>
            The €1,420/month estimate illustrates how a future opportunity could
            appear. No calculation or prediction was performed.
          </p>
          <p>Based on: sample Orders, Product costs, Ads and Business Brain.</p>
          <Link
            href="/control-center"
            className="button"
            onClick={() => setWhy(false)}
          >
            Review owner approvals
          </Link>
        </Modal>
      )}
    </div>
  );
}
