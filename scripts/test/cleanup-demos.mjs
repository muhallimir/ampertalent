// Delete ALL demo data: Clerk users + Postgres rows in FK order.
// Demo scope: user_profiles with demo-pattern name or @ampertalent-demo.com email.
// Usage: node scripts/test/cleanup-demos.mjs
import pg from "pg";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync("/Users/macbook/Documents/projects/ampertalent/.env.local", "utf8")
    .split("\n").filter((l) => l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);
const cs = env.DATABASE_URL.replace("sslmode=require", "sslmode=no-verify");
const pool = new pg.Pool({ connectionString: cs });

const DEMO_PROFILE = `(SELECT id FROM user_profiles WHERE name LIKE 'demo%' OR email LIKE '%ampertalent-demo.com%')`;
const DEMO_JOBS = `(SELECT id FROM jobs WHERE employer_id IN ${DEMO_PROFILE})`;

async function del(label, sql) {
  const r = await pool.query(sql).catch((e) => ({ error: String(e).slice(0, 160), rowCount: -1 }));
  console.log(`${label}: ${r.error ? "ERROR " + r.error : r.rowCount + " rows"}`);
  return r.rowCount || 0;
}

console.log("--- DB cleanup ---");
await del("interview_history", `DELETE FROM interview_history WHERE application_id IN (SELECT id FROM applications WHERE seeker_id IN ${DEMO_PROFILE} OR job_id IN ${DEMO_JOBS})`);
await del("applications", `DELETE FROM applications WHERE seeker_id IN ${DEMO_PROFILE} OR job_id IN ${DEMO_JOBS}`);
await del("saved_jobs", `DELETE FROM saved_jobs WHERE seeker_id IN ${DEMO_PROFILE}`);
await del("cover_letter_templates", `DELETE FROM cover_letter_templates WHERE seeker_id IN ${DEMO_PROFILE}`);
await del("resumes", `DELETE FROM resumes WHERE seeker_id IN ${DEMO_PROFILE}`);
await del("resume_critiques", `DELETE FROM resume_critiques WHERE seeker_id IN ${DEMO_PROFILE}`);
await del("subscriptions", `DELETE FROM subscriptions WHERE seeker_id IN ${DEMO_PROFILE}`);
await del("subscription_cancellation_logs", `DELETE FROM subscription_cancellation_logs WHERE seeker_id IN ${DEMO_PROFILE}`);
await del("invoices(demo pkgs)", `DELETE FROM invoices WHERE employer_package_id IN (SELECT ep.id FROM employer_packages ep JOIN employers e ON e.user_id=ep.employer_id WHERE e.user_id IN ${DEMO_PROFILE})`);
await del("external_payments", `DELETE FROM external_payments WHERE user_id IN ${DEMO_PROFILE}`);
await del("pending_job_posts", `DELETE FROM pending_job_posts WHERE email LIKE '%ampertalent-demo.com%' OR email LIKE '%demo%'`);
await del("featured_job_requests", `DELETE FROM featured_job_requests WHERE job_id IN ${DEMO_JOBS}`);
await del("email_blast_requests", `DELETE FROM email_blast_requests WHERE job_id IN ${DEMO_JOBS}`);
await del("concierge_requests", `DELETE FROM concierge_requests WHERE employer_id IN ${DEMO_PROFILE}`);
await del("concierge_chat_messages", `DELETE FROM concierge_chat_messages WHERE chat_id IN (SELECT id FROM concierge_chats WHERE employer_id IN ${DEMO_PROFILE})`);
await del("concierge_chats", `DELETE FROM concierge_chats WHERE employer_id IN ${DEMO_PROFILE}`);
await del("seeker_concierge_chat_messages", `DELETE FROM seeker_concierge_chat_messages WHERE chat_id IN (SELECT id FROM seeker_concierge_chats WHERE seeker_id IN ${DEMO_PROFILE})`);
await del("seeker_concierge_chats", `DELETE FROM seeker_concierge_chats WHERE seeker_id IN ${DEMO_PROFILE}`);
await del("message_threads(demo)", `DELETE FROM message_threads WHERE id IN (SELECT thread_id FROM messages WHERE sender_id IN ${DEMO_PROFILE} OR recipient_id IN ${DEMO_PROFILE})`);
await del("messages", `DELETE FROM messages WHERE sender_id IN ${DEMO_PROFILE} OR recipient_id IN ${DEMO_PROFILE}`);
await del("notifications", `DELETE FROM notifications WHERE user_id IN ${DEMO_PROFILE}`);
await del("team_members", `DELETE FROM team_members WHERE employer_id IN ${DEMO_PROFILE} OR user_id IN ${DEMO_PROFILE}`);
await del("team_invitations", `DELETE FROM team_invitations WHERE employer_id IN ${DEMO_PROFILE}`);
await del("user_invitations", `DELETE FROM user_invitations WHERE invited_by IN ${DEMO_PROFILE}`);
await del("admin_actions_log", `DELETE FROM admin_actions_log WHERE admin_id IN ${DEMO_PROFILE}`);
await del("jobs", `DELETE FROM jobs WHERE employer_id IN ${DEMO_PROFILE}`);
await del("job_seekers", `DELETE FROM job_seekers WHERE user_id IN ${DEMO_PROFILE}`);
await del("employers", `DELETE FROM employers WHERE user_id IN ${DEMO_PROFILE}`);
await del("user_profiles", `DELETE FROM user_profiles WHERE name LIKE 'demo%' OR email LIKE '%ampertalent-demo.com%'`);

