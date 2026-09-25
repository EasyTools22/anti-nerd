import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const mocks = new Map();
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
      mocks.has(id)
        ? mocks.get(id)
        : id === "server-only"
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

const { getBackendStatus } = load("lib/server/readiness.ts");
const env = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
  SUPABASE_SECRET_KEY: "sb_secret_fixture",
  APP_BASE_URL: "https://app.example",
  SHOPIFY_CLIENT_ID: "fixture-client",
  SHOPIFY_CLIENT_SECRET: "fixture-shopify-secret",
  SHOPIFY_SCOPES: "read_products,read_orders,read_customers,read_inventory",
  SHOPIFY_REDIRECT_URI: "https://app.example/api/integrations/shopify/callback",
  SHOPIFY_VAULT_KEYS: JSON.stringify({
    v1: Buffer.alloc(32, 7).toString("base64"),
  }),
  SHOPIFY_VAULT_ACTIVE_KEY: "v1",
  SHOPIFY_VAULT_KEY_SOURCE: "managed-secret-store",
};
const schema = {
  version: 1,
  ready: true,
  migrations: { "001": true, "002": true, "003": true },
  rls: true,
  permissions: true,
  columns: true,
};
function transport(overrides = {}) {
  return async (url, options) => {
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    assert.ok(options.signal);
    if (new URL(url).pathname === "/auth/v1/settings")
      return Response.json(overrides.auth ?? { external: { email: true } }, {
        status: overrides.authStatus ?? 200,
      });
    assert.equal(new URL(url).pathname, "/rest/v1/rpc/backend_readiness");
    assert.equal(options.body, "{}");
    return Response.json(overrides.schema ?? schema, {
      status: overrides.schemaStatus ?? 200,
    });
  };
}
async function withEnv(changes, run) {
  const before = Object.fromEntries(
    Object.keys(env).map((k) => [k, process.env[k]]),
  );
  try {
    for (const [k, v] of Object.entries({ ...env, ...changes })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    return await run();
  } finally {
    for (const [k, v] of Object.entries(before)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}
test("complete production dependencies permit read-only connections without exposing credentials", async () =>
  withEnv({}, async () => {
    const result = await getBackendStatus(transport());
    assert.equal(result.phase, "shopify_read_only");
    assert.equal(result.liveConnectionsEnabled, true);
    assert.equal(result.previewAvailable, false);
    assert.deepEqual(result.blockers, []);
    for (const key of [
      "authentication",
      "persistence",
      "shopifyConfiguration",
      "credentialVault",
    ])
      assert.equal(result[key], "configured");
    const encoded = JSON.stringify(result);
    for (const key of [
      "SUPABASE_SECRET_KEY",
      "SHOPIFY_CLIENT_SECRET",
      "SHOPIFY_VAULT_KEYS",
      "NEXT_PUBLIC_SUPABASE_URL",
    ])
      assert.equal(encoded.includes(env[key]), false);
  }));
test("missing Supabase configuration blocks connections independently of valid Shopify and vault", async () => {
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
  ])
    await withEnv({ [key]: undefined }, async () => {
      const result = await getBackendStatus(transport());
      assert.equal(result.liveConnectionsEnabled, false);
      assert.equal(result.shopifyConfiguration, "configured");
    });
});
test("missing schema, missing readiness RPC, insecure RLS and invalid replies fail closed", async () =>
  withEnv({}, async () => {
    for (const overrides of [
      { schema: { code: "PGRST202" }, schemaStatus: 404 },
      { schema: { ...schema, ready: false } },
      { schema: { ...schema, rls: false } },
      {
        schema: {
          ...schema,
          migrations: { "001": true, "002": true, "003": false },
        },
      },
      { schema: { ...schema, permissions: false } },
      { schema: { ready: true } },
      { schemaStatus: 401 },
    ]) {
      const result = await getBackendStatus(transport(overrides));
      assert.equal(result.persistence, "pending");
      assert.equal(result.liveConnectionsEnabled, false);
    }
    const missing = await getBackendStatus(
      transport({ schema: { code: "PGRST202" }, schemaStatus: 404 }),
    );
    assert.ok(missing.blockers.includes("READINESS_MIGRATION_004_REQUIRED"));
  }));
test("Shopify credentials, HTTPS/scopes and production vault conditions independently gate readiness", async () => {
  for (const changes of [
    { SHOPIFY_CLIENT_ID: undefined },
    { SHOPIFY_CLIENT_SECRET: undefined },
    { APP_BASE_URL: "http://app.example" },
    { SHOPIFY_SCOPES: "write_products" },
    { SHOPIFY_VAULT_KEYS: "invalid secret payload" },
    { SHOPIFY_VAULT_ACTIVE_KEY: "missing" },
    { SHOPIFY_VAULT_KEY_SOURCE: undefined },
  ])
    await withEnv(changes, async () => {
      const result = await getBackendStatus(transport());
      assert.equal(result.liveConnectionsEnabled, false);
      assert.equal(result.persistence, "configured");
      assert.equal(result.authentication, "configured");
    });
});
test("auth failure and transport failures never leak error payloads or downgrade to mock", async () =>
  withEnv({}, async () => {
    for (const fetcher of [
      transport({ authStatus: 401, auth: { error: "PRIVATE_ERROR" } }),
      transport({ auth: { external: { email: false } } }),
      async () => {
        throw new Error("PRIVATE_ERROR " + env.SUPABASE_SECRET_KEY);
      },
    ]) {
      const result = await getBackendStatus(fetcher);
      assert.equal(result.liveConnectionsEnabled, false);
      assert.equal(result.authentication, "pending");
      assert.equal(JSON.stringify(result).includes("PRIVATE_ERROR"), false);
    }
  }));
test("Shopify route gates never call execution on failed readiness; complete readiness delegates to real HTTP", async () => {
  let allowed = false,
    calls = 0;
  mocks.set("@/lib/server/readiness", {
    getBackendStatus: async () => ({
      liveConnectionsEnabled: allowed,
      blockers: ["FIXTURE_NOT_READY"],
    }),
  });
  mocks.set("@/lib/server/shopify/http", {
    connect: async () => {
      calls++;
      return new Response(null, { status: 401 });
    },
    callback: async () => {
      calls++;
      return new Response(null, { status: 303 });
    },
    read: async () => {
      calls++;
      return new Response(null, { status: 401 });
    },
  });
  const request = new Request("https://app.example", {
    method: "POST",
    body: "{}",
  });
  for (const action of ["connect", "callback", "read"]) {
    const route = load(`app/api/integrations/shopify/${action}/route.ts`);
    const handler = route.POST ?? route.GET;
    const response = await handler(request);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(calls, 0);
  allowed = true;
  assert.equal(
    (await load("app/api/integrations/shopify/connect/route.ts").POST(request))
      .status,
    401,
  );
  assert.equal(calls, 1);
});
test("production composition imports real repositories and adapter, with no mock or AI runtime dependency", () => {
  const visited = new Set();
  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /new Mock|from ["'][^"']*mock-|from ["'][^"']*foundation/,
    );
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    for (const node of ast.statements)
      if (
        ts.isImportDeclaration(node) &&
        !node.importClause?.isTypeOnly &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const id = node.moduleSpecifier.text;
        if (!id.startsWith(".") && !id.startsWith("@/")) continue;
        const dep = id.startsWith("@/")
          ? path.resolve(id.slice(2) + ".ts")
          : path.resolve(path.dirname(file), id + ".ts");
        visit(dep);
      }
  }
  visit(path.resolve("lib/server/shopify/service.ts"));
  assert.ok(visited.has(path.resolve("lib/server/db/repositories.ts")));
  assert.ok(visited.has(path.resolve("lib/server/integrations/shopify.ts")));
  assert.ok(visited.has(path.resolve("lib/server/shopify/vault.ts")));
});
