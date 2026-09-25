import { Overview } from "@/components/dashboard/overview";
import { pageWorkspace } from "@/lib/server/auth/context";
import { DurableApprovals } from "@/components/workspace/approvals";
export default async function Home() {
  const context = await pageWorkspace();
  return <Overview approvals={<DurableApprovals context={context} />} />;
}
