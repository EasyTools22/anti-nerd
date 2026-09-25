import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const owner = randomUUID(),
  other = randomUUID(),
  member = randomUUID(),
  viewer = randomUUID(),
  admin = randomUUID();
let orgA, orgB, bizA, bizB;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
async function asUser(id, run) {
  await db.exec("set role authenticated");
  await q("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  try {
    return await run();
  } finally {
    await db.exec("reset role");
  }
}
async function workspace(actor, name) {
  return asUser(
    actor,
    async () =>
      (
        await q("select public.create_workspace($1,$1,'ecommerce') id", [name])
      )[0].id,
  );
}
before(async () => {
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; alter default privileges in schema public grant all on tables to anon,authenticated,service_role; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,service_role; grant execute on function auth.uid() to authenticated,service_role;`,
  );
  for (const name of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync(`supabase/migrations/${name}`, "utf8"));
  for (const id of [owner, other, member, viewer, admin])
    await q("insert into auth.users values($1)", [id]);
  orgA = await workspace(owner, "Organization A");
  orgB = await workspace(other, "Organization B");
  bizA = (
    await q("select id from public.businesses where organization_id=$1", [orgA])
  )[0].id;
  bizB = (
    await q("select id from public.businesses where organization_id=$1", [orgB])
  )[0].id;
  for (const [id, role] of [
    [member, "member"],
    [viewer, "viewer"],
    [admin, "admin"],
  ])
    await q(
      "insert into public.organization_members(organization_id,user_id,role) values($1,$2,$3)",
      [orgA, id, role],
    );
});
after(() => db.close());
test("migrations create organizations separately from users and businesses; no role escalation", async () => {
  await asUser(owner, async () => {
    assert.equal((await q("select * from public.organizations")).length, 1);
    assert.equal((await q("select * from public.businesses"))[0].id, bizA);
    await assert.rejects(
      q(
        "update public.organization_members set role='owner' where user_id=$1",
        [member],
      ),
    );
    await assert.rejects(
      q("insert into public.organization_members values($1,$2,'owner',now())", [
        orgB,
        owner,
      ]),
    );
  });
  await asUser(other, async () =>
    assert.equal((await q("select * from public.organizations"))[0].id, orgB),
  );
});
test("RLS isolates every tenant-owned table and denies direct browser writes", async () => {
  const tables = [
    "organizations",
    "organization_members",
    "businesses",
    "provider_connections",
    "integration_connections",
    "organization_policies",
    "actions",
    "approvals",
    "audit_events",
    "business_instructions",
  ];
  await asUser(owner, async () => {
    for (const table of tables) {
      const column = table === "organizations" ? "id" : "organization_id";
      assert.equal(
        (await q(`select * from public.${table} where ${column}=$1`, [orgB]))
          .length,
        0,
      );
      await assert.rejects(
        q(`delete from public.${table} where ${column}=$1`, [orgB]),
      );
    }
  });
  await db.exec("set role anon");
  try {
    await assert.rejects(q("select * from public.organizations"));
    await assert.rejects(
      q("select public.create_workspace('x','x','ecommerce')"),
    );
  } finally {
    await db.exec("reset role");
  }
});
test("instructions persist; member/admin can edit, viewer cannot, cross-tenant and cross-business writes fail", async () => {
  const save = (org, biz, id = null) =>
    q(
      "select public.save_instruction($1,$2,$3,'Keep margins healthy',5,true) id",
      [org, biz, id],
    );
  const id = await asUser(member, async () => (await save(orgA, bizA))[0].id);
  await asUser(admin, async () =>
    assert.equal((await save(orgA, bizA, id))[0].id, id),
  );
  await asUser(viewer, () => assert.rejects(save(orgA, bizA)));
  await asUser(other, async () => {
    assert.equal(
      (await q("select * from public.business_instructions where id=$1", [id]))
        .length,
      0,
    );
    await assert.rejects(save(orgA, bizA, id));
  });
  await asUser(owner, () => assert.rejects(save(orgA, bizB)));
});
test("owner-only durable policies use optimistic revision; invalid limits fail", async () => {
  const set = (who, org, rev, mode = "ASK_FIRST", limits = null) =>
    asUser(who, () =>
      q("select public.set_policy($1,'products.price.write',$2,$3,$4) rev", [
        org,
        mode,
        limits,
        rev,
      ]),
    );
  await assert.rejects(set(member, orgA, 1));
  await assert.rejects(set(admin, orgA, 1));
  await assert.rejects(set(viewer, orgA, 1));
  await assert.rejects(set(owner, orgB, 1));
  assert.equal((await set(owner, orgA, 1))[0].rev, 2);
  await assert.rejects(set(owner, orgA, 1));
  await assert.rejects(set(owner, orgA, 2, "AUTOMATIC_WITH_LIMITS", null));
  await asUser(owner, async () => {
    const snapshot = (await q("select public.policy_snapshot($1) p", [orgA]))[0]
      .p;
    assert.equal(snapshot.revision, 2);
    assert.equal(snapshot.rules["products.price.write"].mode, "ASK_FIRST");
  });
});
async function actionFixture({
  org = orgA,
  actor = owner,
  biz = bizA,
  expired = false,
  rev,
} = {}) {
  const action = randomUUID(),
    approval = randomUUID(),
    fp = "a".repeat(64),
    revision =
      rev ??
      (
        await q(
          "select policy_revision from public.organizations where id=$1",
          [org],
        )
      )[0].policy_revision;
  await q(
    `insert into public.actions(id,organization_id,business_id,actor_id,agent,provider,tool,resource_type,resource_id,proposal,proposal_fingerprint,reason,confidence,status,policy_revision) values($1,$2,$3,$4,'product','mock','updateProductPrice','products','test','{"tool":"updateProductPrice","input":{}}',$5,'Fixture',0.9,'awaiting_approval',$6)`,
    [action, org, biz, actor, fp, revision],
  );
  await q(
    `insert into public.approvals(id,organization_id,action_id,proposal_fingerprint,policy_revision,expires_at) values($1,$2,$3,$4,$5,now()+$6::interval)`,
    [approval, org, action, fp, revision, expired ? "-1 minute" : "15 minutes"],
  );
  return { action, approval, fp, org };
}
const claim = (f, actor = owner) =>
  q("select public.claim_approval($1,$2,$3,$4,$5) claimed", [
    f.org,
    f.action,
    f.approval,
    f.fp,
    actor,
  ]);
test("approval requires current owner, exact tenant/fingerprint and cannot be called by authenticated clients", async () => {
  const f = await actionFixture();
  for (const who of [member, viewer, admin, other])
    await assert.rejects(claim(f, who));
  await asUser(owner, () => assert.rejects(claim(f)));
  assert.equal((await claim({ ...f, fp: "b".repeat(64) }))[0].claimed, false);
  assert.equal((await claim({ ...f, org: orgB }, other))[0].claimed, false);
  assert.equal((await claim(f))[0].claimed, true);
  assert.equal((await claim(f))[0].claimed, false);
});
test("expired and stale-policy approvals cannot be consumed", async () => {
  assert.equal(
    (await claim(await actionFixture({ expired: true })))[0].claimed,
    false,
  );
  const stale = await actionFixture();
  await asUser(owner, () =>
    q("select public.set_policy($1,'products.price.write','DENIED',null,2)", [
      orgA,
    ]),
  );
  assert.equal((await claim(stale))[0].claimed, false);
});
test("simultaneous consumption submissions have exactly one winner", async () => {
  const f = await actionFixture();
  const results = await Promise.all(Array.from({ length: 12 }, () => claim(f)));
  assert.equal(results.filter((result) => result[0].claimed).length, 1);
  // PGlite serializes connections. This exercises the atomic SQL statement, not a multi-process lock stress test.
});
test("proposal snapshots and audit records are immutable; audits isolated", async () => {
  const f = await actionFixture();
  await assert.rejects(
    q("update public.actions set proposal='{}' where id=$1", [f.action]),
  );
  const id = randomUUID();
  await q(
    `insert into public.audit_events(id,organization_id,action_id,actor_id,agent,provider,action_type,resource,reason,confidence,policy_decision,change_parameters,result,source,requested_at) values($1,$2,$3,$4,'store','mock','fixture','store','Fixture',1,'{}','{}','awaiting_approval','mock',now())`,
    [id, orgA, f.action, owner],
  );
  await assert.rejects(
    q("update public.audit_events set reason='edited' where id=$1", [id]),
  );
  await assert.rejects(q("delete from public.audit_events where id=$1", [id]));
  await asUser(other, async () =>
    assert.equal(
      (await q("select * from public.audit_events where id=$1", [id])).length,
      0,
    ),
  );
  await asUser(owner, async () =>
    assert.equal(
      (await q("select * from public.audit_events where id=$1", [id])).length,
      1,
    ),
  );
});
test("connection metadata is isolated, rejects live status and credential material", async () => {
  await asUser(owner, async () => {
    assert.equal(
      (await q("select * from public.provider_connections")).length,
      4,
    );
    assert.equal(
      (await q("select * from public.integration_connections")).length,
      1,
    );
  });
  await assert.rejects(
    q(
      "update public.provider_connections set status='connected' where organization_id=$1",
      [orgA],
    ),
  );
  await assert.rejects(
    q(
      "update public.provider_connections set credential_reference=$1 where organization_id=$2",
      [randomUUID(), orgA],
    ),
  );
  await assert.rejects(
    q(
      "update public.integration_connections set business_id=$1 where organization_id=$2",
      [bizB, orgA],
    ),
  );
});
test("rejection consumes once and creates append-only audit in same transaction", async () => {
  const f = await actionFixture();
  const reject = () =>
    q("select public.reject_approval($1,$2,$3) ok", [orgA, f.approval, owner]);
  assert.equal((await reject())[0].ok, true);
  assert.equal((await reject())[0].ok, false);
  assert.equal((await claim(f))[0].claimed, false);
  assert.equal(
    (await q("select status from public.actions where id=$1", [f.action]))[0]
      .status,
    "rejected",
  );
  assert.equal(
    (
      await q(
        "select count(*)::integer n from public.audit_events where action_id=$1 and result='rejected'",
        [f.action],
      )
    )[0].n,
    1,
  );
});
test("rate limit uses durable atomic counters and privileged RPC boundary", async () => {
  await asUser(owner, () =>
    assert.rejects(q("select public.consume_rate_limit('fixture','auth')")),
  );
  for (let i = 0; i < 8; i++)
    assert.equal(
      (await q("select public.consume_rate_limit('fixture','auth') ok"))[0].ok,
      true,
    );
  assert.equal(
    (await q("select public.consume_rate_limit('fixture','auth') ok"))[0].ok,
    false,
  );
  await assert.rejects(
    q("select public.consume_rate_limit('fixture','oauth')"),
  );
});
test("receipt and approval commit atomically; terminal states cannot execute again", async () => {
  const f = await actionFixture();
  await claim(f);
  const receipt = {
    actionId: f.action,
    status: "not_implemented",
    decision: {
      outcome: "ALLOW",
      mode: "ASK_FIRST",
      reason: "Owner approved",
      policyRevision: 3,
    },
  };
  await db.exec("set role service_role");
  try {
    await q("select public.save_action($1,$2,$3,$4,$5,null)", [
      orgA,
      f.action,
      owner,
      f.fp,
      receipt,
    ]);
    await assert.rejects(
      q("select public.save_action($1,$2,$3,$4,$5,null)", [
        orgA,
        f.action,
        owner,
        f.fp,
        receipt,
      ]),
    );
  } finally {
    await db.exec("reset role");
  }
  assert.equal(
    (await q("select status from public.actions where id=$1", [f.action]))[0]
      .status,
    "not_implemented",
  );
  assert.equal((await claim(f))[0].claimed, false);
});
test("policy limits reject missing, extra, nonfinite and unsupported configuration", async () => {
  for (const config of [
    {},
    { currency: "EUR" },
    { currency: "EUR", maxNewPriceMinor: -1 },
    { currency: "JPY", maxNewPriceMinor: 10 },
    { currency: "EUR", maxNewPriceMinor: 10, unknown: 1 },
    { currency: "EUR", maxNewPriceMinor: 1.5 },
  ]) {
    await asUser(owner, () =>
      assert.rejects(
        q(
          "select public.set_policy($1,'products.price.write','AUTOMATIC_WITH_LIMITS',$2,3)",
          [orgA, config],
        ),
      ),
    );
  }
});
test("populated action/approval/policy rows remain invisible to another tenant", async () => {
  const f = await actionFixture();
  await asUser(other, async () => {
    assert.equal(
      (await q("select * from public.actions where id=$1", [f.action])).length,
      0,
    );
    assert.equal(
      (await q("select * from public.approvals where id=$1", [f.approval]))
        .length,
      0,
    );
    assert.equal(
      (
        await q(
          "select * from public.organization_policies where organization_id=$1",
          [orgA],
        )
      ).length,
      0,
    );
    await assert.rejects(q("select private.actor_role($1,$2)", [orgA, owner]));
  });
});
test("existing ActionEngine runs through Postgres repositories and durable approval lifecycle", async () => {
  const { default: ts } = await import("typescript");
  const { createRequire } = await import("node:module");
  const native = createRequire(import.meta.url),
    modules = new Map();
  const identity = {
    organizationId: orgA,
    businessId: bizA,
    actorId: owner,
    role: "owner",
    source: "live",
  };
  // Test-only transport: SQL executes against the migrated PostgreSQL engine. It substitutes
  // the Supabase HTTP transport, not the repositories or the existing action/policy engine.
  function transport(privileged) {
    return {
      async rpc(name, args) {
        const parameters = {
          policy_snapshot: ["org"],
          save_action: [
            "org",
            "action",
            "actor",
            "fingerprint",
            "receipt_data",
            "approval_data",
          ],
          claim_approval: ["org", "action", "approval", "fingerprint", "actor"],
          reject_approval: ["org", "approval", "actor"],
        }[name];
        assert.ok(parameters, `Unexpected RPC ${name}`);
        const run = () =>
          q(
            `select public.${name}(${parameters.map((_, i) => "$" + (i + 1)).join(",")}) result`,
            parameters.map((k) => args[k] ?? null),
          );
        try {
          return {
            data: (privileged ? await run() : await asUser(owner, run))[0]
              .result,
            error: null,
          };
        } catch (e) {
          return { data: null, error: { code: e.code, message: e.message } };
        }
      },
      from(table) {
        assert.ok(
          ["actions", "audit_events", "integration_connections"].includes(
            table,
          ),
        );
        const filters = {};
        let selected = "*";
        const builder = {
          select(value) {
            selected = value;
            return builder;
          },
          eq(k, v) {
            filters[k] = v;
            return builder;
          },
          async maybeSingle() {
            const keys = Object.keys(filters);
            const run = () =>
              q(
                `select * from public.${table} where ${keys.map((k, i) => k + "=$" + (i + 1)).join(" and ")}`,
                Object.values(filters),
              );
            try {
              const rows = privileged ? await run() : await asUser(owner, run);
              const data = rows[0] ?? null;
              if (data && selected.includes("approvals("))
                data.approvals = await asUser(owner, () =>
                  q("select * from public.approvals where action_id=$1", [
                    data.id,
                  ]),
                );
              return { data, error: null };
            } catch (e) {
              return {
                data: null,
                error: { code: e.code, message: e.message },
              };
            }
          },
          async insert(record) {
            const keys = Object.keys(record);
            try {
              await q(
                `insert into public.${table}(${keys.join(",")}) values(${keys.map((_, i) => "$" + (i + 1)).join(",")})`,
                Object.values(record),
              );
              return { error: null };
            } catch (e) {
              return { error: { code: e.code, message: e.message } };
            }
          },
        };
        return builder;
      },
    };
  }
  const clients = {
    sessionClient: async () => transport(false),
    persistenceClient: () => transport(true),
    databaseError: (error) => {
      if (error) throw new Error(error.message);
    },
  };
  const load = (file) => {
    if (modules.has(file)) return modules.get(file);
    const mod = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    new Function("require", "module", "exports", code)(
      (id) => {
        if (id === "server-only") return {};
        if (id.startsWith("node:")) return native(id);
        if (file.endsWith("db/repositories.ts") && id === "./client")
          return clients;
        const target = id.startsWith("@/")
          ? id.slice(2) + ".ts"
          : new URL(id + ".ts", new URL(file, `file://${process.cwd()}/`))
              .pathname;
        return load(target);
      },
      mod,
      mod.exports,
    );
    modules.set(file, mod.exports);
    return mod.exports;
  };
  const {
    PostgresActionRepository,
    PostgresPolicyRepository,
    PostgresAuditRepository,
  } = load("lib/server/db/repositories.ts");
  const { ActionEngine } = load("lib/server/actions/engine.ts");
  const { MockShopifyAdapter } = load(
    "lib/server/integrations/mock-shopify.ts",
  );
  const actions = new PostgresActionRepository(identity),
    policy = new PostgresPolicyRepository(identity),
    audit = new PostgresAuditRepository(identity);
  const context = { ...identity, source: "mock" };
  const engine = new ActionEngine(
    new MockShopifyAdapter(orgA),
    policy,
    actions,
    audit,
  );
  await asUser(owner, () =>
    q(
      "select public.set_policy($1,'products.price.write','ASK_FIRST',null,3)",
      [orgA],
    ),
  );
  const read = await engine.propose(
    context,
    { tool: "getStore", input: {}, reason: "Read mock store", confidence: 1 },
    { agent: "store", provider: "mock" },
  );
  assert.equal(read.status, "succeeded");
  const saved = await actions.get(orgA, read.actionId);
  assert.equal(saved.receipt.status, "succeeded");
  assert.equal(saved.receipt.data, undefined);
  const proposal = {
    tool: "updateProductPrice",
    input: {
      productId: "gid://shopify/Product/1",
      variantId: "gid://shopify/ProductVariant/1",
      currentPrice: { amountMinor: 8900, currency: "EUR" },
      newPrice: { amountMinor: 9900, currency: "EUR" },
    },
    reason: "Review mock price",
    confidence: 0.9,
  };
  const pending = await engine.propose(context, proposal, {
    agent: "product",
    provider: "mock",
  });
  assert.equal(pending.status, "awaiting_approval");
  const persisted = await actions.get(orgA, pending.actionId);
  assert.equal(persisted.approval.id, pending.approvalId);
  assert.equal(persisted.approval.policyRevision, 4);
  const approved = await engine.approve(
    context,
    pending.actionId,
    pending.approvalId,
  );
  assert.equal(approved.status, "not_implemented");
  await assert.rejects(
    engine.approve(context, pending.actionId, pending.approvalId),
  );
  await assert.rejects(actions.get(orgB, pending.actionId));
  const auditRows = await q(
    "select result from public.audit_events where action_id=$1 order by created_at",
    [pending.actionId],
  );
  assert.deepEqual(
    auditRows.map((r) => r.result),
    ["awaiting_approval", "not_implemented"],
  );
  // The same durable path now supports real read attribution, while preserving executor and business binding.
  let liveReads = 0;
  const liveEngine = new ActionEngine(
    {
      organizationId: orgA,
      source: "live",
      capabilities: ["store.read"],
      executeRead: async () => {
        liveReads++;
        return {
          id: "gid://shopify/Shop/42",
          name: "Live fixture",
          domain: "fixture.myshopify.com",
          currencyCode: "EUR",
        };
      },
    },
    policy,
    actions,
    audit,
  );
  await asUser(owner, () =>
    q("select public.set_policy($1,'store.read','ASK_FIRST',null,4)", [orgA]),
  );
  const livePending = await liveEngine.propose(
    identity,
    {
      tool: "getStore",
      input: {},
      reason: "Owner requested store identity",
      confidence: 1,
    },
    { agent: "store", provider: "anti-nerd" },
  );
  assert.equal(livePending.status, "awaiting_approval");
  assert.equal(liveReads, 0);
  await assert.rejects(
    engine.approve(context, livePending.actionId, livePending.approvalId),
    { code: "APPROVAL_MISMATCH" },
  );
  assert.equal(
    await new PostgresActionRepository({ ...identity, businessId: bizB }).get(
      orgA,
      livePending.actionId,
    ),
    null,
  );
  const liveResult = await liveEngine.approve(
    identity,
    livePending.actionId,
    livePending.approvalId,
  );
  assert.equal(liveResult.status, "succeeded");
  assert.equal(liveResult.data.name, "Live fixture");
  assert.equal(liveReads, 1);
  assert.equal(
    (await actions.get(orgA, livePending.actionId)).receipt.data,
    undefined,
  );
  assert.equal(
    (
      await q("select execution_source from public.actions where id=$1", [
        livePending.actionId,
      ])
    )[0].execution_source,
    "live",
  );
  assert.ok(
    (
      await q("select source from public.audit_events where action_id=$1", [
        livePending.actionId,
      ])
    ).every((r) => r.source === "live"),
  );
  await assert.rejects(
    q("update public.actions set execution_source='mock' where id=$1", [
      livePending.actionId,
    ]),
    /INVALID_ACTION/,
  );
  await assert.rejects(
    liveEngine.propose(identity, proposal, {
      agent: "product",
      provider: "anti-nerd",
    }),
    { code: "INVALID_ACTION" },
  );
  await assert.rejects(
    liveEngine.approve(identity, livePending.actionId, livePending.approvalId),
  );
});

test("Supabase default privileges cannot leave a service-role audit mutation or truncate grant", async () => {
  await db.exec("set role service_role");
  try {
    await assert.rejects(q("update public.audit_events set reason='tamper'"));
    await assert.rejects(q("delete from public.audit_events"));
    await assert.rejects(q("truncate public.audit_events"));
    await assert.rejects(
      q("update public.organization_members set role='owner'"),
    );
    await assert.rejects(q("update public.approvals set consumed_at=null"));
  } finally {
    await db.exec("reset role");
  }
});
