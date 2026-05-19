---
title: feat: Free + Pro revenue model with Stripe billing
type: feat
status: active
date: 2026-05-16
origin: docs/ideation/2026-05-16-revenue-model-premium-tier-ideation.md
---

# feat: Free + Pro Revenue Model with Stripe Billing

## Summary

Create a User model for store owners, integrate Stripe billing via the Pay gem to support Free and Pro subscription tiers, add a feature entitlement system that gates Pro capabilities behind `store.plan`, and implement the v1 Pro feature bundle: store identity controls, crate ordering/pinning, and a conversion proof dashboard. The Free tier continues as the current Milkcrate-branded storefront with operational caps (100 listings, daily sync). Custom domain support is deferred to follow-up work.

---

## Problem Frame

Milkcrate has a working Free product but no revenue model. STRATEGY.md names "Store onboarding & freemium model" as an active track; stores cannot pay, there is no store-owner identity layer, and all features are available to every store with no limits. The ideation doc recommends a Free + Pro model starting at $29/mo. To ship this, the codebase needs authentication, billing infrastructure, entitlement gating, and Pro feature surfaces — none of which exist today.

---

## Requirements

- R1. Store owners can create an account, log in, and manage their store
- R2. Store owners can subscribe to a Pro plan via Stripe Checkout
- R3. Pro features are gated server-side by the store's plan tier
- R4. Free tier applies operational limits (listing count, sync frequency, store count)
- R5. Pro tier unlocks identity controls, crate ordering/pinning, and a conversion dashboard
- R6. Stripe webhooks are handled idempotently and update Store plan state
- R7. Billing emails (receipts, payment failures, grace period) are sent
- R8. Existing Free stores continue working with no disruption during rollout

**Origin actors:** A1 (store owner), A2 (Milkcrate admin)
**Origin flows:** F1 (Free store browsing — unchanged), F2 (Pro upgrade — subscribe via Stripe), F3 (Subscription management — Customer Portal)
**Origin acceptance examples:** AE1 (Pro features hidden on Free plan), AE2 (Stripe Checkout flow completes subscription), AE3 (Webhook updates Store plan)

---

## Scope Boundaries

- **Free tier remains the same product experience** — no gating of existing browsing features (store pages, crate browsing, Milkcrate Picks, Discogs handoff, local pile)
- **Pro tier v1** includes identity controls (name, description, social links, contact info, branding controls), crate ordering/pinning, and a conversion proof dashboard — not the full merchandising console
- **Custom domain support is deferred** — requires DNS/SSL infrastructure and a separate Kamal/Thruster configuration pass
- **Starter ($12/mo) and Concierge ($79-99/mo) tiers are deferred** — per ideation doc recommendation
- **No full white-labeling** — Milkcrate branding reduced on Pro but not removed
- **No featured placement credits or success-fee models** — deferred per rejected ideas

---

## Context & Research

### Relevant Code and Patterns

| Pattern | File/Module | How to Apply |
|---------|------------|--------------|
| Service objects with `.call` | `app/services/store_onboarding.rb` | Billing service objects (subscription activation handlers) follow same pattern |
| Strategy pattern with common interface | `app/services/storefront/crate_strategies/` | Model each plan tier as a strategy object with `features_for(store)` |
| Data.define result objects | `app/services/store_onboarding.rb` | Billing result types follow existing pattern |
| Provider → Hook → Gate component stack | `app/frontend/contexts/viewport_context.tsx` | `PlanProvider` → `useEntitlement` → `<Gate>` mirrors this exactly |
| Inertia shared props | `app/controllers/application_controller.rb` | Share `auth` and `billing` state globally |
| Presenter pattern for bounded data | `app/presenters/marketing_preview_presenter.rb` | Presenter caps Pro data for Free stores |
| Solid Queue recurring jobs | `config/recurring.yml` | Trial expiry checks or sync-limit enforcement |
| Admin dashboard | `app/controllers/admin/dashboard_controller.rb` | Conversion dashboard follows same pattern |

### Institutional Learnings

| Learning | Source | Application |
|----------|--------|-------------|
| Guard-condition parity audits prevent Pro/Free branching bugs | `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md` | Every `isPro ? X : Y` branch must have guard conditions on both paths; test every surface under every plan |
| Strategy-object pattern for new selection/decision logic | `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md` | Plan tier strategies implementing shared interface, one shared constant set |
| Four-layer architecture (Tokens → Provider → Hook → Wrapper) | `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md` | Entitlement system uses exact same stack: tokens → PlanProvider → useEntitlement → Gate |
| Provider-stripping in nested layouts for tests | `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md` | Mock PlanProvider in tests so `renderWithPlan` propagates |
| Bounded preview data for non-paying stores | `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md` | Presenter caps Pro feature payloads for Free stores — same as MarketingPreviewPresenter |
| Conditional hook rule (no `if (plan) { useEntitlement() }`) | See viewport context doc | Call `useEntitlement()` unconditionally; missing PlanProvider should crash at render time |
| Cross-surface feature test matrix | See vendor brand doc | `describe.each(plans)` rendering every surface under every plan tier |

