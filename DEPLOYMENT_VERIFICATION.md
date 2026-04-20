# Phase 13: Deployment Verification Checklist

## Pre-Deployment ✅

- [x] Build compiles successfully: `✓ Compiled successfully in 14.1s`
- [x] vercel.json created with cron configuration
- [x] .env.example with all required variables
- [x] PHASE_13_DEPLOYMENT.md with detailed instructions
- [x] pre-deployment-check.sh script ready

## Pre-Flight Checklist (Before Clicking Deploy)

### 1. Code Quality

```bash
# Verify build passes
npm run build
# Result: ✓ Compiled successfully in 14.1s ✅
```

### 2. Git Status

```bash
# Ensure all changes committed
git status
# Should show: "On branch main, nothing to commit, working tree clean"
```

### 3. Critical Files Verified

- ✅ vercel.json - Stripe webhook & cron config
- ✅ next.config.js - Build configuration
- ✅ tsconfig.json - TypeScript settings
- ✅ package.json - Dependencies
- ✅ prisma/schema.prisma - Database schema

### 4. Environment Configuration Ready

Create environment variables in Vercel Dashboard (Settings → Environment Variables):

**Critical (Must Have Before Deploy):**

- [ ] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- [ ] CLERK_SECRET_KEY
- [ ] DATABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] STRIPE*SECRET_KEY (sk_live*)
- [ ] NEXT*PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live*)
- [ ] SENTRY_DSN
- [ ] RESEND_API_KEY

**After First Deploy (Step 5 in PHASE_13_DEPLOYMENT.md):**

- [ ] STRIPE*WEBHOOK_SECRET (whsec*)

### 5. Dependencies Installed

```bash
# Verify node_modules exists
ls -la | grep node_modules
# Should exist and be ~700MB
```

## Deployment Steps

### Step 1: Push to GitHub

```bash
cd ampertalent
git add -A
git commit -m "Phase 13: First Live Deployment - Vercel configuration"
git push origin main
```

### Step 2: Vercel Setup

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import GitHub repository: `/ampertalent`
4. Configure:
   - Framework: Next.js
   - Build Command: npm run build
   - Output Directory: .next

### Step 3: Environment Variables (Vercel Dashboard)

1. Settings → Environment Variables
2. Add all variables from "Critical" list above
3. Set for: Production, Preview, Development
4. **Skip** STRIPE_WEBHOOK_SECRET for now
5. Click "Save"

### Step 4: Deploy

