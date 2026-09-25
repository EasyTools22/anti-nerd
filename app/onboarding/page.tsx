export const dynamic = "force-dynamic";
import { WorkspaceOnboarding } from "@/components/workspace/onboarding";
import { verifiedUser, resolveWorkspace } from "@/lib/server/auth/context";
import { redirect } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  if (!(await verifiedUser())) redirect("/login");
  if ((await searchParams).new !== "1" && (await resolveWorkspace()))
    redirect("/");
  return <WorkspaceOnboarding />;
}