### External References

- Pay gem v11.6+: Checkout Sessions, Customer Portal, webhook lifecycle, Fake Processor (pay-rails.github.io)
- Stripe Ruby gem v19.1: Latest API patterns, webhook construct_event
- Inertia Rails: `inertia_location` for external redirects (Stripe Checkout), shared props pattern
- Solid Queue: `limits_concurrency` for webhook deduplication
- Rails 8.1 `generates_token_for` for magic link auth (has_secure_password companion)
- CSP reference: Stripe.js domains (js.stripe.com, api.stripe.com, m.stripe.network, checkout.stripe.com, hooks.stripe.com)

---

## Key Technical Decisions

1. **Pay gem for Stripe integration** — Zero billing infrastructure exists. Pay provides subscription lifecycle, webhook deduplication, email templates, and a Fake Processor for testing. The codebase only needs Stripe (no multi-processor), and Pay handles the common billing complexity so the plan focuses on Pro features rather than re-implementing Stripe plumbing.
2. **User model with `has_secure_password`** — No auth system exists. A minimal User model (email, password_digest, belongs_to :store) integrates cleanly with Pay and gives store owners login capability. `has_secure_password` is lighter than Devise and sufficient for single-owner-per-store.
3. **Boolean entitlement columns on Store** — Binary Free/Pro model doesn't need Flipper. `plan` string column, `pro_features_enabled` boolean, and `listing_limit` integer on `stores` table. JSONB `settings` column for per-store configuration. Plan limits are code-constant, not database-driven.
4. **Bounded presenters for Free-tier Pro data** — Following the MarketingPreviewPresenter pattern, Pro feature data is scoped server-side. Free stores don't receive Pro payloads; Free presenters return limited or null data.
5. **`inertia_location` for Stripe Checkout redirects** — Stripe Checkout is a hosted redirect. Inertia's `inertia_location` returns 409 with X-Inertia-Location header, triggering `window.location` replacement. The return from Stripe is a full page load, handled normally.

---

## Open Questions

### Resolved During Planning

- **Pay gem or manual Stripe?** → Pay gem. Subscription lifecycle, webhook dedup, and Fake Processor outweigh the schema coupling concern for a first billing system.
- **Auth model?** → User model + has_secure_password. Lightest path that integrates with Pay and provides login for store owners.
- **v1 Pro feature scope?** → Identity controls, crate ordering/pinning, conversion dashboard. Not the full merchandising console.

### Deferred to Implementation

- Exact Stripe Price IDs (created in Stripe Dashboard, configured via Settings)
- Full email copy for billing notifications (templates created with placeholder text)
- CSP nonce interaction with Stripe.js — verify in browser after deployment
- Backfill strategy for existing stores (migration creates Users for waitlist stores post-deployment)

---

## Implementation Units

### U1. User Model and Authentication

**Goal:** Create the store owner identity layer — User model, sessions, login/logout pages, shared auth props.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Create: `app/models/user.rb`
- Create: `app/controllers/sessions_controller.rb`
- Create: `app/controllers/concerns/authentication.rb`
- Create: `app/frontend/pages/sessions/new.tsx`
- Create: `db/migrate/XXXXXX_create_users.rb`
- Modify: `app/controllers/application_controller.rb`
- Modify: `app/frontend/types/inertia.ts`
- Test: `spec/models/user_spec.rb`
- Test: `spec/requests/sessions_spec.rb`
- Test: `spec/system/inertia/auth_shared_props_spec.rb`

**Approach:**
- User model: email (unique, not null), password_digest, name, references :store (nullable initially, set during U2)
- Use `has_secure_password` with bcrypt
- Sessions controller: `new` (login form), `create` (authenticate + set session), `destroy` (logout)
- ApplicationController: `current_user`, `user_signed_in?`, `authenticate!` before_action
- Inertia shared auth props: `auth.user` (serialized), `auth.signed_in` (boolean)
- Login page: email + password form, Inertia form helper, flash error on failure
- CSP: no changes needed for auth pages
- Protect only billing routes and store owner pages — existing storefront remains public

**Patterns to follow:**
- Inertia shared props pattern in `app/controllers/application_controller.rb`

**Test scenarios:**

*Happy path:*
- User with valid email/password logs in and sees redirect to store dashboard
- User logs out and session is cleared
- Protected route redirects unauthenticated user to login page

*Edge cases:*
- Email with different casing is looked up case-insensitively
- User attempts login with non-existent email — generic error, no user enumeration
- Session expires — user is redirected to login

*Error paths:*
- Login with wrong password — flash error, re-renders form without clearing email field
- User exceeds max login attempts (n/a for v1, note for future rate limiting)

