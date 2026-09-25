import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type {
  ActionProposal,
  ActionReceipt,
  AgentId,
  PolicyDecision,
  ProviderId,
  ReadToolCall,
} from "@/types/backend";
import { toolCatalog } from "@/lib/backend/tool-catalog";
import type { ExecutionContext } from "@/lib/server/security/credentials";
import type { IntegrationAdapter } from "@/lib/server/integrations/adapter";
import type {
  ActionRecord,
  ActionRepository,
  AuditRepository,
  PolicyRepository,
} from "./stores";
import { evaluatePolicy } from "@/lib/server/policy/engine";
import { parseProposal } from "@/lib/server/validation";
import { BackendError } from "@/lib/server/errors";
function fingerprint(proposal: ActionProposal) {
  return createHash("sha256").update(JSON.stringify(proposal)).digest("hex");
}
export class ActionEngine {
  constructor(
    private adapter: IntegrationAdapter,
    private policies: PolicyRepository,
    private actions: ActionRepository,
    private audit: AuditRepository,
    private now: () => Date = () => new Date(),
  ) {}
  private checkContext(context: ExecutionContext) {
    if (
      !context.organizationId ||
      !context.actorId ||
      !["owner", "admin", "member", "viewer"].includes(context.role) ||
      context.organizationId !== this.adapter.organizationId ||
      context.source !== this.adapter.source
    )
      throw new BackendError(
        "TENANT_MISMATCH",
        "The execution context does not match the integration.",
      );
    if (
      context.source === "live" &&
      (this.audit.persistence !== "durable" ||
        this.actions.persistence !== "durable")
    )
      throw new BackendError(
        "STORAGE_REQUIRED",
        "Live operations require durable action and audit storage.",
      );
  }
  async propose(
    context: ExecutionContext,
    raw: unknown,
    attribution: { agent: AgentId; provider: ProviderId },
    actionId = randomUUID(),
  ): Promise<ActionReceipt> {
    this.checkContext(context);
    const proposal = parseProposal(raw);
    const record: ActionRecord = {
      executionSource: context.source,
      id: actionId,
      organizationId: context.organizationId,
      actorId: context.actorId,
      ...attribution,
      proposal,
      fingerprint: fingerprint(proposal),
      requestedAt: this.now().toISOString(),
    };
    if (!(await this.actions.create(record))) {
      const existing = await this.actions.get(context.organizationId, actionId);
      if (
        !existing ||
        existing.fingerprint !== record.fingerprint ||
        existing.agent !== record.agent ||
        existing.provider !== record.provider ||
        (existing.executionSource ?? "mock") !== context.source ||
        existing.actorId !== context.actorId
      )
        throw new BackendError(
          "IDEMPOTENCY_CONFLICT",
          "This action ID already belongs to another request.",
        );
      if (!existing.receipt)
        throw new BackendError(
          "ACTION_IN_PROGRESS",
          "This action is already being evaluated.",
        );
      return existing.receipt;
    }
    const decision = evaluatePolicy(
      context,
      proposal,
      await this.policies.get(context.organizationId),
    );
    if (decision.outcome === "DENY")
      return this.record(record, decision, "denied");
    if (decision.outcome === "REQUIRE_APPROVAL") {
      record.approval = {
        id: randomUUID(),
        organizationId: context.organizationId,
        actionId,
        fingerprint: record.fingerprint,
        policyRevision: decision.policyRevision,
        expiresAt: new Date(this.now().getTime() + 15 * 60_000).toISOString(),
        approvedBy: null,
      };
      return this.record(record, decision, "awaiting_approval");
    }
    return this.execute(record, decision);
  }
  async approve(
    context: ExecutionContext,
    actionId: string,
    approvalId: string,
  ): Promise<ActionReceipt> {
    this.checkContext(context);
    if (context.role !== "owner")
      throw new BackendError(
        "OWNER_REQUIRED",
        "Only a verified owner can approve.",
      );
    const record = await this.actions.get(context.organizationId, actionId);
    if (
      !record?.approval ||
      (record.executionSource ?? "mock") !== context.source ||
      record.approval.id !== approvalId ||
      record.fingerprint !== fingerprint(record.proposal)
    )
      throw new BackendError(
        "APPROVAL_MISMATCH",
        "Approval does not match this action.",
      );
    const decision = evaluatePolicy(
      context,
      record.proposal,
      await this.policies.get(context.organizationId),
    );
    if (
      decision.outcome === "DENY" ||
      decision.policyRevision !== record.approval.policyRevision
    )
      throw new BackendError(
        "POLICY_CHANGED",
        "The policy changed. Request a fresh review.",
      );
    if (
      !(await this.actions.claimApproval(
        context.organizationId,
        actionId,
        approvalId,
        record.fingerprint,
        context.actorId,
        this.now().toISOString(),
      ))
    )
      throw new BackendError(
        "APPROVAL_EXPIRED",
        "Approval has expired or was already used.",
      );
    record.approval.approvedBy = context.actorId;
    return this.execute(record, {
      ...decision,
      outcome: "ALLOW",
      reason: "Owner approved this exact action under the current policy.",
    });
  }
  private async record(
    record: ActionRecord,
    decision: PolicyDecision,
    status: ActionReceipt["status"],
    data?: ActionReceipt["data"],
  ): Promise<ActionReceipt> {
    const def = toolCatalog[record.proposal.tool];
    const input = record.proposal.input;
    const resource =
      "productId" in input
        ? input.productId
        : "orderId" in input
          ? input.orderId
          : "inventoryItemId" in input
            ? input.inventoryItemId
            : "changeId" in input
              ? input.changeId
              : "store";
    await this.audit.append({
      id: randomUUID(),
      actionId: record.id,
      organizationId: record.organizationId,
      actorId: record.actorId,
      agent: record.agent,
      provider: record.provider,
      action: def.actionType,
      resource,
      reason: record.proposal.reason,
      confidence: record.proposal.confidence,
      policyDecision: decision,
      requestedAt: record.requestedAt,
      approvedBy: record.approval?.approvedBy ?? null,
      executedAt: ["succeeded", "failed"].includes(status)
        ? this.now().toISOString()
        : null,
      result: status,
      rollbackAvailable: false,
      source: this.adapter.source,
      change: {
        tool: record.proposal.tool,
        input: record.proposal.input,
      } as typeof record.proposal,
    });
    const receipt: ActionReceipt = {
      actionId: record.id,
      status,
      decision,
      ...(record.approval ? { approvalId: record.approval.id } : {}),
      ...(data === undefined ? {} : { data }),
    };
    record.receipt = receipt;
    await this.actions.save(record);
    return receipt;
  }
  private async execute(record: ActionRecord, decision: PolicyDecision) {
    const def = toolCatalog[record.proposal.tool];
    // No writes, refunds or publishing path exists, even for approved actions.
    if (!def.implemented || def.impact !== "read")
      return this.record(record, decision, "not_implemented");
    if (!this.adapter.capabilities.includes(def.capability))
      return this.record(
        record,
        {
          ...decision,
          outcome: "DENY",
          reason: "The adapter does not expose this capability.",
        },
        "denied",
      );
    // A failed pre-execution audit prevents even a read from reaching the integration.
    await this.record(record, decision, "started");
    let data: ActionReceipt["data"];
    try {
      data = await this.adapter.executeRead({
        tool: record.proposal.tool,
        input: record.proposal.input,
      } as ReadToolCall);
    } catch {
      return this.record(record, decision, "failed");
    }
    return this.record(record, decision, "succeeded", data);
  }
}
