# 🛡️ Phase 5 — Admin Portal

> Complete admin experience: job vetting, user management, analytics, CRM sync, impersonation, services, billing management.

---

## 5.1 Admin Layout & Dashboard

### Tasks

- [ ] Create `app/admin/layout.tsx` — admin sidebar (30+ navigation items)
- [ ] Create `app/admin/dashboard/page.tsx` — platform-wide stats (total users, jobs, applications, revenue, active subscriptions)
- [ ] Create `app/admin/types.ts` — admin-specific TypeScript types
- [ ] Create `app/api/admin/dashboard/route.ts` — dashboard stats API

### TDD Tests

```
__tests__/ui/admin/dashboard.test.tsx
- should render platform stats
- should show user counts by role
- should show job counts by status
- should show revenue metrics
```

---

## 5.2 Job Vetting & Management

### Tasks

- [ ] Create `app/admin/job-posts/page.tsx` — job queue (pending, approved, rejected)
- [ ] Create `app/admin/jobs/page.tsx` — all jobs management
- [ ] Create `components/admin/JobVettingCard.tsx` — vetting card with approve/reject actions
- [ ] Create `components/admin/JobRejectionModal.tsx` — rejection with reason
- [ ] Create `components/admin/JobMonitoring.tsx` — job health monitoring
- [ ] Create `lib/job-monitoring.ts` — job monitoring service
- [ ] Create `app/api/admin/job-posts/route.ts` — job queue API
- [ ] Create `app/api/admin/jobs/route.ts` — all jobs management API
- [ ] Create `app/api/admin/jobs/[id]/route.ts` — individual job actions (approve, reject, pause, archive)

### TDD Tests

```
__tests__/integration/admin/job-vetting.test.ts
- should list pending jobs for vetting
- should approve job (status → approved, send notification)
- should reject job with reason (status → rejected, send notification)
- should bulk approve/reject
- should monitor job expiration
- should pause/unpause jobs
```

---

## 5.3 User Management

### Tasks

- [ ] Create `app/admin/seekers/page.tsx` — seeker list with search/filter
- [ ] Create `app/admin/seekers/[id]/page.tsx` — seeker detail view
- [ ] Create `app/admin/employers/page.tsx` — employer list with search/filter
- [ ] Create `app/admin/users/page.tsx` — all users management
- [ ] Create `app/admin/admins/page.tsx` — admin management (invite, promote/demote)
- [ ] Create `components/admin/UserManagementCard.tsx` — user card with actions
- [ ] Create `components/admin/InviteUserModal.tsx` — invite new user/admin
- [ ] Create `app/api/admin/seekers/route.ts` — seeker management API
- [ ] Create `app/api/admin/seekers/[id]/route.ts` — individual seeker management
- [ ] Create `app/api/admin/employers/route.ts` — employer management API
- [ ] Create `app/api/admin/admins/route.ts` — admin management API
- [ ] Create `app/api/admin/users/route.ts` — user search API

### TDD Tests

```
__tests__/integration/admin/user-management.test.ts
- should list seekers with pagination
- should search seekers by name/email
- should view seeker profile details
- should suspend/unsuspend seeker
- should list employers with vetting status
- should vet/unvet employer
- should invite new admin
- should promote admin to super_admin
- should demote super_admin to admin
```

---

## 5.4 Admin Impersonation

### Tasks

- [ ] Create `components/admin/ImpersonationBanner.tsx` — impersonation banner UI
- [ ] Create `components/admin/ImpersonationContext.tsx` — impersonation state context
- [ ] Create `components/admin/UserImpersonationDropdown.tsx` — user selector dropdown
- [ ] Create `lib/admin-impersonation.ts` — session management (2hr timeout, per-admin sessions)
- [ ] Create `app/api/admin/impersonation/route.ts` — impersonation API

### TDD Tests

```
__tests__/unit/admin-impersonation.test.ts
- should start impersonation session
- should store session per admin ID
- should timeout after 2 hours
- should end impersonation session
- should prevent cross-admin session access
```

---

## 5.5 Subscription & Billing Management

### Tasks

- [ ] Create `app/admin/subscription-management/page.tsx` — manage seeker subscriptions
- [ ] Create `app/admin/billing-requests/page.tsx` — employer extension requests
- [ ] Create `app/admin/pending-checkouts/page.tsx` — abandoned checkouts
- [ ] Create `app/admin/tx/page.tsx` — transaction lookup
- [ ] Create `app/admin/sales/page.tsx` — sales dashboard
- [ ] Create `components/admin/recurring-billing-list.tsx` — recurring billing overview
- [ ] Create `components/admin/recurring-billing-details-modal.tsx` — billing details
- [ ] Create `components/admin/abandoned-cart-widget.tsx` — abandoned cart stats
- [ ] Create `lib/abandoned-cart-service.ts` — abandoned cart tracking
- [ ] Create `app/api/admin/subscriptions/route.ts` — subscription management
- [ ] Create `app/api/admin/billing-requests/route.ts` — extension request review
- [ ] Create `app/api/admin/packages/route.ts` — package management
- [ ] Create `app/api/admin/pending-signups/route.ts` — pending signups
- [ ] Create `app/api/admin/pending-job-posts/route.ts` — pending job posts
- [ ] Create `app/api/admin/transaction-lookup/route.ts` — transaction search
- [ ] Create `app/api/admin/retry-payment/route.ts` — retry failed payment
- [ ] Create `app/api/admin/refund/route.ts` — process refund

### TDD Tests

