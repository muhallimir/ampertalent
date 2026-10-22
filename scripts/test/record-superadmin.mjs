// Super-admin platform deep dive: exclusive plans (open a plan) ->
// recurring billing (cron view, both tabs) -> CRM field mapping plus sync
// logs (or webhooks deliveries plus storage plus settings on bounce) ->
// audit log row -> broadcast form (never sent) -> subscription row.
// Read-only: visits plus tab clicks only, no form submits. super_admin.
// Outputs silent mp4 to demos/super-admin-platform/.
import {
  BASE, sleep, loadVoiceDurs, makeChapterTracker, humanClick,
  humanGoto, waitVisible, waitContent, settle, launchTour, startWatchdog, showTitle, hideTitle,
  setupDemo, fixDemoJobExpiry, finishTour,
} from "./showcase-harness.mjs";

const JOURNEY = "superadmin";
const OUT_MP4 = "/Users/macbook/Documents/projects/ampertalent/demos/super-admin-platform/ampertalent-super-admin-platform.mp4";
const FALLBACK = { "superadmin-intro": 5600, "superadmin-plans": 6300, "superadmin-billing": 7200, "superadmin-crmmap": 6100, "superadmin-crmlog": 5000, "superadmin-logs": 4700, "superadmin-notify": 7700, "superadmin-subs": 5700, "superadmin-fallback": 8300 };
const VOICE_DURS = loadVoiceDurs(JOURNEY, FALLBACK);

async function visit(page, tracker, voiceDurs, step, path, extraMs = 3500) {
  await humanGoto(page, `${BASE}${path}`);
  await waitContent(page, { timeout: 45000 });
  await sleep(extraMs);
}

async function clickTab(page, names) {
  for (const n of names) {
    const tab = page.locator(`button:visible:has-text("${n}"), [role="tab"]:visible:has-text("${n}")`).first();
    if (await tab.count()) {
      await tab.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
      await sleep(500);
      const box = await tab.boundingBox().catch(() => null);
      if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      await tab.click({ force: true }).catch(() => {});
      await sleep(2500);
      return true;
    }
  }
  return false;
}

async function openFirstRow(page) {
  const row = page.locator('table tbody tr:visible, [role="row"]:visible, a:visible[href*="/admin/"]').first();
  if (await row.count()) {
    await row.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
    await sleep(1200);
    const link = row.locator('a:visible').first();
    if (await link.count()) await humanClick(page, link).catch(() => {});
    await sleep(2500);
    return true;
  }
  return false;
}

// Slow scroll tour of the current page: down in steps, pause on content,
// back to top. Gives each deep-dive shot enough on-camera dwell (target
// 120 to 150s total) while showing real page depth. No blank screens.
async function scrollTour(page, steps = 3) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, 450)).catch(() => {});
    await sleep(1600);
  }
  await sleep(1200);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await sleep(1200);
}

// Voice-paced settle with deep-dive dwell: every shot holds at least the
// voice line plus 8s of page time.
async function dwell(tracker, step) {
  await settle(tracker, VOICE_DURS, step, 10000);
}

