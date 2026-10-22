# Demo script: seeker journey (find jobs to hired)

Role: seeker in demo mode. Status: script ready, not recorded.

Setup: spawn a fresh seeker with `POST /api/demo/create`
(`{"role": "seeker"}`), sign in with the returned `demo-seeker-<ts>`
credentials, complete onboarding (basic info, details, goals, package),
then activate the demo subscription with
`POST /api/demo/activate-subscription` (skips Stripe and PayPal) and seed
sample applications with `POST /api/demo/seed`. Record against the live
Vercel URL.

Shots and voiceover lines (one per chapter):

1. intro (title card): "Welcome to AmperTalent. This tour follows a job
   seeker from first search to hired, all inside the seeker workspace."
2. dashboard (`/seeker/dashboard`): "Signed in as a demo seeker. The
   dashboard shows my matches, application stats, and next steps."
3. find jobs (`/seeker/jobs`, open `/seeker/jobs/[id]`): "Browsing open
   roles. Opening one to check the details, salary, and company."
4. apply (apply on the job detail, attach resume and cover letter):
   "Applying with my saved profile, resume, and a cover letter template."
5. tracking (`/seeker/applications`, `/seeker/saved-jobs`): "Saved jobs
   live here, and every application is tracked from pending to hired."
6. services (`/seeker/services`, `/seeker/resume-critique`): "The services
   marketplace offers resume critiques and career help on demand."
7. membership (`/seeker/membership`, `/seeker/billing`): "Memberships run
   Trial, Gold, VIP, and Annual, with invoices under billing."
8. messages (`/seeker/messages`, `/seeker/concierge-chat/[jobId]`,
   `/seeker/notifications`): "Concierge chat, employer messages, and
   notifications keep every conversation in one place."

Access notes: `/seeker/*` requires the seeker role (middleware bounces
everyone else to `/sign-in`). Profile plus resume uploads live at
`/seeker/profile`. Settings at `/seeker/settings`.

Cleanup: delete the demo applications, then the seeker profile and jobs
rows, then the user for the printed demo email (or wipe with
`POST /api/demo/cleanup-test` in dev). Verify the demo applications exist
in the DB before deleting.
