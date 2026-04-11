# 📐 Ampertalent — Database Schema Plan

> Complete Prisma schema — 42+ models, 20+ enums — 100% feature parity with original.

---

## Overview

The database schema is **identical** to the original HireMyMom SaaS. We use the same Prisma schema with PostgreSQL on Supabase free tier. The only differences are branding-related comments.

---

## Enums (21 enums)

```prisma
enum UserRole {
  seeker
  employer
  admin
  team_member
  super_admin
}

enum MembershipPlan {
  none
  trial_monthly      // 3-day trial → $34.99/mo
  gold_bimonthly     // $49.99 every 2 months
  vip_quarterly      // $79.99 every 3 months
  annual_platinum    // $249.99/year
}

enum PackageType {
  starter
  professional
  enterprise
  unlimited
  standard              // $97 Standard Job Post
  featured              // $127 Featured Job Post
  email_blast           // $249 Solo Email Blast
  gold_plus             // $97 Gold Plus (6 month)
  standard_job_post
  featured_job_post
  solo_email_blast
  gold_plus_6_month
  concierge_lite        // $795
  concierge_level_1     // $1,695
  concierge_level_2     // $2,695
  concierge_level_3     // $3,695
  rush_service          // $500
  onboarding_service
  gold_plus_recurring_6mo
}

enum JobType {
  FULL_TIME
  PART_TIME
  PERMANENT
  TEMPORARY
  NOT_SPECIFIED
}

enum JobStatus {
  draft
  pending_vetting
  approved
  paused
  rejected
  expired
}

enum ApplicationStatus {
  pending
  reviewed
  interview
  rejected
  hired
}

enum SubscriptionStatus {
  active
  past_due
  canceled
  unpaid
}

enum InvoiceStatus {
  draft
  open
  paid
  void
}

enum ConciergeStatus {
  not_requested
  pending
  completed
}

enum JobCategory {
  ACCOUNTING_BOOKKEEPING
  ADMINISTRATION_VIRTUAL_ASSISTANT
  ADVERTISING
  BLOGGER
  BUSINESS_DEVELOPMENT
  COMPUTER_IT
  CONSULTANT
  CUSTOMER_SERVICE
  DATABASE_DEVELOPMENT
  DESIGN
  FINANCE
  GRAPHIC_DESIGN_ARTIST
  HUMAN_RESOURCES
  INTERNET_MARKETING_SPECIALIST
  MANAGER
  MARKETING_PUBLIC_RELATIONS
  MEDIA_SPECIALIST
  OTHER
  PARALEGAL_LEGAL
  PROGRAMMER
  RESEARCHER
  SALES
  SOCIAL_MEDIA
  STRATEGIC_PLANNER
  VIDEO_PRODUCTION_EDITING
  WEB_DESIGN_DEVELOPMENT
  WEBSITE_MANAGER
  WRITING_EDITING
}

enum NotificationType {
  // 50+ notification types covering all system events
  job_submitted
  job_approved
  job_rejected
  job_under_review
  new_application
  application_status_update
  low_credits
  job_expiring
  system_alert
  job_invitation
  seeker_welcome
  seeker_payment_confirmation
  seeker_subscription_reminder
  seeker_pre_signup
  employer_welcome
  employer_payment_confirmation
  employer_invitation_accepted
  employer_job_filled
  system_error
  processing_error
  bulk_rejection
  bulk_interview
  job_archived
  job_restored
  interview_scheduled
  interview_completed
  interview_stage_changed
  offer_extended
  offer_accepted
  offer_rejected
  admin_role_promoted
  admin_role_demoted
  service_purchase_confirmation
  service_status_update
  service_completed
  service_admin_alert
  exclusive_plan_offered
  exclusive_plan_activated
  exclusive_plan_dismissed
  exclusive_plan_reminder
  exclusive_plan_expired
  exclusive_plan_extended
  exclusive_plan_cancelled
  exclusive_plan_admin_alert
  exclusive_plan_extension_requested
  exclusive_plan_extension_approved
  exclusive_plan_extension_rejected
  follow_up_request
}

enum NotificationPriority { low, medium, high, critical }
enum ProfileVisibility { employers_only, private }
enum ExternalPaymentStatus { pending, completed, failed, requires_review, refunded }
enum FeaturedStatus { not_requested, not_started, pending, completed }
enum EmailBlastStatus { not_requested, not_started, pending, completed }
enum InterviewStage {
  initial_screening
  technical_interview
  behavioral_interview
  final_interview
  offer_extended
  offer_accepted
  offer_rejected
}
enum SeekerInterviewStatus { application_review, interview_process, decision_made }
enum critique_priority { standard, rush }
enum critique_status { pending, in_progress, completed }
```

---

## Core Models

### UserProfile — Central user identity

