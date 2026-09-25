"use client";
import Link from "next/link";
import { Brain, ArrowUpRight } from "lucide-react";
import { useBrain } from "./brain-provider";
import { ProgressReveal } from "@/components/motion/intelligence-motion";
export function BrainWidget() {
  const { state } = useBrain();
  return (
    <section
      className={`brain-widget ${state.status === "learning" ? "learning-pulse" : ""}`}
    >
      <span className="brain-widget-icon">
        <Brain size={28} />
      </span>
      <div>
        <h2>
          Business Brain <span>Demo knowledge</span>
        </h2>
        <p>
          {state.status === "learning"
            ? "Learning from today’s sample business activity…"
            : (state.items[0]?.title ?? "Your knowledge starts here.")}
        </p>
        <small>+14 things learned this week · Illustrative baseline</small>
      </div>
      <div className="brain-widget-health">
        <strong>{state.health}% understanding</strong>
        <ProgressReveal value={state.health} label="Brain understanding" />
      </div>
      <Link href="/brain" className="text-link">
        Open Brain <ArrowUpRight size={15} />
      </Link>
    </section>
  );
}
