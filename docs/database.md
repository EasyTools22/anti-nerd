# Database and tenant model

Current commerce lifecycle and migration 005: [Business-scoped commerce connections](commerce-connections.md).

Supabase PostgreSQL is the durable store. Application code uses `@supabase/supabase-js`; it does not open arbitrary SQL connections. Apply ordered SQL files to a fresh project, or only unapplied migrations to your existing project. Migration `202609240003_shopify_read_only.sql` extends the existing identity schema. The owner applied migrations 001–003 through the configured project's SQL Editor on 2026-09-25; verification details are below.

## Schema

| Table                   | Purpose and tenant binding                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| profiles                | One safe profile per `auth.users.id`; own-profile reads only. No duplicated password or email. Created during workspace onboarding. |
| organizations           | Main tenant; UUID, name, unique slug, creator, global policy revision.                                                              |
| organization_members    | Composite primary key `(organization_id, user_id)`; owner/admin/member/viewer.                                                      |
| businesses              | Separate UUID, organization, name/type/status/country/currency/timezone. An organization can have several businesses.               |
| integration_connections | Business and organization metadata, external account identifier, capabilities and sync time.                                        |
| provider_connections    | Organization-scoped provider metadata.                                                                                              |
| organization_policies   | One row per organization/capability, explicit mode/limits and revision.                                                             |
| actions                 | Immutable typed proposal snapshot and fingerprint; separate relational attribution, resource, status/revision and receipt.          |
| approvals               | Unique action, exact fingerprint and revision, expiry, approved/rejected actor and consumed timestamp.                              |
| audit_events            | Append-only minimal action metadata; no raw result body, secrets or chain-of-thought.                                               |
| business_instructions   | Organization-wide or business-specific instructions, priority, active state and creator.                                            |
| private.rate_limits     | Server-only durable fixed-window counters. No anonymous/browser access.                                                             |

Composite foreign keys prevent a row for organization A referencing business/action B. UUIDs, membership uniqueness, connection uniqueness, status/role/capability constraints, immutable-action and append-only-audit triggers enforce important invariants independently of UI code. Organization-first indexes support tenant reads; additional indexes cover membership lookup, pending approvals and activity history. Timestamps are database-maintained.

Migration 003 permits verified Shopify connections with a composite tenant/business/connection/credential foreign key. `private.shopify_credentials` contains encrypted purpose-bound envelopes; `private.shopify_oauth_states` holds one-time state digests; `private.shopify_deliveries` deduplicates signed events; `private.shopify_privacy_requests` queues minimized pending requests for operators. No browser or direct service-role table grants exist for these private tables. The service-only `shopify_operation` RPC rechecks actor membership/business/owner requirements and updates credentials, leases, health and connection audit transactionally. `shopify_webhook` is called only after server HMAC verification. Provider credentials remain unavailable.

## RLS and writes

Every public application table has RLS enabled. Authenticated reads require membership in the row's organization; profile reads require `auth.uid() = id`. Organization membership is looked up by a fixed-search-path security-definer helper to avoid recursive membership RLS. Its actor-parameter variant is private and not granted to users.

Authenticated roles have SELECT only. Controlled RPCs allow:

- `create_workspace`: authenticated actor becomes owner; organization, membership, business, profile and disconnected metadata commit together. A lock and 20-owned-workspace cap bound repeated onboarding. No arbitrary role assignment.
- `save_instruction`: owner/admin/member only; organization and business relationship enforced; viewer cannot mutate.
- `set_policy`: owner only; locks the organization and requires the expected revision. Unknown/missing limits fail closed. Global revision increments on every accepted edit.
- `policy_snapshot`: invoker/RLS-backed consistent snapshot of rules and global revision.

There are no public role, integration, provider, action or audit CRUD mutation endpoints. The server's isolated secret-key client is used for internal action/audit persistence, rate limits and narrow Shopify RPCs. Browser reads and normal workspace mutations use the user's session client and RLS. Migrations revoke Supabase default table grants before granting the required SELECT/INSERT permissions; service-role approval updates use the controlled security-definer RPCs, and audit UPDATE/DELETE/TRUNCATE are not granted. **Supabase secret keys bypass RLS**: protect this key and retain the verified-context checks in repositories. It is not a substitute for user authentication.

Approval RPCs are executable only by `service_role`. They verify the server-derived actor's current membership again. Consumption locks the organization first, checks current policy revision, fingerprint, action status, expiry against the database clock and `consumed_at IS NULL`, then atomically consumes once. Policy changes use the same organization lock. Rejection consumes, changes status and adds an audit event in one transaction. Receipt and approval creation are saved together; terminal actions cannot transition again.

