# Demo script: admin operations (moderate to revenue)

Role: admin in demo mode (super_admin follows the same path with extra
privileges under `/admin/super-admin`). Status: script ready, not
recorded.

Setup: spawn a fresh admin with `POST /api/demo/create`
(`{"role": "admin"}`). Admin onboarding is skipped, so the account lands
on `/admin/dashboard` directly. Seed demo jobs and users with
`POST /api/demo/seed` so the moderation queue and analytics have rows to
show. Record against the live Vercel URL.

Shots and voiceover lines (one per chapter):

1. intro (title card): "AmperTalent admin operations, from moderation to
   revenue, in one back office tour."
2. dashboard (`/admin/dashboard`, `/admin/analytics`): "The dashboard and
   analytics show signups, postings, applications, and revenue at a
   glance."
3. moderation (`/admin/job-posts`): "The job moderation queue approves or
   rejects listings before they go live."
4. users (`/admin/users`, `/admin/seekers`, `/admin/employers`):
   "Seekers, employers, and admins are managed from one users section."
5. billing ops (`/admin/billing-requests`,
   `/admin/subscription-management`): "Billing ops covers subscriptions,
   invoices, and refunds."
6. concierge (`/admin/concierge`): "Concierge fulfillment tracks sourcing
   requests from brief to delivered candidates."
7. growth (`/admin/featured-jobs`, `/admin/solo-email-blasts`):
   "Featured jobs boost visibility, and email blasts reach the talent
   base in one send."
8. platform (`/admin/crm-sync`, `/admin/webhooks`, `/admin/storage`,
   `/admin/settings`): "CRM sync, webhooks, storage, and settings keep
   the platform wired and healthy."

Access notes: `/admin/*` requires admin or super_admin (middleware).
Admins can also open seeker and employer sections. Logs and reports live
at `/admin/logs` and `/admin/reports`.

Cleanup: delete the seeded demo rows in dependency order (applications,
then jobs and profiles, then users), or wipe with
`POST /api/demo/cleanup-test` in dev. Verify queue actions persisted in
the DB before deleting.
