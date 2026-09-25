"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ShopifySummary } from "@/types/shopify";
import { Badge, Card, Modal } from "@/components/ui/primitives";
const healthLabels = {
  CONNECTED: "Healthy",
  NEEDS_REAUTHORIZATION: "Shopify needs to reconnect.",
  MISSING_SCOPE: "Some permissions are missing. Reconnect Shopify.",
  TOKEN_REFRESH_FAILED: "Shopify needs to reconnect.",
  DISCONNECTED: "Not connected",
  ERROR: "Connection needs attention",
};
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC"
    : "Not yet";
export function ShopifyConnection({
  connection: c,
  retry = false,
}: {
  connection: ShopifySummary;
  retry?: boolean;
}) {
  const [open, setOpen] = useState<
    "manage" | "connect" | "replace" | "confirm-replace" | "disconnect" | null
  >(null);
  const [domain, setDomain] = useState(c.domain ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const [expiredPending, setExpiredPending] = useState<string | null>(() =>
    c.pendingExpiresAt && Date.parse(c.pendingExpiresAt) <= Date.now()
      ? c.pendingExpiresAt
      : null,
  );
  useEffect(() => {
    if (!c.pendingExpiresAt) return;
    const timer = setTimeout(
      () => {
        setExpiredPending(c.pendingExpiresAt);
        router.refresh();
      },
      Math.max(0, Date.parse(c.pendingExpiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [c.pendingExpiresAt, router]);
  const pending =
    c.pendingDomain &&
    c.pendingExpiresAt &&
    expiredPending !== c.pendingExpiresAt;
  const canManage = c.owner && c.available;
  const canConnect = canManage && c.configured;
  function show(mode: typeof open) {
    setMessage("");
    setDomain(mode === "replace" ? "" : (c.domain ?? ""));
    setOpen(mode);
  }
  async function submit(operation: "connect" | "disconnect") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/integrations/shopify/${operation}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: c.organizationId,
          businessId: c.businessId,
          generation: c.generation,
          ...(operation === "connect"
            ? {
                shop: domain.trim().toLowerCase(),
                replace: open === "confirm-replace",
              }
            : { confirm: "disconnect" }),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(
          data.message ??
            "Connection is unavailable. Refresh this page and try again.",
        );
        return;
      }
      if (operation === "connect") window.location.assign(data.url);
      else {
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
              {c.connected
                ? "Connected"
                : c.linked
                  ? "Needs attention"
                  : "Not connected"}
            </Badge>
          </div>
          <h3>Shopify</h3>
          <p className="integration-description">
            Your store, clearly in view.
          </p>
          {c.domain && <p className="shopify-domain">Store: {c.domain}</p>}
          <p>Connection health: {healthLabels[c.health]}</p>
          <small>Last checked: {date(c.verifiedAt)}</small>
          {pending && (
            <p role="status">
              Connecting new store… {c.pendingDomain}.{" "}
              {c.connected && "Current store remains active until complete."}
            </p>
          )}
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
              <Link className="button secondary" href="/store" prefetch={false}>
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
            {c.linked && (
              <button
                className="button secondary"
                disabled={!c.available}
                onClick={() => show("manage")}
              >
                Manage connection
              </button>
            )}
            <button
              className="button"
              disabled={!canConnect}
              onClick={() => show("connect")}
            >
              {retry
                ? "Retry Shopify connection"
                : c.linked
                  ? "Reconnect Shopify"
                  : "Connect Shopify"}
            </button>
            {c.connected && (
              <button
                className="button secondary"
                disabled={!canManage}
                onClick={() => show("disconnect")}
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
      {open === "manage" && (
        <Modal title="Manage Shopify connection" onClose={() => setOpen(null)}>
          <dl className="trust-grid">
            <div>
              <dt>Store</dt>
              <dd>
                {c.name}
                <br />
                {c.domain}
              </dd>
            </div>
            <div>
              <dt>Granted permissions</dt>
              <dd>{c.permissions.join(", ") || "None"}</dd>
            </div>
            <div>
              <dt>Connection health</dt>
              <dd>{healthLabels[c.health]}</dd>
            </div>
            <div>
              <dt>Last sync</dt>
              <dd>{date(c.syncedAt)}</dd>
            </div>
            <div>
              <dt>Connected date</dt>
              <dd>{date(c.connectedAt)}</dd>
            </div>
          </dl>
          <div className="detail-row">
            <button
              className="button"
              disabled={!canConnect}
              onClick={() => show("replace")}
            >
              Connect a different store
            </button>
            <button className="button secondary" onClick={() => setOpen(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}
      {(open === "connect" || open === "replace") && (
        <Modal
          title={
            open === "replace"
              ? "Connect a different store"
              : c.linked
                ? "Reconnect Shopify"
                : "Connect Shopify"
          }
          onClose={() => !busy && setOpen(null)}
        >
          <form
            className="shopify-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (open === "replace") {
                setDomain(domain.trim().toLowerCase());
                setOpen("confirm-replace");
              } else void submit("connect");
            }}
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
              pattern="[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com"
              readOnly={open === "connect" && !!c.domain}
            />
            <p className="muted">
              You’ll continue to Shopify to approve read-only access.
            </p>
            <div className="detail-row">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setOpen(null)}
              >
                Cancel
              </button>
              <button
                className="button"
                disabled={
                  busy ||
                  (open === "replace" &&
                    domain.trim().toLowerCase() === c.domain)
                }
              >
                {busy
                  ? "Opening Shopify…"
                  : open === "replace"
                    ? "Review change"
                    : "Continue to Shopify"}
              </button>
            </div>
          </form>
          {message && <p role="alert">{message}</p>}
        </Modal>
      )}
      {open === "confirm-replace" && (
        <Modal
          title="Change the Shopify store for this business?"
          onClose={() => !busy && setOpen(null)}
        >
          <p>Current: {c.domain}</p>
          <p>New: {domain}</p>
          <p>
            Products, orders and customers shown in Anti-Nerd will switch to the
            new store. Historical Anti-Nerd audit records will remain.
          </p>
          <p>
            Your current connection stays active until the new store is
            successfully connected and verified.
          </p>
          <div className="detail-row">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setOpen(null)}
            >
              Cancel
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => void submit("connect")}
            >
              {busy ? "Connecting new store…" : "Continue"}
            </button>
          </div>
          {message && <p role="alert">{message}</p>}
        </Modal>
      )}
      {open === "disconnect" && (
        <Modal
          title="Disconnect Shopify?"
          onClose={() => !busy && setOpen(null)}
        >
          <p>
            Anti-Nerd will stop reading new data from this store and delete its
            saved connection credentials.
          </p>
          <p>
            Your Anti-Nerd account, Business Brain history, audit history and
            business settings will remain.
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
              Cancel
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => void submit("disconnect")}
            >
              {busy ? "Disconnecting…" : "Disconnect Shopify"}
            </button>
          </div>
          {message && <p role="alert">{message}</p>}
        </Modal>
      )}
    </>
  );
}
