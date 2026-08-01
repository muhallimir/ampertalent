/**
 * Rich Demo Data Seeder
 *
 * Single-shot script that populates the live database with realistic, end-to-end
 * demo data so a prospective client (or any visitor clicking "Try as Admin /
 * Super Admin") sees a populated dashboard on first paint.
 *
 *   10 employers  → 30 approved jobs (3 per employer) across 19 categories
 *                  → each employer has a paid EmployerPackage + paid Invoice
 *                  + Employer row + currentPackageId pointing at the package
 *   20 seekers    → 1 paid Subscription per seeker (trial/gold/vip/annual)
 *                  + paid ExternalPayment row + JobSeeker row with plan,
 *                  resume credits, and expiry
 *                  → 3-5 Applications each against the 10 employers' jobs,
 *                  with a realistic mix of statuses (pending, reviewed,
 *                  interview, rejected, hired) and InterviewHistory where
 *                  appropriate
 *
 * Idempotent: every profile name starts with `demo-rich-` so the script can
 * be re-run safely. On re-run, existing `demo-rich-*` rows are deleted in
 * cascade order (the partial unique-ish safeguard is the name prefix) before
 * the new batch is inserted.
 *
 * Visibility in dashboards:
 *   - /api/admin/dashboard/stats  → users.byRole.{employer,seeker}, jobs.*,
 *                                  applications.*, recentPendingJobs
 *   - /api/admin/payments         → all Invoices (paid) + ExternalPayments
 *   - /api/admin/jobs             → approved jobs visible
 *   - seekers/[id]                → subscription, applications, payments
 *   - employers/[id]              → packages, current package, jobs
 *
 * Run with:
 *   node --experimental-strip-types scripts/seed-rich-demo-data.ts \
 *     -- --dotenv .env.local
 *
 * Connects via DATABASE_URL (Supabase pooler :6543) — works without
 * DIRECT_URL because all writes are plain DML.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as loadDotenv } from 'dotenv'

import { PrismaClient, Prisma } from '@prisma/client'

const DEMO_PREFIX = 'demo-rich-'
const RUN_TS = Date.now()

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Refusing to run in production. This script is for staging/demo data.')
  process.exit(1)
}

const dotenvPath = process.argv.find((a) => a === '--dotenv') ? process.argv[process.argv.indexOf('--dotenv') + 1] : '.env.local'
if (dotenvPath && existsSync(resolve(dotenvPath))) {
  loadDotenv({ path: resolve(dotenvPath) })
  console.log(`📦 Loaded env from ${dotenvPath}`)
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Run via `npm run seed:rich-demo` or pass --dotenv .env.local')
  process.exit(1)
}

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
})

/* -------------------------------------------------------------------------- */
/* Realistic test data                                                         */
/* -------------------------------------------------------------------------- */

interface CompanyTemplate {
  companyName: string
  domain: string
  industry: string
  companySize: string
  description: string
  mission: string
  values: string
  website: string
  billingAddress: string
  taxId: string
  logoSeed: string
}

const COMPANIES: CompanyTemplate[] = [
  {
    companyName: 'Lattice & Ledger',
    domain: 'latticeledger.com',
    industry: 'Accounting & Bookkeeping',
    companySize: '11-50',
    description: 'Cloud-based bookkeeping and fractional CFO services for early-stage SaaS startups. We pair modern fintech rails with white-glove human support.',
    mission: 'Give every founder a CFO-level financial picture without hiring one.',
    values: 'Accuracy, transparency, founder empathy',
    website: 'https://latticeledger.com',
    billingAddress: '500 W 2nd St, Suite 1200, Austin, TX 78701',
    taxId: 'EIN-47-1029384',
    logoSeed: 'll',
  },
  {
    companyName: 'Northwind Health Cloud',
    domain: 'northwindhealth.io',
    industry: 'Healthcare SaaS',
    companySize: '51-200',
    description: 'HIPAA-compliant scheduling, billing, and outcomes platform for multi-site specialty clinics.',
    mission: 'Free clinicians from admin so they can focus on patients.',
    values: 'Patient first, clinical rigor, privacy by design',
    website: 'https://northwindhealth.io',
    billingAddress: '200 Boylston St, Floor 4, Boston, MA 02116',
    taxId: 'EIN-82-5544332',
    logoSeed: 'nh',
  },
  {
    companyName: 'Roost Marketplace',
    domain: 'roostmarket.com',
    industry: 'E-commerce',
    companySize: '11-50',
    description: 'Two-sided marketplace for vintage and sustainable home goods, with concierge logistics for high-value sellers.',
    mission: 'Make circular shopping feel premium.',
    values: 'Quality, sustainability, trust',
    website: 'https://roostmarket.com',
    billingAddress: '1010 Wilshire Blvd, Los Angeles, CA 90017',
    taxId: 'EIN-95-7788991',
    logoSeed: 'rm',
  },
  {
    companyName: 'Brightline Media Collective',
    domain: 'brightlinemc.co',
    industry: 'Marketing & PR',
    companySize: '1-10',
    description: 'Boutique performance-marketing agency for B2B SaaS, running paid + lifecycle + content under one P&L.',
    mission: 'Make paid acquisition feel like product work.',
    values: 'Curiosity, candor, compounding',
    website: 'https://brightlinemc.co',
    billingAddress: '85 Broad St, 17th Floor, New York, NY 10004',
    taxId: 'EIN-13-4422119',
    logoSeed: 'bm',
  },
  {
    companyName: 'Scrollpath Learning',
    domain: 'scrollpath.edu',
    industry: 'EdTech',
    companySize: '11-50',
    description: 'Adaptive micro-learning platform that turns compliance and onboarding training into measurable behavior change.',
    mission: 'Replace forgettable training with skills that actually stick.',
    values: 'Learning science, learner respect, measurable outcomes',
    website: 'https://scrollpath.edu',
    billingAddress: '414 Brannan St, San Francisco, CA 94107',
    taxId: 'EIN-46-2233441',
    logoSeed: 'sl',
  },
  {
    companyName: 'Ironclad Security',
    domain: 'ironcladsec.com',
    industry: 'Cybersecurity',
    companySize: '51-200',
    description: 'Managed detection & response for mid-market companies. We deploy in days, not months, and we don\'t disappear after the sale.',
    mission: 'Enterprise-grade security without enterprise bureaucracy.',
    values: 'Trust, transparency, speed',
    website: 'https://ironcladsec.com',
    billingAddress: '1100 Olive Way, Suite 800, Seattle, WA 98101',
    taxId: 'EIN-91-1100223',
    logoSeed: 'is',
  },
  {
    companyName: 'Blockview Realty',
    domain: 'blockviewrealty.com',
    industry: 'Real Estate Tech',
    companySize: '11-50',
    description: 'AI-assisted underwriting and listing intelligence for residential brokerages and iBuyers.',
    mission: 'Turn every agent into a power analyst.',
    values: 'Accuracy, fairness, agent empowerment',
    website: 'https://blockviewrealty.com',
    billingAddress: '1000 Brickell Ave, Suite 200, Miami, FL 33131',
    taxId: 'EIN-65-9988776',
    logoSeed: 'br',
  },
  {
    companyName: 'Northgate People Partners',
    domain: 'northgatepp.com',
    industry: 'HR Consulting',
    companySize: '1-10',
    description: 'Fractional People Ops and HR-compliance retainer for distributed teams between 20-200 employees.',
    mission: 'Great people strategy shouldn\'t require a full HR department.',
    values: 'Empathy, rigor, plain English',
    website: 'https://northgatepp.com',
    billingAddress: '401 Congress Ave, Suite 1540, Austin, TX 78701',
    taxId: 'EIN-74-5566778',
    logoSeed: 'ng',
  },
  {
    companyName: 'Marquee Lane Studio',
    domain: 'marqueelane.tv',
    industry: 'Digital Media',
    companySize: '1-10',
    description: 'Long-form video production company that turns technical founders into category-defining thought leaders on YouTube.',
    mission: 'Make B2B storytelling feel like prestige TV.',
    values: 'Craft, patience, authenticity',
    website: 'https://marqueelane.tv',
    billingAddress: '120 N Robertson Blvd, Los Angeles, CA 90048',
    taxId: 'EIN-95-3344552',
    logoSeed: 'ml',
  },
  {
    companyName: 'Parchment Legal Tech',
    domain: 'parchment.law',
    industry: 'Legal Tech',
    companySize: '11-50',
    description: 'AI-assisted contract review and matter management for boutique law firms and in-house counsel teams.',
    mission: 'Give every lawyer a senior associate\'s leverage.',
    values: 'Privilege, precision, practicality',
    website: 'https://parchment.law',
    billingAddress: '1290 Avenue of the Americas, New York, NY 10104',
    taxId: 'EIN-13-7788665',
    logoSeed: 'pl',
  },
]

