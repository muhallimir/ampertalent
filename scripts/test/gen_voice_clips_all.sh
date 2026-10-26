#!/bin/bash
# Generate per-journey voice clips + durations.json for audio pacing.
# Engine: edge-tts neural voice (en-US-GuyNeural male, free, no API key).
# Voice texts are the exact lines from demos/*/DEMO_SCRIPT.md.
# Usage: ./scripts/test/gen_voice_clips_all.sh [OUTBASE] [journey ...]
# Output: $OUTBASE/<journey>/{*.m4a,durations.json}
set -euo pipefail

OUTBASE="${1:-/tmp/at-voice}"
VOICE="${VOICE:-en-US-GuyNeural}"
VOICE_ENGINE="${VOICE_ENGINE:-edge}"

text_for_step() {
  case "$1" in
    # ---- seeker-journey ----
    seeker-intro)      echo "Welcome to AmperTalent. This tour follows a job seeker from first search to hired, all inside the seeker workspace.";;
    seeker-dashboard)  echo "Signed in as a demo seeker. The dashboard shows my matches, application stats, and next steps.";;
    seeker-jobs)       echo "Browsing open roles. Opening one to check the details, salary, and company.";;
    seeker-apply)      echo "Applying with my saved profile, resume, and a cover letter template.";;
    seeker-tracking)   echo "Saved jobs live here, and every application is tracked from pending to hired.";;
    seeker-services)   echo "The services marketplace offers resume critiques and career help on demand.";;
    seeker-membership) echo "Memberships run Trial, Gold, VIP, and Annual, with invoices under billing.";;
    seeker-messages)   echo "Concierge chat, employer messages, and notifications keep every conversation in one place.";;
    seeker-search-wait) echo "Searching open roles now.";;
    seeker-apply-wait)  echo "Submitting my application.";;
    seeker-upload-wait) echo "Uploading my resume.";;
    # ---- employer-journey ----
    employer-intro)     echo "Welcome to AmperTalent for employers. This tour goes from posting a job to hiring, plus team and billing.";;
    employer-dashboard) echo "Signed in as a demo employer. The dashboard shows live roles, applicant counts, and pipeline stats.";;
    employer-postjob)   echo "Posting a role with a package, then reviewing the live listing.";;
    employer-talent)    echo "Searching the talent pool by skills and experience to shortlist candidates.";;
    employer-applicants) echo "Every applicant is tracked from pending to reviewed, interview, rejected, or hired.";;
    employer-company)   echo "The company profile sells the brand, and team invites bring collaborators into this workspace.";;
    employer-billing)   echo "Billing covers job packages, and concierge sourcing delivers vetted candidates on request.";;
    employer-postjob-wait) echo "Saving the new role.";;
    employer-talent-wait)  echo "Searching the talent pool.";;
    # ---- admin-operations ----
    admin-intro)       echo "AmperTalent admin operations, from moderation to revenue, in one back office tour.";;
    admin-dashboard)   echo "The dashboard and analytics show signups, postings, applications, and revenue at a glance.";;
    admin-moderation)  echo "The job moderation queue approves or rejects listings before they go live.";;
    admin-users)       echo "Seekers, employers, and admins are managed from one users section.";;
    admin-billing)     echo "Billing ops covers subscriptions, invoices, and refunds.";;
    admin-concierge)   echo "Concierge fulfillment tracks sourcing requests from brief to delivered candidates.";;
    admin-growth)      echo "Featured jobs boost visibility, and email blasts reach the talent base in one send.";;
    admin-platform)    echo "CRM sync, webhooks, storage, and settings keep the platform wired and healthy.";;
    admin-queue-wait)  echo "Loading the moderation queue.";;
    # ---- tools-showcase ----
    tools-intro)       echo "AmperTalent Labs, thirty hiring utilities you can try right now with no account.";;
    tools-match)       echo "The job alert matcher scores and ranks roles against alert criteria.";;
    tools-fit)         echo "The ATS fit scorer grades a resume against a job description.";;
    tools-pay)         echo "The salary normalizer unifies pay periods, and the FX converter crosses currencies.";;
    tools-pipeline)    echo "The state machine validates application transitions, and the slot picker builds interview availability.";;
    tools-talent)      echo "Talent search finds profiles, the digest composes daily job emails, and feedback summaries structure interviewer notes.";;
    tools-money)       echo "Proration prices plan changes fairly, and the coupon engine validates discounts.";;
    tools-quality)     echo "Dedupe catches repeat postings, JSON-LD boosts SEO, and the resume scorer grades quality.";;
    tools-run-wait)    echo "Running the live API.";;
    # ---- concierge-service ----
    concierge-intro)   echo "White glove sourcing on AmperTalent. An employer requests help, an admin team fulfills it, and the seeker follows every step.";;
    concierge-open)    echo "The employer opens concierge sourcing on a live role and reviews the job details plus support scope.";;
    concierge-request) echo "The request is filed with role needs, skills, timeline, and budget in the chat thread, so the brief is complete on the first pass.";;
    concierge-queue)   echo "The admin fulfillment queue picks up the request, from brief to delivered candidates.";;
    concierge-detail)  echo "The request detail shows the brief, status, and assigned specialist for this exact role.";;
    concierge-sourcing) echo "Find seekers filters the talent pool by skills, experience, and availability, then shortlists matches for the role.";;
    concierge-bio)     echo "Each concierge specialist has a public bio, so employers know who is sourcing their role.";;
    concierge-chatseek) echo "The admin writes the shortlisted seeker in the seekers thread with next steps.";;
    concierge-chateemp) echo "The admin updates the employer in the employers thread with the shortlist and timeline.";;
    concierge-seeker)  echo "On the seeker side, the concierge thread keeps every message in one place, and the seeker replies to confirm interest.";;
    concierge-request-wait) echo "Sending the sourcing request.";;
    concierge-search-wait) echo "Searching the talent pool now. This sweep takes about eighteen seconds, so stay with the results as they stream in.";;
    # ---- super-admin-platform ----
    superadmin-intro)  echo "Super admin exclusives on AmperTalent, the controls platform buyers ask about most.";;
    superadmin-sales)  echo "Sales data lives here: revenue, subscriptions, and trial metrics across the whole platform, not just one employer.";;
    superadmin-admins) echo "Regular admins are managed from this page: invite, promote, suspend, or remove them, with role and status controls.";;
    superadmin-plans)  echo "Exclusive plans live here, with custom pricing per employer. This plan shows its scope and price.";;
    superadmin-billing) echo "Recurring billing shows every cycle, retry, and renewal across seekers and employers, driven by the billing cron.";;
    superadmin-crmmap) echo "CRM sync maps platform fields to the pipeline, so every contact lands in the right stage.";;
    superadmin-crmlog) echo "The sync log records every mapping edit and delivery, so the pipeline stays auditable.";;
    superadmin-logs)   echo "Cron runs and admin actions are logged here, and this row shows one audited run.";;
    superadmin-notify) echo "The notification center tracks every broadcast to seekers, employers, or everyone. Nothing is sent during this tour.";;
    superadmin-subs)   echo "Subscription management tracks every plan row, and this subscription shows its status and billing.";;
    superadmin-fallback) echo "CRM sync needs super admin scope, so the tour shows webhook deliveries, storage, and settings keeping the platform wired.";;
    superadmin-load-wait) echo "Loading the platform data.";;
    # ---- team-hiring ----
    team-intro)        echo "Hiring as a team on AmperTalent, from invite to first review in one shared workspace.";;
    team-team)         echo "The team page shows the current roster and the invite form for new collaborators.";;
    team-invite)       echo "The employer types the teammate email, sends the invite through the live endpoint, and the pending invitation appears in the roster.";;
    team-accept)       echo "The member opens the token link, accepts, and the accepted invitation joins the company workspace.";;
    team-member)       echo "The invited member lands on a focused dashboard with the shared pipeline.";;
    team-review)       echo "The shared applicant pipeline shows the live role with one candidate for team review.";;
    team-move)         echo "The team member moves the applicant from pending to interview, and the status updates live.";;
    team-remove)       echo "The employer removes the member through the real delete endpoint, and the roster updates.";;
    team-invite-wait)  echo "Sending the team invite.";;
    # ---- getting-started ----
    start-intro)       echo "Your first two minutes on AmperTalent, from landing page to first saved job.";;
    start-landing)     echo "The landing page lays out jobs, employers, and tools in one scroll.";;
    start-guest)       echo "As a guest, job browsing starts here with live public results and no account.";;
    start-signup)      echo "Signing up takes one click with a demo account, no email wait.";;
    start-role)        echo "Onboarding starts with a role pick, seeker for this tour.";;
    start-basic)       echo "Basic info covers name, location, and headline in one quick form.";;
    start-goals)       echo "Goals capture the target role and skills so matches land on day one.";;
    start-package)     echo "The package step picks a plan, and demo mode skips checkout.";;
    start-dashboard)   echo "The seeker dashboard opens with matches, stats, and next steps.";;
    start-find)        echo "The first job search runs live, and results stream in.";;
    start-save)        echo "One click saves the role for later. Applying belongs to the seeker journey tour.";;
    start-signup-wait) echo "Creating your demo account.";;
    start-onboard-wait) echo "Saving your onboarding.";;
    start-search-wait) echo "Searching open roles now.";;
    # ---- shared fillers ----
    filler-a) echo "One moment, this is loading.";;
    filler-b) echo "Almost there.";;
    filler-c) echo "Here we go.";;
    *) echo "";;
  esac
}

