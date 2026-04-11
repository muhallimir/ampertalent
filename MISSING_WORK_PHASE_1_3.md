# ❌ Missing Work for Phase 1-3 (TDD Implementation Plan)

## 📊 Summary

**Phase 1 Completion**: 65% (Infrastructure done, utilities/storage/payments incomplete)
**Phase 2 Completion**: 60% (Auth done, webhooks/invitations incomplete)
**Phase 3 Completion**: 50% (UI/pages cloned, API routes ~30% done, business logic missing)

---

## 🎯 Phase 1: Missing Work (15 tasks)

### Storage & File Upload
- [ ] **`lib/storage.ts`** — Supabase Storage adapter
  - `generatePresignedUploadUrl(bucket, key, expiresIn)`
  - `generatePresignedDownloadUrl(bucket, key, expiresIn)`
  - `uploadFile(bucket, key, file)`
  - `deleteFile(bucket, key)`
  - `getFileMetadata(bucket, key)`
  - `listFiles(bucket, prefix)`
  - `copyFile(bucket, sourceKey, destKey)`
  - **Dependencies**: Supabase client, RLS policies
  - **Test**: Upload 1MB file, generate URLs, verify download access

- [ ] **Configure RLS policies** for storage buckets (`resumes`, `profile-pictures`, `company-logos`, `attachments`)
  - Resumes: seeker can read own, employer can read for application context
  - Profile pictures: public read, owner write
  - Company logos: employer can write, public read
  - Attachments: authenticated users only

### Stripe Payment Integration
- [ ] **`lib/stripe.ts`** — Server-side Stripe client
  - `createCustomer(email, name)`
  - `createSetupIntent(customerId)`
  - `createPaymentIntent(customerId, amount, metadata)`
  - `createSubscription(customerId, priceId, trialDays?)`
  - `cancelSubscription(subscriptionId)`
  - `getSubscription(subscriptionId)`
  - `createRefund(paymentIntentId, amount?)`
  - `listPaymentMethods(customerId)`
  - `detachPaymentMethod(paymentMethodId)`
  - `createInvoice(customerId, items)`
  - **Dependencies**: Stripe SDK, singleton pattern
  - **Test**: Create customer, payment intent, subscription in test mode

- [ ] **`lib/stripe-client.ts`** — Client-side Stripe utilities
  - `getStripe()` — loadStripe singleton
  - Stripe Elements wrapper
  - Payment form helpers
  - **Test**: Load Stripe.js, initialize elements

- [ ] **`lib/stripe-webhook.ts`** — Webhook signature verification
  - `verifyWebhookSignature(body, signature)`
  - Event handlers for: `customer.created`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
  - **Test**: Verify signature, handle events

- [ ] **Stripe Products & Prices** (create in Stripe Dashboard, test mode):
  - **Seeker Plans**: Trial (free, 7 days), Gold ($99/mo, 3 resumes), VIP ($199/mo, 10 resumes), Annual ($999/yr, unlimited)
  - **Employer Packages**: Standard ($499/mo), Featured ($999/mo), Email Blast ($1999/mo), Gold Plus ($2499/mo)
  - **Concierge Services**: Lite ($199), Level I ($499), Level II ($999), Level III ($1999), Rush ($299)

- [ ] **`components/payments/StripeElementsWrapper.tsx`** — Elements provider
- [ ] **`components/payments/PaymentMethodForm.tsx`** — CardElement form
- [ ] **`components/payments/StripeTestModeBanner.tsx`** — "Use card 4242 4242 4242 4242" banner

### Core Utilities
- [ ] **`lib/utils.ts`** — Utility functions
  - `cn(...classes)` — class name merger
  - `formatCurrency(amount, currency)`
  - `formatDate(date, format)`
  - `formatPhoneNumber(phone)`
  - `truncateText(text, maxLength)`
  - `slugify(text)`
  - `generateToken(length)`
  - `validateEmail(email)`
  - **Test**: Test all functions with edge cases

- [ ] **`lib/error-handler.ts`** — Error handling
  - `AppError` — custom error class
  - `handleApiError(error)` — transform errors to responses
  - `handleValidationError(errors)` — return 400 with field errors
  - **Test**: Throw errors, verify responses

- [ ] **`lib/file-validation.ts`** — File validation
  - `validateFileType(file, allowed)` — check MIME
  - `validateFileSize(file, maxSize)` — check file size
  - `validateFileExtension(file, allowed)` — check extension
  - `generateFileKey(userId, fileName)` — unique S3-like key
  - **Test**: Upload valid/invalid files

