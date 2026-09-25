# Business-scoped commerce connections

Users belong to organizations; organizations contain businesses; businesses own integration connections. Version 1 retains the existing unique `(organization_id, business_id, provider)` constraint: one primary Shopify connection per business, with no per-user or per-organization store limit. A canonical Shopify shop may only be linked to one business at a time. Disconnect releases that binding. Multiple connections per business would be a later schema/API change, not an implicit lookup of any organization connection.

## Business selection

The workspace menu lists accessible businesses with Shopify connection status. Owners and admins can add a business to the active organization. Creation inserts the business and its empty Shopify connection together, without creating another organization or duplicate business during OAuth. Other commerce providers remain future options.

Selection verifies the authenticated user, organization membership and active business ownership server-side. A restricted session RPC rechecks authorization and appends a selection audit before HTTP-only context cookies change. The layout is revalidated, keyed by organization/business, and commerce pagination resets when switching. A browser storage event is only a signal to reload other open tabs; it is never authorization. Shopify management POSTs include the rendered organization/business identifiers and reject requests when the server session now selects a different business. All store reads apply organization, business, provider and connection filters. No live DTO cache is shared across businesses.

## Replacement and reconnect

The owner can inspect store information, permissions, connection health, last check/sync and connected date. Reconnect requests the same shop through fresh OAuth. Connect a different store shows the old and proposed domains and requires confirmation. A generation comparison rejects outdated confirmation dialogs.

OAuth state remains actor/organization/business/shop/redirect/expiry-bound, one-time and durable. A pending attempt changes only its generation and safe pending metadata. Its encrypted credential is staged on the private OAuth state row, not in the active credential slot. Only the matching consumed OAuth attempt can use that envelope for verification. Ordinary reads keep using the current shop and credential.

After Shopify verifies the target shop, a transaction locks the connection and target shop, replaces the credential, switches public connection metadata, removes pending state and records the previous/new safe shop identifiers in append-only audit. An audit or uniqueness failure rolls back the entire switch. Failed or expired replacement leaves the previous active credential and metadata unchanged. Starting another attempt cleans superseded encrypted staging. Expired staging remains inaccessible and is removed on the next attempt or disconnect; no cleanup worker was added.

Concurrent refresh, reconnect, disconnect and stale callbacks are fenced. If a read finishes after its credential was replaced or deleted, its result is discarded. Already-dispatched network reads cannot be recalled. Shopify itself controls remote token validity; preservation of local credentials cannot guarantee a token the provider independently revokes. Refresh is temporarily fenced while a consumed OAuth attempt is being verified.

The callback requires the same active business and signed-in owner that started the attempt. Switching business during OAuth causes that callback to fail closed; return to the originating business and start again. It never attaches the token to the newly selected business.

## Disconnect

Explicit confirmation deletes active encrypted credentials and pending OAuth envelopes, increments the fence generation, clears the active shop binding and metadata, and returns the connection to `not_connected`. Business settings, account, Brain data and audit records remain. This is local credential deletion, not a Shopify-side uninstall; the merchant can uninstall the app in Shopify separately. No write scope or Shopify mutation was added.

## Migration and rollout

Apply **only `supabase/migrations/202609250005_commerce_connections.sql`**, after migrations 001–004. It adds pending-state columns, business audit attribution, restricted business creation/selection RPCs, replaces the connection RPC transaction logic, and extends the restricted readiness attestation to version 2 with migration 005. Existing RLS remains enabled; private credential/state tables still have no browser or direct service-role table grants. Existing migration files are unchanged. No user/business rows or active credentials are deleted by applying the migration.

Manual Supabase SQL Editor procedure:

1. Open the existing Anti-Nerd Supabase project, then **SQL Editor → New query**.
2. Paste the entire contents of migration 005 (including `begin` and `commit`) and click **Run** as `postgres`. Do not rerun migrations 001–004.
3. In a new query run `select public.backend_readiness();`. Expect `version: 2`, `ready: true`, `migrations.005: true`, `rls: true`, `permissions: true`, `columns: true`.
4. Run `supabase/commerce-verification.sql` and check all results. Migration 005 already notifies PostgREST to reload the schema.
5. After the deployment, check `/api/backend/status`, sign in, switch businesses, and verify existing business settings remain available. Initiate OAuth only after the separate Shopify organization/distribution issue is resolved.

New application code fails closed with `COMMERCE_MIGRATION_005_REQUIRED` until 005 is active. Do not roll back to the old connection implementation after applying 005; use a reviewed forward migration. No remote migration is implied by committing or pushing this file.

## Validation

`npm run test:brain`, `npm run test:backend`, `npm run test:persistence`, `npm run test:shopify`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:boundaries`.

Tests execute all migrations in isolated PGlite PostgreSQL and use fixture Shopify HTTP responses. They cover first install, reauthorization, replacement confirmation, failed verification, audit failure rollback, successful atomic replacement, disconnect credential deletion, stale callbacks, generation checks, two-business selection, cross-business/organization transport and vault isolation, RLS, public RPC permissions, and management UI states. They do not install a real Shopify app or certify Shopify distribution eligibility.
