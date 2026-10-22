// Tools showcase: guest (no login), run representative cards per chapter.
// Outputs silent mp4 to demos/tools-showcase/.
import {
  BASE, sleep, loadVoiceDurs, makeChapterTracker, humanClick,
  humanGoto, waitVisible, settle, launchTour, startWatchdog, showTitle, hideTitle,
  finishTour,
} from "./showcase-harness.mjs";

const JOURNEY = "tools";
const OUT_MP4 = "/Users/macbook/Documents/projects/ampertalent/demos/tools-showcase/ampertalent-tools-showcase.mp4";
const FALLBACK = { "tools-intro": 6000, "tools-match": 5000, "tools-fit": 5000, "tools-pay": 6000, "tools-pipeline": 6000, "tools-talent": 7000, "tools-money": 5000, "tools-quality": 6000 };
const VOICE_DURS = loadVoiceDurs(JOURNEY, FALLBACK);

const PLAN = [
  { step: "tools-match", cards: ["job-alert-matcher"] },
  { step: "tools-fit", cards: ["ats-fit-scorer"] },
  { step: "tools-pay", cards: ["salary-normalizer", "fx"] },
  { step: "tools-pipeline", cards: ["application-state-machine", "interview-slot-picker"] },
  { step: "tools-talent", cards: ["talent-search", "job-digest", "interview-feedback"] },
  { step: "tools-money", cards: ["subscription-proration", "coupon-engine"] },
  { step: "tools-quality", cards: ["job-dedupe", "job-posting-schema", "resume-quality-scorer"] },
];

async function runCard(page, tracker, voiceDurs, id, firstInChapter) {
  const card = page.locator(`[data-testid="card-${id}"]`).first();
  await card.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
  await sleep(700);
  if (firstInChapter) tracker.mark(PLAN.find((p) => p.cards[0] === id).step);
  const run = page.locator(`[data-testid="run-${id}"]`).first();
  await humanClick(page, run);
  await waitVisible(page, `[data-testid="result-${id}"]`, 30000).catch(() => {});
  await sleep(1800);
}

async function main() {
  const { ctx, VIDEO_DIR } = await launchTour(JOURNEY, OUT_MP4);
  const tracker = makeChapterTracker();
  const { timer, patiently } = startWatchdog(tracker, VOICE_DURS);

  const page = await ctx.newPage();
  tracker.rebase();

  await showTitle(page, {
    kicker: "LIVE DEMO TOUR",
    title: "AmperTalent Labs",
    stack: "30 hiring utilities &nbsp;·&nbsp; public API &nbsp;·&nbsp; no account needed",
    sub: "Thirty hiring utilities you can try right now with no account",
  });
  console.log("STEP intro");
  tracker.mark("tools-intro");
  await settle(tracker, VOICE_DURS, "tools-intro", 1500);
  await hideTitle(page);

  await humanGoto(page, `${BASE}/tools`);
  await patiently(
    [{ afterMs: 10000, step: "filler-a" }],
    () => waitVisible(page, '[data-testid="card-job-alert-matcher"]', 45000)
  );
  await sleep(1200);

  for (const group of PLAN) {
    console.log("STEP", group.step, group.cards.join(","));
    let first = true;
    for (const id of group.cards) {
      await runCard(page, tracker, VOICE_DURS, id, first);
      first = false;
    }
    await settle(tracker, VOICE_DURS, group.step);
  }

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
