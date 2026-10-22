# Demo script: tools showcase (30 utilities, no login)

Role: guest, no login. Status: script ready, not recorded.

Setup: none. Open `/tools` as a visitor (public route group, no auth).
Each of the 30 utility cards calls its own `/api/tools/*` endpoint with
a prefilled demo payload and renders the result inline. Record against
the live Vercel URL.

Shots and voiceover lines (one per chapter):

1. intro (title card): "AmperTalent Labs, thirty hiring utilities you can
   try right now with no account."
2. match (`/tools`, job alert matcher card): "The job alert matcher
   scores and ranks roles against alert criteria."
3. fit (ATS fit scorer card): "The ATS fit scorer grades a resume against
   a job description."
4. pay (salary normalizer, FX converter cards): "The salary normalizer
   unifies pay periods, and the FX converter crosses currencies."
5. pipeline (application state machine, interview slot picker cards):
   "The state machine validates application transitions, and the slot
   picker builds interview availability."
6. talent (talent search, job digest, interview feedback cards): "Talent
   search finds profiles, the digest composes daily job emails, and
   feedback summaries structure interviewer notes."
7. money (subscription proration, coupon engine cards): "Proration prices
   plan changes fairly, and the coupon engine validates discounts."
8. quality (job dedupe, JobPosting JSON-LD, resume quality scorer cards):
   "Dedupe catches repeat postings, JSON-LD boosts SEO, and the resume
   scorer grades quality."

Access notes: fully public, no Clerk session needed. Public job data
also powers `/api/public/jobs`, `/api/public/categories`, and
`/api/public/stats`. Related seeker tools (resume critique, concierge
chat) need a seeker demo account instead; see the seeker journey.

Cleanup: none. The tools showcase only runs stateless demo payloads and
writes nothing to the DB.
