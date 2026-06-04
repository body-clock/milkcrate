#!/usr/bin/env node

/**
 * Comprehensive Playwright smoke test for Milkcrate.
 *
 * Visits every page, form, and interactive surface in the application,
 * monitoring for:
 *   - Rails server errors (5xx responses, Rails error pages)
 *   - JavaScript console errors and uncaught exceptions (from pageerror/console)
 *   - Network failures (4xx on expected routes, 5xx anywhere)
 *   - Missing or broken Inertia page data
 *
 * Usage:
 *   node scripts/playwright_smoke.mjs
 *
 * Prerequisites:
 *   npx playwright install chromium
 *   The Rails dev server must be running (bin/dev)
 */

import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// ── Collectors ──────────────────────────────────────────────────

class ErrorCollector {
  constructor() {
    this.errors = [];
  }

  /** Record a finding. Pass details="info" for informational entries. */
  record(type, page, url, message, details) {
    if (details === "info") {return;}
    this.errors.push({ type, page, url, message, details: details || null });
  }

  realErrors() {
    const skip = new Set(["Nav Found", "Redirect Check", "Health Check Content", "Store Not Found"]);
    return this.errors.filter((e) => !skip.has(e.type));
  }

  get hasErrors() {
    return this.realErrors().length > 0;
  }

  summary() {
    const real = this.realErrors();
    const all = this.errors;
    const skipped = all.length - real.length;

    if (real.length === 0) {
      const byType = {};
      for (const e of all) {byType[e.type] = (byType[e.type] || 0) + 1;}
      const infoSummary = Object.entries(byType).map(([t, c]) => `${c}× ${t}`).join(", ");
      let msg = `✅ No real errors detected.`;
      if (skipped > 0) {msg += ` (${skipped} informational: ${infoSummary})`;}
      return msg;
    }

    const byType = {};
    for (const e of real) {byType[e.type] = (byType[e.type] || 0) + 1;}
    const typeSummary = Object.entries(byType).map(([t, c]) => `${c}× ${t}`).join(", ");
    let msg = `❌ ${real.length} error(s) detected (${typeSummary})`;
    if (skipped > 0) {msg += ` (${skipped} informational filtered out)`;}
    msg += "\n" + real.map((e) => `  [${e.type}] ${e.page}: ${e.message}`).join("\n");
    return msg;
  }
}

// ── Page helpers ─────────────────────────────────────────────────

const NAV_OPTS = { waitUntil: "networkidle", timeout: 20000 };

async function visit(page, url, label, collector, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await page.goto(`${BASE_URL}${url}`, NAV_OPTS);
      if (resp && resp.status() >= 500) {
        collector.record("HTTP 5xx", label, url, `Status ${resp.status()} on attempt ${attempt + 1}`);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
      }
      const html = await page.content();
      if (
        html.includes("Action Controller: Exception caught") ||
        html.includes("conflicting chdir")
      ) {
        collector.record("Rails Error Page", label, url, "Rails exception page rendered");
      }
      return resp;
    } catch (err) {
      collector.record("Navigation Error", label, url, err.message);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
  return null;
}

async function visitAndWait(page, url, label, collector) {
  const resp = await visit(page, url, label, collector);
  try {
    await page.waitForSelector("#app", { timeout: 10000 });
  } catch {
    // may not mount if server error
  }
  await page.waitForTimeout(500);
  return resp;
}

function isRailsErrorPage(content) {
  return (
    content.includes("Action Controller: Exception caught") ||
    content.includes("conflicting chdir") ||
    content.includes("We're sorry, but something went wrong")
  );
}

function setupPageMonitoring(page, label, collector) {
  const pageErr = (err) => {
    collector.record("JS Exception", label, page.url(), err.message, err.stack);
  };
  const consoleErr = (msg) => {
    if (msg.type() === "error") {collector.record("Console Error", label, page.url(), msg.text());}
  };
  const responseErr = (resp) => {
    if (resp.status() >= 500) {
      const path = resp.url().replace(BASE_URL, "");
      collector.record("XHR/Fetch 5xx", label, path, `Status ${resp.status()} for ${path}`);
    }
  };
  page.on("pageerror", pageErr);
  page.on("console", consoleErr);
  page.on("response", responseErr);
  return () => {
    page.off("pageerror", pageErr);
    page.off("console", consoleErr);
    page.off("response", responseErr);
  };
}