**Verification:**
- Login page renders at `/login`
- Authenticated user sees `auth.signed_in: true` in page props
- Unauthenticated user cannot access `/subscribe/new` (redirected to login)

---

### U2. Store Owner Onboarding and Store Claiming

**Goal:** Link Users to Stores, create the "claim your store" flow for existing stores, and ensure new stores get an owner on creation.

**Requirements:** R1, R8

**Dependencies:** U1

**Files:**
- Modify: `db/migrate/XXXXXX_create_users.rb` (or separate migration to add store_id)
- Create: `app/controllers/onboarding_controller.rb`
- Create: `app/frontend/pages/onboarding/claim.tsx`
- Create: `app/mailers/store_owner_mailer.rb`
- Create: `app/views/store_owner_mailer/claim_store.text.erb`
- Modify: `app/controllers/admin/onboardings_controller.rb`
- Modify: `app/services/store_onboarding.rb`
- Test: `spec/requests/onboarding_spec.rb`
- Test: `spec/mailers/store_owner_mailer_spec.rb`

**Approach:**
- `User` belongs_to `Store` (one-to-one) — add `store_id` FK (nullable, set after claim)
- Existing stores on the platform have no owner. Admin onboarding creates both User and Store records together
- Claim flow: Admin onboarded store → email notification sent to store's contact → store owner clicks magic link → sets password → store is claimed
- Use Rails 8's `generates_token_for :magic_link` with 24h expiry
- Admin onboarding controller (`POST /admin/waitlists/:waitlist_id/onboarding`) creates User + Store atomically (or creates Store first, then sends claim email)
- New stores from the waitlist onboarding flow create User automatically during onboarding
- 401/NotFound for expired/invalid claim links

**Patterns to follow:**
- `StoreOnboarding` service object pattern for creating Store + User
- Result objects via `Data.define`
- Mailer pattern from `SellerMailer` (plain text)

**Test scenarios:**

*Happy path:*
- Admin onboards waitlist member → claim email sent to contact address
- Store owner clicks valid claim link → redirected to set password → store claimed
- Store owner logs in after claiming → sees their store in dashboard

*Edge cases:*
- Claim link clicked twice — first click claims, second returns "already claimed" with login prompt
- Claim link after 24h expiry — user sees "link expired", gets option to resend
- Waitlist member with no email — admin prompted to supply email before onboarding
- Admin onboards store for existing waitlist member who already has User record — skip claim, link directly

*Error paths:*
- Email delivery fails — admin sees error notification, retry option
- Store_id already associated with a different User — prevent double-claim
- Magic link token tampered — invalid token, show error page

**Verification:**
- Admin onboarding creates User + Store records
- Claim email contains valid magic link
- Claimed store's `user_id` is set
- Invalid/expired token shows appropriate error page

---

### U3. Stripe Billing with Pay Gem

**Goal:** Integrate Stripe billing via the Pay gem — subscriptions, Checkout Sessions, Customer Portal, webhook endpoint.

**Requirements:** R2, R6, R7

**Dependencies:** U1

**Files:**
- Modify: `Gemfile` (add pay, stripe, receipts gems)
- Create: `config/initializers/pay.rb`
- Create: `app/controllers/subscriptions_controller.rb`
- Create: `app/frontend/pages/subscriptions/new.tsx`
- Create: `app/frontend/pages/subscriptions/show.tsx`
- Modify: `config/routes.rb`
- Modify: `config/initializers/content_security_policy.rb`
- Modify: `config/settings.yml`
- Create: `db/migrate/XXXXXX_create_pay_tables.rb` (from `bin/rails pay:install:migrations`)
- Modify: `app/models/user.rb` (add `pay_customer` macro)
- Modify: `app/controllers/application_controller.rb` (share billing state globally)
- Test: `spec/requests/subscriptions_spec.rb`

**Approach:**
- Add `pay_customer` to User model
- Configure Pay initializer with Stripe API keys from credentials
- SubscriptionsController#new: creates Checkout Session via `user.payment_processor.checkout(mode: "subscription", ...)` and renders `subscriptions/new` with `checkout_url`
- SubscriptionsController#show: syncs subscription state, renders status + Customer Portal link
- Frontend: "Redirecting to Stripe..." loading state, then `inertia_location` for Checkout redirect
- Customer Portal link via `user.payment_processor.customer.billing_portal_url(return_url: subscription_url)`
- CSP updates: add Stripe.js domains (js.stripe.com, api.stripe.com, m.stripe.network, checkout.stripe.com, hooks.stripe.com) to script-src, connect-src, frame-src
- Stripe Price IDs in `Settings.pay.stripe_prices` (config per environment)
- Pay's webhook endpoint at `/pay/webhooks/stripe` — automatic, no custom controller needed
- Pay's built-in deduplication handles duplicate webhook delivery

