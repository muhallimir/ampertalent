// Concierge service deep dive: employer opens a live concierge page and
// files a full brief, admin works the queue plus detail plus find-seekers
// plus bio plus both chat threads, seeker reads and replies in the room.
// Three demo sessions in one continuous take via fresh signin tokens.
// Outputs silent mp4 to demos/concierge-service/.
import {
  BASE, sleep, loadVoiceDurs, makeChapterTracker, humanClick, humanType,
  humanGoto, waitVisible, waitContent, settle, launchTour, startWatchdog, showTitle, hideTitle,
  setupDemo, fixDemoJobExpiry, finishTour,
} from "./showcase-harness.mjs";

const JOURNEY = "concierge";
const OUT_MP4 = "/Users/macbook/Documents/projects/ampertalent/demos/concierge-service/ampertalent-concierge-service.mp4";
const FALLBACK = { "concierge-intro": 7600, "concierge-open": 5700, "concierge-request": 8500, "concierge-queue": 4900, "concierge-detail": 5700, "concierge-sourcing": 7500, "concierge-bio": 5300, "concierge-chatseek": 4300, "concierge-chateemp": 4500, "concierge-seeker": 7100 };
const VOICE_DURS = loadVoiceDurs(JOURNEY, FALLBACK);

// Onboarding renames the profile ("Demo Employer"), which breaks the
// signin-token demo-name gate. Restore the canonical name (email local
// part) so fresh tokens can be minted for role switches.
async function restoreDemoName(profileId, email) {
  const { default: pg } = await import("pg");
  const fs = await import("node:fs");
  const m = fs.readFileSync("/Users/macbook/Documents/projects/ampertalent/.env.local", "utf8")
    .match(/^DATABASE_URL=(.*)$/m);
  const cs = m[1].trim().replace(/^"|"$/g, "").replace("sslmode=require", "sslmode=no-verify");
  const pool = new pg.Pool({ connectionString: cs });
  const name = email.split("@")[0];
  await pool.query("UPDATE user_profiles SET name=$1, updated_at=NOW() WHERE id=$2", [name, profileId]);
  await pool.end();
  console.log(`restored name ${name.slice(0, 30)}`);
}

async function api(page, method, path, body) {  return page.evaluate(async ({ method, path, body }) => {
    const res = await fetch(path, {
      method, headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { /* non-json */ }
    return { status: res.status, json };
  }, { method, path, body });
}

async function mintToken(page, profileId) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await api(page, "POST", "/api/demo/signin-token", { profileId });
    if (r.json?.token) return r.json.token;
    console.log(`signin-token attempt ${attempt} failed:`, r.status, JSON.stringify(r.json).slice(0, 200));
    await sleep(3000);
  }
  throw new Error("signin-token failed for " + profileId);
}

async function switchUser(page, profileId) {
  const token = await mintToken(page, profileId);
  await page.evaluate(async (t) => {
    const clerk = window.Clerk;
    try { await clerk.signOut(); } catch { /* already out */ }
    await new Promise((res) => setTimeout(res, 500));
    const s = await clerk.client.signIn.create({ strategy: "ticket", ticket: t });
    if (!s?.createdSessionId) throw new Error("ticket signin status=" + s?.status);
    await clerk.setActive({ session: s.createdSessionId });
  }, token);
  await sleep(2000);
}

// Type a chat message into the visible composer and send it. Returns true
// when a composer was found. Falls back to the API when the UI has none.
async function sendChatMessage(page, text) {
  const box = page.locator('textarea:visible, input:visible[placeholder*="essage"], input:visible[placeholder*="ype"]').first();
  if (await box.count()) {
    try {
      await humanType(page, box, text);
      await sleep(600);
      const send = page.locator('button:visible:has-text("Send"), button:visible[type="submit"]').first();
      if (await send.count()) await humanClick(page, send);
      else await page.keyboard.press("Enter").catch(() => {});
      await sleep(2500);
      return true;
    } catch { /* fall through to API */ }
  }
  return false;
}

