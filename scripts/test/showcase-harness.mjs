// Shared harness for AmperTalent voiced showcase recordings.
// Modeled on aims-commerce record_showcase_human.mjs, adapted for:
// - Next.js App Router + Clerk ticket sign-in (no JWT cookies)
// - Demo-mode setup via /api/demo/* (create, seed, signin-token,
//   activate-subscription) + /api/onboarding/complete
// - Postgres expires_at fix for seeded jobs (search requires expiresAt >= now)
import { chromium } from "playwright";
import fs from "node:fs";

export const BASE = process.env.BASE || "https://ampertalent.vercel.app";
export const VIEWPORT = { width: 1920, height: 1080 };
export const HEADLESS = process.env.HEADLESS === "true";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const pause = (min = 900, extra = 900) => sleep(min + Math.random() * extra);

export function loadVoiceDurs(journey, fallback) {
  try {
    return JSON.parse(
      fs.readFileSync(process.env.VOICE_DURS || `/tmp/at-voice/${journey}/durations.json`, "utf8")
    );
  } catch {
    return fallback;
  }
}

export function makeChapterTracker() {
  // t0 starts now; call rebase() when the recorded tour page is created so
  // chapter offsets line up with the final video timeline (setup happens on
  // a scratch page whose video is discarded).
  const state = { t0: Date.now() };
  const markTimes = {};
  const chapters = [];
  let lastChapterAt = state.t0;
  let lastStep = "";
  const mark = (step) => {
    const t = (Date.now() - state.t0) / 1000;
    markTimes[step] = Date.now();
    lastChapterAt = Date.now();
    lastStep = step;
    chapters.push({ step, t: Math.round(t * 10) / 10 });
    console.log(`CHAPTER ${step} at ${t.toFixed(1)}s`);
  };
  return { markTimes, chapters, mark,
    rebase() {
      state.t0 = Date.now();
      lastChapterAt = state.t0;
      console.log("tracker rebased to tour page start");
    },
    get lastStep() { return lastStep; },
    setLast(step, at) { lastStep = step; lastChapterAt = at; },
    get lastChapterAt() { return lastChapterAt; } };
}

export async function humanClick(page, locator) {
  await page.evaluate(() => window.__armTourCursor && window.__armTourCursor()).catch(() => {});
  await locator.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
  await pause(200, 200);
  const box = await locator.boundingBox().catch(() => null);
  if (box) {
    const x = box.x + box.width / 2 + (Math.random() * 6 - 3);
    const y = box.y + box.height / 2 + (Math.random() * 6 - 3);
    await page.mouse.move(x, y, { steps: 12 });
    await pause(150, 150);
  }
  await locator.click({ delay: 40 + Math.random() * 60, force: true });
}

export async function humanType(page, locator, text) {
  await humanClick(page, locator);
  await locator.press("ControlOrMeta+a").catch(() => {});
  await locator.pressSlowly ? null : null;
  await locator.type(text, { delay: 45 + Math.random() * 40 });
}

export async function humanGoto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await sleep(1500);
}

export async function waitVisible(page, selector, timeout = 30000) {
  const t0 = Date.now();
  const loc = page.locator(selector).first();
  while (Date.now() - t0 < timeout) {
    if (await loc.isVisible().catch(() => false)) return loc;
    await sleep(500);
  }
  throw new Error(`never visible: ${selector}`);
}

export async function settle(tracker, voiceDurs, step, buffer = 1200) {
  const need = (voiceDurs[step] ?? 3000) + buffer;
  const elapsed = Date.now() - (tracker.markTimes[step] ?? Date.now());
  if (elapsed < need) await sleep(need - elapsed);
}

export async function launchTour(journey, outMp4) {
  const PROFILE_DIR = process.env.PROFILE_DIR || `/tmp/at-${journey}-profile`;
  const VIDEO_DIR = `/tmp/at-${journey}`;
  console.log(`START journey=${journey} headless=${HEADLESS} base=${BASE}`);
  // Warmup: compiles + DB pool before the take.
  for (const u of [`${BASE}/`, `${BASE}/tools`, `${BASE}/api/public/stats`]) {
    try { const r = await fetch(u); console.log(`warm ${r.status} ${u}`); } catch { console.log(`warm fail ${u}`); }
  }
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  if (process.env.PROFILE_FRESH === "true") {
    fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }
  const ctxOpts = {
    viewport: VIEWPORT,
    recordVideo: { dir: VIDEO_DIR, size: VIEWPORT },
    slowMo: 25,
    args: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  };
  let ctx;
  try {
    ctx = await chromium.launchPersistentContext(PROFILE_DIR, { ...ctxOpts, headless: HEADLESS });
    console.log(HEADLESS ? "forced headless" : "headed full Chrome");
  } catch (e) {
    console.log(`headed launch failed (${e.message}), falling back to headless`);
    ctx = await chromium.launchPersistentContext(PROFILE_DIR, { ...ctxOpts, headless: true });
  }
  await ctx.clearCookies();
  await ctx.addInitScript(() => {
    const install = () => {
      try {
        if (!document.body || document.getElementById("tour-cursor")) return;
        const dot = document.createElement("div");
        dot.id = "tour-cursor";
        dot.style.cssText =
          "position:fixed;width:18px;height:18px;border-radius:50%;background:#ff3d00;" +
          "border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.5);z-index:2147483647;" +
          "pointer-events:none;left:-100px;top:-100px;transform:translate(-9px,-9px);display:none;";
        document.addEventListener("mousemove", (e) => {
          dot.style.left = e.clientX + "px";
          dot.style.top = e.clientY + "px";
        });
        window.__armTourCursor = () => { dot.style.display = "block"; };
        document.body.appendChild(dot);
      } catch { /* retry on next tick */ }
    };
    window.addEventListener("DOMContentLoaded", install);
    const t = setInterval(() => {
      install();
      if (document.getElementById("tour-cursor")) clearInterval(t);
    }, 500);
    install();
  });
  return { ctx, VIDEO_DIR, OUT_MP4: outMp4 };
}

