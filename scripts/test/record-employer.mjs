// Employer journey: dashboard -> post job (draft + preview) -> talent search
// -> applicants -> company + team -> billing + concierge.
// Outputs silent mp4 to demos/employer-journey/.
import {
  BASE, sleep, loadVoiceDurs, makeChapterTracker, humanClick, humanType,
  humanGoto, waitVisible, waitContent, settle, launchTour, startWatchdog, showTitle, hideTitle,
  setupDemo, fixDemoJobExpiry, finishTour,
} from "./showcase-harness.mjs";

const JOURNEY = "employer";
const OUT_MP4 = "/Users/macbook/Documents/projects/ampertalent/demos/employer-journey/ampertalent-employer-journey.mp4";
const FALLBACK = { "employer-intro": 7000, "employer-dashboard": 6000, "employer-postjob": 5000, "employer-talent": 5000, "employer-applicants": 6000, "employer-company": 6000, "employer-billing": 6000 };
const VOICE_DURS = loadVoiceDurs(JOURNEY, FALLBACK);

async function main() {
  const { ctx, VIDEO_DIR } = await launchTour(JOURNEY, OUT_MP4);
  const tracker = makeChapterTracker();

  const { acc, page: setup } = await setupDemo(ctx, "employer", [
    "/employer/dashboard",
    "/employer/jobs",
    "/employer/jobs/new",
    "/employer/talent",
    "/employer/applications",
    "/employer/company-profile",
    "/employer/team",
    "/employer/billing",
    "/employer/messages",
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
    sub: "Employer journey: posting a job to hiring, plus team and billing",
  });
  console.log("STEP intro");
  tracker.mark("employer-intro");
  await settle(tracker, VOICE_DURS, "employer-intro", 1500);
  await hideTitle(page);

  // Dashboard
  console.log("STEP dashboard");
  tracker.mark("employer-dashboard");
  await humanGoto(page, `${BASE}/employer/dashboard`);
  await patiently(
    [{ afterMs: 10000, step: "filler-a" }],
    () => waitVisible(page, "h1:visible", 45000)
  );
  await sleep(1500);
  const postCta = page.locator('a:visible:has-text("Post New Job"), a:visible:has-text("Post Job")').first();
  if (await postCta.count()) {
    await postCta.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
    await sleep(600);
    const box = await postCta.boundingBox().catch(() => null);
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await sleep(800);
  }
  await settle(tracker, VOICE_DURS, "employer-dashboard");

  // Post a job: fill key fields, save draft, review the listing
  console.log("STEP postjob");
  tracker.mark("employer-postjob");
  await humanGoto(page, `${BASE}/employer/jobs/new`);
  await patiently(
    [{ afterMs: 10000, step: "filler-b" }],
    () => waitVisible(page, 'input:visible[name="title"]', 45000)
  );
  await sleep(1000);
  const jobTitle = `Demo Video Role ${Date.now() % 100000} (Remote)`;
  await humanType(page, page.locator('input:visible[name="title"]').first(), jobTitle);
  const loc = page.locator('input:visible[name="location"]').first();
  if (await loc.count()) {
    await humanType(page, loc, "Remote (US)");
  }
  const desc = page.locator("textarea:visible").first();
  if (await desc.count()) {
    await humanClick(page, desc);
    await desc.type("We are hiring for an exciting remote role, recorded live for this demo tour. ".repeat(6), { delay: 12 });
    await sleep(800);
  }
  const skill = page.locator('input:visible[placeholder*="Add a skill"]').first();
  if (await skill.count()) {
    await humanType(page, skill, "React");
    await skill.press("Enter").catch(() => {});
    await sleep(1000);
  }
  const draftBtn = page.locator('button:visible:has-text("Save Draft")').first();
  await humanClick(page, draftBtn);
  await patiently(
    [{ afterMs: 8000, step: "employer-postjob-wait" }],
    () => page.waitForURL("**/employer/jobs", { timeout: 45000 })
  );
  await sleep(2000);
  // Review the listing: open the new draft's detail page.
  const draftId = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/employer/jobs");
      const j = await r.json();
      const list = j.jobs || j.data || [];
      const d = list.find((x) => (x.title || "").startsWith("Demo Video Role")) || list[0];
      return d ? (d.id || d.jobId) : null;
    } catch { return null; }
  });
  console.log("DRAFT ID:", draftId);
  if (draftId) {
    await humanGoto(page, `${BASE}/employer/jobs/${draftId}`);
    await sleep(3000);
  }
  await settle(tracker, VOICE_DURS, "employer-postjob");

  // Talent search
  console.log("STEP talent");
  tracker.mark("employer-talent");
  await humanGoto(page, `${BASE}/employer/talent`);
  await patiently(
    [{ afterMs: 10000, step: "employer-talent-wait" }],
    () => waitVisible(page, "h1:visible", 45000)
  );
  await sleep(1200);
  const tsearch = page.locator('input:visible[placeholder*="Search 100k"]').first();
  if (await tsearch.count()) {
    await humanType(page, tsearch, "react");
    await patiently(
      [{ afterMs: 10000, step: "employer-talent-wait" }],
      () => page.waitForFunction(
        () => !document.body.innerText.includes("Finding professionals"),
        null,
        { timeout: 35000 }
      ).catch(() => {})
    );
    await sleep(1500);
  }
  await settle(tracker, VOICE_DURS, "employer-talent");

  // Applicants
  console.log("STEP applicants");
  tracker.mark("employer-applicants");
  await humanGoto(page, `${BASE}/employer/applications`);
  await waitVisible(page, "h1:visible", 30000).catch(() => {});
  await sleep(2500);
  await settle(tracker, VOICE_DURS, "employer-applicants");

  // Company + team
  console.log("STEP company");
  tracker.mark("employer-company");
  await humanGoto(page, `${BASE}/employer/company-profile`);
  await waitVisible(page, "h1:visible", 30000).catch(() => {});
  await sleep(2500);
  await humanGoto(page, `${BASE}/employer/team`);
  await waitVisible(page, "h1:visible", 30000).catch(() => {});
  await sleep(1500);
  await settle(tracker, VOICE_DURS, "employer-company");

  // Billing + concierge for a live job
  console.log("STEP billing");
  tracker.mark("employer-billing");
  await humanGoto(page, `${BASE}/employer/billing`);
  await waitContent(page, { timeout: 45000 });
  await sleep(2000);
  const liveJob = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/employer/jobs");
      const j = await r.json();
      const list = j.jobs || j.data || [];
      const live = list.find((x) => x.status === "approved") || list[0];
      return live ? (live.id || live.jobId) : null;
    } catch { return null; }
  });
  console.log("LIVE JOB:", liveJob);
  if (liveJob) {
    await humanGoto(page, `${BASE}/employer/concierge/${liveJob}`);
    await waitVisible(page, "h1:visible", 30000).catch(() => {});
    await sleep(1500);
  }
  await settle(tracker, VOICE_DURS, "employer-billing");

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