- [ ] **`lib/job-constants.ts`** — Job constants
  - 28 job categories (IT, Finance, HR, etc.)
  - Job types (Full-time, Part-time, Freelance, Contract, Temporary)
  - Experience levels (Entry, Mid, Senior, Executive)
  - Benefit categories (Health Insurance, 401k, Remote, Flexible Hours, etc.)
  - **Test**: Export all constants, verify count

### Database Seed
- [ ] **`prisma/seed.ts`** — Demo data script
  - 5 demo seekers (various profiles)
  - 5 demo employers (various companies)
  - 20 demo jobs (various categories, statuses)
  - 10 demo applications (various statuses)
  - Run with: `npx prisma db seed`
  - **Test**: Run seed, verify 40+ records created

---

## 🔐 Phase 2: Missing Work (10 tasks)

### Webhooks (Critical for Production)
- [ ] **`app/api/webhooks/clerk/route.ts`** — Clerk webhook handler
  - Events: `user.created`, `user.updated`, `user.deleted`
  - Create/update Clerk-synced records in DB
  - Verify webhook signature
  - **Test**: Send test events, verify DB updates

- [ ] **`app/api/webhooks/supabase/route.ts`** — Supabase webhook handler (optional)
  - Listen for auth/profile events
  - Trigger notifications or syncs

### User Invitations (Admin → User)
- [ ] **`lib/user-invitations.ts`** — Invitation management
  - `createInvitation(email, role)` → UserInvitation with token
  - `validateToken(token)` → check expiry
  - `acceptInvitation(token)` → create profile + set role
  - `revokeInvitation(token)` → mark as revoked
  - **Test**: Create token, accept, verify user role

- [ ] **`lib/clerk-invitation-actions.ts`** — Clerk integration
  - Pre-create Clerk user before DB invite
  - Handle email pre-validation

- [ ] **`app/api/user/invitation/validate/admin/route.ts`** — Admin invitation endpoint
  - Accept admin-sent invitations
  - Skip role selection in onboarding

- [ ] **`components/UserInviteSignUpForm.tsx`** — Invitation sign-up form
  - Sign-up with pre-filled email
  - Skip role selection

### Team Invitations (Employer → Team Member)
- [ ] **`lib/team-invitations.ts`** — Team invitation logic
  - `sendTeamInvite(companyId, email, role)`
  - `acceptTeamInvite(token)`
  - `listTeamMembers(companyId)`
  - `removeTeamMember(companyId, userId)`
  - **Test**: Invite, accept, verify team member added

- [ ] **`app/api/team-invitation/route.ts`** — Send/accept team invites
  - POST: Send invite email via Resend
  - GET: Accept invite

- [ ] **`app/api/team-member/route.ts`** — Manage team members
  - GET: List team members
  - DELETE: Remove member
  - PATCH: Update role

- [ ] **`components/employer/TeamManagement.tsx`** — Team UI
  - List team members
  - Invite form
  - Delete confirmations

### Auth Helpers (Refinements)
- [ ] **`lib/seeker-access-guard.ts`** — Seeker subscription checks
  - `checkSubscriptionActive(seekerId)` → true/false
  - `checkResumeQuota(seekerId)` → remaining resumes
  - `checkServiceAccess(seekerId, serviceId)` → has purchased
  - **Test**: Mock subscription states, verify gates

---

## 👤 Phase 3: Missing Work (30+ tasks)

### Job APIs (5 endpoints)
- [ ] **`app/api/jobs/[id]/route.ts`** — Job detail API
  - GET: Return full job details + employer info + application count
  - **Dependencies**: Prisma, getCurrentUser
  - **Test**: Fetch job, verify all fields

- [ ] **`app/api/jobs/search/route.ts`** — Search API (supports all filters)
  - Query: `?q=keyword&category=IT&type=full-time&salary_min=50000&salary_max=150000&skills=React,Node.js&page=1&limit=20`
  - Return: Jobs array + facet counts (for filters)
  - **Dependencies**: Prisma, advanced-search
  - **Test**: Search with filters, verify pagination

- [ ] **`app/api/jobs/popular-terms/route.ts`** — Popular search terms
  - GET: Return trending searches (from analytics)
  - **Test**: Return top 10 terms

- [ ] **`app/api/jobs/recently-filled/route.ts`** — Recently filled jobs
  - GET: Jobs marked as filled, sorted by date
  - **Test**: Return filled jobs

### Application APIs (1 endpoint)
- [ ] **`app/api/applicant/route.ts`** — Submit application
  - POST: Create Application record
  - Body: `{ jobId, resumeId, coverLetter? }`
  - Return: Application + job details
  - **Dependencies**: getCurrentUser, checkQuota
  - **Test**: Submit app, verify created, prevent duplicates

