"use client";
import { useId } from "react";
import type { AIJobStatus } from "@/types/brain";
/** The split lens: three signal planes around one shared intelligence. No idle timer. */
export function IntelligenceCore({
  status = "idle",
  paused = false,
  compact = false,
}: {
  status?: AIJobStatus;
  paused?: boolean;
  compact?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const phase = paused ? "idle" : status;
  return (
    <span
      className={`intelligence-core core-${phase} ${compact ? "core-compact" : ""}`}
      role="img"
      aria-label={`Anti-Nerd intelligence: ${paused ? "paused" : status.replaceAll("_", " ")}`}
    >
      <svg viewBox="0 0 280 280">
        <defs>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="var(--core-edge)" />
            <stop offset=".25" stopColor="var(--core-shadow)" />
            <stop offset=".55" stopColor="var(--core-edge)" />
            <stop offset="1" stopColor="var(--core-shadow)" />
          </linearGradient>
          <radialGradient id={`${id}-depth`}>
            <stop stopColor="var(--core-center)" />
            <stop offset="1" stopColor="var(--core-shadow)" />
          </radialGradient>
        </defs>
        <circle cx="140" cy="140" r="104" className="core-boundary" />
        <g
          className="core-planes"
          fill="none"
          stroke={`url(#${id}-metal)`}
          strokeWidth="1.6"
        >
          <ellipse
            cx="140"
            cy="140"
            rx="90"
            ry="53"
            transform="rotate(-35 140 140)"
          />
          <ellipse
            cx="140"
            cy="140"
            rx="90"
            ry="53"
            transform="rotate(35 140 140)"
          />
          <ellipse
            cx="140"
            cy="140"
            rx="90"
            ry="53"
            transform="rotate(90 140 140)"
          />
        </g>
        <circle
          cx="140"
          cy="140"
          r="56"
          fill={`url(#${id}-depth)`}
          stroke={`url(#${id}-metal)`}
        />
        <path
          className="core-insignia"
          d="M112 155 134 113h14l21 42h-15l-13-27-15 27zm17-10h29v8h-29z"
        />
        <path
          className="core-signal-path"
          d="M68 186C32 95 188 42 215 107S106 239 68 186"
          fill="none"
        />
        <circle className="core-beacon" cx="210" cy="92" r="4" />
        <circle className="core-particle" cx="70" cy="186" r="3" />
        <path
          className="core-bracket"
          d="M35 74V49h25M220 231h25v-25"
          fill="none"
        />
      </svg>
    </span>
  );
}
