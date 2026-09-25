import { SettingsPage } from "@/components/modules/settings";
import { getBackendStatus } from "@/lib/server/foundation";
import { pageWorkspace } from "@/lib/server/auth/context";
import { WorkspaceRepository } from "@/lib/server/db/workspace";
import {
  InstructionsPanel,
  PoliciesPanel,
  MetadataPanel,
} from "@/components/workspace/panels";
import { PostgresPolicyRepository } from "@/lib/server/db/repositories";
export default async function Page() {
  const context = await pageWorkspace(),
    repo = new WorkspaceRepository(context);
  const [instructions, connections, policy] = await Promise.all([
    repo.instructions(),
    repo.connections(),
    new PostgresPolicyRepository(context).get(context.organizationId),
  ]);
  return (
    <SettingsPage
      backendStatus={getBackendStatus()}
      instructions={
        <InstructionsPanel
          items={instructions}
          canEdit={context.role !== "viewer"}
        />
      }
      policies={
        <PoliciesPanel policy={policy} owner={context.role === "owner"} />
      }
      connections={<MetadataPanel connections={connections} />}
    />
  );
}
