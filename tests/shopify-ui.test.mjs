import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const native = createRequire(import.meta.url),
  cache = new Map();
let summary,
  readResult,
  modalMode = null;
const defaults = {
  organizationId: "fixture-org",
  businessId: "fixture-business",
  generation: 1,
  permissions: ["read_products", "read_orders"],
  connectedAt: "2026-09-25T00:00:00Z",
  pendingDomain: null,
  configured: true,
  available: true,
  owner: true,
  linked: true,
  connected: true,
  name: "Real store",
  domain: "fixture.myshopify.com",
  health: "CONNECTED",
  verifiedAt: null,
  syncedAt: null,
  currency: "EUR",
  features: { products: true, orders: true, customers: false, inventory: true },
};
const mocks = {
  "next/link": ({ children, ...props }) => {
    delete props.prefetch;
    return React.createElement("a", props, children);
  },
  "next/navigation": { useRouter: () => ({ refresh() {} }) },
  "@/lib/server/auth/context": {
    pageWorkspace: async () => ({ actorId: "fixture" }),
  },
  "@/lib/server/shopify/summary": { shopifySummary: async () => summary },
  "@/lib/server/shopify/service": {
    liveShopify: async () => ({ read: async () => readResult }),
  },
  "@/lib/server/security/rate-limit": {
    rateLimiter: { consume: async () => {} },
  },
};
function load(file) {
  const filename = path.resolve(file);
  if (cache.has(filename)) return cache.get(filename);
  const compiled = { exports: {} };
  new Function(
    "require",
    "module",
    "exports",
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
  )(
    (id) => {
      if (id === "server-only") return {};
      if (id === "react" && filename.endsWith("shopify-connection.tsx"))
        return {
          ...React,
          useState: (initial) =>
            React.useState(initial === null ? modalMode : initial),
        };
      if (id in mocks) return mocks[id];
      if (!id.startsWith("@/") && !id.startsWith(".")) return native(id);
      const base = id.startsWith("@/")
        ? id.slice(2)
        : path.resolve(path.dirname(filename), id);
      return load(
        [".ts", ".tsx"].map((e) => base + e).find((f) => fs.existsSync(f)),
      );
    },
    compiled,
    compiled.exports,
  );
  cache.set(filename, compiled.exports);
  return compiled.exports;
}
const { ShopifyCommercePage } = load("components/shopify/commerce-page.tsx"),
  { ShopifyConnection } = load("components/backend/shopify-connection.tsx");
