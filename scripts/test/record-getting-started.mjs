// Getting started deep dive: landing -> guest public search -> live demo
// signup -> onboarding role pick -> basic info -> goals -> package ->
// seeker dashboard -> live job search -> save (never apply; the seeker
// journey owns applying, and resume critique is never demoed live).
// Guest until the signup click, then the freshly spawned seeker.
// Outputs silent mp4 to demos/getting-started/. Total target under 120s.
import {
  BASE, sleep, loadVoiceDurs, makeChapterTracker, humanClick, humanType,
  humanGoto, waitVisible, waitContent, settle, launchTour, startWatchdog, showTitle, hideTitle,
  fixDemoJobExpiry, finishTour,
} from "./showcase-harness.mjs";

const JOURNEY = "start";
const OUT_MP4 = "/Users/macbook/Documents/projects/ampertalent/demos/getting-started/ampertalent-getting-started.mp4";
const FALLBACK = { "start-intro": 4500, "start-landing": 4500, "start-guest": 4800, "start-signup": 3900, "start-role": 3400, "start-basic": 4700, "start-goals": 3900, "start-package": 3700, "start-dashboard": 4500, "start-find": 3500, "start-save": 4600 };
const VOICE_DURS = loadVoiceDurs(JOURNEY, FALLBACK);

