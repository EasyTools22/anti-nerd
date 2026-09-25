# Security boundaries and production gates

Current commerce lifecycle and migration 005: [Business-scoped commerce connections](commerce-connections.md).

## Implemented

- Supabase-verified identity; current membership/role resolution; per-request session clients; untrusted workspace cookie validation.
- RLS on every public application table, composite tenant foreign keys and controlled mutation RPCs. No browser-supplied role/actor is trusted.
- Owner-only policy editing and approval/rejection. Revision locks, immutable proposals, exact fingerprints, database-clock expiry and atomic one-time approval consumption.
- Append-only audit trigger and SELECT-only browser grants. Explicit revocation also removes Supabase default service-role audit UPDATE/DELETE/TRUNCATE and direct membership/approval update privileges. Internal metadata excludes credentials, raw provider payloads, customer PII and chain-of-thought.
- Server-only Supabase secret client, sanitized errors, same-origin mutation checks, no-store/private session responses and fixed auth redirects.
- PostgreSQL-backed throttling with no memory fallback. Bounded form inputs, runtime proposal validation, bounded database reads and controlled development scenarios.
- Existing provider/runtime/Brain/action/policy/adapter boundaries, fixed Shopify queries and UnconfiguredCredentialStore remain intact. The generic live-provider factory still throws; only the verified Shopify read composition is enabled.

## Credential vault status

Shopify now has a server-only AES-256-GCM vault using Node's standard cryptographic primitives. Authenticated associated data binds organization, business, connection, reference, purpose and key version. Private credential rows store ciphertext only; safe integration metadata carries a bound reference. AI/BYOK retains `UnconfiguredCredentialStore` and cannot access the Shopify purpose.

Production activation requires a valid versioned keyring injected from a managed secret store and `SHOPIFY_VAULT_KEY_SOURCE=managed-secret-store`. This value is an operator attestation, not a provisioned cloud KMS. The environment in this repository does not automatically acquire production-grade key management. Configure runtime IAM, separate key/database access, secure backups, recovery, rotation and log redaction before activation. No per-shop plaintext token belongs in environment variables or browser storage. Key rotation retains old decrypt versions while refresh/reconnect writes with the new key. Bulk rewrap is not implemented. See [Shopify setup](shopify.md).

OAuth state is random, digest-only, short-lived, user/org/business/shop/callback-bound and atomically consumed. HMAC, timestamp, canonical host and Secure/HttpOnly browser cookie are checked before code exchange. No callback-supplied tenant is accepted. Same-origin owner-only management and durable rate limits apply. Fixed-host GraphQL and token requests disallow redirects and time out. Logs/errors/audits omit codes and tokens. Development callback request logging is suppressed; hosting/tunnel/CDN redaction must be configured separately.

Token refresh has a durable exclusive lease and generation/reference checks. Concurrent refresh losers fail closed; stale completions cannot undo disconnect or overwrite a newer credential. Installation is fenced against active refresh/code exchange. Unknown or additional/write scopes reject. A verified store cannot be claimed by another tenant. Webhooks validate raw-body HMAC and signed shop identity, deduplicate, revoke uninstall credentials and persist pending minimal privacy requests. Privacy fulfillment still requires a monitored operator process; audit deletion/retention must be reviewed before public launch.

## Privileged database key

`SUPABASE_SECRET_KEY` is intentionally server-only and required for internal action/audit storage and durable rate limiting. It has service-role power; RLS does not constrain it. The client factory is isolated in `lib/server/db/client.ts` and never uses request cookies. Tenant repositories check their verified context and relevant approval RPCs recheck current membership. All UI reads use session/RLS clients. Do not export the factory through shared/client modules, log its configuration or use it for general browser CRUD. Restrict runtime secret-manager access and rotate the key if exposed. Consider a narrower backend database role before expanding privileged persistence to real executors.

## Review performed

| Area                      | Result                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Service key / NEXT_PUBLIC | Only URL and publishable key are public. Server imports and built client bundles scanned for privileged/vault/transport markers.                             |
| Tenant / role forgery     | Context ignores client actor/role; switches require matching membership and business. SQL tests attempt cross-tenant reads and writes.                       |
| Secret material           | Shopify ciphertext is private and purpose/tenant authenticated. Verified metadata alone permits connected status. AI/BYOK remains unavailable.               |
| Logs and errors           | New code logs no session, password, key, token or database payload. Client errors use fixed messages. Hosting-layer query logging still needs configuration. |
| SQL injection             | No interpolated user SQL; Supabase query builder and bound RPC parameters. Security-definer functions use an empty search path and explicit object names.    |
| CSRF / redirects          | Next Server Actions plus canonical Origin check. No arbitrary return URL or client-controlled OAuth redirect.                                                |
| Approval replay           | Database lock/revision/expiry/fingerprint/consumption checks; terminal receipts cannot transition again.                                                     |
| Credential purpose        | Shopify vault rejects wrong tenant/business/connection/reference/purpose/key/tag; AI provider vault remains blocked.                                         |
| Tenant/UI state           | Server identity and durable data revalidate on switch. Remaining frontend demo data stays labeled and is not an authorization source.                        |

This is an implementation review and regression suite, not an independent penetration test or completed production security certification.

## Remaining production requirements

Apply and verify migrations on a real Supabase project; configure URL/keys/SMTP/email templates; validate real multi-user sessions and PostgREST; test lock races on independent Postgres connections; configure HTTPS, logging redaction, edge rate limiting/CAPTCHA, backups, monitoring, key rotation and retention. Supabase's own public Auth API requires its own abuse settings. There are no background maintenance jobs in this phase.

Before **Shopify production**: apply migration 003, provision managed encryption keys, register app/webhooks, validate real installation/refresh/scopes and implement monitored privacy fulfillment. Before **real AI**: provider-specific vault/consent/budgets/metering and account validation. Before **real writes**: transactional outbox/reconciliation, idempotent external execution, trusted current snapshots, optimistic concurrency and failure recovery across the database/vendor boundary. An approval in this phase cannot activate a real write.

No AI API request, Shopify mutation, autonomous advertising, customer message, financial write, embedding, background job or Product Research implementation was added. No real Shopify account was used for validation.
