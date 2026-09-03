export type ApplicationStatus =
  | 'submitted'
  | 'screening'
  | 'interview_scheduled'
  | 'interviewing'
  | 'offer_extended'
  | 'offer_accepted'
  | 'offer_declined'
  | 'rejected'
  | 'withdrawn'
  | 'hired'
  | 'closed'

export type ApplicationActor = 'seeker' | 'employer' | 'system'

interface Transition {
  from: ApplicationStatus
  to: ApplicationStatus
  actors: ApplicationActor[]
}

/**
 * The application lifecycle. Every move is named with the allowed actor so
 * the UI can hide buttons a user is not allowed to click.
 */
const TRANSITIONS: Transition[] = [
  { from: 'submitted', to: 'screening', actors: ['employer', 'system'] },
  { from: 'submitted', to: 'withdrawn', actors: ['seeker'] },
  { from: 'submitted', to: 'rejected', actors: ['employer'] },
  { from: 'screening', to: 'interview_scheduled', actors: ['employer'] },
  { from: 'screening', to: 'rejected', actors: ['employer'] },
  { from: 'screening', to: 'withdrawn', actors: ['seeker'] },
  { from: 'interview_scheduled', to: 'interviewing', actors: ['system', 'employer'] },
  { from: 'interview_scheduled', to: 'rejected', actors: ['employer'] },
  { from: 'interview_scheduled', to: 'withdrawn', actors: ['seeker'] },
  { from: 'interviewing', to: 'offer_extended', actors: ['employer'] },
  { from: 'interviewing', to: 'rejected', actors: ['employer'] },
  { from: 'interviewing', to: 'withdrawn', actors: ['seeker'] },
  { from: 'offer_extended', to: 'offer_accepted', actors: ['seeker'] },
  { from: 'offer_extended', to: 'offer_declined', actors: ['seeker'] },
  { from: 'offer_extended', to: 'withdrawn', actors: ['seeker'] },
  { from: 'offer_accepted', to: 'hired', actors: ['system', 'employer'] },
  { from: 'offer_accepted', to: 'closed', actors: ['employer'] },
  { from: 'offer_declined', to: 'closed', actors: ['employer', 'system'] },
  { from: 'rejected', to: 'closed', actors: ['employer', 'system'] },
  { from: 'withdrawn', to: 'closed', actors: ['seeker', 'system'] },
]

export function canTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  actor: ApplicationActor
): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.to === to && t.actors.includes(actor))
}

export function nextStatuses(from: ApplicationStatus, actor: ApplicationActor): ApplicationStatus[] {
  return TRANSITIONS
    .filter((t) => t.from === from && t.actors.includes(actor))
    .map((t) => t.to)
}

export function isTerminal(status: ApplicationStatus): boolean {
  return status === 'hired' || status === 'closed'
}
