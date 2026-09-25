export const dynamic = "force-dynamic";
import { AppShell } from "@/components/layout/app-shell";
import { IdentityProvider } from "@/components/workspace/identity-provider";
import { pageWorkspace } from "@/lib/server/auth/context";
import { WorkspaceRepository } from "@/lib/server/db/workspace";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await pageWorkspace();
  const identity = await new WorkspaceRepository(context).identity();
  return (
    <IdentityProvider
      key={`${context.organizationId}:${context.businessId}`}
      identity={identity}
    >
      <AppShell>{children}</AppShell>
    </IdentityProvider>
  );
}