async function api(page, method, path, body) {
  return page.evaluate(async ({ method, path, body }) => {
    const res = await fetch(path, {
      method, headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { /* non-json */ }
    return { status: res.status, json };
  }, { method, path, body });
}

async function clickNext(page) {
  const next = page.locator('button:visible:has-text("Next"), button:visible:has-text("Continue"), button:visible:has-text("Complete"), button:visible:has-text("Finish"), button:visible:has-text("Get Started")').first();
  if (!(await next.count())) return false;
  if (!(await next.isEnabled().catch(() => false))) return false;
  await humanClick(page, next);
  await sleep(2200);
  return true;
}

async function fillVisibleTextInputs(page, samples) {
  const inputs = page.locator('input:visible[type="text"], input:visible:not([type]), input:visible[type="email"]');
  const n = await inputs.count();
  for (let i = 0; i < Math.min(n, 8); i++) {
    const inp = inputs.nth(i);
    const val = await inp.inputValue().catch(() => "");
    if (val) continue;
    const name = ((await inp.getAttribute("name").catch(() => "")) || "") +
      ((await inp.getAttribute("placeholder").catch(() => "")) || "");
    const hint = name.toLowerCase();
    const text = hint.includes("first") ? "Demo" : hint.includes("last") ? "Seeker"
      : hint.includes("loc") ? "Remote (US)" : hint.includes("title") || hint.includes("headline") ? "Senior Frontend Engineer"
      : hint.includes("compan") ? "Demo Co." : hint.includes("skill") ? "React" : "Demo value";
    await inp.click({ force: true }).catch(() => {});
    await inp.press("ControlOrMeta+a").catch(() => {});
    await inp.type(text, { delay: 25 }).catch(() => {});
    void samples;
  }
}

async function main() {
  const { ctx, VIDEO_DIR } = await launchTour(JOURNEY, OUT_MP4);
  const tracker = makeChapterTracker();

  // Off-camera: keep one employer alive so the first search has live rows.
  // Its video is discarded; the take below is guest plus new user only.
  const warm = await ctx.newPage();
  await warm.goto(BASE, { waitUntil: "domcontentloaded" }).catch(() => {});
  const seeded = await warm.evaluate(async () => {
    try {
      const r = await fetch("/api/demo/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "employer" }),
      });
      const acc = await r.json();
      if (acc?.success) {
        await fetch("/api/demo/seed", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "employer", profileId: acc.profileId }),
        }).catch(() => {});
      }
      return acc;
    } catch { return null; }
  });
  console.log(`FEEDER=${seeded?.email ?? "none"}`);
  await warm.close();
  await fixDemoJobExpiry();
  const { timer, patiently } = startWatchdog(tracker, VOICE_DURS);

  const page = await ctx.newPage();
  tracker.rebase();

  await showTitle(page, {
    kicker: "LIVE DEMO TOUR",
    title: "AmperTalent",
    stack: "Jobs &nbsp;·&nbsp; Employers &nbsp;·&nbsp; Tools",
    sub: "Your first minutes: landing page to first saved job",
  });
  console.log("STEP intro");
  tracker.mark("start-intro");
  await settle(tracker, VOICE_DURS, "start-intro", 1200);
  await hideTitle(page);

  // Shot 2: landing page scroll.
  console.log("STEP landing");
  tracker.mark("start-landing");
  await humanGoto(page, `${BASE}/`);
  await patiently(
    [{ afterMs: 10000, step: "filler-a" }],
    () => waitVisible(page, "h1:visible", 45000)
  );
  await page.evaluate(() => window.scrollBy(0, 600)).catch(() => {});
  await sleep(1000);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await sleep(800);
  await settle(tracker, VOICE_DURS, "start-landing");

  // Shot 3: public job browsing as a guest (no login).
  console.log("STEP guest");
  tracker.mark("start-guest");
  await humanGoto(page, `${BASE}/tools`);
  await patiently(
    [{ afterMs: 10000, step: "filler-a" }],
    () => waitVisible(page, "h1:visible", 45000)
  );
  await sleep(800);
  const runBtn = page.locator('button:visible:has-text("Run")').first();
  if (await runBtn.count()) {
    await runBtn.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
    await sleep(600);
    await humanClick(page, runBtn);
    await patiently(
      [{ afterMs: 8000, step: "start-search-wait" }],
      () => sleep(5000)
    );
  }
  await sleep(1200);
  await settle(tracker, VOICE_DURS, "start-guest");

  // Shot 4: live signup through the public Try Demo entry.
  console.log("STEP signup");
  tracker.mark("start-signup");
  await humanGoto(page, `${BASE}/`);
  await patiently(
    [{ afterMs: 10000, step: "filler-a" }],
    () => waitVisible(page, 'button:visible:has-text("Try Demo"), a:visible:has-text("Try Demo")', 45000)
  );
  await sleep(600);
  await humanClick(page, page.locator('button:visible:has-text("Try Demo"), a:visible:has-text("Try Demo")').first());
  await patiently(
    [{ afterMs: 10000, step: "start-signup-wait" }],
    () => waitVisible(page, '[data-testid="demo-cta-seeker"]', 45000)
  );
  await sleep(800);
  await settle(tracker, VOICE_DURS, "start-signup");

  // Shot 5: role pick cards inside the demo modal (true role selection).
  console.log("STEP role");
  tracker.mark("start-role");
  await sleep(3000);
  await humanClick(page, page.locator('[data-testid="demo-cta-seeker"]').first());
  await patiently(
    [{ afterMs: 12000, step: "start-signup-wait" }],
    () => waitVisible(page, '[data-testid="demo-enter-dashboard"]', 60000)
  );
  await sleep(800);
  const demoEmail = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="demo-credential-email"]');
    return el ? el.textContent.trim() : null;
  }).catch(() => null);
  console.log(`DEMO_EMAIL=${demoEmail ?? "see-feeder-and-dialog"}`);
  await settle(tracker, VOICE_DURS, "start-role");
  await humanClick(page, page.locator('[data-testid="demo-enter-dashboard"]').first());
  await page.waitForURL("**/onboarding**", { timeout: 60000 }).catch(() => {});
  await sleep(1200);

  console.log("STEP basic");
  tracker.mark("start-basic");
  await fillVisibleTextInputs(page);
  const area = page.locator("textarea:visible").first();
  if (await area.count()) {
    const val = await area.inputValue().catch(() => "");
    if (!val) {
      await area.click({ force: true }).catch(() => {});
      await area.type("Senior frontend engineer looking for my next remote role.", { delay: 12 }).catch(() => {});
    }
  }
  await sleep(800);
  await clickNext(page).catch(() => {});
  await settle(tracker, VOICE_DURS, "start-basic");

  console.log("STEP goals");
  tracker.mark("start-goals");
  const opt = page.locator('[role="radio"]:visible, [role="option"]:visible').first();
  if (await opt.count()) await opt.click({ force: true }).catch(() => {});
  await fillVisibleTextInputs(page);
  await sleep(600);
  await clickNext(page).catch(() => {});
  await settle(tracker, VOICE_DURS, "start-goals");

  console.log("STEP package");
  tracker.mark("start-package");
  const pkg = page.locator('[role="radio"]:visible, [role="option"]:visible, button:visible:has-text("rial"), button:visible:has-text("Gold"), button:visible:has-text("Free")').first();
  if (await pkg.count()) { await pkg.click({ force: true }).catch(() => {}); await sleep(800); }
  await clickNext(page).catch(() => {});
  // Fallback: complete onboarding via API, then continue on camera.
  if (!page.url().includes("/seeker/dashboard")) {
    console.log("onboarding fallback via API");
    await api(page, "POST", "/api/onboarding/complete", {
      role: "seeker", firstName: "Demo", lastName: "Seeker", location: "Remote (US)",
      experience: "5", skills: ["JavaScript", "TypeScript", "React"],
      goals: "Land a senior frontend role", professionalSummary: "Senior frontend engineer demo profile",
    });
    await humanGoto(page, `${BASE}/seeker/dashboard`);
  }
  await api(page, "POST", "/api/demo/activate-subscription", {}).catch(() => {});
  await api(page, "POST", "/api/demo/seed", {}).catch(() => {});
  await sleep(800);
  await settle(tracker, VOICE_DURS, "start-package", 600);

  // Shot 9: dashboard.
  console.log("STEP dashboard");
  tracker.mark("start-dashboard");
  await humanGoto(page, `${BASE}/seeker/dashboard`);
  await patiently(
    [{ afterMs: 10000, step: "filler-b" }],
    () => waitVisible(page, "h1:visible", 45000)
  );
  // Let the stats cards finish loading: wait for the dashboard stats API,
  // then hold so matches and counts render before the shot ends.
  await patiently(
    [{ afterMs: 12000, step: "filler-b" }],
    () => page.waitForResponse((r) => r.url().includes("/api/seeker/dashboard") && r.ok(), { timeout: 45000 }).catch(() => {})
  );
  await sleep(4000);
  await settle(tracker, VOICE_DURS, "start-dashboard");

  // Shot 10: live job search.
  console.log("STEP find");
  tracker.mark("start-find");
  await humanGoto(page, `${BASE}/seeker/jobs`);
  await patiently(
    [{ afterMs: 10000, step: "start-search-wait" }],
    () => page.waitForResponse((r) => r.url().includes("/api/jobs/search") && r.ok(), { timeout: 45000 }).catch(() => {})
  );
  await sleep(800);
  const search = page.locator('input:visible[placeholder*="Search jobs"]').first();
  if (await search.count()) {
    await humanType(page, search, "demo");
    await patiently(
      [{ afterMs: 14000, step: "start-search-wait" }],
      () => page.waitForResponse((r) => r.url().includes("/api/jobs/search") && r.ok(), { timeout: 30000 }).catch(() => {})
    );
    await sleep(1500);
  }
  await settle(tracker, VOICE_DURS, "start-find");

  // Shot 11: save one job (never apply).
  console.log("STEP save");
  tracker.mark("start-save");
  const saveBtn = page.locator('button:visible[aria-label*="ave"], button:visible:has-text("Save")').first();
  if (await saveBtn.count()) {
    await saveBtn.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
    await sleep(600);
    await humanClick(page, saveBtn);
    await sleep(2500);
  }
  // Verify the save persisted; top it up via the same endpoint the UI uses.
  const savedCheck = await api(page, "GET", "/api/seeker/saved-jobs", null).catch(() => ({ json: null }));
  const savedList = savedCheck?.json?.savedJobs || savedCheck?.json?.data || savedCheck?.json?.jobs || [];
  console.log("saved count after click:", Array.isArray(savedList) ? savedList.length : "unknown");
  if (!Array.isArray(savedList) || !savedList.length) {
    await page.evaluate(async () => {
      try {
        const s = await fetch("/api/jobs/search?query=demo&limit=5").then((r) => r.json());
        const list = s.jobs || s.data || [];
        if (list.length) {
          await fetch(`/api/seeker/saved-jobs`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: list[0].id || list[0].jobId }),
          }).catch(() => {});
        }
      } catch { /* shot still shows the search page */ }
    }).catch(() => {});
    await sleep(2000);
    await humanGoto(page, `${BASE}/seeker/saved-jobs`);
    await waitContent(page, { timeout: 30000 });
    await sleep(2000);
  }
  await settle(tracker, VOICE_DURS, "start-save");

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
