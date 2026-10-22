# Demo script: employer journey (post a job to hire)

Role: employer in demo mode. Status: script ready, not recorded.

Setup: spawn a fresh employer with `POST /api/demo/create`
(`{"role": "employer"}`), sign in with the returned
`demo-employer-<ts>` credentials, complete onboarding (basic info,
details, complete), then seed sample job posts with
`POST /api/demo/seed`. Employers post jobs normally and pay on
`/employer/billing` per the normal flow. Record against the live
Vercel URL.

Shots and voiceover lines (one per chapter):

1. intro (title card): "Welcome to AmperTalent for employers. This tour
   goes from posting a job to hiring, plus team and billing."
2. dashboard (`/employer/dashboard`): "Signed in as a demo employer. The
   dashboard shows live roles, applicant counts, and pipeline stats."
3. post job (`/employer/jobs/new`, then `/employer/jobs/[id]`):
   "Posting a role with a package, then reviewing the live listing."
4. talent search (`/employer/talent`): "Searching the talent pool by
   skills and experience to shortlist candidates."
5. applicants (`/employer/applications`): "Every applicant is tracked
   from pending to reviewed, interview, rejected, or hired."
6. company and team (`/employer/company-profile`, `/employer/team`):
   "The company profile sells the brand, and team invites bring
   collaborators into this workspace."
7. billing and concierge (`/employer/billing`,
   `/employer/concierge/[jobId]`): "Billing covers job packages, and
   concierge sourcing delivers vetted candidates on request."

Access notes: `/employer/*` requires the employer role; team_member is
also allowed and lands on `/employer/dashboard` (middleware). Settings
at `/employer/settings`, messages at `/employer/messages`.

Cleanup: delete the demo applications, then the demo jobs, then the
employer profile and user for the printed demo email (or wipe with
`POST /api/demo/cleanup-test` in dev). Verify the demo hires exist in
the DB before deleting.
