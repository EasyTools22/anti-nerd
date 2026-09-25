"use client";
import { useState } from "react";
import { ArrowRight, GitBranch, Sparkles } from "lucide-react";
import { Badge, PageHeading, useFeedback } from "@/components/ui/primitives";
import { useDemo } from "@/components/intelligence/demo-provider";
import { FlowEditor } from "@/components/flows/flow-editor";
import { FlowTemplates } from "@/components/flows/flow-templates";
import { demoFlowBuilder } from "@/lib/flows/demo-builder";
import type { AutomationFlow } from "@/types/intelligence";
export function FlowsPage() {
  const { flows, addFlow } = useDemo();
  const [selected, setSelected] = useState(flows[0]?.id ?? "");
  const [request, setRequest] = useState("");
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState("");
  const { notify } = useFeedback();
  const flow = flows.find((item) => item.id === selected) ?? flows[0];
  function useFlow(template: AutomationFlow) {
    setSelected(addFlow(template));
    notify("Flow added to your demo workspace. It starts paused.");
  }
  return (
    <>
      <PageHeading
        title="Make it automatic"
        description="Your way of doing things. One simple flow at a time."
      >
        <Badge tone="gray">Demo builder · Nothing runs</Badge>
      </PageHeading>
      <section className="flow-prompt-card">
        <span className="agent-icon tone-3">
          <Sparkles size={24} />
        </span>
        <div>
          <h2>Tell Anti-Nerd what you want</h2>
          <p>No special language. Just say what should happen.</p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!request.trim() || building) return;
              setBuilding(true);
              try {
                const built = await demoFlowBuilder.build(request.trim());
                setSelected(addFlow(built.flow));
                setResult(built.explanation);
                notify("Example flow created. Review the steps below.");
              } catch {
                setResult(
                  "The example could not be prepared. Please try again.",
                );
              } finally {
                setBuilding(false);
              }
            }}
          >
            <label className="sr-only" htmlFor="flow-request">
              Describe your flow
            </label>
            <textarea
              id="flow-request"
              maxLength={1000}
              rows={2}
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              placeholder="When an ad spends more than €40 without a sale, pause it and tell me."
            />
            <button
              type="submit"
              className="button primary"
              disabled={!request.trim() || building}
            >
              {building ? "Building preview…" : "Build flow"}
              <ArrowRight size={15} />
            </button>
          </form>
          <small>
            This uses predefined examples, not AI. You can change every step.
          </small>
          {result && (
            <p className="flow-build-result" role="status">
              {result}
            </p>
          )}
        </div>
      </section>
      <div className="section-heading">
        <div>
          <h2>
            Your flows <Badge tone="gray">{flows.length}</Badge>
          </h2>
          <p>
            Enabled means enabled in this demo. No work happens in the
            background.
          </p>
        </div>
      </div>
      <div className="flows-workspace">
        <aside className="flow-list" aria-label="Your flows">
          {flows.map((item) => (
            <button
              key={item.id}
              className={flow?.id === item.id ? "selected" : ""}
              onClick={() => setSelected(item.id)}
            >
              <GitBranch size={17} />
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.steps.length} steps ·{" "}
                  {item.enabled ? "Enabled" : "Paused"}
                </small>
              </span>
            </button>
          ))}
        </aside>
        {flow && <FlowEditor key={flow.id} flow={flow} />}
      </div>
      <div className="section-heading">
        <div>
          <h2>A head start for your next flow</h2>
          <p>Pick a template. Make it yours.</p>
        </div>
      </div>
      <FlowTemplates onUse={useFlow} />
    </>
  );
}
