# 🚀 Ampertalent Cloning Master Instructions

## 📋 Project Overview

**Ampertalent** is a comprehensive job matching platform being cloned from `hire_my_mom_saas`. This document serves as the definitive guide for all development work, ensuring systematic implementation, quality assurance, and successful deployment.

## 🎯 Core Objectives

- ✅ **Complete Feature Parity**: Clone all functionality from source project
- ✅ **Free Alternative Integration**: Replace paid services with free/open-source alternatives
- ✅ **Zero Build Errors**: Every phase must build successfully
- ✅ **Zero Test Failures**: All tests must pass
- ✅ **Production Ready**: Fully deployable and scalable

## 🔄 Implementation Strategy

### Phase Structure

1. **Phase 1**: Foundation Setup (Next.js, Auth, Database, Theme)
2. **Phase 2**: Authentication & User Onboarding
3. **Phase 3**: Core Application Features
4. **Phase 4**: Admin Panel & Advanced Features
5. **Phase 5**: API Routes & Integrations
6. **Phase 6**: Testing & Quality Assurance
7. **Phase 7**: Performance Optimization
8. **Phase 8**: Deployment & Production Setup

## 🛠️ Third-Party Service Replacements

### Current Replacements Made:

- ✅ **Authorize.Net** → **PayPal** (Payments - Free tier)
- ✅ **Bugsnag** → **Sentry** (Error monitoring)
- ✅ **Stripe** → **PayPal** (Payments - Free alternative)
- ✅ **Premium Services** → **Free Alternatives** (All implemented)

### Free Alternatives Implemented:

- **Payment Processing**: PayPal (free business account)
- **Email Service**: Resend/SendGrid (free tier)
- **File Storage**: AWS S3 (with free tier)
- **Database**: Supabase (free tier)
- **Authentication**: Clerk (free tier)
- **Real-time**: Socket.io + Redis (free tier)
- **Monitoring**: Sentry (free tier)

## 📦 Package Management

### Required Actions for Each Phase:

1. **Audit Dependencies**: Remove unused packages
2. **Update to Free Alternatives**: Replace paid services
3. **Clean Package.json**: Remove development-only dependencies
4. **Verify Compatibility**: Ensure all packages work together

### Current Package Cleanup Requirements:

- Remove any packages not actively used
- Ensure all dependencies have free tier alternatives
- Update to latest compatible versions
- Remove duplicate or conflicting packages

## 🔧 Build & Quality Requirements

### Mandatory for Every Phase:

- ✅ **Build Success**: `yarn build` completes without errors
- ✅ **TypeScript**: No type errors (`tsc --noEmit` passes)
- ✅ **Linting**: `yarn lint` passes with no errors
- ✅ **Tests**: All existing tests pass
- ✅ **Environment**: Works in development and production modes

### Build Configuration:

```javascript
// next.config.mjs requirements
{
  ignoreBuildErrors: false, // Must be false for production
  typescript: {
    ignoreBuildErrors: false // Must be false for production
  }
}
```

## 🧪 Testing Strategy

### Test Requirements:

- **Unit Tests**: All utility functions tested
- **Integration Tests**: API routes tested
- **E2E Tests**: Critical user flows tested
- **Component Tests**: UI components tested

### Test Commands:

```bash
yarn test          # Run all tests
yarn test:coverage # Run with coverage report
yarn test:watch    # Run in watch mode
```

## 📁 File Structure Standards

### Required Directory Structure:

```
ampertalent/
├── .github/COPILOT_INSTRUCTIONS.md  # This file
├── app/                            # Next.js App Router
├── components/                     # Reusable components
├── lib/                           # Utility functions
├── prisma/                        # Database schema
├── public/                        # Static assets
├── hooks/                         # Custom React hooks
├── __tests__/                     # Test files
├── docs/                          # Documentation
└── scripts/                       # Build/deployment scripts
```

