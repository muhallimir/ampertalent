# 🏢 Phase 4 — Employer Portal

> Full employer experience: dashboard, job posting, application management, talent search, packages, team management.

---

## 4.1 Employer Layout & Dashboard

### Tasks

- [ ] Create `app/employer/layout.tsx` — sidebar navigation (dashboard, jobs, applications, talent, messages, team, billing, profile, settings)
- [ ] Create `app/employer/dashboard/page.tsx` — overview (active jobs, total applications, package status, featured/email blast status)
- [ ] Create `lib/employerStatus.ts` — employer status utilities

### TDD Tests

```
__tests__/ui/employer/dashboard.test.tsx
- should render dashboard stats cards
- should show active jobs count
- should show package remaining listings
- should show pending applications count
```

---

## 4.2 Job Posting & Management

### Tasks

- [ ] Create `app/employer/jobs/page.tsx` — job listings (tabs: active, draft, pending, archived)
- [ ] Create `app/employer/jobs/new/page.tsx` — create new job posting
- [ ] Create `app/employer/jobs/[id]/page.tsx` — edit/manage job
- [ ] Create `app/employer/jobs/layout.tsx` — jobs section layout
- [ ] Create `components/employer/SimpleJobPostingForm.tsx` — comprehensive job form (28 categories, job types, pay range, skills, hours, remote schedule, requirements, benefits, contact info)
- [ ] Create `components/employer/JobFormSkeleton.tsx` — loading skeleton
- [ ] Create `components/employer/JobPostingCheckout.tsx` — package selection + checkout
- [ ] Create `components/employer/PackageSelection.tsx` — package picker (Standard/Featured/Email Blast/Gold Plus/Concierge)
- [ ] Create `app/api/employer/jobs/route.ts` — job CRUD
- [ ] Create `app/api/employer/jobs/[id]/route.ts` — individual job management (pause, resume, archive, restore)
- [ ] Create `lib/job-constants.ts` — job categories, types, pay ranges

### TDD Tests

```
__tests__/integration/employer/jobs.test.ts
- should create job posting as draft
- should submit job for vetting (status: pending_vetting)
- should edit job details
- should pause/resume job
- should archive/restore job
- should consume package listing on approval
- should validate required job fields
- should enforce package listing limits

__tests__/ui/employer/job-form.test.tsx
- should render all 28 category options
- should render job type selector
- should render pay range inputs
- should render skills tag input
```

---

## 4.3 Application Management

### Tasks

- [ ] Create `app/employer/applications/page.tsx` — all applications across jobs
- [ ] Create `components/employer/ApplicationCard.tsx` — application card with status actions
- [ ] Create `components/employer/ApplicantProfileModal.tsx` — seeker profile view
- [ ] Create `components/employer/InterviewPipeline.tsx` — Kanban-style interview pipeline (7 stages)
- [ ] Create `components/employer/QuickStageDropdown.tsx` — quick stage change dropdown
- [ ] Create `app/api/employer/applications/route.ts` — list applications
- [ ] Create `app/api/employer/applications/[id]/route.ts` — update application status

### TDD Tests

```
__tests__/integration/employer/applications.test.ts
- should list all applications for employer's jobs
- should update application status (pending → reviewed → interview → hired/rejected)
- should move through interview stages (7 stages)
- should send notification on status change
- should perform bulk status updates
- should record interview history

__tests__/ui/employer/interview-pipeline.test.tsx
- should render pipeline with all 7 stages
- should show application count per stage
```

---

## 4.4 Talent Search

### Tasks

- [ ] Create `app/employer/talent/page.tsx` — talent directory with search/filters
- [ ] Create `components/employer/TalentCard.tsx` — seeker preview card
- [ ] Create `components/employer/TalentProfileModal.tsx` — detailed seeker profile view
- [ ] Create `components/employer/VirtualizedTalentGrid.tsx` — virtualized grid for large lists
- [ ] Create `components/employer/JobInvitationModal.tsx` — invite seeker to apply
- [ ] Create `app/api/employer/talent/route.ts` — search seekers
- [ ] Create `lib/search.ts` — seeker search with filters

### TDD Tests

```
__tests__/integration/employer/talent.test.ts
- should search seekers by skills
- should filter by availability
- should filter by membership plan
- should send job invitation to seeker
- should respect profile visibility settings

__tests__/ui/employer/talent.test.tsx
- should render virtualized grid
- should open profile modal on click
```

---

## 4.5 Package & Billing System

### Tasks