- Fields: id, clerkUserId, role, name, email, firstName, lastName, phone, timezone, profilePictureUrl
- Concierge fields: conciergeBio, conciergeTitle, conciergeSpecialties, conciergeExperience, isActiveConcierge
- Settings: tags, allowDirectMessages, messageNotificationEmail/InApp, isActive
- Legacy: stackUserId, legacyId
- Relations: employer, jobSeeker, sentMessages, receivedMessages, notifications, teamMemberships, etc.

### JobSeeker — Seeker profile extension

- Fields: headline, aboutMe, availability, skills[], portfolioUrls[], resumeUrl
- Membership: membershipPlan, membershipExpiresAt, resumeCredits, resumeLimit, resumesUsed
- Trial: trialEndsAt, isOnTrial, cancelledSeeker, cancelledAt, hasPreviousSubscription
- Profile: education (JSON), workExperience, professionalSummary, salaryExpectations
- Settings: profileVisibility, allowDirectMessages, applicationUpdates, emailAlerts, jobRecommendations, weeklyDigest, allowJobInvitations, showSalaryExpectations
- Billing: resumeCarryoverCount, lastBillingPeriodStart
- Relations: applications, subscriptions, resumes, savedJobs, coverLetterTemplates, paymentMethods, resumeCritiques, servicePurchases, cancellationSurveys

### Employer — Employer profile extension

- Fields: companyName, companyWebsite, companyLogoUrl, companyDescription, billingAddress, taxId
- Vetting: isVetted, vettedAt, vettedBy
- Exclusive plans: exclusivePlanType/Name/AmountCents/Cycles/OfferedAt/DismissedAt/ActivatedAt/Source
- Team: teamId
- Mission: missionStatement, coreValues
- Relations: jobs, packages, teamMembers, teamInvitations, conciergeRequests, conciergeChats, emailBlastRequests, featuredJobRequests, paymentMethods, servicePurchases

### Job — Job posting

- 40+ fields covering: title, pay range, type, description, skills, hours, schedule, location, status
- Lifecycle: status, rejectionReason, approvedAt, expiresAt, isPaused, pausedAt, isArchived, archivedAt
- Features: isFeatured, featuredStatus, isEmailBlast, emailBlastStatus, conciergeRequested, conciergeStatus
- Privacy: isCompanyPrivate, applicantsVisibleToEmployer, chatEnabled
- Stats: viewsCount
- Relations: applications, employer, savedByUsers, messages, conciergeChats, conciergeRequests, emailBlastRequests, featuredJobRequests, seekerConciergeChats
- Indexes: employer+status, category+type, status+expires, createdAt

### Application — Job application

- Fields: jobId, seekerId, resumeUrl, coverLetter, status, appliedAt
- Interview tracking: interviewStage, interviewScheduledAt, interviewCompletedAt, interviewerNotes
- Action tracking: nextActionRequired, nextActionDeadline
- Resume link: resumeId → Resume
- Relations: job, seeker, resume, interviewHistory, messages

---

## Feature Models

### Subscription & Billing

- **Subscription** — seekerId, plan, status, currentPeriodStart/End, cancelAtPeriodEnd, billingFrequency, nextBillingDate, authnetSubscriptionId/CustomerId, externalPaymentId, tier, tier_metadata
- **PaymentMethod** — employerId/seekerId, type, last4, brand, expiryMonth/Year, isDefault, authnetPaymentProfileId, billing address fields
- **Invoice** — employerPackageId, authnetTransactionId, amountDue, status, packageName, dueDate, paidAt
- **EmployerPackage** — employerId, packageType, listingsRemaining, featuredListingsRemaining/Used, expiry, recurring billing fields (isRecurring, billingFrequency, billingCyclesTotal/Completed, nextBillingDate, recurringAmountCents, arbSubscriptionId, recurringStatus), extension request fields
- **ExternalPayment** — userId, ghlTransactionId, authnetTransactionId, amount, planId, status
- **CancellationSurvey** — seekerId, subscriptionId, primaryReason, satisfaction ratings, feedback
- **SubscriptionCancellationLog** — admin-performed cancellations with before/after period ends

### Messaging

- **Message** — senderId, recipientId, content, isRead, deliveryStatus, applicationId, jobId, threadId, attachments
- **MessageThread** — participants[], lastMessageAt
- **MessageAttachment** — messageId, fileName, fileUrl, fileType, fileSize, mimeType
- **MessageTemplate** — userId, name, category, content, isDefault, usageCount
- **MessageDraft** — userId, recipientId, threadId, content, attachments (JSON)

### Concierge

