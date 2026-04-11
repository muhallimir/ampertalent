# 📊 Phase 9 — Analytics & Reporting

> Admin analytics dashboards, revenue tracking, report generation, and PDF export.

---

## 9.1 Platform Analytics

### Tasks

- [ ] Create `lib/analytics.ts` — AnalyticsService
  - `getPlatformMetrics()` — total users, jobs, applications, subscriptions, revenue
  - `getUserEngagementMetrics()` — DAU/WAU/MAU, session data
  - `getJobMetrics()` — jobs by category/type/status, approval time, avg applications
  - `getRevenueMetrics()` — total/subscription/package/service revenue, MRR, churn, LTV
  - Payment method breakdown (card types via Stripe)
  - Employer recurring revenue breakdown
- [ ] Create `lib/enhanced-analytics.ts` — deep-dive analytics
  - Trend data over time periods
  - Cohort analysis
  - Funnel conversion rates
- [ ] Create `app/api/admin/analytics/route.ts` — analytics API

### TDD Tests

```
__tests__/unit/analytics.test.ts
- should calculate total users by role
- should calculate total jobs by status
- should calculate monthly revenue
- should calculate MRR
- should calculate churn rate
- should calculate conversion rates
- should return revenue breakdown by payment method
```

---

## 9.2 Analytics Dashboard

### Tasks

- [ ] Create `app/admin/analytics/page.tsx` — main analytics dashboard
- [ ] Create `app/admin/enhanced-analytics/page.tsx` — enhanced analytics
- [ ] Create `components/admin/EnhancedAnalyticsDashboard.tsx` — charts dashboard
  - Revenue over time (line chart)
  - Users by role (pie chart)
  - Jobs by category (bar chart)
  - Applications trend (area chart)
  - Subscription breakdown (donut chart)
  - Top performing job categories
- [ ] Use Recharts for all charts

### TDD Tests

```
__tests__/ui/admin/analytics.test.tsx
- should render revenue chart
- should render user distribution chart
- should render job metrics
- should handle empty data gracefully
```

---

## 9.3 Sales Dashboard

### Tasks

- [ ] Create `app/admin/sales/page.tsx` — sales overview
  - Total revenue (by period)
  - Revenue by type (subscriptions, packages, services)
  - Payment method breakdown
  - Recent transactions
  - Top employers by spend
  - Subscription tier distribution
- [ ] Create `app/api/admin/sales/route.ts` — sales data API
- [ ] Create `lib/client-analytics.ts` — client-side analytics utils

### TDD Tests

```
__tests__/integration/admin/sales.test.ts
- should return total revenue for date range
- should break down revenue by source
- should list top employers
- should show payment method distribution
```

---

## 9.4 Report Generation

### Tasks

- [ ] Create `lib/reporting.ts` — ReportingService
  - User activity reports
  - Revenue reports
  - Job performance reports
  - Application trends reports
  - Custom reports
- [ ] Create `app/admin/reports/page.tsx` — report builder
  - Date range picker
  - Report type selector
  - Filter options
  - Format selection (CSV, PDF, JSON)
- [ ] Create `app/api/admin/reports/route.ts` — report API
  - Generate report with filters
  - Export as CSV/PDF/JSON
  - Schedule reports (future enhancement)

### TDD Tests

```
__tests__/unit/reporting.test.ts
- should generate user activity report
- should generate revenue report
- should filter by date range
- should export as CSV
- should export as PDF
- should export as JSON
```

---

## 9.5 Admin Action Logging

### Tasks

- [ ] Ensure all admin actions create AdminActionLog records:
  - Job approvals/rejections
  - User suspensions
  - Subscription modifications
  - Refund processing
  - Impersonation sessions
  - CRM sync operations
  - Service assignments
- [ ] Create `app/admin/logs/page.tsx` — action log viewer

### TDD Tests

```
__tests__/integration/admin/action-logs.test.ts
- should log job approval action
- should log user suspension
- should log subscription cancellation
- should log impersonation start/end
- should filter logs by action type
- should filter logs by admin
```

---

## Deliverables Checklist

- [ ] Platform metrics API (users, jobs, applications, revenue)
- [ ] Revenue metrics with MRR, churn, LTV
- [ ] Analytics dashboard with Recharts visualizations
- [ ] Enhanced analytics with trends and cohorts
- [ ] Sales dashboard with payment breakdowns
- [ ] Report builder (CSV/PDF/JSON export)
- [ ] Admin action logging for all operations
- [ ] Log viewer with filtering
- [ ] All Phase 9 tests passing
