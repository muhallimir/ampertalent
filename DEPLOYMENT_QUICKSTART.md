# AmperTalent Deployment Flow & Quick Reference

## 🚀 Phase 13: Deployment at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│           AmperTalent Phase 13 Deployment Flow             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

STEP 1: LOCAL VERIFICATION
├─ npm run build → ✓ Compiles successfully in 14.1s ✅
├─ git status → Clean working tree ✅
└─ npm test → Critical tests passing ✅

STEP 2: GITHUB PUSH
├─ git add . ✅
├─ git commit -m "Phase 13: Deployment" ✅
└─ git push origin main ✅

STEP 3: VERCEL SETUP
├─ Connect GitHub repository ✅
├─ Configure build settings (auto-detected) ✅
├─ Add environment variables (manual) ⏳
│  ├─ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
│  ├─ CLERK_SECRET_KEY
│  ├─ DATABASE_URL
│  ├─ NEXT_PUBLIC_SUPABASE_URL
│  ├─ NEXT_PUBLIC_SUPABASE_ANON_KEY
│  ├─ STRIPE_SECRET_KEY
│  ├─ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
│  ├─ SENTRY_DSN
│  └─ RESEND_API_KEY
└─ Deploy → Compilation in progress...

STEP 4: FIRST DEPLOYMENT SUCCESS ✅
├─ Get Vercel URL: https://ampertalent-[id].vercel.app
├─ Verify app loads at URL ✅
└─ Check Vercel deployment logs (no errors) ✅

STEP 5: STRIPE WEBHOOK CONFIG
├─ Stripe Dashboard → Developers → Webhooks
├─ Add Endpoint
│  ├─ URL: https://ampertalent-[id].vercel.app/api/webhooks/stripe
│  └─ Events: charge.succeeded, charge.failed, invoice.*
├─ Copy signing secret: whsec_xxxxx
└─ Add STRIPE_WEBHOOK_SECRET to Vercel env

STEP 6: REDEPLOY WITH WEBHOOK SECRET
├─ Vercel Dashboard → Deployments
├─ Click "Redeploy" on latest deployment
├─ Wait for build to complete (~3 min)
└─ Verify webhook test event succeeds ✅

STEP 7: POST-DEPLOYMENT TESTING
├─ Health Check: curl /api/health ✅
├─ Sign-up Flow ✅
├─ Payment Flow (test card: 4242...) ✅
├─ Admin Access ✅
├─ File Upload ✅
└─ Error Monitoring (Sentry) ✅

STEP 8: PRODUCTION READY ✅
└─ All verifications passed → Live in production!
```

---

## 📋 Environment Variables Checklist

### Required Before First Deploy (7 variables)

```
✓ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY    (from Clerk dashboard)
✓ CLERK_SECRET_KEY                     (from Clerk dashboard)
✓ DATABASE_URL                         (from Supabase)
✓ NEXT_PUBLIC_SUPABASE_URL             (from Supabase)
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY        (from Supabase)
✓ STRIPE_SECRET_KEY                    (from Stripe - LIVE KEY)
✓ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY   (from Stripe - LIVE KEY)
```

### Optional Before First Deploy (2 variables)

```
□ SENTRY_DSN                           (from Sentry - optional)
□ RESEND_API_KEY                       (from Resend - optional)
```

### Required After First Deploy (1 variable)

```
⏳ STRIPE_WEBHOOK_SECRET               (generated after first deploy)
```

---

## 🔑 Getting Environment Variables

### Clerk

```
Dashboard: https://dashboard.clerk.com
├─ Select Your Application
├─ API Keys
├─ Copy:
│  ├─ Publishable Key → NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
│  └─ Secret Key → CLERK_SECRET_KEY
└─ Add Vercel domain to whitelist:
   https://ampertalent-[your-id].vercel.app
```

### Supabase

```
Dashboard: https://app.supabase.com
├─ Select Your Project
├─ Project Settings → API
├─ Copy:
│  ├─ Project URL → NEXT_PUBLIC_SUPABASE_URL
│  └─ Anon Key → NEXT_PUBLIC_SUPABASE_ANON_KEY
├─ Database → Connection Strings
├─ Copy PostgreSQL URI → DATABASE_URL
└─ Verify bucket "resumes" exists in Storage
```

### Stripe

```
Dashboard: https://dashboard.stripe.com (LIVE MODE)
├─ Developers → API Keys
├─ Copy:
│  ├─ Secret Key (starts sk_live_) → STRIPE_SECRET_KEY
│  └─ Publishable Key (starts pk_live_) → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
├─ After first deploy:
│  ├─ Developers → Webhooks → Add Endpoint
│  ├─ URL: https://ampertalent-[id].vercel.app/api/webhooks/stripe
│  └─ Copy signing secret → STRIPE_WEBHOOK_SECRET
└─ Verify webhook events received in dashboard
```

### Sentry (Optional)

```
Dashboard: https://sentry.io
├─ Create Project (or use existing)
├─ Settings → Projects → Client Keys (DSN)
├─ Copy DSN → SENTRY_DSN
└─ Leave blank to disable error monitoring
```

### Resend (Optional)

```
Dashboard: https://resend.com
├─ API Keys
├─ Create or copy existing API key
└─ API Key → RESEND_API_KEY (for email sending)
```

---

## ✅ Post-Deployment Verification (10 Minutes)

### Minute 1-2: Health Check

```bash
curl https://ampertalent-[your-id].vercel.app/api/health
# Expected: {"status":"ok"} or 200 OK
```

### Minute 3-4: Clerk Auth

1. Go to https://ampertalent-[your-id].vercel.app/sign-up
2. Sign up with test email
3. Check for errors in browser console (should be none)
4. ✅ Verify user created in Clerk dashboard

### Minute 5-6: Database

1. Go to admin page (if logged in as admin)
2. Try to load any user list
3. ✅ Verify data loads without errors

### Minute 7-8: Stripe Payment

1. Navigate to any checkout page
2. Test with card: `4242 4242 4242 4242`
3. Complete payment
4. ✅ Verify transaction in Stripe dashboard

### Minute 9-10: Error Monitoring

1. Go to https://sentry.io
2. Select your project
3. ✅ Should see some events from testing

**All passing? → 🎉 Deployment Successful!**

---

## 🐛 Quick Troubleshooting

### Build Fails

```
❌ Error: "Build failed"
✅ Solution: Check Vercel build logs
   1. Go to Vercel Deployments
   2. Click on failed deployment
   3. View build logs
   4. Fix issue locally and repush