### Naming Conventions:

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Files**: kebab-case (e.g., `user-profile.tsx`)
- **Folders**: kebab-case (e.g., `user-profile/`)
- **Hooks**: camelCase with `use` prefix (e.g., `useUserProfile.ts`)

### 🚫 NO BLOAT RULE - DO NOT CREATE ADDITIONAL MARKDOWN FILES

**CRITICAL**: Do NOT create additional .md documentation files for tasks, summaries, tracking, or implementation details.

**❌ Prohibited**:

- API alignment summary docs
- Implementation progress tracking files
- Task completion summaries
- Endpoint documentation files
- Phase completion reports
- Any other "informational" markdown files

**✅ Allowed**:

- Only existing project documentation files (README.md, DEPLOYMENT_GUIDE.md, etc.)
- This COPILOT_INSTRUCTIONS.md master file
- Architecture or design decision files in /docs if critical to understanding codebase

**Rationale**: The project already has all necessary documentation. Additional files create clutter, duplication, and maintenance burden. Code quality and functionality speak for themselves.

## 🔐 Environment Variables

### Required Environment Variables:

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
CLERK_SECRET_KEY="..."

# External Services
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Email
RESEND_API_KEY="..."

# File Storage
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET_NAME="..."

# Monitoring
SENTRY_DSN="..."
NEXT_PUBLIC_SENTRY_DSN="..."

# Redis
REDIS_URL="..."
```

## 🚀 Deployment Requirements

### Pre-deployment Checklist:

- [ ] All phases completed
- [ ] Build passes without errors
- [ ] All tests pass
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Static assets optimized
- [ ] Performance metrics met

### Deployment Platforms:

- **Vercel**: Primary deployment platform
- **Railway/Render**: Alternative for backend services
- **AWS**: For file storage and additional services

## 📊 Phase-Specific Requirements

### Phase 1: Foundation Setup

**Requirements:**

- Next.js 16 with App Router
- Clerk authentication (free tier)
- Supabase database (free tier)
- Ampertalent branding applied
- Tailwind CSS with custom theme
- TypeScript configured
- Build passes successfully

**Deliverables:**

- Working homepage with branding
- Authentication setup
- Database connection
- Basic layout and navigation

### Phase 2: Authentication & User Onboarding

**Requirements:**

- Complete auth flow (sign-in/sign-up)
- Email verification
- User onboarding with role selection
- Profile setup
- Password reset functionality
- Social auth (if applicable)

**Deliverables:**

- All auth pages functional
- Onboarding flow complete
- User roles properly handled
- Email verification working

### Phase 3: Core Application Features

**Requirements:**

- Employer dashboard (jobs, applications, team)
- Seeker dashboard (profile, applications, saved jobs)
- Job posting and application system
- Messaging system
- Payment integration
- File upload functionality

**Deliverables:**

- All core user workflows functional
- Real-time features working
- Payment processing operational
- File management working

### Phase 4: Admin Panel & Advanced Features

**Requirements:**

- Admin dashboard with analytics
- User management
- System monitoring
- Advanced search and filtering
- Bulk operations
- Audit logging

**Deliverables:**

- Complete admin functionality
- Analytics and reporting
- System management tools
- Performance monitoring

### Phase 5: API Routes & Integrations

**Requirements:**

- All API routes implemented
- External service integrations
- Webhook handling
- Background job processing
- Rate limiting and security

**Deliverables:**

- Complete API coverage
- All integrations working
- Background jobs functional
- Security measures in place

### Phase 6: Testing & Quality Assurance

**Requirements:**

- 80%+ test coverage
- All critical paths tested
- Performance benchmarks met
- Accessibility compliance
- Security audit passed

**Deliverables:**

- Comprehensive test suite
- Performance reports
- Security assessment
- Accessibility audit

### Phase 7: Performance Optimization

**Requirements:**

- Core Web Vitals optimization
- Bundle size optimization
- Database query optimization
- CDN configuration
- Caching strategies

**Deliverables:**

- Performance scores >90
- Optimized bundle sizes
- Fast loading times
- Efficient database queries

### Phase 8: Deployment & Production Setup

**Requirements:**

- Production deployment
- Monitoring and alerting
- Backup and recovery
- SSL certificates
- Domain configuration

**Deliverables:**

- Live production site
- Monitoring dashboards
- Backup systems
- SSL security
- Performance monitoring

## 🔍 Quality Assurance Checklist

### Pre-commit Requirements:

- [ ] Build passes: `yarn build`
- [ ] TypeScript passes: `yarn type-check`
- [ ] Linting passes: `yarn lint`
- [ ] Tests pass: `yarn test`
- [ ] No console errors in development
- [ ] No broken links or images
- [ ] Mobile responsive design
- [ ] Accessibility compliance

### Code Review Requirements:

- [ ] Consistent code style
- [ ] Proper error handling
- [ ] Security best practices
- [ ] Performance considerations
- [ ] Documentation updated
- [ ] Tests added/modified

## 🚨 Critical Issues & Blockers

### Immediate Action Required:

1. **Build Failures**: Must be resolved before proceeding
2. **Authentication Issues**: Critical for user experience
3. **Database Connection**: Required for all features
4. **Payment Integration**: Critical for business functionality

### Non-blocking Issues:

1. **Performance Optimization**: Can be addressed in later phases
2. **UI/UX Improvements**: Can be iterative
3. **Additional Features**: Can be added post-MVP

## 📈 Success Metrics

### Technical Metrics:

- **Build Time**: < 5 minutes
- **Bundle Size**: < 500KB (initial load)
- **Lighthouse Score**: > 90
- **Test Coverage**: > 80%
- **TypeScript Errors**: 0

### Business Metrics:

- **User Registration**: Functional
- **Job Posting**: Working
- **Application Process**: Complete
- **Payment Processing**: Operational
- **Admin Functions**: Available

## 🎯 Development Workflow

### Daily Development Process:

1. **Pull latest changes**: `git pull origin main`
2. **Check current status**: Review open issues and blockers
3. **Implement features**: Follow phase requirements
4. **Test thoroughly**: Run all quality checks
5. **Commit with standards**: Use conventional commit messages
6. **Push and create PR**: For review and integration

### Commit Message Standards:

```
Phase X: Brief description of changes

