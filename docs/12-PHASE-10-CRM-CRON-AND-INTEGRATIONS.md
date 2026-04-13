# 🔄 Phase 10 — CRM, Cron Jobs & External Integrations

> ⏳ **POST-FIRST-DEPLOYMENT**: HubSpot CRM integration, Vercel Cron jobs, and external webhooks.
>
> **Note:** This phase focuses on CRM integration as an alternative to the original GoHighLevel. HubSpot can be integrated after the initial deployment is working and generating revenue through Stripe payments (Phase 6).

---

## 10.1 ⏳ POST-DEPLOYMENT: HubSpot CRM Service (GoHighLevel Alternative)

### Tasks

- [ ] Create `lib/hubspot.ts` — HubSpotCRMService implementing same interface patterns as `lib/gohighlevel.ts`
  - `createOrUpdateContact(contactData)` — `POST /crm/v3/objects/contacts` or `PATCH`
  - `getContact(contactId)` — `GET /crm/v3/objects/contacts/:id`
  - `searchContacts(query)` — `POST /crm/v3/objects/contacts/search`
  - `addTagsToContact(contactId, tags)` — via custom multi-select property
  - `removeTagsFromContact(contactId, tags)` — update custom property
  - `getCustomProperties()` — `GET /crm/v3/properties/contacts`
  - `createCustomProperty(name, type, options)` — `POST /crm/v3/properties/contacts`
  - `testConnection()` — `GET /crm/v3/objects/contacts?limit=1` (verify API key)
- [ ] Create `lib/crm.ts` — factory wrapping HubSpot service
- [ ] Create custom HubSpot properties for Ampertalent-specific data:
  - `Ampertalent_role` (seeker/employer)
  - `Ampertalent_plan` (membership plan)
  - `Ampertalent_tags` (multi-select)
  - `Ampertalent_user_id` (internal user ID)
- [ ] Create `lib/hubspot-sync-service.ts` — sync orchestration
  - `syncUserTocrm(userId, syncDirection)` — user profile → HubSpot contact
  - `batchSync(userIds)` — batch processing with rate limiting
  - `testConnection()` — verify API connectivity
- [ ] Create `lib/client-hubspot.ts` — client-side CRM utilities

### TDD Tests

```
__tests__/unit/hubspot.test.ts
- should create HubSpot contact
- should update HubSpot contact
- should search contacts by email
- should add/remove tags via custom property
- should test connection successfully

__tests__/integration/crm/sync.test.ts
- should sync new user to HubSpot CRM
- should sync user update to HubSpot
- should batch sync multiple users
- should log sync operations
- should test HubSpot connection
```

---

## 10.2 CRM Sync Admin Interface

### Tasks

- [ ] Create `app/admin/crm-sync/page.tsx` — CRM sync dashboard (super_admin only)
  - HubSpot connection status display
  - Test connection button (verifies API key)
  - Global sync enable/disable
  - Sync direction settings
  - Batch size configuration
  - Retry settings
- [ ] Create `components/admin/crm-sync/` — CRM sync UI components
  - Field mapping builder (app field ↔ HubSpot property)
  - Field group management
  - Sync log viewer
  - Change log viewer
  - Connection test UI
- [ ] Create `lib/dynamic-schema-introspector.ts` — discover available Prisma fields
- [ ] Create `lib/schema-introspector.ts` — Prisma schema introspection
- [ ] Create `app/api/admin/crm-sync/route.ts` — CRM sync API
  - Get/update sync settings
  - Test HubSpot connection
  - Get field mappings (app field → HubSpot property)
  - Create/update field mappings
  - Get sync logs
  - Trigger manual sync
- [ ] Create `app/api/admin/super-admin/route.ts` — super admin settings

### TDD Tests

```
__tests__/integration/admin/crm-sync.test.ts
- should save CRM sync settings (super_admin only)
- should deny non-super_admin access
- should test HubSpot connection (returns success)
- should create app field → HubSpot property mapping
- should toggle sync globally
- should log sync operations
- should view change log
```

---

## 10.3 Vercel Cron Jobs

### Tasks

