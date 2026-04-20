# Phase 13: First Live Deployment - AmperTalent

## Deployment Overview

This guide covers deploying AmperTalent to Vercel with all integrations (Clerk, Stripe, Supabase, Sentry).

### Pre-Deployment Checklist

- [ ] All environment variables documented
- [ ] Build passes locally: `npm run build`
- [ ] All tests passing in key paths
- [ ] Stripe account configured
- [ ] Supabase project ready
- [ ] Clerk production keys ready
- [ ] Sentry project created
- [ ] Resend email service configured
- [ ] vercel.json checked

### Environment Variables Required

Create these in Vercel Dashboard → Settings → Environment Variables:

#### Authentication (Clerk)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_[your-key]
CLERK_SECRET_KEY=[your-secret]
```

Get from: [Clerk Dashboard](https://dashboard.clerk.com) → API Keys

#### Database (Supabase)

```
DATABASE_URL=postgresql://[user]:[password]@db.[region].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

Get from: [Supabase Dashboard](https://app.supabase.com) → Project Settings → API

#### Payment Processing (Stripe)

```
STRIPE_SECRET_KEY=sk_live_[your-key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[your-key]
```

Get from: [Stripe Dashboard](https://dashboard.stripe.com) → API Keys

#### Webhook Secret (Stripe) - Set After First Deploy

```
STRIPE_WEBHOOK_SECRET=whsec_[your-secret]
```

⚠️ **IMPORTANT**: This is generated after first deployment - see "Step 4: Webhook Configuration" below

#### Error Monitoring (Sentry)

```
SENTRY_DSN=https://[key]@[subdomain].sentry.io/[project-id]
```

Get from: [Sentry Dashboard](https://sentry.io) → Project Settings → Client Keys (DSN)

#### Email Service (Resend)

```
RESEND_API_KEY=[your-api-key]
```

Get from: [Resend Dashboard](https://resend.com) → API Keys

### Deployment Steps

#### Step 1: Push to GitHub

```bash
cd ampertalent
git add .
git commit -m "Phase 13: First Live Deployment"
git push origin main
```

#### Step 2: Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Select GitHub repo: `/ampertalent`
4. Configure:
   - **Framework**: Next.js (auto-detected)
   - **Root Directory**: `.` (default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

#### Step 3: Add Environment Variables in Vercel

1. In project settings → "Environment Variables"
2. Add all variables from "Environment Variables Required" section above
3. Set them for: Production, Preview, Development (if needed)
4. **SKIP** `STRIPE_WEBHOOK_SECRET` for now - we'll add this after first deploy

#### Step 4: Deploy to Staging First

```bash
# Deploy preview first to test
vercel --prod
```

After successful staging deploy:

- Note your Vercel URL: `https://ampertalent-[staging].vercel.app`
- Go to Stripe → Webhooks → Add Endpoint
  - Endpoint URL: `https://ampertalent-[staging].vercel.app/api/webhooks/stripe`
  - Events: `charge.succeeded`, `charge.failed`, `invoice.payment_succeeded`, `invoice.payment_failed`
  - Copy the signing secret

#### Step 5: Webhook Secret Configuration

1. Get webhook signing secret from Stripe
2. Add to Vercel environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_[copied-from-stripe]
   ```
3. Redeploy: `vercel --prod`

#### Step 6: Post-Deployment Verification

After deployment, test these critical flows:

```bash
# 1. Test Health Check
curl https://ampertalent-[your-url].vercel.app/api/health

# 2. Test Stripe Webhook
# Send test event from Stripe Dashboard → Webhooks → Send test event
# Check logs in Vercel: Deployments → Recent → Function Logs

# 3. Test Cron Jobs
# Verify in Vercel Dashboard → Cron Jobs
# Runs automatically at scheduled times
```

### Critical Flow Testing

#### 1. User Onboarding

- [ ] Sign up with Clerk
- [ ] Complete onboarding form
- [ ] Data saved to Supabase
- [ ] File upload uses Supabase Storage
- [ ] No errors in Sentry

#### 2. Stripe Payment

- [ ] Navigate to checkout
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Expiry: any future date (e.g., 12/25)
- [ ] CVC: any 3 digits
- [ ] Payment succeeds
- [ ] Invoice created in database
- [ ] Webhook notification received (check Sentry/logs)

#### 3. Admin Panel

- [ ] Log in with super_admin role
- [ ] Access admin dashboard
- [ ] View user list
- [ ] Test retry payment functionality
- [ ] Export reports

#### 4. Error Monitoring

- [ ] Check Sentry dashboard for events
- [ ] Verify error context captured (user, transaction, breadcrumbs)
- [ ] Test intentional error trigger if available

### Production Deployment

Once staging verification passes:

```bash
# Deploy to production
vercel --prod
```

Monitor in first 24 hours:

- [ ] Sentry dashboard for error spikes
- [ ] Vercel analytics for performance
- [ ] Database connection stability
- [ ] Stripe webhook reliability

### Cron Jobs Configuration

The `vercel.json` configures automatic recurring tasks:

| Cron Job                               | Schedule      | Purpose                            |
| -------------------------------------- | ------------- | ---------------------------------- |
| `/api/cron/employer-recurring-billing` | Every 6 hours | Process recurring employer charges |
| `/api/cron/daily-tasks`                | 2:00 AM UTC   | Daily maintenance tasks            |

**Note**: Cron jobs require Vercel Pro or higher plan

### Rollback Plan

If deployment issues occur:

```bash
# View recent deployments
vercel list

# Rollback to previous version
vercel rollback [deployment-id]

# Or redeploy from Git
git revert HEAD~1
git push origin main
vercel --prod
```

### Common Issues & Solutions

#### Issue: `STRIPE_WEBHOOK_SECRET not set`

**Solution**: Follow Step 5 above - this is added AFTER first deploy

#### Issue: Build fails with database errors

**Solution**:

```bash
# Verify DATABASE_URL is correct
vercel env ls

# Ensure Supabase project is accessible
# Check IP whitelist in Supabase dashboard
```

#### Issue: Clerk authentication not working

**Solution**:

- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is correct (must start with `pk_live_`)
- Check Clerk dashboard for domain whitelist - add Vercel URL
- Restart deployment after adding domain

#### Issue: Stripe payments failing

**Solution**:

- Verify `STRIPE_SECRET_KEY` starts with `sk_live_`
- Check Stripe test/live mode toggle
- Verify webhook is receiving events in Stripe dashboard
- Check `STRIPE_WEBHOOK_SECRET` matches webhook signing secret

#### Issue: Storage uploads failing

**Solution**:

- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase Storage policies in dashboard
- Ensure bucket `resumes` exists and is public

### Monitoring & Maintenance

#### Daily Tasks

- [ ] Check Sentry for critical errors
- [ ] Monitor Vercel analytics for performance degradation
- [ ] Review Stripe payment success rate

#### Weekly Tasks

- [ ] Review database query performance
- [ ] Check cron job execution logs
- [ ] Monitor Supabase storage usage

#### Monthly Tasks

- [ ] Review error trends in Sentry
- [ ] Analyze user analytics
- [ ] Update dependencies if needed
- [ ] Review security logs

### Next Steps (Phase 14)

After successful Phase 13 deployment:

1. Performance optimization (Core Web Vitals)
2. SEO enhancements
3. Security hardening
4. Additional polish and features

---

**Deployment Date**: [Add date after deploy]
**Deployment Status**: ⏳ Pending
**Environment**: Staging → Production
**Vercel URL**: [Will be assigned on deploy]