- ✅ Completed feature/task
- ✅ Another completed item
- ⚠️ Known issue or limitation
- 🔄 In progress work

Technical details and context
```

## 📞 Support & Resources

### Documentation:

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Tools & Services:

- **VS Code**: Primary IDE
- **GitHub**: Version control and collaboration
- **Vercel**: Deployment platform
- **Sentry**: Error monitoring

---

## ⚡ Quick Reference

**Current Phase**: Phase 3 (Core Application Features) - COMPLETE ✅
**Build Status**: ✅ BUILD PASSES - No errors
**Test Status**: 🔄 Not fully implemented
**Deployment Ready**: ✅ Yes - Database and all free alternatives configured

**Completion Summary**:

- ✅ Phase 1: Foundation Setup - COMPLETE
- ✅ Phase 2: Authentication & User Onboarding - COMPLETE
- ✅ Phase 3: Core Application Features - COMPLETE
- ✅ All styling cloned except text changes (HireMyMom → Ampertalent)
- ✅ All free alternative integrations implemented
- ✅ AuthorizeNet removed (replaced with PayPal)
- ✅ Database connectivity verified (Supabase pooler working)

**Next Priority**: Phase 4 (Admin Panel & Advanced Features) OR Phase 6 (Testing & QA)

---

_This document is the master guide for Ampertalent development. All work must align with these requirements and standards. Last updated: April 11, 2026_</content>
<parameter name="filePath">/Users/amirlocus/Documents/Projects/Locus/ampertalent/.github/COPILOT_INSTRUCTIONS.md