- Click "Deploy"
- Wait for build to complete (~3-5 minutes)
- Note your Vercel URL (e.g., https://ampertalent-xyz.vercel.app)

### Step 5: Webhook Configuration

After successful first deploy:

1. **Get Vercel URL from deployment info**

2. **Configure Stripe Webhook:**
   - Go to https://dashboard.stripe.com
   - Navigate to: Developers → Webhooks → Add Endpoint
   - Endpoint URL: `https://ampertalent-[your-id].vercel.app/api/webhooks/stripe`
   - Events to send:
     - charge.succeeded
     - charge.failed
     - invoice.payment_succeeded
     - invoice.payment_failed
   - Click "Add events"
   - Click "Add endpoint"
   - Copy the signing secret (starts with `whsec_`)

3. **Add webhook secret to Vercel:**
   - Vercel Dashboard → Settings → Environment Variables
   - Add new variable:
     - Key: STRIPE_WEBHOOK_SECRET
     - Value: whsec\_[paste-from-stripe]
   - Set for: Production
   - Click "Save"

4. **Redeploy:**
   - Vercel Dashboard → Deployments
   - Click "Redeploy" on latest deployment
   - Or push a commit to trigger redeploy

## Post-Deployment Verification

### ✅ Health Check (Immediate)

```bash
curl https://ampertalent-[your-id].vercel.app/api/health

# Expected response: {"status":"ok"} or similar
```

### ✅ Database Connection (5 min)

1. Go to application → any page requiring DB query
2. Check for errors in Sentry dashboard
3. Should see no database connection errors

### ✅ Clerk Authentication (10 min)

1. Go to: https://ampertalent-[your-id].vercel.app/sign-up
2. Test sign-up flow
3. Verify email verification works
4. Check Clerk dashboard for new user
5. No auth errors in browser console

### ✅ Stripe Integration (15 min)

1. Log in to application
2. Navigate to payment/checkout page
3. Test with Stripe test card:
   - Card: 4242 4242 4242 4242
   - Expiry: 12/25
   - CVC: 123
4. Complete payment flow
5. Check Stripe dashboard for transaction
6. Verify webhook received (Developers → Webhooks → Recent Events)

### ✅ File Storage (20 min)

1. Try uploading a resume/file
2. Verify upload completes
3. Check Supabase Storage bucket for file
4. Verify no errors in Sentry

### ✅ Error Monitoring (25 min)

1. Go to https://sentry.io
2. Select your project
3. Should see some events from initial tests
4. Verify error context includes:
   - User information
   - Breadcrumbs
   - Stack traces

### ✅ Email Service (30 min)

1. Check for welcome email from Resend
2. Verify email arrives in inbox
3. Check Resend dashboard for delivery status

### ✅ Admin Panel (35 min)

1. Log in with admin/super_admin role
2. Access: https://ampertalent-[your-id].vercel.app/admin
3. Test dashboard loads
4. Verify no console errors

### ✅ Cron Jobs (Next run)

1. Verify in Vercel Dashboard → Settings → Cron Jobs
2. Should show:
   - `/api/cron/employer-recurring-billing` (every 6 hours)
   - `/api/cron/daily-tasks` (2:00 AM UTC)
3. Check function logs after scheduled time

## Troubleshooting Guide

### Build Fails on Deploy

```
Error: "Cannot find module '@prisma/client'"
Solution:
1. Verify package.json has @prisma/client dependency
2. Ensure DATABASE_URL is set in environment
3. Add postinstall script if needed: "prisma generate"
```

### Environment Variables Not Loading

```
Error: "STRIPE_SECRET_KEY is undefined"
Solution:
1. Verify variables are set in Vercel Production environment
2. Check for typos in variable names (case-sensitive)
3. Redeploy after adding variables
4. Use vercel env pull to verify locally
```

### Clerk Authentication Fails

```
Error: "Invalid publishable key" or "Not in test environment"
Solution:
1. Verify NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is correct
2. Ensure it's the publishable key, not secret key
3. Add Vercel domain to Clerk dashboard:
   - Clerk Dashboard → Instance Settings → Domains
   - Add: https://ampertalent-[your-id].vercel.app
4. Redeploy
```

### Stripe Webhook Not Working

```
Error: "Webhook signature verification failed"
Solution:
1. Verify STRIPE_WEBHOOK_SECRET matches Stripe dashboard
2. Ensure webhook endpoint URL is exactly correct
3. Try resending test event from Stripe dashboard
4. Check vercel function logs for errors
```

### Database Connection Issues

```
Error: "failed to connect to database" or timeout
Solution:
1. Verify DATABASE_URL format is correct
2. Check Supabase project is not paused
3. Verify IP whitelist in Supabase if using static IP
4. Try connecting locally: psql $DATABASE_URL
5. Check Supabase dashboard for connection issues
```

### Storage Upload Fails

```
Error: "Cannot upload to storage" or 403 Forbidden
Solution:
1. Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is correct
2. Check Supabase bucket policies allow uploads
3. Verify bucket name matches code (likely "resumes")
4. Check Supabase Storage logs for 403 errors
```

## Rollback Plan

If critical issues occur:

### Option 1: Revert Deployment

```bash
# View deployments
vercel list

# Rollback to previous version
vercel rollback [deployment-id]
```

### Option 2: Fix and Redeploy

```bash
# Identify issue
git log --oneline -5

# Fix locally
git checkout [fix-branch]
git push origin [fix-branch]

# Redeploy
# Manually trigger in Vercel, or
git push origin main
```

### Option 3: Emergency Disable

In Vercel Dashboard:

1. Go to: Settings → Git
2. Uncheck "Deploy on push"
3. Investigate and fix
4. Re-enable when ready

## Performance Monitoring

### Core Web Vitals (After 24 hours)

- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

### Analytics Dashboard

- Vercel: Deployments → Analytics
- Sentry: Performance tab
- Supabase: Metrics → Database

## Sign-Off Checklist

When all verifications pass, complete:

- [ ] Pre-flight checks completed
- [ ] Environment variables configured in Vercel
- [ ] First deployment successful
- [ ] Stripe webhook configured
- [ ] All health checks passing
- [ ] Clerk authentication working
- [ ] Payment flow tested and working
- [ ] File uploads functioning
- [ ] Sentry receiving error events
- [ ] Admin panel accessible
- [ ] Cron jobs scheduled (visible in Vercel)
- [ ] No critical errors in Sentry (first 24h)
- [ ] Performance metrics acceptable

## Next Steps (Phase 14)

After Phase 13 deployment success:

1. **Performance Optimization**
   - Implement image optimization
   - Add caching headers
   - Optimize database queries
   - Reduce bundle size

2. **SEO Enhancements**
   - Add metadata to pages
   - Implement structured data
   - Create sitemap
   - Submit to search engines

3. **Security Hardening**
   - Enable CORS properly
   - Add rate limiting
   - Implement CSRF protection
   - Security headers

4. **User Experience Polish**
   - Error message improvements
   - Loading states
   - Toast notifications
   - Accessibility improvements

---

**Phase 13 Status**: ⏳ Ready to Deploy
**Build Status**: ✅ Compiles successfully in 14.1s
**Configuration**: ✅ Complete
**Documentation**: ✅ Complete

**Deployment Command**: `vercel --prod` (after env vars configured)

---

Last Updated: Phase 13 Deployment Preparation