interface JobTemplate {
  title: string
  description: string
  category: any
  type: any
  payRangeText: string
  payRangeMin: number
  payRangeMax: number
  hoursPerWeek: number | null
  isFlexibleHours: boolean
  locationText: string
  remoteSchedule: string
  benefits: string
  experienceLevel: string
  requirements: string
  skills: string[]
}

function jobsForCompany(company: CompanyTemplate): JobTemplate[] {
  const baseSkills = ['Remote collaboration', 'Async written communication', 'Self-direction']
  const common = {
    skillsRequired: baseSkills,
    isFlexibleHours: true,
    hoursPerWeek: 40,
    remoteSchedule: 'Fully remote, overlap 10am-2pm CT',
    benefits: 'Health/dental/vision, 401(k) match, unlimited PTO, $1,500/yr learning stipend',
    experienceLevel: 'mid',
  }
  switch (company.domain) {
    case 'latticeledger.com':
      return [
        {
          ...common,
          title: 'Senior Bookkeeper (SaaS clients)',
          description: 'Own monthly close for a portfolio of 10-15 venture-backed SaaS clients. Reconcile across Stripe, Mercury, QBO, and Ramp; partner with our fractional CFOs on flux analysis and board deliverables.',
          category: 'ACCOUNTING_BOOKKEEPING',
          type: 'FULL_TIME',
          payRangeText: '$70k - $90k',
          payRangeMin: 70000, payRangeMax: 90000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '5+ years bookkeeping, QuickBooks Online expert, comfortable in modern fintech stacks.',
          skillsRequired: ['QuickBooks Online', 'Bank reconciliation', 'Stripe/Ramp', 'GAAP', 'Excel/Google Sheets', ...baseSkills],
        },
        {
          ...common,
          title: 'Client Success Manager',
          description: 'Be the trusted advisor for our founder clients. Translate finance-speak into action items, run quarterly reviews, and surface upsell opportunities into our CFO service.',
          category: 'CUSTOMER_SERVICE',
          type: 'FULL_TIME',
          payRangeText: '$65k - $85k',
          payRangeMin: 65000, payRangeMax: 85000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '3+ years in client-facing role at SaaS or agency, exceptional written communication.',
          skillsRequired: ['Client management', 'Written communication', 'SaaS metrics', 'Notion', ...baseSkills],
        },
        {
          ...common,
          title: 'Fractional CFO (Part-Time)',
          description: 'Lead fractional CFO engagements for 4-6 venture-backed clients. Own board-ready financials, fundraising support, and KPI dashboards.',
          category: 'FINANCE',
          type: 'PART_TIME',
          payRangeText: '$150k - $200k (PT, ~25 hrs/wk)',
          payRangeMin: 150000, payRangeMax: 200000,
          locationText: 'Remote (US)',
          hoursPerWeek: 25,
          isFlexibleHours: true,
          requirements: '8+ years finance experience including CFO/VP Finance at a venture-backed company.',
          skillsRequired: ['Strategic finance', 'Board reporting', 'Fundraising narratives', 'SaaS metrics', ...baseSkills],
        },
      ]
    case 'northwindhealth.io':
      return [
        {
          ...common,
          title: 'Senior Full-Stack Engineer (HIPAA)',
          description: 'Ship product features end-to-end in our Next.js + Postgres + tRPC stack. You\'ll work on clinician-facing scheduling, billing, and patient comms — all HIPAA-compliant.',
          category: 'PROGRAMMER',
          type: 'FULL_TIME',
          payRangeText: '$140k - $180k',
          payRangeMin: 140000, payRangeMax: 180000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '5+ years TS/React/Node, production experience with HIPAA or SOC2 systems.',
          skillsRequired: ['TypeScript', 'React', 'Next.js', 'PostgreSQL', 'tRPC', 'HIPAA', ...baseSkills],
        },
        {
          ...common,
          title: 'Product Designer (Clinician Tools)',
          description: 'Design workflows for nurses, MAs, and front-desk staff at high-volume specialty clinics. Research-driven, accessibility-first.',
          category: 'DESIGN',
          type: 'FULL_TIME',
          payRangeText: '$120k - $155k',
          payRangeMin: 120000, payRangeMax: 155000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '4+ years product design, portfolio with complex internal tools or EHR/health workflows.',
          skillsRequired: ['Figma', 'User research', 'Accessibility (WCAG 2.1 AA)', 'Design systems', ...baseSkills],
        },
        {
          ...common,
          title: 'Healthcare Data Analyst',
          description: 'Build reporting and outcome dashboards for clinic partners. Partner with clinical leadership to define the metrics that actually matter.',
          category: 'CONSULTANT',
          type: 'FULL_TIME',
          payRangeText: '$95k - $125k',
          payRangeMin: 95000, payRangeMax: 125000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '3+ years analytics, SQL expert, healthcare data experience preferred.',
          skillsRequired: ['SQL', 'dbt', 'Looker or Metabase', 'Healthcare claim data', 'Python', ...baseSkills],
        },
      ]
    case 'roostmarket.com':
      return [
        {
          ...common,
          title: 'Senior Marketplace Engineer',
          description: 'Own the buyer and seller experience in our Rails + React marketplace. Search relevance, checkout, seller payouts, and the concierge logistics flow.',
          category: 'WEB_DESIGN_DEVELOPMENT',
          type: 'FULL_TIME',
          payRangeText: '$140k - $175k',
          payRangeMin: 140000, payRangeMax: 175000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '5+ years Ruby/Rails OR TS/React with strong API design chops.',
          skillsRequired: ['Ruby on Rails', 'React', 'PostgreSQL', 'Stripe Connect', 'Algolia', ...baseSkills],
        },
        {
          ...common,
          title: 'Logistics Operations Specialist',
          description: 'Run the concierge logistics that makes our high-value sellers feel first-class. Coordinate white-glove pickups, audit damage claims, and own SLA.',
          category: 'ADMINISTRATION_VIRTUAL_ASSISTANT',
          type: 'FULL_TIME',
          payRangeText: '$55k - $70k',
          payRangeMin: 55000, payRangeMax: 70000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '3+ years operations or customer service, comfortable owning outcomes.',
          skillsRequired: ['Operations', 'Customer communication', 'Notion', 'Looker', ...baseSkills],
        },
        {
          ...common,
          title: 'Growth Marketing Manager',
          description: 'Own paid acquisition across Meta, Google, and Pinterest. Build the lifecycle and retention programs that turn seasonal buyers into year-one LTV.',
          category: 'MARKETING_PUBLIC_RELATIONS',
          type: 'FULL_TIME',
          payRangeText: '$90k - $120k',
          payRangeMin: 90000, payRangeMax: 120000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '4+ years performance marketing, marketplace or DTC experience.',
          skillsRequired: ['Meta Ads', 'Google Ads', 'Klaviyo', 'Attribution', 'Creative testing', ...baseSkills],
        },
      ]
    case 'brightlinemc.co':
      return [
        {
          ...common,
          title: 'Senior Paid Media Strategist',
          description: 'Run paid acquisition for 6-8 B2B SaaS clients. Plan, execute, and report across paid search, paid social, and retargeting — own a real P&L.',
          category: 'INTERNET_MARKETING_SPECIALIST',
          type: 'FULL_TIME',
          payRangeText: '$95k - $130k',
          payRangeMin: 95000, payRangeMax: 130000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '4+ years paid media, B2B SaaS experience required.',
          skillsRequired: ['Google Ads', 'LinkedIn Ads', 'Reporting', 'B2B SaaS metrics', ...baseSkills],
        },
        {
          ...common,
          title: 'Content Strategist (B2B SaaS)',
          description: 'Build content engines for our clients — long-form SEO, sales enablement, customer stories. Strong opinions on distribution, not just creation.',
          category: 'WRITING_EDITING',
          type: 'FULL_TIME',
          payRangeText: '$80k - $110k',
          payRangeMin: 80000, payRangeMax: 110000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '4+ years B2B content, portfolio of long-form SEO and customer stories.',
          skillsRequired: ['Long-form writing', 'SEO', 'Customer interviews', 'CMS', ...baseSkills],
        },
        {
          ...common,
          title: 'Account Director',
          description: 'Own 4-6 mid-market client relationships end-to-end. Lead QBRs, scope upsells, and manage a small pod of strategists.',
          category: 'MANAGER',
          type: 'FULL_TIME',
          payRangeText: '$110k - $140k',
          payRangeMin: 110000, payRangeMax: 140000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '6+ years agency or B2B SaaS account leadership.',
          skillsRequired: ['Client management', 'QBRs', 'Upsell', 'Forecasting', ...baseSkills],
        },
      ]
    case 'scrollpath.edu':
      return [
        {
          ...common,
          title: 'Senior Frontend Engineer',
          description: 'Ship the learner experience in our React Native + Next.js stack. Build the adaptive-learning loops that actually drive completion.',
          category: 'PROGRAMMER',
          type: 'FULL_TIME',
          payRangeText: '$130k - $165k',
          payRangeMin: 130000, payRangeMax: 165000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '4+ years frontend, React Native and Next.js experience required.',
          skillsRequired: ['React', 'Next.js', 'React Native', 'TypeScript', 'Design systems', ...baseSkills],
        },
        {
          ...common,
          title: 'Learning Designer',
          description: 'Author adaptive learning paths for compliance and onboarding. Partner with SMEs to translate procedures into measurable skill outcomes.',
          category: 'WRITING_EDITING',
          type: 'FULL_TIME',
          payRangeText: '$75k - $95k',
          payRangeMin: 75000, payRangeMax: 95000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '4+ years instructional design, ideally with healthcare or compliance programs.',
          skillsRequired: ['Instructional design', 'Adult learning theory', 'Authoring tools (Articulate, Storyline)', ...baseSkills],
        },
        {
          ...common,
          title: 'Sales Development Representative',
          description: 'Outbound into HR and L&D leaders. Heavy use of LinkedIn + email; we don\'t gatekeep on previous SDR experience.',
          category: 'SALES',
          type: 'FULL_TIME',
          payRangeText: '$55k base + $30k OTE',
          payRangeMin: 55000, payRangeMax: 85000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '1+ years outbound, hunger matters most.',
          skillsRequired: ['Outbound prospecting', 'LinkedIn Sales Navigator', 'Cold email', 'CRM hygiene', ...baseSkills],
        },
      ]
    case 'ironcladsec.com':
      return [
        {
          ...common,
          title: 'Senior Detection Engineer',
          description: 'Author detections across our MDR customers\' SIEMs. Triage escalations, hunt threats, and write the runbooks our 24/7 SOC follows.',
          category: 'COMPUTER_IT',
          type: 'FULL_TIME',
          payRangeText: '$150k - $190k',
          payRangeMin: 150000, payRangeMax: 190000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '5+ years detection engineering, Sentinel and/or Splunk expertise.',
          skillsRequired: ['Sentinel', 'Splunk', 'KQL', 'YARA', 'MITRE ATT&CK', ...baseSkills],
        },
        {
          ...common,
          title: 'MDR SOC Analyst (Tier 2)',
          description: 'Triage alerts from customer SIEMs, drive incidents to closure, and partner with customer IT teams on remediation.',
          category: 'COMPUTER_IT',
          type: 'FULL_TIME',
          payRangeText: '$95k - $125k',
          payRangeMin: 95000, payRangeMax: 125000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '3+ years SOC analyst experience, GCIA or equivalent preferred.',
          skillsRequired: ['Incident response', 'SIEM triage', 'Windows + Linux', 'Network forensics', ...baseSkills],
        },
        {
          ...common,
          title: 'Sales Engineer',
          description: 'Partner with AEs on technical evaluations. Demo the platform, design PoCs, and translate customer architectures into scoped deployments.',
          category: 'SALES',
          type: 'FULL_TIME',
          payRangeText: '$160k - $210k OTE',
          payRangeMin: 130000, payRangeMax: 160000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '4+ years SE or security consulting experience.',
          skillsRequired: ['Pre-sales', 'Architecture diagrams', 'PoC scoping', 'Networking', ...baseSkills],
        },
      ]
    case 'blockviewrealty.com':
      return [
        {
          ...common,
          title: 'Senior Data Engineer',
          description: 'Build the data pipelines that power our underwriting and listing intelligence. Heavy Python + dbt + Snowflake.',
          category: 'DATABASE_DEVELOPMENT',
          type: 'FULL_TIME',
          payRangeText: '$140k - $175k',
          payRangeMin: 140000, payRangeMax: 175000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '4+ years data engineering, real estate or financial data preferred.',
          skillsRequired: ['Python', 'dbt', 'Snowflake', 'Airflow', 'SQL', ...baseSkills],
        },
        {
          ...common,
          title: 'ML Engineer (Real Estate)',
          description: 'Train and ship our valuation and comps models. Own the full lifecycle from data label QA to online inference.',
          category: 'PROGRAMMER',
          type: 'FULL_TIME',
          payRangeText: '$150k - $195k',
          payRangeMin: 150000, payRangeMax: 195000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '3+ years ML engineering, experience with tabular models and evaluation rigor.',
          skillsRequired: ['Python', 'PyTorch', 'scikit-learn', 'MLOps', 'SQL', ...baseSkills],
        },
        {
          ...common,
          title: 'Customer Success Manager',
          description: 'Onboard brokerages and iBuyers onto Blockview. Drive adoption through training, quarterly reviews, and structured product feedback.',
          category: 'CUSTOMER_SERVICE',
          type: 'FULL_TIME',
          payRangeText: '$80k - $105k',
          payRangeMin: 80000, payRangeMax: 105000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '3+ years CS, real estate or fintech background a plus.',
          skillsRequired: ['Onboarding', 'QBRs', 'Salesforce', 'Product feedback', ...baseSkills],
        },
      ]
    case 'northgatepp.com':
      return [
        {
          ...common,
          title: 'Fractional People Ops Lead',
          description: 'Embedded People Ops partner for 2-3 mid-sized clients. Own onboarding, performance cycles, comp planning, and compliance.',
          category: 'HUMAN_RESOURCES',
          type: 'FULL_TIME',
          payRangeText: '$110k - $140k',
          payRangeMin: 110000, payRangeMax: 140000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '8+ years People Ops, including leadership at a 50-200 person company.',
          skillsRequired: ['People Ops', 'HRIS', 'Compensation', 'Performance management', ...baseSkills],
        },
        {
          ...common,
          title: 'HR Compliance Specialist',
          description: 'Author and maintain handbooks, policies, and state-specific compliance programs for our distributed clients.',
          category: 'PARALEGAL_LEGAL',
          type: 'FULL_TIME',
          payRangeText: '$85k - $110k',
          payRangeMin: 85000, payRangeMax: 110000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '5+ years HR compliance, multi-state experience required.',
          skillsRequired: ['Multi-state compliance', 'Handbook authoring', 'HRIS configuration', ...baseSkills],
        },
        {
          ...common,
          title: 'Client Operations Coordinator',
          description: 'Run the project and intake operations behind our fractional engagements. Partner with HR leads to keep clients moving.',
          category: 'ADMINISTRATION_VIRTUAL_ASSISTANT',
          type: 'FULL_TIME',
          payRangeText: '$55k - $70k',
          payRangeMin: 55000, payRangeMax: 70000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '3+ years ops or EA experience, strong written communication.',
          skillsRequired: ['Operations', 'Notion', 'Project tracking', 'Client communication', ...baseSkills],
        },
      ]
    case 'marqueelane.tv':
      return [
        {
          ...common,
          title: 'Senior Video Editor (Long-Form)',
          description: 'Cut 30-60 minute founder interview podcasts into binge-worthy YouTube content. You obsess over pacing, B-roll, and chapter design.',
          category: 'VIDEO_PRODUCTION_EDITING',
          type: 'FULL_TIME',
          payRangeText: '$90k - $130k',
          payRangeMin: 90000, payRangeMax: 130000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '5+ years long-form editing, portfolio with founder/operator content.',
          skillsRequired: ['Premiere Pro', 'DaVinci Resolve', 'Color grading', 'B-roll sourcing', 'YouTube chapter design', ...baseSkills],
        },
        {
          ...common,
          title: 'YouTube Producer',
          description: 'Run the production calendar for 4-6 founder clients. Own scripts, guest prep, shoot, and post workflows end-to-end.',
          category: 'MEDIA_SPECIALIST',
          type: 'FULL_TIME',
          payRangeText: '$80k - $110k',
          payRangeMin: 80000, payRangeMax: 110000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '4+ years producing long-form content, B2B SaaS fluency a plus.',
          skillsRequired: ['Producing', 'Script writing', 'Guest coaching', 'Project management', ...baseSkills],
        },
        {
          ...common,
          title: 'Business Development Manager',
          description: 'Build the B2B pipeline for Marquee Lane. Outbound to founders + content-led inbound.',
          category: 'BUSINESS_DEVELOPMENT',
          type: 'FULL_TIME',
          payRangeText: '$95k - $135k OTE',
          payRangeMin: 80000, payRangeMax: 105000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '4+ years B2B sales, agency or studio experience preferred.',
          skillsRequired: ['Outbound', 'Consultative selling', 'Salesforce', 'Founder-led content', ...baseSkills],
        },
      ]
    case 'parchment.law':
      return [
        {
          ...common,
          title: 'Senior Full-Stack Engineer (Legal AI)',
          description: 'Ship product features that integrate LLMs into lawyer workflows. Heavy focus on eval, observability, and review queues.',
          category: 'PROGRAMMER',
          type: 'FULL_TIME',
          payRangeText: '$155k - $195k',
          payRangeMin: 155000, payRangeMax: 195000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '5+ years full-stack, prior experience shipping LLM features to production.',
          skillsRequired: ['TypeScript', 'Python', 'PostgreSQL', 'LLM APIs', 'Evals', ...baseSkills],
        },
        {
          ...common,
          title: 'Attorney Product Specialist',
          description: 'Embedded legal expert on the product team. Own redlines, define contract taxonomies, and review model outputs.',
          category: 'PARALEGAL_LEGAL',
          type: 'FULL_TIME',
          payRangeText: '$130k - $165k',
          payRangeMin: 130000, payRangeMax: 165000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '3+ years practicing attorney, transactional background.',
          skillsRequired: ['Contract review', 'M&A', 'Commercial agreements', 'Annotation', ...baseSkills],
        },
        {
          ...common,
          title: 'Customer Success Manager (Law Firms)',
          description: 'Onboard boutique law firms and in-house teams. Run training, gather structured feedback, and surface adoption blockers.',
          category: 'CUSTOMER_SERVICE',
          type: 'FULL_TIME',
          payRangeText: '$95k - $125k',
          payRangeMin: 95000, payRangeMax: 125000,
          locationText: 'Remote (US)',
          hoursPerWeek: 40,
          requirements: '4+ years CS in legal tech or regulated SaaS.',
          skillsRequired: ['Onboarding', 'Legal workflows', 'Salesforce', 'Product feedback', ...baseSkills],
        },
      ]
    default:
      return []
  }
}

