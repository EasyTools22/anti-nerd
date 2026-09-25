"use client";
import { useEffect, useState } from "react";
import { ArrowDown, Check, Play, Plus, Square, Trash2 } from "lucide-react";
import { Badge, Modal, useFeedback } from "@/components/ui/primitives";
import { ReorderButtons } from "@/components/ui/reorder-buttons";
import { useDemo } from "@/components/intelligence/demo-provider";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { flowStepKinds } from "@/lib/mock-data/flows";
import { moveItem } from "@/lib/flows/demo-builder";
import type {
  AutomationFlow,
  FlowStep,
  FlowStepKind,
} from "@/types/intelligence";
export function FlowEditor({ flow }: { flow: AutomationFlow }) {
  const { setFlows } = useDemo();
  const { notify } = useFeedback();
  const reduced = useReducedMotion();
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<FlowStepKind>("Then");
  const [text, setText] = useState("");
  const [position, setPosition] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const complete = position === flow.steps.length && position >= 0;
  useEffect(() => {
    if (!playing || reduced || position < 0 || position >= flow.steps.length)
      return;
    const timer = setTimeout(() => {
      setPosition((current) => current + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [playing, reduced, position, flow.steps.length]);
  function updateSteps(steps: FlowStep[]) {
    setPlaying(false);
    setPosition(-1);
    setFlows((current) =>
      current.map((item) =>
        item.id === flow.id
          ? {
              ...item,
              steps,
              enabled:
                steps.length && steps.every((step) => step.text.trim())
                  ? item.enabled
                  : false,
            }
          : item,
      ),
    );
  }
  return (
    <section className="flow-editor">
      <div className="flow-editor-heading">
        <div>
          <Badge tone="gray">LOCAL DEMO FLOW</Badge>
          <h2>{flow.name}</h2>
          <p>{flow.description}</p>
        </div>
        <div className="flow-enable">
          <span>{flow.enabled ? "Enabled" : "Paused"}</span>
          <button
            className={`toggle ${flow.enabled ? "on" : ""}`}
            role="switch"
            aria-label={`Enable ${flow.name}`}
            aria-checked={flow.enabled}
            disabled={
              !flow.steps.length || flow.steps.some((step) => !step.text.trim())
            }
            onClick={() => {
              setPlaying(false);
              setPosition(-1);
              setFlows((current) =>
                current.map((item) =>
                  item.id === flow.id
                    ? { ...item, enabled: !item.enabled }
                    : item,
                ),
              );
              notify("Flow preference updated. No automation will run.");
            }}
          >
            <span />
          </button>
        </div>
      </div>
      <div className="flow-demo-toolbar">
        <p>
          <span className="live-dot" />
          Your rules still come first. Nothing here can take real actions.
        </p>
        <button
          className="button"
          disabled={!flow.enabled || !flow.steps.length}
          onClick={() => {
            if (playing && !complete) {
              setPlaying(false);
              setPosition(-1);
            } else {
              setPosition(0);
              setPlaying(true);
            }
          }}
        >
          {playing && !complete ? <Square size={14} /> : <Play size={14} />}{" "}
          {playing && !complete
            ? "Stop preview"
            : complete
              ? "Replay preview"
              : "Preview flow"}
        </button>
        {reduced && playing && !complete && (
          <button
            className="button"
            onClick={() => setPosition((current) => current + 1)}
          >
            Next demo step
          </button>
        )}
      </div>
      <div
        className="flow-progress"
        role="progressbar"
        aria-label="Demo flow progress"
        aria-valuemin={0}
        aria-valuemax={Math.max(flow.steps.length, 1)}
        aria-valuenow={Math.max(position, 0)}
      >
        <span
          style={{
            width: `${flow.steps.length ? (Math.max(position, 0) / flow.steps.length) * 100 : 0}%`,
          }}
        />
      </div>
      {complete && (
        <div className="flow-complete" role="status">
          <Check size={17} />
          Preview complete. No ads, messages, or business data were changed.
        </div>
      )}
      <ol className="flow-steps">
        {flow.steps.map((step, index) => (
          <li key={step.id}>
            <article
              className={`flow-step ${position === index ? "current" : ""} ${position > index ? "done" : ""}`}
            >
              <div className="flow-step-top">
                <span className="flow-step-kind">
                  {position > index ? (
                    <Check size={13} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                  {step.kind}
                </span>
                <ReorderButtons
                  label={`step ${index + 1}`}
                  index={index}
                  count={flow.steps.length}
                  onMove={(target) =>
                    updateSteps(moveItem(flow.steps, index, target))
                  }
                />
                <button
                  className="icon-button"
                  aria-label={`Remove step ${index + 1}`}
                  onClick={() =>
                    updateSteps(
                      flow.steps.filter((item) => item.id !== step.id),
                    )
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <label className="sr-only" htmlFor={`text-${step.id}`}>
                Step {index + 1}: {step.kind}
              </label>
              <input
                id={`text-${step.id}`}
                maxLength={180}
                value={step.text}
                onChange={(event) =>
                  updateSteps(
                    flow.steps.map((item) =>
                      item.id === step.id
                        ? { ...item, text: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              {position === index && (
                <small className="flow-step-status">
                  Showing this step · Demo
                </small>
              )}
            </article>
            {index < flow.steps.length - 1 && (
              <span className="flow-connector" aria-hidden="true">
                <ArrowDown size={17} />
              </span>
            )}
          </li>
        ))}
      </ol>
      {!flow.steps.length && (
        <div className="empty">
          <Plus size={28} />
          <h3>Start with one small step</h3>
          <p>
            Add what should happen first. This flow stays paused until it has
            steps.
          </p>
        </div>
      )}
      <div className="flow-add">
        <button className="button" onClick={() => setAdding(true)}>
          <Plus size={15} />
          Add step
        </button>
      </div>
      {adding && (
        <Modal title="Add a step" onClose={() => setAdding(false)}>
          <form
            className="add-step-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!text.trim()) return;
              updateSteps([
                ...flow.steps,
                { id: crypto.randomUUID(), kind, text: text.trim() },
              ]);
              setText("");
              setAdding(false);
            }}
          >
            <label className="field-label">
              What kind of step?
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as FlowStepKind)
                }
              >
                {flowStepKinds.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              What should happen?
              <textarea
                rows={3}
                maxLength={180}
                required
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="For example: Ask me before changing the budget"
              />
            </label>
            <p className="muted">
              Describe it in your own words. This is a local demo step, not an
              executable instruction.
            </p>
            <button
              className="button primary"
              type="submit"
              disabled={!text.trim()}
            >
              Add step
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
