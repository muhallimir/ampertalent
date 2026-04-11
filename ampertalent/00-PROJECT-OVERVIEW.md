# 🚀 Ampertalent — Portfolio Clone Project Overview

> **A 1:1 feature-accurate clone of the HireMyMom SaaS platform, rebuilt from scratch using 100% free-tier services for portfolio demonstration.**

---

## 📛 Project Name: **Ampertalent**

_"Where flexible talent meets opportunity."_

---

## 🎯 Purpose

This is a **portfolio showcase project** — a complete, production-grade remote job board SaaS platform that demonstrates full-stack engineering competency across:

- Multi-role authentication & authorization (5 roles)
- Complex payment & subscription lifecycle management
- Real-time notifications & messaging
- Admin dashboards with analytics & CRM integration
- Resume/file management with cloud storage
- Concierge/white-glove service workflow
- Team management & impersonation
- Cron-driven recurring billing & membership lifecycle
- Advanced search with faceted filtering
- PDF generation, email templating, and more

---

## 📊 Original System Analysis (from codebase — NOT from outdated markdown docs)

### Architecture

| Layer               | Original Tech                                      | Status in Codebase |
| ------------------- | -------------------------------------------------- | ------------------ |
| Framework           | Next.js 16 (App Router + Turbopack)                | ✅ Active          |
| Language            | TypeScript                                         | ✅ Active          |
| UI Library          | React 19 + Radix UI + Tailwind CSS + shadcn/ui     | ✅ Active          |
| Auth                | Clerk (`@clerk/nextjs` v6)                         | ✅ Active          |
| Database            | PostgreSQL (Supabase-hosted)                       | ✅ Active          |
| ORM                 | Prisma 6.8                                         | ✅ Active          |
| Payment (primary)   | Authorize.net (CIM + ARB)                          | ✅ Active          |
| Payment (secondary) | PayPal Billing Agreements (Reference Transactions) | ✅ Active          |
| File Storage        | AWS S3 (presigned URLs)                            | ✅ Active          |
| Email               | Resend (transactional)                             | ✅ Active          |
| CRM Sync            | GoHighLevel API                                    | ✅ Active          |
| Error Monitoring    | Bugsnag                                            | ✅ Active          |
| Cache               | Upstash Redis (REST)                               | ✅ Active          |
| Real-time           | SSE (Server-Sent Events)                           | ✅ Active          |
| Hosting             | Vercel (with Cron Jobs)                            | ✅ Active          |
| PDF Generation      | jsPDF + jspdf-autotable                            | ✅ Active          |
| Markdown Editor     | `@uiw/react-md-editor`                             | ✅ Active          |
| Charts              | Recharts                                           | ✅ Active          |
| Forms               | React Hook Form + Zod validation                   | ✅ Active          |
| Virtual Scrolling   | react-virtuoso                                     | ✅ Active          |

### User Roles (5 roles from `UserRole` enum in Prisma schema)

| Role          | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| `seeker`      | Job seekers — browse jobs, apply, manage resumes, subscriptions, services |
| `employer`    | Employers — post jobs, manage packages, view talent, team mgmt            |
| `admin`       | Admin — vet jobs, manage users, CRM sync, analytics, billing mgmt         |
| `super_admin` | Super Admin — all admin powers + CRM settings, system config              |
| `team_member` | Employer team — invited members with employer-scoped access               |

### Database Models (42+ models in Prisma schema)

**Core Models:** UserProfile, JobSeeker, Employer, Job, Application, Subscription, EmployerPackage, Invoice, PaymentMethod, Resume, Message, MessageThread, Notification

**Feature Models:** ConciergeRequest, ConciergeChat, ConciergeChatMessage, SeekerConciergeChat, SeekerConciergeChatMessage, SavedJob, CoverLetterTemplate, TeamMember, TeamInvitation, UserInvitation, PendingSignup, PendingJobPost, FeaturedJobRequest, EmailBlastRequest, ResumeCritique, CancellationSurvey, SubscriptionCancellationLog, AdditionalServicePurchase, AdditionalService, ServiceRequestAudit, PurchasedAddOn, InterviewHistory

**CRM/Sync Models:** CrmSyncSettings, CrmSyncChangeLog, CrmSyncLog, GhlField, AppField, FieldMapping, FieldGroup

**Ops Models:** ExternalPayment, AdminActionLog, ExecutionLog, ActionLog, MessageDraft, MessageTemplate, MessageAttachment

### Enums (20+ enums)

UserRole, MembershipPlan (none/trial_monthly/gold_bimonthly/vip_quarterly/annual_platinum), PackageType (18 variants), JobType, JobStatus, ApplicationStatus, SubscriptionStatus, InvoiceStatus, ConciergeStatus, JobCategory (28 categories), NotificationType (50+ types), NotificationPriority, ProfileVisibility, ExternalPaymentStatus, FeaturedStatus, EmailBlastStatus, InterviewStage (7 stages), SeekerInterviewStatus, critique_priority, critique_status

---

## 🔧 Key Feature Modules (from actual codebase routes & components)

