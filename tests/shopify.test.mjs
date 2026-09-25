import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import ts from "typescript";
const mocks = new Map();
const native = createRequire(import.meta.url),
  cache = new Map();
function load(file) {
  const filename = path.resolve(file);
  if (mocks.has(filename)) return mocks.get(filename);
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
      },
    }).outputText,
  )(
    (id) =>
      mocks.has(id)
        ? mocks.get(id)
        : id === "server-only"
          ? {}
          : id.startsWith("node:")
            ? native(id)
            : load(
                (id.startsWith("@/")
                  ? id.slice(2)
                  : path.resolve(path.dirname(filename), id)) + ".ts",
              ),
    compiled,
    compiled.exports,
  );
  cache.set(filename, compiled.exports);
  return compiled.exports;
}
const { ShopifyVault } = load("lib/server/shopify/vault.ts"),
  { ShopifyConnectionService } = load(
    "lib/server/integrations/shopify-connection.ts",
  ),
  { ShopifyTokenStore } = load("lib/server/shopify/tokens.ts"),
  { callbackParameters, verifyWebhook, digestState, requestTokens } = load(
    "lib/server/shopify/protocol.ts",
  ),
  { ShopifyAdapter, validateShopDomain } = load(
    "lib/server/integrations/shopify.ts",
  );
const context = {
    organizationId: randomUUID(),
    businessId: randomUUID(),
    actorId: randomUUID(),
    role: "owner",
    source: "live",
  },
  shop = "fixture.myshopify.com",
  config = {
    clientId: "fixture-client",
    clientSecret: "TEST_ONLY_CLIENT_SECRET",
    scopes: [
      "read_products",
      "read_orders",
      "read_inventory",
      "read_customers",
    ],
    redirectUri: "https://app.example/api/integrations/shopify/callback",
    appOrigin: "https://app.example",
  },
  vault = new ShopifyVault({ v1: randomBytes(32).toString("base64") }, "v1");
const tokenResponse = () => ({
  access_token: "TEST_ONLY_ACCESS_TOKEN",
  refresh_token: "TEST_ONLY_REFRESH_TOKEN",
  expires_in: 3600,
  refresh_token_expires_in: 7776000,
  scope: config.scopes.join(","),
});
function signed(state, changes = {}) {
  const p = new URLSearchParams({
    code: "fixture_code",
    state,
    shop,
    timestamp: String(Math.floor(Date.now() / 1000)),
    ...changes,
  });
  p.set(
    "hmac",
    createHmac("sha256", config.clientSecret)
      .update(
        [...p]
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, v]) => `${k}=${v}`)
          .join("&"),
      )
      .digest("hex"),
  );
  return p;
}
test("temporary HMAC diagnostics distinguish SDK encoding from wrong credentials without changing acceptance", () => {
  const state = "a".repeat(64),
    now = 1790338512000;
  const vectors = [
    [
      "",
      "b221783719c7d2ea6d50a7d4ab50629794ec48f1a2a4ff6b16174720fdc18e30",
      true,
    ],
    [
      "&host=YWRtaW4%3D",
      "7dcc3af581aa71e3ee2aba6e219afa5f17f5c71b5cc9901327f61536b60a85ca",
      false,
    ],
    [
      "&note=a%20b%2Bc%26d%3D%25",
      "5173e12cf5d02dd27a96792d57f36cad22f1201ea87344206080c8177da8f005",
      false,
    ],
  ];
  for (const [extra, hmac, existingAccepts] of vectors) {
    const params = new URLSearchParams(
      `timestamp=1790338512&state=${state}&shop=${shop}&code=fixture_code${extra}&hmac=${hmac}`,
    );
    const events = [];
    const run = () =>
      callbackParameters(params, config.clientSecret, state, now, (...e) =>
        events.push(e),
      );
    if (existingAccepts) assert.equal(run().shop, shop);
    else assert.throws(run, { code: "INVALID_CALLBACK" });
    assert.deepEqual(
      events.find(([step, status]) => step === "F" && status === "INFO")[2],
      {
        canonicalDiffers: !existingAccepts,
        sdkHmacValid: true,
      },
    );
    for (const scenario of ["wrong_secret", "tamper", "changed_hmac"]) {
      const changed = new URLSearchParams(params);
      if (scenario === "tamper") changed.set("shop", "tampered.myshopify.com");
      if (scenario === "changed_hmac") changed.set("hmac", "0".repeat(64));
      const failures = [];
      assert.throws(
        () =>
          callbackParameters(
            changed,
            scenario === "wrong_secret"
              ? "WRONG_TEST_SECRET"
              : config.clientSecret,
            state,
            now,
            (...e) => failures.push(e),
          ),
        { code: "INVALID_CALLBACK" },
      );
      assert.equal(
        failures.find(([step, status]) => step === "F" && status === "INFO")[2]
          .sdkHmacValid,
        false,
      );
    }
    params.append("shop", shop);
    assert.throws(
      () => callbackParameters(params, config.clientSecret, state, now),
      { code: "INVALID_CALLBACK" },
    );
  }
});

