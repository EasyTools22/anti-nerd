"use client";
import { ResearchObject } from "./research-object";
import { useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  Compass,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Card,
  Modal,
  PageHeading,
  useFeedback,
} from "@/components/ui/primitives";
import { MetricLabel } from "@/components/ui/metric-label";
import {
  researchProducts,
  marketOpportunities,
  watchedProducts,
} from "@/lib/mock-data/product-shell";
import { money } from "@/lib/mock-data/business";
import type { ResearchProduct } from "@/types/product-shell";

export function ResearchPage() {
  const [saved, setSaved] = useState<string[]>(
    researchProducts.filter((p) => p.initiallySaved).map((p) => p.id),
  );
  const [selected, setSelected] = useState<ResearchProduct | null>(null);
  const { preview, notify } = useFeedback();
  function toggleSaved(product: ResearchProduct) {
    const isSaved = saved.includes(product.id);
    setSaved((current) =>
      isSaved
        ? current.filter((id) => id !== product.id)
        : [...current, product.id],
    );
    notify(
      isSaved
        ? "Removed from your demo saved research."
        : "Saved for this demo session.",
    );
  }
  return (
    <>
      <PageHeading
        title="Find your next opportunity"
        description="Ideas worth a closer look. Find the one that fits your business."
      >
        <Badge tone="gray">Sample research · Not live data</Badge>
      </PageHeading>
      <div className="research-actions">
        <button
          className="button primary"
          onClick={() => preview("Find products")}
        >
          <Search size={16} />
          Find products
        </button>
        <button className="button" onClick={() => preview("Explore niches")}>
          <Compass size={16} />
          Explore niches
        </button>
        <button className="button" onClick={() => preview("Research a market")}>
          <TrendingUp size={16} />
          Research a market
        </button>
      </div>
      <div className="section-heading">
        <div>
          <h2>Trending products</h2>
          <p>Examples of the clear, practical insights you’ll find here.</p>
        </div>
        <Badge tone="gray">Illustrative estimates</Badge>
      </div>
      <div className="research-grid">
        {researchProducts.map((product, i) => {
          const isSaved = saved.includes(product.id);
          return (
            <Card key={product.id}>
              <div className={`research-product-art art-${i}`}>
                <span>{product.category}</span>
                <ResearchObject kind={product.id} />
                <button
                  className="research-save"
                  aria-label={`${isSaved ? "Unsave" : "Save"} ${product.name}`}
                  aria-pressed={isSaved}
                  onClick={() => toggleSaved(product)}
                >
                  {isSaved ? <Check size={18} /> : <Bookmark size={18} />}
                </button>
              </div>
              <div className="product-info">
                <span className="section-kicker">
                  OPPORTUNITY / {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{product.name}</h3>
                <div className="research-facts">
                  <div>
                    <span>Typical selling price</span>
                    <strong>{money(product.price)}</strong>
                  </div>
                  <div>
                    <span>Sample unit cost</span>
                    <strong>
                      {money(
                        product.price * (1 - parseInt(product.margin) / 100),
                      )}
                    </strong>
                  </div>
                  <div>
                    <MetricLabel term="Margin" simple />
                    <strong>{product.margin}</strong>
                  </div>
                </div>
                <div className="detail-row">
                  <span>Interest trend</span>
                  <strong>{product.interest}</strong>
                </div>
                <div className="detail-row">
                  <span>Competition</span>
                  <strong>{product.competition}</strong>
                </div>
                <div className="detail-row">
                  <span>Potential</span>
                  <Badge
                    tone={product.competition === "High" ? "amber" : "green"}
                  >
                    {product.potential}
                  </Badge>
                </div>
                <div className="research-rationale">
                  <span>WHY IT CAUGHT OUR EYE</span>
                  <p>{product.detail}</p>
                </div>
                <button
                  className="text-link"
                  onClick={() => setSelected(product)}
                >
                  Research deeper <ArrowRight size={14} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="research-disclaimer">
        Prices, unit costs inferred from sample margins, trends, competition,
        and potential are made-up examples, not current market findings or
        recommendations.
      </p>
      <div className="research-bottom-grid">
        <Card
          title="Market opportunities"
          subtitle="Start with a customer need, not just a product."
        >
          {marketOpportunities.map((opportunity) => (
            <div className="opportunity-row" key={opportunity.title}>
              <span className="agent-icon tone-3">
                <Compass size={20} />
              </span>
              <div>
                <h3>{opportunity.title}</h3>
                <p>{opportunity.description}</p>
                <Badge tone="gray">{opportunity.category} · Sample</Badge>
              </div>
            </div>
          ))}
        </Card>
        <Card
          title="Products to watch"
          subtitle="A few ideas to keep on your radar."
        >
          {watchedProducts.map((product) => (
            <div className="watch-row" key={product.name}>
              <h3>{product.name}</h3>
              <p>{product.category} · Sample idea</p>
              <span>
                <TrendingUp size={14} />
                {product.signal}
              </span>
            </div>
          ))}
        </Card>
      </div>
      <Card
        title="Saved research"
        subtitle="Keep promising ideas together. Saved only for this demo session."
        action={<Badge tone="gray">{saved.length} saved</Badge>}
      >
        {saved.length ? (
          researchProducts
            .filter((p) => saved.includes(p.id))
            .map((product) => (
              <div className="saved-research-row" key={product.id}>
                <Bookmark size={18} />
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.category} · Sample research</p>
                </div>
                <button
                  className="text-link"
                  onClick={() => setSelected(product)}
                >
                  Open research <ArrowRight size={14} />
                </button>
                <button
                  className="button"
                  onClick={() => toggleSaved(product)}
                  aria-label={`Remove ${product.name}`}
                >
                  Remove
                </button>
              </div>
            ))
        ) : (
          <div className="empty">
            <Bookmark size={26} />
            <h3>A little room for your next idea</h3>
            <p>
              Save a sample product above to keep it here while you explore.
            </p>
          </div>
        )}
      </Card>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <Badge tone="gray">Sample research · Not a live finding</Badge>
          <p>{selected.detail}</p>
          <div className="insight">
            <strong>Questions worth asking</strong>
            <p>
              Who would buy this? What would make your version different? Can
              the price cover product costs, delivery, returns, and advertising?
            </p>
          </div>
          <p className="muted">
            Supplier research and live market data will be connected in a later
            phase.
          </p>
          <button
            className="button primary"
            onClick={() => toggleSaved(selected)}
          >
            {saved.includes(selected.id)
              ? "Remove from saved research"
              : "Save research"}
          </button>
        </Modal>
      )}
    </>
  );
}