```
__tests__/integration/admin/subscriptions.test.ts
- should list all subscriptions
- should cancel subscription with logging
- should modify subscription period
- should view subscription cancellation logs

__tests__/integration/admin/billing.test.ts
- should review extension request (approve/reject)
- should lookup transaction by ID
- should process refund
```

---

## 5.6 Concierge & Service Management

### Tasks

- [ ] Create `app/admin/concierge/page.tsx` — concierge requests queue
- [ ] Create `app/admin/services/page.tsx` — service requests management
- [ ] Create `app/admin/resume-critiques/page.tsx` — resume critique queue
- [ ] Create `app/admin/featured-jobs/page.tsx` — featured job request processing
- [ ] Create `app/admin/solo-email-blasts/page.tsx` — email blast processing
- [ ] Create `components/admin/ResumeCritiqueManagement.tsx` — critique management UI
- [ ] Create `app/api/admin/concierge/route.ts` — concierge management API
- [ ] Create `app/api/admin/services/route.ts` — service management API
- [ ] Create `app/api/admin/resume-critiques/route.ts` — critique management API
- [ ] Create `app/api/admin/featured-jobs/route.ts` — featured job processing
- [ ] Create `app/api/admin/solo-email-blasts/route.ts` — email blast processing

### TDD Tests

```
__tests__/integration/admin/concierge.test.ts
- should list concierge requests
- should assign admin to request
- should update request status
- should send chat message

__tests__/integration/admin/services.test.ts
- should list service requests
- should assign admin to service
- should mark service completed
- should record audit trail
```

---

## 5.7 Exclusive Offers Management

### Tasks

- [ ] Create `components/admin/ExclusiveOffersTab.tsx` — exclusive offer management
- [ ] Create `app/api/admin/exclusive-offers/route.ts` — create/list exclusive offers
- [ ] Create `app/api/admin/exclusive-offers/extend/route.ts` — extend offer
- [ ] Create `app/api/admin/exclusive-offers/extension-request/review/route.ts` — review extension requests

### TDD Tests

```
__tests__/integration/admin/exclusive-offers.test.ts
- should create exclusive offer for employer
- should employer activate exclusive offer
- should admin extend offer period
- should review employer extension request
```

---

## 5.8 CRM Sync Management (Super Admin)

### Tasks

- [ ] Create `app/admin/crm-sync/page.tsx` — CRM sync settings dashboard
- [ ] Create `components/admin/crm-sync/` — field mapping UI, connection testing, sync logs
- [ ] Create `lib/hubspot-sync-service.ts` — HubSpot sync orchestration
- [ ] Create `lib/crm-sync-auth.ts` — HubSpot authentication (Private App token)
- [ ] Create `lib/dynamic-schema-introspector.ts` — dynamic schema introspection for field discovery
- [ ] Create `lib/schema-introspector.ts` — Prisma schema introspection
- [ ] Create `app/api/admin/crm-sync/route.ts` — CRM sync API
- [ ] Create `app/api/admin/super-admin/route.ts` — super admin settings

### TDD Tests

```
__tests__/integration/admin/crm-sync.test.ts
- should save CRM sync settings
- should test CRM connection (HubSpot API)
- should create field mapping
- should sync contact to HubSpot CRM
- should log sync operations
- should only allow super_admin access
```

---

## 5.9 Logs & Monitoring

### Tasks

- [ ] Create `app/admin/logs/page.tsx` — execution logs viewer
- [ ] Create `lib/cron-logger.ts` — cron job logging
- [ ] Create `lib/monitoring.ts` — platform monitoring
- [ ] Create `app/api/admin/logs/route.ts` — logs API
- [ ] Create `app/api/admin/cron-logs/route.ts` — cron logs API

### TDD Tests

```
__tests__/integration/admin/logs.test.ts
- should list execution logs
- should list action logs
- should filter logs by task/status/date
```

---

## 5.10 Webhook Management

### Tasks

- [ ] Create `components/admin/WebhookManager.tsx` — webhook configuration UI
- [ ] Create `lib/external-webhook-service.ts` — webhook dispatch service
- [ ] Create `app/api/admin/webhooks/route.ts` — webhook management API

### TDD Tests

```
__tests__/unit/external-webhook-service.test.ts
- should send webhook with correct payload
- should include HMAC signature
- should handle webhook failures gracefully
```

---

## 5.11 Admin Settings & Storage

### Tasks

- [ ] Create `app/admin/settings/page.tsx` — platform settings
- [ ] Create `app/admin/profile/page.tsx` — admin profile
- [ ] Create `app/admin/storage/page.tsx` — file storage browser
- [ ] Create `app/admin/notifications/page.tsx` — admin notification center
- [ ] Create `components/admin/NotificationCenter.tsx` — notification management

### TDD Tests

```
__tests__/integration/admin/settings.test.ts
- should update platform settings
- should browse storage files
- should list admin notifications
```

---

## Deliverables Checklist

- [x] Admin dashboard with platform-wide metrics
- [x] Job vetting queue with approve/reject + rejection reasons
- [x] Complete user management (seekers, employers, admins)
- [x] Admin impersonation with 2hr sessions
- [x] Subscription management with cancellation logging
- [x] Billing/extension request review
- [x] Transaction lookup and refund processing
- [x] Concierge request management
- [x] Service request management with audit trail
- [x] Resume critique management
- [x] Featured job & email blast processing
- [x] Exclusive offer creation and management
- [x] CRM sync settings (super_admin only)
- [x] Execution & action log viewer
- [x] Webhook management
- [x] Storage browser
- [x] Abandoned cart tracking
- [x] All Phase 5 tests passing
