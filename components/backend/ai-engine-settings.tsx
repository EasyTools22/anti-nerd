"use client";
import { useState } from "react";
import type { BackendStatus, UsageMode } from "@/types/backend";
import { Badge } from "@/components/ui/primitives";
import { DevelopmentPreview } from "./development-preview";
const choices = [
  {
    id: "anti-nerd",
    name: "Anti-Nerd AI",
    description: "No separate account to manage when available.",
    label: "Recommended",
  },
  {
    id: "openai",
    name: "OpenAI",
    description:
      "Use your own account, with Anti-Nerd keeping control of your tools.",
    label: "Your account",
  },
  {
    id: "anthropic",
    name: "Claude",
    description:
      "Bring your Claude provider account when secure connections are ready.",
    label: "Your account",
  },
] as const;
export function AIEngineSettings({ status }: { status: BackendStatus }) {
  const [provider, setProvider] = useState<string>("anti-nerd");
  const [mode, setMode] = useState<UsageMode>("credits");
  const [model, setModel] = useState("balanced");
  return (
    <div className="ai-engine-settings">
      <span className="section-kicker">YOUR AI ENGINE</span>
      <h3>Choose who helps you think.</h3>
      <p>
        Anti-Nerd controls access to your business. Your AI engine receives only
        the context needed for a task.
      </p>
      <div className="engine-choices">
        {choices.map((choice) => (
          <button
            type="button"
            className={`autonomy-option ${provider === choice.id ? "selected" : ""}`}
            key={choice.id}
            aria-pressed={provider === choice.id}
            onClick={() => {
              setProvider(choice.id);
              setMode(choice.id === "anti-nerd" ? "credits" : "own_account");
            }}
          >
            <small>{choice.label}</small>
            <h3>{choice.name}</h3>
            <p>{choice.description}</p>
          </button>
        ))}
      </div>
      <div className="detail-row">
        <span>Connection status</span>
        <Badge tone="gray">Not connected</Badge>
      </div>
      <label className="field-label">
        Model preference
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="balanced">Balanced</option>
          <option value="quality">Best available quality</option>
          <option value="fast">Faster responses</option>
        </select>
        <small>
          Preference preview. A specific model will be chosen after connection.
        </small>
      </label>
      <label className="field-label">
        Usage mode
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as UsageMode)}
        >
          {provider === "anti-nerd" ? (
            <option value="credits">Anti-Nerd credits</option>
          ) : (
            <option value="own_account">Use my own API account</option>
          )}
        </select>
      </label>
      <p className="insight">
        Connections are not available yet. Your choices are a preview for this
        page only; no credits are purchased or used.
      </p>
      <details className="expert-disclosure">
        <summary>
          Advanced setup<span>Account connection and key storage</span>
        </summary>
        <p>
          Your workspace uses authenticated access. Secure provider credentials and live AI remain disabled.
          Key entry is disabled until they are ready.
        </p>
        <p>
          Future provider keys stay on the server, encrypted per organization.
          Saved keys will never be returned to the browser or shared with
          Shopify.
        </p>
        <p className="muted">
          OpenAI and Anthropic adapters are not activated. No model request is
          sent.
        </p>
      </details>
      <DevelopmentPreview available={status.previewAvailable} />
    </div>
  );
}
