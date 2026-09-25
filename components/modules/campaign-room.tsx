"use client";
import { useState } from "react";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { campaigns, money } from "@/lib/mock-data/business";
import { Confidence } from "@/components/ui/product-signals";
import { Modal } from "@/components/ui/primitives";
const groups = [
  {
    name: "Winning",
    description: "Strong return on sample spend.",
    test: (c: (typeof campaigns)[number]) => c.roas >= 4,
  },
  {
    name: "Watching",
    description: "Keep an eye on efficiency.",
    test: (c: (typeof campaigns)[number]) => c.roas >= 2.5 && c.roas < 4,
  },
  {
    name: "Under target",
    description: "Review before spending more.",
    test: (c: (typeof campaigns)[number]) => c.roas < 2.5,
  },
];
export function CampaignRoom() {
  const [group, setGroup] = useState("Winning");
  const [selected, setSelected] = useState<(typeof campaigns)[number] | null>(
    null,
  );
  const filtered = campaigns.filter(groups.find((g) => g.name === group)!.test);
  return (
    <section className="campaign-room">
      <div className="campaign-room-heading">
        <div>
          <span className="section-kicker">CAMPAIGN CONTROL</span>
          <h2>Know where your money works.</h2>
        </div>
        <small>Demo grouping by return · Not a profitability assessment</small>
      </div>
      <div className="campaign-lanes">
        {groups.map((g, i) => (
          <button
            className={`campaign-lane lane-${i}`}
            key={g.name}
            aria-pressed={group === g.name}
            onClick={() => setGroup(g.name)}
          >
            <span>{g.name}</span>
            <strong>
              {campaigns.filter(g.test).length.toString().padStart(2, "0")}
            </strong>
            <small>{g.description}</small>
            <ArrowRight size={18} />
          </button>
        ))}
      </div>
      <div className="campaign-focus-list">
        {filtered.map((c) => (
          <button key={c.name} onClick={() => setSelected(c)}>
            <span className="platform-mark">{c.platform.slice(0, 1)}</span>
            <div>
              <small>
                {c.platform} / {c.status}
              </small>
              <h3>{c.name}</h3>
            </div>
            <div>
              <strong>{money(c.spend)}</strong>
              <small>Spent</small>
            </div>
            <div>
              <strong>{c.roas}×</strong>
              <small>Ad return</small>
            </div>
            <ArrowUpRight size={18} />
          </button>
        ))}
      </div>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <Confidence level="Medium" />
          <p>
            Sample campaign context. Return on ads does not account for product
            costs, fees or refunds.
          </p>
          <dl className="trust-grid">
            <div>
              <dt>Data used</dt>
              <dd>
                {money(selected.spend)} spend · {money(selected.revenue)}{" "}
                attributed revenue
              </dd>
            </div>
            <div>
              <dt>What it means</dt>
              <dd>{selected.roas}× revenue for each euro of advertising.</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>
                Attribution may be incomplete. Past return does not guarantee
                future results.
              </dd>
            </div>
            <div>
              <dt>Owner control</dt>
              <dd>
                Review costs and your limits before changing spend. No changes
                are made here.
              </dd>
            </div>
          </dl>
        </Modal>
      )}
    </section>
  );
}
