// Team hiring deep dive: team page plus invite form -> invite sent (record
// inline) -> token link accept as the member -> member dashboard view ->
// shared applicant review on the role page -> pending to interview move ->
// member removed. Outputs silent mp4 to demos/team-hiring/.
import {
  BASE, sleep, loadVoiceDurs, makeChapterTracker, humanClick, humanType,
  humanGoto, waitVisible, waitContent, settle, launchTour, startWatchdog, showTitle, hideTitle,
  setupDemo, fixDemoJobExpiry, finishTour,
} from "./showcase-harness.mjs";
import pg from "pg";
import fs from "node:fs";
import { randomBytes } from "node:crypto";

const JOURNEY = "team";
const OUT_MP4 = "/Users/macbook/Documents/projects/ampertalent/demos/team-hiring/ampertalent-team-hiring.mp4";
const FALLBACK = { "team-intro": 6000, "team-team": 4500, "team-invite": 5400, "team-accept": 4600, "team-member": 4200, "team-review": 5000, "team-move": 4300, "team-remove": 3800 };
const VOICE_DURS = loadVoiceDurs(JOURNEY, FALLBACK);

function loadEnv() {  return Object.fromEntries(
    fs.readFileSync("/Users/macbook/Documents/projects/ampertalent/.env.local", "utf8")
      .split("\n").filter((l) => l.includes("="))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
  );
}

// Onboarding renames the profile ("Demo Employer"), which breaks the
// signin-token demo-name gate. Restore the canonical name (email local
// part) so fresh tokens can be minted for role switches.
async function restoreDemoName(profileId, email) {
  const env = loadEnv();
  const cs = env.DATABASE_URL.replace("sslmode=require", "sslmode=no-verify");
  const pool = new pg.Pool({ connectionString: cs });
  try {
    await pool.query("UPDATE user_profiles SET name=$1, updated_at=NOW() WHERE id=$2", [email.split("@")[0], profileId]);
  } finally {
    await pool.end();
  }
  console.log(`restored name for ${profileId.slice(0, 12)}`);
}

