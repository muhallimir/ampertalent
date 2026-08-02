# 15 — Solo Email Blasts (Coming Soon)

> **Status:** Tracking-only view. End-to-end email delivery is not wired up.
> **Last updated:** Aug 2, 2026
> **Owner:** TBD
> **Related phase doc:** [`10-PHASE-8-CONCIERGE-AND-SERVICES.md`](./10-PHASE-8-CONCIERGE-AND-SERVICES.md) §8.6

---

## TL;DR

The `/admin/solo-email-blasts` page lists `EmailBlastRequest` rows and lets
admins flip their status (`not_started` → `pending` → `completed`), but
**clicking "Mark as Sent" does not actually send any email to candidates.**
It only updates the request's status, the linked job's `emailBlastStatus`,
and writes an `AdminActionLog` row.

For now, admins must compose and send the blast manually (via GoHighLevel,
Mailchimp, etc.) using the employer-supplied logo / content / link shown in
the request dialog, then flip the status to `completed` for bookkeeping.

A prominent yellow banner on the page makes this explicit.

---

## What's currently wired up

| Surface | Status | Notes |
|---|---|---|
| `EmailBlastRequest` schema + migrations | ✅ Done | `additional_service_purchase` + `email_blast_request` tables, FK to job |
| Employer purchases the package (Stripe / PayPal) | ✅ Done | Creates `EmailBlastRequest` row in `not_started` |
| Employer fills `EmailBlastDetailsForm` (logo, content, link) | ✅ Done | Updates the same row with content + assets |
| Admin page lists requests, filters, search | ✅ Done | `app/admin/solo-email-blasts/page.tsx` |
| Admin bulk-select + status transitions | ✅ Done | PATCH `/api/admin/solo-email-blasts/[id]` |
| Admin impersonates employer from a request | ✅ Done | Uses `useImpersonation` |
| "View Job" button in request dialog | ✅ Fixed | Routes to `/admin/job-posts/{id}/edit` |
| **Actually sending the email** | ❌ Missing | No Resend / GoHighLevel call anywhere in the codebase for blasts |
| **Audience selection** | ❌ Missing | No candidate-list query exists for blasts |
| **Rate limiting / chunking** | ❌ Missing | Would be required once we send |
| **Unsubscribe / suppression list** | ❌ Missing | Compliance gap |

---

## What's broken / misleading

1. **The "Mark as Sent" button lies.** It says "Email blast completed and
   sent", but no email was sent. UX copy implies a side-effect that doesn't
   happen.
2. **No public `/jobs/{id}` route exists.** Old admin dialog had
   `window.open('/jobs/{jobId}')` which 404'd. Fixed to point to
   `/admin/job-posts/{jobId}/edit` (`app/admin/solo-email-blasts/page.tsx:140`,
   `:809`).
3. **No regression test asserts "send was called".** The integration suite
   only covers status transitions, not delivery.

---

## What needs to be built

### A. Decide the delivery channel

Two viable options — pick one before writing code:

- **A1. GoHighLevel broadcast** (already integrated for CRM sync).
  - Pros: audience segmentation + suppression already exist there.
  - Cons: external API, slower to iterate on templates, harder to A/B test.
- **A2. Resend batch send** (`lib/resend.ts` already exposes
  `sendBatchIndividualEmails`).
  - Pros: full control over HTML, per-recipient merge tags, easy to test
    with Resend's test mode.
  - Cons: we own audience selection, unsubscribe, bounce handling.

Recommendation: **A2 (Resend)** for v1, with a small
`CandidateAudienceService` that picks recipients. GoHighLevel stays the
source of truth for CRM lead state.

### B. Audience selection

```ts
// lib/email-blast/audience.ts (sketch)
export async function getBlastAudience(filters: BlastFilters): Promise<Recipient[]> {
  // - eligible job seekers with active subscription OR opted-in to alerts
  // - exclude: bounced, unsubscribed, role mismatch, geo block
  // - apply category preferences if set on the EmailBlastRequest
}
```