**Patterns to follow:**
- Service objects for handler logic
- `inertia_location` for external redirects (see Inertia Rails docs)
- Settings via config gem (existing pattern)

**Test scenarios:**

*Happy path:*
- Authenticated user visits `/subscribe/new` → sees plan comparison + Subscribe button
- Clicking Subscribe creates Checkout Session → redirects to Stripe
- User completes Stripe Checkout → returns to app → sees subscription confirmation
- User visits `/subscribe` → sees active subscription with plan details and Customer Portal link

*Edge cases:*
- User already subscribed → redirects to `/subscribe` (not `/subscribe/new`) with notice
- User subscribes with annual vs monthly — Price ID varies, Checkout Session reflects choice
- User cancels in Stripe Checkout → returns to `/subscribe/new` via cancel_url

*Error paths:*
- Stripe API returns error during Checkout Session creation → flash error, re-render page
- Stripe webhook endpoint returns non-200 → Stripe retries; Pay handles this
- Network failure after Stripe redirect but before webhook delivers → subscription shows as pending on `/subscribe`

**Verification:**
- `/subscribe/new` renders for authenticated users; redirects to login for unauthenticated
- Inertia form submit creates a Stripe Checkout Session
- `/subscribe` shows subscription status synced from Stripe
- Customer Portal link redirects to Stripe
- CSP allows Stripe.js to load and connect

---

### U4. Subscription Lifecycle Management

**Goal:** Handle Stripe webhook events that affect subscription state — activation, update, deletion, payment failure — and sync plan state to Store records.

**Requirements:** R3, R6, R7

**Dependencies:** U3, U2 (Store must have owner User)

**Files:**
- Create: `app/services/subscription/subscription_activated_handler.rb`
- Create: `app/services/subscription/subscription_deactivated_handler.rb`
- Create: `app/services/subscription/subscription_updated_handler.rb`
- Create: `app/services/subscription/payment_failed_handler.rb`
- Create: `app/jobs/sync_store_limits_job.rb`
- Create: `app/mailers/billing_mailer.rb`
- Create: `app/views/billing_mailer/payment_failed.text.erb`
- Create: `app/views/billing_mailer/subscription_confirmed.text.erb`
- Create: `app/views/billing_mailer/plan_downgraded.text.erb`
- Modify: `config/initializers/pay.rb` (register webhook subscribers)
- Test: `spec/services/subscription/subscription_activated_handler_spec.rb`
- Test: `spec/services/subscription/subscription_deactivated_handler_spec.rb`
- Test: `spec/jobs/sync_store_limits_job_spec.rb`
- Test: `spec/mailers/billing_mailer_spec.rb`

**Approach:**
- Register Pay webhook subscribers in `config/initializers/pay.rb` for events: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- On subscription activation: set Store `plan: "pro"`, `pro_features_enabled: true`, `listing_limit: 10_000`
- On subscription deletion/expiry: set Store back to Free defaults
- On payment failure: set `Store#subscription_status: "past_due"`, send payment failed email, keep Pro features during grace period
- Grace period: Stripe's default is ~14 days of retries before marking subscription as `past_due` → `unpaid` → `canceled`
- Use Solid Queue's `limits_concurrency` per User ID for job deduplication (webhooks may arrive in bursts)
- Billing mailer: plain text templates following existing SellerMailer conventions (later upgrade to HTML)
- SyncStoreLimitsJob: idempotent — reads current plan state and updates Store record; safe to replay

**Patterns to follow:**
- Service objects with `.call` convention
- Mailer pattern from `SellerMailer`
- Solid Queue recurring jobs config

**Test scenarios:**

*Happy path:*
- `customer.subscription.updated` with `status: active` → Store plan set to `pro`, limits expanded
- `customer.subscription.deleted` → Store plan set to `free`, limits returned to defaults
- `invoice.paid` → no change to plan state (already active); log for audit

*Edge cases:*
- Duplicate webhook delivery — Pay dedup prevents double-processing; SyncStoreLimitsJob is idempotent
- Subscription status changes mid-cycle (upgrade from monthly to annual) — handler re-evaluates plan
- Multiple stores owned by same User — subscription applies to all of User's stores
- User has no stores yet — handler gracefully skips

*Error paths:*
- Webhook references User that doesn't exist (deleted) — handler logs warning, does not raise
- Stripe APIConnectionError during status lookup — retry via ActiveJob retry_on
- SyncStoreLimitsJob fails — Solid Queue retries up to configured max attempts, then discards and alerts

**Verification:**
- Webhook event received → Store plan updated in database
- Duplicate webhook events do not change plan state twice
- Payment failure email is sent when `invoice.payment_failed` fires
- Grace period: Store remains Pro during `past_due` status

---

### U5. Feature Entitlement System

