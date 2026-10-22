// Final verification: seeker apply with resume upload; slow pages; admin platform pages.
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.env.BASE || "https://ampertalent.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });

async function setup(role) {
  const acc = await (await fetch(`${BASE}/api/demo/create`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }),
  })).json();
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
  if (role !== "admin") {
    await api("POST", "/api/demo/seed", { role, profileId: acc.profileId });
    if (role === "seeker") await api("POST", "/api/demo/activate-subscription", {});
    await api("POST", "/api/onboarding/complete", role === "seeker"
      ? { role, firstName: "Demo", lastName: "Seeker", location: "Remote (US)", experience: "5", skills: ["JavaScript"], goals: "g", professionalSummary: "s" }
      : { role, firstName: "Demo", lastName: "Employer", location: "Austin, TX", companyName: "Demo Co." });
  }
  return { ctx, page, acc };
}

// APPLY: find a job without application, open detail, save, apply incl. resume upload
{
  const { ctx, page, acc } = await setup("seeker");
  console.log("SEEKER2", acc.profileId, acc.email);
  const jobs = await page.evaluate(async () => {
    const r = await fetch("/api/jobs/featured?limit=5");
    const j = await r.json();
    return { status: r.status, n: (j.jobs || j.data || []).length, sample: JSON.stringify(j).slice(0, 500) };
  });
  console.log("FEATURED:", JSON.stringify(jobs));
  // pick first featured job id
  const jobId = await page.evaluate(async () => {
    const r = await fetch("/api/jobs/featured?limit=5");
    const j = await r.json();
    const list = j.jobs || j.data || [];
    return list.length ? (list[0].id || list[0].jobId) : null;
  });
  console.log("JOBID:", jobId);
  if (jobId) {
    await page.goto(`${BASE}/seeker/jobs/${jobId}`, { waitUntil: "domcontentloaded" });
    await sleep(6000);
    const st = await page.evaluate(() => document.body.innerText.slice(0, 600).replace(/\n+/g, " | "));
    console.log("DETAIL:", st.slice(0, 400));
    const applyBtn = page.locator('button:visible:has-text("Apply Now")').first();
    console.log("apply btn:", await applyBtn.count());
    if (await applyBtn.count()) {
      await applyBtn.click();
      await sleep(4000);
      const form = await page.evaluate(() => document.body.innerText.slice(-1500).replace(/\n+/g, " | "));
      console.log("FORM:", form.slice(0, 800));
      const fileInputs = await page.locator('input[type="file"]').count();
      console.log("file inputs:", fileInputs);
    }
    const saveBtn = page.locator('button:visible:has-text("Save Job")').first();
    console.log("save btn:", await saveBtn.count());
  }
  await ctx.close();
}

// slow pages with long wait
{
  const { ctx, page } = await setup("employer");
  await page.goto(`${BASE}/employer/billing`, { waitUntil: "domcontentloaded" });
  await sleep(15000);
  const h = await page.evaluate(() => ({ h1: [...document.querySelectorAll("h1")].map((e) => e.innerText.slice(0, 60)), len: document.body.innerText.length }));
  console.log("EMP BILLING:", JSON.stringify(h), "url:", page.url());
  await ctx.close();
}
{
  const { ctx, page } = await setup("seeker");
  await page.goto(`${BASE}/seeker/subscription`, { waitUntil: "domcontentloaded" });
  await sleep(15000);
  const h = await page.evaluate(() => ({ h1: [...document.querySelectorAll("h1")].map((e) => e.innerText.slice(0, 60)), len: document.body.innerText.length }));
  console.log("SEEKER SUB:", JSON.stringify(h), "url:", page.url());
  await ctx.close();
}
{
  const { ctx, page } = await setup("admin");
  for (const p of ["/admin/webhooks", "/admin/storage", "/admin/settings", "/admin/solo-email-blasts", "/admin/logs", "/admin/crm-sync"]) {
    await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await sleep(8000);
    const h = await page.evaluate(() => [...document.querySelectorAll("h1")].map((e) => e.innerText.slice(0, 60)));
    console.log("ADMIN", p, "->", page.url(), JSON.stringify(h));
  }
  await ctx.close();
}
await browser.close();