### 1. Authentication & Onboarding

- Clerk-based sign-in/sign-up with SSO callback
- Role-based middleware protection (seeker/employer/admin routes)
- Multi-step onboarding flow with role selection
- Admin invitation system (auto-creates admin profiles)
- Team member invitation system
- User invitation with pending signup management

### 2. Job Seeker Portal (`/seeker/*`)

- **Dashboard** — overview, stats, quick actions
- **Job Search** — advanced faceted search (28 categories, job types, pay range, skills, flexible hours, date posted)
- **Job Applications** — apply with resume + cover letter, track status
- **Saved Jobs** — bookmark/save jobs for later
- **Resume Management** — upload multiple resumes to S3, set primary, quota/credit system
- **Resume Critique** — request professional resume reviews (paid service with priority levels)
- **Cover Letter Templates** — create/manage reusable cover letters
- **Subscription Management** — 4 tiers (Trial/Gold/VIP/Annual), upgrade/downgrade, cancel with survey
- **Payment Methods** — add/edit credit cards via Stripe Elements
- **Billing History** — transaction history, invoices
- **Concierge Chat** — seeker-to-admin chat for job-specific assistance
- **Messaging** — threaded messages with employers, file attachments, drafts, templates
- **Notifications** — in-app + email notifications, real-time SSE, preferences
- **Profile** — personal info, skills, portfolio URLs, education, work experience, professional summary, profile picture upload
- **Settings** — email/password change, notification preferences, profile visibility
- **Premium Services** — purchase add-on services (Career Jumpstart, Interview Training, Career Strategist, Resume Revamp, etc.)
- **Membership Plans** with trial (3-day free trial → $34.99/mo), Gold ($49.99/2mo), VIP Platinum ($79.99/3mo), Annual Platinum ($249.99/yr)

### 3. Employer Portal (`/employer/*`)

- **Dashboard** — job stats, application overview, package status
- **Job Posting** — create/edit jobs with 28 categories, rich description, pay range, requirements, skills
- **Job Management** — draft/pending/approved/paused/rejected/expired lifecycle, pause/resume, archive
- **Application Management** — review, interview pipeline (7 stages), bulk actions, status tracking
- **Interview Pipeline** — initial screening → technical → behavioral → final → offer extended/accepted/rejected
- **Talent Search** — browse seeker profiles with virtualized grid, filters, profile modals
- **Job Invitations** — invite seekers to apply for specific jobs
- **Package System** — Standard ($97), Featured ($127), Email Blast ($249), Gold Plus ($97/6mo recurring)
- **Concierge Packages** — Lite ($795), Level I ($1,695), Level II ($2,695), Level III ($3,695), Rush Service ($500)
- **Featured Job Requests** — request featured placement with admin fulfillment
- **Email Blast Requests** — request solo email blasts with custom content
- **Team Management** — invite team members, manage roles
- **Company Profile** — company info, logo upload, mission statement, core values
- **Messaging** — communication with seekers, message templates
- **Billing** — payment methods, transaction history, package management
- **Exclusive Plans** — admin-offered custom plans per employer
- **Extension Requests** — request package extensions from admin

### 4. Admin Portal (`/admin/*`)

- **Dashboard** — platform-wide stats and metrics
- **Job Vetting** — approve/reject submitted jobs with rejection reasons
- **Job Monitoring** — active job health, expired, paused tracking
- **User Management** — seekers, employers, admins list with search/filter
- **Seeker Management** — view/edit seeker profiles, subscription details, suspend
- **Employer Management** — view/edit employer profiles, vetting status, packages
- **Admin Management** — invite new admins, manage admin roles (admin ↔ super_admin)
- **Concierge Management** — manage concierge requests, assign admins, chat
- **Featured Job Management** — process featured job requests
- **Solo Email Blast Management** — process email blast requests
- **Resume Critique Management** — assign reviewers, manage critique requests
- **Subscription Management** — view/modify seeker subscriptions, cancel with logging
- **Billing Requests** — review package extension requests
- **Exclusive Offers** — create/manage custom plans for specific employers
- **CRM Sync** — HubSpot CRM field mapping, sync settings, connection testing (super_admin)
- **Analytics Dashboard** — platform metrics, revenue, user engagement, job performance
- **Enhanced Analytics** — deep-dive analytics with charts (Recharts)
- **Sales Dashboard** — revenue tracking, payment method breakdown
- **Reports** — generate CSV/PDF/JSON reports for various metrics
- **Logs** — execution logs, action logs, cron job monitoring
- **Settings** — platform configuration, notification settings
- **Storage Management** — S3 file browser
- **Transaction Lookup** — search Stripe transactions
- **Super Admin** — system-level settings, CRM config (super_admin only)
- **User Impersonation** — admins can impersonate seekers/employers to debug issues
- **Pending Checkouts** — monitor abandoned checkout sessions
- **Webhook Manager** — configure external webhook endpoints

### 5. Payment & Billing System