test("OAuth diagnostics correlate attempts but never emit raw credentials, callback values or arbitrary errors", () => {
  const { oauthTrace, credentialFingerprints, diagnosticCode } = load(
    "lib/server/shopify/diagnostics.ts",
  );
  const records = [],
    original = console.info,
    state = "b".repeat(64);
  console.info = (...parts) => records.push(parts);
  try {
    const trace = oauthTrace(state, context.businessId);
    trace("CONFIG", "INFO", {
      ...credentialFingerprints(config.clientId, config.clientSecret),
      accessToken: "TEST_ONLY_ACCESS_TOKEN",
      code: "UNTRUSTED_SECRET_ERROR",
      shopHash: "RAW_SHOP_SECRET",
      httpStatus: 200,
    });
    trace("A", "PASS");
    const output = JSON.stringify(records);
    for (const forbidden of [
      state,
      config.clientId,
      config.clientSecret,
      "TEST_ONLY_ACCESS_TOKEN",
      "UNTRUSTED_SECRET_ERROR",
      "RAW_SHOP_SECRET",
    ])
      assert.equal(output.includes(forbidden), false);
    const one = JSON.parse(records[0][1]),
      two = JSON.parse(records[1][1]);
    assert.equal(one.attemptId, two.attemptId);
    assert.match(one.attemptId, /^[a-f0-9]{32}$/);
    assert.equal(one.businessId, context.businessId);
    assert.equal(one.code, "UNAVAILABLE");
    assert.equal(diagnosticCode(new Error("secret error")), "UNAVAILABLE");
    console.info = () => {
      throw new Error("sink failure");
    };
    assert.doesNotThrow(() => trace("A", "PASS"));
  } finally {
    console.info = original;
  }
});