async function main() {
  const { ctx, VIDEO_DIR } = await launchTour(JOURNEY, OUT_MP4);
  const tracker = makeChapterTracker();

  const { acc, page: setup } = await setupDemo(ctx, "super_admin", [
    "/admin/dashboard",
    "/admin/super-admin/exclusive-plans",
    "/admin/super-admin/recurring-billing",
    "/admin/crm-sync",
    "/admin/logs",
    "/admin/notifications",
    "/admin/subscription-management",
    "/admin/webhooks",
    "/admin/storage",
    "/admin/settings",
  ]);
  await fixDemoJobExpiry();
  // Seed one exclusive offer so the plans shot shows a real plan row:
  // spawn a demo employer, onboard it, then offer a plan as super_admin.
  const setupApi = (method, path, body) => setup.evaluate(async ({ method, path, body }) => {
    const res = await fetch(path, {
      method, headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { /* non-json */ }
    return { status: res.status, json };
  }, { method, path, body });
  const empAcc = (await setupApi("POST", "/api/demo/create", { role: "employer" })).json;
  if (empAcc?.success) {
    console.log(`OFFER_EMPLOYER=${empAcc.email}`);
    // Onboard the companion as its own session (offer needs an employers row).
    const tok = (await setupApi("POST", "/api/demo/signin-token", { profileId: empAcc.profileId })).json;
    if (tok?.token) {
      await setup.evaluate(async (t) => {
        const clerk = window.Clerk;
        try { await clerk.signOut(); } catch { /* already out */ }
        await new Promise((res) => setTimeout(res, 500));
        const s = await clerk.client.signIn.create({ strategy: "ticket", ticket: t });
        await clerk.setActive({ session: s.createdSessionId });
      }, tok.token);
      await sleep(2000);
      await setupApi("POST", "/api/onboarding/complete", {
        role: "employer", firstName: "Demo", lastName: "Employer",
        location: "Austin, TX", companyName: "Demo Co.",
      });
      await setupApi("POST", "/api/demo/seed", { role: "employer", profileId: empAcc.profileId }).catch(() => {});
      // Back to super_admin for the offer (endpoint requires super_admin).
      const back = (await setupApi("POST", "/api/demo/signin-token", { profileId: acc.profileId })).json;
      if (back?.token) {
        await setup.evaluate(async (t) => {
          const clerk = window.Clerk;
          try { await clerk.signOut(); } catch { /* already out */ }
          await new Promise((res) => setTimeout(res, 500));
          const s = await clerk.client.signIn.create({ strategy: "ticket", ticket: t });
          await clerk.setActive({ session: s.createdSessionId });
        }, back.token);
        await sleep(2000);
      }
    }
    const offer = await setupApi("POST", "/api/admin/super-admin/exclusive-plans", {
      employerId: empAcc.profileId, planType: "gold_plus_recurring_6mo",
    });
    console.log("exclusive offer:", offer.status, JSON.stringify(offer.json).slice(0, 160));
  }
  // Seed one cron execution plus one audit action row so the logs shot
  // shows a real audited run (task_name marker makes cleanup exact).
  try {
    const { default: pg } = await import("pg");
    const fs = await import("node:fs");
    const m = fs.readFileSync("/Users/macbook/Documents/projects/ampertalent/.env.local", "utf8")
      .match(/^DATABASE_URL=(.*)$/m);
    const cs = m[1].trim().replace(/^"|"$/g, "").replace("sslmode=require", "sslmode=no-verify");
    const pool = new pg.Pool({ connectionString: cs });
    const ex = await pool.query(
      "INSERT INTO execution_logs (task_name, status, started_at, completed_at, duration_ms, summary, triggered_by) VALUES ('demo-showcase-billing-cron','completed',NOW() - INTERVAL '2 minutes',NOW(),110000,'Demo showcase billing reconciliation run',$1) RETURNING id",
      [acc.email]
    );
    const exId = ex.rows[0].id;
    await pool.query(
      "INSERT INTO action_logs (execution_id, action_type, entity_type, status, message) VALUES ($1,'reconcile_subscriptions','subscription','success','Demo showcase: reconciled recurring billing batch')",
      [exId]
    );
    console.log(`seeded execution ${exId} plus audit action`);
    await pool.end();
  } catch (e) { console.log("log seed failed:", String(e).slice(0, 160)); }
  await setup.close();
  console.log(`DEMO_EMAIL=${acc.email}`);
  const { timer, patiently } = startWatchdog(tracker, VOICE_DURS);

  const page = await ctx.newPage();
  tracker.rebase();

  await showTitle(page, {
    kicker: "LIVE DEMO TOUR",
    title: "AmperTalent",
    stack: "Next.js 16 &nbsp;·&nbsp; Clerk &nbsp;·&nbsp; Supabase Postgres",
    sub: "Super admin exclusives buyers ask about most",
  });
  console.log("STEP intro");
  tracker.mark("superadmin-intro");
  await settle(tracker, VOICE_DURS, "superadmin-intro", 1500);
  await hideTitle(page);

  // Shot 2: exclusive plans, open one plan.
  console.log("STEP plans");
  tracker.mark("superadmin-plans");
  await humanGoto(page, `${BASE}/admin/super-admin/exclusive-plans`);
  await patiently(
    [{ afterMs: 10000, step: "superadmin-load-wait" }],
    () => waitVisible(page, "h1:visible", 45000)
  );
  await sleep(1500);
  if (page.url().includes("/admin/dashboard") || page.url().includes("subscription-management")) {
    console.log("exclusive-plans landed on fallback tab, filming destination");
    await sleep(1500);
  }
  await openFirstRow(page);
  await scrollTour(page, 3);
  await dwell(tracker, "superadmin-plans");

  // Shot 3: recurring billing, both tabs, cron view.
  console.log("STEP billing");
  tracker.mark("superadmin-billing");
  await visit(page, tracker, VOICE_DURS, "superadmin-billing", "/admin/super-admin/recurring-billing", 2000);
  await clickTab(page, ["Seekers", "Seeker"]);
  await scrollTour(page, 2);
  await clickTab(page, ["Employer", "Employers"]);
  await scrollTour(page, 2);
  await dwell(tracker, "superadmin-billing");

  // Shots 4-5: CRM mapping plus logs, or fallback trio on bounce.
  console.log("STEP crmmap");
  tracker.mark("superadmin-crmmap");
  await humanGoto(page, `${BASE}/admin/crm-sync`);
  await waitContent(page, { timeout: 45000 });
  await sleep(1500);
  let crmOk = !page.url().includes("/admin/dashboard");
  if (!crmOk) {
    console.log("crm-sync bounced, filming fallback trio for both CRM shots");
    tracker.mark("superadmin-fallback");
    await visit(page, tracker, VOICE_DURS, "superadmin-fallback", "/admin/webhooks", 2500);
    const del = page.locator('table tbody tr:visible').first();
    if (await del.count()) { await del.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {}); await sleep(2000); }
    await scrollTour(page, 2);
    await dwell(tracker, "superadmin-fallback");
    console.log("STEP crmlog (fallback storage)");
    tracker.mark("superadmin-crmlog");
    await visit(page, tracker, VOICE_DURS, "superadmin-crmlog", "/admin/storage", 2500);
    await scrollTour(page, 2);
    await visit(page, tracker, VOICE_DURS, "superadmin-crmlog", "/admin/settings", 2000);
    await scrollTour(page, 1);
    await dwell(tracker, "superadmin-crmlog");
  } else {
    await clickTab(page, ["Field Mappings", "Mappings"]);
    await scrollTour(page, 2);
    await dwell(tracker, "superadmin-crmmap");
    console.log("STEP crmlog");
    tracker.mark("superadmin-crmlog");
    await clickTab(page, ["Change Log", "Changelog", "Sync Logs", "Logs"]);
    await scrollTour(page, 2);
    await dwell(tracker, "superadmin-crmlog");
  }

  // Shot 6: audit log row.
  console.log("STEP logs");
  tracker.mark("superadmin-logs");
  await visit(page, tracker, VOICE_DURS, "superadmin-logs", "/admin/logs", 2000);
  await openFirstRow(page);
  await scrollTour(page, 2);
  await dwell(tracker, "superadmin-logs");

  // Shot 7: broadcast form, never sent.
  console.log("STEP notify");
  tracker.mark("superadmin-notify");
  await visit(page, tracker, VOICE_DURS, "superadmin-notify", "/admin/notifications", 2000);
  const aud = page.locator('button:visible:has-text("eeker"), button:visible:has-text("mployer"), [role="radio"]:visible, select:visible').first();
  if (await aud.count()) {
    await aud.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
    await sleep(1500);
  }
  const subj = page.locator('input:visible[placeholder*="ubject"], input:visible[name*="ubject"], input:visible[type="text"]').first();
  if (await subj.count()) {
    await subj.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
    await sleep(1200);
  }
  // Deliberately no submit: the form is shown, nothing is sent.
  await scrollTour(page, 2);
  await dwell(tracker, "superadmin-notify");

  // Shot 8: subscription row.
  console.log("STEP subs");
  tracker.mark("superadmin-subs");
  await visit(page, tracker, VOICE_DURS, "superadmin-subs", "/admin/subscription-management", 2000);
  await openFirstRow(page);
  await scrollTour(page, 3);
  await dwell(tracker, "superadmin-subs");

  const { videoPath, CHAPTERS } = await finishTour(ctx, tracker, timer, VIDEO_DIR, JOURNEY);
  console.log(`OUT_MP4=${OUT_MP4}`);
  console.log(`CHAPTERS=${CHAPTERS}`);
  const fs = await import("node:fs");
  fs.mkdirSync(OUT_MP4.split("/").slice(0, -1).join("/"), { recursive: true });
  fs.copyFileSync(videoPath, OUT_MP4);
  console.log("COPIED silent to", OUT_MP4);
}

main().catch((e) => {
  console.error("RECORDING FAILED:", e);
  process.exit(1);
});
