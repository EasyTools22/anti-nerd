import "server-only";
import type {
  ActionRecord,
  ActionRepository,
  AuditRepository,
  PolicyRepository,
} from "../actions/stores";
import type { AuditEvent, OrganizationPolicy } from "@/types/backend";
import type { WorkspaceContext } from "../auth/context";
import type {
  ConnectionRepository,
  StoredIntegrationConnection,
} from "../security/credentials";
import { persistenceClient, sessionClient, databaseError } from "./client";
import { BackendError } from "../errors";
import { parseProposal } from "../validation";
import { toolCatalog } from "@/lib/backend/tool-catalog";
class TenantRepository {
  constructor(protected context: WorkspaceContext) {}
  protected check(org: string) {
    if (org !== this.context.organizationId)
      throw new BackendError("NOT_AUTHORIZED", "Workspace mismatch.");
  }
}
export class PostgresPolicyRepository
  extends TenantRepository
  implements PolicyRepository
{
  async get(org: string): Promise<OrganizationPolicy> {
    this.check(org);
    const client = await sessionClient();
    const { data, error } = await client.rpc("policy_snapshot", { org });
    databaseError(error);
    if (!data)
      throw new BackendError("NOT_AUTHORIZED", "Workspace unavailable.");
    return data as OrganizationPolicy;
  }
}
export class PostgresActionRepository
  extends TenantRepository
  implements ActionRepository
{
  readonly persistence = "durable" as const;
  async create(record: ActionRecord) {
    this.check(record.organizationId);
    if (
      record.actorId !== this.context.actorId ||
      !["mock", "anti-nerd"].includes(record.provider) ||
      (record.executionSource === "live" &&
        toolCatalog[record.proposal.tool].impact !== "read")
    )
      throw new BackendError("INVALID_ACTION", "Invalid action attribution.");
    const proposal = parseProposal(record.proposal),
      def = toolCatalog[proposal.tool];
    const resource =
      Object.entries(proposal.input).find(([key]) => key.endsWith("Id"))?.[1] ??
      "store";
    const { error } = await persistenceClient()
      .from("actions")
      .insert({
        id: record.id,
        organization_id: record.organizationId,
        business_id: this.context.businessId,
        actor_id: record.actorId,
        agent: record.agent,
        provider: record.provider,
        execution_source: record.executionSource ?? "mock",
        tool: proposal.tool,
        resource_type: def.capability.split(".")[0],
        resource_id: String(resource),
        proposal,
        proposal_fingerprint: record.fingerprint,
        reason: proposal.reason,
        confidence: proposal.confidence,
        created_at: record.requestedAt,
      });
    if (error?.code === "23505") return false;
    databaseError(error);
    return true;
  }
  async get(org: string, id: string): Promise<ActionRecord | null> {
    this.check(org);
    const client = await sessionClient();
    const { data, error } = await client
      .from("actions")
      .select("*,approvals(*)")
      .eq("business_id", this.context.businessId)
      .eq("organization_id", org)
      .eq("id", id)
      .maybeSingle();
    databaseError(error);
    if (!data) return null;
    const approval = Array.isArray(data.approvals)
      ? data.approvals[0]
      : data.approvals;
    return {
      id: data.id,
      organizationId: org,
      actorId: data.actor_id,
      agent: data.agent,
      provider: data.provider,
      executionSource: data.execution_source,
      proposal: parseProposal(data.proposal),
      fingerprint: data.proposal_fingerprint,
      requestedAt: data.created_at,
      receipt: data.receipt ?? undefined,
      approval: approval
        ? {
            id: approval.id,
            organizationId: org,
            actionId: id,
            fingerprint: approval.proposal_fingerprint,
            policyRevision: approval.policy_revision,
            expiresAt: approval.expires_at,
            approvedBy: approval.approved_by,
          }
        : undefined,
    };
  }
  async save(record: ActionRecord) {
    this.check(record.organizationId);
    const { error } = await persistenceClient().rpc("save_action", {
      org: record.organizationId,
      action: record.id,
      actor: this.context.actorId,
      fingerprint: record.fingerprint,
      receipt_data: record.receipt,
      approval_data: record.approval ?? null,
    });
    databaseError(error);
  }
  async claimApproval(
    org: string,
    action: string,
    approval: string,
    fingerprint: string,
    actor: string,
  ) {
    this.check(org);
    if (actor !== this.context.actorId)
      throw new BackendError("NOT_AUTHORIZED", "Actor mismatch.");
    const { data, error } = await persistenceClient().rpc("claim_approval", {
      org,
      action,
      approval,
      fingerprint,
      actor,
    });
    databaseError(error);
    return data === true;
  }
  async reject(approval: string) {
    const { data, error } = await persistenceClient().rpc("reject_approval", {
      org: this.context.organizationId,
      approval,
      actor: this.context.actorId,
    });
    databaseError(error);
    if (data !== true)
      throw new BackendError(
        "APPROVAL_EXPIRED",
        "Approval has expired or was already used.",
      );
  }
}
export class PostgresAuditRepository
  extends TenantRepository
  implements AuditRepository
{
  readonly persistence = "durable" as const;
  async append(event: AuditEvent) {
    this.check(event.organizationId);
    const { error } = await persistenceClient().from("audit_events").insert({
      id: event.id,
      organization_id: event.organizationId,
      action_id: event.actionId,
      actor_id: event.actorId,
      agent: event.agent,
      provider: event.provider,
      action_type: event.action,
      resource: event.resource,
      reason: event.reason,
      confidence: event.confidence,
      policy_decision: event.policyDecision,
      change_parameters: event.change,
      result: event.result,
      source: event.source,
      rollback_available: false,
      approved_by: event.approvedBy,
      requested_at: event.requestedAt,
      executed_at: event.executedAt,
    });
    databaseError(error);
  }
}
/** Verified active business and organization are applied before credentials are addressed. */
export class PostgresConnectionRepository
  extends TenantRepository
  implements ConnectionRepository
{
  async get(
    org: string,
    id: string,
  ): Promise<StoredIntegrationConnection | null> {
    this.check(org);
    const client = await sessionClient();
    const { data, error } = await client
      .from("integration_connections")
      .select(
        "id,organization_id,status,external_account_identifier,credential_reference,granted_capabilities,last_sync_at,connection_health",
      )
      .eq("organization_id", org)
      .eq("business_id", this.context.businessId)
      .eq("provider", "shopify")
      .eq("id", id)
      .maybeSingle();
    databaseError(error);
    if (!data || data.status !== "connected" || !data.credential_reference)
      return null;
    return {
      id: data.id,
      organizationId: org,
      integration: "shopify",
      status: "connected",
      shopDomain: data.external_account_identifier,
      credentialReference: data.credential_reference,
      grantedScopes: data.granted_capabilities,
      lastSyncAt: data.last_sync_at,
      health: data.connection_health === "CONNECTED" ? "healthy" : "attention",
    };
  }
}