```

### Clerk Auth Not Working

```
❌ Error: "Invalid publishable key" or "Not in test environment"
✅ Solution:
   1. Verify NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is correct (pk_live_)
   2. Add Vercel URL to Clerk dashboard domain whitelist
   3. Redeploy
```

### Stripe Webhook Failing

```
❌ Error: "Webhook signature verification failed"
✅ Solution:
   1. Verify STRIPE_WEBHOOK_SECRET in Vercel matches Stripe
   2. Verify endpoint URL is exactly:
      https://ampertalent-[your-id].vercel.app/api/webhooks/stripe
   3. Redeploy
   4. Resend test event from Stripe dashboard
```

### Database Connection Error

```
❌ Error: "failed to connect to database"
✅ Solution:
   1. Verify DATABASE_URL in Vercel matches Supabase
   2. Check Supabase project status (not paused)
   3. Verify IP whitelist (if using static IP)
   4. Check connection limit not exceeded
```

### Storage Upload Fails

```
❌ Error: "Cannot upload to storage" or 403
✅ Solution:
   1. Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is correct
   2. Check bucket "resumes" exists in Supabase Storage
   3. Verify storage permissions allow uploads
   4. Check Supabase Storage logs for errors
```

---

## 🔄 Rollback Procedure (If Needed)

### Option 1: Instant Rollback (30 seconds)

```
Vercel Dashboard → Deployments → Find Previous Good Version
Click "Redeploy" → Deployment complete
```

### Option 2: Git Rollback (1 minute)

```bash
# Identify problem commit
git log --oneline -5

# Revert to previous commit
git revert HEAD

# Push to trigger redeploy
git push origin main
```

### Option 3: Full Emergency Disable (15 seconds)

```
Vercel Dashboard → Settings → Git
Uncheck "Deploy on push" → Investigate issue
```

---

## 📊 Deployment Dashboard

### Key URLs

| Service     | URL                                      |
| ----------- | ---------------------------------------- |
| 🌐 App      | https://ampertalent-[your-id].vercel.app |
| 📊 Vercel   | https://vercel.com/dashboard             |
| 🔐 Clerk    | https://dashboard.clerk.com              |
| 💾 Supabase | https://app.supabase.com                 |
| 💳 Stripe   | https://dashboard.stripe.com             |
| 🚨 Sentry   | https://sentry.io                        |
| 📧 Resend   | https://resend.com                       |

### Monitoring Tools

| Tool     | Purpose            | Check                          |
| -------- | ------------------ | ------------------------------ |
| Vercel   | Deployments, logs  | View logs if issues            |
| Sentry   | Error tracking     | Check error rate < 1%          |
| Stripe   | Payment processing | Verify webhook events received |
| Supabase | Database health    | Check connection pool          |
| Clerk    | Authentication     | Verify user creation           |

---

## 🎯 Success Criteria

✅ **All of these should be true after 5 minutes:**

- [ ] App loads at Vercel URL
- [ ] Sign-up page works
- [ ] No auth errors in console
- [ ] Database connection successful
- [ ] Stripe webhook receiving events
- [ ] Sentry seeing error events
- [ ] File uploads working
- [ ] Admin panel accessible
- [ ] No critical errors in Sentry

✅ **If any are false:**

- Check Vercel build logs
- Review environment variables
- Check Sentry for error details
- Consult DEPLOYMENT_VERIFICATION.md troubleshooting

---

## 📞 Emergency Contacts

### If Something Goes Wrong

1. **Build Error** → Check Vercel build logs
2. **Auth Error** → Check Clerk dashboard & console
3. **Payment Error** → Check Stripe dashboard & webhook logs
4. **Database Error** → Check Supabase database logs
5. **General Error** → Check Sentry dashboard

---

## 🎉 Next Steps After Successful Deployment

1. ✅ Share deployment URL with team
2. ✅ Set up monitoring alerts
3. ✅ Begin Phase 14 (Performance optimization)
4. ✅ Gather user feedback
5. ✅ Plan future features

---

**Phase 13 Status**: ⏳ Ready to Deploy
**Build Status**: ✅ Compiles successfully in 14.1s
**Documentation**: ✅ Complete

**Estimated deployment time**: 30 minutes (with env vars pre-configured)
**Post-deployment verification**: 10 minutes

---

_For detailed instructions, see PHASE_13_DEPLOYMENT.md_
_For post-deployment checklist, see DEPLOYMENT_VERIFICATION.md_
