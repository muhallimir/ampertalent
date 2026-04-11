# 👤 Phase 3 — Seeker Portal

> Full job seeker experience: dashboard, job search, applications, resumes, subscriptions, services, profile.

---

## 3.1 Seeker Layout & Dashboard

### Tasks

- [x] Create `app/seeker/layout.tsx` — sidebar navigation layout (dashboard, jobs, applications, saved-jobs, resume, messages, services, profile, settings, billing)
- [x] Create `app/seeker/dashboard/page.tsx` — overview stats (active applications, saved jobs, subscription status, resume credits, profile completion)
- [x] Create `components/nav/` — sidebar navigation components
- [x] Create `components/sidebar-layout.tsx` — shared sidebar layout component
- [ ] Create `lib/profile-completion.ts` — profile completion calculator

### TDD Tests

```
__tests__/ui/seeker/dashboard.test.tsx
- should render dashboard with stats cards
- should show profile completion percentage
- should show subscription status
- should show recent applications

__tests__/unit/profile-completion.test.ts
- should calculate 0% for empty profile
- should calculate 100% for complete profile
- should list missing fields
```

---

## 3.2 Job Search & Browsing

### Tasks

- [x] Create `app/seeker/jobs/page.tsx` — job listing with advanced search
- [x] Create `app/seeker/jobs/[id]/page.tsx` — job detail page
- [x] Create `components/seeker/AdvancedJobSearch.tsx` — faceted search UI
- [x] Create `components/seeker/JobCard.tsx` — job list card
- [x] Create `components/seeker/FeaturedJobCard.tsx` — featured job card (premium styling)
- [x] Create `components/seeker/JobFilters.tsx` — filter sidebar
- [x] Create `components/search/AdvancedJobSearch.tsx` — shared search component
- [x] Create `lib/advanced-search.ts` — search service with Prisma queries
- [x] Create `lib/search.ts` — basic search service
- [ ] Create `app/api/jobs/search/route.ts` — search API endpoint
- [x] Create `app/api/jobs/[id]/route.ts` — job detail API - DONE
- [x] Create `app/api/jobs/featured/route.ts` — featured jobs API
- [ ] Create `app/api/jobs/popular-terms/route.ts` — popular search terms
- [ ] Create `app/api/jobs/recently-filled/route.ts` — recently filled jobs

### TDD Tests

```
__tests__/unit/advanced-search.test.ts
- should search by keyword
- should filter by category (28 categories)
- should filter by job type (full-time, part-time, etc.)
- should filter by pay range
- should filter by skills
- should filter by flexible hours
- should filter by date posted
- should sort by relevance, date, salary
- should paginate results
- should return faceted counts

__tests__/ui/seeker/job-search.test.tsx
- should render search bar
- should render filter sidebar
- should render job cards
- should show featured jobs prominently
```

---

## 3.3 Job Applications

### Tasks

- [x] Create `app/seeker/applications/page.tsx` — applications list with status tracking
- [x] Create `components/seeker/ApplicationForm.tsx` — apply modal (resume select + cover letter)
- [ ] Create `components/seeker/InterviewProgress.tsx` — interview stage tracker
- [ ] Create `components/seeker/FollowUpModal.tsx` — follow-up request
- [x] Create `components/application-status-badge.tsx` — status badge component
- [x] Create `app/api/seeker/applications/route.ts` — list applications
- [x] Create `app/api/applicant/route.ts` — submit application - DONE

### TDD Tests

```
__tests__/integration/seeker/applications.test.ts
- should submit application with resume and cover letter
- should track application status changes
- should show interview progress stages
- should list all seeker applications with pagination
- should prevent duplicate applications to same job

__tests__/ui/seeker/application-form.test.tsx
- should render resume selector
- should render cover letter editor
- should validate required fields
```

---

## 3.4 Saved Jobs

### Tasks

- [x] Create `app/seeker/saved-jobs/page.tsx` — saved jobs list
- [x] Create `app/api/seeker/saved-jobs/route.ts` — CRUD for saved jobs - DONE
- [x] Create `components/providers/SavedJobsProvider.tsx` — saved jobs context

### TDD Tests

```
__tests__/integration/seeker/saved-jobs.test.ts
- should save a job
- should unsave a job
- should list saved jobs
- should prevent duplicate saves (unique constraint)
```

---

## 3.5 Resume Management

### Tasks

- [x] Create `app/seeker/resume-critique/page.tsx` — resume critique request page
- [ ] Create `components/seeker/ResumeUpload.tsx` — resume upload with drag-and-drop
- [ ] Create `components/seeker/ResumeCritiqueRequest.tsx` — critique request form
- [ ] Create `components/seeker/ResumeCritiqueResults.tsx` — critique results display
- [ ] Create `components/resume-quota.tsx` — resume usage quota display
- [ ] Create `components/resume-delete-dialog.tsx` — delete confirmation
- [ ] Create `components/resume-trash.tsx` — soft-deleted resumes (trash)
- [ ] Create `components/seeker/ResumeInUseDialog.tsx` — warning when deleting in-use resume
- [ ] Create `lib/resume-upload.ts` — upload logic with quota check
- [ ] Create `lib/resume-credits.ts` — credit management
- [ ] Create `lib/resume-critique.ts` — critique analysis system
- [ ] Create `app/api/seeker/resumes/route.ts` — CRUD for resumes
- [ ] Create `app/api/seeker/resume/route.ts` — primary resume management
- [ ] Create `app/api/resume/route.ts` — shared resume API
- [ ] Create `app/api/resume-critique/route.ts` — critique CRUD
- [ ] Create `app/api/upload/presigned-url/route.ts` — presigned URL generation
- [ ] Create `app/api/upload/confirm/route.ts` — upload confirmation
- [ ] Create `app/api/upload/delete/route.ts` — file deletion