console.log("--- verify remaining ---");
for (const t of ["applications", "saved_jobs", "resumes", "subscriptions", "external_payments", "jobs"]) {
  const scope = t === "jobs" ? `employer_id IN (SELECT id FROM user_profiles WHERE name LIKE 'demo%' OR email LIKE '%ampertalent-demo.com%')`
    : t === "external_payments" ? `user_id IN (SELECT id FROM user_profiles WHERE name LIKE 'demo%' OR email LIKE '%ampertalent-demo.com%')`
    : `seeker_id IN (SELECT id FROM user_profiles WHERE name LIKE 'demo%' OR email LIKE '%ampertalent-demo.com%')`;
  const c = await pool.query(`SELECT COUNT(*) n FROM ${t} WHERE ${scope}`).catch(() => ({ rows: [{ n: "?" }] }));
  console.log(`remaining ${t}: ${c.rows[0].n}`);
}
const p = await pool.query(`SELECT COUNT(*) n FROM user_profiles WHERE name LIKE 'demo%' OR email LIKE '%ampertalent-demo.com%'`);
console.log(`remaining user_profiles: ${p.rows[0].n}`);
await pool.end();

console.log("--- Clerk cleanup ---");
const SECRET = env.CLERK_SECRET_KEY;
let deleted = 0, kept = 0, cursor = null;
for (;;) {
  const url = new URL("https://api.clerk.com/v1/users");
  url.searchParams.set("limit", "100");
  if (cursor) url.searchParams.set("paginated", "true"), url.searchParams.set("cursor", cursor);
  const list = await (await fetch(url, { headers: { Authorization: `Bearer ${SECRET}` } })).json();
  const users = list.data ?? list ?? [];
  if (!users.length) break;
  for (const u of users) {
    const email = u.email_addresses?.[0]?.email_address ?? "";
    if (email.includes("ampertalent-demo.com")) {
      const d = await fetch(`https://api.clerk.com/v1/users/${u.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${SECRET}` },
      });
      if (d.ok) deleted++;
      else console.log("clerk delete failed", email, d.status);
    } else kept++;
  }
  cursor = list.next_cursor ?? null;
  if (!cursor) break;
}
console.log(`clerk deleted: ${deleted}, kept: ${kept}`);