test("token diagnostics retain only HTTP status and safe validation classifications", async () => {
  const events = [],
    trace = (...e) => events.push(e);
  await assert.rejects(
    requestTokens(
      config,
      shop,
      { code: "TEST_ONLY_CODE" },
      async () => new Response("private provider error", { status: 401 }),
      Date.now(),
      trace,
    ),
    { code: "NEEDS_REAUTHORIZATION" },
  );
  assert.deepEqual(events, [
    ["O", "FAIL", { httpStatus: 401, code: "NEEDS_REAUTHORIZATION" }],
  ]);
  events.length = 0;
  await requestTokens(
    config,
    shop,
    { code: "TEST_ONLY_CODE" },
    async () => Response.json(tokenResponse()),
    Date.now(),
    trace,
  );
  assert.deepEqual(
    events.map(([step, status]) => [step, status]),
    [
      ["O", "PASS"],
      ["P", "PASS"],
      ["Q", "PASS"],
    ],
  );
  assert.equal(JSON.stringify(events).includes("TEST_ONLY_"), false);
});
class Store {
  constructor() {
    this.row = {
      id: randomUUID(),
      organization_id: context.organizationId,
      business_id: context.businessId,
      status: "not_connected",
      generation: 0,
      external_account_identifier: shop,
      credential_reference: null,
    };
    this.states = new Map();
    this.envelopes = new Map();
    this.events = [];
    this.lease = null;
  }
  async get() {
    return structuredClone(this.row);
  }
  async begin(domain, digest, redirectUri) {
    this.row.status = "unavailable";
    const state = {
      stateDigest: digest,
      organizationId: context.organizationId,
      businessId: context.businessId,
      actorId: context.actorId,
      shopDomain: domain,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      redirectUri,
      connectionId: this.row.id,
      generation: ++this.row.generation,
    };
    this.states.set(digest, state);
    return state;
  }
  async consume(digest, domain) {
    const state = this.states.get(digest);
    if (
      !state ||
      state.used ||
      state.shopDomain !== domain ||
      Date.parse(state.expiresAt) <= Date.now()
    )
      return null;
    state.used = true;
    return state;
  }
  async stage(state, cipher) {
    this.envelopes.set(cipher.id, cipher);
    this.row.credential_reference = cipher.id;
    this.events.push("staged");
  }
  async secret(ref) {
    assert.equal(ref, this.row.credential_reference);
    const value = this.envelopes.get(ref);
    assert.ok(value);
    return value;
  }
  async commit(state, cipher, tokens) {
    this.row.status = "connected";
    this.row.granted_capabilities = tokens.scopes;
    this.row.connection_health = "CONNECTED";
    this.row.last_verified_at = new Date().toISOString();
    this.events.push("connected");
  }
  async abort() {
    this.row.status = "unavailable";
    this.envelopes.clear();
    this.events.push("failed");
  }
  async lockRefresh() {
    if (this.lease) return null;
    return (this.lease = randomUUID());
  }
  async rotate(ref, lease, cipher) {
    assert.equal(this.row.status, "connected");
    assert.equal(this.lease, lease);
    this.envelopes.set(ref, cipher);
    this.lease = null;
    this.events.push("refreshed");
  }
  async unhealthy(health, lease) {
    if (lease && lease !== this.lease) return;
    this.row.connection_health = health;
    this.row.status = "unavailable";
  }
  async disconnect() {
    this.row.status = "revoked";
    this.envelopes.clear();
    this.row.credential_reference = null;
    this.lease = null;
  }
}
function flow(transport) {
  const store = new Store(),
    calls = [];
  const fetcher =
    transport ??
    (async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith("/access_token")) return Response.json(tokenResponse());
      assert.equal(store.events.at(-1), "staged");
      return Response.json({
        data: {
          shop: {
            id: "gid://shopify/Shop/123",
            name: "Fixture store",
            myshopifyDomain: shop,
            currencyCode: "EUR",
          },
        },
      });
    });
  return {
    store,
    calls,
    service: new ShopifyConnectionService(
      context,
      store,
      config,
      vault,
      fetcher,
    ),
  };
}
test("domain canonicalization rejects SSRF, ports, paths, credentials, lookalikes and malformed labels", () => {
  assert.equal(validateShopDomain("  FiXtUrE.myshopify.com "), shop);
  assert.equal(validateShopDomain("a.myshopify.com"), "a.myshopify.com");
  for (const domain of [
    "https://fixture.myshopify.com",
    "fixture.myshopify.com/x",
    "fixture.myshopify.com:443",
    "user@fixture.myshopify.com",
    "fixture.myshopify.com.evil.test",
    "-bad.myshopify.com",
    "bad-.myshopify.com",
    "127.0.0.1",
    "fixture.myshopify.com.",
    "fixture\n.myshopify.com",
  ])
    assert.throws(() => validateShopDomain(domain));
});
test("callback HMAC, state cookie, timestamp, duplicate params and tampering are rejected before exchange", async () => {
  const { service, calls } = flow(),
    { state } = await service.begin(shop);
  assert.equal(
    callbackParameters(signed(state), config.clientSecret, state).shop,
    shop,
  );
  for (const p of [
    signed(state, { timestamp: "1000000000" }),
    signed(state, { shop: "https://example.com" }),
    signed(state, { state: "0".repeat(64) }),
  ])
    await assert.rejects(service.complete(p, state));
  const tampered = signed(state);
  tampered.set("code", "changed");
  await assert.rejects(service.complete(tampered, state));
  const duplicate = signed(state);
  duplicate.append("shop", shop);
  await assert.rejects(service.complete(duplicate, state));
  await assert.rejects(service.complete(signed(state), undefined));
  assert.equal(calls.length, 0);
});
test("OAuth uses random one-time durable state and persists ciphertext before verification; never returns tokens", async () => {
  const { service, store, calls } = flow(),
    { state, url } = await service.begin(" FIXTURE.myshopify.com ");
  assert.match(state, /^[a-f0-9]{64}$/);
  assert.equal(store.states.has(state), false);
  assert.equal(store.states.has(digestState(state)), true);
  const authorization = new URL(url);
  assert.equal(authorization.origin, `https://${shop}`);
  assert.equal(authorization.searchParams.has("grant_options[]"), false);
  assert.equal(
    authorization.searchParams.get("scope"),
    config.scopes.join(","),
  );
  const result = await service.complete(signed(state), state);
  assert.deepEqual(store.events, ["staged", "connected"]);
  assert.equal(result.name, "Fixture store");
  assert.equal(calls.length, 2);
  assert.equal(new URLSearchParams(calls[0].init.body).get("expiring"), "1");
  assert.equal(
    JSON.stringify([...store.envelopes]).includes("TEST_ONLY_ACCESS_TOKEN"),
    false,
  );
  assert.equal(JSON.stringify(result).includes("TOKEN"), false);
  await assert.rejects(service.complete(signed(state), state));
  assert.equal(calls.length, 2);
});
test("wrong user, organization, business, shop and callback redirect cannot exchange a code", async () => {
  for (const [key, value] of [
    ["actorId", randomUUID()],
    ["organizationId", randomUUID()],
    ["businessId", randomUUID()],
    ["shopDomain", "other.myshopify.com"],
    ["redirectUri", "https://evil.example"],
  ]) {
    const { service, store, calls } = flow(),
      { state } = await service.begin(shop);
    store.states.get(digestState(state))[key] = value;
    await assert.rejects(service.complete(signed(state), state));
    assert.equal(calls.length, 0);
  }
});
test("expired state and non-owner context cannot authorize", async () => {
  const { service, store, calls } = flow(),
    { state } = await service.begin(shop);
  store.states.get(digestState(state)).expiresAt = new Date(0).toISOString();
  await assert.rejects(service.complete(signed(state), state));
  await assert.rejects(
    new ShopifyConnectionService(
      { ...context, role: "admin" },
      store,
      config,
      vault,
    ).begin(shop),
  );
  assert.equal(calls.length, 0);
});
test("code exchange, missing scopes, write scope escalation and shop verification failures leave no usable credential", async () => {
  for (const kind of ["http", "scope", "write", "shop", "graphql"]) {
    const { service, store } = flow(async (url) =>
      url.endsWith("/access_token")
        ? kind === "http"
          ? new Response("TEST_ONLY_ACCESS_TOKEN", { status: 400 })
          : Response.json({
              ...tokenResponse(),
              ...(kind === "scope"
                ? { scope: "read_products" }
                : kind === "write"
                  ? { scope: config.scopes.join(",") + ",write_products" }
                  : {}),
            })
        : kind === "graphql"
          ? Response.json({ errors: [{ message: "sensitive" }] })
          : Response.json({
              data: {
                shop: {
                  id: "gid://shopify/Shop/1",
                  name: "Other",
                  myshopifyDomain: "other.myshopify.com",
                  currencyCode: "EUR",
                },
              },
            }),
    );
    const { state } = await service.begin(shop);
    await assert.rejects(
      service.complete(signed(state), state),
      (error) =>
        !error.message.includes("TOKEN") && error.code === "CONNECTION_FAILED",
    );
    assert.equal(store.row.status, "unavailable");
    assert.equal(store.envelopes.size, 0);
  }
});
test("vault authenticates organization, business, connection, purpose, key version and ciphertext; rotation retains old-key readability", () => {
  const id = randomUUID(),
    key1 = randomBytes(32).toString("base64"),
    key2 = randomBytes(32).toString("base64"),
    oldVault = new ShopifyVault({ v1: key1 }, "v1"),
    newVault = new ShopifyVault({ v1: key1, v2: key2 }, "v2"),
    row = oldVault.seal(context, id, "secret-fixture");
  assert.equal(
    newVault.open(context, id, row.id, "integration:shopify", row),
    "secret-fixture",
  );
  assert.equal(newVault.seal(context, id, "next").keyVersion, "v2");
  for (const args of [
    [
      { ...context, organizationId: randomUUID() },
      id,
      row.id,
      "integration:shopify",
      row,
    ],
    [
      { ...context, businessId: randomUUID() },
      id,
      row.id,
      "integration:shopify",
      row,
    ],
    [context, randomUUID(), row.id, "integration:shopify", row],
    [context, id, row.id, "ai:openai", row],
    [context, id, row.id, "integration:shopify", { ...row, keyVersion: "v2" }],
    [
      context,
      id,
      row.id,
      "integration:shopify",
      { ...row, ciphertext: Buffer.from("tampered").toString("base64") },
    ],
  ])
    assert.throws(() => newVault.open(...args));
  assert.notEqual(
    oldVault.seal(context, id, "secret-fixture").nonce,
    row.nonce,
  );
});
async function refreshFixture(transport) {
  const store = new Store();
  store.row.status = "connected";
  const value = {
    accessToken: "old-access",
    refreshToken: "old-refresh",
    accessExpiresAt: new Date(Date.now() - 1).toISOString(),
    refreshExpiresAt: new Date(Date.now() + 999999).toISOString(),
    scopes: config.scopes,
  };
  const cipher = vault.seal(context, store.row.id, JSON.stringify(value));
  store.row.credential_reference = cipher.id;
  store.envelopes.set(cipher.id, cipher);
  return {
    store,
    reference: cipher.id,
    tokens: new ShopifyTokenStore(
      context,
      store.row.id,
      store,
      vault,
      config,
      transport,
    ),
  };
}
test("refresh rotates both tokens once under concurrent reads; losing request fails closed", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  let calls = 0;
  const { store, reference, tokens } = await refreshFixture(
    async (url, init) => {
      calls++;
      assert.equal(
        new URLSearchParams(init.body).get("grant_type"),
        "refresh_token",
      );
      await gate;
      return Response.json(tokenResponse());
    },
  );
  const read = () =>
    tokens.withSecret(
      context.organizationId,
      reference,
      "integration:shopify",
      async (token) => token,
    );
  const first = read();
  await new Promise((r) => setImmediate(r));
  await assert.rejects(read(), { code: "REFRESH_IN_PROGRESS" });
  release();
  assert.equal(await first, "TEST_ONLY_ACCESS_TOKEN");
  assert.equal(await read(), "TEST_ONLY_ACCESS_TOKEN");
  assert.equal(calls, 1);
  assert.deepEqual(store.events, ["refreshed"]);
});
test("refresh failure redacts transport errors and prevents callback; purpose/tenant mismatch never decrypt", async () => {
  const { store, reference, tokens } = await refreshFixture(async () => {
    throw new Error("TEST_ONLY_REFRESH_TOKEN");
  });
  let used = false;
  await assert.rejects(
    tokens.withSecret(
      context.organizationId,
      reference,
      "integration:shopify",
      async () => (used = true),
    ),
    (error) =>
      error.code === "TOKEN_REFRESH_FAILED" &&
      !error.message.includes("TEST_ONLY"),
  );
  assert.equal(used, false);
  assert.equal(store.row.connection_health, "TOKEN_REFRESH_FAILED");
  await assert.rejects(
    tokens.withSecret(
      "other",
      reference,
      "integration:shopify",
      async () => {},
    ),
  );
  await assert.rejects(
    tokens.withSecret(
      context.organizationId,
      reference,
      "ai:openai",
      async () => {},
    ),
  );
});
test("disconnect during refresh fences credential rotation and prevents the access-token callback", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  const { store, reference, tokens } = await refreshFixture(async () => {
    await gate;
    return Response.json(tokenResponse());
  });
  let used = false;
  const running = tokens.withSecret(
    context.organizationId,
    reference,
    "integration:shopify",
    async () => (used = true),
  );
  await new Promise((r) => setImmediate(r));
  await store.disconnect();
  release();
  await assert.rejects(running);
  assert.equal(used, false);
  assert.equal(store.envelopes.size, 0);
  assert.equal(store.row.status, "revoked");
});
test("webhook raw-body signature rejects altered body, malformed signatures and supports secret rotation", () => {
  const raw = Buffer.from('{"shop_domain":"fixture.myshopify.com"}'),
    sig = createHmac("sha256", config.clientSecret)
      .update(raw)
      .digest("base64");
  assert.equal(
    verifyWebhook(raw, sig, ["new-secret", config.clientSecret]),
    true,
  );
  assert.equal(
    verifyWebhook(Buffer.from("{}"), sig, [config.clientSecret]),
    false,
  );
  assert.equal(verifyWebhook(raw, "bad", [config.clientSecret]), false);
});
test("token response expiries are taken from Shopify, not assumed; malformed and nonexpiring responses rejected", async () => {
  const result = await requestTokens(
    config,
    shop,
    { code: "test" },
    async () =>
      Response.json({
        ...tokenResponse(),
        expires_in: 123,
        refresh_token_expires_in: 987,
      }),
    0,
  );
  assert.equal(result.accessExpiresAt, new Date(123000).toISOString());
  assert.equal(result.refreshExpiresAt, new Date(987000).toISOString());
  await assert.rejects(
    requestTokens(config, shop, { code: "test" }, async () =>
      Response.json({ access_token: "test", scope: config.scopes.join(",") }),
    ),
  );
});
test("GraphQL throttling and permission errors discard partial data, without retry or secret leakage", async () => {
  for (const [code, expected] of [
    ["THROTTLED", "SHOPIFY_THROTTLED"],
    ["ACCESS_DENIED", "SCOPE_REQUIRED"],
  ]) {
    let calls = 0;
    const adapter = new ShopifyAdapter(
      context,
      "id",
      {
        get: async () => ({
          id: "id",
          organizationId: context.organizationId,
          status: "connected",
          shopDomain: shop,
          grantedScopes: config.scopes,
          credentialReference: "ref",
        }),
      },
      {
        persistence: "durable",
        withSecret: async (org, ref, purpose, consumeSecret) =>
          consumeSecret("secret"),
      },
      async () => {
        calls++;
        return Response.json({
          data: { products: { nodes: [] } },
          errors: [{ message: "secret", extensions: { code } }],
          extensions: { cost: { throttleStatus: { currentlyAvailable: 0 } } },
        });
      },
    );
    await assert.rejects(
      adapter.executeRead({ tool: "listProducts", input: { first: 20 } }),
      (e) => e.code === expected && !e.message.includes("secret"),
    );
    assert.equal(calls, 1);
  }
});
test("webhook endpoint authenticates before persistence, minimizes privacy data, handles email-only customers and keeps later identical events distinct", async () => {
  const original = process.env.SHOPIFY_CLIENT_SECRET;
  process.env.SHOPIFY_CLIENT_SECRET = config.clientSecret;
  const recorded = [];
  mocks.set(path.resolve("lib/server/db/client.ts"), {
    persistenceClient: () => ({
      rpc: async (name, args) => {
        recorded.push({ name, args });
        return { error: null };
      },
    }),
  });
  const { webhook } = load("lib/server/shopify/webhook.ts");
  function request(
    value,
    topic = "customers/redact",
    timestamp = new Date(Date.now() - 1000).toISOString(),
    headers = {},
  ) {
    const body = JSON.stringify(value);
    return new Request(
      "https://app.example/api/integrations/shopify/webhooks",
      {
        method: "POST",
        headers: {
          "x-shopify-topic": topic,
          "x-shopify-shop-domain": shop,
          "x-shopify-triggered-at": timestamp,
          "x-shopify-hmac-sha256": createHmac("sha256", config.clientSecret)
            .update(body)
            .digest("base64"),
          ...headers,
        },
        body,
      },
    );
  }
  try {
    const payload = {
      shop_domain: shop,
      customer: {
        id: 123,
        email: "private@example.test",
        phone: "secret-number",
      },
      orders_to_redact: [45],
    };
    assert.equal(
      (
        await webhook(
          request(payload, undefined, undefined, {
            "x-shopify-hmac-sha256": "invalid",
          }),
        )
      ).status,
      401,
    );
    assert.equal(recorded.length, 0);
    assert.equal(
      (
        await webhook(
          request(payload, undefined, undefined, {
            "x-shopify-shop-domain": "other.myshopify.com",
          }),
        )
      ).status,
      400,
    );
    assert.equal(recorded.length, 0);
    assert.equal((await webhook(request(payload))).status, 200);
    assert.deepEqual(recorded[0].args.identifiers, {
      customer_id: "123",
      order_ids: ["45"],
    });
    assert.equal(JSON.stringify(recorded).includes("private@"), false);
    assert.equal(
      (
        await webhook(
          request({
            shop_domain: shop,
            customer: { email: "private@example.test" },
            orders_to_redact: [],
          }),
        )
      ).status,
      200,
    );
    assert.equal(recorded[1].args.identifiers.no_customer_id, true);
    const event = { myshopify_domain: shop, id: 123 };
    const time = new Date(Date.now() - 1000).toISOString();
    await webhook(request(event, "app/uninstalled", time));
    await webhook(request(event, "app/uninstalled", time));
    assert.equal(recorded[2].args.delivery, recorded[3].args.delivery);
    await webhook(request(event, "app/uninstalled", new Date().toISOString()));
    assert.notEqual(recorded[2].args.delivery, recorded[4].args.delivery);
  } finally {
    if (original === undefined) delete process.env.SHOPIFY_CLIENT_SECRET;
    else process.env.SHOPIFY_CLIENT_SECRET = original;
  }
});
test("configured management HTTP rejects forged tenants, cross-origin, excessive body and unauthenticated reads; disconnect works without Shopify configuration", async () => {
  const { BackendError } = load("lib/server/errors.ts");
  let verified = true,
    disconnected = 0,
    starts = 0;
  const cookieWrites = [];
  mocks.set("next/headers", {
    cookies: async () => ({
      get: () => undefined,
      set: (...args) => cookieWrites.push(args),
    }),
  });
  mocks.set(path.resolve("lib/server/auth/context.ts"), {
    requireWorkspace: async () => {
      if (!verified) throw new BackendError("NOT_AUTHENTICATED", "Sign in.");
      return context;
    },
  });
  mocks.set(path.resolve("lib/server/security/rate-limit.ts"), {
    rateLimiter: { consume: async () => {} },
  });
  mocks.set(path.resolve("lib/server/shopify/config.ts"), {
    shopifyConfig: () => config,
  });
  mocks.set(path.resolve("lib/server/shopify/service.ts"), {
    connectionService: () => ({
      begin: async () => {
        starts++;
        return {
          url: `https://${shop}/admin/oauth/authorize`,
          state: "a".repeat(64),
        };
      },
    }),
    liveShopify: async () => ({
      read: async () => ({
        receipt: { status: "succeeded", data: { name: "Fixture" } },
      }),
    }),
  });
  mocks.set(path.resolve("lib/server/shopify/store.ts"), {
    PostgresShopifyStore: class {
      async disconnect() {
        disconnected++;
      }
    },
  });
  const { connect, disconnect, read } = load("lib/server/shopify/http.ts");
  const request = (body, origin = config.appOrigin) =>
    new Request("https://app.example/api/integrations/shopify/connect", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: context.organizationId,
        businessId: context.businessId,
        generation: 0,
        ...(typeof body.shop === "string" ? { replace: false } : {}),
        ...body,
      }),
    });
  assert.equal(
    (await connect(request({ shop, organizationId: "forged" }))).status,
    403,
  );
  assert.equal(starts, 0);
  assert.equal(
    (await connect(request({ shop, businessId: randomUUID() }))).status,
    403,
  );
  assert.equal((await connect(request({ shop, generation: -1 }))).status, 400);
  assert.equal(
    (await connect(request({ shop }, "https://evil.example"))).status,
    403,
  );
  assert.equal(starts, 0);
  assert.equal(
    (await connect(request({ shop: "x".repeat(4000) }))).status,
    400,
  );
  assert.equal(starts, 0);
  verified = false;
  assert.equal((await connect(request({ shop }))).status, 401);
  assert.equal(
    (await read(request({ tool: "getStore", input: {} }))).status,
    401,
  );
  assert.equal(starts, 0);
  verified = true;
  assert.equal((await connect(request({ shop }))).status, 200);
  assert.equal(starts, 1);
  assert.equal(cookieWrites[0][2].httpOnly, true);
  assert.equal(cookieWrites[0][2].secure, true);
  assert.equal(cookieWrites[0][2].sameSite, "lax");
  const previous = process.env.APP_BASE_URL;
  process.env.APP_BASE_URL = config.appOrigin;
  try {
    assert.equal((await disconnect(request({ confirm: false }))).status, 400);
    assert.equal(disconnected, 0);
    assert.equal(
      (await disconnect(request({ confirm: "disconnect" }))).status,
      200,
    );
    assert.equal(disconnected, 1);
  } finally {
    if (previous === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previous;
  }
});
test("production activation requires HTTPS, exact callback, read-only scopes and managed versioned keys", () => {
  const keys = [
    "NODE_ENV",
    "APP_BASE_URL",
    "SHOPIFY_CLIENT_ID",
    "SHOPIFY_CLIENT_SECRET",
    "SHOPIFY_REDIRECT_URI",
    "SHOPIFY_SCOPES",
    "SHOPIFY_VAULT_KEYS",
    "SHOPIFY_VAULT_ACTIVE_KEY",
    "SHOPIFY_VAULT_KEY_SOURCE",
  ];
  const original = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const file = path.resolve("lib/server/shopify/config.ts"),
    mock = mocks.get(file);
  mocks.delete(file);
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      APP_BASE_URL: config.appOrigin,
      SHOPIFY_CLIENT_ID: config.clientId,
      SHOPIFY_CLIENT_SECRET: config.clientSecret,
      SHOPIFY_REDIRECT_URI: config.redirectUri,
      SHOPIFY_SCOPES: config.scopes.join(","),
      SHOPIFY_VAULT_KEYS: JSON.stringify({
        v1: randomBytes(32).toString("base64"),
      }),
      SHOPIFY_VAULT_ACTIVE_KEY: "v1",
    });
    delete process.env.SHOPIFY_VAULT_KEY_SOURCE;
    const { shopifyConfigured } = load(file);
    assert.equal(shopifyConfigured(), false);
    process.env.SHOPIFY_VAULT_KEY_SOURCE = "managed-secret-store";
    assert.equal(shopifyConfigured(), true);
    process.env.SHOPIFY_SCOPES += "write_products";
    assert.equal(shopifyConfigured(), false);
    process.env.SHOPIFY_SCOPES = config.scopes.join(",");
    process.env.SHOPIFY_REDIRECT_URI =
      "https://evil.example/api/integrations/shopify/callback";
    assert.equal(shopifyConfigured(), false);
    process.env.SHOPIFY_REDIRECT_URI = config.redirectUri;
    process.env.APP_BASE_URL = "http://localhost:5000";
    assert.equal(shopifyConfigured(), false);
    process.env.APP_BASE_URL = config.appOrigin;
    process.env.SHOPIFY_VAULT_KEYS = JSON.stringify({ v1: "weak" });
    assert.equal(shopifyConfigured(), false);
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    if (mock) mocks.set(file, mock);
  }
});

