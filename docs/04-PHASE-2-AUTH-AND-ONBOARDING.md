# 🔐 Phase 2 — Authentication & Onboarding

> Implement Clerk-based auth, role-based middleware, multi-step onboarding, and invitation systems.

---

## 2.1 Clerk Authentication Setup

### Tasks

- [x] Configure `ClerkProvider` in root layout
- [x] Create `app/sign-in/[[...sign-in]]/page.tsx` — Clerk SignIn component
- [x] Create `app/sign-up/[[...sign-up]]/page.tsx` — Clerk SignUp component
- [ ] Create `app/sso-callback/page.tsx` — SSO callback handler
- [ ] Create `app/handler/page.tsx` — email verification handler
- [x] Style Clerk components to match Ampertalent branding (`@clerk/themes`)

### TDD Tests

```
__tests__/ui/auth/sign-in.test.tsx
- should render Clerk SignIn component
- should redirect to dashboard after sign-in

__tests__/ui/auth/sign-up.test.tsx
- should render Clerk SignUp component
```

---

## 2.2 Role-Based Middleware

### Tasks

- [x] Create `middleware.ts` — comprehensive route protection
  - Public routes: `/`, `/sign-in`, `/sign-up`, `/sso-callback`, `/handler`, `/api/auth`, `/api/webhooks`, `/api/health`, `/checkout/authnet`
  - Protected routes: `/seeker/*` (seeker), `/employer/*` (employer), `/admin/*` (admin)
  - API protection: `/api/seeker/*`, `/api/employer/*`, `/api/admin/*`
  - Onboarding flow: redirect users without role to `/onboarding`
  - Admin access: admins + super_admins can access all routes
  - Team member access: team_members can access `/employer/*`
  - Onboarding-allowed routes: subscription checkout, Stripe return, payments API during onboarding
- [x] Create `lib/middleware-onboarding.ts` — onboarding status check helper
- [x] Create `app/api/auth/user-role/route.ts` — role lookup API for middleware

### TDD Tests

```
__tests__/unit/middleware.test.ts
- should allow public routes without auth
- should redirect unauthenticated users to sign-in
- should redirect users without role to onboarding
- should allow seekers to access /seeker/* routes
- should deny seekers access to /employer/* routes
- should deny seekers access to /admin/* routes
- should allow employers to access /employer/* routes
- should allow admins to access all routes
- should allow super_admins to access all routes
- should allow team_members to access /employer/* routes
- should redirect team_members from / to /employer/dashboard
```

---

## 2.3 Onboarding Flow

### Tasks

- [x] Create `app/onboarding/page.tsx` — multi-step onboarding
  - Step 1: Role selection (Seeker or Employer)
  - Step 2a (Seeker): Profile info + skills + subscription plan selection
  - Step 2b (Employer): Company info + profile setup
  - Step 3 (Seeker): Payment method + subscription activation
  - Step 3 (Employer): Package selection (optional)
- [x] Create `app/onboarding/layout.tsx` — onboarding layout (no sidebar)
- [x] Create `components/onboarding/` — onboarding step components
- [x] Create `app/api/onboarding/route.ts` — create user profile, job seeker, or employer record
- [x] Create `app/api/onboarding/pending-signup/draft/route.ts` — save draft onboarding data

### TDD Tests

```
__tests__/ui/onboarding/onboarding.test.tsx
- should render role selection step
- should show seeker form after selecting seeker role
- should show employer form after selecting employer role
- should validate required fields

__tests__/integration/onboarding.test.ts
- should create UserProfile with seeker role
- should create UserProfile + JobSeeker record
- should create UserProfile + Employer record
- should skip role selection if invitation exists
```

---

## 2.4 Webhook Integration (Clerk → App)

### Tasks

- [ ] Create `app/api/webhooks/clerk/route.ts` — handle Clerk webhook events (user.created, user.updated, user.deleted)
- [ ] Create `app/api/webhooks/supabase/route.ts` — handle Supabase webhook events

### TDD Tests

```
__tests__/integration/webhooks/clerk-webhook.test.ts
- should handle user.created event
- should handle user.updated event
- should handle user.deleted event
- should verify webhook signature
- should reject invalid signatures
```

---

## 2.5 User Invitation System

### Tasks

- [x] Create `app/api/user/invitation/route.ts` — check for pending invitations
- [ ] Create `app/api/user/invitation/validate/admin/route.ts` — process admin invitations
- [ ] Create `lib/user-invitations.ts` — invitation management logic
- [ ] Create `lib/clerk-invitation-actions.ts` — Clerk invitation API integration
- [ ] Create `components/UserInviteSignUpForm.tsx` — invitation sign-up form

### TDD Tests

```
__tests__/unit/user-invitations.test.ts
- should create user invitation with token
- should validate invitation token
- should expire old invitations
- should accept invitation and create profile

__tests__/integration/user-invitation-flow.test.ts
- should process admin invitation → redirect to admin dashboard
- should process seeker invitation → skip role selection
- should process employer invitation → skip role selection
```

---

## 2.6 Team Invitation System

### Tasks

- [ ] Create `lib/team-invitations.ts` — team invitation logic
- [ ] Create `app/api/team-invitation/route.ts` — send/accept team invitations
- [ ] Create `app/api/team-member/route.ts` — manage team members
- [ ] Create `components/employer/TeamManagement.tsx` — team management UI

### TDD Tests

```
__tests__/unit/team-invitations.test.ts
- should create team invitation with token
- should send invitation email via Resend
- should accept team invitation and create team member
- should reject expired invitation

__tests__/integration/team-flow.test.ts
- should employer invite team member
- should team member accept and access employer dashboard
- should team member see employer's jobs
```

---

## 2.7 Auth Utility Functions

### Tasks

- [x] Create `lib/auth.ts` — getCurrentUser, getUserRole, isAdmin, etc.
- [x] Create `lib/auth-utils.ts` — helper for auth checks in API routes
- [x] Create `lib/admin-impersonation.ts` — admin impersonation session management
- [ ] Create `lib/seeker-access-guard.ts` — seeker subscription access checks

### TDD Tests

```
__tests__/unit/auth.test.ts
- should return current user from Clerk
- should check if user has admin role
- should check seeker subscription access
- should handle impersonation session storage
```

---

## Deliverables Checklist

- [ ] Clerk sign-in/sign-up working
- [ ] Role-based middleware protecting all routes correctly
- [ ] Multi-step onboarding creating correct DB records
- [ ] User invitation system (admin, seeker, employer)
- [ ] Team invitation system for employers
- [ ] Clerk webhooks processing user events
- [ ] Auth utility functions
- [ ] Admin impersonation session management
- [ ] All Phase 2 tests passing
