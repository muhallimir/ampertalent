# Demo script: flagship overview (platform cut from existing footage)

Status: recorded as a cut, no new filming. Source files only from
demos/*/[!.]*.mp4 (the non-voiced silent takes). Nothing was re-recorded
and no existing video was moved or deleted.

Target length: 60 to 90 seconds. Final: 65.92 seconds (silent and voiced).

Intro and end cards reuse the takes pattern: dark navy radial slate,
small caps LIVE DEMO TOUR, big white title, blue stack line, white
subtitle. Generated with PIL (ffmpeg in this env has no drawtext) and
held as 1920x1080 25fps h264.

Stack claims verified in repo: Next.js 16 App Router (app/layout.tsx,
app/page.tsx), Clerk auth (@clerk/nextjs in package.json,
middleware.ts), Stripe (stripe ^14 plus app/api/payments/stripe-checkout
and webhooks) plus PayPal (app/api/payments/paypal/* and employer
billing paypal routes), Prisma Postgres (prisma/schema.prisma datasource
provider postgresql), five roles in UserRole enum (seeker, employer,
admin, team_member, super_admin).

Shots, sources, and voiceover lines (one line per segment,
en-US-GuyNeural male):

1. intro card, 0.0 to 7.0 (7s, generated): "AmperTalent, remote hiring
   on Next.js, Clerk, Stripe plus PayPal, and Postgres."
2. seeker applies, 7.0 to 16.0 (9s,
   demos/seeker-journey/ampertalent-seeker-journey.mp4 37.0 to 46.0):
   job detail with Apply Now, then apply modal with Submit Application.
   Frame check t37 job detail, t45 modal, t46 modal. Line: "Seekers
   search open roles and apply with a saved profile, resume, and cover
   letter." (voice 5.52s)
3. employer reviews applicant, 16.0 to 25.0 (9s,
   demos/team-hiring/ampertalent-team-hiring.mp4 84.0 to 93.0): employer
   dashboard with New Application alert, then Applications table with one
   applicant row and Manage Application actions. Frame check t84
   dashboard, t93 applications table. Line: "Employers track every
   applicant from pending to reviewed, interview, or hired." (5.26s)
4. admin moderation queue, 25.0 to 32.9 (7.92s composite, all from
   demos/admin-operations/ampertalent-admin-operations.mp4 because no
   single 6s stable moderation window exists in that take): Job Posts
   Management with Approved badges (source 21.6 to 24.8), then Job Seeker
   Management queue with Suspend actions (source 33.4 to 35.6), then
   Employer Management with Approved plus Vet buttons (source 38.0 to
   40.5). Frame check each sub-clip head and tail, plus output t26, t28,
   t30, t31, t32, all clean, no spinners. Line:
   "Admins moderate seekers, employers, and listings from one back
   office." (4.85s)
5. concierge sourcing, 32.9 to 41.9 (9s,
   demos/concierge-service/ampertalent-concierge-service.mp4 70.0 to
   79.0): concierge request brief in chat, then Find Seekers results with
   skill chips. Frame check t70 brief, t79 grid. Line: "Concierge
   sourcing filters the talent pool by skills and shortlists matches."
   (5.04s)
6. team moment, 41.9 to 50.9 (9s,
   demos/team-hiring/ampertalent-team-hiring.mp4 55.0 to 64.0): team
   invitation accept page for Demo Co. Frame check t55, t60, t64 clean.
   Line: "Teams invite members by email and share one hiring workspace."
   (4.37s)
7. concierge chat, 50.9 to 59.9 (9s,
   demos/concierge-service/ampertalent-concierge-service.mp4 96.0 to
   105.0): concierge profile to Chat with Seekers thread list. Frame
   check t96 profile, t100 chat list, t105 chat list. Line: "Concierge
   chat keeps employer, specialist, and seeker in one thread." (4.99s)
8. end card, 59.9 to 65.9 (6s, generated): points at the series. Line:
   "Watch the full series: seeker, employer, team, concierge, and admin
   tours." (5.52s)

Assembly: segments re-encoded to h264 yuv420p 1080p25, concatenated.
Voices placed with adelay at segment starts and amixed with normalize=0,
de-overlapped by construction (each clip is shorter than its segment:
6.10 in 7.0, 5.52 in 9.0, 5.26 in 9.0, 4.85 in 7.0, 5.04 in 9.0, 4.37 in
9.0, 4.99 in 9.0, 5.52 in 6.0).

Outputs:
demos/flagship-overview/ampertalent-flagship-overview.mp4 (silent, 65s)
demos/flagship-overview/ampertalent-flagship-overview-voiced.mp4 (65s)

Verification: duration 65s in 60 to 90 range. Voice present in every one
of the 8 segments (volumedetect per window, see report). Spot frames
checked at every segment head and tail, no loading spinners inside any
used window. Max voice gap about 3.5s, under 10s.
