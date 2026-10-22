// Seeker journey: dashboard -> jobs search -> job detail -> save + apply
// (resume upload) -> tracking -> services -> membership -> messages.
// Outputs silent mp4 to demos/seeker-journey/.
import {
  BASE, sleep, loadVoiceDurs, makeChapterTracker, humanClick, humanType,
  humanGoto, waitVisible, waitContent, settle, launchTour, startWatchdog, showTitle, hideTitle,
  setupDemo, fixDemoJobExpiry, dbPresetSave, finishTour,
} from "./showcase-harness.mjs";

const JOURNEY = "seeker";
const OUT_MP4 = "/Users/macbook/Documents/projects/ampertalent/demos/seeker-journey/ampertalent-seeker-journey.mp4";
const FALLBACK = { "seeker-intro": 7000, "seeker-dashboard": 6000, "seeker-jobs": 5000, "seeker-apply": 5000, "seeker-tracking": 5000, "seeker-services": 5000, "seeker-membership": 5000, "seeker-messages": 6000 };
const VOICE_DURS = loadVoiceDurs(JOURNEY, FALLBACK);

async function main() {
  const { ctx, VIDEO_DIR } = await launchTour(JOURNEY, OUT_MP4);
  const tracker = makeChapterTracker();

  // Off-camera setup (discarded video): demo account + seed + subscription + onboarding.
  const { acc, page: setup } = await setupDemo(ctx, "seeker", [
    "/seeker/dashboard",
    "/seeker/jobs",
    "/seeker/applications",
    "/seeker/saved-jobs",
    "/seeker/services",
    "/seeker/resume-critique",
    "/seeker/membership",
    "/seeker/subscription",
    "/seeker/messages",
    "/seeker/notifications",
  ]);
  await fixDemoJobExpiry();
  await setup.close();
  console.log(`DEMO_EMAIL=${acc.email}`);
  const { timer, patiently } = startWatchdog(tracker, VOICE_DURS);

  const page = await ctx.newPage();
  tracker.rebase();

  // 1. Title card
  await showTitle(page, {
    kicker: "LIVE DEMO TOUR",
    title: "AmperTalent",
    stack: "Next.js 16 &nbsp;·&nbsp; Clerk &nbsp;·&nbsp; Supabase Postgres &nbsp;·&nbsp; Stripe",
    sub: "Seeker journey: first search to hired, inside the seeker workspace",
  });
  console.log("STEP intro");
  tracker.mark("seeker-intro");
  await settle(tracker, VOICE_DURS, "seeker-intro", 1500);
  await hideTitle(page);

  // 2. Dashboard
  console.log("STEP dashboard");
  tracker.mark("seeker-dashboard");
  await humanGoto(page, `${BASE}/seeker/dashboard`);
  await patiently(
    [{ afterMs: 10000, step: "filler-a" }],
    () => waitVisible(page, "h1:visible", 45000)
  );
  await sleep(1500);
  const viewJob = page.locator('a:visible:has-text("View Job")').first();
  if (await viewJob.count()) {
    await viewJob.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
    await sleep(800);
    const box = await viewJob.boundingBox().catch(() => null);
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await sleep(800);
  }
  await settle(tracker, VOICE_DURS, "seeker-dashboard");

  // 3. Find jobs: search + open detail (same-tab goto; the app opens new tabs on click)
  console.log("STEP jobs");
  tracker.mark("seeker-jobs");
  await humanGoto(page, `${BASE}/seeker/jobs`);
  await patiently(
    [{ afterMs: 10000, step: "filler-a" }],
    () => page.waitForResponse((r) => r.url().includes("/api/jobs/search") && r.ok(), { timeout: 45000 })
  );
  await sleep(1500);
  const search = page.locator('input:visible[placeholder*="Search jobs"]').first();
  if (await search.count()) {
    await humanType(page, search, "react");
    await patiently(
      [{ afterMs: 10000, step: "seeker-search-wait" }],
      () => page.waitForResponse((r) => r.url().includes("/api/jobs/search") && r.ok(), { timeout: 30000 }).catch(() => {})
    );
    await sleep(2000);
  }
  // Pick a job this seeker has not applied to yet.
  const fresh = await page.evaluate(async () => {
    const sr = await (await fetch("/api/jobs/search?limit=20")).json();
    let appliedIds = new Set();
    try {
      const ap = await (await fetch("/api/seeker/applications")).json();
      const list = ap.applications || ap.data || [];
      appliedIds = new Set(list.map((a) => a.jobId || a.job?.id).filter(Boolean));
    } catch { /* ignore */ }
    const f = (sr.jobs || []).find((j) => !appliedIds.has(j.id)) || (sr.jobs || [])[0];
    return f ? { id: f.id, title: f.title } : null;
  });
  console.log("FRESH JOB:", JSON.stringify(fresh));
  if (!fresh) throw new Error("no jobs available to open");
  // The app's save endpoint 500s (jobSeeker.id bug, fixed locally in
  // app/api/seeker/saved-jobs/route.ts but not yet deployed), so seed the
  // saved row directly: the tracking shot needs a populated Saved Jobs page.
  await dbPresetSave(acc.profileId, fresh.id);
  await humanGoto(page, `${BASE}/seeker/jobs/${fresh.id}`);
  await patiently(
    [{ afterMs: 10000, step: "filler-b" }],
    () => waitVisible(page, 'button:visible:has-text("Apply Now"), div:visible:has-text("Application Submitted")', 45000)
  );
  await sleep(1200);
  await settle(tracker, VOICE_DURS, "seeker-jobs");

  // 4. Apply: resume upload + cover letter + submit (the Save button is
  // covered by the SQL pre-save above until the save-endpoint fix deploys).
  console.log("STEP apply");
  tracker.mark("seeker-apply");
  const applyBtn = page.locator('button:visible:has-text("Apply Now")').first();
  if (await applyBtn.count()) {
    await humanClick(page, applyBtn);
    await waitVisible(page, 'button:visible:has-text("Submit Application")', 30000);
    await sleep(1000);
    await page.locator('input[type="file"]').first().setInputFiles("/tmp/demo-resume.pdf");
    await patiently(
      [{ afterMs: 8000, step: "seeker-upload-wait" }],
      () => waitVisible(page, 'div:visible:has-text("uploaded successfully"), span:visible:has-text("uploaded successfully")', 45000)
    );
    await sleep(1200);
    const cl = page.locator("textarea:visible").first();
    if (await cl.count()) {
      await humanClick(page, cl);
      await cl.type("Dear hiring team, I am excited to apply for this role. My background in frontend engineering matches what you are looking for, and I would love to discuss next steps.", { delay: 20 });
      await sleep(1000);
    }
    const submit = page.locator('button:visible:has-text("Submit Application")').first();
    await humanClick(page, submit);
    await patiently(
      [{ afterMs: 8000, step: "seeker-apply-wait" }],
      () => waitVisible(page, 'div:visible:has-text("Application Submitted")', 45000)
    );
    await sleep(1500);
  } else {
    console.log("already applied to this job, showing status");
    await sleep(2000);
  }
  await settle(tracker, VOICE_DURS, "seeker-apply");

  // 5. Tracking
  console.log("STEP tracking");
  tracker.mark("seeker-tracking");
  await humanGoto(page, `${BASE}/seeker/applications`);
  await waitVisible(page, 'button:visible:has-text("Follow Up")', 30000).catch(() => {});
  await sleep(1500);
  await humanGoto(page, `${BASE}/seeker/saved-jobs`);
  await waitContent(page, { timeout: 30000 });
  await sleep(1200);
  await settle(tracker, VOICE_DURS, "seeker-tracking");

  // 6. Services (services marketplace; resume-critique API is too slow for
  // a live take, and the services page itself lists the critique offer).
  console.log("STEP services");
  tracker.mark("seeker-services");
  await humanGoto(page, `${BASE}/seeker/services`);
  await waitContent(page, { timeout: 30000 });
  await sleep(1500);
  const purchase = page.locator('button:visible:has-text("Purchase")').first();
  if (await purchase.count()) {
    await purchase.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
    await sleep(600);
    const box = await purchase.boundingBox().catch(() => null);
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await sleep(1200);
  }
  await settle(tracker, VOICE_DURS, "seeker-services");

  // 7. Membership
  console.log("STEP membership");
  tracker.mark("seeker-membership");
  await humanGoto(page, `${BASE}/seeker/membership`);
  await waitContent(page, { timeout: 30000 });
  await sleep(1500);
  await humanGoto(page, `${BASE}/seeker/subscription`);
  await waitContent(page, { timeout: 30000 });
  await sleep(1200);
  await settle(tracker, VOICE_DURS, "seeker-membership");

  // 8. Messages
  console.log("STEP messages");
  tracker.mark("seeker-messages");
  await humanGoto(page, `${BASE}/seeker/messages`);
  await waitContent(page, { timeout: 30000 });
  await sleep(1500);
  await humanGoto(page, `${BASE}/seeker/notifications`);
  await waitContent(page, { timeout: 30000 });
  await sleep(1200);
  await settle(tracker, VOICE_DURS, "seeker-messages");

  const { videoPath, CHAPTERS } = await finishTour(ctx, tracker, timer, VIDEO_DIR, JOURNEY);
  console.log(`OUT_MP4=${OUT_MP4}`);
  const fs = await import("node:fs");
  fs.mkdirSync(OUT_MP4.split("/").slice(0, -1).join("/"), { recursive: true });
  fs.copyFileSync(videoPath, OUT_MP4);
  console.log("COPIED silent to", OUT_MP4);
}

main().catch((e) => {
  console.error("RECORDING FAILED:", e);
  process.exit(1);
});