STEPS_seeker="seeker-intro seeker-dashboard seeker-jobs seeker-apply seeker-tracking seeker-services seeker-membership seeker-messages seeker-search-wait seeker-apply-wait seeker-upload-wait filler-a filler-b filler-c"
STEPS_employer="employer-intro employer-dashboard employer-postjob employer-talent employer-applicants employer-company employer-billing employer-postjob-wait employer-talent-wait filler-a filler-b filler-c"
STEPS_admin="admin-intro admin-dashboard admin-moderation admin-users admin-billing admin-concierge admin-growth admin-platform admin-queue-wait filler-a filler-b filler-c"
STEPS_tools="tools-intro tools-match tools-fit tools-pay tools-pipeline tools-talent tools-money tools-quality tools-run-wait filler-a filler-b filler-c"
STEPS_concierge="concierge-intro concierge-open concierge-request concierge-queue concierge-detail concierge-sourcing concierge-bio concierge-chatseek concierge-chateemp concierge-seeker concierge-request-wait concierge-search-wait filler-a filler-b filler-c"
STEPS_superadmin="superadmin-intro superadmin-sales superadmin-admins superadmin-plans superadmin-billing superadmin-crmmap superadmin-crmlog superadmin-logs superadmin-notify superadmin-subs superadmin-fallback superadmin-load-wait filler-a filler-b filler-c"
STEPS_team="team-intro team-team team-invite team-accept team-member team-review team-move team-remove team-invite-wait filler-a filler-b filler-c"
STEPS_start="start-intro start-landing start-guest start-signup start-role start-basic start-goals start-package start-dashboard start-find start-save start-signup-wait start-onboard-wait start-search-wait filler-a filler-b filler-c"