export function startWatchdog(tracker, voiceDurs) {
  const FILLER_POOL = ["filler-a", "filler-b", "filler-c"].filter((s) => s in voiceDurs);
  let fillerIdx = 0;
  const silenceOkay = () => {
    const lastDur = voiceDurs[tracker.lastStep] ?? 2500;
    return Date.now() - tracker.lastChapterAt > Math.max(12000, lastDur + 1500);
  };
  const timer = setInterval(() => {
    if (FILLER_POOL.length && silenceOkay()) tracker.mark(FILLER_POOL[fillerIdx++ % FILLER_POOL.length]);
  }, 1000);
  const lineFinished = () => Date.now() - tracker.lastChapterAt > (voiceDurs[tracker.lastStep] ?? 2500) + 800;
  const patiently = async (fillers, fn) => {
    let done = false;
    const timers = fillers
      .filter((f) => f.step in voiceDurs)
      .map((f) => setTimeout(() => { if (!done && lineFinished()) tracker.mark(f.step); }, f.afterMs));
    try { return await fn(); }
    finally { done = true; timers.forEach(clearTimeout); }
  };
  return { timer, patiently };
}

export async function showTitle(page, { kicker, title, stack, sub }) {
  // about:blank never redirects (the tour context already holds the demo
  // session, so `/` would bounce to a dashboard mid-evaluate).
  await page.goto("about:blank");
  await sleep(800);
  await page.evaluate(({ kicker, title, stack, sub }) => {
    const el = document.createElement("div");
    el.id = "tour-intro";
    el.style.cssText =
      "position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;gap:18px;text-align:center;" +
      "background:radial-gradient(1200px 700px at 50% 30%, #1e3a8a 0%, #0b1023 60%, #05070f 100%);" +
      "color:#fff;font-family:Roboto, Arial, sans-serif;padding:40px;";
    el.innerHTML =
      `<div style='font-size:20px;letter-spacing:6px;color:#93c5fd'>${kicker}</div>` +
      `<div style='font-size:88px;font-weight:800;letter-spacing:2px'>${title}</div>` +
      `<div style='font-size:22px;color:#93c5fd'>${stack}</div>` +
      `<div style='font-size:22px;color:#e2e8f0;margin-top:10px'>${sub}</div>`;
    document.body.appendChild(el);
  }, { kicker, title, stack, sub });
}

export async function hideTitle(page) {
  await page.evaluate(() => {
    const el = document.getElementById("tour-intro");
    if (el) { el.style.transition = "opacity .5s"; el.style.opacity = "0"; }
  });
  await sleep(600);
  await page.evaluate(() => document.getElementById("tour-intro")?.remove());
}