Action reservation uses a unique action UUID. Proposal snapshots cannot be edited. Audit is recorded before every adapter read. Audit append and action receipt are separate commits in the existing engine: interruptions can leave proposed/started actions or an event preceding its receipt. Consumption remains one-way; the UI does not retry external execution. **Real Shopify reads are allowed; this is not an external-write transaction protocol.** Reconciliation, outbox and external idempotency are required before real writes.

## Exact fresh-project setup

1. Create a new Supabase project. Save its database credentials securely outside this repository. Do not paste them into chat or commit them.
2. Open SQL Editor. Run the complete contents of `supabase/migrations/202609240001_identity.sql`, then `202609240002_action_transactions.sql`, then `202609240003_shopify_read_only.sql`, in that order. Each file runs within a transaction. On an existing installation apply only missing migrations. Alternatively use a locally installed Supabase CLI: `supabase login`, `supabase link --project-ref YOUR_PROJECT_REF`, then `supabase db push`. Do not mix a manual SQL import and untracked CLI migration history; choose one workflow.
3. In project API settings/Connect, obtain the project URL, publishable key and a server secret API key. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` and `APP_BASE_URL=http://localhost:5000`. No database URL is needed by the app. Keep the secret key only in the server deployment secret manager.
4. Complete the email provider, URL and template settings in [authentication.md](authentication.md). Enable email verification.
5. Restart `npm run dev`. Open `http://localhost:5000/signup`, create your own account, confirm its email and create the workspace and first business. Do not seed passwords or production users through a migration.
6. Verify SQL Editor shows an owner membership and business for this account. Create a second test account/workspace and verify each sees only its own records. Additional test memberships can be inserted by the project administrator for role testing; there is deliberately no invitation or role-management UI yet.
7. In development, open Activity → Create a development fixture → Price approval. Reload the page to prove persistence. Approve/reject as owner and inspect audit history. No external write occurs. A viewer cannot save instructions or approve; a member can edit instructions but cannot approve or edit policy.
8. For production, set the public variables at **build time**, set server variables in the runtime secret manager, use the canonical HTTPS `APP_BASE_URL`, register its auth URLs, apply migrations, run the release checks, and complete the hosted verification checklist below. Never deploy a build with placeholder public variables.

## Tests and operational requirements

`npm run test:persistence` runs the actual migrations in PGlite's PostgreSQL engine with test-only `auth.users`, `auth.uid()` and roles. It checks RLS reads/writes, membership/role behavior, composite tenant relationships, instruction and metadata isolation, revisions, expiry/replay, immutable snapshots/audits, rejection transactions, receipt transitions and rate counters. Concurrent Promise submissions prove only one consumption result succeeds; PGlite serializes connections and does **not** prove multi-process Postgres lock behavior. Identity unit tests separately exercise the real context resolver with verified-session/database fixtures.

Before production, also run the migrations on hosted Supabase or a local Supabase stack; verify PostgREST relationship/schema exposure, email delivery/confirmation/recovery, cookie refresh/revocation, multi-session workspace switching and true concurrent approval/policy requests from separate database connections. No hosted account was configured in this workspace, so these checks remain manual. Configure backups/PITR, retention, monitoring, secret rotation and an edge abuse policy. Periodically delete expired private rate-limit buckets through a controlled maintenance procedure; no background job was added here. Audit retention/export and account/organization deletion require a separate policy; do not disable the audit immutability trigger for ordinary application writes.

## Identity phase verification (historical; before Shopify)

- 22 persistence/identity tests, 15 existing backend tests and 5 Brain tests pass (42 total).
- The persistence suite also drives the existing ActionEngine through the new Postgres repositories using a SQL-backed test transport: read, pending approval, persisted reload, owner consumption, unavailable write and audit history.
- Tests simulate Supabase's permissive default table grants before applying migrations and verify they are revoked, including service-role audit UPDATE/DELETE/TRUNCATE and direct approval/membership mutation privileges.
- Lint, TypeScript, production build and client boundary checks pass; 55 client roots and 67 production JavaScript files checked.
- Localhost:5000 and a temporary production server on :5001 each pass 22 unauthenticated protected-route redirects, three auth-page checks, three blocked connection/callback checks and no-store checks. Production development preview returns 404.
- Login, signup and recovery rendering/navigation were checked in the browser, including 390px width without horizontal overflow. Missing-configuration controls remain disabled.
- No hosted Supabase account, real email delivery, real authenticated browser workspace or independent-connection database contention was tested. Those require the manual setup above. PGlite results are not a claim of hosted Supabase validation.

