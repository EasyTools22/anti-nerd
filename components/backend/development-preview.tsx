"use client";
import { useState } from "react";
import type { ActionReceipt, AuditEvent } from "@/types/backend";
interface PreviewResult {
  receipts: ActionReceipt[];
  audit: AuditEvent[];
  learnedResults: number;
}
export function DevelopmentPreview({ available }: { available: boolean }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [error, setError] = useState("");
  async function run(scenario: "read" | "price") {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/development/runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      if (!response.ok)
        throw new Error(
          "Preview unavailable. Run the local development server and try again.",
        );
      setResult(await response.json());
    } catch {
      setError(
        "Preview unavailable. Run the local development server and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="expert-disclosure">
      <summary>
        Development preview
        <span>Mock provider → policy → mock store → audit</span>
      </summary>
      <p className="muted">
        An isolated server preview using fictional data. Nothing is saved and no
        external service is contacted.
      </p>
      {!available && <p>Available only on the development server.</p>}
      <div className="button-row">
        <button
          type="button"
          className="button"
          disabled={!available || busy}
          onClick={() => run("read")}
        >
          {busy ? "Running preview…" : "Preview a store read"}
        </button>
        <button
          type="button"
          className="button"
          disabled={!available || busy}
          onClick={() => run("price")}
        >
          Preview a price proposal
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div role="status" className="backend-preview-result">
          {result.receipts.map((receipt) => (
            <div key={receipt.actionId}>
              <strong>
                {receipt.status === "awaiting_approval"
                  ? "Owner review required"
                  : receipt.status === "succeeded"
                    ? "Mock read completed"
                    : "Action stopped"}
              </strong>
              <p>{receipt.decision.reason}</p>
              <small>
                {receipt.status === "awaiting_approval"
                  ? "Approval exists only inside this preview. Write execution is not available."
                  : `${result.learnedResults} result recorded by the mock Brain.`}
              </small>
            </div>
          ))}
          <h4>Audit trail · This preview only</h4>
          {result.audit.map((event) => (
            <div className="detail-row" key={event.id}>
              <span>{event.action}</span>
              <strong>{event.result.replaceAll("_", " ")}</strong>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
