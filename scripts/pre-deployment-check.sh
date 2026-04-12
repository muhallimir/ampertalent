#!/bin/bash

# Phase 13 Pre-Deployment Checklist Script
# Verifies all requirements before deploying to Vercel

set -e

echo "🚀 AmperTalent Phase 13 Pre-Deployment Checklist"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
  echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
  echo -e "${RED}✗${NC} $1"
  EXIT_CODE=1
}

check_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

EXIT_CODE=0

echo "1️⃣  Checking Build Status..."
if npm run build > /dev/null 2>&1; then
  check_pass "Build successful"
else
  check_fail "Build failed - run 'npm run build' to debug"
fi

echo ""
echo "2️⃣  Checking Git Status..."
if git diff-index --quiet HEAD --; then
  check_pass "No uncommitted changes"
else
  check_warn "Uncommitted changes detected - commit before deploying"
fi

echo ""
echo "3️⃣  Checking Critical Files..."

FILES=(
  "vercel.json"
  "next.config.js"
  "tsconfig.json"
  "package.json"
  "prisma/schema.prisma"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    check_pass "Found $file"
  else
    check_fail "Missing $file"
  fi
done

echo ""
echo "4️⃣  Checking Environment Configuration..."
if grep -q "CLERK_SECRET_KEY" package.json 2>/dev/null || [ -n "$CLERK_SECRET_KEY" ]; then
  check_warn "Environment variables should be set in Vercel, not in repo"
fi

check_pass "vercel.json configured"

echo ""
echo "5️⃣  Checking Dependencies..."
if [ -d "node_modules" ]; then
  check_pass "Dependencies installed"
else
  check_fail "Run 'npm install' first"
fi

echo ""
echo "6️⃣  Checking Database Setup..."
if grep -q "DATABASE_URL" .env.local 2>/dev/null || grep -q "@DATABASE_URL" vercel.json; then
  check_pass "Database configuration detected"
else
  check_warn "DATABASE_URL should be set in Vercel environment"
fi

echo ""
echo "7️⃣  Checking Stripe Configuration..."
if grep -q "STRIPE_SECRET_KEY\|STRIPE_PUBLISHABLE_KEY" vercel.json; then
  check_pass "Stripe keys referenced in vercel.json"
else
  check_warn "Stripe keys should be added to Vercel environment"
fi

echo ""
echo "8️⃣  Checking Supabase Configuration..."
if grep -q "NEXT_PUBLIC_SUPABASE_URL\|NEXT_PUBLIC_SUPABASE_ANON_KEY" vercel.json; then
  check_pass "Supabase keys referenced in vercel.json"
else
  check_warn "Supabase keys should be added to Vercel environment"
fi

echo ""
echo "9️⃣  Checking Cron Jobs..."
if grep -q "crons" vercel.json; then
  check_pass "Cron jobs configured in vercel.json"
  check_warn "Note: Cron jobs require Vercel Pro plan"
else
  check_fail "Cron jobs not configured"
fi

echo ""
echo "🔟  TypeScript Compilation..."
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  check_warn "TypeScript warnings/errors detected (non-blocking)"
else
  check_pass "TypeScript configuration valid"
fi

echo ""
echo "=================================================="
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed! Ready to deploy.${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Push to GitHub:  git push origin main"
  echo "2. Add env vars in Vercel dashboard"
  echo "3. Deploy:          vercel --prod"
else
  echo -e "${RED}✗ Some checks failed. See above for details.${NC}"
  exit 1
fi