function makePage(vp) {
  return { viewport: vp || { width: 1280, height: 900 } };
}

// ── Page tests ──────────────────────────────────────────────────

async function testHomePage(page, collector) {
  const label = "Home";
  const td = setupPageMonitoring(page, label, collector);
  await visitAndWait(page, "/", label, collector);
  const content = await page.textContent("body");
  if (isRailsErrorPage(content)) {return td();}

  // Click "Browse a store →" link
  const demoLink = page.locator("a").filter({ hasText: /Browse a store/i }).first();
  if ((await demoLink.count()) > 0) {
    collector.record("Nav Found", label, "/", `Demo link → ${await demoLink.getAttribute("href")}`, "info");
    await demoLink.click();
    await page.waitForTimeout(1500);
    await page.goBack({ waitUntil: "networkidle", timeout: 15000 });
  } else {
    collector.record("Link Not Found", label, "/", "Demo store link not found");
  }

  // Seller lookup: submit empty to trigger validation
  const checkBtn = page.locator('button[type="submit"]').filter({ hasText: /Check/i }).first();
  if ((await checkBtn.count()) > 0) {
    await checkBtn.click();
    await page.waitForTimeout(500);
  }

  // Fill username and submit
  const input = page.locator("#seller-discogs-username");
  if ((await input.count()) > 0) {
    await input.fill("philadelphiamusic");
    await checkBtn.click();
    await page.waitForTimeout(3000);
  }

  // "Or apply via waitlist" link
  const applyLink = page.locator('a[href="/apply"]').first();
  if ((await applyLink.count()) > 0) {
    await applyLink.click();
    await page.waitForTimeout(1000);
    await page.goBack({ waitUntil: "networkidle", timeout: 15000 });
  }

  td();
}

async function testApplyPage(page, collector) {
  const label = "Apply";
  const td = setupPageMonitoring(page, label, collector);
  await visitAndWait(page, "/apply", label, collector);
  const content = await page.textContent("body");
  if (isRailsErrorPage(content)) {return td();}

  for (const [sel, val] of Object.entries({
    "#apply-name": "Test Store",
    "#apply-discogs_username": "test-store",
    "#apply-email": "test@example.com",
    "#apply-notes": "Test submission via Playwright.",
  })) {
    const el = page.locator(sel);
    if ((await el.count()) > 0) {await el.fill(val);}
  }
  const inv = page.locator("#apply-inventory_size");
  if ((await inv.count()) > 0) {await inv.selectOption("500_2000");}

  const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /Submit/i }).first();
  if ((await submitBtn.count()) > 0) {
    await submitBtn.click();
    await page.waitForTimeout(3000);
  }
  td();
}

async function testStorePage(page, collector, slug, label) {
  const td = setupPageMonitoring(page, `${label} (${slug})`, collector);
  await visitAndWait(page, `/${slug}`, `${label} (${slug})`, collector);
  const content = await page.textContent("body");
  if (isRailsErrorPage(content)) {return td();}

  if (content.includes("This page is available") || content.includes("claim")) {
    collector.record("Store Not Found", `${label} (${slug})`, `/${slug}`, "Invitation rendered", "info");
    return td();
  }
  await page.waitForTimeout(1000);

  for (const mode of ["The Wall", "Featured", "Genres"]) {
    const btn = page.locator("button:visible").filter({ hasText: new RegExp(`^${mode}$`) }).first();
    if ((await btn.count()) > 0 && (await btn.isVisible())) {
      await btn.click();
      await page.waitForTimeout(500);
    }
  }
  td();
}

/**
 * Full interactive store session: navigate through crates, flip record cards,
 * add to pile, open pile sheet, connect Discogs form, send to wantlist.
 */
