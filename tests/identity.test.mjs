import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const ids = {
  user: "11111111-1111-4111-8111-111111111111",
  org: "22222222-2222-4222-8222-222222222222",
  biz: "33333333-3333-4333-8333-333333333333",
  other: "44444444-4444-4444-8444-444444444444",
};
function harness({
  user = true,
  role = "member",
  jar = {},
  dbError = false,
  membership = true,
  confirmed = true,
  anonymous = false,
  businesses = [ids.biz],
  auditError = false,
} = {}) {
  const writes = [];
  const client = {
    rpc: async () => ({
      data: ids.biz,
      error: auditError ? { code: "XX000" } : null,
    }),
    auth: {
      getUser: async () => ({
        data: {
          user: user
            ? {
                id: ids.user,
                email: "fixture@example.test",
                email_confirmed_at: confirmed ? "2026-09-24T00:00:00Z" : null,
                is_anonymous: anonymous,
              }
            : null,
        },
        error: null,
      }),
    },
    from(table) {
      const filters = {};
      const query = {
        select() {
          return query;
        },
        eq(k, v) {
          filters[k] = v;
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return query;
        },
        async maybeSingle() {
          if (dbError)
            return {
              data: null,
              error: { code: "XX000", message: "raw SQL SECRET" },
            };
          if (table === "organization_members")
            return {
              data:
                !membership ||
                (filters.organization_id && filters.organization_id !== ids.org)
                  ? null
                  : { organization_id: ids.org, role },
              error: null,
            };
          return {
            data:
              filters.organization_id === ids.org &&
              (!filters.id || businesses.includes(filters.id))
                ? { id: filters.id || businesses[0] }
                : null,
            error: null,
          };
        },
      };
      return query;
    },
  };
  const cookieStore = {
    get: (k) => (jar[k] ? { value: jar[k] } : undefined),
    set: (...args) => {
      writes.push(args);
      jar[args[0]] = args[1];
    },
  };
  const mocks = {
    "server-only": {},
    react: { cache: (fn) => fn },
    "next/headers": { cookies: async () => cookieStore },
    "next/navigation": {
      redirect: (to) => {
        throw new Error(`REDIRECT:${to}`);
      },
    },
    "@/lib/supabase/config": { supabaseConfig: () => ({}) },
    "../db/client": {
      sessionClient: async () => client,
      databaseError: (error) => {
        if (error) throw new Error("DATABASE_UNAVAILABLE");
      },
    },
  };
  const modules = new Map();
  function load(file) {
    file = path.resolve(file);
    if (modules.has(file)) return modules.get(file);
    const mod = { exports: {} };
    const text = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    new Function("require", "module", "exports", text)(
      (id) =>
        id in mocks
          ? mocks[id]
          : load(path.resolve(path.dirname(file), id) + ".ts"),
      mod,
      mod.exports,
    );
    modules.set(file, mod.exports);
    return mod.exports;
  }
  return { ...load("lib/server/auth/context.ts"), writes };
}
test("production context derives actor and role from verified user and stored membership", async () => {
  const h = harness();
  const context = await h.requireWorkspace();
  assert.deepEqual(context, {
    organizationId: ids.org,
    businessId: ids.biz,
    actorId: ids.user,
    role: "member",
    source: "live",
  });
});
test("workspace switching validates both membership and business ownership before setting cookies", async () => {
  const h = harness();
  await assert.rejects(
    h.selectWorkspace(ids.other, ids.biz),
    (e) => e.code === "ORGANIZATION_NOT_FOUND",
  );
  await assert.rejects(h.selectWorkspace(ids.org, ids.other));
  assert.equal(h.writes.length, 0);
  await h.selectWorkspace(ids.org, ids.biz);
  assert.equal(h.writes.length, 2);
  assert.equal(h.writes[0][2].httpOnly, true);
  assert.equal(h.writes[0][2].sameSite, "lax");
});
test("forged or stale workspace cookie cannot grant access; invalid role fails closed", async () => {
  const h = harness({
    jar: { "anti-nerd-workspace": ids.other, "anti-nerd-business": ids.other },
  });
  assert.equal((await h.requireWorkspace()).organizationId, ids.org);
  const invalid = harness({ jar: { "anti-nerd-workspace": "') or true --" } });
  assert.equal((await invalid.requireWorkspace()).actorId, ids.user);
  await assert.rejects(harness({ role: "superadmin" }).requireWorkspace());
});
test("unauthenticated protected page redirects and server mutations have no context", async () => {
  const h = harness({ user: false });
  await assert.rejects(h.pageWorkspace(), /REDIRECT:\/login/);
  await assert.rejects(
    h.requireWorkspace(),
    (e) => e.code === "NOT_AUTHENTICATED",
  );
});
test("database failure cannot silently downgrade to a mock tenant or expose internals", async () => {
  await assert.rejects(
    harness({ dbError: true }).requireWorkspace(),
    (error) =>
      error.message === "DATABASE_UNAVAILABLE" &&
      !error.message.includes("SECRET"),
  );
});

test("authenticated first-time users go to onboarding; unverified/anonymous sessions are rejected", async () => {
  await assert.rejects(
    harness({ membership: false }).pageWorkspace(),
    /REDIRECT:\/onboarding/,
  );
  for (const options of [{ confirmed: false }, { anonymous: true }])
    await assert.rejects(
      harness(options).requireWorkspace(),
      (e) => e.code === "NOT_AUTHENTICATED",
    );
});

test("a user can switch back and forth between two businesses in one organization", async () => {
  const h = harness({ businesses: [ids.biz, ids.other] });
  for (const business of [ids.biz, ids.other, ids.biz]) {
    await h.selectWorkspace(ids.org, business);
    const selected = await h.requireWorkspace();
    assert.equal(selected.organizationId, ids.org);
    assert.equal(selected.businessId, business);
    assert.equal(selected.actorId, ids.user);
  }
});
test("failed durable business-selection audit cannot update active context cookies", async () => {
  const h = harness({ auditError: true });
  await assert.rejects(
    h.selectWorkspace(ids.org, ids.biz),
    /DATABASE_UNAVAILABLE/,
  );
  assert.equal(h.writes.length, 0);
});
