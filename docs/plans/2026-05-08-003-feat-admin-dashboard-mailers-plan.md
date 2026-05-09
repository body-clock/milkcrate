---
title: feat: Admin dashboard, notification emails, and fix mail delivery
type: feat
status: active
date: 2026-05-08
---

# feat: Admin dashboard, notification emails, and fix mail delivery

## Summary

Add an admin dashboard at `/admin` to track incoming store applications, wire up an admin notification email on new applications, and fix the production mailer configuration so emails actually deliver. Admin dashboard uses HTTP basic auth following the existing Mission Control Jobs pattern. Admin notification reuses the existing `SellerMailer` with a new method. Mail delivery fix requires uncommenting and configuring SMTP settings in production.

## Problem Frame

Store applications are flowing in via the `/apply` → `/waitlist` flow, but there's no way to see them without checking the database directly. When a store applies, neither the applicant nor the admin receives an email — the applicant confirmation is queued but silently fails because production has no SMTP configuration. The `default from: "from@example.com"` and `host: "example.com"` are placeholder values.

The app already has an authenticated dashboard pattern: Mission Control Jobs at `/jobs` with HTTP basic auth via `Rails.application.credentials`. The admin dashboard should follow the same pattern.

## Requirements

- R1. An admin dashboard at `/admin` lists incoming waitlist applications with name, email, Discogs username, date, inventory size, and notes.
- R2. The admin dashboard is protected by HTTP basic auth, reusing the same credential pattern as `/jobs` (Mission Control Jobs).
- R3. An admin notification email is sent when a new store applies, containing the application details.
- R4. The applicant confirmation email delivers successfully in production.
- R5. SMTP delivery failures in production are surfaced (not silently swallowed).

## Scope Boundaries

- Full admin auth system (Devise, etc.) — HTTP basic auth is sufficient for a single-admin app.
- Waitlist review/approval/reject workflow — this is read-only listing.
- Admin ability to create stores or trigger syncs from the dashboard.
- Styling the admin beyond functional, readable markup.
- Changing the applicant-facing apply flow or form.

## Context & Research

### Relevant Code and Patterns

- `config/initializers/mission_control_jobs.rb` — HTTP basic auth pattern to follow: reads credentials from env or `Rails.application.credentials`, guards the `/jobs` engine.
- `app/mailers/seller_mailer.rb` — existing mailer with `confirmation` method. New `admin_notification` method follows the same shape.
- `app/controllers/waitlists_controller.rb` — `create` action queues `SellerMailer.confirmation(entry).deliver_later`. Admin notification will be queued alongside it.
- `app/views/seller_mailer/` — existing `confirmation.html.erb` and `confirmation.text.erb` templates to mirror.
- `app/frontend/pages/apply.tsx` — frontend apply page (unchanged, noted for context).
- `spec/mailers/seller_mailer_spec.rb` — existing mailer test to extend.
- `spec/requests/waitlists_spec.rb` — existing request spec that asserts mail delivery job enqueuing.
- `config/settings.yml` — application settings; `admin_email` will be added here.

### Institutional Learnings

None relevant.

## Key Technical Decisions

- **HTTP basic auth over Devise**: The app is single-admin with no user model. HTTP basic auth follows the existing Mission Control Jobs pattern and adds zero dependencies. Moving to Devise later is always possible but premature.
- **Admin dashboard as ERB, not Inertia/React**: Admin is a tool, not a customer-facing surface. ERB is simpler, faster to render, and doesn't add to the JS bundle. The `/jobs` dashboard already sets the precedent.
- **Admin notification as a separate mailer method**: `SellerMailer#admin_notification` is a distinct method from `#confirmation` — different recipient, different content. Both are triggered in the same controller action.
- **`Settings.admin_email` for config**: Follows the existing `Settings.discogs_username` pattern. Overridable per environment or via env var. No hardcoded email addresses.
- **SMTP provider is a deployment concern**: The plan configures the Rails mailer settings but the actual SMTP credentials (provider choice, API key) live in `Rails.application.credentials` — same as the Mission Control auth credentials.

## Implementation Units

### U1. Fix production mailer configuration

**Goal:** Emails deliver in production. SMTP is configured, `from:` address is real, host is correct, and failures are surfaced.

**Requirements:** R4, R5

**Dependencies:** None

**Files:**
- Modify: `config/environments/production.rb`
- Modify: `app/mailers/application_mailer.rb`
- Modify: `config/settings.yml`

**Approach:**
- Uncomment and configure `action_mailer.smtp_settings` in production.rb to read SMTP credentials from `Rails.application.credentials`. The credentials key structure (`smtp.address`, `smtp.user_name`, `smtp.password`, etc.) is standard Rails convention.
- Set `config.action_mailer.raise_delivery_errors = true` so failures are visible in logs.
- Fix `default_url_options` host to the real domain (read from `Settings` or an env var).
- Change `default from:` in `ApplicationMailer` from `"from@example.com"` to a real address (read from `Settings.mail_from` or similar).
- Add `mail_from` to `config/settings.yml` with a reasonable default.

**Execution note:** Test SMTP delivery by deploying to production or staging and submitting the apply form. Check `/jobs` for failed delivery jobs.

**Patterns to follow:**
- `config/initializers/mission_control_jobs.rb` — credentials pattern (`ENV.fetch(...) || Rails.application.credentials.dig(...)`).