test("a consumed OAuth attempt for another business is rejected before token exchange", async () => {
  const store = new Store();
  const original = store.consume.bind(store);
  store.consume = async (...args) => ({
    ...(await original(...args)),
    businessId: randomUUID(),
  });
  let exchanges = 0;
  const service = new ShopifyConnectionService(
    context,
    store,
    config,
    vault,
    async () => {
      exchanges++;
      throw Error("must not contact Shopify");
    },
  );
  const { state } = await service.begin(shop);
  await assert.rejects(
    service.complete(signed(state), state),
    (e) => e.code === "INVALID_STATE",
  );
  assert.equal(exchanges, 0);
});

test("cross-site GET callback keeps verified identity, durable state, encryption and safe redirects", async () => {
  const { BackendError } = load("lib/server/errors.ts");
  const logs = [],
    originalWarn = console.warn;
  console.warn = (...args) => logs.push(args);
  try {
    for (const scenario of [
      "success",
      "switch_business",
      "query_business_ignored",
      "access_removed",
      "invalid_state",
      "expired",
      "replayed",
      "wrong_shop",
      "hmac",
      "missing_cookie",
      "missing_session",
      "missing_schema",
      "forged_context",
    ]) {
      const { service, store, calls } = flow();
      const { state } = await service.begin(shop);
      const succeeds = [
        "success",
        "switch_business",
        "query_business_ignored",
      ].includes(scenario);
      const selected = [];
      let params = signed(state);
      if (scenario === "query_business_ignored")
        params = signed(state, {
          businessId: randomUUID(),
          organizationId: randomUUID(),
        });
      if (scenario === "invalid_state") params = signed("b".repeat(64));
      if (scenario === "expired")
        store.states.get(digestState(state)).expiresAt = new Date(
          0,
        ).toISOString();
      if (scenario === "replayed")
        await store.consume(digestState(state), shop);
      if (scenario === "wrong_shop")
        params = signed(state, { shop: "other.myshopify.com" });
      if (scenario === "hmac") params.set("hmac", "0".repeat(64));
      // Even valid HMAC query parameters cannot supply an organization/business.
      if (scenario === "forged_context") {
        params = signed(state, {
          organizationId: context.organizationId,
          businessId: context.businessId,
        });
        store.states.get(digestState(state)).businessId = randomUUID();
      }
      const cookieWrites = [];
      mocks.set("next/headers", {
        cookies: async () => ({
          get: () =>
            scenario === "missing_cookie" ? undefined : { value: state },
          set: (...args) => cookieWrites.push(args),
        }),
      });
      mocks.set(path.resolve("lib/server/auth/context.ts"), {
        requireUser: async () => {
          if (scenario === "missing_session")
            throw new BackendError("NOT_AUTHENTICATED", "PRIVATE_SESSION");
          return { id: context.actorId };
        },
        requireWorkspace: async () => {
          throw new Error("Must not read the active business cookie");
        },
        resolveWorkspace: async (org, biz) =>
          scenario === "access_removed" ||
          org !== context.organizationId ||
          biz !== context.businessId
            ? null
            : context,
        selectWorkspace: async (org, biz) => selected.push({ org, biz }),
      });
      mocks.set(path.resolve("lib/server/db/client.ts"), {
        databaseError: (error) => {
          if (error) throw new Error("DATABASE_UNAVAILABLE");
        },
        persistenceClient: () => ({
          rpc: async (name, args) => {
            assert.equal(name, "shopify_oauth_context");
            assert.equal(args.actor, context.actorId);
            const row = store.states.get(args.state_digest);
            if (args.operation === "cancel") {
              if (row && (!row.used || Date.parse(row.expiresAt) <= Date.now()))
                store.states.delete(args.state_digest);
              return { data: null, error: null };
            }
            return {
              data:
                row && !row.used
                  ? {
                      organizationId: row.organizationId,
                      businessId: row.businessId,
                      actorId: row.actorId,
                    }
                  : null,
              error: null,
            };
          },
        }),
      });
      cache.delete(path.resolve("lib/server/shopify/attempt.ts"));
      mocks.set(path.resolve("lib/server/readiness.ts"), {
        getBackendStatus: async (_transport, verify) => {
          try {
            await verify();
          } catch {
            return {
              liveConnectionsEnabled: false,
              blockers: ["SUPABASE_AUTH_UNAVAILABLE"],
            };
          }
          return {
            liveConnectionsEnabled: scenario !== "missing_schema",
            blockers:
              scenario === "missing_schema"
                ? ["COMMERCE_MIGRATION_005_REQUIRED"]
                : [],
          };
        },
      });
      mocks.set(path.resolve("lib/server/shopify/service.ts"), {
        connectionService: (verified) => {
          assert.deepEqual(verified, context);
          return service;
        },
      });
      cache.delete(path.resolve("lib/server/shopify/http.ts"));
      const { callback } = load("lib/server/shopify/http.ts");
      const request = new Request(`${config.redirectUri}?${params}`, {
        headers: {
          "sec-fetch-site": "cross-site",
          "sec-fetch-mode": "navigate",
        },
      });
      const response = await callback(request);
      assert.equal(response.status, 303, scenario);
      assert.equal(
        response.headers.get("location"),
        `/integrations?shopify=${succeeds ? "connected" : "failed"}`,
        scenario,
      );
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("referrer-policy"), "no-referrer");
      assert.equal(await response.text(), "");
      if (["missing_cookie", "invalid_state"].includes(scenario))
        assert.equal(cookieWrites.length, 0);
      else {
        assert.equal(cookieWrites.at(-1)[2].maxAge, 0);
        assert.equal(cookieWrites.at(-1)[2].secure, true);
      }
      assert.equal(calls.length, succeeds ? 2 : 0, scenario);
      if (succeeds) {
        assert.deepEqual(selected, [
          { org: context.organizationId, biz: context.businessId },
        ]);
        assert.equal(store.row.status, "connected");
        assert.equal(store.row.business_id, context.businessId);
        assert.equal(
          JSON.stringify([...store.envelopes]).includes(
            "TEST_ONLY_ACCESS_TOKEN",
          ),
          false,
        );
      }
      if (
        ["expired", "hmac", "wrong_shop", "access_removed"].includes(scenario)
      )
        assert.equal(store.states.has(digestState(state)), false);
      if (scenario === "invalid_state")
        assert.equal(store.states.has(digestState(state)), true);
      assert.equal(JSON.stringify(logs).includes(state), false);
    }
    for (const secret of [
      "fixture_code",
      "TEST_ONLY_ACCESS_TOKEN",
      "TEST_ONLY_REFRESH_TOKEN",
      "PRIVATE_SESSION",
      config.clientSecret,
    ])
      assert.equal(JSON.stringify(logs).includes(secret), false);
  } finally {
    console.warn = originalWarn;
  }
});