- [ ] Create `app/employer/billing/page.tsx` — billing overview (current package, history, payment methods)
- [ ] Create `components/employer/CreditConfirmation.tsx` — purchase confirmation modal
- [ ] Create `components/employer/ExclusivePlanCard.tsx` — exclusive plan display
- [ ] Create `components/employer/ExclusivePlanModal.tsx` — activate exclusive plan
- [ ] Create `lib/employer-packages.ts` — package configuration (Standard/Featured/Email Blast/Gold Plus/Concierge levels)
- [ ] Create `lib/employer-package-provisioning.ts` — package provisioning logic
- [ ] Create `app/api/employer/billing/purchase/route.ts` — purchase package
- [ ] Create `app/api/employer/billing/payment-methods/route.ts` — payment method CRUD
- [ ] Create `app/api/employer/credits/route.ts` — credit balance check
- [ ] Create `app/api/employer/transactions/route.ts` — transaction history
- [ ] Create `app/api/employer/exclusive-plan/route.ts` — exclusive plan management
- [ ] Create `app/api/employer/extension-request/route.ts` — package extension request

### TDD Tests

```
__tests__/integration/employer/packages.test.ts
- should purchase standard package (Stripe test mode)
- should create EmployerPackage with correct listings
- should purchase featured package with featured listings
- should purchase concierge package with add-ons
- should handle Gold Plus recurring setup
- should track package expiration
- should handle extension requests

__tests__/unit/employer-packages.test.ts
- should return all package configs with correct pricing
- should return concierge packages
```

---

## 4.6 Featured Jobs & Email Blasts

### Tasks

- [ ] Create `components/employer/EmailBlastDetailsForm.tsx` — email blast content form (logo, content, custom link)
- [ ] Create `app/api/employer/jobs/[id]/featured/route.ts` — request featured placement
- [ ] Create `app/api/employer/jobs/[id]/email-blast/route.ts` — request email blast

### TDD Tests

```
__tests__/integration/employer/featured-jobs.test.ts
- should create featured job request
- should create email blast request with content
- should consume featured listing from package
```

---

## 4.7 Team Management

### Tasks

- [ ] Create `app/employer/team/page.tsx` — team members list + invite
- [ ] Create `components/employer/TeamManagement.tsx` — team management UI
- [ ] Create `app/api/team/route.ts` — team CRUD
- [ ] Create `app/api/team-invitation/route.ts` — team invitation management

### TDD Tests

```
__tests__/integration/employer/team.test.ts
- should invite team member by email
- should list team members with status
- should remove team member
- should team member access employer's jobs
```

---

## 4.8 Company Profile

### Tasks

- [ ] Create `app/employer/company-profile/page.tsx` — company profile management
- [ ] Create `components/employer/CompanyForm.tsx` — company profile form (name, website, description, logo, mission, core values)
- [ ] Create `app/employer/profile/page.tsx` — personal profile
- [ ] Create `components/employer/EmailChangeForm.tsx` — email change
- [ ] Create `components/employer/PasswordChangeForm.tsx` — password change
- [ ] Create `app/api/employer/profile/route.ts` — profile CRUD
- [ ] Create `app/api/employer/company-logo/route.ts` — logo upload

### TDD Tests

```
__tests__/integration/employer/profile.test.ts
- should update company profile
- should upload company logo
- should update personal profile
```

---

## 4.9 Employer Settings & Notifications

### Tasks

- [ ] Create `app/employer/settings/page.tsx` — employer settings
- [ ] Create `app/employer/notifications/page.tsx` — notification center
- [ ] Create `app/api/employer/notifications/route.ts` — notification CRUD

### TDD Tests

```
__tests__/integration/employer/settings.test.ts
- should update employer settings
- should list notifications with pagination
- should mark notifications as read
```

---

## 4.10 Concierge Requests

### Tasks

- [ ] Create `app/employer/concierge/page.tsx` — concierge requests overview
- [ ] Create `components/employer/ConciergeRequest.tsx` — request concierge for job
- [ ] Create `components/employer/EmployerChatButton.tsx` — chat with assigned admin
- [ ] Create `lib/concierge-service.ts` — concierge service logic
- [ ] Create `app/api/employer/[id]/concierge/route.ts` — concierge API

### TDD Tests

```
__tests__/integration/employer/concierge.test.ts
- should request concierge service for job
- should check existing concierge request
- should send chat message to admin
```

---

## Deliverables Checklist

- [ ] Employer dashboard with stats
- [ ] Job posting form with 28 categories, all fields
- [ ] Job lifecycle management (draft → pending → approved → paused → archived)
- [ ] Application management with 7-stage interview pipeline
- [ ] Talent search with virtualized grid and invitation system
- [ ] Package purchase system (6+ package types, Stripe test mode)
- [ ] Concierge package purchase with add-ons
- [ ] Featured job & email blast requests
- [ ] Team management with invitations
- [ ] Company profile management with logo upload
- [ ] Exclusive plan activation
- [ ] Extension request system
- [ ] Billing history and payment methods
- [ ] All Phase 4 tests passing