**Goal:** Build the frontend and backend entitlement infrastructure — Store plan/limit columns, PlanProvider context, `useEntitlement` hook, `<Gate>` component, presenter-level data bounding, and guard conditions on all Pro features.

**Requirements:** R3, R4

**Dependencies:** U4 (subscription lifecycle populates plan columns)

**Files:**
- Modify: `db/migrate/XXXXXX_add_billing_to_stores.rb`
- Create: `app/models/concerns/plan_entitlements.rb`
- Create: `app/frontend/contexts/plan_context.tsx`
- Create: `app/frontend/hooks/use_entitlement.ts`
- Create: `app/frontend/components/ui/gate.tsx`
- Create: `app/frontend/types/plan.ts`
- Modify: `app/controllers/application_controller.rb` (share billing state)
- Modify: `app/frontend/layouts/app_layout.tsx` (PlanProvider)
- Create: `app/frontend/components/ui/upgrade_banner.tsx`
- Test: `spec/models/store/plan_entitlements_spec.rb`
- Test: `spec/frontend/hooks/use_entitlement.test.tsx`
- Test: `spec/frontend/components/gate.test.tsx`
- Test: `spec/frontend/components/upgrade_banner.test.tsx`
- Test: `spec/frontend/plan_surface_matrix.test.tsx`

**Approach:**

*Database* — migration adds to `stores`:
- `plan` string, default "free", not null
- `pro_features_enabled` boolean, default false, not null
- `listing_limit` integer, default 100, not null
- `settings` jsonb, default {}

*Model concern* — `PlanEntitlements`:
```ruby
PLAN_LIMITS = {
  "free" => { max_listings: 100, max_sync_frequency: 1440, max_stores: 1 },
  "pro"  => { max_listings: 10_000, max_sync_frequency: 60, max_stores: 5 }
}.freeze

def pro? = plan == "pro"
def plan_limits = PLAN_LIMITS.fetch(plan, PLAN_LIMITS["free"])
def listing_quota_remaining = plan_limits[:max_listings] - listings.count
def can_sync? = plan == "pro" || last_synced_at.nil? || last_synced_at < 24.hours.ago
def listing_quota_exceeded? = listings.count >= plan_limits[:max_listings]
```

*Frontend context* — `PlanProvider` wraps the app, reads `page.props.billing`:
- Provider reads `page.props.billing` on every navigation (Inertia shared props)
- Context value: `{ plan: string, subscribed: boolean, listing_count: number, listing_limit: number }`
- Renders children unconditionally (no conditional hook calls)

*Hook* — `useEntitlement(feature: string): boolean`:
- Maps features to required plan: `{ crate_ordering: "pro", conversion_dashboard: "pro" }`
- Pure context read — no API calls, no conditional rendering of the hook itself
- Missing PlanProvider raises at render time (TypeError on context)

*Gate component* — `<Gate feature="crate_ordering"><ProFeature /></Gate>`:
- `useEntitlement` inside the Gate determines visibility
- Renders `children` if entitled, `null` or fallback if not

*Upgrade banner* — shown on Free plan when browsing pages that would benefit from Pro:
- "Upgrade to control your crate order" on store management page
- "Upgrade to see your conversion data" on dashboard page

*Bounded presenters* — Pro feature presenters return limited/null data for Free stores:
- DashboardPresenter: free = aggregate counts only (no trends, no breakdown)
- StoreCurationPresenter: respects pinned crate order for Pro, generated order for Free

*Sync enforcement* — `StoreSyncService` caps sync at `listing_limit`, rejects sync if within cooldown:
```ruby
def sync(store)
  return SyncResult.new(skipped: true, reason: :rate_limited) if store.can_sync? == false
  listings = fetch_listings(store.discogs_username, limit: store.plan_limits[:max_listings])
  # ... normal sync logic truncated at limit
end
```

*Enforcement priority:*
1. Presenter never ships Pro data to Free stores
2. Controller never returns Pro features for Free stores
3. Frontend Gate hides Pro features even if data were to leak
4. Sync service enforces caps at the data layer

**Patterns to follow:**
- ViewportContext provider + hook pattern (four-layer architecture)
- Guard-condition parity audit from responsive-branching learning
- MarketingPreviewPresenter bounded data pattern
- Strategy pattern for plan limits

**Test scenarios:**

*Happy path:*
- Store with `plan: "free"` → `store.pro?` returns false, `store.plan_limits[:max_listings]` returns 100
- Store with `plan: "pro"` → `store.pro?` returns true, `store.plan_limits[:max_listings]` returns 10,000
- `useEntitlement("crate_ordering")` returns `false` for Free plan, `true` for Pro plan
- `<Gate feature="pro_feature">` renders children for Pro, hides for Free
- Store with 50 listings on Free plan → `listing_quota_remaining` returns 50

