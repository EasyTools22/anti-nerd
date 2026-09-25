"use client";
import Link from "next/link";
import { Brain, ArrowRight } from "lucide-react";
import { useBrain } from "@/components/brain/brain-provider";
import { LiveStatus } from "@/components/motion/intelligence-motion";
export function WorkingStatus() {
  const { state, running, discover, paused, reduced, next, pause, stop } =
    useBrain();
  return (
    <section className="working-banner">
      <span className="brain-widget-icon">
        <Brain size={25} />
      </span>
      <div className="working-main">
        <h2>{running ? "Anti-Nerd is working" : "Anti-Nerd is ready"}</h2>
        <LiveStatus
          status={state.status}
          message={state.message}
          paused={paused}
        />
      </div>
      <div className="working-side">
        <span>Demo workspace · No live jobs</span>
        {running && (
          <div className="button-row">
            <button className="text-link" onClick={reduced ? next : pause}>
              {reduced
                ? "Next demo step"
                : paused
                  ? "Resume preview"
                  : "Pause preview"}
            </button>
            <button className="text-link" onClick={stop}>
              Stop preview
            </button>
          </div>
        )}
        <button className="text-link" disabled={running} onClick={discover}>
          Preview a discovery <ArrowRight size={14} />
        </button>
        <Link href="/brain" className="text-link">
          View Business Brain
        </Link>
      </div>
    </section>
  );
}