- **Stripe Integration (Test Mode)** — Customers, Payment Intents, Subscriptions, Invoices, Refunds, Webhooks
- **Seeker Subscriptions** — recurring billing with cron jobs, trial handling, cancellation surveys
- **Employer Packages** — one-time purchases + 6-month recurring (Gold Plus)
- **Concierge Service Purchases** — with add-ons
- **Premium Service Purchases** — one-time add-on services
- **Resume Critique Payments** — per-critique charges
- **Invoice Generation** — PDF invoices with jsPDF
- **Payment Method Management** — add/edit/delete cards via Stripe Elements
- **Admin Payment Notifications** — order emails to admin team
- **Customer Payment Emails** — payment confirmations + renewal reminders via Resend

### 6. Communication & Chat System

- **Threaded Messaging** — seeker ↔ employer direct messaging with threads, read tracking, delivery status
- **Chat Buttons** — quick-start chat from application/dashboard context (`ChatButton`, `EmployerChatButton`)
- **File Attachments** — upload/download via presigned URLs
- **Message Templates** — reusable templates with categories
- **Message Drafts** — auto-save drafts
- **Contact Selector** — searchable contact list
- **Message Preferences** — notification settings per user
- **Real-time Notifications** — SSE-based live notifications with toast
- **In-app Notifications** — persistent notification center with read/unread
- **Email Notifications** — Resend for transactional, HubSpot CRM for sync-triggered

### 7. Concierge Chat System

- **Employer Concierge** — request concierge for jobs, discovery calls, job optimization, candidate screening
- **Employer ↔ Admin Chat** — real-time chat between employer and assigned admin for concierge jobs
- **Seeker ↔ Admin Concierge Chat** — seekers chat with admins about specific jobs they've applied to
- **Chat Features** — real-time messaging with file sharing, read receipts, unread counts
- **Admin Concierge Dashboard** — view all employer and seeker chat threads, manage assignments

### 8. Cron Jobs & Background Tasks (Vercel Cron)

- **Daily Tasks** (every 2 hours): recurring billing (seeker + employer), membership reminders, expired membership handling, payment failure notifications
- **Hourly Tasks**: urgent renewal reminders (24h window)
- **Job expiration** handling
- **Subscription lifecycle** management

### 9. External Integrations

- **HubSpot CRM (Free)** — contact sync, custom properties, search, field mapping
- **External Webhooks** — configurable webhook endpoints for seeker/employer events

### 10. Uncommitted Changes (from `get_changed_files`)

- **Admin Order Notification Emails** — new Resend-based admin payment notifications
- **Customer Payment Email Notifications** — payment confirmations + renewal reminders to customers
- **Email Template Revisions** — billing info in emails, payment method display, branding fixes
- **Database Backup Scripts** — staging + production backup/restore via Docker

---

## 📁 Project Structure

```
Ampertalent/
├── 00-PROJECT-OVERVIEW.md          ← This file
├── 01-TECH-STACK-AND-FREE-ALTERNATIVES.md
├── 02-DATABASE-SCHEMA-PLAN.md
├── 03-PHASE-1-FOUNDATION.md
├── 04-PHASE-2-AUTH-AND-ONBOARDING.md
├── 05-PHASE-3-SEEKER-PORTAL.md
├── 06-PHASE-4-EMPLOYER-PORTAL.md
├── 07-PHASE-5-ADMIN-PORTAL.md
├── 08-PHASE-6-PAYMENTS-AND-BILLING.md
├── 09-PHASE-7-MESSAGING-AND-NOTIFICATIONS.md
├── 10-PHASE-8-CONCIERGE-AND-SERVICES.md
├── 11-PHASE-9-ANALYTICS-AND-REPORTING.md
├── 12-PHASE-10-CRM-CRON-AND-INTEGRATIONS.md
├── 13-PHASE-11-TESTING-AND-DEPLOYMENT.md
└── 14-TDD-TESTING-STRATEGY.md
```

---

## ⏱️ Estimated Timeline

| Phase     | Description                | Est. Duration   |
| --------- | -------------------------- | --------------- |
| Phase 1   | Foundation & Project Setup | 2-3 days        |
| Phase 2   | Auth & Onboarding          | 3-4 days        |
| Phase 3   | Seeker Portal              | 5-7 days        |
| Phase 4   | Employer Portal            | 5-7 days        |
| Phase 5   | Admin Portal               | 5-7 days        |
| Phase 6   | Payments & Billing         | 5-7 days        |
| Phase 7   | Messaging & Notifications  | 3-4 days        |
| Phase 8   | Concierge & Services       | 3-4 days        |
| Phase 9   | Analytics & Reporting      | 2-3 days        |
| Phase 10  | CRM, Cron & Integrations   | 2-3 days        |
| Phase 11  | Testing & Deployment       | 3-4 days        |
| **Total** |                            | **~38-53 days** |

---

## 🏗️ Key Principles

1. **100% Feature Parity** — every feature, role, and workflow from the original
2. **$0 Cost** — all services use genuinely free tiers (no credit card required)
3. **TDD Approach** — tests written before implementation
4. **Production-Grade** — proper error handling, logging, security
5. **Portfolio-Ready** — clean code, comprehensive documentation