*Edge cases:*
- Store with unrecognized plan value falls back to Free limits gracefully
- Sync with `listing_quota_exceeded? == true` → sync stops at limit (or still syncs but caps at limit)
- Provider not rendered → `useEntitlement` raises TypeError (crash, not silent degradation)

*Integration scenarios:*
- Subscription webhook sets plan to "pro" → subsequent page loads show Pro state in `page.props.billing`
- Subscription webhook sets plan back to "free" → subsequent page loads hide Pro features
- Sync service respects listing limit for Free stores (fetches only up to 100)
- Free store with `listing_count > listing_limit` (legacy data) still syncs, caps at limit

**Verification:**
- `plan` column default is "free" for existing stores
- PlanProvider propagates correct plan context to all child components
- Gate components render/hide correctly in test harness with injected plan
- Cross-surface matrix test renders every Pro surface under every plan and asserts presence/absence
- Presenter for Free store returns bounded/null Pro data
- Sync service caps at listing limit

---

### U6. Pro Features: Identity Controls

**Goal:** Allow Pro stores to customize their storefront identity — name, description, social links, contact info, and Milkcrate branding reduction.

**Requirements:** R5

**Dependencies:** U5

**Files:**
- Create: `app/controllers/store/identity_controller.rb`
- Create: `app/frontend/pages/store/identity/edit.tsx`
- Create: `app/presenters/store_identity_presenter.rb`
- Modify: `app/frontend/components/store_header.tsx`
- Modify: `app/frontend/pages/stores/featured.tsx`
- Test: `spec/requests/store/identity_spec.rb`
- Test: `spec/presenters/store_identity_presenter_spec.rb`
- Test: `spec/frontend/pages/store/identity/edit.test.tsx`

**Approach:**
- Store identity fields stored in `stores.settings` JSONB: `description`, `social_links` (array), `contact_email`, `contact_phone`, `location`, `hours`
- Store owners access identity editor from a new `/store/identity` page (behind auth + Pro gate)
- Identity controller: `show` (form prefilled), `update` (save settings)
- Store header component shows enhanced identity for Pro stores (social links, contact, location)
- Milkcrate "Powered by Milkcrate" footer remains but moves to bottom (vs prominent position on Free)
- Presenter provides identity data to storefront: Free = current minimal header, Pro = enhanced header + branding footer placement
- Inertia form with validation (description max 500 chars, URL format validation for social links)

**Patterns to follow:**
- Presenter pattern for scoping feature data per plan
- Inertia form with validation (see existing apply form)

**Test scenarios:**

*Happy path:*
- Pro store updates description → storefront shows new description
- Pro store adds social links → storefront shows link icons
- Pro store sets contact email → storefront shows email link

*Edge cases:*
- Free store visits `/store/identity` → redirected with upgrade prompt
- Pro store submits empty description → reverts to generated description
- Social link with invalid URL → validation error, field highlighted

*Error paths:*
- Identity update fails validation → form re-renders with errors, no data saved
- Unauthenticated user visits `/store/identity` → redirected to login

**Verification:**
- Pro store's storefront shows enhanced identity (social links, contact, location)
- Free store's storefront shows current minimal header (no enhancement)
- `/store/identity` page renders for Pro store, redirects for Free store
- Identity updates persist and display correctly

---

### U7. Pro Features: Conversion Proof Dashboard

**Goal:** Give Pro stores a simple analytics dashboard showing outbound Discogs clicks, pile adds, and crate opens — with aggregate teasers visible on Free.

**Requirements:** R5

**Dependencies:** U5, U3 (subscription state for dashboard gating)

**Files:**
- Create: `app/controllers/store/dashboard_controller.rb`
- Create: `app/frontend/pages/store/dashboard/show.tsx`
- Create: `app/presenters/store/dashboard_presenter.rb`
- Create: `db/migrate/XXXXXX_create_store_events.rb`
- Create: `app/models/store_event.rb`
- Create: `app/controllers/store/events_controller.rb` (first-party event capture endpoint)
- Modify: `app/frontend/hooks/use_tracking.ts` (or equivalent event helper)
- Modify: `config/routes.rb`
- Test: `spec/requests/store/dashboard_spec.rb`
- Test: `spec/presenters/store/dashboard_presenter_spec.rb`
- Test: `spec/models/store_event_spec.rb`

**Approach:**

*Event capture* — first-party event pipeline:
- `store_events` table: store_id (FK), event_type (string: click_discogs, add_to_pile, open_crate), source (string: crate_name), recorded_at (timestamp)
- Lightweight client-side event dispatch: intercept Discogs link clicks, pile adds, crate opens → POST to `/store/events` (Fire-and-forget, no blocking UI)
- Use `fetch()` with `keepalive: true` for reliable event delivery on page unload
- No PII in events — just store, event type, source, timestamp

