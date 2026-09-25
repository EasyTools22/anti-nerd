"use client";
import { ArrowDown, ArrowUp } from "lucide-react";
export function ReorderButtons({
  label,
  index,
  count,
  onMove,
}: {
  label: string;
  index: number;
  count: number;
  onMove: (target: number) => void;
}) {
  return (
    <span className="reorder-buttons">
      <button
        type="button"
        className="icon-button"
        disabled={index === 0}
        aria-label={`Move ${label} up`}
        onClick={() => onMove(index - 1)}
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        className="icon-button"
        disabled={index === count - 1}
        aria-label={`Move ${label} down`}
        onClick={() => onMove(index + 1)}
      >
        <ArrowDown size={14} />
      </button>
    </span>
  );
}