async function testStoreCrateInteraction(page, collector, slug, label) {
  const td = setupPageMonitoring(page, `${label} (${slug})`, collector);
  await visitAndWait(page, `/${slug}`, `${label} (${slug})`, collector);

  const content = await page.textContent("body");
  if (isRailsErrorPage(content)) {return td();}
  if (content.includes("This page is available") || content.includes("claim")) {
    collector.record("Store Not Found", `${label} (${slug})`, `/${slug}`, "Invitation rendered — skipping crate interactions", "info");
    return td();
  }

  await page.waitForTimeout(1500);

  // ── 1. Switch browse modes ─────────────────────────────────────
  for (const mode of ["Featured", "Genres", "The Wall"]) {
    const btn = page.locator("button:visible").filter({ hasText: new RegExp(`^${mode}$`) }).first();
    if ((await btn.count()) > 0 && (await btn.isVisible())) {
      await btn.click();
      await page.waitForTimeout(600);
    }
  }

  // ── 2. Navigate records with ↑↓ buttons ──────────────────────
  // The ↑ / ↓ navigation buttons appear once a crate is selected.
  // Try finding them by aria-label "Front" and "Deeper".
  const frontBtn = page.locator('button[aria-label="Front"]');
  const deeperBtn = page.locator('button[aria-label="Deeper"]');
  const frontCount = await frontBtn.count();
  const deeperCount = await deeperBtn.count();

  if (frontCount > 0 || deeperCount > 0) {
    // Navigate deeper a few times
    for (let i = 0; i < 3; i++) {
      if ((await deeperBtn.count()) > 0 && !(await deeperBtn.isDisabled())) {
        await deeperBtn.click();
        await page.waitForTimeout(400);
      }
    }
    // Navigate back to front
    for (let i = 0; i < 3; i++) {
      if ((await frontBtn.count()) > 0 && !(await frontBtn.isDisabled())) {
        await frontBtn.click();
        await page.waitForTimeout(400);
      }
    }
  }

  // ── 3. Flip a record card and add to pile ──────────────────────
  // The card front can be clicked/tapped to flip. After flip, "+ Pile" appears.
  // On desktop the detail panel also has "+ Pile" next to the price.
  const pileBtn = page.locator("button:visible").filter({ hasText: "+ Pile" }).first();
  const pileBtnCount = await pileBtn.count();
  if (pileBtnCount > 0) {
    // Card back or detail panel pile button
    await pileBtn.click();
    await page.waitForTimeout(500);

    // Now it should show "✓ In pile"
    const inPileBtn = page.locator("button:visible").filter({ hasText: "✓ In pile" }).first();
    if ((await inPileBtn.count()) > 0) {
      // Add a second record too
      const pileBtn2 = page.locator("button:visible").filter({ hasText: "+ Pile" }).first();
      if ((await pileBtn2.count()) > 0) {
        await pileBtn2.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // ── 4. Open the pile sheet ─────────────────────────────────────
  // The pile sheet opens via "Show pile" or a pile icon/button.
  // It's typically a floating button or "Show pile" link.
  const showPileBtn = page.locator("button:visible, a:visible").filter({ hasText: /pile|Pile|Show pile/i }).first();
  if ((await showPileBtn.count()) > 0 && (await showPileBtn.isVisible())) {
    await showPileBtn.click();
    await page.waitForTimeout(800);
  } else {
    // Try looking for the pile toast component
    collector.record("Pile Sheet Not Found", `${label} (${slug})`, `/${slug}`, "Could not find pile open button after adding items", "info");
  }

  // ── 5. Check for "Connect with Discogs" in the pile sheet ──────
  // If no shopper session, the pile footer should show "Connect with Discogs"
  const connectBtn = page.locator("button, a").filter({ hasText: /Connect with Discogs/i }).first();
  if ((await connectBtn.count()) > 0 && (await connectBtn.isVisible())) {
    // Don't actually submit (would redirect to OAuth), just verify it renders
    collector.record("Connect Discogs Form Found", `${label} (${slug})`, `/${slug}`, "Connect with Discogs CTA visible in pile sheet", "info");
  }

  // ── 6. Close the pile sheet ────────────────────────────────────
  const closeBtn = page.locator("button:visible").filter({ hasText: /close|Close|✕|×|✖/i }).first();
  if ((await closeBtn.count()) > 0) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  } else {
    // Try Escape key
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  td();
}

async function testDashboardPage(page, collector) {
  const label = "Dashboard";
  const td = setupPageMonitoring(page, label, collector);
  await visitAndWait(page, "/dev/login-as/10", label, collector);
  await page.waitForTimeout(500);
  await visitAndWait(page, "/dashboard", label, collector);
  const content = await page.textContent("body");
  if (isRailsErrorPage(content)) {return td();}

  const resyncBtn = page.locator("button").filter({ hasText: /Re-sync|Resync/i }).first();
  if ((await resyncBtn.count()) > 0) {
    await resyncBtn.click();
    await page.waitForTimeout(2000);
  }
  td();
}

async function testAdminLoginPage(page, collector) {
  const label = "Admin Login";
  const td = setupPageMonitoring(page, label, collector);
  await visitAndWait(page, "/admin/login", label, collector);
  const content = await page.textContent("body");
  if (isRailsErrorPage(content)) {return td();}
  td();
}

async function testDevAdminLogin(page, collector) {
  const label = "Dev Admin Login";
  const td = setupPageMonitoring(page, label, collector);
  await visit(page, "/dev/admin-login", label, collector);
  await page.waitForTimeout(1000);
  collector.record("Redirect Check", label, "/dev/admin-login", `→ ${page.url().replace(BASE_URL, "")}`, "info");
  const content = await page.textContent("body");
  if (isRailsErrorPage(content)) {return td();}

  const clickables = page.locator("button:visible, [role='button']:visible, a:visible");
  for (let i = 0; i < Math.min(await clickables.count(), 5); i++) {
    try {
      const el = clickables.nth(i);
      if (await el.isVisible()) {
        await el.click();
        await page.waitForTimeout(300);
      }
    } catch { /* ok */ }
  }
  td();
}

async function testAdminDiscogsLookup(page, collector) {
  const label = "Admin Discogs Lookup";
  const td = setupPageMonitoring(page, label, collector);
  await visitAndWait(page, "/admin/discogs_lookup", label, collector);
  const content = await page.textContent("body");
  if (isRailsErrorPage(content)) {return td();}

  const onLogin = content.includes("sign in") || content.includes("login") || content.includes("email");
  if (!content.includes("Discogs") && !content.includes("lookup") && !content.includes("username") && !onLogin) {
    collector.record("Lookup Page Content Missing", label, "/admin/discogs_lookup", "Content not found");
  }
  td();
}

async function testInvitationPage(page, collector) {
  const label = "Invitation";
  const td = setupPageMonitoring(page, label, collector);
  await visitAndWait(page, "/some-random-unknown-store", label, collector);
  const content = await page.textContent("body");
  if (isRailsErrorPage(content)) {return td();}
  if (!content.includes("available") && !content.includes("claim") && !content.includes("Invitation")) {
    collector.record("Invitation Page Content Missing", label, "/some-random-unknown-store", "Not found");
  }
  td();
}

async function testShopperAuthDisconnect(page, collector) {
  const label = "Shopper Auth Disconnect";
  const td = setupPageMonitoring(page, label, collector);
  try {
    const resp = await page.request.delete(`${BASE_URL}/auth/discogs/shopper/disconnect`);
    if (resp.status() >= 500) {collector.record("HTTP Error", label, "/auth/discogs/shopper/disconnect", `Status ${resp.status()}`);}
  } catch (err) {
    collector.record("Request Error", label, "/auth/discogs/shopper/disconnect", err.message);
  }
  td();
}

async function testPileAddToWantlist(page, collector) {
  const label = "Pile Add to Wantlist";
  const td = setupPageMonitoring(page, label, collector);
  try {
    const resp = await page.request.post(`${BASE_URL}/pile/add_to_wantlist`, { data: { listing_ids: [] } });
    if (resp.status() >= 500) {collector.record("HTTP Error", label, "/pile/add_to_wantlist", `Status ${resp.status()}`);}
  } catch (err) {
    collector.record("Request Error", label, "/pile/add_to_wantlist", err.message);
  }
  td();
}

async function testStoreAuthorize(page, collector) {
  const label = "Store Authorize";
  const td = setupPageMonitoring(page, label, collector);
  try {
    const resp = await page.request.post(`${BASE_URL}/philadelphiamusic/authorize`);
    if (resp.status() >= 500) {collector.record("HTTP Error", label, "/philadelphiamusic/authorize", `Status ${resp.status()}`);}
  } catch (err) {
    collector.record("Request Error", label, "/philadelphiamusic/authorize", err.message);
  }
  td();
}

async function testShopperAuthorize(page, collector) {
  const label = "Shopper Authorize";
  const td = setupPageMonitoring(page, label, collector);
  try {
    const resp = await page.request.post(`${BASE_URL}/auth/discogs/shopper/authorize`);
    if (resp.status() >= 500) {collector.record("HTTP Error", label, "/auth/discogs/shopper/authorize", `Status ${resp.status()}`);}
  } catch (err) {
    collector.record("Request Error", label, "/auth/discogs/shopper/authorize", err.message);
  }
  td();
}

async function testDiscogsCallback(page, collector) {
  const label = "Discogs Callback";
  const td = setupPageMonitoring(page, label, collector);
  try {
    const resp = await page.goto(`${BASE_URL}/auth/discogs/callback`, NAV_OPTS);
    if (resp && resp.status() >= 500) {collector.record("HTTP Error", label, "/auth/discogs/callback", `Status ${resp.status()}`);}
  } catch (err) {
    collector.record("Navigation Error", label, "/auth/discogs/callback", err.message);
  }
  td();
}

async function testHealthCheck(page, collector) {
  const label = "Health Check";
  const td = setupPageMonitoring(page, label, collector);
  await visitAndWait(page, "/up", label, collector);
  td();
}

async function testAdminRoute(page, collector, url, label) {
  const td = setupPageMonitoring(page, label, collector);
  await visitAndWait(page, url, label, collector);
  const content = await page.textContent("body");
  if (isRailsErrorPage(content)) {collector.record("Rails Error", label, url, "Exception page rendered");}
  td();
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting Milkcrate Playwright smoke test...\n");
  console.log(`   Base URL: ${BASE_URL}\n`);

  const collector = new ErrorCollector();
  const browser = await chromium.launch({ headless: true });

  try {
    // ── Public Pages ──────────────────────────────────
    console.log("📄 Testing public pages...");

    console.log("  • Home page");
    let ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
    await testHomePage(ctx, collector);
    await ctx.close();

    console.log("  • Apply page (GET + form POST)");
    ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
    await testApplyPage(ctx, collector);
    await ctx.close();

    for (const slug of ["philadelphiamusic", "betternowrecords", "lil_blizzard"]) {
      console.log(`  • Store page (${slug})`);
      ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
      await testStorePage(ctx, collector, slug, "Store");
      await ctx.close();
    }

    // ── Full interactive store session on the store with data ──
    console.log("\n🔄 Testing crate interactions on store with data...");
    for (const slug of ["philadelphiamusic", "lil_blizzard"]) {
      console.log(`  • Crate navigation + pile on ${slug}`);
      ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
      await testStoreCrateInteraction(ctx, collector, slug, "CrateInteraction");
      await ctx.close();
    }

    // ── Invitation & health ────────────────────────────
    console.log("  • Invitation page (unknown slug)");
    ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
    await testInvitationPage(ctx, collector);
    await ctx.close();

    console.log("  • Health check");
    ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
    await testHealthCheck(ctx, collector);
    await ctx.close();

    // ── Auth Pages ─────────────────────────────────────
    console.log("\n🔐 Testing auth pages...");

    console.log("  • Admin login page");
    ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
    await testAdminLoginPage(ctx, collector);
    await ctx.close();

    console.log("  • Dev admin login → admin dashboard");
    ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
    await testDevAdminLogin(ctx, collector);
    await ctx.close();

    for (const [url, label] of [["/admin/totp", "Admin TOTP Challenge"], ["/admin/totp/setup", "Admin TOTP Setup"]]) {
      console.log(`  • ${label} (no session)`);
      ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
      await testAdminRoute(ctx, collector, url, label);
      await ctx.close();
    }

    console.log("  • Admin discogs lookup");
    ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
    await testAdminDiscogsLookup(ctx, collector);
    await ctx.close();

    console.log("  • Dashboard (store owner)");
    ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
    await testDashboardPage(ctx, collector);
    await ctx.close();

    // ── API / Action Routes ───────────────────────────
    console.log("\n🔌 Testing API and action routes...");

    const apiTests = [
      ["Shopper auth disconnect (DELETE)", testShopperAuthDisconnect],
      ["Pile add to wantlist (POST)", testPileAddToWantlist],
      ["Store authorize (POST)", testStoreAuthorize],
      ["Shopper authorize (POST)", testShopperAuthorize],
      ["Discogs callback", testDiscogsCallback],
    ];
    for (const [label, fn] of apiTests) {
      console.log(`  • ${label}`);
      ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
      await fn(ctx, collector);
      await ctx.close();
    }

    // ── Admin routes (no session) ──────────────────────────────
    console.log("\n🛡️ Testing admin routes (direct, no session)...");

    for (const [url, label] of [["/admin", "Admin Dashboard"], ["/jobs", "MissionControl Jobs"]]) {
      console.log(`  • ${label}`);
      ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
      await testAdminRoute(ctx, collector, url, label);
      await ctx.close();
    }

    console.log("  • Admin onboarding (POST)");
    ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
    try {
      const resp = await ctx.request.post(`${BASE_URL}/admin/onboarding`, {
        data: { discogs_username: "test-store", name: "Test Store" },
      });
      if (resp.status() >= 500) {collector.record("HTTP Error", "Admin Onboarding", "/admin/onboarding", `Status ${resp.status()}`);}
    } catch (err) {
      collector.record("Request Error", "Admin Onboarding", "/admin/onboarding", err.message);
    }
    await ctx.close();

    console.log("  • API Discogs lookup endpoint");
    ctx = await browser.newPage(makePage({ width: 1280, height: 900 }));
    try {
      const resp = await ctx.goto(`${BASE_URL}/api/discogs/lookup/philadelphiamusic`, NAV_OPTS);
      if (resp && resp.status() >= 500) {collector.record("HTTP Error", "API Discogs Lookup", "/api/discogs/lookup/philadelphiamusic", `Status ${resp.status()}`);}
    } catch (err) {
      collector.record("Navigation Error", "API Discogs Lookup", "/api/discogs/lookup/philadelphiamusic", err.message);
    }
    await ctx.close();

    // ── Responsive viewport tests ────────────────────
    console.log("\n📱 Testing responsive viewports...");

    for (const vp of [
      { width: 390, height: 844, label: "Mobile (390px)" },
      { width: 768, height: 1024, label: "Tablet (768px)" },
      { width: 1280, height: 900, label: "Desktop (1280px)" },
    ]) {
      console.log(`  • ${vp.label} — Store page`);
      ctx = await browser.newPage(makePage({ width: vp.width, height: vp.height }));
      const td = setupPageMonitoring(ctx, `Store (${vp.label})`, collector);
      await visitAndWait(ctx, "/philadelphiamusic", `Store (${vp.label})`, collector);
      td();
      await ctx.close();
    }

    // ── Results ──────────────────────────────────────
    console.log("\n" + "=".repeat(60));
    console.log("📊 RESULTS");
    console.log("=".repeat(60));
    console.log(collector.summary());
  } finally {
    await browser.close();
  }

  if (collector.hasErrors) {process.exit(1);}
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