VENV="${TTS_VENV:-/tmp/tts-venv}"
EDGE_PY=""
if [ "$VOICE_ENGINE" = "edge" ]; then
  if [ ! -x "$VENV/bin/python" ]; then
    python3 -m venv "$VENV"
    "$VENV/bin/pip" install --quiet edge-tts
  fi
  if "$VENV/bin/python" -c "import edge_tts" 2>/dev/null; then
    EDGE_PY="$VENV/bin/python"
  else
    echo "edge-tts unavailable, falling back to say" >&2
  fi
fi

# Journeys to generate. Pass one or more names to only do those:
#   ./gen_voice_clips_all.sh /tmp/at-voice start
#   ./gen_voice_clips_all.sh /tmp/at-voice start superadmin
ALL_JOURNEYS="seeker employer admin tools concierge superadmin team start"
if [ $# -gt 1 ]; then
  # The first argument is the output base, the rest are journey names.
  shift
  JOURNEYS="$*"
else
  JOURNEYS="$ALL_JOURNEYS"
fi

for journey in $JOURNEYS; do
  OUTDIR="$OUTBASE/$journey"
  mkdir -p "$OUTDIR"
  var="STEPS_$journey"
  : > "$OUTDIR/durs.txt"
  for step in ${!var}; do
    txt="$(text_for_step "$step")"
    if [ -n "$EDGE_PY" ]; then
      "$EDGE_PY" -m edge_tts --voice "$VOICE" --text "$txt" --write-media "$OUTDIR/$step.mp3"
      ffmpeg -y -loglevel error -i "$OUTDIR/$step.mp3" -c:a aac "$OUTDIR/$step.m4a" && rm "$OUTDIR/$step.mp3"
    else
      say -v Daniel -r 175 -o "$OUTDIR/$step.aiff" "$txt"
      ffmpeg -y -loglevel error -i "$OUTDIR/$step.aiff" -c:a aac "$OUTDIR/$step.m4a" && rm "$OUTDIR/$step.aiff"
    fi
    dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTDIR/$step.m4a")
    ms=$(python3 -c "print(int(float('$dur') * 1000))")
    echo "clip $journey/$step dur ${dur}s"
    echo "$step $ms" >> "$OUTDIR/durs.txt"
  done
  python3 -c "
import json
d = {}
for line in open('$OUTDIR/durs.txt'):
    s, ms = line.split()
    d[s] = int(ms)
json.dump(d, open('$OUTDIR/durations.json', 'w'), indent=2)
"
  rm "$OUTDIR/durs.txt"
  echo "DURATIONS=$OUTDIR/durations.json"
done