*Dashboard* (`/store/dashboard`):
- Free store: aggregate teaser — "Your store has sent X buyers to Discogs this week via Milkcrate's crates" — single number, no breakdown
- Pro store: detailed dashboard with card layout — total clicks, pile adds, crate opens, top performers (top crate, top record), week-over-week trend arrows, small table of crate rankings
- Data window: last 7 days default, 30-day and all-time tabs for Pro

*Presenter* — `DashboardPresenter`:
```ruby
def initialize(store:, plan:)
  @store = store
  @plan = plan
end

def as_json
  base = { period: "last_7_days", total_clicks: total_clicks }
  return base unless @plan.pro?

  base.merge(
    clicks_trend: weekly_trend(:click_discogs),
    top_crates: top_crates(5),
    top_records: top_records(5),
    pile_adds: count_by_type(:add_to_pile),
    crate_opens: count_by_type(:open_crate)
  )
end
```

*Event volume concerns* — initial estimates suggest low volume (dozens per store per day). No need for a message queue or batch ingestion yet. The table stays lean with an index on (store_id, event_type, recorded_at).

**Patterns to follow:**
- Admin Dashboard presenter pattern (`Admin::DashboardPresenter`)
- Existing Plausible analytics initialization
- Bounded presenter data for Free stores (from institutional learning)

**Test scenarios:**

*Happy path:*
- Pro store visits `/store/dashboard` → sees full analytics with trends and breakdowns
- Discogs link click is captured as `store_event` record
- Pile add is captured as `store_event` record
- Dashboard shows correct counts for selected period

*Edge cases:*
- New store with no events yet → dashboard shows "No data yet" message for both Free and Pro
- Free store visits `/store/dashboard` → sees aggregate teaser with "Upgrade to Pro for details" link
- Store with only 1 click event → dashboard renders correctly (no division by zero in trend calculation)
- Event capture fires on page unload → `keepalive: true` ensures delivery

*Error paths:*
- Event POST fails due to network error → silently fail (no user-visible error for tracking)
- Dashboard presenter for non-existent store → 404
- Unauthenticated access to `/store/dashboard` → redirect to login

**Verification:**
- Free store sees aggregate teaser only
- Pro store sees detailed dashboard with trends and breakdowns
- Events are captured and stored correctly
- Dashboard numbers match raw event counts

---

### U8. Pro Features: Crate Ordering and Pinning

**Goal:** Allow Pro stores to reorder crates on their storefront and pin specific crates to the top. Free stores keep algorithmically generated order.

**Requirements:** R5

**Dependencies:** U5, existing `StorefrontCuration` service

**Files:**
- Create: `app/controllers/store/curation_controller.rb`
- Create: `app/frontend/pages/store/curation/edit.tsx`
- Create: `app/presenters/store/curation_presenter.rb`
- Modify: `app/services/storefront_curation.rb`
- Modify: `app/models/store.rb` (add pinned_crate_ids, crate_order columns to settings JSONB)
- Test: `spec/requests/store/curation_spec.rb`
- Test: `spec/services/storefront_curation_spec.rb`
- Test: `spec/frontend/pages/store/curation/edit.test.tsx`

**Approach:**

*Data model* — store curation stored in `stores.settings` JSONB:
```json
{
  "pinned_crate_ids": ["new-arrivals", "thematic"],
  "crate_order": ["pinned", "genre", "picks", "featured"]
}
```

*Backend* — `StorefrontCuration` updated to accept optional overrides:
- If store is Pro and has `crate_order`, the CrateStrategies still run but `StorefrontCuration` reorders the output according to the override
- Pinned crates appear first, then remaining crates in specified order, then algorithmically ordered crates for crates not in the override list
- Free store: current behavior unchanged (picks, featured, genres in algorithmic order)

