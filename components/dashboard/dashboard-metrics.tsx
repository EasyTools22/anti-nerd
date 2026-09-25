import { ArrowUpRight } from "lucide-react";
import { MetricLabel } from "@/components/ui/metric-label";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { metrics } from "@/lib/mock-data/dashboard";
export function DashboardMetrics({ period }: { period: string }) {
  return (
    <div className="metrics-grid">
      {metrics.map(([name, value, change], i) => (
        <article
          className={`metric-card ${name === "Profit" ? "metric-profit" : ""}`}
          key={name}
        >
          <div className="metric-label">
            {name === "ROAS" ? <MetricLabel term="ROAS" value={3.8} /> : name}
            <ArrowUpRight size={14} />
          </div>
          <div className="metric-value">
            <AnimatedNumber
              value={
                period === "30 days"
                  ? value
                  : (period === "Today"
                      ? ["€1,240", "12", "€321", "€209", "3.8x", "94%"]
                      : ["€6,180", "46", "€1,605", "€1,045", "3.8x", "94%"])[i]
              }
            />
          </div>
          <div className="metric-bottom">
            <span>{change}</span>
            <small>vs. previous period</small>
          </div>
          <svg className="sparkline" viewBox="0 0 110 26" aria-hidden="true">
            <path
              d={`M0 23 L10 18 L20 ${i % 2 ? 21 : 12} L30 15 L40 17 L50 8 L60 12 L70 5 L80 9 L90 2 L100 5 L110 1`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </article>
      ))}
    </div>
  );
}