- **ConciergeRequest** — jobId, employerId, status, assignedAdminId, discoveryCallNotes, optimizedJobDescription, shortlistedCandidates (JSON)
- **ConciergeChat** — jobId, employerId, adminId, status → messages
- **ConciergeChatMessage** — chatId, senderId, senderType, message, messageType, fileUrl/Name/Size, readAt
- **SeekerConciergeChat** — jobId, seekerId, adminId → messages
- **SeekerConciergeChatMessage** — same structure as ConciergeChatMessage

### Services & Add-ons

- **AdditionalService** — serviceId, name, description, price, category, userType, isActive, features[]
- **AdditionalServicePurchase** — serviceId, userId, seekerId, employerId, paymentId, amountPaid, status, assignedAdminId, fulfillmentNotes, completedAt, employerPackageId
- **ServiceRequestAudit** — serviceRequestId, changedBy, changeType, previousValue, newValue, description
- **PurchasedAddOn** — employerPackageId, addOnId, quantity, price, expiresAt

### Job Features

- **FeaturedJobRequest** — jobId, employerId, packageId, status, adminNotes, dates (requested/started/completed/emailSent), extension fields
- **EmailBlastRequest** — jobId, employerId, packageId, status, adminNotes, dates, logoUrl, content, customLink, useJobLink, expiresAt
- **Resume** — seekerId, filename, fileUrl, fileSize, isPrimary, status, deletedAt (soft delete)
- **ResumeCritique** — seekerId, resumeUrl, analysis (JSON), cost, priority, reviewerId, targetIndustry/Role, status
- **SavedJob** — seekerId, jobId, savedAt (unique constraint)
- **CoverLetterTemplate** — seekerId, title, content, isDefault
- **InterviewHistory** — applicationId, stage, scheduledAt, completedAt, notes, interviewerId, feedback

### Teams & Invitations

- **TeamMember** — employerId, userId, email, name, role, status, invitedBy, dates
- **TeamInvitation** — employerId, email, role, invitedBy, invitationToken (unique), expiresAt, acceptedAt, clerkInvitationId
- **UserInvitation** — email, role, fullName, invitedBy, invitationToken (unique), expiresAt, acceptedAt, clerkInvitationId, pendingPackageType/Cycles/AmountCents

### Notifications

- **Notification** — userId, type, title, message, data (JSON), read, priority, actionUrl, readAt

### Pending/Draft

- **PendingSignup** — onboardingData, selectedPlan, sessionToken, returnUrl, checkoutSessionId, expiresAt, email, clerkUserId
- **PendingJobPost** — email, jobData, selectedPackage, sessionToken, returnUrl, checkoutSessionId, expiresAt, clerkUserId

### CRM Sync

- **CrmSyncSettings** — isGlobalSyncEnabled, defaultSyncDirection, syncOnCreate/Update, batchSize, retryAttempts/Delay, GHL connection fields
- **CrmSyncChangeLog** — superAdminId/Name, actionType, actionDetails (JSON), entityType/Id, oldValue/newValue (JSON)
- **GhlField** — ghlFieldId/Key, name, dataType, picklistOptions (JSON), isSystemField
- **AppField** — fieldKey, name, dataType, modelName, isSystemField, isRequired, description, groupId
- **FieldGroup** — name, description, sortOrder
- **FieldMapping** — groupId, ghlFieldId, appFieldId, syncDirection, isEnabled, displayLabel, transformRules (JSON), createdBy, lastSyncedAt/Status/Error, isAutoGenerated
- **CrmSyncLog** — mappingId, userId, direction, status, errorMessage, dataSnapshot (JSON), durationMs

### Admin & Ops

- **AdminActionLog** — adminId, actionType, targetEntity, targetId, details (JSON)
- **ExecutionLog** — taskName, status, startedAt, completedAt, durationMs, summary, logOutput, triggeredBy
- **ActionLog** — executionId, actionType, entityType/Id, status, message, details
- **migration_state** — migration_name, last_migrated_id, total_migrated (for data migration tracking)

---

## Key Indexes (from schema)

- UserProfile: clerkUserId
- JobSeeker: membershipPlan+membershipExpiresAt, skills (GIN), profileVisibility+isSuspended+updatedAt
- Job: employer+status, createdAt, employer+createdAt, employer+archived, category+type, status+expires, employer+status+expires
- Application: resumeId
- Subscription: tier, currentPeriodStart+End
- Resume: seekerId, isPrimary, seekerId+status
- Message: senderId, recipientId, applicationId, jobId, threadId, createdAt
- Notification: userId, type, read, createdAt
- And 30+ more indexes for performance

---

## Schema Notes

1. **No schema changes needed** — the Prisma schema is directly portable
2. **Legacy fields** (stackUserId, legacyId, legacy_id) are kept for completeness but unused in new clone
3. **The same `prisma/schema.prisma` file** from the original works as-is
4. **Supabase free tier** (500 MB) easily accommodates this schema with demo data