// Seed the seeker concierge room directly (job + seeker + admin ids) so
// the admin seekers thread and the seeker room page both have real rows.
// Returns the room id for the direct seeker URL. Demo rows are cleaned
// with the rest of the take (seeker_concierge_chats plus messages).
async function seedSeekerRoom(jobId, seekerProfileId, adminProfileId) {
  const { default: pg } = await import("pg");
  const fs = await import("node:fs");
  const { randomBytes } = await import("node:crypto");
  const m = fs.readFileSync("/Users/macbook/Documents/projects/ampertalent/.env.local", "utf8")
    .match(/^DATABASE_URL=(.*)$/m);
  const cs = m[1].trim().replace(/^"|"$/g, "").replace("sslmode=require", "sslmode=no-verify");
  const pool = new pg.Pool({ connectionString: cs });
  try {
    const roomId = `demoroom-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
    await pool.query(
      "INSERT INTO seeker_concierge_chats (id, job_id, seeker_id, admin_id, created_at) VALUES ($1,$2,$3,$4,NOW())",
      [roomId, jobId, seekerProfileId, adminProfileId]
    );
    await pool.query(
      "INSERT INTO seeker_concierge_chat_messages (id, chat_id, sender_id, sender_type, message, message_type, created_at) VALUES ($1,$2,$3,'admin',$4,'text',NOW())",
      [`demomsg-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`, roomId, adminProfileId, "Hi, you are shortlisted for this React role. Next step is an intro call this week."]
    );
    console.log(`seeded seeker room ${roomId.slice(0, 16)}`);
    return roomId;
  } finally {
    await pool.end();
  }
}

// Slow scroll tour of the current page: down in steps, pause on content,
// back to top. Gives each deep-dive shot enough on-camera dwell (target
// 120 to 150s total) while showing real page depth. No blank screens.
async function scrollTour(page, steps = 2) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, 450)).catch(() => {});
    await sleep(1600);
  }
  await sleep(1000);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await sleep(1000);
}

async function main() {
  const { ctx, VIDEO_DIR } = await launchTour(JOURNEY, OUT_MP4);
  const tracker = makeChapterTracker();

  // Off-camera setup (discarded video): employer session + seed + onboard.
  const { acc: accE, page: setup } = await setupDemo(ctx, "employer", [
    "/employer/dashboard",
    "/employer/jobs",
    "/employer/applications",
    "/employer/billing",
    "/employer/messages",
  ]);
  await fixDemoJobExpiry();
  // Spawn admin + seeker companions (public endpoint, tokens stay fresh).
  const adminAcc = (await api(setup, "POST", "/api/demo/create", { role: "admin" })).json;
  const seekerAcc = (await api(setup, "POST", "/api/demo/create", { role: "seeker" })).json;
  if (!adminAcc?.success || !seekerAcc?.success) throw new Error("companion demo create failed");
  console.log(`DEMO_ADMIN=${adminAcc.email} DEMO_SEEKER=${seekerAcc.email}`);
  // Seeker needs onboarding + subscription so concierge chat renders.
  await restoreDemoName(accE.profileId, accE.email);
  await switchUser(setup, seekerAcc.profileId);
  console.log("seeker seed:", JSON.stringify((await api(setup, "POST", "/api/demo/seed", { role: "seeker", profileId: seekerAcc.profileId })).status));
  console.log("seeker sub:", JSON.stringify((await api(setup, "POST", "/api/demo/activate-subscription", {})).status));
  console.log("seeker ob:", JSON.stringify((await api(setup, "POST", "/api/onboarding/complete", {
    role: "seeker", firstName: "Demo", lastName: "Seeker", location: "Remote (US)",
    experience: "5", skills: ["JavaScript", "TypeScript", "React"],
    goals: "Land a senior frontend role", professionalSummary: "Senior frontend engineer demo profile",
  })).status));
  await restoreDemoName(seekerAcc.profileId, seekerAcc.email);
  // Prime admin pages off-camera while in their sessions.
  await switchUser(setup, adminAcc.profileId);
  for (const p of ["/admin/concierge", "/admin/concierge/find-seekers", "/admin/concierge/bio", "/admin/concierge/chat/employers", "/admin/concierge/chat/seekers"]) {
    try { await setup.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" }); await sleep(2000); } catch { /* keep priming */ }
  }
  // Back to employer for the take start.
  await switchUser(setup, accE.profileId);
  const liveJob = await setup.evaluate(async () => {
    try {
      const r = await fetch("/api/employer/jobs");
      const j = await r.json();
      const list = j.jobs || j.data || [];
      const live = list.find((x) => x.status === "approved") || list[0];
      return live ? { id: live.id || live.jobId, title: live.title } : null;
    } catch { return null; }
  });
  console.log("LIVE JOB:", JSON.stringify(liveJob));
  if (!liveJob?.id) throw new Error("no live job for concierge take");
  // Pre-warm the take's heaviest pages so on-camera reloads render fast.
  for (let i = 0; i < 2; i++) {
    try {
      await setup.goto(`${BASE}/employer/concierge/${liveJob.id}`, { waitUntil: "domcontentloaded" });
      await waitContent(setup, { timeout: 45000 });
      await sleep(2500);
    } catch { /* keep priming */ }
  }
  await setup.close();
  console.log(`DEMO_EMAIL=${accE.email}`);
  const { timer, patiently } = startWatchdog(tracker, VOICE_DURS);

  const page = await ctx.newPage();
  tracker.rebase();

  await showTitle(page, {
    kicker: "LIVE DEMO TOUR",
    title: "AmperTalent Concierge",
    stack: "Next.js 16 &nbsp;·&nbsp; Clerk &nbsp;·&nbsp; Supabase Postgres",
    sub: "White glove sourcing: request it, fulfill it, follow along",
  });
  console.log("STEP intro");
  tracker.mark("concierge-intro");
  await settle(tracker, VOICE_DURS, "concierge-intro", 1500);
  await hideTitle(page);

  // Shot 2: employer opens the live concierge page.
  console.log("STEP open");
  tracker.mark("concierge-open");
  await humanGoto(page, `${BASE}/employer/concierge/${liveJob.id}`);
  await patiently(
    [{ afterMs: 10000, step: "filler-a" }],
    () => waitVisible(page, "h1:visible", 45000)
  );
  await sleep(3500);
  await scrollTour(page, 1);
  await settle(tracker, VOICE_DURS, "concierge-open", 4000);

  // Shot 3: employer files the full brief (every option in the thread).
  console.log("STEP request");
  tracker.mark("concierge-request");
  const reqBtn = page.locator('button:visible:has-text("Request Concierge"), button:visible:has-text("Request"), button:visible:has-text("Get Started")').first();
  if (await reqBtn.count()) {
    await humanClick(page, reqBtn);
    await patiently(
      [{ afterMs: 8000, step: "concierge-request-wait" }],
      () => sleep(4000)
    );
  }
  // File the real request live through the same endpoint the job page
  // uses, plus one detailed brief covering role, skills, timeline, budget.
  const req = await api(page, "POST", `/api/employer/jobs/${liveJob.id}/concierge`, {});
  console.log("concierge request:", req.status, JSON.stringify(req.json).slice(0, 160));
  const brief = "Hi, we need three vetted React engineers for this role. Must have: React plus TypeScript, 4 plus years, US remote. Timeline is two weeks. Budget is senior band. Please shortlist five profiles first.";
  await sendChatMessage(page, brief);
  const msg = await api(page, "POST", `/api/employer/jobs/${liveJob.id}/concierge/chat/messages`, { message: brief });
  console.log("employer chat message:", msg.status);
  await humanGoto(page, `${BASE}/employer/concierge/${liveJob.id}`);
  await patiently(
    [{ afterMs: 10000, step: "concierge-request-wait" }],
    () => waitContent(page, { timeout: 45000 })
  );
  await patiently(
    [{ afterMs: 8000, step: "concierge-search-wait" }],
    () => page.waitForFunction(
      () => document.body.innerText.includes("Requested") || document.body.innerText.includes("vetted React engineers"),
      null, { timeout: 25000 }
    ).catch(() => {})
  );
  await sleep(2000);
  await settle(tracker, VOICE_DURS, "concierge-request", 4000);
  // Seed the seeker room now that the job is concierge-enabled.
  const seekerRoomId = await seedSeekerRoom(liveJob.id, seekerAcc.profileId, adminAcc.profileId);
  console.log(`SEEKER_ROOM=${seekerRoomId}`);

  // Shot 4: admin queue.
  console.log("STEP queue");
  await switchUser(page, adminAcc.profileId);
  tracker.mark("concierge-queue");
  await humanGoto(page, `${BASE}/admin/concierge`);
  await waitContent(page, { timeout: 45000 });
  await sleep(2000);
  await scrollTour(page, 2);
  await settle(tracker, VOICE_DURS, "concierge-queue", 4000);

  // Shot 5: admin request detail for this exact job.
  console.log("STEP detail");
  tracker.mark("concierge-detail");
  await humanGoto(page, `${BASE}/admin/concierge/${liveJob.id}`);
  await waitContent(page, { timeout: 45000 });
  await sleep(3500);
  // If the detail route bounces, fall back to opening the request row
  // from the queue page so the shot still lands on this job.
  if (page.url().includes("/admin/concierge$") || (await page.evaluate(() => document.body.innerText).catch(() => "")).includes("not found")) {
    await humanGoto(page, `${BASE}/admin/concierge`);
    await waitContent(page, { timeout: 45000 });
    const row = page.locator(`a:visible:has-text("${(liveJob.title || "").slice(0, 18)}"), tr:visible:has-text("pending"), tr:visible:has-text("Requested")`).first();
    if (await row.count()) {
      await row.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
      await sleep(1500);
    }
  }
  await sleep(2000);
  await scrollTour(page, 2);
  await settle(tracker, VOICE_DURS, "concierge-detail", 4000);

  // Shot 6: find-seekers results (slow sweep, filler covers the wait).
  console.log("STEP sourcing");
  tracker.mark("concierge-sourcing");
  await humanGoto(page, `${BASE}/admin/concierge/find-seekers`);
  await patiently(
    [{ afterMs: 10000, step: "concierge-search-wait" }],
    () => waitContent(page, { timeout: 45000 })
  );
  await sleep(3500);
  await scrollTour(page, 1);
  await settle(tracker, VOICE_DURS, "concierge-sourcing", 4000);

  // Shot 7: specialist bio.
  console.log("STEP bio");
  tracker.mark("concierge-bio");
  await humanGoto(page, `${BASE}/admin/concierge/bio`);
  await waitContent(page, { timeout: 45000 });
  await sleep(2000);
  await scrollTour(page, 2);
  await settle(tracker, VOICE_DURS, "concierge-bio", 4000);

  // Shot 8: seekers thread, admin sends one message live.
  console.log("STEP chatseek");
  tracker.mark("concierge-chatseek");
  const seekerThreads = await api(page, "GET", "/api/admin/concierge/chat/seekers", null).catch(() => ({ json: null }));
  const seekerThread = (seekerThreads?.json?.threads || []).find((t) => t.jobId === liveJob.id) || (seekerThreads?.json?.threads || [])[0];
  console.log("SEEKER_THREAD:", seekerThread ? seekerThread.id.slice(0, 12) : "none");
  await humanGoto(page, `${BASE}/admin/concierge/chat/seekers`);
  await patiently(
    [{ afterMs: 8000, step: "concierge-search-wait" }],
    () => page.waitForFunction(
      () => document.body.innerText.includes("demo-seeker") || document.body.innerText.includes("Seekers") || document.body.innerText.includes("No conversations"),
      null, { timeout: 35000 }
    ).catch(() => {})
  );
  await sleep(2500);
  const threadS = page.locator('a:visible[href*="/admin/concierge/"], tr:visible:has-text("demo-"), li:visible:has-text("demo-")').first();
  if (await threadS.count()) {
    await threadS.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
    await sleep(1000);
  }
  if (!(await sendChatMessage(page, "Hi, you are shortlisted for a React role. Are you open to a two week interview process?"))) {
    if (seekerThread?.id) {
      const s = await api(page, "POST", `/api/admin/concierge/chat/seekers/${seekerThread.id}/messages`, { message: "Hi, you are shortlisted for a React role. Are you open to a two week interview process?" });
      console.log("seeker thread message:", s.status);
    }
    await sleep(2000);
  }
  await sleep(2500);
  await scrollTour(page, 1);
  await settle(tracker, VOICE_DURS, "concierge-chatseek", 4000);

  // Shot 9: employers thread, admin sends one message live.
  console.log("STEP chateemp");
  tracker.mark("concierge-chateemp");
  const empThreads = await api(page, "GET", "/api/admin/concierge/chat/employers", null).catch(() => ({ json: null }));
  const empThread = (empThreads?.json?.threads || []).find((t) => t.jobId === liveJob.id) || (empThreads?.json?.threads || [])[0];
  console.log("EMP_THREAD:", empThread ? String(empThread.id).slice(0, 12) : "none");
  await humanGoto(page, `${BASE}/admin/concierge/chat/employers`);
  await patiently(
    [{ afterMs: 8000, step: "concierge-search-wait" }],
    () => page.waitForFunction(
      () => document.body.innerText.includes("demo-employer") || document.body.innerText.includes("Employer") || document.body.innerText.includes("No conversations"),
      null, { timeout: 35000 }
    ).catch(() => {})
  );
  await sleep(2500);
  if (!(await sendChatMessage(page, "Shortlist update: five React profiles screened, full notes tomorrow. Timeline stays two weeks."))) {
    if (empThread?.id) {
      const s = await api(page, "POST", `/api/admin/concierge/chat/employers/${empThread.id}/messages`, { message: "Shortlist update: five React profiles screened, full notes tomorrow. Timeline stays two weeks." });
      console.log("employer thread message:", s.status);
    }
    await sleep(2000);
  }
  await sleep(2500);
  await settle(tracker, VOICE_DURS, "concierge-chateemp", 4000);

  // Shot 10: seeker reads and replies in the concierge room.
  console.log("STEP seeker");
  await switchUser(page, seekerAcc.profileId);
  tracker.mark("concierge-seeker");
  await humanGoto(page, `${BASE}/seeker/concierge-chat/${liveJob.id}/${seekerRoomId}`);
  await waitContent(page, { timeout: 45000 });
  await page.waitForFunction(
    () => document.body.innerText.includes("shortlisted") || document.body.innerText.includes("React"),
    null, { timeout: 25000 }
  ).catch(() => {});
  await sleep(2500);
  if (!(await sendChatMessage(page, "Thanks, happy to confirm interest. Open for an intro call this week."))) {
    await api(page, "POST", `/api/seeker/concierge-chat/${liveJob.id}/${seekerRoomId}/messages`, { message: "Thanks, confirming interest. Open for an intro call this week." }).catch(() => {});
    await sleep(2000);
  }
  await sleep(2500);
  await settle(tracker, VOICE_DURS, "concierge-seeker", 4000);

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