interface SeekerTemplate {
  firstName: string
  lastName: string
  headline: string
  location: string
  timezone: string
  about: string
  skills: string[]
  experienceYears: number
  portfolioUrls: string[]
  salaryExpectations: string
  isOnTrial: boolean
  plan: 'trial_monthly' | 'gold_bimonthly' | 'vip_quarterly' | 'annual_platinum'
}

const SEEKERS: SeekerTemplate[] = [
  {
    firstName: 'Maya', lastName: 'Okafor',
    headline: 'Senior Full-Stack Engineer | React / Next.js / Postgres',
    location: 'Brooklyn, NY', timezone: 'America/New_York',
    experienceYears: 7,
    skills: ['TypeScript', 'React', 'Next.js', 'PostgreSQL', 'tRPC', 'Prisma', 'AWS'],
    about: 'Senior engineer with 7 years of experience at Series A-D startups. Most recently shipped the billing and onboarding flows at a 200-person fintech. I love work that has a clear user-facing impact and a strong engineering culture.',
    portfolioUrls: ['https://mayaokafor.dev', 'https://github.com/mokafor'],
    salaryExpectations: '$155k - $185k base',
    plan: 'vip_quarterly',
    isOnTrial: false,
  },
  {
    firstName: 'Daniel', lastName: 'Park',
    headline: 'Brand Designer → Product Designer (B2B SaaS)',
    location: 'Seoul, KR', timezone: 'Asia/Seoul',
    experienceYears: 5,
    skills: ['Figma', 'Design systems', 'User research', 'Prototyping', 'Webflow'],
    about: 'Transitioned from agency brand work into B2B SaaS product design. Strong systems thinker, comfortable with complex internal tools.',
    portfolioUrls: ['https://danielpark.design'],
    salaryExpectations: '$110k - $140k',
    plan: 'gold_bimonthly',
    isOnTrial: false,
  },
  {
    firstName: 'Priya', lastName: 'Raghunathan',
    headline: 'ML Engineer | Tabular models, recsys, evals',
    location: 'Toronto, ON', timezone: 'America/Toronto',
    experienceYears: 6,
    skills: ['Python', 'PyTorch', 'scikit-learn', 'MLflow', 'PostgreSQL', 'Snowflake'],
    about: 'Shipped recsys and pricing models at two B2C scale-ups. I care about offline/online eval rigor and clean production data.',
    portfolioUrls: ['https://priya-r.com'],
    salaryExpectations: '$160k - $195k',
    plan: 'annual_platinum',
    isOnTrial: false,
  },
  {
    firstName: 'Jordan', lastName: 'Whitfield',
    headline: 'Customer Success Manager | HealthTech & SaaS',
    location: 'Atlanta, GA', timezone: 'America/New_York',
    experienceYears: 4,
    skills: ['Onboarding', 'QBRs', 'Salesforce', 'Gainsight', 'HealthTech'],
    about: 'CSM with 4 years in regulated SaaS. I run onboarding like a product launch and treat every QBR as a roadmap conversation.',
    portfolioUrls: ['https://linkedin.com/in/jordanwhitfield'],
    salaryExpectations: '$95k - $115k',
    plan: 'gold_bimonthly',
    isOnTrial: false,
  },
  {
    firstName: 'Aisha', lastName: 'Bello',
    headline: 'Bookkeeper → Fractional Controller (SaaS)',
    location: 'Lagos, NG', timezone: 'Africa/Lagos',
    experienceYears: 8,
    skills: ['QuickBooks Online', 'Xero', 'Stripe', 'Ramp', 'GAAP', 'Multi-entity'],
    about: '8 years of bookkeeping and controllership for SaaS. I love messy multi-entity close work and clean flux narratives.',
    portfolioUrls: ['https://aishabello.co'],
    salaryExpectations: '$50 - $70 / hour (contract)',
    plan: 'vip_quarterly',
    isOnTrial: false,
  },
  {
    firstName: 'Marcus', lastName: 'Henderson',
    headline: 'Senior SOC Analyst (Tier 2/3)',
    location: 'Dallas, TX', timezone: 'America/Chicago',
    experienceYears: 6,
    skills: ['Sentinel', 'Splunk', 'KQL', 'MITRE ATT&CK', 'Incident response'],
    about: '6 years on the SOC side of MDR. GCIA, GCIH. Looking for a senior detection or response role with a strong IR culture.',
    portfolioUrls: [],
    salaryExpectations: '$130k - $160k',
    plan: 'vip_quarterly',
    isOnTrial: false,
  },
  {
    firstName: 'Sofia', lastName: 'Ramirez',
    headline: 'Content Strategist | B2B SaaS, long-form SEO',
    location: 'Mexico City, MX', timezone: 'America/Mexico_City',
    experienceYears: 5,
    skills: ['Long-form writing', 'SEO', 'Customer interviews', 'Ahrefs', 'Webflow'],
    about: 'B2B content with measurable SEO outcomes. Most recent program drove 4x organic demo requests in 9 months.',
    portfolioUrls: ['https://sofiaramirez.io'],
    salaryExpectations: '$90k - $115k',
    plan: 'gold_bimonthly',
    isOnTrial: false,
  },
  {
    firstName: 'Wei', lastName: 'Chen',
    headline: 'Data Engineer | Python, dbt, Snowflake',
    location: 'Vancouver, BC', timezone: 'America/Vancouver',
    experienceYears: 4,
    skills: ['Python', 'dbt', 'Snowflake', 'Airflow', 'GCP', 'SQL'],
    about: 'Data engineer with 4 years in fintech and real estate. I prefer clean contracts over clever code.',
    portfolioUrls: ['https://github.com/weichen-data'],
    salaryExpectations: '$130k - $155k',
    plan: 'vip_quarterly',
    isOnTrial: false,
  },
  {
    firstName: 'Olivia', lastName: 'Brennan',
    headline: 'Senior Video Editor (Long-form YouTube)',
    location: 'Los Angeles, CA', timezone: 'America/Los_Angeles',
    experienceYears: 6,
    skills: ['Premiere Pro', 'DaVinci Resolve', 'After Effects', 'B-roll', 'Color grading'],
    about: 'Cut long-form interview content for 5+ years. Strong pacing, music, and chapter design instincts.',
    portfolioUrls: ['https://oliviabrennan.tv'],
    salaryExpectations: '$95k - $125k',
    plan: 'gold_bimonthly',
    isOnTrial: false,
  },
  {
    firstName: 'Hassan', lastName: 'Mahmoud',
    headline: 'Fractional People Ops Lead',
    location: 'Cairo, EG', timezone: 'Africa/Cairo',
    experienceYears: 9,
    skills: ['People Ops', 'HRIS', 'Compensation', 'Performance management', 'Multi-state compliance'],
    about: '9 years of People Ops, including a stint as Head of People at a 180-person Series C. Now fractional for 3-4 mid-market clients.',
    portfolioUrls: ['https://hassanmahmoud.com'],
    salaryExpectations: '$120k - $150k',
    plan: 'annual_platinum',
    isOnTrial: false,
  },
  {
    firstName: 'Naomi', lastName: 'Goldberg',
    headline: 'Senior Paid Media Strategist',
    location: 'Tel Aviv, IL', timezone: 'Asia/Jerusalem',
    experienceYears: 5,
    skills: ['Google Ads', 'LinkedIn Ads', 'Attribution', 'B2B SaaS', 'Reporting'],
    about: 'Ran paid acquisition for 6 B2B SaaS clients at my previous agency. Looking for an in-house role with real P&L ownership.',
    portfolioUrls: ['https://naomigoldberg.co'],
    salaryExpectations: '$110k - $135k',
    plan: 'vip_quarterly',
    isOnTrial: false,
  },
  {
    firstName: 'Ethan', lastName: 'Vasquez',
    headline: 'Mid-market AE | Cybersecurity',
    location: 'Chicago, IL', timezone: 'America/Chicago',
    experienceYears: 4,
    skills: ['MEDDIC', 'Salesforce', 'Security buyer', 'Channel partnerships'],
    about: '4 years selling to CISOs and security leadership. Closed multiple $200k+ ARR deals at my last role.',
    portfolioUrls: [],
    salaryExpectations: '$140k base + $200k OTE',
    plan: 'gold_bimonthly',
    isOnTrial: false,
  },
  {
    firstName: 'Rina', lastName: 'Khan',
    headline: 'Full-Stack Engineer | TypeScript & Python',
    location: 'Karachi, PK', timezone: 'Asia/Karachi',
    experienceYears: 3,
    skills: ['TypeScript', 'React', 'Next.js', 'Python', 'PostgreSQL'],
    about: '3 years building B2B SaaS. Strong on the front-end, capable on the back-end. Looking for a small product team.',
    portfolioUrls: ['https://github.com/rinakhan'],
    salaryExpectations: '$70k - $95k',
    plan: 'trial_monthly',
    isOnTrial: true,
  },
  {
    firstName: 'Theo', lastName: 'Andersen',
    headline: 'Operations Coordinator | Marketplace & Logistics',
    location: 'Berlin, DE', timezone: 'Europe/Berlin',
    experienceYears: 4,
    skills: ['Operations', 'Notion', 'Looker', 'Customer communication'],
    about: 'Marketplace ops specialist. Owned white-glove logistics at a high-end vintage marketplace.',
    portfolioUrls: ['https://theoandersen.com'],
    salaryExpectations: '$55k - $72k',
    plan: 'gold_bimonthly',
    isOnTrial: false,
  },
  {
    firstName: 'Camila', lastName: 'Souza',
    headline: 'Customer Success Manager | Legal Tech',
    location: 'São Paulo, BR', timezone: 'America/Sao_Paulo',
    experienceYears: 6,
    skills: ['Onboarding', 'Legal tech', 'Salesforce', 'Product feedback'],
    about: '6 years in legal tech CS. Helped scale a boutique-CS team from 3 to 14.',
    portfolioUrls: ['https://linkedin.com/in/camilasouza'],
    salaryExpectations: '$95k - $120k',
    plan: 'vip_quarterly',
    isOnTrial: false,
  },
  {
    firstName: 'Liam', lastName: 'Foster',
    headline: 'Junior Frontend Developer → Mid-level',
    location: 'Austin, TX', timezone: 'America/Chicago',
    experienceYears: 2,
    skills: ['React', 'Next.js', 'TypeScript', 'CSS'],
    about: 'Career-switcher from teaching. 2 years of professional frontend work. Strong on accessibility and design system work.',
    portfolioUrls: ['https://liamfoster.dev'],
    salaryExpectations: '$85k - $105k',
    plan: 'trial_monthly',
    isOnTrial: true,
  },
  {
    firstName: 'Yuki', lastName: 'Tanaka',
    headline: 'Senior Designer | Design Systems Lead',
    location: 'Tokyo, JP', timezone: 'Asia/Tokyo',
    experienceYears: 8,
    skills: ['Figma', 'Design systems', 'Storybook', 'Accessibility', 'Tokens'],
    about: 'Design systems lead at two consumer products. Strong opinions on tokens, primitives, and DX.',
    portfolioUrls: ['https://yuki-tanaka.design'],
    salaryExpectations: '$130k - $160k',
    plan: 'annual_platinum',
    isOnTrial: false,
  },
  {
    firstName: 'Beatrice', lastName: 'Olawale',
    headline: 'HR Compliance Specialist',
    location: 'London, UK', timezone: 'Europe/London',
    experienceYears: 7,
    skills: ['Multi-state compliance', 'Handbook authoring', 'HRIS', 'UK & EU'],
    about: 'HR compliance specialist with UK and EU experience. Authored handbooks for 30+ distributed companies.',
    portfolioUrls: ['https://beatriceo.co.uk'],
    salaryExpectations: '$85k - $110k',
    plan: 'gold_bimonthly',
    isOnTrial: false,
  },
  {
    firstName: 'Diego', lastName: 'Mendoza',
    headline: 'Backend Engineer | Ruby on Rails',
    location: 'Buenos Aires, AR', timezone: 'America/Argentina/Buenos_Aires',
    experienceYears: 5,
    skills: ['Ruby', 'Rails', 'PostgreSQL', 'Sidekiq', 'Stripe'],
    about: '5 years of Rails in marketplaces. Strong on data modeling and background jobs.',
    portfolioUrls: ['https://github.com/dmendoza'],
    salaryExpectations: '$70k - $95k',
    plan: 'gold_bimonthly',
    isOnTrial: false,
  },
  {
    firstName: 'Zara', lastName: 'Ahmed',
    headline: 'SDR → AE | B2B SaaS',
    location: 'Dubai, AE', timezone: 'Asia/Dubai',
    experienceYears: 2,
    skills: ['Outbound', 'Cold email', 'Salesforce', 'B2B SaaS'],
    about: 'Promoted from SDR to AE in 14 months. 1.8x quota in last 2 quarters.',
    portfolioUrls: [],
    salaryExpectations: '$80k base + $110k OTE',
    plan: 'trial_monthly',
    isOnTrial: true,
  },
]

