import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID, randomBytes } from "node:crypto";
import ts from "typescript";
const native = createRequire(import.meta.url),
  cache = new Map();
const rows = [],
  secrets = new Map();
const client = {
  from(table) {
    assert.equal(table, "integration_connections");
    const filters = {};
    const query = {
      select() {
        return query;
      },
      eq(k, v) {
        filters[k] = v;
        return query;
      },
      async maybeSingle() {
        return {
          data:
            rows.find((r) =>
              Object.entries(filters).every(([k, v]) => r[k] === v),
            ) ?? null,
          error: null,
        };
      },
    };
    return query;
  },
  async rpc(name, args) {
    assert.equal(name, "shopify_operation");
    assert.equal(args.operation, "secret");
    const row = rows.find(
      (r) =>
        r.organization_id === args.org &&
        r.business_id === args.business &&
        r.status === "connected" &&
        r.credential_reference === args.payload.reference,
    );
    return row
      ? { data: secrets.get(row.credential_reference), error: null }
      : { data: null, error: { message: "NOT_CONNECTED" } };
  },
};
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const m = { exports: {} };
  new Function(
    "require",
    "module",
    "exports",
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  )(
    (id) => {
      if (id === "server-only") return {};
      if (id.startsWith("node:")) return native(id);
      const resolved =
        path.resolve(
          id.startsWith("@/")
            ? id.slice(2)
            : path.resolve(path.dirname(file), id),
        ) + ".ts";
      if (resolved === path.resolve("lib/server/db/client.ts"))
        return {
          sessionClient: async () => client,
          persistenceClient: () => client,
          databaseError: (e) => {
            if (e) throw Error("DATABASE_UNAVAILABLE");
          },
        };
      return load(resolved);
    },
    m,
    m.exports,
  );
  cache.set(file, m.exports);
  return m.exports;
}
const { PostgresShopifyStore } = load("lib/server/shopify/store.ts");
const { PostgresConnectionRepository } = load("lib/server/db/repositories.ts");
const { ShopifyTokenStore } = load("lib/server/shopify/tokens.ts");
const { ShopifyVault } = load("lib/server/shopify/vault.ts");
const { ShopifyAdapter } = load("lib/server/integrations/shopify.ts");
const vault = new ShopifyVault(
  { v1: randomBytes(32).toString("base64") },
  "v1",
);
const org = randomUUID(),
  actor = randomUUID();
const contexts = ["a", "b"].map(() => ({
  organizationId: org,
  businessId: randomUUID(),
  actorId: actor,
  role: "owner",
  source: "live",
}));
const scopes = [
  "read_products",
  "read_orders",
  "read_customers",
  "read_inventory",
];
for (const [i, context] of contexts.entries()) {
  const id = randomUUID(),
    cipher = vault.seal(
      context,
      id,
      JSON.stringify({
        accessToken: `TEST_ONLY_BUSINESS_${i}`,
        refreshToken: "TEST_ONLY_REFRESH",
        accessExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        scopes,
      }),
    );
  rows.push({
    id,
    organization_id: org,
    business_id: context.businessId,
    provider: "shopify",
    external_account_identifier: `business-${i}.myshopify.com`,
    status: "connected",
    credential_reference: cipher.id,
    granted_capabilities: scopes,
    connection_health: "CONNECTED",
  });
  secrets.set(cipher.id, cipher);
}
const requests = [];
const transport = async (url, options) => {
  const i = Number(new URL(url).hostname.match(/business-(\d)/)[1]);
  assert.equal(
    options.headers["X-Shopify-Access-Token"],
    `TEST_ONLY_BUSINESS_${i}`,
  );
  requests.push(i);
  const n = String(i + 1),
    sentinel = `BUSINESS_${i}`,
    pageInfo = { hasNextPage: false, endCursor: null };
  const data = {
    shop: {
      id: `gid://shopify/Shop/${n}`,
      name: sentinel,
      myshopifyDomain: `business-${i}.myshopify.com`,
      currencyCode: "EUR",
    },
    products: {
      nodes: [
        {
          id: `gid://shopify/Product/${n}`,
          title: sentinel,
          status: "ACTIVE",
          updatedAt: "2026-09-25T00:00:00Z",
        },
      ],
      pageInfo,
    },
    orders: {
      nodes: [
        {
          id: `gid://shopify/Order/${n}`,
          name: sentinel,
          createdAt: "2026-09-25T00:00:00Z",
          displayFinancialStatus: "PAID",
          totalPriceSet: { shopMoney: { amount: n, currencyCode: "EUR" } },
        },
      ],
      pageInfo,
    },
    customers: {
      nodes: [{ id: `gid://shopify/Customer/${n}`, numberOfOrders: n }],
      pageInfo,
    },
    inventoryItems: {
      nodes: [
        {
          id: `gid://shopify/InventoryItem/${n}`,
          sku: sentinel,
          tracked: true,
        },
      ],
      pageInfo,
    },
  };
  return Response.json(
    { data },
    { headers: { "X-Shopify-API-Version": "2026-07" } },
  );
};
function adapter(context, id) {
  const store = new PostgresShopifyStore(context);
  return new ShopifyAdapter(
    context,
    id,
    new PostgresConnectionRepository(context),
    new ShopifyTokenStore(context, id, store, vault, {}, transport),
    transport,
  );
}
for (const tool of [
  "getStore",
  "listProducts",
  "listOrders",
  "listCustomers",
  "getInventory",
])
  test(`${tool}: switching businesses selects only that business's connection, host, credential and data`, async () => {
    for (const i of [0, 1, 0, 1]) {
      const store = new PostgresShopifyStore(contexts[i]);
      assert.equal((await store.get()).id, rows[i].id);
      const result = await adapter(contexts[i], rows[i].id).executeRead({
        tool,
        input: tool === "getStore" ? {} : { first: 10 },
      });
      const id = tool === "getStore" ? result.id : result.nodes[0].id;
      assert.equal(id.split("/").at(-1), String(i + 1));
      assert.ok(!JSON.stringify(result).includes(`BUSINESS_${1 - i}`));
    }
    const count = requests.length;
    await assert.rejects(
      adapter(contexts[1], rows[0].id).executeRead({
        tool,
        input: tool === "getStore" ? {} : { first: 10 },
      }),
    );
    assert.equal(
      requests.length,
      count,
      "cross-business identifiers must not cause a transport request",
    );
  });
test("cross-organization connection lookup cannot use a member business or its vault envelope", async () => {
  const outsider = { ...contexts[0], organizationId: randomUUID() };
  assert.equal(await new PostgresShopifyStore(outsider).get(), null);
  await assert.rejects(
    new PostgresConnectionRepository(outsider).get(org, rows[0].id),
  );
  await assert.rejects(
    adapter(outsider, rows[0].id).executeRead({ tool: "getStore", input: {} }),
  );
  assert.throws(() =>
    vault.open(
      { ...contexts[0], businessId: contexts[1].businessId },
      rows[0].id,
      rows[0].credential_reference,
      "integration:shopify",
      secrets.get(rows[0].credential_reference),
    ),
  );
});
