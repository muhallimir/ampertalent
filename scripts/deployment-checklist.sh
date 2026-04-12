#!/bin/bash
# Deployment checklist for AmperTalent

set -e

echo "🚀 AmperTalent Deployment Checklist"
echo "====================================="
echo ""

# 1. Environment variables
echo "📋 Checking environment variables..."
required_vars=(
  "NEXT_PUBLIC_APP_URL"
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  "CLERK_SECRET_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "STRIPE_SECRET_KEY"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "CLERK_WEBHOOK_SECRET"
  "RESEND_API_KEY"
  "CRON_SECRET"
  "DATABASE_URL"
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo "❌ Missing environment variables:"
  printf '  - %s\n' "${missing_vars[@]}"
  exit 1
fi

echo "✅ All required environment variables are set"
echo ""

# 2. Database check
echo "🗄️ Checking database..."
if ! npx prisma db execute --stdin <<< "SELECT 1;" 2>/dev/null; then
  echo "❌ Database connection failed"
  exit 1
fi
echo "✅ Database connection successful"
echo ""

# 3. Build check
echo "🔨 Building application..."
if ! yarn build; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build successful"
echo ""

# 4. Deployment readiness
echo "✅ Deployment checklist complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Review environment variables in .env.production"
echo "  2. Run database migrations: npx prisma migrate deploy"
echo "  3. Configure Vercel deployment settings"
echo "  4. Set up monitoring and error tracking"
echo "  5. Configure DNS and SSL"
echo "  6. Set up backup strategy"
echo "  7. Configure CI/CD pipeline"
echo ""
echo "📊 Important endpoints to test:"
echo "  - POST /api/webhooks/clerk"
echo "  - POST /api/webhooks/stripe"
echo "  - POST /api/cron/seeker-recurring-billing"
echo "  - POST /api/cron/employer-recurring-billing"
echo "  - GET /api/admin/dashboard/stats"
echo ""
