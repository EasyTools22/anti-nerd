import "server-only";
import Link from "next/link";
import type { ReactNode } from "react";
import { pageWorkspace } from "@/lib/server/auth/context";
import { shopifySummary } from "@/lib/server/shopify/summary";
import { liveShopify } from "@/lib/server/shopify/service";
import { Badge, Card, PageHeading } from "@/components/ui/primitives";
import type { ReadToolCall, ToolOutputs } from "@/types/backend";
import { rateLimiter } from "@/lib/server/security/rate-limit";
type View = "store" | "products" | "orders" | "customers" | "inventory";
const titles = {
  store: "Store",
  products: "Products",
  orders: "Orders",
  customers: "Customers",
  inventory: "Inventory",
};
const tools = {
  store: "getStore",
  products: "listProducts",
  orders: "listOrders",
  customers: "listCustomers",
  inventory: "getInventory",
} as const;
function date(value: string | null) {
  return value
    ? new Date(value).toLocaleString("en-GB", { timeZone: "UTC" })
    : "Not yet";
}
export async function ShopifyCommercePage({
  view,
  after,
  demo,
}: {
  view: View;
  after?: string;
  demo?: ReactNode;
}) {
  const context = await pageWorkspace(),
    summary = await shopifySummary(context);
  if (summary.available && !summary.linked)
    return (
      <>
        <div className="shopify-mode">
          <Badge tone="amber">Demo mode</Badge>
          <span>Connect Shopify to see your own store.</span>
          <Link
            prefetch={false}
            href="/integrations"
            className="button secondary"
          >
            Connect Shopify
          </Link>
        </div>
        {demo ?? (
          <>
            <PageHeading
              title="Inventory"
              description="Your inventory items, in one place."
            />
            <Card>
              <p>Connect Shopify to view tracked items and SKUs.</p>
            </Card>
          </>
        )}
      </>
    );
  let data: ToolOutputs[keyof ToolOutputs] | undefined,
    problem = "",
    receiptStatus = "";
  if (summary.available && summary.connected) {
    try {
      await rateLimiter.consume("mutation", context.actorId);
      const call: ReadToolCall =
        view === "store"
          ? { tool: "getStore", input: {} }
          : ({
              tool: tools[view],
              input: { first: 20, ...(after ? { after } : {}) },
            } as ReadToolCall);
      const result = await (await liveShopify(context)).read(call);
      receiptStatus = result.receipt.status;
      if (receiptStatus === "succeeded") data = result.receipt.data;
      else problem = result.errorCode ?? receiptStatus;
    } catch {
      problem = "unavailable";
    }
  } else problem = "not_connected";
  const nav = (
    <nav aria-label="Store information" className="shopify-nav">
      {Object.entries(titles).map(([path, title]) => (
        <Link
          prefetch={false}
          key={path}
          aria-current={view === path ? "page" : undefined}
          href={`/${path}`}
        >
          {title}
        </Link>
      ))}
    </nav>
  );
  let headings: string[] = [],
    rows: (string | number)[][] = [],
    pagination: { hasNextPage: boolean; endCursor: string | null } | undefined;
  if (data && "nodes" in data) {
    pagination = data.pageInfo;
    if (view === "products") {
      headings = ["Product", "Status", "Updated (UTC)", "Shopify ID"];
      rows = (data as ToolOutputs["listProducts"]).nodes.map((n) => [
        n.title,
        n.status,
        date(n.updatedAt),
        n.id.split("/").at(-1) ?? n.id,
      ]);
    }
    if (view === "orders") {
      headings = ["Order", "Date (UTC)", "Payment", "Total", "Currency"];
      rows = (data as ToolOutputs["listOrders"]).nodes.map((n) => [
        n.name,
        date(n.createdAt),
        n.displayFinancialStatus,
        n.totalPriceSet.shopMoney.amount,
        n.totalPriceSet.shopMoney.currencyCode,
      ]);
    }
    if (view === "customers") {
      headings = ["Customer ID", "Orders"];
      rows = (data as ToolOutputs["listCustomers"]).nodes.map((n) => [
        n.id.split("/").at(-1) ?? n.id,
        n.numberOfOrders,
      ]);
    }
    if (view === "inventory") {
      headings = ["Item ID", "SKU", "Tracking"];
      rows = (data as ToolOutputs["getInventory"]).nodes.map((n) => [
        n.id.split("/").at(-1) ?? n.id,
        n.sku || "—",
        n.tracked ? "Tracked" : "Not tracked",
      ]);
    }
  }
  return (
    <>
      <PageHeading
        title={titles[view]}
        description={summary.domain ?? "Your Shopify store"}
      >
        <Badge tone={summary.connected ? "green" : "amber"}>
          {summary.connected
            ? "Connected data · Read only"
            : "Connection needs attention"}
        </Badge>
      </PageHeading>
      {nav}
      {view === "customers" && (
        <p className="insight">
          Some customer details aren’t available with the current Shopify
          permissions. This view only requests customer identifiers and order
          counts.
        </p>
      )}
      {view === "inventory" && (
        <p className="insight">
          Inventory items and tracking are available here. Quantities by
          location are not available yet.
        </p>
      )}
      {view === "orders" && (
        <p className="muted">
          Orders are limited to the history Shopify permits for this connection.
        </p>
      )}
      {problem ? (
        <Card
          title={
            receiptStatus === "awaiting_approval"
              ? "Owner approval needed"
              : problem === "SCOPE_REQUIRED"
                ? "Some information is unavailable"
                : "Store information is unavailable"
          }
        >
          <p>
            {receiptStatus === "awaiting_approval"
              ? "Your workspace rules require approval before reading this information."
              : receiptStatus === "denied"
                ? "Your workspace rules do not allow this read."
                : problem === "SCOPE_REQUIRED"
                  ? "Your Shopify permissions don’t allow this information yet. Your other store information is still available."
                  : "Check your connection or try again shortly. No example data is being shown for this store."}
          </p>
          <Link
            prefetch={false}
            className="button secondary"
            href={
              receiptStatus === "awaiting_approval"
                ? "/activity"
                : "/integrations"
            }
          >
            {receiptStatus === "awaiting_approval"
              ? "View approvals"
              : "Manage connection"}
          </Link>
        </Card>
      ) : view === "store" && data && "domain" in data ? (
        <Card title={data.name}>
          <dl className="trust-grid">
            <div>
              <dt>Store address</dt>
              <dd>{data.domain}</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>{data.currencyCode}</dd>
            </div>
            <div>
              <dt>Connection</dt>
              <dd>
                {summary.health === "CONNECTED"
                  ? "Connected"
                  : summary.health === "MISSING_SCOPE"
                    ? "Some information is limited"
                    : "Needs attention"}
              </dd>
            </div>
            <div>
              <dt>Last verified (UTC)</dt>
              <dd>{date(summary.verifiedAt)}</dd>
            </div>
            <div>
              <dt>Last successful read (UTC)</dt>
              <dd>{date(new Date().toISOString())}</dd>
            </div>
          </dl>
        </Card>
      ) : (
        <Card>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {headings.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <p className="empty-copy">
              No {titles[view].toLowerCase()} on this page.
            </p>
          )}
          <div className="shopify-pagination">
            <span className="muted">
              {rows.length} items · Up to 20 per page
            </span>
            {after && (
              <Link
                prefetch={false}
                className="button secondary"
                href={`/${view}`}
              >
                First page
              </Link>
            )}
            {pagination?.hasNextPage && pagination.endCursor && (
              <Link
                prefetch={false}
                className="button"
                href={`/${view}?after=${encodeURIComponent(pagination.endCursor)}`}
              >
                Next page
              </Link>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
