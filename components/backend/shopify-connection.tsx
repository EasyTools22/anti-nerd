"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ShopifySummary } from "@/types/shopify";
import { Badge, Card, Modal } from "@/components/ui/primitives";
const healthLabels = {
  CONNECTED: "Connected",
  NEEDS_REAUTHORIZATION: "Reconnect to continue",
  MISSING_SCOPE: "Some information is limited",
  TOKEN_REFRESH_FAILED: "Reconnect to restore access",
  DISCONNECTED: "Not connected",
  ERROR: "Connection needs attention",
};
export function ShopifyConnection({
  connection: c,
}: {
  connection: ShopifySummary;
}) {
  const [open, setOpen] = useState<"connect" | "disconnect" | null>(null),
    [domain, setDomain] = useState(c.domain ?? ""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function submit(operation: "connect" | "disconnect") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/integrations/shopify/${operation}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          operation === "connect"
            ? { shop: domain }
            : { confirm: "disconnect" },
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(
          data.message ?? "Connection is unavailable. Please try again.",
        );
        return;
      }
      if (operation === "connect") {
        window.location.assign(data.url);
      } else {
        setOpen(null);
        router.refresh();
      }
    } catch {
      setMessage("Could not reach the connection service. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Card>
        <div className="product-info">
          <div className="detail-row">
            <span className="integration-logo">S</span>
            <Badge tone={c.connected ? "green" : "gray"}>
              {healthLabels[c.health]}
            </Badge>
          </div>
          <h3>Shopify</h3>
          <p className="integration-description">
            Your store, clearly in view.
          </p>
          {c.domain && <p className="shopify-domain">{c.domain}</p>}
          {c.connected && (
            <>
              <p className="muted">
                Products {c.features.products ? "✓" : "Limited"} · Orders{" "}
                {c.features.orders ? "✓" : "Limited"}
                <br />
                Customers {c.features.customers
                  ? "Limited details"
                  : "Limited"}{" "}
                · Inventory {c.features.inventory ? "✓" : "Limited"}
              </p>
              <small>
                Last checked{" "}
                {c.verifiedAt
                  ? new Date(c.verifiedAt).toLocaleString("en-GB")
                  : "Not yet"}
              </small>
              <Link className="button secondary" href="/store">
                View store
              </Link>
            </>
          )}
          {!c.available && (
            <p role="status">
              Connection information is unavailable. Please try again later.
            </p>
          )}
          {!c.configured && (
            <p className="muted">
              Shopify setup is pending. Your administrator needs to finish the
              connection setup.
            </p>
          )}
          <div className="detail-row">
            <button
              className="button"
              disabled={!c.owner || !c.configured || !c.available}
              onClick={() => {
                setMessage("");
                setOpen("connect");
              }}
            >
              {c.linked ? "Reconnect Shopify" : "Connect Shopify"}
            </button>
            {c.linked && c.health !== "DISCONNECTED" && c.owner && (
              <button
                className="button secondary"
                onClick={() => {
                  setMessage("");
                  setOpen("disconnect");
                }}
              >
                Disconnect
              </button>
            )}
          </div>
          {!c.owner && (
            <small>A workspace owner can manage this connection.</small>
          )}
          <small>Read only · Store changes are unavailable</small>
        </div>
      </Card>
      {open === "connect" && (
        <Modal
          title={c.linked ? "Reconnect Shopify" : "Connect Shopify"}
          onClose={() => !busy && setOpen(null)}
        >
          <p>
            Bring your products, orders and store information into Anti-Nerd.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit("connect");
            }}
            className="shopify-form"
          >
            <label htmlFor="shop-domain">Your Shopify store</label>
            <input
              id="shop-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="mystore.myshopify.com"
              autoComplete="off"
              required
              maxLength={80}
              readOnly={!!c.domain}
            />
            <p className="muted">
              You’ll continue to Shopify to approve access. Store changes are
              unavailable.
            </p>
            <button className="button" disabled={busy}>
              {busy ? "Opening Shopify…" : "Continue to Shopify"}
            </button>
          </form>
          {message && <p role="alert">{message}</p>}
        </Modal>
      )}
      {open === "disconnect" && (
        <Modal
          title="Disconnect Shopify?"
          onClose={() => !busy && setOpen(null)}
        >
          <p>
            Anti-Nerd will stop accessing this store and remove its saved
            connection credentials. Your activity history stays in your
            workspace.
          </p>
          <p className="muted">
            You can also uninstall Anti-Nerd in Shopify to remove its permission
            there.
          </p>
          <div className="detail-row">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setOpen(null)}
            >
              Keep connected
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => void submit("disconnect")}
            >
              {busy ? "Disconnecting…" : "Confirm disconnect"}
            </button>
          </div>
          {message && <p role="alert">{message}</p>}
        </Modal>
      )}
    </>
  );
}
