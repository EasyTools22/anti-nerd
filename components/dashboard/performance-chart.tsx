"use client";
import { useId, useState } from "react";
import { Card, Tabs } from "@/components/ui/primitives";
export function PerformanceChart({
  profitOnly = false,
}: {
  profitOnly?: boolean;
}) {
  const [period, setPeriod] = useState("30D");
  const [selected, setSelected] = useState<number | null>(null);
  const id = useId().replaceAll(":", "");
  const weights =
    period === "7D"
      ? [31, 44, 38, 58, 49, 69, 84]
      : period === "90D"
        ? [18, 24, 20, 35, 29, 41, 37, 53, 45, 61, 55, 72, 63, 80]
        : [
            28, 33, 29, 42, 39, 30, 48, 55, 40, 48, 39, 57, 54, 73, 57, 63, 49,
            66, 60, 73, 68, 82, 75, 89, 78, 92, 87, 99, 92, 109,
          ];
  const total = profitOnly
    ? period === "7D"
      ? 2340
      : period === "90D"
        ? 27260
        : 9480
    : period === "7D"
      ? 6180
      : period === "90D"
        ? 72840
        : 24820;
  const profitTotal = period === "7D" ? 1605 : period === "90D" ? 18420 : 6420;
  const sum = weights.reduce((a, b) => a + b, 0);
  const values = weights.map((n) => (n / sum) * total);
  const profits = weights.map((n) => (n / sum) * profitTotal);
  const ceiling = Math.ceil(Math.max(...values) / 500) * 500;
  const y = (v: number) => 218 - (v / ceiling) * 170;
  const x = (i: number) => 48 + (i * 700) / (weights.length - 1);
  const money = (v: number) =>
    new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(v);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const current =
    selected === null ? null : Math.min(selected, values.length - 1);
  const label = (i: number) =>
    period === "30D"
      ? `${i + 1} Sep`
      : period === "7D"
        ? `${18 + i} Sep`
        : `Period ${i + 1} of 14`;
  return (
    <Card
      title={profitOnly ? "Profit trend" : "Business performance"}
      subtitle="The numbers behind your momentum."
      action={
        <Tabs
          options={["7D", "30D", "90D"]}
          value={period}
          onChange={(v) => {
            setPeriod(v);
            setSelected(null);
          }}
        />
      }
      className="performance-card"
    >
      <div className="chart-summary">
        <div>
          <span className="chart-key" />
          {profitOnly ? "Contribution" : "Revenue"}
          <strong>{money(total)}</strong>
        </div>
        {!profitOnly && (
          <div>
            <span className="chart-key light" />
            Profit<strong>{money(profitTotal)}</strong>
          </div>
        )}
        <span className="chart-growth">
          ↗ 18.2% <small>sample comparison</small>
        </span>
      </div>
      <div className="chart">
        <svg
          viewBox="0 0 800 270"
          role="group"
          aria-label={`${period} ${profitOnly ? "contribution" : "revenue and profit"} chart. Focus a point for values.`}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--chart-primary)"
                stopOpacity=".15"
              />
              <stop
                offset="100%"
                stopColor="var(--chart-primary)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((i) => {
            const value = ceiling * (1 - i / 3);
            return (
              <g key={i}>
                <line
                  x1="48"
                  x2="760"
                  y1={y(value)}
                  y2={y(value)}
                  stroke="var(--border-subtle)"
                  strokeDasharray="3 5"
                />
                <text
                  x="0"
                  y={y(value) + 4}
                  fontSize="10"
                  fill="var(--text-tertiary)"
                >
                  {value >= 1000
                    ? `€${(value / 1000).toFixed(1)}k`
                    : money(value)}
                </text>
              </g>
            );
          })}
          <polygon points={`48,218 ${points} 748,218`} fill={`url(#${id})`} />
          <polyline
            points={points}
            fill="none"
            stroke="var(--chart-primary)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {!profitOnly && (
            <polyline
              points={profits.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke="var(--chart-secondary)"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          )}
          {values.map((v, i) => (
            <g
              key={i}
              role="button"
              tabIndex={0}
              className="chart-point"
              aria-label={`${label(i)}, ${profitOnly ? "contribution" : "revenue"} ${money(v)}${profitOnly ? "" : `, profit ${money(profits[i])}`}`}
              onFocus={() => setSelected(i)}
              onMouseEnter={() => setSelected(i)}
              onClick={() => setSelected(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(i);
                }
              }}
            >
              <rect
                x={x(i) - Math.min(14, 350 / values.length)}
                y="40"
                width={Math.min(28, 700 / values.length)}
                height="183"
                fill="transparent"
              />
              <circle
                cx={x(i)}
                cy={y(v)}
                r={current === i ? 5 : 2}
                fill={current === i ? "var(--chart-primary)" : "transparent"}
                stroke={current === i ? "var(--surface)" : "none"}
                strokeWidth="2"
              />
            </g>
          ))}
          {current !== null && (
            <line
              x1={x(current)}
              x2={x(current)}
              y1="40"
              y2="225"
              stroke="var(--border-strong)"
              strokeDasharray="3 4"
              pointerEvents="none"
            />
          )}
          {[0, Math.floor((values.length - 1) / 2), values.length - 1].map(
            (i) => (
              <text
                key={i}
                x={x(i)}
                y="251"
                textAnchor={i === values.length - 1 ? "end" : "start"}
                fontSize="10"
                fill="var(--text-tertiary)"
              >
                {label(i)}
              </text>
            ),
          )}
        </svg>
        <div className="chart-tooltip" aria-live="polite">
          {current === null ? (
            <span>Hover, tap or focus a point to explore the trend.</span>
          ) : (
            <>
              <strong>{label(current)}</strong>
              <span>
                {profitOnly ? "Contribution" : "Revenue"}{" "}
                <strong>{money(values[current])}</strong>
              </span>
              {!profitOnly && (
                <span>
                  Profit <strong>{money(profits[current])}</strong>
                </span>
              )}
              {current === values.length - 1 && (
                <span>Highest sample period ↗</span>
              )}
            </>
          )}
        </div>
        <p className="chart-sample-note">
          Illustrative distribution of sample totals ·{" "}
          {period === "90D" ? "Grouped periods" : "Daily values"} · No live
          reporting
        </p>
      </div>
    </Card>
  );
}
