"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Clock3,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge, Modal } from "@/components/ui/primitives";
import { PerformanceChart } from "./performance-chart";
export function DashboardPerformance() {
  const [analysis, setAnalysis] = useState(false);
  return (
    <>
      <div className="performance-grid">
        <PerformanceChart />
        <section className="summary-card">
          <div className="summary-heading">
            <span className="summary-icon">
              <Sparkles size={19} />
            </span>
            <h2>AI Business Summary</h2>
            <span className="tiny-label">TODAY</span>
          </div>
          <h3>
            Looking good,
            <br />
            and getting better.
          </h3>
          <p>
            Your business is performing well today. Here’s the bigger picture.
          </p>
          <ul>
            <li>
              <TrendingUp size={16} />
              <span>
                Revenue is <strong>18% higher</strong> than the same period
                yesterday.
              </span>
            </li>
            <li>
              <Check size={16} />
              <span>
                <strong>Meta campaigns</strong> brought in most of your new
                customers.
              </span>
            </li>
            <li>
              <CircleAlert size={16} />
              <span>
                <strong>3 orders</strong> could use a little attention.
              </span>
            </li>
            <li>
              <Clock3 size={16} />
              <span>
                Customer response time improved by <strong>24%.</strong>
              </span>
            </li>
          </ul>
          <button onClick={() => setAnalysis(true)}>
            View full analysis <ArrowUpRight size={16} />
          </button>
          <small>Sample insights · Updated just now</small>
        </section>
      </div>
      {analysis && (
        <Modal
          title="Your business analysis"
          onClose={() => setAnalysis(false)}
        >
          <Badge>Sample report · September 24</Badge>
          <h3>A healthy month, with room to grow.</h3>
          <p>
            Revenue grew 18.2% to €24,820 over the previous period. Returning
            customers account for 32% of purchases, while Meta retargeting
            delivers the highest return at 5.2x.
          </p>
          <h3>Your next best steps</h3>
          <p>
            Review the rising CPA in TikTok campaigns, approve five customer
            replies, and follow up on three delayed shipments. Two popular
            products need replenishment.
          </p>
          <p className="muted">
            Profit of €6,420 includes €3,060 in operating overhead beyond the
            €9,480 contribution shown in Finance. These are illustrative
            figures.
          </p>
          <Link
            className="button primary"
            href="/finance"
            onClick={() => setAnalysis(false)}
          >
            Explore finances
          </Link>
        </Modal>
      )}
    </>
  );
}
