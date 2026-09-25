"use client";
import { useEffect, useState } from "react";
import { Check, Pause, Play, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { founderProcess } from "@/lib/mock-data/intelligence";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
export function FounderJourney() {
  const [idea, setIdea] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [progress, setProgress] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const complete = progress === founderProcess.length;
  useEffect(() => {
    if (!playing || reduced || progress < 0 || complete) return;
    const timer = setTimeout(() => setProgress((value) => value + 1), 1400);
    return () => clearTimeout(timer);
  }, [playing, reduced, progress, complete]);
  return (
    <section className="founder-journey">
      <div className="founder-intro">
        <span className="agent-icon tone-3">
          <Sparkles size={23} />
        </span>
        <h2>What do you want to build?</h2>
        <p>
          Think of Anti-Nerd as a future co-founder for the busywork. Start with
          your idea.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!idea.trim()) return;
          setSubmitted(idea.trim());
          setProgress(0);
          setPlaying(true);
        }}
      >
        <label className="sr-only" htmlFor="business-idea">
          Your business idea
        </label>
        <textarea
          id="business-idea"
          rows={4}
          maxLength={1500}
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="I want an online store selling products for people who travel a lot. I have €3,000 to start."
        />
        <button
          className="button primary"
          type="submit"
          disabled={!idea.trim()}
        >
          <Sparkles size={15} />
          {submitted ? "Restart demo plan" : "Show my demo plan"}
        </button>
      </form>
      {submitted && (
        <div className="founder-result">
          <Badge tone="gray">SCRIPTED DEMO · NO RESEARCH PERFORMED</Badge>
          <blockquote>{submitted}</blockquote>
          <h3>Got it. I’ll help you research the market first.</h3>
          <p className="muted">
            That’s an example response. The walkthrough below illustrates the
            future process; it doesn’t analyze your idea or create anything.
          </p>
          <div className="founder-playback">
            <span>
              {complete
                ? "Walkthrough complete"
                : `Preview step ${progress + 1} of ${founderProcess.length}`}
            </span>
            {!complete &&
              (reduced ? (
                <button
                  className="text-link"
                  onClick={() => setProgress((value) => value + 1)}
                >
                  Next demo step
                </button>
              ) : (
                <button
                  className="text-link"
                  onClick={() => setPlaying(!playing)}
                >
                  {playing ? <Pause size={14} /> : <Play size={14} />}{" "}
                  {playing ? "Pause walkthrough" : "Resume walkthrough"}
                </button>
              ))}
          </div>
          <div
            className="flow-progress"
            role="progressbar"
            aria-label="Founder demo progress"
            aria-valuemin={0}
            aria-valuemax={founderProcess.length}
            aria-valuenow={Math.max(progress, 0)}
          >
            <span
              style={{
                width: `${(Math.max(progress, 0) / founderProcess.length) * 100}%`,
              }}
            />
          </div>
          <ol className="founder-process">
            {founderProcess.map((label, index) => (
              <li
                key={label}
                className={
                  progress > index
                    ? "done"
                    : progress === index
                      ? "current"
                      : ""
                }
              >
                <span>
                  {progress > index ? <Check size={14} /> : index + 1}
                </span>
                <strong>{label}</strong>
                <small>
                  {progress > index
                    ? "Previewed"
                    : progress === index
                      ? "Demo step"
                      : "Up next"}
                </small>
              </li>
            ))}
          </ol>
          {complete && (
            <p className="founder-complete" role="status">
              <Check size={17} />
              That’s the journey. No market research, store, payments, or ads
              were created.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
