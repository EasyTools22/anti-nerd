"use client";
import type { ReadToolName, ToolOutputs } from "@/types/backend";
/** The result of one owner-approved read. It stays in this response, never localStorage. */
export function ApprovedReadResult({
  data,
}: {
  data: ToolOutputs[ReadToolName];
}) {
  if (data === null) return <p>This item was not found.</p>;
  const rows = "nodes" in data ? data.nodes : [data];
  const labels: Record<string, string> = {
    id: "Shopify ID",
    name: "Name",
    title: "Product",
    domain: "Store address",
    currencyCode: "Currency",
    status: "Status",
    updatedAt: "Updated",
    createdAt: "Date",
    displayFinancialStatus: "Payment",
    numberOfOrders: "Orders",
    sku: "SKU",
    tracked: "Tracking",
    totalPriceSet: "Total",
  };
  return (
    <div aria-label="Approved store information">
      {rows.length === 0 ? (
        <p>No items on this page.</p>
      ) : (
        rows.map((row, index) => (
          <dl className="trust-grid" key={index}>
            {Object.entries(row).map(([key, value]) => (
              <div key={key}>
                <dt>{labels[key] ?? key}</dt>
                <dd>
                  {key === "totalPriceSet" &&
                  typeof value === "object" &&
                  value &&
                  "shopMoney" in value
                    ? `${value.shopMoney.amount} ${value.shopMoney.currencyCode}`
                    : typeof value === "boolean"
                      ? value
                        ? "Tracked"
                        : "Not tracked"
                      : String(value ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
        ))
      )}
      {"pageInfo" in data && data.pageInfo.hasNextPage && (
        <p className="muted">
          More items are available. This approval covered this page only.
        </p>
      )}
    </div>
  );
}
