import { WorkspaceRepository } from "@/lib/server/db/workspace";
import type { WorkspaceContext } from "@/lib/server/auth/context";
import { MutationForm } from "./mutation-form";
export async function DurableApprovals({
  context,
}: {
  context: WorkspaceContext;
}) {
  const items = await new WorkspaceRepository(context).pendingApprovals();
  return (
    <section className="card durable-panel">
      <h2>Needs you</h2>
      <p className="muted">
        Saved workspace approvals. Shopify reads follow your rules. Store
        changes remain unavailable.
      </p>
      {items.length === 0 ? (
        <p>You’re all caught up. No pending workspace approvals.</p>
      ) : (
        items.map((item) => {
          const action = Array.isArray(item.actions)
            ? item.actions[0]
            : item.actions;
          const expired = item.expired;
          return (
            <article className="durable-approval" key={item.id}>
              <h3>{action?.tool}</h3>
              <p className="muted">
                {action?.execution_source === "live"
                  ? "Connected Shopify data"
                  : "Demo execution"}
              </p>
              <p>{action?.reason}</p>
              <p className="muted">
                Policy {item.policy_revision} ·{" "}
                {expired ? "Expired" : "Expires"}{" "}
                {new Date(item.expires_at).toISOString()}
              </p>
              <details>
                <summary>Review exact proposal</summary>
                <pre>{JSON.stringify(action?.proposal, null, 2)}</pre>
              </details>
              <div className="durable-actions">
                <MutationForm
                  operation="approve"
                  label={
                    action?.execution_source === "live"
                      ? "Approve store read"
                      : "Approve demo action"
                  }
                  disabled={context.role !== "owner" || expired}
                >
                  <input type="hidden" name="action" value={item.action_id} />
                  <input type="hidden" name="approval" value={item.id} />
                </MutationForm>
                <MutationForm
                  operation="reject"
                  label="Reject"
                  disabled={context.role !== "owner" || expired}
                >
                  <input type="hidden" name="approval" value={item.id} />
                </MutationForm>
              </div>
            </article>
          );
        })
      )}
      {process.env.NODE_ENV === "development" && (
        <details className="advanced-preferences">
          <summary>Create a development fixture</summary>
          <p>
            Uses the shared runtime and policy engine. Records persist in this
            workspace.
          </p>
          <MutationForm operation="preview" label="Run mock scenario">
            <label className="field-label">
              Scenario
              <select name="scenario">
                <option value="price">Price approval</option>
                <option value="read">Read store identity</option>
              </select>
            </label>
          </MutationForm>
        </details>
      )}
    </section>
  );
}
