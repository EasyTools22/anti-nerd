import "server-only";
import { sessionClient, databaseError } from "./client";
import { requireUser, type WorkspaceContext } from "../auth/context";
import type { WorkspaceIdentity } from "@/types/workspace";
export class WorkspaceRepository {
  constructor(private context: WorkspaceContext) {}
  async identity(): Promise<WorkspaceIdentity> {
    const { client, id, email } = await requireUser();
    const results = await Promise.all([
      client.from("organizations").select("id,name").order("created_at"),
      client
        .from("businesses")
        .select("id,organization_id,name,business_type,currency,timezone")
        .eq("status", "active")
        .order("created_at"),
      client.from("profiles").select("display_name").eq("id", id).maybeSingle(),
      client
        .from("integration_connections")
        .select("organization_id,business_id,status,connection_health")
        .eq("provider", "shopify"),
    ]);
    results.forEach((result) => databaseError(result.error));
    return {
      commerceConnections: results[3].data ?? [],
      actorLabel: results[2].data?.display_name || email,
      role: this.context.role,
      organizationId: this.context.organizationId,
      businessId: this.context.businessId,
      organizations: results[0].data ?? [],
      businesses: results[1].data ?? [],
    };
  }
  async instructions() {
    const client = await sessionClient();
    const { data, error } = await client
      .from("business_instructions")
      .select("id,business_id,instruction,priority,active")
      .eq("organization_id", this.context.organizationId)
      .or(`business_id.is.null,business_id.eq.${this.context.businessId}`)
      .order("priority", { ascending: false })
      .limit(100);
    databaseError(error);
    return data ?? [];
  }
  async connections() {
    const client = await sessionClient();
    const [integrations, providers] = await Promise.all([
      client
        .from("integration_connections")
        .select("id,provider,display_name,status,last_sync_at")
        .eq("organization_id", this.context.organizationId)
        .eq("business_id", this.context.businessId),
      client
        .from("provider_connections")
        .select("id,provider,status")
        .eq("organization_id", this.context.organizationId),
    ]);
    databaseError(integrations.error);
    databaseError(providers.error);
    return {
      integrations: integrations.data ?? [],
      providers: providers.data ?? [],
    };
  }
  async pendingApprovals() {
    const client = await sessionClient();
    const { data, error } = await client
      .from("approvals")
      .select(
        "id,action_id,expires_at,policy_revision,actions!inner(tool,reason,status,proposal,execution_source,business_id)",
      )
      .eq("organization_id", this.context.organizationId)
      .eq("actions.business_id", this.context.businessId)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    databaseError(error);
    return (data ?? []).map((row) => ({
      ...row,
      expired: Date.parse(row.expires_at) <= Date.now(),
    }));
  }
  async audit(before?: string, lastId?: string) {
    const client = await sessionClient();
    let query = client
      .from("audit_events")
      .select(
        "id,action_type,resource,reason,result,source,created_at,actor_id",
      )
      .eq("organization_id", this.context.organizationId)
      .order("created_at", { ascending: false })
      .limit(50);
    query = query.order("id", { ascending: false });
    if (before && lastId)
      query = query.or(
        `created_at.lt.${before},and(created_at.eq.${before},id.lt.${lastId})`,
      );
    const { data, error } = await query;
    databaseError(error);
    return data ?? [];
  }
}
