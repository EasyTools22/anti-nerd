import { ControlCenterPage } from "@/components/modules/control-center";
import { pageWorkspace } from "@/lib/server/auth/context";
import { PostgresPolicyRepository } from "@/lib/server/db/repositories";
import { PoliciesPanel } from "@/components/workspace/panels";
export default async function Page() {
  const context = await pageWorkspace();
  const policy = await new PostgresPolicyRepository(context).get(
    context.organizationId,
  );
  return (
    <>
      <PoliciesPanel policy={policy} owner={context.role === "owner"} />
      <ControlCenterPage />
    </>
  );
}