/* -------------------------------------------------------------------------- */
/* Pricing mirrors real-world package tiers                                    */
/* -------------------------------------------------------------------------- */

const PACKAGE_TIERS = [
  { pkgType: 'standard' as const, name: 'Standard Job Post', priceCents: 9700, durationDays: 30, listings: 1, featured: 0 },
  { pkgType: 'featured' as const, name: 'Featured Job Post', priceCents: 12700, durationDays: 30, listings: 1, featured: 1 },
  { pkgType: 'gold_plus' as const, name: 'Gold Plus Small Business', priceCents: 9700, durationDays: 180, listings: 1, featured: 0 },
  { pkgType: 'gold_plus_recurring_6mo' as const, name: 'Gold Plus Small Business (6-Month Recurring)', priceCents: 9700, durationDays: 180, listings: 1, featured: 0, recurring: true },
  { pkgType: 'concierge_level_1' as const, name: 'Concierge Level I', priceCents: 169500, durationDays: 30, listings: 1, featured: 0 },
  { pkgType: 'concierge_level_2' as const, name: 'Concierge Level II', priceCents: 269500, durationDays: 30, listings: 1, featured: 0 },
  { pkgType: 'concierge_level_3' as const, name: 'Concierge Level III', priceCents: 399500, durationDays: 30, listings: 1, featured: 0 },
]

