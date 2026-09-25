# Anti-Nerd

**Business made simple.**

A modular frontend foundation for starting, building, and running a business without needing technical expertise. Built with Next.js 16 App Router, React, TypeScript, Tailwind CSS 4, and Lucide icons.

The current visual system is **Anti-Nerd 2.0** (see the final section). Earlier update sections below are a chronological development record.

## Shopify read-only integration (current phase)

Supabase Auth and PostgreSQL now support verified accounts/workspaces, memberships, businesses, instructions, policies, approvals, append-only audit and safe disconnected connection metadata. The existing runtime/action/policy/integration architecture is preserved. **Real Shopify installation and reads are configurable. AI, BYOK, Shopify writes and autonomous actions remain disabled.** Shopify credentials use authenticated encryption and private storage; production requires managed key injection. Follow the ten-step [Shopify setup guide](docs/shopify.md), including the new third migration. Connected store/products/orders/customers/inventory screens use real data with explicit pagination and no silent mock fallback.

Start with [database setup](docs/database.md), [authentication and email setup](docs/authentication.md), [architecture](docs/architecture.md) and [security gates](docs/security.md). Without Supabase configuration, localhost displays the login/setup state; protected routes redirect to login. A real Supabase project, migrations and email configuration are required for account and workspace flows. No remote project was configured by this change.

```sh
npm run test:backend
npm run test:shopify
npm run test:persistence
npm run test:brain
npm run lint
npm run typecheck
npm run build
npm run check:boundaries
```

Only Supabase URL/publishable key are public. `SUPABASE_SECRET_KEY` and canonical `APP_BASE_URL` are server-side settings; see `.env.example`. Do not put user API keys or shop tokens there. Persistence tests execute migration SQL in local PGlite PostgreSQL; hosted Supabase/auth and multi-connection contention checks remain manual.

## Run locally

```sh
npm install
npm run dev
```

Open **http://localhost:5000**. The dev and production servers bind explicitly to `localhost`, which avoids the wildcard-port conflict with macOS AirPlay. To use authenticated workspaces, follow the Supabase setup above. No configuration is needed to view the login/setup page.

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

Production builds use Next.js’s supported Webpack compiler because Turbopack’s worker port binding failed in the execution sandbox. Development retains Turbopack. The existing `next/font` Geist setup downloads fonts during the first build, so that build needs network access.

## Routes

