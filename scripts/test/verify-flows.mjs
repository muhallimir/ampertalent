// Verify risky flows headlessly before recording. Prints account emails for cleanup.
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.env.BASE || "https://ampertalent.vercel.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const accounts = [];

async function setup(role) {
  const acc = await (await fetch(`${BASE}/api/demo/create`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }),
  })).json();
  accounts.push(acc);
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
    return { status: r.status, body: (await r.text()).slice(0, 200) };
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

// V1 seeker: jobs list loads? job detail? save? apply form structure?
{
  const { ctx, page } = await setup("seeker");
  await page.goto(`${BASE}/seeker/jobs`, { waitUntil: "domcontentloaded" });
  await sleep(15000);
  const cards = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const all = [...document.body.innerText].length;
    const jobish = [...document.querySelectorAll("[class*='card'],[class*='Card']")].filter(vis).length;
    return { bodyLen: all, cardish: jobish, text: document.body.innerText.slice(0, 400).replace(/\n+/g, " | ") };
  });
  console.log("V1 jobs list:", JSON.stringify(cards));
  const searchRes = await page.evaluate(async () => {
    const r = await fetch("/api/jobs/search?limit=5");
    const j = await r.json();
    return { status: r.status, keys: Object.keys(j), sample: JSON.stringify(j).slice(0, 400) };
  });
  console.log("V1 search api:", JSON.stringify(searchRes));
  await ctx.close();
}

// V2 employer: minimal Save Draft
{
  const { ctx, page } = await setup("employer");
  await page.goto(`${BASE}/employer/jobs/new`, { waitUntil: "domcontentloaded" });
  await sleep(5000);
  // fill title + description only, then Save Draft
  const title = page.locator('input[name="title"]').first();
  if (await title.count()) {
    await title.fill(`Demo Video Draft ${Date.now()}`);
    const desc = page.locator('textarea').first();
    await desc.fill("Exciting remote role for the demo video. ".repeat(10));
    const draft = page.locator('button:visible:has-text("Save Draft")').first();
    console.log("V2 draft btn:", await draft.count());
    if (await draft.count()) {
      await draft.click();
      await sleep(6000);
      console.log("V2 after draft URL:", page.url());
      const toast = await page.evaluate(() => document.body.innerText.slice(0, 500).replace(/\n+/g, " | "));
      console.log("V2 page text:", toast.slice(0, 300));
    }
  } else console.log("V2: no title input");
  await ctx.close();
}

// V3 admin + employer billing/concierge content
{
  const { ctx, page } = await setup("admin");
  for (const p of ["/admin/billing-requests", "/admin/subscription-management", "/admin/concierge", "/admin/featured-jobs", "/admin/crm-sync", "/admin/users", "/admin/seekers", "/admin/employers"]) {
    await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await sleep(5000);
    const h = await page.evaluate(() => [...document.querySelectorAll("h1")].map((e) => e.innerText.slice(0, 70)));
    console.log("V3", p, "->", page.url(), "H1:", JSON.stringify(h));
  }
  await ctx.close();
}
{
  const { ctx, page } = await setup("employer");
  for (const p of ["/employer/billing", "/employer/concierge", "/employer/company-profile", "/employer/messages", "/employer/settings"]) {
    await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await sleep(5000);
    const h = await page.evaluate(() => [...document.querySelectorAll("h1")].map((e) => e.innerText.slice(0, 70)));
    console.log("V3", p, "->", page.url(), "H1:", JSON.stringify(h));
  }
  await ctx.close();
}
{
  const { ctx, page } = await setup("seeker");
  for (const p of ["/seeker/saved-jobs", "/seeker/resume-critique", "/seeker/billing", "/seeker/concierge-chat", "/seeker/notifications", "/seeker/profile"]) {
    await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await sleep(5000);
    const h = await page.evaluate(() => [...document.querySelectorAll("h1")].map((e) => e.innerText.slice(0, 70)));
    console.log("V3", p, "->", page.url(), "H1:", JSON.stringify(h));
  }
  await ctx.close();
}
fs.writeFileSync("/tmp/verify-accounts.json", JSON.stringify(accounts.map((a) => ({ role: a.role, email: a.email, profileId: a.profileId })), null, 2));
console.log("ACCOUNTS SAVED", accounts.length);
await browser.close();
