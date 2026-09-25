import { pageWorkspace } from "@/lib/server/auth/context";
import { WorkspaceRepository } from "@/lib/server/db/workspace";
import { MetadataPanel } from "@/components/workspace/panels";
import { IntegrationsPage } from "@/components/modules/integrations";
import { shopifySummary } from "@/lib/server/shopify/summary";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ shopify?: string }>;
}) {
  const context = await pageWorkspace();
  const result = (await searchParams).shopify;
  const shopify = await shopifySummary(context);
  const connections = await new WorkspaceRepository(context).connections();
  return (
    <>
      {result === "connected" && (
        <p className="insight" role="status">
          Shopify is connected. Your store information is ready.
        </p>
      )}
      {result === "failed" && (
        <p className="insight" role="alert">
          This Shopify connection attempt could not be completed or has expired.
          Choose Retry Shopify connection below. An existing store stays active
          until a replacement is verified.
        </p>
      )}
      <IntegrationsPage shopify={shopify} retryShopify={result === "failed"} />
      <MetadataPanel connections={connections} />
    </>
  );
}