| Route               | Module                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/`                 | Overview, KPIs, revenue/profit chart, AI summary, team, attention center                                      |
| `/orders`           | Search, fulfillment filtering, order details                                                                  |
| `/customers`        | Customer search, VIP/returning filters, lifetime value                                                        |
| `/inbox`            | Email, WhatsApp and website conversations; editable suggestions and demo approval/rejection                   |
| `/customer-service` | Redirect to `/inbox` for existing bookmarks                                                                   |
| `/store`            | Storefront concept, store details and example improvement suggestion                                          |
| `/research`         | Sample products, opportunities, watchlist and locally saved research                                          |
| `/marketing`        | Future marketing modules and filterable sample campaigns                                                      |
| `/products`         | Product collection and stock overview                                                                         |
| `/ads`              | Campaign metrics and platform filters                                                                         |
| `/creatives`        | Creative library, format/performance tabs                                                                     |
| `/competitors`      | Sample competitors and market insights                                                                        |
| `/brain`            | Interactive knowledge map, memory controls, teaching, search, shared intelligence and explicit event previews |
| `/control-center`   | Autonomy modes, ordered goals, editable rules and shared approvals                                            |
| `/flows`            | Seven templates, editable/reorderable steps and simulated execution                                           |
| `/ai-team`          | Eight agent profiles, activity, status and autonomy controls                                                  |
| `/automations`      | Example workflows and local active/paused controls                                                            |
| `/finance`          | Contribution breakdown and profit trend                                                                       |
| `/reports`          | Period selection and report previews                                                                          |
| `/integrations`     | Categorized connections and demo connection flow                                                              |
| `/activity`         | Durable workspace approvals and append-only audit history                                                     |
| `/settings`         | Business profile, team, notifications, AI limits, permissions, billing, security                              |
| `/onboarding`       | Create organization, owner membership and first business                                                      |

## Structure

- `app/`: route entry points, root layout, design tokens/styles, loading/error/not-found boundaries.
- `components/layout/`: persistent app shell, responsive navigation, workspace/account dialogs, theme toggle and quick navigation (`⌘/Ctrl K`).
- `components/assistant/`: global right-side Ask Anti-Nerd panel, sample questions and session-only conversation history.
- `lib/assistant/demo-client.ts`: local-only implementation of the typed `AssistantClient` boundary. Exact sample prompts get canned replies; arbitrary questions receive an explicit demo explanation. No network or AI calls.
- `lib/business-terms.ts` and `components/ui/metric-label.tsx`: reusable simple labels, subtitles, hover tooltips and touch/keyboard-accessible explanations for ROAS, CPA, CTR, conversion and margin.
- `components/dashboard/`: overview sections, reusable agent cards, dependency-free SVG charts.
- `components/modules/`: feature-specific screens grouped by business domain.
- `components/ui/`: cards, headings, badges, tabs, search, native accessible dialogs and shared toast/preview feedback.
- `lib/mock-data/`: typed, deterministic sample business records.
- `lib/navigation.ts`: navigation metadata shared by sidebar and command search.
- `types/`: workspace, order, agent and audit-event contracts.

## Frontend boundaries

Authentication, workspace/business identity, instructions, persistent policies, approvals/audit and disconnected metadata use the real server persistence paths. Revenue, orders, conversations, ads, Research, Brain and automation visualizations remain demo data. Their local preview controls cannot change the durable policy or authorize external execution. Nothing is sent, refunded, imported, billed or changed on an external platform.

All sections below describe **earlier frontend phases**; statements about missing authentication/database or purely local approvals are historical. The current architecture and setup documents above take precedence.

## Validation

Lint, TypeScript checking through the production build, and static generation cover the application routes, including the four new product-shell entries and the legacy Inbox redirect. Browser checks cover the dashboard, responsive layouts, mobile navigation, order search/filter/detail flow, and approval/connection/onboarding previews. On a browser with an extension that injects `cz-shortcut-listen` into `<body>`, Next.js may show an extension-induced hydration warning; the application does not suppress it.

## Product-shell update

The existing overview layout, charts, card styles, spacing, typefaces, light/dark mode, and commerce workflows are retained. Sidebar groups are Home, Build, Run, Grow, Intelligence, Money, and Manage. The sidebar width is unchanged.

Research prices, margins, trends, competition and potential are fictional examples. Saved research lasts only while that page stays mounted. Store preview is a rendered concept, not a shop or checkout. Marketing statuses never schedule or send anything. Onboarding does not create a business, generate a store, set up payments or change the sample workspace.

No new runtime dependencies were added for this update. Real research, scraping, payments, store generation, integrations and AI are outside this phase.

## Dynamic intelligence update

The overview now includes a working-status preview, owner approvals, animated metrics, a finite activity feed and a digital workforce. Six of eight demo agents start working; the existing Competitor Agent remains alongside Store, Research, Ads, Creative, Support, Finance and Operations. Approval choices also appear in Activity.

`types/intelligence.ts` defines the agent, activity, approval, goal, rule, flow, status and instruction contracts. Deterministic records live in `lib/mock-data/intelligence.ts` and `flows.ts`; `components/intelligence/demo-provider.tsx` owns shared session state. `lib/flows/demo-builder.ts` is a replaceable typed adapter: keyword matching selects a predefined recipe and can insert a euro amount. It is not an AI model or general natural-language interpreter.

Settings includes communication, notification and decision styles plus business instructions. Dashboard customization supports section visibility/order, density and reduced motion. The start-business path includes an idea prompt and nine-stage scripted founder walkthrough, retaining the existing launch steps.

Motion uses CSS and requestAnimationFrame with no new dependency. Status/activity playback is finite and can be paused; flow and founder previews have explicit controls. Device reduced-motion preferences and the dashboard override disable motion and switch previews to manual steps.

Validation for this update: ESLint, standalone TypeScript and production build pass; every navigation route plus onboarding responds successfully. Browser checks cover shared rules and approvals, autonomy, dashboard customization, reduced-motion behavior, natural-language recipe selection, flow execution, editing/reordering/adding/removing steps and templates. Additional checks verified agent-status counts, preferences across navigation, all nine founder-preview stages with pause/resume, mobile Control Center and Flows at 390px, and Flows at 820px with no horizontal overflow. Reduced-motion behavior was exercised using the in-app override; the system preference is wired through matchMedia and CSS media queries.

## Business Brain

`/brain` adds a lazy-loaded SVG intelligence graph with ten keyboard-accessible categories, pointer rotation, bounded zoom and mobile category buttons. Depth comes from projected node positions, scale, orbital lines and soft lighting; there is no biological brain, WebGL renderer, animation render loop, or new dependency. Knowledge panels expose confidence, sources, correction, editing, pinning and forgetting. The page also includes a learned-items timeline, business summary/history, DNA, relationships, agent sharing, the understand–decide–act–measure–learn loop and illustrative coverage milestones.

`BrainWidget` exposes the same memory on Overview. Ask Anti-Nerd links to the Brain and labels the sources of its canned answers. Its replies remain predefined and do not dynamically reason over edited knowledge.

### Events and memory boundaries

- `types/brain.ts`: typed knowledge categories/types and job states (`idle`, `queued`, `thinking`, `researching`, `analyzing`, `executing`, `learning`, `waiting_for_approval`, `completed`, `failed`). Events carry an ID, run ID and explicit `demo` or `backend` provenance.
- `lib/brain/events.ts`: pure event reducer, duplicate-event handling and finite demo scenarios. A knowledge item is committed only by the completed learning event.
- `components/brain/brain-provider.tsx`: shared session memory and a single centralized demo runner. Timers exist in this runner, not the Brain presentation components. Previews begin only after an explicit action, can pause/stop, and pause when the document is hidden. Reduced motion uses manual event advancement. Refresh resets the session.
- `components/motion/intelligence-motion.tsx`: reusable status, processing, progress, success, insight and activity primitives. Learning connections animate only for a learning state; animations are bounded and respect reduced-motion preferences.

A future authenticated event adapter can validate server events and call `ingest(event)`; the same reducer and status-driven presentation apply. The demo scheduler should be excluded/disabled in production. This is a single-current-job frontend foundation, not a multi-job orchestration service. There is no network event source, real context retrieval, vector memory, AI, database, integration or authorization implementation.

Teaching simulates understanding and three predefined links (Products, Marketing and Finance/pricing), then inserts the owner instruction and updates illustrative totals. These links do not imply semantic analysis. Search performs local keyword/example matching. Coverage, history, financial impact and relationship claims are clearly labeled examples. Correcting or forgetting demo memory does not enforce a real business rule.

The prior automatic Overview status/activity playback has been removed. Overview starts ready/idle; discoveries and extra activity entries require user interaction. Approvals now use a brief centralized processing/completion sequence before updating the shared approval record and activity feed.

### Brain validation

`npm run test:brain` checks commit-on-completion, replay idempotency, backend event provenance, discovery ending at approval and search behavior. Browser checks cover graph controls/category panels, owner correction/pinning/forgetting, teaching and count changes, search/results/empty state, discovery/failure, reduced-motion manual stepping, Overview memory, approval processing/completion and assistant sources. Mobile (390px) and tablet (820px) have no horizontal page overflow; mobile detail panels fit the viewport. The graph has only ten nodes and 24 lines and is loaded separately from the ordinary dashboard. Lint, TypeScript, tests and production build pass.

## Product design quality pass

The existing routes and demo behavior remain intact. `app/design-system.css` is the shared product styling layer, loaded after the existing layout styles. It defines semantic light/dark palettes, text levels, surface depth, shadows, chart/Brain colors, typography sizes, interaction states and responsive rules. Existing variables are aliases so older modules inherit the system. Historical layout rules remain in `globals.css`; new product styling uses the shared tokens.

Overview has a compact period-aware health strip, paired intelligence panels on desktop, stronger profit emphasis and differentiated approval surfaces. `Card` has reusable surface variants. `Confidence`, `KnowledgeKind`, `ProgressRing`, `DiscoveryCard` and `MilestoneCard` provide shared trust/progress treatments. The milestone is available only inside the existing collapsed Brain demo controls and never claims an actual achievement.

The Brain keeps all ten category interactions, now arranged into four knowledge clusters with variable node sizes, peripheral knowledge dots, curved weighted links and a central intelligence hub. Its status header explains coverage and gaps. Learning signals only run on explicit learning events, stop when the graph leaves the viewport, and respect reduced motion. SVG remains lazily loaded; no new library or asset request is required.

Approvals show confidence and owner control up front; expanded details include sample evidence, risk, confidence limitations and expected effects. Confidence is qualitative, never an invented numeric certainty. Ask Anti-Nerd has contextual sample prompts and Ask/Do/Create/Analyze views; all answers/actions stay canned/local. The command menu opens existing routes, supports search, arrow keys, Enter and Escape, and does not execute external commands.

Performance charts now expose hover/tap/keyboard values with readable axes and restrained point highlights. Displayed distributions are illustrative and explicitly labeled; total revenue/contribution and profit values are retained. Store uses local SVG product silhouettes and editorial typography. Tables, settings, flows, agents, research and other modules inherit the same surface, type, button and state system.

Design-pass validation: all 22 screens were rendered at 390px without horizontal page overflow; Overview, Brain, Flows, Store, Ads and Control Center were checked at 820px. Desktop reviews covered Overview, Brain, Store and Ads, with dark-mode reviews of Brain and Store. Command shortcut, initial focus, arrow/Enter selection, empty search and Escape were exercised. Chart point values, contextual assistant prompts, approval evidence, keyboard Brain nodes, milestone dismissal and reduced-motion discovery/milestone states were tested. Base light secondary/tertiary and dark secondary text token pairs meet WCAG AA contrast (at least 4.5:1) on their intended surfaces; this is not a claim of a complete accessibility audit.

Final checks: `npm run lint`, `npm run typecheck`, `npm run test:brain` (4 passing) and `npm run build` pass. Every navigation route, onboarding and the Inbox legacy redirect responds successfully at localhost:5000. No runtime dependencies were added. The graph still has ten interactive categories; the quality pass adds lightweight decorative SVG context nodes and connections, with no per-frame JavaScript animation loop.

## Anti-Nerd Design System 2.0

The current identity combines graphite navigation, an off-white workspace and a restrained cobalt signal. Green is reserved for semantic success and positive results. Geist remains the typeface; larger, lighter display figures, tighter headings and small monospaced coordinates establish hierarchy. `app/design-system.css` supplies semantic tokens; `app/operating-system.css` supplies the new compositions and responsive adaptations, loaded last. Earlier update descriptions of green branding and unchanged dashboard layouts no longer describe the current UI.

New reusable components are `IntelligenceCore`, `BusinessHero`, `BusinessImpact`, `StoreStudio`, `CampaignRoom` and `ResearchObject`. The split-lens core uses intersecting SVG planes, an abstract A and signal paths. It replaces repeated brain icons in the main intelligence surfaces. The former stacked Overview health/status/Brain composition is replaced by one profit-led hero; its underlying helper components remain available. Shared tables, forms, dialogs and motion primitives are retained.

Overview presents profit, orders, spend, AI state and pending owner decisions together, followed by illustrative impact. Store makes the rendered storefront the main surface, with desktop/mobile controls and a reversible CTA/delivery-information proposal. Ads groups campaigns by sample return, displays four headline metrics and keeps CPA, purchases, platform filters and raw campaign data in an expandable section. Research uses local product illustrations with price, inferred sample unit cost, margin and evidence. AI Team becomes a list of specialist operations with contextual drawers. Control Center and Flows inherit the new hierarchy, selection states and surfaces.

Business Brain uses an integrated dark scene and actual perspective projection of ten category coordinates with depth sorting, curved relationships, satellite nodes, pointer parallax, rotation and zoom. Category panels expose confidence, sources, connections, unknowns and the next useful review. Owner confirmation now follows a learning/completion event sequence: it adds owner provenance and updates confidence only on completion, without duplicating knowledge or changing coverage totals. Reduced-motion users advance this sequence manually, including inside a memory panel.

Motion is finite and tied to states or user actions. Idle cores have no CSS animation or JavaScript render loop. The graph is lazy-loaded, its signals stop offscreen and reduced motion disables animation and passive pointer tilt. No runtime dependencies, WebGL context, external image downloads or continuous frame loop were added. The graph contains ten interactive nodes and approximately 277 DOM/SVG elements including its controls and core; this is an implementation check, not a frame-rate benchmark.

Recommendations continue to disclose sample evidence, confidence, expected effects, risk and owner control. All impact values, research findings, campaign classifications, agent states and memory previews are demonstrative. At the end of this visual-design phase, no backend, AI connection, database, external commerce integration or production event source had been added. The newer backend-foundation section above describes the current server architecture.

Validation: all 22 screens render at 1440px, 1280px and 390px without horizontal page overflow. The eight principal redesigned screens were visually reviewed at those widths; tablet review at 820px found and corrected a topbar overflow. Functional browser checks cover store proposal/undo/device switching, campaign grouping/details/raw-data disclosure, memory confirmation and provenance, reduced-motion manual completion, Brain keyboard category selection, rotation/zoom/reset, mobile navigation, command shortcut/search/Enter and dark surfaces. Idle core styles report no active animation; reduced-motion learning styles also report none. The existing automated Brain suite now has five passing tests, including confirmation completion and idempotency. ESLint, standalone TypeScript and the production Webpack build pass. The only build notice concerns an unrelated lockfile outside this repository.