- [ ] Create `app/api/cron/daily-tasks/route.ts` — daily cron (every 2 hours)
  - Seeker subscription renewal billing
  - Employer recurring billing (Gold Plus)
  - Seeker membership renewal reminders (24h window)
  - Employer renewal reminders (24h window)
  - Expired membership handling
  - Payment failure notifications
  - Job expiration processing
- [ ] Create `app/api/cron/hourly-tasks/route.ts` — hourly cron
  - Urgent renewal reminders
  - Real-time monitoring tasks
- [ ] Create `vercel.json` with cron configuration:
  ```json
  {
  	"crons": [
  		{ "path": "/api/cron/daily-tasks", "schedule": "0 */2 * * *" },
  		{ "path": "/api/cron/hourly-tasks", "schedule": "0 * * * *" }
  	]
  }
  ```
- [ ] Create `lib/cron-logger.ts` — ExecutionLog + ActionLog recording
- [ ] Create `lib/jobs/recurring-billing.ts` — seeker billing (covered in Phase 6)
- [ ] Create `lib/jobs/employer-recurring-billing.ts` — employer billing (covered in Phase 6)
- [ ] Create `lib/jobs/membership-reminders.ts` — reminder service

### TDD Tests

```
__tests__/integration/cron/daily-tasks.test.ts
- should process seeker subscription renewals
- should process employer recurring billing
- should send renewal reminders
- should handle expired memberships
- should handle payment failures
- should process expired jobs
- should log execution results
- should complete within timeout

__tests__/integration/cron/hourly-tasks.test.ts
- should process urgent reminders
- should log execution results
```

---

## 10.4 External Webhook Service

### Tasks

- [ ] Create `lib/external-webhook-service.ts` — ExternalWebhookService
  - Support all event types:
    - `seeker.welcome` — new seeker registration
    - `seeker.payment_confirmation` — subscription payment
    - `seeker.subscription_reminder` — renewal reminder
    - `seeker.application_status_update` — app status change
    - `seeker.job_invitation` — invited to apply
    - `employer.welcome` — new employer registration
    - `employer.payment_confirmation` — package payment
    - `employer.job_approved` / `employer.job_rejected` — job vetting
    - `employer.new_application` — new applicant
  - HMAC signature generation for webhook security
  - Retry logic (configurable attempts/delay)
  - Webhook URL configuration per event type
- [ ] Create `components/admin/WebhookManager.tsx` — admin webhook config UI
- [ ] Create `app/api/admin/webhooks/route.ts` — webhook management API

### TDD Tests

```
__tests__/unit/external-webhook-service.test.ts
- should construct correct payload for each event type
- should generate HMAC signature
- should send webhook to configured URL
- should retry on failure
- should handle timeout gracefully
- should log webhook delivery status
```

---

## 10.5 Pending Signup/Job Post Management

### Tasks

- [ ] Create `app/api/pending-signups/route.ts` — manage pending signups
- [ ] Create `app/api/pending-job-posts/route.ts` — manage pending job posts
- [ ] Create `app/api/admin/pending-signups/route.ts` — admin view of pending signups
- [ ] Create `app/api/admin/pending-job-posts/route.ts` — admin view of pending job posts
- [ ] Create `lib/checkout-session-management.ts` — session management

### TDD Tests

```
__tests__/integration/pending/signups.test.ts
- should create pending signup
- should expire old signups
- should complete signup after payment
- should admin view pending signups
```

---

## 10.6 API Health & Debug

### Tasks

- [ ] Create `app/api/health/route.ts` — health check endpoint
- [ ] Create `app/api/debug/route.ts` — debug endpoint (dev only)
- [ ] Create `app/api/middleware/route.ts` — middleware status

### TDD Tests

```
__tests__/integration/api/health.test.ts
- should return 200 OK
- should include database status
- should include cache status
```

---

## Deliverables Checklist

- ⏭️ HubSpot CRM integration (skipped - planned for post-deployment)
- ⏭️ CRM sync admin interface (skipped - planned for post-deployment)
- ⏭️ Field mapping builder (skipped - planned for post-deployment)
- ⏭️ Sync log viewer (skipped - planned for post-deployment)
- [x] Vercel Cron jobs (daily + hourly)
- [x] Cron execution logging
- [x] External webhook service with HMAC
- [x] Webhook management UI
- [x] Pending signup/job post management
- [x] Health check endpoint
- [x] All Phase 10 partial tests passing
