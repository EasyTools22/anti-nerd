# Authentication and workspaces

The app uses Supabase Auth email/password with `@supabase/ssr`. `/login`, `/signup`, `/forgot-password`, `/reset-password` and `/auth/confirm` share Anti-Nerd styling. There is no local password store, hardcoded login, implicit demo login or localStorage identity.

## Session boundary

`proxy.ts` refreshes and verifies signed claims, forwards updated cookies to Server Components and the browser, and redirects unauthenticated application requests to `/login`. Refreshed responses and redirects are `private, no-store`. The proxy is an early guard, not the authorization authority.

`lib/server/auth/context.ts` calls `auth.getUser()` to verify the current user, queries membership using that session/RLS, and resolves the active business within the verified organization. Every persistence action calls the same context layer. Browser body fields, arbitrary headers and user-editable auth metadata never define the trusted actor or role. The app does not use `getSession()` as authentication.

Workspace and business cookies are HttpOnly, SameSite=Lax, path `/`, Secure in production. They are **untrusted selection hints**, not permission tokens. Switching validates both organization membership and business ownership before saving them. Stale/revoked selections fall back to a currently authorized workspace; a forged requested switch is rejected. Invalid membership roles fail closed. Sign-in, sign-out and confirmation clear selection cookies to prevent account confusion.

The protected route group retains all original URLs and wraps the existing AppShell with safe identity DTOs. Anonymous users go to login. Signed-in users without a workspace go to onboarding. Onboarding atomically creates an organization, owner membership and separate first business. Existing users can use `/onboarding?new=1` to create another workspace. Shopify is optional; owners can connect it separately after setup.

## Email setup (manual)

In Supabase Authentication:

1. Enable the Email provider, email/password signup and **Confirm email**. Set the minimum password length to at least 12 characters to match the app. Disable anonymous sign-ins for this application.
2. Set Site URL to `http://localhost:5000` for development, or your exact HTTPS production origin. Register the same origin's `/auth/confirm` URL in the redirect allowlist. Keep development and production projects separate; avoid production wildcard redirects.
3. In **Confirm signup**, use this link target: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
4. In **Reset password**, use: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`.
5. Configure production SMTP, sender identity and delivery limits. Enable Supabase's auth rate limits and appropriate bot protection. The app's own PostgreSQL counters cannot protect direct calls to Supabase's public Auth API.
6. Test signup, expired/used links, login, logout, password recovery and a revoked session using real accounts in a development Supabase project. Recovery changes the password, requests global sign-out and returns to login. Already-issued JWT revocation follows Supabase's configured token/session semantics; don't assume instant revocation of every access token.

The confirmation handler only accepts `email` or `recovery`, bounds token length and uses fixed local destinations. It ignores arbitrary `next` or redirect parameters. Reset links, token hashes, auth cookies and URL query strings must be scrubbed from proxy/CDN/access logs. Email scanners that consume single-use links may require an explicit confirmation interstitial in a later iteration.

## Mutation and abuse boundary

Next Server Actions perform the framework's origin protections. The app additionally compares Origin with `APP_BASE_URL`, verifies the session, resolves current membership and applies a PostgreSQL-backed limit. Missing configuration fails closed. Login/signup/recovery share eight attempts per normalized email per 15-minute window; approval attempts allow 30 per user/minute; other workspace mutations allow 60 per user/minute. Raw email is not stored in counters; a SHA-256 subject digest is used. This digest is pseudonymous, not irreversible anonymization. Deploy edge IP/bot controls as well; account-based throttles alone cannot stop distributed abuse or account lockout attempts.

No in-memory production limiter exists. Unknown future limiter scopes are rejected. Shopify uses the existing mutation limiter; live AI remains blocked. Supabase secret-key configuration is required for counters, so auth submission is unavailable if it is missing. Invalid sign-in returns a generic message; recovery does not disclose whether an account exists. Raw Supabase/SQL errors are not returned to the client.

## Roles

| Role   | Read own tenant | Edit instructions | Change policies | Approve/reject |
| ------ | --------------- | ----------------- | --------------- | -------------- |
| owner  | Yes             | Yes               | Yes             | Yes            |
| admin  | Yes             | Yes               | No              | No             |
| member | Yes             | Yes               | No              | No             |
| viewer | Yes             | No                | No              | No             |

Team invitations, membership management, MFA UI, enterprise SSO and production account deletion are outside this phase. No client can grant itself a role. Membership administration is currently an operator task in Supabase. Business types support ecommerce, hospitality, restaurant, agency and other; currencies and timezones default to EUR/UTC on onboarding, with no editing UI yet.

Official implementation references: [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [password authentication](https://supabase.com/docs/guides/auth/passwords), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates). Installed Next.js authentication, cookies, proxy and Server Actions guides were consulted for this version.
