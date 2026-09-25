"use client";
import { useEffect, useRef, useState } from "react";
import { IntelligenceCore } from "@/components/identity/intelligence-core";
import { categories } from "@/lib/mock-data/brain";
import type { AIJobStatus, KnowledgeCategory } from "@/types/brain";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
const layout: Record<KnowledgeCategory, [number, number, number, number]> = {
  Customers: [-197, -76, 18, 25],
  Operations: [-114, -15, -40, 15],
  Products: [180, -90, -5, 27],
  Store: [241, -5, 45, 21],
  Ads: [-171, 106, -25, 24],
  Marketing: [-82, 143, 30, 17],
  Competitors: [-268, 129, 70, 13],
  Market: [-249, 40, -65, 15],
  Finance: [179, 127, -38, 29],
  Brand: [78, -139, 55, 16],
};
const connections: [KnowledgeCategory, KnowledgeCategory][] = [
  ["Customers", "Products"],
  ["Customers", "Operations"],
  ["Operations", "Store"],
  ["Ads", "Customers"],
  ["Ads", "Marketing"],
  ["Ads", "Finance"],
  ["Competitors", "Market"],
  ["Market", "Ads"],
  ["Products", "Finance"],
  ["Products", "Store"],
  ["Brand", "Products"],
  ["Marketing", "Brand"],
];
export default function KnowledgeGraph({
  onSelect,
  learning,
  status = "idle",
  paused = false,
}: {
  onSelect: (category: KnowledgeCategory) => void;
  learning: boolean;
  status?: AIJobStatus;
  paused?: boolean;
}) {
  const [angle, setAngle] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState<KnowledgeCategory | null>(null);
  const [visible, setVisible] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const nodes = categories
    .map((category) => {
      const [x, y, z, r] = layout[category];
      const yaw = angle + tilt;
      const xx = x * Math.cos(yaw) + z * Math.sin(yaw),
        zz = z * Math.cos(yaw) - x * Math.sin(yaw);
      const perspective = 650 / (650 + zz);
      const offset = focus ? layout[focus][0] * 0.045 : 0;
      return {
        category,
        x: 380 + xx * perspective * zoom - offset,
        y: 235 + y * perspective * zoom,
        depth: zz,
        scale: perspective,
        r: r * perspective,
      };
    })
    .sort((a, b) => b.depth - a.depth);
  const find = (category: KnowledgeCategory) =>
    nodes.find((n) => n.category === category)!;
  const active = learning && visible;
  function select(category: KnowledgeCategory) {
    setFocus(category);
    onSelect(category);
  }
  return (
    <div
      ref={host}
      className={`knowledge-graph spatial-graph ${active ? "is-learning" : ""}`}
    >
      <div className="graph-toolbar">
        <span>SHARED INTELLIGENCE / WK EXCLUSIVE</span>
        <div>
          <button
            className="icon-button"
            aria-label="Rotate brain left"
            onClick={() => setAngle((a) => a - 0.22)}
          >
            ↶
          </button>
          <button
            className="icon-button"
            aria-label="Rotate brain right"
            onClick={() => setAngle((a) => a + 0.22)}
          >
            ↷
          </button>
          <button
            className="icon-button"
            aria-label="Zoom brain out"
            disabled={zoom <= 0.8}
            onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
          >
            −
          </button>
          <button
            className="icon-button"
            aria-label="Zoom brain in"
            disabled={zoom >= 1.1}
            onClick={() => setZoom((z) => Math.min(1.1, z + 0.1))}
          >
            +
          </button>
          <button
            className="text-link"
            onClick={() => {
              setAngle(0);
              setTilt(0);
              setFocus(null);
              setZoom(1);
            }}
          >
            Reset view
          </button>
        </div>
      </div>
      <div className="spatial-scene">
        <div className="graph-core-object">
          <IntelligenceCore
            status={visible ? status : "idle"}
            paused={paused}
          />
        </div>
        {active && (
          <div className="graph-learning-packet">
            MEMORY RECEIVED / CONNECTING
          </div>
        )}
        <svg
          viewBox="0 0 760 470"
          role="group"
          aria-label="Interactive business knowledge graph"
          onPointerDown={(e) => {
            if ((e.target as Element).closest("[role=button]")) return;
            drag.current = e.clientX;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (drag.current !== null) {
              setAngle((a) => a + (e.clientX - drag.current!) * 0.006);
              drag.current = e.clientX;
            } else if (!reduced && e.pointerType === "mouse") {
              const rect = e.currentTarget.getBoundingClientRect();
              setTilt(
                ((e.clientX - rect.left - rect.width / 2) / rect.width) * 0.18,
              );
            }
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onPointerLeave={() => setTilt(0)}
        >
          <ellipse
            cx="380"
            cy="249"
            rx="300"
            ry="157"
            className="spatial-orbit"
          />
          <ellipse
            cx="380"
            cy="249"
            rx="247"
            ry="115"
            className="spatial-orbit"
            transform="rotate(-20 380 249)"
          />
          {connections.map(([a, b], i) => {
            const from = find(a),
              to = find(b);
            return (
              <path
                key={i}
                className={`neural-connection ${focus === a || focus === b ? "strong" : ""}`}
                d={`M${from.x} ${from.y} Q380 ${i % 2 ? 370 : 95} ${to.x} ${to.y}`}
                fill="none"
              >
                <title>
                  {a} connects with {b} · Illustrative relationship
                </title>
              </path>
            );
          })}
          {nodes.map((n, i) => (
            <g
              key={`context-${n.category}`}
              opacity={Math.max(0.3, 1 - n.depth / 250)}
            >
              <line
                className="core-connection"
                x1="380"
                y1="235"
                x2={n.x}
                y2={n.y}
              />
              {[0, 1, 2, 3].map((j) => {
                const a = i + j * 1.8;
                const x = n.x + Math.cos(a) * (n.r + 18),
                  y = n.y + Math.sin(a) * (n.r + 20);
                return (
                  <g key={j}>
                    <line
                      className="satellite-link"
                      x1={n.x}
                      y1={n.y}
                      x2={x}
                      y2={y}
                    />
                    <circle
                      className="satellite-node"
                      cx={x}
                      cy={y}
                      r={j === 0 ? 2.6 : 1.7}
                    />
                  </g>
                );
              })}
            </g>
          ))}
          {nodes.map((n) => (
            <g
              key={n.category}
              transform={`translate(${n.x} ${n.y})`}
              role="button"
              tabIndex={0}
              aria-label={`Explore ${n.category} knowledge`}
              aria-pressed={focus === n.category}
              className="knowledge-node spatial-node"
              onClick={() => select(n.category)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  select(n.category);
                }
              }}
            >
              <circle r={n.r + 7} className="node-aura" />
              <circle r={n.r} />
              <path d={`M-6 0H6M0 -6V6`} className="node-cross" />
              <text y={n.r + 17} textAnchor="middle">
                {n.category}
              </text>
              <text y={n.r + 29} textAnchor="middle" className="node-density">
                {n.category === "Finance"
                  ? "LEARNING"
                  : n.category === "Products"
                    ? "EXCELLENT"
                    : "CONNECTED"}
              </text>
            </g>
          ))}
          <text x="145" y="54" className="cluster-label">
            01 / CUSTOMERS
          </text>
          <text x="551" y="47" className="cluster-label">
            02 / COMMERCE
          </text>
          <text x="96" y="431" className="cluster-label">
            03 / GROWTH
          </text>
          <text x="552" y="437" className="cluster-label">
            04 / FINANCE
          </text>
          {active && <circle r="3" className="learning-signal" />}
        </svg>
      </div>
      <div className="graph-bottom-caption">
        <span>One context. Every decision.</span>
        <small>
          Drag to change perspective · Select a node · Demo relationships
        </small>
      </div>
      <div className="graph-mobile-nodes">
        {categories.map((c) => (
          <button key={c} onClick={() => select(c)}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
