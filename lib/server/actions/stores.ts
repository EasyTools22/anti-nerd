import "server-only";
import type {
  ActionProposal,
  ActionReceipt,
  AgentId,
  AuditEvent,
  OrganizationPolicy,
  ProviderId,
} from "@/types/backend";
import { BackendError } from "@/lib/server/errors";
export interface ApprovalRecord {
  id: string;
  organizationId: string;
  actionId: string;
  fingerprint: string;
  policyRevision: number;
  expiresAt: string;
  approvedBy: string | null;
}
export interface ActionRecord {
  executionSource?: "mock" | "live";
  id: string;
  organizationId: string;
  actorId: string;
  agent: AgentId;
  provider: ProviderId;
  proposal: ActionProposal;
  fingerprint: string;
  requestedAt: string;
  receipt?: ActionReceipt;
  approval?: ApprovalRecord;
}
/** Implement these atomically and durably before exposing live execution/approval endpoints. */
export interface ActionRepository {
  readonly persistence: "ephemeral" | "durable";
  create(record: ActionRecord): Promise<boolean>;
  get(organizationId: string, actionId: string): Promise<ActionRecord | null>;
  save(record: ActionRecord): Promise<void>;
  claimApproval(
    organizationId: string,
    actionId: string,
    approvalId: string,
    fingerprint: string,
    approvedBy: string,
    now: string,
  ): Promise<boolean>;
}
export interface AuditRepository {
  readonly persistence: "ephemeral" | "durable";
  append(event: AuditEvent): Promise<void>;
}
export interface PolicyRepository {
  get(organizationId: string): Promise<OrganizationPolicy>;
}
/** Per-preview instance. Never a production store, and never contains credentials. */
export class MockActionRepository implements ActionRepository {
  readonly persistence = "ephemeral" as const;
  #records = new Map<string, ActionRecord>();
  async create(record: ActionRecord) {
    const key = `${record.organizationId}:${record.id}`;
    if (this.#records.has(key)) return false;
    this.#records.set(key, structuredClone(record));
    return true;
  }
  async get(org: string, id: string) {
    return structuredClone(this.#records.get(`${org}:${id}`) ?? null);
  }
  async save(record: ActionRecord) {
    const existing = this.#records.get(`${record.organizationId}:${record.id}`);
    if (!existing || existing.fingerprint !== record.fingerprint)
      throw new BackendError(
        "ACTION_MISMATCH",
        "Action snapshot does not match.",
      );
    this.#records.set(
      `${record.organizationId}:${record.id}`,
      structuredClone(record),
    );
  }
  async claimApproval(
    org: string,
    id: string,
    approvalId: string,
    fingerprint: string,
    actor: string,
    now: string,
  ) {
    const record = this.#records.get(`${org}:${id}`),
      approval = record?.approval;
    if (
      !record ||
      record.receipt?.status !== "awaiting_approval" ||
      !approval ||
      approval.id !== approvalId ||
      approval.fingerprint !== fingerprint ||
      approval.approvedBy ||
      Date.parse(approval.expiresAt) <= Date.parse(now)
    )
      return false;
    approval.approvedBy = actor;
    return true;
  }
}
export class MockAuditRepository implements AuditRepository {
  readonly persistence = "ephemeral" as const;
  #events: AuditEvent[] = [];
  async append(event: AuditEvent) {
    this.#events.push(structuredClone(event));
  }
  list() {
    return structuredClone(this.#events);
  }
}
