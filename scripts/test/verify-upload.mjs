// Verify resume upload + application submit headlessly (fresh account).
import { chromium } from "playwright";
const BASE = process.env.BASE || "https://ampertalent.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });

const acc = await (await fetch(`${BASE}/api/demo/create`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "seeker" }),
})).json();
console.log("ACC", acc.profileId, acc.email);
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!window.Clerk?.client?.signIn, { timeout: 30000 });
await page.evaluate(async (t) => {
  const clerk = window.Clerk;
  const s = await clerk.client.signIn.create({ strategy: "ticket", ticket: t });
  await clerk.setActive({ session: s.createdSessionId });
}, acc.signInToken);
const api = (m, p, b) => page.evaluate(async ({ m, p, b }) => {
  const r = await fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status };
}, { m, p, b });
await api("POST", "/api/demo/seed", { role: "seeker", profileId: acc.profileId });
await api("POST", "/api/demo/activate-subscription", {});
await api("POST", "/api/onboarding/complete",
  { role: "seeker", firstName: "Demo", lastName: "Seeker", location: "Remote (US)", experience: "5", skills: ["JavaScript"], goals: "g", professionalSummary: "s" });

const sr = await page.evaluate(async () => (await (await fetch("/api/jobs/search?limit=20")).json()));
const applied = await page.evaluate(async () => (await (await fetch("/api/seeker/applications")).json()));
const appliedIds = new Set(((applied.applications || applied.data || [])).map((a) => a.jobId || a.job?.id).filter(Boolean));
const fresh = (sr.jobs || []).find((j) => !appliedIds.has(j.id));
console.log("FRESH:", fresh?.id, fresh?.title);
await page.goto(`${BASE}/seeker/jobs/${fresh.id}`, { waitUntil: "domcontentloaded" });
await sleep(6000);
await page.locator('button:visible:has-text("Apply Now")').first().click();
await sleep(4000);
await page.locator('input[type="file"]').first().setInputFiles("/tmp/demo-resume.pdf");
await sleep(12000);
let tail = await page.evaluate(() => document.body.innerText.slice(-700).replace(/\n+/g, " | "));
console.log("AFTER UPLOAD:", tail.slice(0, 450));
// fill cover letter + submit
const cl = page.locator("textarea").first();
if (await cl.count()) await cl.fill("Dear hiring team, I am excited to apply. ".repeat(8));
await sleep(1000);
const submit = page.locator('button:visible:has-text("Submit Application")').first();
console.log("submit btn:", await submit.count(), "enabled:", await submit.isEnabled().catch(() => "?"));
if (await submit.count()) {
  await submit.click();
  await sleep(8000);
  tail = await page.evaluate(() => document.body.innerText.slice(-500).replace(/\n+/g, " | "));
  console.log("AFTER SUBMIT:", tail.slice(0, 400));
  console.log("URL:", page.url());
}
await browser.close();