Decisions to lock down:
- Are blasts gated by the seeker having an active subscription? (current
  product assumption: yes, but `EmailBlastRequest` doesn't enforce it.)
- Per-blast targeting filters (category, location, pay band)?
- Cap recipients per blast to keep us under Resend's per-batch limit (100)?

### C. Template rendering

A single React Email template that takes:
```ts
{
  employer: { companyName, logoUrl, contactName, contactEmail },
  job: { id, title, payRangeText, locationText, category, useJobLink, customLink },
  content: string, // employer's HTML or plain-text body
  unsubscribeUrl: string,
}
```
Render to HTML with `react-email` or a hand-rolled helper, send via Resend
batch. Inject the unsubscribe footer for CAN-SPAM compliance.

### D. Wire it into the PATCH route

`app/api/admin/solo-email-blasts/[id]/route.ts:65-68` currently just sets
status. Extend it:

```ts
if (status === 'completed') {
  const audience = await getBlastAudience(request.targeting)
  const html = await renderBlastTemplate(request)
  const result = await sendBatchIndividualEmails(
    audience.map(r => ({ to: r.email, html, subject: request.subject }))
  )
  // store per-recipient delivery status on EmailBlastRecipient table
  // only flip status='completed' if no fatal failures
}
```

Make the send transactional — if Resend errors, leave status at `pending`
and surface the error in the admin UI.

### E. Per-recipient delivery tracking

Add an `EmailBlastRecipient` table:
```prisma
model EmailBlastRecipient {
  id              String   @id @default(dbgenerated("(gen_random_uuid())::text"))
  requestId       String   @map("request_id")
  seekerId        String   @map("seeker_id")
  email           String
  status          String   // queued | sent | bounced | failed
  providerId      String?  // Resend message id
  sentAt          DateTime?
  errorMessage    String?  @map("error_message")
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([requestId])
  @@map("email_blast_recipients")
}
```
Webhook from Resend (`/api/webhooks/resend`) updates per-recipient rows.

### F. Compliance + unsubscribe

- Add a `marketing_opt_in` flag on `JobSeeker` (currently absent).
- Add an unsubscribe link handler that flips the flag.
- Add the unsubscribe footer to every blast template.
- Honor Resend's suppression list on retry.

### G. Tests (TDD per project convention)

```
__tests__/integration/services/email-blasts.test.ts
- should create email blast request with content
- should admin process email blast              ← exists, covers status only
- should update job email blast status          ← exists
- should handle blast expiration                ← exists
- should send batch via Resend on completion    ← NEW
- should NOT send if audience is empty          ← NEW
- should mark per-recipient status from webhook ← NEW
- should respect seeker marketing_opt_in=false  ← NEW
- should rate-limit large blasts into chunks    ← NEW
```

---

## Quick-win checklist

In rough priority order:

- [ ] Lock in delivery channel (A1 vs A2) — needs product decision.
- [ ] Add `marketing_opt_in` to `JobSeeker` schema + migration.
- [ ] Build `CandidateAudienceService`.
- [ ] Build React Email blast template + unsubscribe footer.
- [ ] Wire Resend batch send into PATCH route.
- [ ] Add `EmailBlastRecipient` table + migration.
- [ ] Add Resend webhook handler for delivery events.
- [ ] Surface delivery stats on the admin dialog (X sent / Y bounced).
- [ ] Update the "Mark as Sent" button copy to reflect reality
      ("Queue Send" or "Confirm Send") once it actually sends.
- [ ] Update the yellow "Coming Soon" banner on `/admin/solo-email-blasts`
      to remove itself once step 4 lands.

---

## References

- Admin UI: `app/admin/solo-email-blasts/page.tsx`
- Admin API: `app/api/admin/solo-email-blasts/route.ts`,
  `app/api/admin/solo-email-blasts/[id]/route.ts`
- Employer submission: `app/employer/jobs/[id]/email-blast/page.tsx`,
  `app/api/employer/jobs/[id]/email-blast/route.ts`
- Employer dashboard summary: `app/employer/jobs/page.tsx`
- Resend helper (already exists): `lib/resend.ts`
  (`sendBatchIndividualEmails`, `BatchEmailPayload`)
- GoHighLevel integration (already exists): `lib/gohighlevel.ts`
- Original spec: `docs/10-PHASE-8-CONCIERGE-AND-SERVICES.md` §8.6
