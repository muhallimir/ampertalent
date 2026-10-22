// Verify apply flow: search, fresh job, save, apply with resume upload + submit.
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
  return { status: r.status, body: (await r.text()).slice(0, 300) };
}, { m, p, b });
console.log("seed", JSON.stringify(await api("POST", "/api/demo/seed", { role: "seeker", profileId: acc.profileId })));
console.log("sub", JSON.stringify(await api("POST", "/api/demo/activate-subscription", {})));
console.log("onboard", JSON.stringify(await api("POST", "/api/onboarding/complete",
  { role: "seeker", firstName: "Demo", lastName: "Seeker", location: "Remote (US)", experience: "5", skills: ["JavaScript"], goals: "g", professionalSummary: "s" })));

const sr = await page.evaluate(async () => {
  const r = await fetch("/api/jobs/search?limit=20");
  return await r.json();
});
console.log("SEARCH total:", sr.totalCount, "jobs:", (sr.jobs || []).length);
const applied = await page.evaluate(async () => {
  const r = await fetch("/api/seeker/applications");
  const j = await r.json();
  return j;
});
const appliedIds = new Set((applied.applications || applied.data || applied || []).map((a) => a.jobId || a.job?.id).filter(Boolean));
console.log("applied job ids:", appliedIds.size);
const fresh = (sr.jobs || []).find((j) => !appliedIds.has(j.id));
console.log("FRESH:", fresh ? fresh.id + " " + fresh.title : "NONE");
if (fresh) {
  await page.goto(`${BASE}/seeker/jobs/${fresh.id}`, { waitUntil: "domcontentloaded" });
  await sleep(6000);
  const saveBtn = page.locator('button:visible:has-text("Save Job")').first();
  console.log("save btn:", await saveBtn.count());
  if (await saveBtn.count()) { await saveBtn.click(); await sleep(2500); }
  const applyBtn = page.locator('button:visible:has-text("Apply Now")').first();
  console.log("apply btn:", await applyBtn.count());
  if (await applyBtn.count()) {
    await applyBtn.click();
    await sleep(5000);
    const info = await page.evaluate(() => ({
      files: [...document.querySelectorAll('input[type="file"]')].map((e) => e.name || e.accept || "?"),
      text: document.body.innerText.slice(-2000).replace(/\n+/g, " | ").slice(0, 900),
    }));
    console.log("file inputs:", JSON.stringify(info.files));
    console.log("FORM TAIL:", info.text);
  }
}
await browser.close();
