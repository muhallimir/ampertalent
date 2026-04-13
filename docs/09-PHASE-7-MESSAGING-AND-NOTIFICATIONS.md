# 💬 Phase 7 — Messaging & Notifications

> Complete messaging system with threads, attachments, templates, drafts, and multi-channel notifications.

---

## 7.1 Messaging Core

### Tasks

- [ ] Create `app/api/messages/send/route.ts` — send message
- [ ] Create `app/api/messages/inbox/route.ts` — inbox with pagination
- [ ] Create `app/api/messages/thread/route.ts` — thread messages
- [ ] Create `app/api/messages/[id]/route.ts` — read/delete message
- [ ] Create `app/api/messages/unread-count/route.ts` — unread count
- [ ] Create `app/api/messages/contacts/route.ts` — contact list
- [ ] Create `app/api/messages/attachments/route.ts` — file attachments

### TDD Tests

```
__tests__/integration/messaging/messages.test.ts
- should send message from seeker to employer
- should send message from employer to seeker
- should create message thread automatically
- should mark message as read
- should return unread count
- should list inbox messages with pagination
- should list thread messages
- should upload and attach file
```

---

## 7.2 Message Templates & Drafts

### Tasks

- [ ] Create `app/api/messages/templates/route.ts` — template CRUD
- [ ] Create `app/api/messages/drafts/route.ts` — draft CRUD
- [ ] Create `app/api/messages/preferences/route.ts` — message preferences

### TDD Tests

```
__tests__/integration/messaging/templates.test.ts
- should create message template
- should list templates by category
- should increment usage count
- should set default template

__tests__/integration/messaging/drafts.test.ts
- should auto-save draft
- should load draft for thread
- should delete draft after sending
```

---

## 7.3 Messaging UI Components

### Tasks

- [ ] Create `components/messages/MessageInbox.tsx` — inbox list
- [ ] Create `components/messages/MessageThread.tsx` — thread view
- [ ] Create `components/messages/MessageItem.tsx` — individual message
- [ ] Create `components/messages/MessageComposer.tsx` — compose with editor
- [ ] Create `components/messages/MessageList.tsx` — message list (virtualized)
- [ ] Create `components/messages/ContactSelector.tsx` — searchable contacts
- [ ] Create `components/messages/FileAttachmentUpload.tsx` — file upload
- [ ] Create `components/messages/AttachmentPreview.tsx` — attachment preview
- [ ] Create `components/messages/MessageSearch.tsx` — message search
- [ ] Create `components/messages/MessageFilters.tsx` — inbox filters
- [ ] Create `components/messages/MessageTemplates.tsx` — template picker
- [ ] Create `components/messages/TemplateManager.tsx` — template management
- [ ] Create `components/messages/MessageDrafts.tsx` — drafts list
- [ ] Create `components/messages/MessagePreferences.tsx` — preferences UI
- [ ] Create `components/messages/InterviewScheduleIndicator.tsx` — interview status in messages
- [ ] Create `components/messages/PresenceIndicator.tsx` — online status
- [ ] Create `components/providers/MessageProvider.tsx` — message state context

### TDD Tests

```
__tests__/ui/messaging/inbox.test.tsx
- should render inbox with threads
- should show unread badge count
- should render compose modal

__tests__/ui/messaging/thread.test.tsx
- should render thread messages
- should show attachment previews
- should show interview schedule indicator
```

---

## 7.4 Seeker & Employer Messaging Pages

### Tasks

- [ ] Create `app/seeker/messages/page.tsx` — seeker messaging page
- [ ] Create `app/employer/messages/page.tsx` — employer messaging page
- [ ] Create `app/admin/notifications/page.tsx` — admin notifications

---

## 7.5 In-App Notification System

### Tasks

