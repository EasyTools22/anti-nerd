import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { sessionClient, databaseError } from "../db/client";
import { supabaseConfig } from "@/lib/supabase/config";
import { BackendError } from "../errors";
import type { ExecutionContext } from "../security/credentials";
export const workspaceCookie = "anti-nerd-workspace";
export const businessCookie = "anti-nerd-business";
export const verifiedUser = cache(async () => {
  if (!supabaseConfig()) return null;
  const client = await sessionClient();
  const { data, error } = await client.auth.getUser();
  if (
    error ||
    !data.user ||
    data.user.is_anonymous ||
    !data.user.email_confirmed_at
  )
    return null;
  return { id: data.user.id, email: data.user.email ?? "", client };
});
export async function requireUser() {
  const user = await verifiedUser();
  if (!user) throw new BackendError("NOT_AUTHENTICATED", "Please sign in.");
  return user;
}
export type WorkspaceContext = ExecutionContext & { businessId: string };
export async function resolveWorkspace(
  requestedOrg?: string,
  requestedBusiness?: string,
): Promise<WorkspaceContext | null> {
  const { id, client } = await requireUser();
  const jar = await cookies();
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (requestedOrg && !uuid.test(requestedOrg))
    throw new BackendError(
      "ORGANIZATION_NOT_FOUND",
      "Workspace is unavailable.",
    );
  const storedOrg = jar.get(workspaceCookie)?.value;
  const org =
    requestedOrg ?? (storedOrg && uuid.test(storedOrg) ? storedOrg : undefined);
  let query = client
    .from("organization_members")
    .select("organization_id,role")
    .eq("user_id", id)
    .order("created_at")
    .limit(1);
  if (org) query = query.eq("organization_id", org);
  const { data, error } = await query.maybeSingle();
  databaseError(error);
  if (!data) {
    if (requestedOrg)
      throw new BackendError(
        "ORGANIZATION_NOT_FOUND",
        "Workspace is unavailable.",
      );
    // A removed membership/stale cookie must not prevent using another valid workspace.
    if (org) return resolveFirstWorkspace();
    return null;
  }
  if (!["owner", "admin", "member", "viewer"].includes(data.role))
    throw new BackendError("NOT_AUTHORIZED", "Invalid membership.");
  const storedBusiness = jar.get(businessCookie)?.value;
  if (requestedBusiness && !uuid.test(requestedBusiness))
    throw new BackendError(
      "ORGANIZATION_NOT_FOUND",
      "Business is unavailable.",
    );
  const biz =
    requestedBusiness ??
    (org === data.organization_id && storedBusiness && uuid.test(storedBusiness)
      ? storedBusiness
      : undefined);
  let businesses = client
    .from("businesses")
    .select("id")
    .eq("organization_id", data.organization_id)
    .eq("status", "active")
    .order("created_at")
    .limit(1);
  if (biz) businesses = businesses.eq("id", biz);
  const result = await businesses.maybeSingle();
  databaseError(result.error);
  if (!result.data && requestedBusiness)
    throw new BackendError(
      "ORGANIZATION_NOT_FOUND",
      "Business is unavailable.",
    );
  if (!result.data && biz) return resolveWorkspace(data.organization_id, "");
  if (!result.data) return null;
  return {
    organizationId: data.organization_id,
    businessId: result.data.id,
    actorId: id,
    role: data.role,
    source: "live",
  };
}
async function resolveFirstWorkspace() {
  const { id, client } = await requireUser();
  const { data, error } = await client
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  databaseError(error);
  return data ? resolveWorkspace(data.organization_id, "") : null;
}
export async function requireWorkspace() {
  const context = await resolveWorkspace();
  if (!context)
    throw new BackendError(
      "ORGANIZATION_NOT_FOUND",
      "Create your workspace first.",
    );
  return context;
}
export async function pageWorkspace() {
  if (!(await verifiedUser())) redirect("/login");
  const context = await resolveWorkspace();
  if (!context) redirect("/onboarding");
  return context;
}
export async function selectWorkspace(org: string, business: string) {
  const context = await resolveWorkspace(org, business);
  if (!context)
    throw new BackendError(
      "ORGANIZATION_NOT_FOUND",
      "Workspace is unavailable.",
    );
  const jar = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
  jar.set(workspaceCookie, context.organizationId, options);
  jar.set(businessCookie, context.businessId, options);
}
