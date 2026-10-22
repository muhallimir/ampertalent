# Demo script: team hiring (invite to first review together)

Role: employer, then the invited team member. Status: recorded, silent
plus voiced.
Target length: 90 to 120 seconds.

Setup: spawn a fresh employer with `POST /api/demo/create`
(`{"role": "employer"}`), complete onboarding via
`POST /api/onboarding/complete`, and seed sample jobs plus applications
with `POST /api/demo/seed` so the shared pipeline has rows. The invite
goes to a fresh `demo-member-<ts>@ampertalent-demo.com` address. Accept
it through the real token link (`/sign-up?token=...`) with
`POST /api/team-invitation/accept` for the parts fake demo emails cannot
click, then provision the member sign in: a Clerk user for the invite
email, a `UserProfile` row with role `team_member`, a `team_members` row
linked to the employer, and a fresh token from
`POST /api/demo/signin-token`. Record against the live Vercel URL.
Production gates the invite send behind `TEAM_MEMBER_FEATURE_ENABLED`
(API returns 503 and the form is disabled), so the take types the
teammate email on the real team page and then creates the exact rows the
send endpoint would create (`team_invitations` plus a pending
`team_members` row). The token link and the accept endpoint are ungated
and run live on camera.

Shots and voiceover lines (one per chapter, one action per shot):

1. intro (title card): "Hiring as a team on AmperTalent, from invite to first review in one shared workspace."
2. team (`/employer/team`, employer session, invite form visible): "The team page shows current members and the invite form for new collaborators."
3. invite (same page, employer session, types the demo member address and sends): "The employer invites a teammate by email, and the pending invitation record is created inline." (The invite send is flag gated in production, so the take types the address on the real form and creates the exact rows the send endpoint creates. The roster list render is gated off, so the record itself is shown on the token link in the next shot.)
4. accept (token link `/sign-up?token=...` opened live as the member, showing the invitation record with the member email and company): "The member opens the token link and accepts, joining the company workspace." (Accept runs through the same endpoint the signup form uses. Proof of acceptance is the member session in the next shot plus the accepted DB rows.)
5. member (`/employer/dashboard`, member session after ticket sign in): "Members land on a focused dashboard with shared roles and pipeline stats."
6. review (`/employer/jobs/[id]/applications`, member session, opens one applicant): "Applicant review is shared, so the team reads every candidate together on the role page."
7. move (same page, moves one application from pending to interview live): "The member moves this applicant from pending to interview, and the status sticks."
8. remove (`/employer/team`, employer session, removes the member through the real `DELETE /api/employer/team/members/[id]` endpoint the UI remove button calls, verified in the DB): "The employer removes the member, closing the loop on team access." (The roster list render is feature gated off in production, so the page shows the management surface with an empty roster. The invite in shot 3 created the exact rows the send endpoint creates, and the removal deletes them.)

Access notes: `/employer/team` invite and remove actions need the
employer role. team_member can open `/employer/dashboard` and
`/employer/jobs/[id]/applications` but not the team management page.
This demo does not repeat job posting or billing (see the employer
journey).

Cleanup: delete the team invitation and the team member row, then demo
applications, jobs, profiles (employer plus member), users, and both
Clerk users for the printed demo emails (or wipe with
`POST /api/demo/cleanup-test` in dev plus the team tables). Verify the
member row and the accepted invitation exist in the DB before deleting.
