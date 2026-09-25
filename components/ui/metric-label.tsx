"use client";
import { useState } from "react";
import { CircleHelp } from "lucide-react";
import {
  businessTerms,
  explainMetric,
  type BusinessTerm,
} from "@/lib/business-terms";
import { Modal } from "./primitives";
/** Native hover tooltip plus a keyboard/touch-accessible explanation. */
export function MetricLabel({
  label,
  subtitle,
  term,
  simple = false,
  value,
}: {
  label?: string;
  subtitle?: string;
  term?: BusinessTerm;
  simple?: boolean;
  value?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const definition = term ? businessTerms[term] : undefined;
  const explanation = term ? explainMetric(term, value) : "";
  const text = label ?? (simple ? definition?.label : term);
  return (
    <span className="explained-metric">
      <span className="explained-metric-title">
        {text}
        {definition && (
          <button
            type="button"
            className="term-help"
            title={explanation}
            aria-label={`Explain ${term}`}
            aria-haspopup="dialog"
            onClick={() => setExpanded(true)}
          >
            <CircleHelp size={12} />
          </button>
        )}
      </span>
      {subtitle && <span className="metric-subtitle">{subtitle}</span>}
      {expanded && definition && (
        <Modal
          title={`${definition.label}${term === "Conversion" || term === "Margin" ? "" : ` (${term})`}`}
          onClose={() => setExpanded(false)}
        >
          <p>{explanation}</p>
          <button className="button primary" onClick={() => setExpanded(false)}>
            Got it
          </button>
        </Modal>
      )}
    </span>
  );
}