// Off-camera setup on a scratch page (its video file is discarded).
// Returns { acc, page } with an authenticated session in this context.
// primePaths: tour URLs to visit off-camera so browser cache, serverless
// functions, and DB pools are hot when the recorded take runs.
export async function setupDemo(ctx, role, primePaths = []) {
  const r = await fetch(`${BASE}/api/demo/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  const acc = await r.json();
  if (!acc.success) throw new Error("demo create failed: " + JSON.stringify(acc).slice(0, 300));
  console.log(`DEMO ${role} ${acc.profileId} ${acc.email}`);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.Clerk?.client?.signIn, null, { timeout: 60000 });
  await page.evaluate(async (t) => {
    const clerk = window.Clerk;
    const s = await clerk.client.signIn.create({ strategy: "ticket", ticket: t });
    if (!s?.createdSessionId) throw new Error("ticket signin status=" + s?.status);
    await clerk.setActive({ session: s.createdSessionId });
  }, acc.signInToken);
  const api = (method, path, body) => page.evaluate(async ({ method, path, body }) => {
    const res = await fetch(path, {
      method, headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: (await res.text()).slice(0, 300) };
  }, { method, path, body });
  if (role === "seeker" || role === "employer") {
    const seed = await api("POST", "/api/demo/seed", { role, profileId: acc.profileId });
    console.log("seed:", seed.status, seed.body.slice(0, 120));
    if (role === "seeker") {
      const sub = await api("POST", "/api/demo/activate-subscription", {});
      console.log("subscription:", sub.status, sub.body.slice(0, 120));
    }
    const payload = role === "seeker"
      ? { role, firstName: "Demo", lastName: "Seeker", location: "Remote (US)", experience: "5", skills: ["JavaScript", "TypeScript", "React"], goals: "Land a senior frontend role", professionalSummary: "Senior frontend engineer demo profile" }
      : { role, firstName: "Demo", lastName: "Employer", location: "Austin, TX", companyName: "Demo Co." };
    const ob = await api("POST", "/api/onboarding/complete", payload);
    console.log("onboarding:", ob.status, ob.body.slice(0, 120));
  }
  // Prime the tour pages off-camera (authenticated, so per-role caches warm).
  for (const p of primePaths) {
    try {
      await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" });
      await sleep(2500);
    } catch { /* keep priming */ }
  }
  console.log(`primed ${primePaths.length} pages`);
  return { acc, page };
}

// Seeded demo jobs carry expiresAt=null, which /api/jobs/search excludes
// (it requires expiresAt >= now). Stamp null and near-term demo expiries
// 30 days out so search pages look alive.
export async function fixDemoJobExpiry() {
  const { default: pg } = await import("pg");
  const m = fs.readFileSync("/Users/macbook/Documents/projects/ampertalent/.env.local", "utf8")
    .match(/^DATABASE_URL=(.*)$/m);
  const cs = m[1].trim().replace(/^"|"$/g, "").replace("sslmode=require", "sslmode=no-verify");
  const pool = new pg.Pool({ connectionString: cs });
  const r = await pool.query(
    "UPDATE jobs SET expires_at = NOW() + INTERVAL '30 days' WHERE (expires_at IS NULL OR expires_at < NOW() + INTERVAL '7 days') AND employer_id IN (SELECT id FROM user_profiles WHERE name LIKE 'demo-%')"
  );
  console.log("expiry fixed:", r.rowCount);
  await pool.end();
}

// Pre-save a job for the take's seeker via direct SQL (setup-time seeding).
// seekerProfileId is the UserProfile id (SavedJob.seekerId references
// JobSeeker.userId, which equals the profile id).
export async function dbPresetSave(seekerProfileId, jobId) {
  const { default: pg } = await import("pg");
  const { randomBytes } = await import("node:crypto");
  const m = fs.readFileSync("/Users/macbook/Documents/projects/ampertalent/.env.local", "utf8")
    .match(/^DATABASE_URL=(.*)$/m);
  const cs = m[1].trim().replace(/^"|"$/g, "").replace("sslmode=require", "sslmode=no-verify");
  const pool = new pg.Pool({ connectionString: cs });
  const id = `demosave-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
  await pool.query(
    "INSERT INTO saved_jobs (id, seeker_id, job_id, saved_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING",
    [id, seekerProfileId, jobId]
  );
  await pool.end();
  console.log(`preset save: seeker ${seekerProfileId.slice(0, 8)} job ${jobId.slice(0, 8)}`);
}

// Wait until a page's loading spinner is gone (or timeout). Returns true
// when content is showing. Never throws, so tours degrade gracefully.
export async function waitContent(page, { h1 = true, text = null, timeout = 30000 } = {}) {
  if (h1) await waitVisible(page, "h1:visible", timeout).catch(() => {});
  if (text) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const body = await page.evaluate(() => document.body.innerText).catch(() => "");
      if (body.includes(text)) return true;
      await sleep(750);
    }
    return false;
  }
  // Generic: wait until no "Loading..." indicator text remains in the first
  // screenful, polling the DOM.
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const loading = await page.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return [...document.querySelectorAll("*")]
        .filter(vis)
        .slice(0, 400)
        .some((el) => /^\s*Loading/.test(el.innerText || "") && (el.innerText || "").length < 80);
    }).catch(() => false);
    if (!loading) return true;
    await sleep(750);
  }
  return false;
}

export async function finishTour(ctx, tracker, timer, VIDEO_DIR, journey) {
  const pages = ctx.pages();
  const videoPath = await pages[pages.length - 1].video().path();
  clearInterval(timer);
  const CHAPTERS = `${VIDEO_DIR}/chapters.json`;
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  fs.writeFileSync(CHAPTERS, JSON.stringify(tracker.chapters, null, 2));
  await ctx.close();
  console.log(`VIDEO_RAW=${videoPath}`);
  console.log(`CHAPTERS=${CHAPTERS}`);
  return { videoPath, CHAPTERS };
}
