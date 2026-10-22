# Demo script: getting started (first impression for prospects)

Role: guest, then a fresh seeker spawned live on camera. Status:
recorded, silent plus voiced.
Target length: under 120 seconds.

Setup: none before the take. The take spawns its own demo seeker live
through the public "Try Demo" entry in the landing page nav, which opens
the demo modal (role cards call `POST /api/demo/create` and set the
`ampertalent_demo` marker, which bypasses Stripe and PayPal later).
Complete onboarding on camera (role pick, basic info, goals, package),
activate the demo subscription with
`POST /api/demo/activate-subscription`, and seed sample data with
`POST /api/demo/seed`. Record against the live Vercel URL. Keep total
voice under 90 seconds so the cut stays under 120 seconds.

Shots and voiceover lines (one per chapter, one step per shot):

1. intro (title card): "Your first two minutes on AmperTalent, from landing page to first saved job."
2. landing (`/`, guest): "The landing page lays out jobs, employers, and tools in one scroll."
3. search guest (landing hero plus `/tools` job matcher card as guest, no login): "As a guest, job browsing starts here with live public results and no account."
4. signup (landing nav "Try Demo", demo modal "Try as Seeker", credentials dialog): "Signing up takes one click with a demo account, no email wait."
5. role (`/onboarding` role pick): "Onboarding starts with a role pick, seeker for this tour."
6. basic (`/onboarding` basic info): "Basic info covers name, location, and headline in one quick form."
7. goals (`/onboarding` goals): "Goals capture the target role and skills so matches land on day one."
8. package (`/onboarding` package select): "The package step picks a plan, and demo mode skips checkout."
9. dashboard (`/seeker/dashboard`): "The seeker dashboard opens with matches, stats, and next steps."
10. find (`/seeker/jobs`, one search for "demo", narrated over the wait): "The first job search runs live, and results stream in." (Job search takes a few seconds. Narrate over it and keep the shot moving.)
11. save (search page, saves one job, does not apply; confirms on `/seeker/saved-jobs` if the click state is unclear): "One click saves the role for later. Applying belongs to the seeker journey tour."

Access notes: `/` and `/tools` are public. The "Try Demo" modal on `/`
needs no session. `/onboarding` needs a fresh Clerk session (the demo
entry provides it). `/seeker/dashboard` and `/seeker/jobs` need the
seeker role. This demo stops at save: applying, tracking, and services
belong to the seeker journey tour. It never demos the resume critique
API live.

Cleanup: delete the demo applications, then the seeker profile and jobs
rows, then the user for the printed demo email (or wipe with
`POST /api/demo/cleanup-test` in dev). Verify the demo subscription
and profile rows exist in the DB before deleting.