*Curation editor* (`/store/curation`):
- Drag-and-drop crate ordering UI (or up/down buttons for minimal v1)
- Pin/unpin toggle per crate
- Preview: "This is how buyers will see your store" button
- Must have at least one unpinned section (can't pin everything)
- Validation: at least 2 crate sections visible (no empty storefront)
- Save persists to `stores.settings`

*Presenter* — reads curation override, returns ordered crate list for Pro; returns generated order for Free

**Patterns to follow:**
- CrateStrategies strategy pattern — `StorefrontCuration` is the existing orchestrator
- Store settings via JSONB column (already established pattern in U5)
- Inertia form for curation settings

**Test scenarios:**

*Happy path:*
- Pro store reorders crates (pins "new-arrivals", reorders to [pinned, genre, picks]) → storefront shows crates in that order
- Free store → storefront shows algorithmically generated order (unchanged behavior)
- Pro store removes all overrides → storefront falls back to algorithmic order

*Edge cases:*
- Pro store pins all crates → validation error: "At least one crate section must remain visible"
- Pro store saves empty `crate_order` → falls back to algorithmic order (no crash)
- Crate referenced in `crate_order` no longer exists (e.g., store has no new arrivals data) → silently skipped, not an error
- Pro store with no curation settings → same as Free behavior
- Free store visits `/store/curation` → redirected with upgrade prompt

*Integration:*
- Crate order change → reflected on storefront immediately after save (no cache delay)
- Pro store subscribes, sets curation → Free storefront renders correctly (cross-contamination check)

**Verification:**
- Pro store's storefront shows crates in user-specified order
- Free store's storefront is unchanged
- `/store/curation` page renders for Pro store, redirects for Free store
- Existing crate tests pass unchanged for Free stores

---

## System-Wide Impact

- **Interaction graph:** U6-U8 add new authenticated routes behind `/store/*`, protected by Authentication concern + plan entitlement checks. Existing public routes (`/:slug`, `/`, `/apply`) unchanged.
- **Error propagation:** Pay webhook failures (Stripe API down) queue but do not crash the main request path. Event capture failures (U7) silently degrade. All entitlement checks should use local database state, not Stripe API — plan state is cached in Store columns.
- **State lifecycle risks:** Subscription status transitions are webhook-driven, with seconds-to-minutes delay. During this window, `Store#plan` may lag behind Stripe state. Acceptable — the webhook is the source of truth. Stores transitioning from Pro→Free may have temporarily stale Pro features until webhook delivers.
- **API surface parity:** Existing Plausible analytics continue working alongside new StoreEvents pipeline. No public API changes. One new internal endpoint (`POST /store/events`) for event capture.
- **Integration coverage:** Cross-surface plan matrix test (U5) ensures every Pro feature surface is tested under every plan tier. Guard-condition parity audit after each Pro feature unit.
- **Unchanged invariants:** All existing public storefront routes remain unauthenticated, gated only by plan entitlement on the Feature level (not access level). Store browsing, crate viewing, pile saving, and Discogs handoff remain free. No Store routes are gated by auth — only Store Owner routes (`/store/*`, `/subscribe/*`) are auth-gated.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Stripe API dependency for subscription state — if Stripe is down, stores may not be able to upgrade | Subscription status is cached in `Store#plan` column; upgrades blocked during Stripe outage, existing subscriptions unaffected |
| Pay gem coupling — Pay adds 7 tables and an opinionated schema | Acceptable for first billing system. If Pay becomes a constraint, migration to manual Stripe is straightforward (Pay stores WebhookEvents, Customers, Subscriptions, Charges — all mappable to Stripe API) |
| Existing stores overload listing_limit — some stores have 500+ listings already | Legacy stores are grandfathered: set their listing_limit to their current count (or 10,000 if already high). Only newly synced listings past limit trigger enforcement. |
| No existing store owner contact info for claiming flow | Admin onboarding collects email. Claim flow only applies to stores created after the User model exists. For existing stores, admin contacts store owner manually to set up their account. |
| Event capture volume could grow | Start with simple `store_events` table. If volume exceeds a few thousand events/day/store, batch ingestion or rollup aggregation can be added. |

---

## Documentation / Operational Notes

- **Stripe setup:** Create two products in Stripe Dashboard (Free, Pro), each with monthly and annual prices. Record Price IDs in `config/settings.yml` under `stripe.prices`.
- **Webhook configuration:** In Stripe Dashboard, create endpoint for `https://milkcrate.fm/pay/webhooks/stripe` listening for all subscription and invoice events.
- **Seeding:** After deployment, run a rake task or one-off script to set `plan: "free"` and appropriate limits on all existing stores.
- **Monitoring:** Track Pay webhook processing latency via Honeybadger. Alert if subscription activation > 5 minutes from webhook receipt.
- **Rollback:** To revert, set all stores back to `plan: free`, disable Pay routes, remove Stripe webhook endpoint. Stripe subscriptions remain active as orphaned customers — cancel manually if needed.

---

## Sources & References

- **Origin document:** [docs/ideation/2026-05-16-revenue-model-premium-tier-ideation.md](../../ideation/2026-05-16-revenue-model-premium-tier-ideation.md)
- **Related code:** `app/services/storefront_curation.rb`, `app/services/daily_curation_job.rb`, `app/presenters/admin/dashboard_presenter.rb`
- **Institutional learnings:** `docs/solutions/architecture-patterns/crate-strategies-pattern-2026-05-07.md`, `docs/solutions/architecture-patterns/storefront-animation-token-system-2026-05-08.md`, `docs/solutions/architecture-patterns/viewport-context-responsive-architecture-2026-05-09.md`, `docs/solutions/logic-errors/responsive-branching-guard-condition-drift-2026-05-13.md`, `docs/solutions/architecture-patterns/vendor-brand-responsive-surface-system-2026-05-14.md`
- **External docs:** Pay gem (pay-rails.github.io), Stripe API (stripe.com/docs), Inertia Rails (inertia-rails.dev), Solid Queue (github.com/rails/solid_queue)
