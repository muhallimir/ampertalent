# 🎯 Phase 8 — Concierge & Premium Services

> White-glove concierge system, seeker-admin chat, premium service fulfillment workflow.

---

## 8.1 Employer Concierge System

### Tasks

- [ ] Create `lib/concierge-service.ts` — ConciergeService class
  - `requestConciergeService(jobId, employerId)` — create request
  - `getConciergeRequest(jobId)` — get request details
  - `assignAdmin(requestId, adminId)` — assign admin
  - `updateStatus(requestId, status)` — update workflow status
  - `getEmployerConciergeRequests(employerId)` — list employer's requests
- [ ] Create `lib/concierge-chat-service.ts` — employer ↔ admin chat
  - `createChat(jobId, employerId, adminId)`
  - `sendMessage(chatId, senderId, senderType, message, fileUrl?)`
  - `getMessages(chatId)` — paginated
  - `markAsRead(chatId, userId)`
  - `getUnreadCount(chatId, userId)`
- [ ] Create `app/api/concierge/route.ts` — concierge API
- [ ] Create `app/api/concierge/profile-picture/route.ts` — profile picture for concierge
- [ ] Create `app/concierge/layout.tsx` — concierge layout

### TDD Tests

```
__tests__/integration/concierge/employer-concierge.test.ts
- should create concierge request for job
- should not duplicate request for same job
- should assign admin to request
- should update request status through workflow
- should send chat message
- should mark messages as read
- should return unread count

__tests__/unit/concierge-service.test.ts
- should validate job ownership
- should handle presigned URLs for company logos
```

---

## 8.2 Seeker Concierge Chat

### Tasks

- [ ] Create seeker-to-admin chat system (separate from employer concierge)
  - `createSeekerChat(jobId, seekerId, adminId)`
  - `sendSeekerMessage(chatId, senderId, senderType, message)`
  - `getSeekerMessages(chatId)`
  - `markSeekerMessageAsRead(chatId, userId)`
- [ ] Create `app/seeker/concierge-chat/page.tsx` — seeker chat page
- [ ] Create `components/seeker/SeekerConciergeChat.tsx` — chat UI
- [ ] Create `components/seeker/ChatButton.tsx` — initiate chat button
- [ ] Create `app/api/seeker/concierge-chat/route.ts` — seeker chat API

### TDD Tests

```
__tests__/integration/concierge/seeker-chat.test.ts
- should create seeker concierge chat
- should send message from seeker
- should send message from admin
- should support file attachments
- should show unread count
```

---

## 8.3 Admin Concierge Dashboard

### Tasks

- [ ] Create `app/admin/concierge/page.tsx` — concierge requests queue
  - Pending requests (need admin assignment)
  - Active requests (assigned, in progress)
  - Completed requests
- [ ] Create concierge workflow status tracking:
  - pending → discovery_call → job_optimization → candidate_screening → interviews → completed
- [ ] Create admin chat interface for both employer and seeker chats

### TDD Tests

```
__tests__/integration/admin/concierge-management.test.ts
- should list all concierge requests
- should filter by status
- should assign admin to request
- should update workflow status
- should access chat for request
```

---

## 8.4 Premium Service Fulfillment

### Tasks

- [ ] Create service fulfillment workflow:
  - Customer purchases service → status: pending
  - Admin assigns → status: in_progress (with assignedAdminId)
  - Admin completes → status: completed (with fulfillmentNotes, completedAt)
- [ ] Create `lib/service-request-audit-service.ts` — audit trail for all service changes
- [ ] Create `app/api/admin/services/route.ts` — admin service management
  - List service requests with filters
  - Assign admin to request
  - Update status
  - Add fulfillment notes
  - Mark as completed
- [ ] Create `components/admin/ResumeCritiqueManagement.tsx` — manage resume critiques
  - View submitted resumes
  - Assign reviewer
  - Complete critique with analysis JSON
- [ ] Create service audit logging for every status change

### TDD Tests

```
__tests__/integration/services/fulfillment.test.ts
- should create service purchase record
- should admin assign to service request
- should update fulfillment notes
- should mark service as completed
- should create audit log for each change
- should send notification on status change

__tests__/integration/services/resume-critique.test.ts
- should create critique request with resume URL
- should assign reviewer
- should submit critique analysis (JSON)
- should mark critique as completed
- should send notification to seeker
```

---

## 8.5 Resume Critique System

### Tasks

- [ ] Create `lib/resume-critique.ts` — ResumeCritiqueService
  - `requestCritique(seekerId, resumeUrl, targetRole, targetIndustry, priority)`
  - `submitAnalysis(critiqueId, analysis)` — admin submits review
  - `getCritiqueResults(critiqueId)` — get results
  - `getSeekerCritiques(seekerId)` — list seeker's critiques
- [ ] Create analysis JSON schema:
  - Overall score (0-100)
  - Section scores (formatting, content, keywords, experience, skills)
  - Feedback per section
  - Recommendations with priority
  - Industry comparison
- [ ] Create `components/seeker/ResumeCritiquePaymentModal.tsx` — payment for critique
- [ ] Create `components/seeker/ResumeCritiqueResults.tsx` — results display
- [ ] Create `app/api/resume-critique/route.ts` — critique API
- [ ] Create `app/api/resume-critique/payment/route.ts` — critique payment

### TDD Tests

```
__tests__/unit/resume-critique.test.ts
- should validate seeker has active subscription
- should create critique request
- should validate analysis JSON schema
- should calculate critique cost based on priority
```

---

## 8.6 Featured Job & Email Blast Processing

### Tasks

- [ ] Create featured job fulfillment:
  - Employer requests → FeaturedJobRequest (status: not_started)
  - Admin processes → status: pending → completed
  - Job updated: isFeatured=true, featuredStatus=completed
  - Extension handling
- [ ] Create email blast fulfillment:
  - Employer requests → EmailBlastRequest with content/logo/link
  - Admin processes → status: pending → completed
  - Job updated: isEmailBlast=true, emailBlastStatus=completed
  - Expiration handling
- [ ] Create `app/api/admin/featured-jobs/route.ts` — process featured requests
- [ ] Create `app/api/admin/solo-email-blasts/route.ts` — process email blasts

### TDD Tests

```
__tests__/integration/services/featured-jobs.test.ts
- should create featured job request
- should admin process featured request
- should update job featured status
- should handle featured extension

__tests__/integration/services/email-blasts.test.ts
- should create email blast request with content
- should admin process email blast
- should update job email blast status
- should handle blast expiration
```

---

## Deliverables Checklist

- [ ] Employer concierge request system (full workflow)
- [ ] Employer ↔ Admin chat with file sharing
- [ ] Seeker ↔ Admin concierge chat
- [ ] Admin concierge dashboard with queue management
- [ ] Service fulfillment workflow (pending → in_progress → completed)
- [ ] Service request audit trail
- [ ] Resume critique system (request, payment, analysis, results)
- [ ] Featured job request processing
- [ ] Email blast request processing
- [ ] All Phase 8 tests passing
