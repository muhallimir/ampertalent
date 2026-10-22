# AmperTalent demo library

One folder per showcase video. Each folder holds the demo script (shots plus
exact voiceover lines) used to record that video, so any re-record stays
identical in structure. Roles: seeker, employer, team_member, admin,
super_admin.

| Folder | Role | Status |
|---|---|---|
| seeker-journey | seeker (starts in demo mode) | Script ready, not recorded |
| employer-journey | employer (starts in demo mode) | Script ready, not recorded |
| admin-operations | admin (super_admin works too) | Script ready, not recorded |
| tools-showcase | guest (no login) | Script ready, not recorded |
| concierge-service | employer, then admin, then seeker (three demo accounts, one take) | Recorded silent plus voiced, 146s, 10 shots |
| super-admin-platform | super_admin in demo mode | Recorded silent plus voiced, 132s, 8 shots |
| team-hiring | employer, then the invited team member | Recorded silent plus voiced, 120s, 8 shots |
| getting-started | guest, then a fresh seeker spawned live | Recorded silent plus voiced, 85s, 11 shots |

Recording recipe (shared by all): headed Chromium with a visible cursor,
chapter marks per shot, audio-paced steps, voice clips from edge-tts
(en-US-GuyNeural male), assembled so each line matches what is on screen
(generate with `TTS_VENV=/tmp/edge-venv bash
scripts/test/gen_voice_clips_all.sh /tmp/at-voice`). Record
against the live Vercel URL to skip cold starts.

Demo-mode setup (shared by all role scripts): spawn a fresh account with
`POST /api/demo/create` and body `{"role": "<seeker|employer|admin>"}`
(public route, whitelisted in `middleware.ts`). It returns `demo-<role>-<ts>`
credentials for a Clerk user with verified email plus matching UserProfile
and role profile rows. Seeker and employer demo users go through the full
onboarding flow. Seeker demo subscriptions are activated with
`POST /api/demo/activate-subscription` (skips Stripe and PayPal). Sample
data (demo jobs, demo applications) comes from `POST /api/demo/seed`.
Use one fresh demo account per take.

Role-based access (verified in `middleware.ts`): Clerk auth plus
`UserProfile.role` as source of truth. `/seeker/*` needs seeker,
`/employer/*` needs employer (team_member is also allowed on
`/employer/*` and is redirected to `/employer/dashboard`),
`/admin/*` needs admin or super_admin (admins can also open all
sections). Unauthenticated visitors are bounced to `/sign-in`.
Demos below assume fresh demo accounts per take.

Cleanup: delete demo rows in dependency order (applications, then jobs and
profiles, then users) for the printed demo email, or wipe in one shot with
`POST /api/demo/cleanup-test` (dev only, returns 403 in production). All
test and demo data uses the `demo-<role>-<ts>-` prefix. Verify the demo
outcome in the DB before deleting.