async function page(view, data, errorCode, status = "succeeded", after) {
  summary = { ...defaults };
  readResult = { receipt: { status, data }, errorCode };
  return renderToStaticMarkup(
    await ShopifyCommercePage({
      view,
      after,
      demo: React.createElement("p", null, "DEMO_SENTINEL"),
    }),
  );
}
test("connected product table renders real DTOs and explicit bounded cursor link; no demo fallback", async () => {
  const html = await page("products", {
    nodes: [
      {
        id: "gid://shopify/Product/42",
        title: "Real title",
        status: "ACTIVE",
        updatedAt: "2026-09-01T12:00:00Z",
      },
    ],
    pageInfo: { hasNextPage: true, endCursor: "cursor+/=" },
  });
  assert.match(html, /Real title/);
  assert.match(html, /Connected data/);
  assert.match(html, /after=cursor%2B%2F%3D/);
  assert.doesNotMatch(html, /DEMO_SENTINEL/);
});
test("orders, customer counts, inventory tracking and store identity show minimized real fields", async () => {
  assert.match(
    await page("orders", {
      nodes: [
        {
          name: "#42",
          createdAt: "2026-09-01T00:00:00Z",
          displayFinancialStatus: "PAID",
          totalPriceSet: {
            shopMoney: { amount: "12.50", currencyCode: "EUR" },
          },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    }),
    /12.50/,
  );
  assert.match(
    await page("customers", {
      nodes: [{ id: "gid://shopify/Customer/42", numberOfOrders: "3" }],
      pageInfo: { hasNextPage: false, endCursor: null },
    }),
    /Some customer details/,
  );
  assert.match(
    await page("inventory", {
      nodes: [
        {
          id: "gid://shopify/InventoryItem/42",
          sku: "REAL-SKU",
          tracked: true,
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    }),
    /REAL-SKU/,
  );
  assert.match(
    await page("store", {
      id: "gid://shopify/Shop/1",
      name: "Real shop",
      domain: "fixture.myshopify.com",
      currencyCode: "GBP",
    }),
    /Real shop/,
  );
});
test("empty, missing customer permission, policy denial and approval states never substitute demo data", async () => {
  const empty = await page("products", {
    nodes: [],
    pageInfo: { hasNextPage: false, endCursor: null },
  });
  assert.match(empty, /No products on this page/);
  for (const [status, error] of [
    ["failed", "SCOPE_REQUIRED"],
    ["failed", "SHOPIFY_THROTTLED"],
    ["denied", undefined],
    ["awaiting_approval", undefined],
  ]) {
    const html = await page("customers", undefined, error, status);
    assert.doesNotMatch(html, /DEMO_SENTINEL/);
    assert.match(html, /Manage connection|View approvals/);
  }
});
test("unlinked store is explicitly demo, disconnected linked store and unavailable database are never demo", async () => {
  summary = { ...defaults, linked: false, connected: false };
  assert.match(
    renderToStaticMarkup(
      await ShopifyCommercePage({
        view: "products",
        demo: React.createElement("p", null, "DEMO_SENTINEL"),
      }),
    ),
    /Demo mode/,
  );
  for (const changes of [
    { connected: false },
    { available: false, linked: false },
  ]) {
    summary = { ...defaults, ...changes };
    assert.doesNotMatch(
      renderToStaticMarkup(
        await ShopifyCommercePage({
          view: "products",
          demo: React.createElement("p", null, "DEMO_SENTINEL"),
        }),
      ),
      /DEMO_SENTINEL/,
    );
  }
});
test("connection card distinguishes configured owner, viewer and pending setup without exposing technical secrets", () => {
  const html = renderToStaticMarkup(
    React.createElement(ShopifyConnection, { connection: defaults }),
  );
  assert.match(html, /Reconnect Shopify/);
  assert.match(html, /Customers.*Limited/);
  assert.doesNotMatch(html, /credential_reference|access_token|HMAC|GraphQL/);
  const disabled = renderToStaticMarkup(
    React.createElement(ShopifyConnection, {
      connection: { ...defaults, owner: false, configured: false },
    }),
  );
  assert.match(disabled, /disabled/);
  assert.match(disabled, /setup is pending/);
});

test("connection management retains controls and exposes safe permissions and dates", () => {
  modalMode = "manage";
  try {
    const html = renderToStaticMarkup(
      React.createElement(ShopifyConnection, { connection: defaults }),
    );
    for (const text of [
      "Manage connection",
      "Reconnect Shopify",
      "Disconnect",
      "Connect a different store",
      "Granted permissions",
      "read_products",
      "Last sync",
      "Connected date",
    ])
      assert.ok(html.includes(text), text);
    assert.doesNotMatch(html, /credential_reference|ciphertext|accessToken/);
  } finally {
    modalMode = null;
  }
});
test("replacement input is editable; confirmation explains atomic switch and preserved history", () => {
  try {
    modalMode = "replace";
    const input = renderToStaticMarkup(
      React.createElement(ShopifyConnection, { connection: defaults }),
    );
    assert.doesNotMatch(input, /readOnly=/i);
    assert.match(input, /Review change/);
    modalMode = "confirm-replace";
    const confirmation = renderToStaticMarkup(
      React.createElement(ShopifyConnection, { connection: defaults }),
    );
    assert.match(confirmation, /Change the Shopify store for this business/);
    assert.match(
      confirmation,
      /Historical Anti-Nerd audit records will remain/,
    );
    assert.match(confirmation, /current connection stays active/);
    assert.match(confirmation, /Cancel/);
  } finally {
    modalMode = null;
  }
});
test("disconnect explicitly preserves account, Brain, audit and business settings; disconnected state offers connect", () => {
  try {
    modalMode = "disconnect";
    const html = renderToStaticMarkup(
      React.createElement(ShopifyConnection, { connection: defaults }),
    );
    assert.match(html, /Disconnect Shopify\?/);
    assert.match(
      html,
      /Business Brain history, audit history and business settings will remain/,
    );
    assert.match(html, /delete its saved connection credentials/);
    modalMode = null;
    const clean = renderToStaticMarkup(
      React.createElement(ShopifyConnection, {
        connection: {
          ...defaults,
          connected: false,
          linked: false,
          domain: null,
          health: "DISCONNECTED",
        },
      }),
    );
    assert.match(clean, /Connect Shopify/);
    assert.doesNotMatch(clean, /Reconnect Shopify/);
    const pending = renderToStaticMarkup(
      React.createElement(ShopifyConnection, {
        connection: { ...defaults, pendingDomain: "new-fixture.myshopify.com" },
      }),
    );
    assert.match(pending, /Current store remains active until complete/);
  } finally {
    modalMode = null;
  }
});
