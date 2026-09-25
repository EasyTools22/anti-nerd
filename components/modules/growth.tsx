"use client";
import { useState } from "react";
import Link from "next/link";
import { CampaignRoom } from "./campaign-room";
import { Confidence } from "@/components/ui/product-signals";
import {
  ArrowUpRight,
  Play,
  Plus,
  Sparkles,
  TrendingUp,
  ScanEye,
} from "lucide-react";
import { MetricLabel } from "@/components/ui/metric-label";
import { campaigns, money } from "@/lib/mock-data/business";
import {
  Modal,
  Badge,
  Card,
  PageHeading,
  Tabs,
  useFeedback,
} from "@/components/ui/primitives";
export function AdsPage() {
  const [review, setReview] = useState(false);
  const [platform, setPlatform] = useState("All platforms");
  const { preview } = useFeedback();
  return (
    <>
      <PageHeading
        title="Ads"
        description="Know what’s working. Make every euro count."
      >
        <button
          className="button"
          onClick={() => preview("Advertising connections")}
        >
          Manage platforms <ArrowUpRight size={15} />
        </button>
      </PageHeading>
      <div className="metrics-grid ads-overview-strip">
        {[
          ["Ad spend", "€4,180"],
          ["Attributed revenue", "€16,342"],
          ["Profit after ads", "€6,420"],
          ["ROAS", "3.9x"],
        ].map(([name, value]) => (
          <div
            className={`metric-card ads-metric ${name === "Profit after ads" ? "metric-profit" : ""}`}
            key={name}
          >
            {name === "ROAS" ? (
              <MetricLabel
                term="ROAS"
                value={3.9}
                subtitle="Revenue for each €1 in ads"
              />
            ) : (
              <span className="muted">{name}</span>
            )}
            <div className="metric-value">{value}</div>
            <small className="muted">Last 30 days · Sample</small>
          </div>
        ))}
      </div>
      <CampaignRoom />
      <div className="insight horizontal">
        <Sparkles size={22} />
        <div>
          <strong>This ad is getting more expensive.</strong>
          <p>
            TikTok’s cost per purchase (CPA) increased 21% over the last 48
            hours. Your AI team recommends reducing its budget by 15%.
          </p>
        </div>
        <button className="button" onClick={() => setReview(true)}>
          Review suggestion
        </button>
      </div>
      {review && (
        <Modal title="Review campaign budget" onClose={() => setReview(false)}>
          <Confidence level="Medium" />
          <h3>A smaller budget while you investigate.</h3>
          <dl className="trust-grid">
            <div>
              <dt>Why</dt>
              <dd>
                Sample TikTok cost per purchase increased 21% in 48 hours.
              </dd>
            </div>
            <div>
              <dt>Data used</dt>
              <dd>Illustrative campaign spend and attributed orders.</dd>
            </div>
            <div>
              <dt>Expected impact</dt>
              <dd>
                Reducing the budget by 15% may limit wasted spend; results are
                not predicted.
              </dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>
                Lower reach could reduce sales. Attribution may be incomplete.
              </dd>
            </div>
            <div>
              <dt>Owner control</dt>
              <dd>No budget changes happen here. Review your limits first.</dd>
            </div>
          </dl>
          <p className="muted">
            Demo recommendation · Confidence is illustrative, not calculated.
          </p>
          <Link
            href="/control-center"
            className="button primary"
            onClick={() => setReview(false)}
          >
            Review my rules
          </Link>
        </Modal>
      )}
      <details className="expert-disclosure">
        <summary>
          All campaign data{" "}
          <span>Platforms, CPA, ROAS and attributed revenue</span>
        </summary>
        <Card
          title="Your campaigns"
          subtitle="184 purchases · €22.72 average cost per purchase · Last 30 days, sample data."
        >
          <div className="table-toolbar">
            <Tabs
              options={[
                "All platforms",
                "Meta",
                "TikTok",
                "Google",
                "Snapchat",
              ]}
              value={platform}
              onChange={setPlatform}
            />
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Campaign",
                    "Platform",
                    "Spend",
                    "Revenue",
                    "ROAS",
                    "CPA",
                    "Status",
                  ].map((v) => (
                    <th key={v}>
                      {v === "ROAS" || v === "CPA" ? (
                        <MetricLabel term={v} />
                      ) : (
                        v
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns
                  .filter(
                    (c) =>
                      platform === "All platforms" || c.platform === platform,
                  )
                  .map((c) => (
                    <tr key={c.name}>
                      <td>
                        <button
                          className="table-link"
                          onClick={() => preview(c.name)}
                        >
                          {c.name}
                        </button>
                      </td>
                      <td>{c.platform}</td>
                      <td>{money(c.spend)}</td>
                      <td>{money(c.revenue)}</td>
                      <td>
                        <strong>{c.roas}x</strong>
                      </td>
                      <td>€{c.cpa.toFixed(2)}</td>
                      <td>
                        <Badge
                          tone={
                            c.status === "Active"
                              ? "green"
                              : c.status === "Review"
                                ? "amber"
                                : "gray"
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </details>
    </>
  );
}
const creativeData = [
  ["Everyday, elevated.", "Images", "Winning", "4.8%", "€14.20", "5.2x"],
  ["Less, but better.", "Videos", "Testing", "3.2%", "€21.80", "3.4x"],
  ["Your next everyday.", "Images", "Winning", "4.1%", "€16.40", "4.6x"],
  ["Made to go places.", "Videos", "Testing", "2.9%", "€24.10", "2.8x"],
  ["A new kind of essential.", "Images", "Testing", "3.8%", "€18.50", "3.9x"],
  [
    "Details make the difference.",
    "Images",
    "Winning",
    "4.5%",
    "€15.10",
    "4.9x",
  ],
];
export function CreativesPage() {
  const [tab, setTab] = useState("All");
  const { preview } = useFeedback();
  return (
    <>
      <PageHeading
        title="Creative Studio"
        description="Ideas with potential. Creatives with purpose."
      >
        <button
          className="button primary"
          onClick={() => preview("Create with AI")}
        >
          <Sparkles size={16} />
          Create with AI
        </button>
      </PageHeading>
      <div className="section-heading">
        <h2>Creative Library</h2>
        <Tabs
          options={["All", "Images", "Videos", "Winning", "Testing"]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div className="creative-grid">
        {creativeData
          .filter((c) => tab === "All" || c.includes(tab))
          .map((c) => {
            const i = creativeData.indexOf(c);
            return (
              <article className="card creative-card" key={c[0]}>
                <button
                  className={`creative-art art-${i % 4}`}
                  onClick={() => preview(`Creative: ${c[0]}`)}
                >
                  <span>WK EXCLUSIVE</span>
                  <div className="creative-shape" />
                  <strong>{c[0]}</strong>
                  {c[1] === "Videos" && (
                    <span className="play">
                      <Play size={18} />
                    </span>
                  )}
                  <small>THE EVERYDAY COLLECTION</small>
                </button>
                <div className="product-info">
                  <div className="detail-row">
                    <h3>{c[0]}</h3>
                    <Badge tone={c[2] === "Winning" ? "green" : "gray"}>
                      {c[2]}
                    </Badge>
                  </div>
                  <p>{c[1]} · Autumn collection</p>
                  <div className="creative-stats">
                    <span>
                      <MetricLabel term="CTR" value={parseFloat(c[3])} />
                      <strong>{c[3]}</strong>
                    </span>
                    <span>
                      <MetricLabel
                        term="CPA"
                        value={parseFloat(c[4].replace("€", ""))}
                      />
                      <strong>{c[4]}</strong>
                    </span>
                    <span>
                      <MetricLabel term="ROAS" value={parseFloat(c[5])} />
                      <strong>{c[5]}</strong>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
      </div>
      <Card
        title="Creative Performance"
        subtitle="The strongest ideas in your sample collection."
      >
        <div className="detail-row padded">
          <span>
            <TrendingUp size={18} /> Winning creatives average 4.8x ROAS
          </span>
          <strong>€2,480 total spend</strong>
        </div>
      </Card>
    </>
  );
}
export function CompetitorsPage() {
  const { preview } = useFeedback();
  return (
    <>
      <PageHeading
        title="Competitors"
        description="Stay curious about your market. Stay focused on your business."
      >
        <button
          className="button primary"
          onClick={() => preview("Add competitor")}
        >
          <Plus size={16} />
          Add competitor
        </button>
      </PageHeading>
      <div className="competitor-grid">
        {[
          ["Atelier North", "ateliernorth.example", "24", "8"],
          ["Studio Forma", "studioforma.example", "18", "3"],
          ["Daily Objects", "dailyobjects.example", "32", "6"],
        ].map(([name, site, ads, creatives]) => (
          <Card key={name}>
            <div className="product-info">
              <span className="agent-icon tone-3">
                <ScanEye size={22} />
              </span>
              <h3>{name}</h3>
              <p>{site}</p>
              <div className="creative-stats">
                <span>
                  Ads detected<strong>{ads}</strong>
                </span>
                <span>
                  New creatives<strong>{creatives}</strong>
                </span>
              </div>
              <div className="detail-row">
                <small className="muted">Last checked · 2 hours ago</small>
                <Badge tone="gray">Sample</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card
        title="Competitor Insights"
        subtitle="Signals worth paying attention to."
      >
        {[
          "Atelier North launched 8 new creatives this week.",
          "Studio Forma is promoting a 20% discount on its autumn collection.",
          "Video creatives are appearing more frequently in this market.",
        ].map((text) => (
          <div className="attention-row" key={text}>
            <span className="agent-icon tone-2">
              <Sparkles size={18} />
            </span>
            <p>{text}</p>
          </div>
        ))}
      </Card>
    </>
  );
}
