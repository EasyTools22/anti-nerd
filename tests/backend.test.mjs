import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const root = process.cwd(),
  nativeRequire = createRequire(import.meta.url),
  cache = new Map();
// Unit harness only: server-only is Next's build-time poison pill, checked separately by the import-graph/build check.
function load(file) {
  const filename = path.resolve(root, file);
  if (cache.has(filename)) return cache.get(filename);
  const compiled = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (id) =>
      id === "server-only"
        ? {}
        : id.startsWith("node:")
          ? nativeRequire(id)
          : load(
              (id.startsWith("@/")
                ? path.join(root, id.slice(2))
                : path.resolve(path.dirname(filename), id)) + ".ts",
            ),
    compiled,
    compiled.exports,
  );
  cache.set(filename, compiled.exports);
  return compiled.exports;
}
const { parseProposal, parseToolCall } = load("lib/server/validation.ts");
const { evaluatePolicy } = load("lib/server/policy/engine.ts");
const { createBackend } = load("lib/server/foundation.ts");
const { ActionEngine } = load("lib/server/actions/engine.ts");
const { MockAuditRepository, MockActionRepository } = load(
  "lib/server/actions/stores.ts",
);
const { MockShopifyAdapter } = load("lib/server/integrations/mock-shopify.ts");
const { ShopifyAdapter, SHOPIFY_API_VERSION, validateShopDomain } = load(
  "lib/server/integrations/shopify.ts",
);
const { UnconfiguredCredentialStore } = load(
  "lib/server/security/credentials.ts",
);
const { createAIProvider } = load("lib/server/ai/registry.ts");
const { AgentRuntime } = load("lib/server/runtime.ts");
const { MockAIProvider } = load("lib/server/ai/mock-provider.ts");
const { MockBusinessBrain } = load("lib/server/brain/context.ts");
const context = {
  organizationId: "org-a",
  actorId: "owner-a",
  role: "owner",
  source: "mock",
};
const attribution = { agent: "product", provider: "mock" };
const read = {
  tool: "getStore",
  input: {},
  reason: "Read store identity",
  confidence: 1,
};
const price = {
  tool: "updateProductPrice",
  input: {
    productId: "gid://shopify/Product/1",
    variantId: "gid://shopify/ProductVariant/1",
    currentPrice: { amountMinor: 8900, currency: "EUR" },
    newPrice: { amountMinor: 9900, currency: "EUR" },
  },
  reason: "Review margin",
  confidence: 0.91,
};
const refund = {
  tool: "refundOrder",
  input: {
    orderId: "gid://shopify/Order/1",
    amount: { amountMinor: 8900, currency: "EUR" },
  },
  reason: "Owner requested review",
  confidence: 0.9,
};
function setup({ rule, audit, adapter, now } = {}) {
  const policy = {
    organizationId: context.organizationId,
    revision: 1,
    rules: rule ? { "products.price.write": rule } : {},
  };
  const log = audit ?? new MockAuditRepository();
  const actions = new MockActionRepository();
  const engine = new ActionEngine(
    adapter ?? new MockShopifyAdapter(context.organizationId),
    { get: async () => structuredClone(policy) },
    actions,
    log,
    now,
  );
  return { engine, policy, log, actions };
}
test("strict tool parsing rejects arbitrary operations, extra fields and invalid numeric values", () => {
  assert.equal(parseProposal(price).input.newPrice.amountMinor, 9900);
  for (const value of [
    { ...read, tool: "graphql" },
    { ...read, tool: "constructor" },
    { ...read, input: { query: "mutation {}" } },
    { ...read, organizationId: "victim" },
    { ...read, confidence: NaN },
    { ...price, input: { ...price.input, variantId: "https://evil.test" } },
    {
      ...price,
      input: { ...price.input, newPrice: { amountMinor: -1, currency: "EUR" } },
    },
  ])
    assert.throws(() => parseProposal(value));
  assert.throws(() =>
    parseToolCall({ tool: "listProducts", input: { first: 5000 } }),
  );
});
test("policy defaults allow reads, require approval for writes and high impact; denial is deterministic", () => {
  const policy = { organizationId: "org-a", revision: 1, rules: {} };
  assert.equal(evaluatePolicy(context, read, policy).outcome, "ALLOW");
  assert.equal(
    evaluatePolicy(context, price, policy).outcome,
    "REQUIRE_APPROVAL",
  );
  assert.equal(
    evaluatePolicy(context, refund, policy).outcome,
    "REQUIRE_APPROVAL",
  );
  assert.equal(
    evaluatePolicy({ ...context, organizationId: "other" }, read, policy)
      .outcome,
    "DENY",
  );
  assert.equal(
    evaluatePolicy({ ...context, role: "viewer" }, price, policy).outcome,
    "DENY",
  );
  for (const mode of ["DENIED", "READ_ONLY", "unexpected"])
    assert.equal(
      evaluatePolicy(context, price, {
        ...policy,
        rules: { "products.price.write": { mode } },
      }).outcome,
      "DENY",
    );
  assert.equal(
    evaluatePolicy(context, refund, {
      ...policy,
      rules: { "orders.refund": { mode: "AUTOMATIC" } },
    }).outcome,
    "REQUIRE_APPROVAL",
  );
});
test("automatic limits fail closed on absent/unsupported limits, currency and price", () => {
  const decide = (limits) =>
    evaluatePolicy(context, price, {
      organizationId: "org-a",
      revision: 1,
      rules: {
        "products.price.write": { mode: "AUTOMATIC_WITH_LIMITS", limits },
      },
    }).outcome;
  for (const limit of [
    undefined,
    { currency: "EUR", maxNewPriceMinor: 9000 },
    { currency: "USD", maxNewPriceMinor: 12000 },
    { currency: "EUR", maxNewPriceMinor: Infinity },
    { currency: "EUR", maxNewPriceMinor: 12000, ignoredLimit: 1 },
  ])
    assert.equal(decide(limit), "DENY");
  assert.equal(decide({ currency: "EUR", maxNewPriceMinor: 10000 }), "ALLOW");
});
test("mock runtime exercises read → policy → adapter → audit → Brain and price → approval", async () => {
  const b = createBackend("mock");
  const result = await b.runtime.run(b.context, "store", "Read my store");
  assert.equal(result[0].status, "succeeded");
  assert.equal(result[0].data.name, "Anti-Nerd mock store");
  assert.deepEqual(
    b.audit.list().map((e) => e.result),
    ["started", "succeeded"],
  );
  assert.equal(b.brain.learnedActionCount, 1);
  const proposed = await b.runtime.run(b.context, "product", "Review pricing");
  assert.equal(proposed[0].status, "awaiting_approval");
  assert.equal(b.brain.learnedActionCount, 1);
  assert.equal(b.audit.list().at(-1).change.input.newPrice.amountMinor, 9900);
});
test("action IDs are idempotent, mismatches rejected and duplicate reads not repeated", async () => {
  const { engine, log } = setup();
  const first = await engine.propose(context, read, attribution, "read-1");
  assert.deepEqual(
    await engine.propose(context, read, attribution, "read-1"),
    first,
  );
  assert.equal(log.list().length, 2);
  await assert.rejects(
    engine.propose(context, price, attribution, "read-1"),
    /another request/,
  );
  await assert.rejects(
    engine.propose({ ...context, organizationId: "org-b" }, read, attribution),
    /context/,
  );
});
test("approval binds tenant, owner, exact action, expiry and revision; writes stay blocked", async () => {
  const { engine, policy, log } = setup();
  const receipt = await engine.propose(context, price, attribution);
  await assert.rejects(
    engine.approve(
      { ...context, role: "member" },
      receipt.actionId,
      receipt.approvalId,
    ),
    /owner/,
  );
  await assert.rejects(
    engine.approve(
      { ...context, organizationId: "org-b" },
      receipt.actionId,
      receipt.approvalId,
    ),
    /context/,
  );
  await assert.rejects(
    engine.approve(context, receipt.actionId, "wrong"),
    /match/,
  );
  policy.revision = 2;
  await assert.rejects(
    engine.approve(context, receipt.actionId, receipt.approvalId),
    /policy changed/,
  );
  policy.revision = 1;
  const approved = await engine.approve(
    context,
    receipt.actionId,
    receipt.approvalId,
  );
  assert.equal(approved.status, "not_implemented");
  assert.equal(log.list().at(-1).approvedBy, context.actorId);
  assert.equal(log.list().at(-1).executedAt, null);
  await assert.rejects(
    engine.approve(context, receipt.actionId, receipt.approvalId),
    /already used/,
  );
  let time = new Date("2026-09-24T00:00:00Z");
  const expiring = setup({ now: () => time }).engine;
  const pending = await expiring.propose(context, price, attribution);
  time = new Date("2026-09-24T00:16:00Z");
  await assert.rejects(
    expiring.approve(context, pending.actionId, pending.approvalId),
    /expired/,
  );
});
test("automatic writes remain unavailable and audit failure prevents adapter calls", async () => {
  const b = setup({ rule: { mode: "AUTOMATIC" } });
  assert.equal(
    (await b.engine.propose(context, price, attribution)).status,
    "not_implemented",
  );
  let calls = 0;
  const adapter = {
    source: "mock",
    organizationId: "org-a",
    capabilities: ["store.read"],
    executeRead: async () => {
      calls++;
    },
  };
  const broken = setup({
    adapter,
    audit: {
      persistence: "ephemeral",
      append: async () => {
        throw new Error("audit unavailable");
      },
    },
  });
  await assert.rejects(
    broken.engine.propose(context, read, attribution),
    /audit unavailable/,
  );
  assert.equal(calls, 0);
  const live = setup({ adapter: { ...adapter, source: "live" } });
  await assert.rejects(
    live.engine.propose({ ...context, source: "live" }, read, attribution),
    /durable/,
  );
});
test("provider outputs cannot escape agent allowlists or smuggle raw requests", async () => {
  let calls = 0,
    captured;
  const provider = new MockAIProvider();
  provider.toolUse = async (input) => {
    captured = input;
    return [refund];
  };
  const runtime = new AgentRuntime(provider, new MockBusinessBrain("org-a"), {
    propose: async () => {
      calls++;
    },
  });
  await assert.rejects(
    runtime.run(context, "research", "Research products"),
    /scope/,
  );
  assert.equal(calls, 0);
  assert.ok(JSON.stringify(captured.context).length <= 6000);
  assert.equal(JSON.stringify(captured).includes("credential"), false);
  provider.toolUse = async () => [
    {
      tool: "graphql",
      input: { query: "mutation" },
      reason: "x",
      confidence: 1,
    },
  ];
  await assert.rejects(runtime.run(context, "store", "Read store"));
  assert.equal(calls, 0);
});
function realSetup({
  shopDomain = "sample-shop.myshopify.com",
  org = "org-a",
  scopes = ["read_products", "read_orders", "read_customers", "read_inventory"],
  response,
  transport,
} = {}) {
  let calls = [];
  const credentials = {
    persistence: "durable",
    withSecret: async (tenant, ref, purpose, consume) => {
      assert.equal(tenant, "org-a");
      assert.equal(ref, "reference-1");
      assert.equal(purpose, "integration:shopify");
      return consume("TEST_ONLY_SHOPIFY_SECRET");
    },
  };
  const connection = {
    id: "connection-1",
    organizationId: org,
    status: "connected",
    shopDomain,
    grantedScopes: scopes,
    credentialReference: "reference-1",
  };
  const adapter = new ShopifyAdapter(
    { ...context, source: "live" },
    "connection-1",
    { get: async () => connection },
    credentials,
    async (url, options) => {
      calls.push({ url, options });
      return transport
        ? transport()
        : (response ??
            Response.json({
              data: {
                shop: {
                  id: "gid://shopify/Shop/1",
                  name: "Fixture",
                  myshopifyDomain: shopDomain,
                  currencyCode: "EUR",
                  token: "TEST_ONLY_SHOPIFY_SECRET",
                },
              },
            }));
    },
  );
  return { adapter, calls };
}
test("Shopify uses pinned GraphQL, secret header, strict host, no cache/redirect and minimal DTO", async () => {
  const { adapter, calls } = realSetup();
  const result = await adapter.executeRead({ tool: "getStore", input: {} });
  assert.equal(result.name, "Fixture");
  assert.equal(
    JSON.stringify(result).includes("TEST_ONLY_SHOPIFY_SECRET"),
    false,
  );
  assert.equal(
    calls[0].url,
    `https://sample-shop.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
  );
  assert.equal(
    calls[0].options.headers["X-Shopify-Access-Token"],
    "TEST_ONLY_SHOPIFY_SECRET",
  );
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.signal.aborted, false);
  for (const host of [
    "localhost",
    "sample.myshopify.com.evil.test",
    "https://sample.myshopify.com",
    "sample.myshopify.com:443",
    "sample.myshopify.com/path",
  ])
    assert.throws(() => validateShopDomain(host));
});
test("Shopify rejects wrong tenants, missing scopes, writes and invalid hosts before network", async () => {
  for (const fixture of [
    { org: "org-b" },
    { shopDomain: "127.0.0.1" },
    { scopes: [] },
  ]) {
    const b = realSetup(fixture);
    await assert.rejects(
      b.adapter.executeRead({ tool: "listProducts", input: { first: 5 } }),
    );
    assert.equal(b.calls.length, 0);
  }
  const b = realSetup();
  await assert.rejects(
    b.adapter.executeRead({ tool: price.tool, input: price.input }),
    /not enabled/,
  );
  assert.equal(b.calls.length, 0);
});
test("Shopify handles throttles, GraphQL errors, transport leaks and API version drift safely", async () => {
  const cases = [
    new Response("private details", { status: 429 }),
    new Response("private details", { status: 401 }),
    Response.json({
      errors: [{ message: "TEST_ONLY_SHOPIFY_SECRET" }],
      data: { shop: {} },
    }),
    Response.json(
      { data: {} },
      { headers: { "X-Shopify-API-Version": "2099-01" } },
    ),
    new Response("not json"),
  ];
  for (const response of cases)
    await assert.rejects(
      realSetup({ response }).adapter.executeRead({
        tool: "getStore",
        input: {},
      }),
      (error) =>
        !error.message.includes("private details") &&
        !error.message.includes("TEST_ONLY_SHOPIFY_SECRET"),
    );
  await assert.rejects(
    realSetup({
      transport: () => {
        throw new Error("TEST_ONLY_SHOPIFY_SECRET");
      },
    }).adapter.executeRead({ tool: "getStore", input: {} }),
    (error) => !error.message.includes("TEST_ONLY_SHOPIFY_SECRET"),
  );
});
test("all seven read tools use bounded documents and retain pagination", async () => {
  const info = { hasNextPage: true, endCursor: "next-cursor" };
  const product = {
    id: "gid://shopify/Product/1",
    title: "Fixture",
    status: "ACTIVE",
    updatedAt: "2026-09-24",
  };
  const order = {
    id: "gid://shopify/Order/1",
    name: "#1",
    createdAt: "2026-09-24",
    displayFinancialStatus: "PAID",
    totalPriceSet: { shopMoney: { amount: "89.00", currencyCode: "EUR" } },
  };
  for (const [tool, rootName, input, data] of [
    [
      "listProducts",
      "products",
      { first: 5 },
      { nodes: [product], pageInfo: info },
    ],
    ["getProduct", "product", { productId: product.id }, product],
    ["listOrders", "orders", {}, { nodes: [order], pageInfo: info }],
    ["getOrder", "order", { orderId: order.id }, order],
    [
      "listCustomers",
      "customers",
      {},
      {
        nodes: [
          {
            id: "gid://shopify/Customer/1",
            numberOfOrders: "3",
            email: "excluded@example.test",
          },
        ],
        pageInfo: info,
      },
    ],
    [
      "getInventory",
      "inventoryItems",
      {},
      {
        nodes: [
          { id: "gid://shopify/InventoryItem/1", sku: "SKU", tracked: true },
        ],
        pageInfo: info,
      },
    ],
  ]) {
    const b = realSetup({
      response: Response.json({ data: { [rootName]: data } }),
    });
    const result = await b.adapter.executeRead({ tool, input });
    assert.equal(
      JSON.stringify(result).includes("excluded@example.test"),
      false,
    );
    if (result.nodes) assert.equal(result.pageInfo.endCursor, "next-cursor");
    const request = JSON.parse(b.calls[0].options.body);
    assert.ok(request.query.startsWith("query AntiNerd"));
    if (result.nodes) assert.ok(request.variables.first <= 50);
  }
});
test("credential storage and live composition fail closed, without fallback", async () => {
  const store = new UnconfiguredCredentialStore();
  await assert.rejects(
    store.save("org-a", "ai:openai", "test-only"),
    /not configured/,
  );
  await assert.rejects(
    store.withSecret("org-a", "x", "ai:openai", async () => "should not run"),
    /not configured/,
  );
  assert.throws(() => createBackend("live"), /not configured/);
  for (const id of ["openai", "anthropic", "google", "anti-nerd"])
    assert.throws(() => createAIProvider(id), /Live AI requires/);
});
test("controlled HTTP preview rejects arbitrary input/cross origin and is disabled in production", async () => {
  const { POST } = load("app/api/development/runtime/route.ts");
  const original = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "development";
    const request = (body, origin = "http://localhost:5000") =>
      new Request("http://localhost:5000/api/development/runtime", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify(body),
      });
    assert.equal(
      (await POST(request({ scenario: "read" }, "https://foreign.test")))
        .status,
      403,
    );
    assert.equal(
      (await POST(request({ scenario: "read", organizationId: "victim" })))
        .status,
      400,
    );
    assert.equal(
      (await POST(request({ scenario: "x".repeat(2000) }))).status,
      413,
    );
    const ok = await POST(request({ scenario: "price" }));
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).receipts[0].status, "awaiting_approval");
    process.env.NODE_ENV = "production";
    assert.equal((await POST(request({ scenario: "read" }))).status, 404);
  } finally {
    if (original === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original;
  }
});
test("unconfigured connection endpoints never accept or echo submitted secrets", async () => {
  for (const file of [
    "app/api/integrations/shopify/connect/route.ts",
    "app/api/ai-engine/connection/route.ts",
  ]) {
    const response = await load(file).POST(
      new Request("http://localhost:5000", {
        method: "POST",
        body: JSON.stringify({ key: "TEST_ONLY_SHOPIFY_SECRET" }),
      }),
    );
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(
      (await response.text()).includes("TEST_ONLY_SHOPIFY_SECRET"),
      false,
    );
  }
  // Callback readiness now redirects to the UI; its real HTTP handler and
  // fail-closed configuration gates are covered in shopify/readiness tests.
});
