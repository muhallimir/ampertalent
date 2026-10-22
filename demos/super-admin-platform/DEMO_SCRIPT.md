# Demo script: super admin platform (sales, admins, then exclusives)

Role: super_admin in demo mode. Status: recorded, silent plus voiced.
Target length: 120 to 150 seconds.

Setup: spawn a fresh super_admin with `POST /api/demo/create`
(`{"role": "super_admin"}`). Super admin onboarding is skipped, so the
account lands on `/admin/dashboard` directly. Seed demo jobs and users
with `POST /api/demo/seed` so plans, billing, and logs have rows to
show. Seed one exclusive offer with
`POST /api/admin/super-admin/exclusive-plans` for a demo employer
companion (so the plans shot shows a real plan row), plus one
`execution_logs` row with `task_name` `demo-showcase-billing-cron` and
one `action_logs` row (so the logs shot shows a real audited run).
Record against the live Vercel URL. Read only wherever possible:
open pages and tabs, do not submit forms or change settings. Do not send
a broadcast to real users.

Shots and voiceover lines (one per chapter, one page per shot):

1. intro (title card): "Super admin exclusives on AmperTalent, the controls platform buyers ask about most."
2. sales (`/admin/sales`, open one row): "Sales data lives here: revenue, subscriptions, and trial metrics across the whole platform, not just one employer."
3. admins (`/admin/admins`, open one row): "Regular admins are managed from this page: invite, promote, suspend, or remove them, with role and status controls."
4. plans (`/admin/super-admin/exclusive-plans`, open the page, then open one plan row): "Exclusive plans live here, with custom pricing per employer. This plan shows its scope and price."
5. billing (`/admin/super-admin/recurring-billing`, seekers tab then employers tab, cron view): "Recurring billing shows every cycle, retry, and renewal across seekers and employers, driven by the billing cron."
6. crm mapping (`/admin/crm-sync`, mappings tab): "CRM sync maps platform fields to the pipeline, so every contact lands in the right stage." (Needs super_admin. If the page bounces to the dashboard, film `/admin/webhooks` deliveries plus `/admin/storage` plus `/admin/settings` instead and say so on camera. Note the fallback in the report.)
7. crm logs (`/admin/crm-sync`, change log tab, or `/admin/webhooks` deliveries on fallback): "The sync log records every mapping edit and delivery, so the pipeline stays auditable."
8. logs (`/admin/logs`, open one audit log row): "Cron runs and admin actions are logged here, and this row shows one audited run."
9. notify (`/admin/notifications`, stats plus recent list): "The notification center tracks every broadcast to seekers, employers, or everyone. Nothing is sent during this tour." (The product has no broadcast composer UI, so there is nothing that could send to real users. The old line about a form was replaced to match the real page.)
10. subscriptions (`/admin/subscription-management`, open one subscription row): "Subscription management tracks every plan row, and this subscription shows its status and billing."

Access notes: `/admin/sales`, `/admin/admins`, `/admin/super-admin/*` and
`/admin/crm-sync` need the super_admin role (middleware plus page level
guard). `/admin/logs`, `/admin/notifications`, and
`/admin/subscription-management` need admin or super_admin. This demo
does not repeat the admin moderation queue, users, or featured jobs shots
(see the admin operations tour) and does not touch the resume critique API.

Access notes: `/admin/super-admin/*` and `/admin/crm-sync` need the
super_admin role (middleware plus page level guard). `/admin/logs`,
`/admin/notifications`, and `/admin/subscription-management` need admin
or super_admin. This demo does not repeat the admin moderation queue,
users, or featured jobs shots (see the admin operations tour) and does
not touch the resume critique API.

Cleanup: delete the seeded demo rows in dependency order (applications,
then jobs and profiles, then users), delete the seeded
`execution_logs` row with `task_name` `demo-showcase-billing-cron` plus
its `action_logs` rows, or wipe with
`POST /api/demo/cleanup-test` in dev (plus the log tables). Verify the seeded rows exist in
the DB before deleting. Do not change CRM settings on camera.