### Saved Jobs APIs (1 endpoint)
- [ ] **`app/api/seeker/saved-jobs/route.ts`** — CRUD saved jobs
  - GET: List saved jobs (with pagination)
  - POST: Save a job
  - DELETE: Unsave a job (with `?jobId=123`)
  - **Dependencies**: Prisma, getCurrentUser
  - **Test**: Save/unsave, list, prevent duplicates

### Resume APIs (6 endpoints)
- [ ] **`app/api/seeker/resumes/route.ts`** — Resume list CRUD
  - GET: List resumes (paginated)
  - POST: Create resume metadata
  - **Test**: List, create

- [ ] **`app/api/seeker/resume/route.ts`** — Primary resume management
  - GET: Get primary resume
  - PATCH: Set primary resume

- [ ] **`app/api/resume/route.ts`** — Shared resume APIs
  - PUT: Update resume
  - DELETE: Soft delete resume (mark as trashed)

- [ ] **`app/api/resume-critique/route.ts`** — Resume critique CRUD
  - POST: Request critique (deduct credits)
  - GET: List critiques
  - PUT: Update critique results

- [ ] **`app/api/upload/presigned-url/route.ts`** — Presigned upload URL
  - POST: `{ fileName, fileType }`
  - Return: Presigned URL + uploadId
  - **Dependencies**: storage.ts

- [ ] **`app/api/upload/confirm/route.ts`** — Upload confirmation
  - POST: `{ uploadId, fileName }`
  - Create Resume record in DB

- [ ] **`app/api/upload/delete/route.ts`** — File deletion
  - DELETE: `{ fileKey }`
  - Delete from Supabase Storage

### Cover Letter APIs (1 endpoint)
- [ ] **`app/api/seeker/cover-letter-templates/route.ts`** — CRUD cover letters
  - GET: List templates
  - POST: Create template
  - PUT: Update template
  - DELETE: Delete template

### Subscription APIs (4 endpoints)
- [ ] **`lib/subscription-plans.ts`** — Plan configuration
  - Export 4 plans: Trial, Gold, VIP, Annual
  - Pricing, resume limits, trial days

- [ ] **`lib/subscription-check.ts`** — Subscription checks
  - `hasActiveSubscription(seekerId)`
  - `getRemainingResumes(seekerId)`
  - `canUploadResume(seekerId)`

- [ ] **`app/api/seeker/subscription/route.ts`** — Subscription management
  - GET: Current subscription
  - POST: Create subscription (Stripe checkout)

- [ ] **`app/api/seeker/subscription/checkout/route.ts`** — Checkout session
  - POST: `{ priceId }`
  - Return: Stripe checkout URL

- [ ] **`app/api/seeker/subscription/purchase/route.ts`** — Process purchase
  - Handle post-checkout webhook

- [ ] **`app/api/seeker/subscription/payment-methods/route.ts`** — Payment method CRUD
  - GET: List payment methods
  - POST: Add method
  - DELETE: Remove method

### Seeker Profile APIs (4 endpoints)
- [ ] **`app/api/seeker/profile/route.ts`** — Profile CRUD
  - GET: Seeker profile
  - PATCH: Update profile (name, phone, bio, location, etc.)

- [ ] **`app/api/seeker/profile-picture/route.ts`** — Profile picture upload
  - POST: Upload picture (presigned URL)
  - Return: Updated profile picture URL

- [ ] **`app/api/seeker/settings/route.ts`** — Settings management
  - GET/PATCH: Notification preferences, privacy settings

- [ ] **`app/api/seeker/account/route.ts`** — Account management
  - GET: Account data
  - PATCH: Email/password change (via Clerk)
  - DELETE: Delete account (soft delete or hard delete?)

### Notification & Billing APIs (3 endpoints)
- [ ] **`app/api/seeker/notifications/route.ts`** — Notification preferences
  - GET: Preferences
  - PATCH: Update preferences

- [ ] **`app/api/seeker/billing-history/route.ts`** — Billing history
  - GET: Transaction history (paginated)
  - Return: List of charges

- [ ] **`app/api/seeker/transactions/route.ts`** — Detailed transactions
  - GET: Invoice details

### Premium Services APIs (2 endpoints)
- [ ] **`lib/additional-services.ts`** — Services configuration
  - Career Jumpstart ($299)
  - Interview Training ($399)
  - Career Strategist ($599)
  - Resume Revamp ($199)
  - LinkedIn Optimization ($99)
  - Cover Letter Professional ($49)