### TDD Tests

```
__tests__/unit/resume-upload.test.ts
- should validate file type (PDF, DOC, DOCX)
- should validate file size (max 10MB)
- should check resume quota before upload
- should increment resumesUsed counter
- should set first resume as primary

__tests__/unit/resume-credits.test.ts
- should grant credits based on membership plan
- should deduct credits on resume upload
- should prevent upload when no credits remain

__tests__/integration/seeker/resume.test.ts
- should upload resume to Supabase Storage
- should set resume as primary
- should soft-delete resume
- should restore resume from trash
```

---

## 3.6 Cover Letter Templates

### Tasks

- [ ] Create `components/seeker/CoverLetterTemplates.tsx` — templates list
- [ ] Create `components/seeker/CoverLetterTemplateCard.tsx` — template card
- [ ] Create `components/seeker/CoverLetterTemplateForm.tsx` — create/edit template
- [ ] Create `app/api/seeker/cover-letter-templates/route.ts` — CRUD

### TDD Tests

```
__tests__/integration/seeker/cover-letters.test.ts
- should create cover letter template
- should edit template
- should delete template
- should set default template
```

---

## 3.7 Subscription Management

### Tasks

- [x] Create `app/seeker/subscription/page.tsx` — plan selection & management
- [x] Create `app/seeker/membership/page.tsx` — current membership details
- [ ] Create `components/seeker/SubscriptionUpgrade.tsx` — upgrade/downgrade flow
- [ ] Create `components/subscription/subscription-details.tsx` — current plan display
- [ ] Create `lib/subscription-plans.ts` — plan configuration (Trial/Gold/VIP/Annual)
- [ ] Create `lib/subscription-check.ts` — active subscription checks
- [ ] Create `app/api/seeker/subscription/route.ts` — subscription management
- [ ] Create `app/api/seeker/subscription/checkout/route.ts` — checkout session
- [ ] Create `app/api/seeker/subscription/purchase/route.ts` — process purchase
- [ ] Create `app/api/seeker/subscription/payment-methods/route.ts` — payment method CRUD

### TDD Tests

```
__tests__/unit/subscription-plans.test.ts
- should return 4 subscription plans with correct pricing
- should calculate trial duration correctly
- should calculate resume limits per plan

__tests__/integration/seeker/subscription.test.ts
- should create trial subscription (Stripe test mode)
- should upgrade from trial to gold
- should cancel subscription with survey
- should handle subscription expiration
```

---

## 3.8 Seeker Profile & Settings

### Tasks

- [x] Create `app/seeker/profile/page.tsx` — profile management
- [x] Create `app/seeker/settings/page.tsx` — settings page
- [ ] Create `components/seeker/ProfileForm.tsx` — profile edit form
- [ ] Create `components/seeker/EmailChangeForm.tsx` — email change
- [ ] Create `components/seeker/PasswordChangeForm.tsx` — password change
- [ ] Create `components/seeker/NotificationPanel.tsx` — notification preferences
- [ ] Create `components/seeker/EducationSection.tsx` — education editor
- [ ] Create `app/api/seeker/profile/route.ts` — profile CRUD
- [ ] Create `app/api/seeker/profile-picture/route.ts` — profile picture upload
- [ ] Create `app/api/seeker/settings/route.ts` — settings management
- [ ] Create `app/api/seeker/account/route.ts` — account management
- [ ] Create `app/api/seeker/notifications/route.ts` — notification preferences

### TDD Tests

```
__tests__/integration/seeker/profile.test.ts
- should update seeker profile
- should upload profile picture
- should update notification preferences
- should download account data (GDPR)
```

---

## 3.9 Seeker Billing

### Tasks

- [x] Create `app/seeker/billing/page.tsx` — billing history & payment methods
- [ ] Create `app/api/seeker/billing-history/route.ts` — transaction history
- [ ] Create `app/api/seeker/transactions/route.ts` — detailed transactions

### TDD Tests

```
__tests__/integration/seeker/billing.test.ts
- should list billing history
- should show payment method details
- should manage payment methods
```

---

## 3.10 Premium Services

### Tasks

- [x] Create `app/seeker/services/page.tsx` — services catalog
- [ ] Create `components/services/` — service cards, purchase modals
- [ ] Create `lib/additional-services.ts` — services configuration (Career Jumpstart, Interview Training, Career Strategist, Resume Revamp, etc.)
- [ ] Create `app/api/seeker/services/route.ts` — list available services
- [ ] Create `app/api/seeker/services/purchase/route.ts` — purchase service

### TDD Tests

```
__tests__/unit/additional-services.test.ts
- should return all active seeker services
- should calculate correct pricing

__tests__/integration/seeker/services.test.ts
- should purchase service (Stripe test mode)
- should create AdditionalServicePurchase record
```

---

## Deliverables Checklist

- [ ] Seeker dashboard with stats
- [ ] Advanced job search with 28 categories, filters, sorting, pagination
- [ ] Job application flow with resume + cover letter
- [ ] Saved jobs CRUD
- [ ] Resume management with upload, quota, credits, soft delete
- [ ] Resume critique request/results
- [ ] Cover letter templates CRUD
- [ ] Subscription management (4 tiers + Stripe test mode)
- [ ] Profile management with all fields
- [ ] Settings (notification preferences, email/password change)
- [ ] Billing history
- [ ] Premium services catalog + purchase
- [ ] All Phase 3 tests passing