**Test scenarios:**
- Test expectation: none — configuration change with no behavioral logic to test. The existing mailer specs assert the mail object's `from`/`to`/`subject`; those will be updated to match the new `from:` address in U2.

**Verification:**
- After deploy, submitting the apply form produces a delivered confirmation email (check inbox).
- Failed deliveries appear in the SolidQueue failed jobs at `/jobs`.
- `default_url_options[:host]` is not `"example.com"`.

---

### U2. Add admin notification email

**Goal:** When a store applies, the admin receives an email with the application details.

**Requirements:** R3

**Dependencies:** U1 (mail delivery must work for the notification to arrive)

**Files:**
- Modify: `app/mailers/seller_mailer.rb`
- Create: `app/views/seller_mailer/admin_notification.html.erb`
- Create: `app/views/seller_mailer/admin_notification.text.erb`
- Modify: `app/controllers/waitlists_controller.rb`
- Modify: `config/settings.yml`
- Modify: `spec/mailers/seller_mailer_spec.rb`
- Modify: `spec/requests/waitlists_spec.rb`

**Approach:**
- Add `admin_notification(waitlist)` method to `SellerMailer`. It receives the same `Waitlist` instance and sends to `Settings.admin_email`. Subject: descriptive with the store name (e.g., `"New Milkcrate application: Philadelphia Music"`).
- Create HTML and text templates displaying all waitlist fields: name, email, Discogs username, inventory size, notes, and submission date.
- In `WaitlistsController#create`, after `entry.save`, queue the admin notification alongside the confirmation: `SellerMailer.admin_notification(entry).deliver_later`.
- Add `admin_email` to `config/settings.yml`.

**Patterns to follow:**
- `app/views/seller_mailer/confirmation.html.erb` and `.text.erb` — same structure, different recipient and content.

**Test scenarios:**
- Happy path: Given valid params, `POST /waitlist` enqueues both the confirmation mail delivery job AND the admin notification mail delivery job.
- Happy path: `SellerMailer.admin_notification(waitlist).to` equals the configured admin email.
- Happy path: `admin_notification` mail body includes the store name, email, Discogs username, inventory size, and notes.
- Edge case: Given `Settings.admin_email` is nil/blank, the mailer raises or the job fails visibly (decide: raise on missing config vs. silently skip — the plan opts for raising so misconfiguration is caught).

**Verification:**
- Submitting the apply form queues two mail delivery jobs (confirmation + admin notification).
- Admin notification email arrives at the configured address with full application details.

---

### U3. Add admin dashboard

**Goal:** A protected page at `/admin` lists all waitlist applications.

**Requirements:** R1, R2

**Dependencies:** None (can be built independently of mail changes)

**Files:**
- Create: `app/controllers/admin/waitlists_controller.rb`
- Create: `app/views/admin/waitlists/index.html.erb`
- Create: `app/controllers/admin/base_controller.rb`
- Modify: `config/routes.rb`
- Create: `spec/requests/admin/waitlists_spec.rb`

**Approach:**
- `Admin::BaseController` inherits from `ApplicationController` and applies `http_basic_authenticate_with` using the same credential source pattern as Mission Control Jobs: env var or `Rails.application.credentials`.
- `Admin::WaitlistsController` inherits from `Admin::BaseController`. Single `index` action fetching `Waitlist.order(created_at: :desc)`.
- View is a plain HTML table with columns: name, email, Discogs username, inventory size, notes, submitted date. No pagination needed yet — waitlist volume is low.
- Route: `get "/admin", to: "admin/waitlists#index"`.
- No Inertia/React — a simple ERB layout with minimal styling (system font stack, basic table styling). The admin layout can reuse `app/views/layouts/application.html.erb` or a minimal standalone layout.

**Patterns to follow:**
- `config/initializers/mission_control_jobs.rb` — auth credential pattern.
- Mission Control Jobs engine at `/jobs` — precedent for admin tools behind basic auth.

**Test scenarios:**
- Happy path: `GET /admin` with valid credentials returns 200 and renders the waitlist table.
- Happy path: The table lists waitlist entries ordered by most recent first, showing all fields.
- Error path: `GET /admin` without credentials returns 401.
- Error path: `GET /admin` with wrong credentials returns 401.
- Edge case: `GET /admin` with no waitlist entries renders an empty state message.

**Verification:**
- Visiting `/admin` in a browser prompts for basic auth credentials.
- After authenticating, all submitted applications are visible in a table.
- The page renders without JavaScript (ERB-only, no React).

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| SMTP credentials not set in production after deploy | Document the required `Rails.application.credentials` keys in the plan; failed jobs visible at `/jobs` |
| Admin email not configured (`Settings.admin_email` is blank) | U2 mailer raises on missing config so the failure is visible at `/jobs` rather than silently skipped |
| Basic auth credentials not set in production | Reuses the same Mission Control credential pattern that's already working; admin dashboard is inaccessible (401) until configured, which is safe |

---

## Sources & References

- Related code: `app/controllers/waitlists_controller.rb`, `app/mailers/seller_mailer.rb`, `config/initializers/mission_control_jobs.rb`
- Related specs: `spec/requests/waitlists_spec.rb`, `spec/mailers/seller_mailer_spec.rb`
- Existing authenticated dashboard pattern: Mission Control Jobs at `/jobs`