const SEEKER_PLANS: Record<SeekerTemplate['plan'], { membershipPlan: any; priceCents: number; durationDays: number; resumeCredits: number; trialDays?: number }> = {
  trial_monthly: { membershipPlan: 'trial_monthly', priceCents: 3499, durationDays: 33, resumeCredits: 1, trialDays: 3 },
  gold_bimonthly: { membershipPlan: 'gold_bimonthly', priceCents: 4999, durationDays: 60, resumeCredits: 3 },
  vip_quarterly: { membershipPlan: 'vip_quarterly', priceCents: 7999, durationDays: 90, resumeCredits: 999 },
  annual_platinum: { membershipPlan: 'annual_platinum', priceCents: 29900, durationDays: 365, resumeCredits: 999 },
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000)
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]
}

function makeResume(seekerId: string, idx: number): { fileUrl: string; filename: string } {
  const slug = `${seekerId}-${idx}.pdf`
  return {
    fileUrl: `https://ampertalent-demo.com/resumes/${slug}`,
    filename: `resume-${slug}.pdf`,
  }
}

const COVER_LETTERS = [
  "Hi! I came across your role and immediately wanted to reach out. I've shipped similar work at a comparable stage and would love to dig into how your team is structured.",
  "Saw this on AmperTalent and the scope matches what I do best. My previous team went through a similar build and I'd love to share what worked (and what didn't).",
  "Quick intro: I've been doing this kind of work for the last few years and the specifics of your role stood out. Happy to walk through any relevant projects on a call.",
  "I'd love to chat about this role. I've put together a few notes on how I'd approach the first 90 days and can share on a screen.",
  "If you're open to a quick conversation, I can walk through how I'd think about the hardest part of this role — the part you can't fully capture in a posting.",
]

