"use client";
import { ArrowRight, GitBranch } from "lucide-react";
import { flowTemplates } from "@/lib/mock-data/flows";
import { Badge, Card } from "@/components/ui/primitives";
import type { AutomationFlow } from "@/types/intelligence";
export function FlowTemplates({
  onUse,
}: {
  onUse: (flow: AutomationFlow) => void;
}) {
  return (
    <div className="flow-template-grid">
      {flowTemplates.map((flow, index) => (
        <Card key={flow.id}>
          <div className="product-info">
            <div className="template-top">
              <span className={`agent-icon tone-${index % 6}`}>
                <GitBranch size={20} />
              </span>
              <Badge tone="gray">{flow.steps.length} simple steps</Badge>
            </div>
            <h3>{flow.name}</h3>
            <p>{flow.description}</p>
            <ol className="template-steps">
              {flow.steps.map((step) => (
                <li key={step.id}>
                  <span>{step.kind}</span>
                  {step.text}
                </li>
              ))}
            </ol>
            <button
              className="button"
              aria-label={`Use flow: ${flow.name}`}
              onClick={() => onUse(flow)}
            >
              Use flow <ArrowRight size={14} />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