- [ ] Create `app/api/notifications/route.ts` — notification CRUD
- [ ] Create `app/api/notifications/stream/route.ts` — SSE endpoint for real-time notifications
- [ ] Create `lib/in-app-notification-service.ts` — create in-app notifications
- [ ] Create `lib/notification-service.ts` — unified notification service (email + in-app + webhook)
- [ ] Create `lib/real-time-notification-service.ts` — SSE broadcast service
- [ ] Create `lib/notificationStyles.ts` — notification styling by type
- [ ] Create `components/providers/RealTimeNotificationProvider.tsx` — SSE connection provider
- [ ] Create `components/providers/NotificationCenterProvider.tsx` — notification state

### TDD Tests

```
__tests__/unit/notification-service.test.ts
- should create notification for user
- should send email via Resend
- should broadcast via SSE
- should fire external webhook
- should handle feature flag (ENABLE_CUSTOMER_PAYMENT_EMAILS)

__tests__/integration/notifications/realtime.test.ts
- should establish SSE connection
- should receive real-time notification
- should show toast notification
- should update unread count
```

---

## 7.6 Notification Types & Handlers

### Tasks

- [ ] Implement all 50+ notification types from NotificationType enum
- [ ] Create notification handlers for each event:
  - Job events: submitted, approved, rejected, under_review, expiring, archived, restored, paused
  - Application events: new_application, status_update, interview stages, offer events
  - Payment events: payment_confirmation, subscription_reminder
  - Service events: purchase_confirmation, status_update, completed
  - Team events: invitation_accepted
  - Admin events: role_promoted/demoted, system_error
  - Exclusive plan events: offered, activated, dismissed, reminder, expired, extension events
- [ ] Create `app/api/seeker/notifications/route.ts` — seeker notifications
- [ ] Create `app/api/employer/notifications/route.ts` — employer notifications
- [ ] Create `app/api/admin/notifications/route.ts` — admin notifications

### TDD Tests

```
__tests__/unit/notification-handlers.test.ts
- should create notification for job_approved
- should create notification for new_application
- should create notification for application_status_update
- should create notification for payment_confirmation
- should create notification for interview_scheduled
- should set correct priority per notification type
```

---

## 7.7 Email Notification Service

### Tasks

- [ ] Create comprehensive email template set (see Phase 6 for template details)
- [ ] Implement admin order notification emails (from uncommitted changes)
- [ ] Implement customer payment confirmation emails (from uncommitted changes)
- [ ] Implement subscription renewal reminder emails (from uncommitted changes)
- [ ] Create `lib/external-webhook-service.ts` — webhook dispatch for all events

### TDD Tests

```
__tests__/unit/customer-payment-emails.test.ts
- should send payment confirmation to customer
- should send subscription reminder to customer
- should include billing info in email
- should include payment method display
- should respect feature flag
- should handle email failure gracefully (non-blocking)
```

---

## 7.8 Notification UI Components

### Tasks

- [ ] Create `app/seeker/notifications/page.tsx` — seeker notifications page
- [ ] Create `app/employer/notifications/page.tsx` — employer notifications page
- [ ] Create `components/seeker/NotificationPanel.tsx` — notification panel
- [ ] Create notification bell with unread badge (in nav)

### TDD Tests

```
__tests__/ui/notifications/notification-panel.test.tsx
- should render notifications list
- should mark notification as read
- should show unread badge
- should filter by type
```

---

## Deliverables Checklist

- [x] Message send/receive between seekers and employers
- [x] Threaded message conversations
- [x] File attachments via Supabase Storage
- [x] Message templates CRUD
- [x] Message drafts auto-save
- [x] Contact selector with search
- [x] Message search
- [x] Real-time notifications via SSE
- [x] In-app notification center
- [x] 50+ notification types
- [x] Email notifications via Resend
- [x] Admin order notification emails
- [x] Customer payment confirmation emails
- [x] Subscription renewal reminder emails
- [x] External webhook dispatch
- [x] Notification preferences per user
- [x] All Phase 7 tests passing