## Remote migration recovery — 2026-09-25

- Existing migration sources are `202609240001_identity.sql`, `202609240002_action_transactions.sql` and `202609240003_shopify_read_only.sql`. Initial API checks returned PGRST205; the owner's catalog inspection showed missing objects. The owner ran the complete files in order and supplied SQL Editor success results for each. No database reset, manual duplicate tables, migration edits or user/data deletion was performed during recovery. Manual SQL execution does not establish Supabase CLI migration-history entries.
- Read-only PostgREST checks after each step confirmed the expected public schema. After 003, all eight checked public RPCs were exposed to the server role, including `shopify_operation` and `shopify_webhook`. Ten public application tables returned HTTP 200 with zero-row queries. `profiles` returned the intended service-role permission denial (42501), rather than PGRST205. The new Shopify connection columns were queryable. No manual schema-cache reload was needed for these checks.
- The publishable-key SDK could not read organizations without a session (401/42501). Auth health/settings and localhost:5000 login/signup/status returned 200; the protected root redirected to login. This confirms availability and anonymous denial, not successful account login or authenticated workspace access.
- All 73 tests passed (15 backend, 22 persistence/identity, 31 Shopify and 5 Brain), as did lint, typecheck, production build and boundary checks (56 client roots, 71 production JavaScript files). Database tests use PGlite fixtures and verify tenant isolation, RLS and private Shopify access restrictions; they do not certify the remote catalog.
- The owner subsequently confirmed successful real sign-in and supplied all 28 rows from `supabase/migration-preflight.sql`: every object is present, all 11 public tables have RLS enabled and one policy each, and all four private Shopify tables have RLS enabled with zero policies (intentional denial of direct browser access). `private.rate_limits` also has RLS enabled remotely, although migration 001 does not require it; no schema change was made to remove that additional protection. Catalog presence/policy counts do not establish full definition equivalence or prove cross-tenant behavior.
- The owner also confirmed the authenticated workspace flow works. Migration recovery is complete and the database foundation is ready for the separate Shopify app configuration step. Hosted cross-tenant testing with independent real sessions remains unperformed; tenant-isolation assurance here combines local database tests with remote catalog and anonymous-denial checks. No Shopify credentials were configured and no store was connected.


## Production readiness gate

Migration `202609250004_backend_readiness.sql` adds only a stable, service-role-only `backend_readiness()` function. It reads catalogs, not application rows, and verifies the required 001–003 objects, public tenant policy presence, intended RLS, service/browser grants and Shopify-specific columns. It returns fixed booleans, not credentials, function definitions or tenant data. The transaction requests a PostgREST schema reload. Apply 004 once after 003 in the same project's SQL Editor; do not rerun the earlier migrations. A missing RPC returns `READINESS_MIGRATION_004_REQUIRED` and prevents live OAuth. Catalog checks are not a complete schema-definition audit or a substitute for cross-tenant tests.

`GET /api/backend/status` is explicitly dynamic and uncached. `lib/server/readiness.ts` independently checks Supabase URL/key purposes and the Auth settings endpoint, the database catalog RPC, Shopify HTTPS/callback/read-scope configuration and the production vault keyring/source requirement. Requests have five-second timeouts, reject redirects and do not read business data. `liveConnectionsEnabled` requires every check to succeed; fixed blocker codes explain failures without exposing raw errors or secrets. Readiness describes availability to begin OAuth, not a verified Shopify installation or validated vendor credentials.

The obsolete `phase: foundation` label came from `lib/server/foundation.ts`. Its authentication/persistence fields only tested environment presence and its live flag checked Shopify configuration/vault alone. Pending auth/persistence values were not caused by `createBackend("live")`: that factory is an isolated mock runtime and remains blocked for live AI execution. The real production composition root is `lib/server/shopify/service.ts`, which already constructs PostgreSQL repositories, the vault/token store and the fixed read-only Shopify adapter. The status endpoint now imports no mock composition code. No additional activation flag was introduced.

Connect, callback and read routes now share the full readiness gate and return `SHOPIFY_NOT_READY` with safe blocker codes on failure. Verified session/membership/business resolution, owner-only OAuth management, durable one-time state and callback HMAC checks remain enforced. The integrations connection summary uses the same gate. Generic AI/provider connection endpoints still return `FOUNDATION_PENDING`; no provider, write tool or autonomous runtime was enabled.
