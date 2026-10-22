// Admin operations: dashboard+analytics -> moderation -> users ->
// billing ops -> concierge -> growth -> platform.
// Outputs silent mp4 to demos/admin-operations/.
import {
  BASE, sleep, loadVoiceDurs, makeChapterTracker, humanClick,
  humanGoto, waitVisible, waitContent, settle, launchTour, startWatchdog, showTitle, hideTitle,
  setupDemo, fixDemoJobExpiry, finishTour,
} from "./showcase-harness.mjs";

const JOURNEY = "admin";
const OUT_MP4 = "/Users/macbook/Documents/projects/ampertalent/demos/admin-operations/ampertalent-admin-operations.mp4";
const FALLBACK = { "admin-intro": 6000, "admin-dashboard": 7000, "admin-moderation": 6000, "admin-users": 5000, "admin-billing": 5000, "admin-concierge": 6000, "admin-growth": 6000, "admin-platform": 6000 };
const VOICE_DURS = loadVoiceDurs(JOURNEY, FALLBACK);

async function visit(page, tracker, voiceDurs, step, path, h1Timeout = 30000) {
  await humanGoto(page, `${BASE}${path}`);
  await waitContent(page, { timeout: h1Timeout });
  await sleep(1800);
}

async function main() {
  const { ctx, VIDEO_DIR } = await launchTour(JOURNEY, OUT_MP4);
  const tracker = makeChapterTracker();

  const { acc, page: setup } = await setupDemo(ctx, "admin", [
    "/admin/dashboard",
    "/admin/analytics",
    "/admin/job-posts",
    "/admin/users",
    "/admin/seekers",
    "/admin/employers",
    "/admin/subscription-management",
    "/admin/pending-checkouts",
    "/admin/concierge",
    "/admin/featured-jobs",
    "/admin/solo-email-blasts",
    "/admin/webhooks",
    "/admin/storage",
    "/admin/settings",
  ]);
  await fixDemoJobExpiry();
  await setup.close();
  console.log(`DEMO_EMAIL=${acc.email}`);
  const { timer, patiently } = startWatchdog(tracker, VOICE_DURS);

  const page = await ctx.newPage();
  tracker.rebase();

  await showTitle(page, {
    kicker: "LIVE DEMO TOUR",
    title: "AmperTalent",
    stack: "Next.js 16 &nbsp;·&nbsp; Clerk &nbsp;·&nbsp; Supabase Postgres &nbsp;·&nbsp; Stripe",
    sub: "Admin operations: from moderation to revenue, in one back office tour",
  });
  console.log("STEP intro");
  tracker.mark("admin-intro");
  await settle(tracker, VOICE_DURS, "admin-intro", 1500);
  await hideTitle(page);

  console.log("STEP dashboard");
  tracker.mark("admin-dashboard");
  await humanGoto(page, `${BASE}/admin/dashboard`);
  await patiently(
    [{ afterMs: 10000, step: "filler-a" }],
    () => waitVisible(page, "h1:visible", 45000)
  );
  await sleep(2200);
  await humanGoto(page, `${BASE}/admin/analytics`);
  await waitVisible(page, "h1:visible", 30000).catch(() => {});
  await sleep(1500);
  await settle(tracker, VOICE_DURS, "admin-dashboard");

  console.log("STEP moderation");
  tracker.mark("admin-moderation");
  await humanGoto(page, `${BASE}/admin/job-posts`);
  await patiently(
    [{ afterMs: 10000, step: "admin-queue-wait" }],
    () => waitVisible(page, "h1:visible", 45000)
  );
  await sleep(1500);
  const review = page.locator('button:visible:has-text("Review")').first();
  if (await review.count()) {
    await review.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
    await sleep(600);
    const box = await review.boundingBox().catch(() => null);
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await sleep(800);
  }
  await settle(tracker, VOICE_DURS, "admin-moderation");

  console.log("STEP users");
  tracker.mark("admin-users");
  await visit(page, tracker, VOICE_DURS, "admin-users", "/admin/users");
  await visit(page, tracker, VOICE_DURS, "admin-users", "/admin/seekers");
  await visit(page, tracker, VOICE_DURS, "admin-users", "/admin/employers");
  await settle(tracker, VOICE_DURS, "admin-users");

  console.log("STEP billing");
  tracker.mark("admin-billing");
  await visit(page, tracker, VOICE_DURS, "admin-billing", "/admin/subscription-management");
  await visit(page, tracker, VOICE_DURS, "admin-billing", "/admin/pending-checkouts");
  await settle(tracker, VOICE_DURS, "admin-billing");

  console.log("STEP concierge");
  tracker.mark("admin-concierge");
  await visit(page, tracker, VOICE_DURS, "admin-concierge", "/admin/concierge");
  await settle(tracker, VOICE_DURS, "admin-concierge");

  console.log("STEP growth");
  tracker.mark("admin-growth");
  await visit(page, tracker, VOICE_DURS, "admin-growth", "/admin/featured-jobs");
  await visit(page, tracker, VOICE_DURS, "admin-growth", "/admin/solo-email-blasts");
  await settle(tracker, VOICE_DURS, "admin-growth");

  console.log("STEP platform");
  tracker.mark("admin-platform");
  await visit(page, tracker, VOICE_DURS, "admin-platform", "/admin/webhooks");
  await visit(page, tracker, VOICE_DURS, "admin-platform", "/admin/storage");
  await visit(page, tracker, VOICE_DURS, "admin-platform", "/admin/settings");
  await settle(tracker, VOICE_DURS, "admin-platform");

  const { videoPath } = await finishTour(ctx, tracker, timer, VIDEO_DIR, JOURNEY);
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