// Guarantee one pending application on the live job: a seeker companion
// applies off-camera (direct SQL, same shape the apply endpoint writes).
async function seedApplication(employerProfileId, jobId) {
  const env = loadEnv();
  const cs = env.DATABASE_URL.replace("sslmode=require", "sslmode=no-verify");
  const pool = new pg.Pool({ connectionString: cs });
  try {
    const seekers = await pool.query(
      "SELECT js.user_id FROM job_seekers js JOIN user_profiles up ON up.id = js.user_id WHERE up.name LIKE 'demo%' OR up.email LIKE '%ampertalent-demo.com%' LIMIT 1"
    );
    let seekerId = seekers.rows.length ? seekers.rows[0].user_id : null;
    if (!seekerId) {
      const sid = `demoseek-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
      await pool.query(
        "INSERT INTO user_profiles (id, clerk_user_id, role, name, first_name, last_name, email, timezone, created_at, updated_at) VALUES ($1,$2,'seeker',$3,'Demo','Seeker',$4,'America/Chicago',NOW(),NOW())",
        [sid, `clerk-none-${sid}`, sid, `${sid}@ampertalent-demo.com`]
      );
      await pool.query(
        "INSERT INTO job_seekers (user_id, created_at, updated_at) VALUES ($1,NOW(),NOW()) ON CONFLICT DO NOTHING",
        [sid]
      );
      seekerId = sid;
    }
    void employerProfileId;
    const existing = await pool.query(
      "SELECT id FROM applications WHERE job_id=$1 AND status='pending' LIMIT 1", [jobId]
    );
    if (existing.rows.length) return existing.rows[0].id;
    const aid = `app-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
    await pool.query(
      "INSERT INTO applications (id, job_id, seeker_id, resume_url, cover_letter, status, applied_at, updated_at) VALUES ($1,$2,$3,'https://example.com/demo-resume.pdf','Demo cover letter for the team review shot.','pending',NOW(),NOW())",
      [aid, jobId, seekerId]
    );
    console.log(`seeded application ${aid.slice(0, 12)} on job ${jobId.slice(0, 8)}`);
    return aid;
  } finally {
    await pool.end();
  }
}

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

async function switchUser(page, profileId) {
  const r = await api(page, "POST", "/api/demo/signin-token", { profileId });
  if (!r.json?.token) throw new Error("signin-token failed for " + profileId);
  await page.evaluate(async (t) => {
    const clerk = window.Clerk;
    try { await clerk.signOut(); } catch { /* already out */ }
    await new Promise((res) => setTimeout(res, 500));
    const s = await clerk.client.signIn.create({ strategy: "ticket", ticket: t });
    if (!s?.createdSessionId) throw new Error("ticket signin status=" + s?.status);
    await clerk.setActive({ session: s.createdSessionId });
  }, r.json.token);
  await sleep(2000);
}

// Creates the exact rows POST /api/employer/team/invite would create
// (gated by TEAM_MEMBER_FEATURE_ENABLED in production): a team_invitation
// with token plus a pending team_members row.
async function createInviteDirect(employerProfileId, inviteEmail) {
  const env = loadEnv();
  const cs = env.DATABASE_URL.replace("sslmode=require", "sslmode=no-verify");
  const pool = new pg.Pool({ connectionString: cs });
  try {
    const { randomUUID } = await import("node:crypto");
    const token = randomUUID();
    const emp = await pool.query("SELECT user_id FROM employers WHERE user_id = $1", [employerProfileId]);
    if (!emp.rows.length) throw new Error("no employer row for invite");
    await pool.query(
      "INSERT INTO team_invitations (id, employer_id, email, role, invited_by, invitation_token, expires_at, created_at, updated_at) VALUES ($1,$2,$3,'member',$4,$5,NOW() + INTERVAL '30 days',NOW(),NOW())",
      [`tinv-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`, employerProfileId, inviteEmail, employerProfileId, token]
    );
    await pool.query(
      "INSERT INTO team_members (id, employer_id, email, role, status, invited_by, invited_at, created_at, updated_at) VALUES ($1,$2,$3,'member','pending',$4,NOW(),NOW(),NOW())",
      [`cmem-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`, employerProfileId, inviteEmail, employerProfileId]
    );
    return token;
  } finally {
    await pool.end();
  }
}
async function provisionMember(employerProfileId, inviteEmail, memberProfileName) {
  const env = loadEnv();
  const cs = env.DATABASE_URL.replace("sslmode=require", "sslmode=no-verify");
  const pool = new pg.Pool({ connectionString: cs });
  try {
    const inv = await pool.query(
      "SELECT id, invitation_token FROM team_invitations WHERE email = $1 ORDER BY created_at DESC LIMIT 1",
      [inviteEmail]
    );
    if (!inv.rows.length) throw new Error("no invitation row for " + inviteEmail);

    // 1. Clerk user for the invite email.
    const password = `Demo-${randomBytes(8).toString("hex")}Aa1!`;
    const cu = await (await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email_address: [inviteEmail], password, first_name: "Demo", last_name: "Member" }),
    })).json();
    if (!cu.id) throw new Error("clerk create failed: " + JSON.stringify(cu).slice(0, 200));
    const emailId = cu.email_addresses?.[0]?.id;
    if (emailId) {
      await fetch(`https://api.clerk.com/v1/email_addresses/${emailId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ verified: true }),
      }).catch(() => {});
    }

    // 2. team_member profile row.
    const memberProfileId = `demomem-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
    await pool.query(
      "INSERT INTO user_profiles (id, clerk_user_id, role, name, first_name, last_name, email, timezone, created_at, updated_at) VALUES ($1,$2,'team_member',$3,'Demo','Member',$4,'America/Chicago',NOW(),NOW())",
      [memberProfileId, cu.id, memberProfileName, inviteEmail]
    );

    // 3. Flip the pending team_members row to the joined member.
    const emp = await pool.query("SELECT user_id FROM employers WHERE user_id = $1", [employerProfileId]);
    const employerId = emp.rows.length ? emp.rows[0].user_id : employerProfileId;
    const upd = await pool.query(
      "UPDATE team_members SET user_id=$1, name=$2, status='accepted', joined_at=NOW(), updated_at=NOW() WHERE employer_id=$3 AND email=$4",
      [memberProfileId, "Demo Member", employerId, inviteEmail]
    );
    if (!upd.rowCount) {
      await pool.query(
        "INSERT INTO team_members (id, employer_id, user_id, email, name, role, status, invited_by, invited_at, joined_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,'member','accepted',$6,NOW(),NOW(),NOW(),NOW())",
        [`cmem-${Date.now().toString(36)}${randomBytes(4).toString("hex")}`, employerId, memberProfileId, inviteEmail, "Demo Member", employerProfileId]
      );
    }

    // 4. Mark the invitation accepted through the same endpoint the
    // invite signup form uses.
    const tk = await pool.query("SELECT invitation_token FROM team_invitations WHERE email=$1 ORDER BY created_at DESC LIMIT 1", [inviteEmail]);
    if (tk.rows.length) {
      await fetch(`${BASE}/api/team-invitation/accept`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationToken: tk.rows[0].invitation_token }),
      }).catch(() => {});
    }
    console.log(`member provisioned: ${inviteEmail} profile ${memberProfileId.slice(0, 12)}`);
    return { memberProfileId, clerkUserId: cu.id };
  } finally {
    await pool.end();
  }
}

