import { MutationForm } from "./mutation-form";
import type { OrganizationPolicy } from "@/types/backend";
export function InstructionsPanel({
  items,
  canEdit,
}: {
  items: {
    id: string;
    business_id: string | null;
    instruction: string;
    priority: number;
    active: boolean;
  }[];
  canEdit: boolean;
}) {
  return (
    <section>
      <h3>My business instructions</h3>
      <p className="muted">
        Saved securely to this workspace. Live AI is disabled; these
        instructions are not sent to a provider.
      </p>
      {items.map((item) => (
        <MutationForm key={item.id} operation="instruction" disabled={!canEdit}>
          <input type="hidden" name="id" value={item.id} />
          <input
            type="hidden"
            name="scope"
            value={item.business_id ? "business" : "organization"}
          />
          <label className="field-label">
            {item.business_id
              ? "Business instruction"
              : "Workspace instruction"}
            <textarea
              name="instruction"
              defaultValue={item.instruction}
              maxLength={5000}
              required
              rows={3}
              disabled={!canEdit}
            />
          </label>
          <label className="field-label">
            Priority
            <input
              type="number"
              name="priority"
              min={0}
              max={100}
              defaultValue={item.priority}
              disabled={!canEdit}
            />
          </label>
          <label>
            <input
              type="checkbox"
              name="active"
              defaultChecked={item.active}
              disabled={!canEdit}
            />{" "}
            Active
          </label>
        </MutationForm>
      ))}
      {canEdit && (
        <details className="advanced-preferences" open={!items.length}>
          <summary>Add an instruction</summary>
          <MutationForm operation="instruction" label="Save instruction">
            <label className="field-label">
              Instruction
              <textarea
                name="instruction"
                maxLength={5000}
                rows={4}
                placeholder="What should your future team always remember?"
                required
              />
            </label>
            <label className="field-label">
              Applies to
              <select name="scope">
                <option value="business">This business</option>
                <option value="organization">Entire workspace</option>
              </select>
            </label>
            <input type="hidden" name="priority" value="0" />
            <input type="hidden" name="active" value="on" />
          </MutationForm>
        </details>
      )}
    </section>
  );
}
export function PoliciesPanel({
  policy,
  owner,
}: {
  policy: OrganizationPolicy;
  owner: boolean;
}) {
  return (
    <section className="card durable-panel">
      <h3>Workspace action policy</h3>
      <p className="muted">
        Revision {policy.revision}. Only owners can change policies. Shopify
        reads follow these rules; store changes remain unavailable.
      </p>
      {Object.entries(policy.rules).map(([cap, rule]) => (
        <p key={cap}>
          {cap} · {rule?.mode}
        </p>
      ))}
      {!Object.keys(policy.rules).length && (
        <p>Default: read access; ask first for every write.</p>
      )}
      <MutationForm operation="policy" disabled={!owner} label="Save policy">
        <input type="hidden" name="revision" value={policy.revision} />
        <label className="field-label">
          Capability
          <select name="capability">
            <option value="products.price.write">Product price</option>
            <option value="products.read">Read products</option>
            <option value="store.read">Read store</option>
            <option value="orders.refund">Refunds</option>
            <option value="store.publish">Publishing</option>
          </select>
        </label>
        <label className="field-label">
          Permission
          <select name="mode">
            {[
              "ASK_FIRST",
              "DENIED",
              "READ_ONLY",
              "AUTOMATIC_WITH_LIMITS",
              "AUTOMATIC",
            ].map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>
        </label>
        <p className="muted">
          Automatic limits support an absolute new product price only.
        </p>
        <label className="field-label">
          Maximum new price (minor units, e.g. 9900 = 99.00)
          <input
            name="limit"
            type="number"
            min={0}
            max={999999999}
            step={1}
            defaultValue={9900}
          />
        </label>
        <label className="field-label">
          Limit currency
          <select name="currency">
            <option>EUR</option>
            <option>USD</option>
            <option>GBP</option>
          </select>
        </label>
      </MutationForm>
    </section>
  );
}
export function MetadataPanel({
  connections,
}: {
  connections: {
    integrations: {
      id: string;
      provider: string;
      display_name: string;
      status: string;
    }[];
    providers: { id: string; provider: string; status: string }[];
  };
}) {
  return (
    <section className="card durable-panel">
      <h3>Saved connection records</h3>
      <p className="muted">
        Saved workspace connections. Manage Shopify above; live AI remains
        unavailable.
      </p>
      {[...connections.integrations, ...connections.providers].map((row) => (
        <div className="detail-row" key={row.id}>
          <strong>{row.provider}</strong>
          <span>{row.status.replaceAll("_", " ")}</span>
        </div>
      ))}
    </section>
  );
}
