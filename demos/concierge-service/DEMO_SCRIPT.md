# Demo script: concierge service (white glove sourcing end to end)

Role: employer, then admin, then seeker (three demo accounts, one take).
Status: recorded, silent plus voiced.
Target length: 120 to 150 seconds.

Setup: spawn three fresh accounts with `POST /api/demo/create`
(`{"role": "employer"}`, `{"role": "admin"}`, `{"role": "seeker"}`).
Complete employer and seeker onboarding via
`POST /api/onboarding/complete`, seed sample jobs with
`POST /api/demo/seed`, and mint fresh one time tokens per role switch
with `POST /api/demo/signin-token` (`{"profileId": ...}`). The employer
needs one live job: read its id from `GET /api/employer/jobs` and open
`/employer/concierge/[jobId]`. Record against the live Vercel URL.

Shots and voiceover lines (one per chapter, one page per shot):

1. intro (title card): "White glove sourcing on AmperTalent. An employer requests help, an admin team fulfills it, and the seeker follows every step."
2. open (`/employer/concierge/[jobId]`, employer session): "The employer opens concierge sourcing on a live role and reviews the job details plus support scope."
3. request (same page, employer session): "The request is filed with role needs, skills, timeline, and budget in the chat thread, so the brief is complete on the first pass." (Files the real `POST /api/employer/jobs/[id]/concierge` request plus one detailed chat message live, then reloads to show the Requested status and active thread.)
4. queue (`/admin/concierge`, admin session): "The admin fulfillment queue picks up the request, from brief to delivered candidates."
5. detail (`/admin/concierge/[jobId]`, admin session): "The request detail shows the brief, status, and assigned specialist for this exact role."
6. sourcing (`/admin/concierge/find-seekers`, admin session): "Find seekers filters the talent pool by skills, experience, and availability, then shortlists matches for the role." (Talent search can take about 18 seconds. A filler line covers the wait, the camera stays on the results page.)
7. bio (`/admin/concierge/bio`, admin session): "Each concierge specialist has a public bio, so employers know who is sourcing their role."
8. chat seekers (`/admin/concierge/chat/seekers`, admin session, sends one message live): "The admin writes the shortlisted seeker in the seekers thread with next steps."
9. chat employers (`/admin/concierge/chat/employers`, admin session, sends one message live): "The admin updates the employer in the employers thread with the shortlist and timeline."
10. seeker (`/seeker/concierge-chat/[jobId]/[chatRoomId]`, seeker session, reads and replies live): "On the seeker side, the concierge thread keeps every message in one place, and the seeker replies to confirm interest."

Access notes: `/employer/concierge/[jobId]` needs the employer role and
a live job id (seeded demo jobs work). `/admin/concierge/*` needs admin
or super_admin. `/seeker/concierge-chat/[jobId]/[chatRoomId]` needs
seeker (falls back to `/seeker/messages` if the direct room id is not
resolved yet). Role switches mid take use fresh
`POST /api/demo/signin-token` tokens plus Clerk ticket sign in, so the
video stays continuous. This demo does not touch the resume critique API
(too slow for live takes) and does not repeat employer billing or talent
search shots (see the employer journey).

Cleanup: delete the demo concierge requests, concierge chats plus
messages, and seeker concierge chats plus messages, then applications,
jobs, profiles, and users for the three printed demo emails (or wipe
with `POST /api/demo/cleanup-test` in dev). Verify the concierge
request row exists in the DB before deleting.