- [ ] **`app/api/seeker/services/route.ts`** — List services
  - GET: Available services (filtered by subscription tier)

- [ ] **`app/api/seeker/services/purchase/route.ts`** — Purchase service
  - POST: Purchase service (Stripe charge)
  - Create AdditionalServicePurchase record

### UI Components (15+ missing)
- [ ] **`components/seeker/ResumeUpload.tsx`** — Drag & drop upload
- [ ] **`components/seeker/ResumeCritiqueRequest.tsx`** — Critique form
- [ ] **`components/seeker/ResumeCritiqueResults.tsx`** — Results display
- [ ] **`components/resume-quota.tsx`** — Quota display
- [ ] **`components/resume-delete-dialog.tsx`** — Delete confirmation
- [ ] **`components/resume-trash.tsx`** — Trash/restore UI
- [ ] **`components/seeker/ResumeInUseDialog.tsx`** — Warning modal
- [ ] **`components/seeker/ProfileForm.tsx`** — Profile editor
- [ ] **`components/seeker/EmailChangeForm.tsx`** — Email form
- [ ] **`components/seeker/PasswordChangeForm.tsx`** — Password form
- [ ] **`components/seeker/NotificationPanel.tsx`** — Preferences
- [ ] **`components/seeker/EducationSection.tsx`** — Education editor
- [ ] **`components/seeker/SubscriptionUpgrade.tsx`** — Upgrade modal
- [ ] **`components/subscription/subscription-details.tsx`** — Plan display
- [ ] **`components/services/` (multiple)** — Service cards, modals

---

## 🎯 TDD Implementation Order (By Priority)

### Phase 1 Priority (Do First - 5 tasks)
1. **`lib/storage.ts`** — File upload needed for resume feature
2. **`lib/job-constants.ts`** — Constants needed for all search/filter APIs
3. **`lib/utils.ts`** — Used by all components/APIs
4. **`prisma/seed.ts`** — Demo data for testing
5. **`lib/stripe.ts`** + **`lib/stripe-webhook.ts`** — Payments (later in flow)

### Phase 3 Priority (High Impact - 8 tasks)
1. **`app/api/jobs/[id]/route.ts`** — Fix 404 on job detail page
2. **`app/api/seeker/saved-jobs/route.ts`** — Saved jobs feature
3. **`app/api/applicant/route.ts`** — Applications feature
4. **`app/api/upload/presigned-url/route.ts`** + **`confirm/route.ts`** — Resume upload
5. **`lib/subscription-plans.ts`** + **`lib/subscription-check.ts`** — Subscription checks
6. **`app/api/seeker/subscription/route.ts`** — Subscription API
7. **`app/api/seeker/profile/route.ts`** — Profile API
8. **`app/api/seeker/billing-history/route.ts`** — Billing history

### Phase 2 & Remaining (Medium Priority - 10+ tasks)
- Webhooks (needed for production)
- Team/user invitations (needed for multi-user support)
- Remaining Phase 3 APIs and components

---

## 🧪 Testing Strategy (TDD)

**For each missing item:**
1. Write test file (`__tests__/unit/*` or `__tests__/integration/*`)
2. Define test cases (happy path + error cases)
3. Run test (RED ❌)
4. Implement feature (to pass test)
5. Run test (GREEN ✅)
6. Refactor as needed
7. Commit with message: `feat: implement [feature]`

**Example:**
```typescript
// __tests__/unit/storage.test.ts
describe('Storage', () => {
  it('should generate presigned upload URL', async () => {
    const url = await generatePresignedUploadUrl('resumes', 'user-123/resume.pdf', 3600);
    expect(url).toContain('supabase');
    expect(url).toContain('token');
  });
});
```

---

## ✅ Verification Before Moving to Phase 4

Before starting Phase 4 (Employer Portal), verify:

1. All Phase 1-3 tests passing
2. All Phase 1-3 API routes compile without errors
3. Build command succeeds: `yarn build`
4. No 404s when testing key flows:
   - Sign up → Onboarding → Dashboard → Browse jobs → Save job → Apply → Check applications
5. All 15 existing API routes still working
6. Database records creating correctly
7. No console errors in dev tools

---

## 📝 Notes

- **Total Missing Tasks**: ~40 items across 3 phases
- **Estimated Implementation Time**: 3-4 days with TDD approach
- **Critical Path**: Phase 1 storage (blocks Phase 3 uploads), Phase 3 job APIs (blocks user flow)
- **No Bloat Rule**: Each task implements ONLY what's needed, no extra files or documentation
- **Testing Focus**: Integration tests for APIs, unit tests for utilities, UI tests for components

