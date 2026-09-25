import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite(),
  owner = randomUUID(),
  other = randomUUID(),
  member = randomUUID();
let org, business, otherOrg, otherBusiness;
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
async function asRole(role, user, run) {
  await db.exec(`set role ${role}`);
  if (user)
    await q("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  try {
    return await run();
  } finally {
    await db.exec("reset role");
  }
}
const op = (operation, payload = {}, overrides = {}) =>
  asRole(
    "service_role",
    null,
    async () =>
      (
        await q(
          "select public.shopify_operation($1,$2,$3,$4,$5::jsonb) result",
          [
            operation,
            overrides.org ?? org,
            overrides.business ?? business,
            overrides.actor ?? owner,
            JSON.stringify(payload),
          ],
        )
      )[0].result,
  );
const row = async () =>
  (
    await q(
      "select * from public.integration_connections where organization_id=$1 and business_id=$2 and provider='shopify'",
      [org, business],
    )
  )[0];
const digest = () => randomBytes(32).toString("hex");
async function begin() {
  const state = await op("begin", {
    shop: "database-fixture.myshopify.com",
    digest: digest(),
    redirectUri: "https://app.example/api/integrations/shopify/callback",
  });
  return state;
}
async function consume(s) {
  return op("consume", { digest: s.digest, shop: s.shop });
}
async function envelope() {
  const c = await row();
  return {
    id: randomUUID(),
    organizationId: org,
    businessId: business,
    connectionId: c.id,
    purpose: "integration:shopify",
    keyVersion: "v1",
    nonce: "fixture-encrypted-nonce",
    ciphertext: "fixture-ciphertext",
    tag: "fixture-auth-tag",
  };
}
async function connect() {
  const s = await begin();
  assert.ok(await consume(s));
  const e = await envelope();
  const payload = {
    digest: s.digest,
    envelope: e,
    accessExpiresAt: new Date(Date.now() - 1000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + 999999).toISOString(),
  };
  await op("stage", payload);
  await op("commit", {
    ...payload,
    shop: {
      id: "gid://shopify/Shop/123",
      domain: s.shop,
      name: "Database fixture",
      currencyCode: "EUR",
    },
    scopes: ["read_products", "read_orders", "read_inventory"],
  });
  return e;
}
before(async () => {
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; alter default privileges in schema public grant all on tables to anon,authenticated,service_role; create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;",
  );
  for (const file of fs.readdirSync("supabase/migrations").sort())
    await db.exec(fs.readFileSync("supabase/migrations/" + file, "utf8"));
  for (const id of [owner, other, member])
    await q("insert into auth.users values($1)", [id]);
  org = await asRole(
    "authenticated",
    owner,
    async () =>
      (await q("select public.create_workspace('A','A','ecommerce') id"))[0].id,
  );
  otherOrg = await asRole(
    "authenticated",
    other,
    async () =>
      (await q("select public.create_workspace('B','B','ecommerce') id"))[0].id,
  );
  business = (
    await q("select id from public.businesses where organization_id=$1", [org])
  )[0].id;
  otherBusiness = (
    await q("select id from public.businesses where organization_id=$1", [
      otherOrg,
    ])
  )[0].id;
  await q(
    "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'member')",
    [org, member],
  );
});
after(() => db.close());
test("OAuth/credential RPCs and private tables are inaccessible to browser roles", async () => {
  for (const role of ["anon", "authenticated"])
    await asRole(role, owner, async () => {
      await assert.rejects(
        q("select public.shopify_operation('begin',$1,$2,$3,'{}')", [
          org,
          business,
          owner,
        ]),
      );
      await assert.rejects(q("select * from private.shopify_credentials"));
      await assert.rejects(q("select * from private.shopify_oauth_states"));
      await assert.rejects(q("select * from private.shopify_privacy_requests"));
    });
});
test("durable state binds actor, org, business and shop and consumes exactly once under racing calls", async () => {
  const state = await begin();
  for (const [payload, overrides] of [
    [{ shop: "other.myshopify.com" }, {}],
    [{}, { actor: other }],
    [{}, { org: otherOrg, business: otherBusiness, actor: other }],
    [{}, { business: otherBusiness }],
    [{}, { actor: member }],
  ]) {
    try {
      assert.equal(
        await op(
          "consume",
          { digest: state.digest, shop: state.shop, ...payload },
          overrides,
        ),
        null,
      );
    } catch (error) {
      assert.match(error.message, /NOT_AUTHORIZED/);
    }
  }
  const outcomes = await Promise.all([consume(state), consume(state)]);
  assert.equal(outcomes.filter(Boolean).length, 1);
  await op("disconnect");
});
test("expired and superseded states cannot be consumed; installing during an exchange is fenced", async () => {
  const old = await begin(),
    next = await begin();
  assert.equal(await consume(old), null);
  await q(
    "update private.shopify_oauth_states set expires_at=now()-interval '1 second' where digest=$1",
    [next.digest],
  );
  assert.equal(await consume(next), null);
  const active = await begin();
  assert.ok(await consume(active));
  await assert.rejects(begin(), /REFRESH_IN_PROGRESS/);
  await op("disconnect");
});
test("stage is not connected, secrets are bound, verified commit persists metadata without plaintext and reauth reuses one connection", async () => {
  const initial = (await row()).id,
    e = await connect();
  const c = await row();
  assert.equal(c.id, initial);
  assert.equal(c.status, "connected");
  assert.equal(c.connection_health, "CONNECTED");
  assert.equal(c.display_name, "Database fixture");
  assert.deepEqual(await op("secret", { reference: e.id }), e);
  await assert.rejects(
    op(
      "secret",
      { reference: e.id },
      { org: otherOrg, business: otherBusiness, actor: other },
    ),
    /NOT_CONNECTED/,
  );
  assert.equal(
    (await q("select count(*)::int n from private.shopify_credentials"))[0].n,
    1,
  );
  const updated = await connect();
  assert.notEqual(updated.id, e.id);
  assert.equal((await row()).id, initial);
  assert.equal(
    (await q("select count(*)::int n from private.shopify_credentials"))[0].n,
    1,
  );
  const events = (
    await q(
      "select action_type from public.audit_events where organization_id=$1",
      [org],
    )
  ).map((r) => r.action_type);
  assert.ok(events.includes("shopify.connected"));
  assert.ok(events.includes("shopify.reauthorized"));
  assert.ok(
    !JSON.stringify(await q("select * from public.audit_events")).includes(
      "fixture-ciphertext",
    ),
  );
});
test("another tenant cannot claim the already linked canonical shop", async () => {
  await assert.rejects(
    op(
      "begin",
      {
        shop: "database-fixture.myshopify.com",
        digest: digest(),
        redirectUri: "https://app.example/api/integrations/shopify/callback",
      },
      { org: otherOrg, business: otherBusiness, actor: other },
    ),
    /SHOP_ALREADY_LINKED/,
  );
});
test("credential binding rejects cross-business envelopes; failed verification erases staged ciphertext", async () => {
  const s = await begin();
  await consume(s);
  const e = await envelope(),
    payload = {
      digest: s.digest,
      envelope: e,
      accessExpiresAt: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 999999).toISOString(),
    };
  await assert.rejects(
    op("stage", { ...payload, envelope: { ...e, businessId: otherBusiness } }),
    /NOT_AUTHORIZED/,
  );
  await op("stage", payload);
  assert.equal((await row()).status, "unavailable");
  await assert.rejects(op("secret", { reference: e.id }), /NOT_CONNECTED/);
  assert.deepEqual(
    await op("secret", { reference: e.id, digest: s.digest }),
    e,
  );
  await op("abort", { generation: s.generation });
  assert.equal((await row()).credential_reference, null);
  assert.equal(
    (await q("select count(*)::int n from private.shopify_credentials"))[0].n,
    0,
  );
  await op("disconnect");
});
test("refresh lease is exclusive, installation waits, fenced rotation is atomic and old lease cannot overwrite", async () => {
  const e = await connect();
  const leases = await Promise.all([
    op("lock_refresh", { reference: e.id }),
    op("lock_refresh", { reference: e.id }),
  ]);
  const lease = leases.find(Boolean);
  assert.equal(leases.filter(Boolean).length, 1);
  await assert.rejects(begin(), /REFRESH_IN_PROGRESS/);
  await assert.rejects(
    op("rotate", { reference: e.id, lease: randomUUID(), envelope: e }),
    /INVALID_LEASE/,
  );
  const rotated = { ...e, ciphertext: "rotated-ciphertext", keyVersion: "v2" };
  await op("rotate", {
    reference: e.id,
    lease,
    envelope: rotated,
    accessExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + 9999999).toISOString(),
  });
  assert.deepEqual(await op("secret", { reference: e.id }), rotated);
  assert.equal((await row()).refresh_lease, null);
  await assert.rejects(
    op("rotate", { reference: e.id, lease, envelope: e }),
    /INVALID_LEASE/,
  );
});
test("abandoned refresh fails closed rather than replaying a possibly rotated token", async () => {
  const e = await connect();
  await op("lock_refresh", { reference: e.id });
  await q(
    "update public.integration_connections set refresh_started_at=now()-interval '46 seconds' where id=$1",
    [(await row()).id],
  );
  assert.equal(await op("lock_refresh", { reference: e.id }), null);
  assert.equal((await row()).connection_health, "TOKEN_REFRESH_FAILED");
  assert.equal((await row()).status, "unavailable");
  await assert.rejects(op("secret", { reference: e.id }), /NOT_CONNECTED/);
  await op("disconnect");
});
test("disconnect removes secrets and pending states, stops refresh, retains append-only history and cannot be undone by stale failure", async () => {
  const e = await connect(),
    lease = await op("lock_refresh", { reference: e.id }),
    generation = (await row()).generation;
  const count = (await q("select count(*)::int n from public.audit_events"))[0]
    .n;
  await op("disconnect");
  await assert.rejects(
    op("rotate", { reference: e.id, lease, envelope: e }),
    /INVALID_LEASE/,
  );
  await op("unhealthy", { health: "TOKEN_REFRESH_FAILED", lease, generation });
  const c = await row();
  assert.equal(c.status, "revoked");
  assert.equal(c.credential_reference, null);
  assert.equal(
    (await q("select count(*)::int n from private.shopify_oauth_states"))[0].n,
    0,
  );
  assert.ok(
    (await q("select count(*)::int n from public.audit_events"))[0].n > count,
  );
});
const hook = (delivery, topic, time, identifiers = {}) =>
  asRole("service_role", null, () =>
    q("select public.shopify_webhook($1,$2,$3,$4,$5)", [
      delivery,
      topic,
      "database-fixture.myshopify.com",
      time,
      identifiers,
    ]),
  );
test("uninstall invalidates tokens once; stale event cannot revoke a newer installation; privacy requests remain pending", async () => {
  await connect();
  const before = new Date(Date.now() - 10000).toISOString();
  await hook("old-event", "app/uninstalled", before);
  assert.equal((await row()).status, "connected");
  await hook(
    "new-event",
    "app/uninstalled",
    new Date(Date.now() + 1).toISOString(),
  );
  assert.equal((await row()).status, "revoked");
  const count = (await q("select count(*)::int n from public.audit_events"))[0]
    .n;
  await hook("new-event", "app/uninstalled", new Date().toISOString());
  assert.equal(
    (await q("select count(*)::int n from public.audit_events"))[0].n,
    count,
  );
  await hook("privacy", "customers/redact", new Date().toISOString(), {
    customer_id: "123",
    order_ids: ["456"],
  });
  const request = (
    await q("select * from private.shopify_privacy_requests")
  )[0];
  assert.equal(request.status, "pending");
  assert.deepEqual(request.identifiers, {
    customer_id: "123",
    order_ids: ["456"],
  });
});