/* -------------------------------------------------------------------------- */
/* Cleanup of prior rich-demo runs                                             */
/* -------------------------------------------------------------------------- */

async function purgePrior() {
  console.log('🧹 Purging prior demo-rich-* rows...')
  const profiles = await db.userProfile.findMany({
    where: { name: { startsWith: DEMO_PREFIX } },
    select: { id: true, name: true },
  })
  if (profiles.length === 0) {
    console.log('  (no prior runs to cleanup)')
    return
  }
  const ids = profiles.map((p) => p.id)
  let totalKilled = 0

  // Order matters: payments + subscriptions + applications first, then jobs,
  // then packages, then role-specific tables, then user_profiles.
  // Prisma cascades cover most of this, but we delete explicitly so the
  // log is clear and idempotent re-runs are safe.
  const cleanupTasks = [
    () => db.interviewHistory.deleteMany({ where: { application: { seekerId: { in: ids } } } }),
    () => db.application.deleteMany({ where: { seekerId: { in: ids } } }),
    () => db.resume.deleteMany({ where: { seekerId: { in: ids } } }),
    () => db.subscription.deleteMany({ where: { seekerId: { in: ids } } }),
    () => db.externalPayment.deleteMany({ where: { userId: { in: ids } } }),
    () => db.jobSeeker.deleteMany({ where: { userId: { in: ids } } }),
    () => db.invoice.deleteMany({ where: { employerPackage: { employerId: { in: ids } } } }),
    () => db.employerPackage.deleteMany({ where: { employerId: { in: ids } } }),
    () => db.job.deleteMany({ where: { employerId: { in: ids } } }),
    () => db.employer.deleteMany({ where: { userId: { in: ids } } }),
    () => db.notification.deleteMany({ where: { userId: { in: ids } } }),
    () => db.adminActionLog.deleteMany({ where: { adminId: { in: ids } } }),
    () => db.userProfile.deleteMany({ where: { id: { in: ids } } }),
  ]

  for (const t of cleanupTasks) {
    try {
      const r = await t()
      totalKilled += r.count
    } catch (e: any) {
      console.warn(`  cleanup step failed: ${e.message}`)
    }
  }
  console.log(`  removed ${profiles.length} profiles and ${totalKilled} dependent rows`)
}

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log(`\n🎬 Rich Demo Data Seeder`)
  console.log(`   prefix: ${DEMO_PREFIX}`)
  console.log(`   run id: ${RUN_TS}`)
  console.log(`   target: 10 employers, 20 seekers, 30 jobs, ~70 applications\n`)

  await purgePrior()

  /* ---------------------------------------------------------------- */
  /* 1. EMPLOYERS + PACKAGES + INVOICES + JOBS                       */
  /* ---------------------------------------------------------------- */
  console.log('🏢 Creating 10 employers + paid packages + 30 jobs...')

  const employerPkgAssignments: Array<{ pkgType: typeof PACKAGE_TIERS[number]['pkgType'] }> = [
    { pkgType: 'standard' },
    { pkgType: 'featured' },
    { pkgType: 'gold_plus_recurring_6mo' },
    { pkgType: 'concierge_level_1' },
    { pkgType: 'concierge_level_3' },
    { pkgType: 'concierge_level_2' },
    { pkgType: 'featured' },
    { pkgType: 'standard' },
    { pkgType: 'gold_plus' },
    { pkgType: 'concierge_level_2' },
  ]

  const allJobs: { id: string; employerId: string; title: string; category: any; company: string }[] = []
  let employerCounter = 0

  for (const company of COMPANIES) {
    const assignment = employerPkgAssignments[employerCounter]
    const tier = PACKAGE_TIERS.find((t) => t.pkgType === assignment.pkgType)!
    const profileNumber = String(employerCounter + 1).padStart(2, '0')
    const empName = `${DEMO_PREFIX}employer-${RUN_TS}-${profileNumber}`
    const createdDaysAgo = 12 + employerCounter * 3

    // Create profile + employer row in one go
    const profile = await db.userProfile.create({
      data: {
        clerkUserId: `${DEMO_PREFIX}_clerk_emp_${RUN_TS}_${profileNumber}`,
        role: 'employer',
        name: empName,
        email: `${empName}@ampertalent-demo.com`,
        firstName: 'Hiring',
        lastName: `Lead ${profileNumber}`,
        timezone: 'America/Chicago',
        profilePictureUrl: `https://api.dicebear.com/9.x/initials/png?seed=${company.logoSeed}`,
        employer: {
          create: {
            companyName: company.companyName,
            companyWebsite: company.website,
            companyLogoUrl: `https://api.dicebear.com/9.x/initials/png?seed=${company.logoSeed}`,
            companyDescription: company.description,
            billingAddress: company.billingAddress,
            taxId: company.taxId,
            missionStatement: company.mission,
            coreValues: company.values,
            isVetted: true,
            vettedAt: daysAgo(createdDaysAgo + 2),
          },
        },
      },
      include: { employer: true },
    })
    const employerId = profile.id

    // ExternalPayment for the paid package (so it shows in admin payments)
    const externalPayment = await db.externalPayment.create({
      data: {
        userId: employerId,
        amount: new Prisma.Decimal(tier.priceCents / 100),
        planId: tier.pkgType,
        status: 'completed',
        authnetTransactionId: `demo_${tier.pkgType}_${RUN_TS}_${profileNumber}`,
        webhookProcessedAt: daysAgo(createdDaysAgo),
      },
    })

    // Create EmployerPackage
    const packagePurchasedAt = daysAgo(createdDaysAgo)
    const packageExpiresAt = daysFromNow(tier.durationDays - createdDaysAgo)
    const pkg = await db.employerPackage.create({
      data: {
        employerId,
        jobIds: [],
        listingsRemaining: tier.listings,
        featuredListingsRemaining: tier.featured,
        purchasedAt: packagePurchasedAt,
        expiresAt: packageExpiresAt,
        packageType: tier.pkgType,
        isRecurring: 'recurring' in tier && tier.recurring,
        billingFrequency: 'recurring' in tier && tier.recurring ? 'monthly' : null,
        billingCyclesTotal: 'recurring' in tier && tier.recurring ? 6 : null,
        billingCyclesCompleted: 'recurring' in tier && tier.recurring ? 1 : null,
        nextBillingDate: 'recurring' in tier && tier.recurring ? daysFromNow(30) : null,
        recurringAmountCents: 'recurring' in tier && tier.recurring ? tier.priceCents : null,
        recurringStatus: 'recurring' in tier && tier.recurring ? 'active' : null,
      },
    })

    // Paid Invoice linked to the package
    await db.invoice.create({
      data: {
        employerPackageId: pkg.id,
        amountDue: tier.priceCents,
        status: 'paid',
        description: `${tier.name} — ${company.companyName}`,
        packageName: tier.name,
        dueDate: packagePurchasedAt,
        paidAt: packagePurchasedAt,
      },
    })

    // Set this package as the current package on the employer
    await db.employer.update({
      where: { userId: employerId },
      data: { currentPackageId: pkg.id },
    })

    // Create 3 jobs per employer
    const jobTemplates = jobsForCompany(company)
    const jobIds: string[] = []
    for (let i = 0; i < jobTemplates.length; i++) {
      const tpl = jobTemplates[i]
      const jobAgeDays = createdDaysAgo - i * 2
      // Featured staging: the first job of every employer is marked as
      // featured so the seeker /seeker/jobs page (which queries
      // /api/jobs/featured?limit=5) shows 5 featured jobs from the demo
      // seed. Featured-tier employers' first job gets the "completed"
      // status; everyone else gets a "pending" featured request so the
      // admin queue has visible work. Either way the demo shows a
      // populated Featured list.
      const isFeatured = i === 0
      const isFeaturedCompleted = tier.featured > 0 && i === 0
      const expiresAt = daysFromNow(30 - i * 5)
      const job = await db.job.create({
        data: {
          employerId,
          title: tpl.title,
          description: tpl.description,
          type: tpl.type,
          category: tpl.category,
          status: 'approved',
          skillsRequired: tpl.skills,
          payRangeText: tpl.payRangeText,
          payRangeMin: new Prisma.Decimal(tpl.payRangeMin),
          payRangeMax: new Prisma.Decimal(tpl.payRangeMax),
          hoursPerWeek: tpl.hoursPerWeek,
          isFlexibleHours: tpl.isFlexibleHours,
          remoteSchedule: tpl.remoteSchedule,
          locationText: tpl.locationText,
          salaryType: 'annual',
          experienceLevel: tpl.experienceLevel,
          applicationDeadline: daysFromNow(30 - i * 5),
          requirements: tpl.requirements,
          benefits: tpl.benefits,
          approvedAt: daysAgo(jobAgeDays),
          createdAt: daysAgo(jobAgeDays),
          expiresAt,
          viewsCount: 35 + Math.floor(Math.random() * 200),
          isFeatured,
          featuredCompletedAt: isFeaturedCompleted ? daysAgo(jobAgeDays) : null,
          featuredStatus: isFeaturedCompleted ? 'completed' : isFeatured ? 'pending' : 'not_requested',
          featuredRequestedAt: isFeatured && !isFeaturedCompleted ? daysAgo(jobAgeDays) : null,
          applicantsVisibleToEmployer: true,
        },
      })
      jobIds.push(job.id)
      allJobs.push({ id: job.id, employerId, title: tpl.title, category: tpl.category, company: company.companyName })
    }

    // Backfill jobIds into the package + employerPackages relation
    await db.employerPackage.update({
      where: { id: pkg.id },
      data: { jobIds, listingsRemaining: Math.max(0, tier.listings - jobIds.length) },
    })

    // Notification: package purchased + job approved
    await db.notification.create({
      data: {
        userId: employerId,
        type: 'employer_payment_confirmation',
        title: 'Package purchased',
        message: `Your ${tier.name} is active. ${jobIds.length} jobs have been published.`,
        priority: 'medium',
      },
    })

    employerCounter++
  }

  console.log(`   ✓ ${COMPANIES.length} employers, ${allJobs.length} jobs, ${COMPANIES.length} paid invoices\n`)

  /* ---------------------------------------------------------------- */
  /* 2. SEEKERS + SUBSCRIPTIONS + EXTERNAL PAYMENTS + JOB SEEKER ROW */
  /* ---------------------------------------------------------------- */
  console.log('👤 Creating 20 seekers + paid subscriptions + resumes...')

  const seekerRecords: Array<{ id: string; firstName: string; lastName: string; headline: string }> = []
  let seekerCounter = 0

  for (const seeker of SEEKERS) {
    const profileNumber = String(seekerCounter + 1).padStart(2, '0')
    const seekerName = `${DEMO_PREFIX}seeker-${RUN_TS}-${profileNumber}`
    const plan = SEEKER_PLANS[seeker.plan]
    // Cap the "created days ago" so the trial_monthly seekers (33-day plan)
    // don't appear with already-expired subscriptions. Trial accounts
    // created 0-3 days ago + 33-day plan = ~30 days remaining.
    const createdDaysAgo = Math.min(18 + seekerCounter * 2, plan.durationDays - 5)
    const periodStart = daysAgo(createdDaysAgo)
    const periodEnd = new Date(periodStart.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)
    const isTrial = seeker.isOnTrial

    const profile = await db.userProfile.create({
      data: {
        clerkUserId: `${DEMO_PREFIX}_clerk_seek_${RUN_TS}_${profileNumber}`,
        role: 'seeker',
        name: seekerName,
        email: `${seekerName}@ampertalent-demo.com`,
        firstName: seeker.firstName,
        lastName: seeker.lastName,
        timezone: seeker.timezone,
        profilePictureUrl: `https://api.dicebear.com/9.x/initials/png?seed=${seeker.firstName}${seeker.lastName}`,
        jobSeeker: {
          create: {
            headline: seeker.headline,
            aboutMe: seeker.about,
            availability: seeker.location,
            skills: seeker.skills,
            portfolioUrls: seeker.portfolioUrls,
            salaryExpectations: seeker.salaryExpectations,
            workExperience: `${seeker.experienceYears} years of professional experience in ${seeker.skills.slice(0, 3).join(', ')}.`,
            professionalSummary: seeker.about,
            membershipPlan: plan.membershipPlan,
            membershipExpiresAt: periodEnd,
            resumeCredits: plan.resumeCredits,
            resumeLimit: plan.resumeCredits,
            resumesUsed: 0,
            trialEndsAt: isTrial ? periodEnd : null,
            isOnTrial: isTrial,
            hasPreviousSubscription: !isTrial,
            applicationUpdates: true,
            emailAlerts: true,
            jobRecommendations: true,
            weeklyDigest: seekerCounter % 3 === 0,
            allowJobInvitations: true,
          },
        },
      },
    })

    // External payment for the subscription
    const externalPayment = await db.externalPayment.create({
      data: {
        userId: profile.id,
        amount: new Prisma.Decimal(plan.priceCents / 100),
        planId: mapPlanToId(seeker.plan),
        status: 'completed',
        authnetTransactionId: `demo_sub_${seeker.plan}_${RUN_TS}_${profileNumber}`,
        webhookProcessedAt: periodStart,
      },
    })

    // Subscription row
    await db.subscription.create({
      data: {
        seekerId: profile.id,
        plan: plan.membershipPlan,
        status: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        expires_at: periodEnd,
        billingFrequency: seeker.plan === 'annual_platinum' ? '12-months' : seeker.plan === 'vip_quarterly' ? '3-months' : seeker.plan === 'gold_bimonthly' ? '2-months' : '1-month',
        nextBillingDate: periodEnd,
        externalPaymentId: externalPayment.id,
        authnetSubscriptionId: `demo_sub_auth_${RUN_TS}_${profileNumber}`,
      },
    })

    // Primary resume
    const resume = makeResume(profile.id, 0)
    await db.resume.create({
      data: {
        seekerId: profile.id,
        filename: resume.filename,
        fileUrl: resume.fileUrl,
        fileSize: 142_000 + seekerCounter * 1200,
        isPrimary: true,
      },
    })

    // Welcome notification
    await db.notification.create({
      data: {
        userId: profile.id,
        type: 'seeker_payment_confirmation',
        title: 'Subscription active',
        message: `Your ${seeker.plan.replace('_', ' ')} plan is active until ${periodEnd.toISOString().slice(0, 10)}.`,
        priority: 'medium',
      },
    })

    seekerRecords.push({ id: profile.id, firstName: seeker.firstName, lastName: seeker.lastName, headline: seeker.headline })
    seekerCounter++
  }
  console.log(`   ✓ ${seekerRecords.length} seekers, ${seekerRecords.length} paid subscriptions\n`)

  /* ---------------------------------------------------------------- */
  /* 3. APPLICATIONS + INTERVIEW HISTORY                             */
  /* ---------------------------------------------------------------- */
  console.log('📄 Creating applications across all seekers...')

  // Application status distribution
  const STATUS_MIX: Array<{ status: 'pending' | 'reviewed' | 'interview' | 'rejected' | 'hired'; weight: number }> = [
    { status: 'pending', weight: 40 },
    { status: 'reviewed', weight: 25 },
    { status: 'interview', weight: 15 },
    { status: 'rejected', weight: 12 },
    { status: 'hired', weight: 8 },
  ]
  const totalWeight = STATUS_MIX.reduce((sum, s) => sum + s.weight, 0)

  function pickStatus(): 'pending' | 'reviewed' | 'interview' | 'rejected' | 'hired' {
    let r = Math.random() * totalWeight
    for (const s of STATUS_MIX) {
      if (r < s.weight) return s.status
      r -= s.weight
    }
    return 'pending'
  }

  let applicationCount = 0
  let pendingCount = 0
  let reviewedCount = 0
  let interviewCount = 0
  let rejectedCount = 0
  let hiredCount = 0

  for (let si = 0; si < seekerRecords.length; si++) {
    const seeker = seekerRecords[si]
    const seekerJobs = allJobs.slice()
    // Shuffle so each seeker applies to a spread of jobs
    for (let i = seekerJobs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[seekerJobs[i], seekerJobs[j]] = [seekerJobs[j], seekerJobs[i]]
    }
    const appsPerSeeker = 3 + Math.floor(Math.random() * 3) // 3-5 apps
    const seenJobIds = new Set<string>()

    for (let ai = 0; ai < appsPerSeeker && ai < seekerJobs.length; ai++) {
      const job = seekerJobs[ai]
      if (seenJobIds.has(job.id)) continue
      seenJobIds.add(job.id)
      const status = pickStatus()
      const appliedDaysAgo = 1 + Math.floor(Math.random() * 12)
      const appliedAt = daysAgo(appliedDaysAgo)

      const application = await db.application.create({
        data: {
          jobId: job.id,
          seekerId: seeker.id,
          resumeUrl: makeResume(seeker.id, ai).fileUrl,
          coverLetter: ai === 0 ? COVER_LETTERS[si % COVER_LETTERS.length] : null,
          status,
          appliedAt,
          updatedAt: appliedAt,
        },
      })

      // Interview history for interview + hired
      if (status === 'interview' || status === 'hired') {
        const scheduledFor = new Date(appliedAt.getTime() + 3 * 24 * 60 * 60 * 1000)
        const completedAt = new Date(scheduledFor.getTime() + 60 * 60 * 1000)
        await db.interviewHistory.create({
          data: {
            applicationId: application.id,
            stage: status === 'hired' ? 'final_interview' : 'technical_interview',
            scheduledAt: scheduledFor,
            completedAt,
            notes: status === 'hired'
              ? 'Strong signal across the board. Offered the role.'
              : 'Solid technical signal. Moving to next round.',
            feedback: status === 'hired'
              ? 'Excellent communication, deep system design instincts, strong culture fit.'
              : 'Met the bar on all technical criteria. Recommend advancing.',
            interviewerId: job.employerId,
          },
        })
        if (status === 'hired') {
          // Also add an initial screening
          await db.interviewHistory.create({
            data: {
              applicationId: application.id,
              stage: 'initial_screening',
              scheduledAt: new Date(appliedAt.getTime() + 1 * 24 * 60 * 60 * 1000),
              completedAt: new Date(appliedAt.getTime() + 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
              notes: 'Recruiter screen. Strong background.',
              feedback: 'Clear communication and ownership. Moving to technical.',
              interviewerId: job.employerId,
            },
          })
        }
      }

      // Notify the employer on each application
      await db.notification.create({
        data: {
          userId: job.employerId,
          type: 'new_application',
          title: 'New application',
          message: `${seeker.firstName} ${seeker.lastName} applied for ${job.title}`,
          priority: 'medium',
          data: { applicationId: application.id, jobId: job.id },
        },
      })

      applicationCount++
      if (status === 'pending') pendingCount++
      else if (status === 'reviewed') reviewedCount++
      else if (status === 'interview') interviewCount++
      else if (status === 'rejected') rejectedCount++
      else hiredCount++
    }
  }

  console.log(`   ✓ ${applicationCount} applications (pending=${pendingCount}, reviewed=${reviewedCount}, interview=${interviewCount}, rejected=${rejectedCount}, hired=${hiredCount})\n`)

  /* ---------------------------------------------------------------- */
  /* 4. SUMMARY                                                        */
  /* ---------------------------------------------------------------- */
  const summary = {
    runId: RUN_TS,
    employers: COMPANIES.length,
    jobs: allJobs.length,
    jobPackages: employerCounter,
    invoices: employerCounter,
    externalPayments: employerCounter + seekerRecords.length,
    seekers: seekerRecords.length,
    subscriptions: seekerRecords.length,
    applications: applicationCount,
    applicationsByStatus: {
      pending: pendingCount,
      reviewed: reviewedCount,
      interview: interviewCount,
      rejected: rejectedCount,
      hired: hiredCount,
    },
  }

  console.log('📊 Summary:')
  console.log(JSON.stringify(summary, null, 2))
  console.log('\n✅ Done. Demo data is now live and visible in admin/super-admin dashboards.')
}

function mapPlanToId(plan: SeekerTemplate['plan']): string {
  switch (plan) {
    case 'trial_monthly': return 'trial'
    case 'gold_bimonthly': return 'gold'
    case 'vip_quarterly': return 'vip-platinum'
    case 'annual_platinum': return 'annual-platinum'
  }
}

main()
  .then(async () => {
    await db.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeder failed:', e)
    await db.$disconnect()
    process.exit(1)
  })