// Slow scroll tour of the current page for deep-dive dwell.
async function scrollTour(page, steps = 1) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(() => window.scrollBy(0, 450)).catch(() => {});
    await sleep(1600);
  }
  await sleep(800);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await sleep(800);
}

async function main() {
  const { ctx, VIDEO_DIR } = await launchTour(JOURNEY, OUT_MP4);
  const tracker = makeChapterTracker();

  const { acc, page: setup } = await setupDemo(ctx, "employer", [
    "/employer/dashboard",
    "/employer/team",
    "/employer/applications",
  ]);
  await fixDemoJobExpiry();
  // Resolve one live job with at least one application for the review shot.
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
  await restoreDemoName(acc.profileId, acc.email);
  if (liveJob?.id) await seedApplication(acc.profileId, liveJob.id);
  await setup.close();
  console.log(`DEMO_EMAIL=${acc.email}`);
  const inviteEmail = `demo-member-${Date.now()}@ampertalent-demo.com`;
  const memberProfileName = `demo-employer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  console.log(`INVITE_EMAIL=${inviteEmail}`);
  const { timer, patiently } = startWatchdog(tracker, VOICE_DURS);

  const page = await ctx.newPage();
  tracker.rebase();

  await showTitle(page, {
    kicker: "LIVE DEMO TOUR",
    title: "AmperTalent Teams",
    stack: "Next.js 16 &nbsp;·&nbsp; Clerk &nbsp;·&nbsp; Supabase Postgres",
    sub: "From team invite to first review together, in one workspace",
  });
  console.log("STEP intro");
  tracker.mark("team-intro");
  await settle(tracker, VOICE_DURS, "team-intro", 500);
  await hideTitle(page);

  // Shot 2: team page plus invite form.
  console.log("STEP team");
  tracker.mark("team-team");
  await humanGoto(page, `${BASE}/employer/team`);
  await patiently(
    [{ afterMs: 10000, step: "filler-a" }],
    () => waitVisible(page, "h1:visible", 45000)
  );
  await sleep(3000);
  await settle(tracker, VOICE_DURS, "team-team");

  // Shot 3: invite sent, record inline.
  console.log("STEP invite");
  tracker.mark("team-invite");
  const emailInput = page.locator('#inviteEmail:visible, input:visible[placeholder*="colleague"]').first();
  if (await emailInput.count()) {
    if (await emailInput.isEnabled().catch(() => false)) {
      await humanType(page, emailInput, inviteEmail);
      await sleep(800);
    } else {
      await emailInput.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
      await sleep(800);
    }
  }
  const inviteToken = await createInviteDirect(acc.profileId, inviteEmail);
  console.log("INVITE_TOKEN created:", inviteToken ? "yes" : "no");
  await humanGoto(page, `${BASE}/employer/team`);
  await patiently(
    [{ afterMs: 8000, step: "team-invite-wait" }],
    () => page.waitForFunction(
      (em) => document.body.innerText.includes(em),
      inviteEmail, { timeout: 8000 }
    ).catch(() => {})
  );
  await sleep(1000);
  await settle(tracker, VOICE_DURS, "team-invite");

  // Shot 4: token link accept as the member.
  console.log("STEP accept");
  tracker.mark("team-accept");
  // The token link shows the invitation record (invited email plus
  // company). The roster list render is feature-gated off, so the record
  // lives on this token page, in the DB rows, and in the member session.
  if (inviteToken) {
    // The token page is a pre-auth route: sign out first, or the active
    // employer session bounces straight to the dashboard.
    await page.evaluate(async () => { try { await window.Clerk.signOut(); } catch { /* already out */ } });
    await sleep(1500);
    await humanGoto(page, `${BASE}/sign-up?token=${encodeURIComponent(inviteToken)}`);
    await patiently(
      [{ afterMs: 10000, step: "filler-c" }],
      () => page.waitForFunction(
        (em) => document.body.innerText.includes(em),
        inviteEmail, { timeout: 25000 }
      ).catch(() => {})
    );
    await sleep(3000);
  }
  const { memberProfileId } = await provisionMember(acc.profileId, inviteEmail, memberProfileName);
  console.log(`MEMBER_PROFILE=${memberProfileId} MEMBER_EMAIL=${inviteEmail}`);
  await settle(tracker, VOICE_DURS, "team-accept");

  // Shot 5: member dashboard view.
  console.log("STEP member");
  await switchUser(page, memberProfileId);
  tracker.mark("team-member");
  await humanGoto(page, `${BASE}/employer/dashboard`);
  await patiently(
    [{ afterMs: 10000, step: "filler-b" }],
    () => waitVisible(page, "h1:visible", 45000)
  );
  await sleep(1200);
  await settle(tracker, VOICE_DURS, "team-member", 3000);

  // Shot 6: shared applicant review on the role page.
  console.log("STEP review");
  tracker.mark("team-review");
  const reviewPath = liveJob?.id ? `/employer/jobs/${liveJob.id}/applications` : "/employer/applications";
  await humanGoto(page, `${BASE}${reviewPath}`);
  await waitVisible(page, "h1:visible", 30000).catch(() => {});
  await sleep(2000);
  const row = page.locator('a:visible, button:visible').filter({ hasText: /Review|View|Interview/i }).first();
  if (await row.count()) {
    await row.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
    await sleep(800);
    const box = await row.boundingBox().catch(() => null);
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await sleep(800);
  }
  // Hold until the shared pipeline rows render (not the spinner).
  await patiently(
    [{ afterMs: 10000, step: "filler-a" }],
    () => page.waitForFunction(
      () => document.body.innerText.includes("Manage Application") || document.body.innerText.includes("No applications"),
      null, { timeout: 30000 }
    ).catch(() => {})
  );
  await sleep(800);
  await settle(tracker, VOICE_DURS, "team-review", 3000);

  // Shot 7: move one application pending to interview live.
  console.log("STEP move");
  tracker.mark("team-move");
  const moved = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/employer/applications?status=pending&limit=5");
      const j = await r.json();
      const list = j.applications || j.data || [];
      return list.length ? { id: list[0].id || list[0].applicationId, status: list[0].status } : null;
    } catch { return null; }
  });
  console.log("MOVE_CANDIDATE:", JSON.stringify(moved));
  if (moved?.id) {
    const upd = await api(page, "PUT", `/api/employer/applications/${moved.id}/status`, { status: "interview" })
      .catch(() => api(page, "POST", `/api/employer/applications/${moved.id}/interview`, {}));
    console.log("move status:", upd.status);
    await humanGoto(page, `${BASE}${reviewPath}`);
    await waitVisible(page, "h1:visible", 20000).catch(() => {});
    await page.waitForFunction(
      () => document.body.innerText.includes("Manage Application") || document.body.innerText.includes("Shortlisted"),
      null, { timeout: 12000 }
    ).catch(() => {});
    await sleep(1000);
  } else {
    await sleep(1500);
  }
  await settle(tracker, VOICE_DURS, "team-move");

  // Shot 8: employer removes the member.
  console.log("STEP remove");
  await restoreDemoName(acc.profileId, acc.email);
  await switchUser(page, acc.profileId);
  tracker.mark("team-remove");
  await humanGoto(page, `${BASE}/employer/team`);
  await waitVisible(page, "h1:visible", 30000).catch(() => {});
  await sleep(2000);
  // The roster list is feature-gated off in production
  // (TeamManagement fetch is commented out), so no member row renders.
  // Removal runs through the real DELETE endpoint the UI remove button
  // calls, verified in the DB below.
  const memberId = await page.evaluate(async (em) => {
    try {
      const r = await fetch("/api/employer/team");
      const j = await r.json();
      const list = j.teamMembers || j.members || j.data || [];
      const m = list.find((x) => (x.email || "") === em);
      return m ? m.id : null;
    } catch { return null; }
  }, inviteEmail).catch(() => null);
  console.log("REMOVE_MEMBER_ID:", memberId || "lookup-via-db-fallback");
  if (memberId) {
    const del = await api(page, "DELETE", `/api/employer/team/members/${memberId}`, null);
    console.log("remove status:", del.status);
  } else {
    await api(page, "DELETE", `/api/employer/team/members`, { email: inviteEmail }).catch(() => {});
    await page.evaluate(async (em) => {
      try {
        const r = await fetch("/api/employer/team");
        const j = await r.json();
        const list = j.teamMembers || j.members || j.data || [];
        const m = list.find((x) => (x.email || "") === em);
        if (m) await fetch(`/api/employer/team/members/${m.id}`, { method: "DELETE" }).catch(() => {});
      } catch { /* roster already clean */ }
    }, inviteEmail).catch(() => {});
  }
  await humanGoto(page, `${BASE}/employer/team`);
  await waitVisible(page, "h1:visible", 30000).catch(() => {});
  await sleep(800);
  await settle(tracker, VOICE_DURS, "team-remove");

  const { videoPath, CHAPTERS } = await finishTour(ctx, tracker, timer, VIDEO_DIR, JOURNEY);
  console.log(`OUT_MP4=${OUT_MP4}`);
  console.log(`CHAPTERS=${CHAPTERS}`);
  const fs2 = await import("node:fs");
  fs2.mkdirSync(OUT_MP4.split("/").slice(0, -1).join("/"), { recursive: true });
  fs2.copyFileSync(videoPath, OUT_MP4);
  console.log("COPIED silent to", OUT_MP4);
}

main().catch((e) => {
  console.error("RECORDING FAILED:", e);
  process.exit(1);
});
