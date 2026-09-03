import type { ApplicationStatus } from '@/lib/application-state-machine'
import { isTerminal } from '@/lib/application-state-machine'

const LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  screening: 'Screening',
  interview_scheduled: 'Interview scheduled',
  interviewing: 'Interviewing',
  offer_extended: 'Offer extended',
  offer_accepted: 'Offer accepted',
  offer_declined: 'Offer declined',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  hired: 'Hired',
  closed: 'Closed',
}

export function ApplicationStatusPill({ status }: { status: ApplicationStatus }) {
  const terminal = isTerminal(status)
  return (
    <span
      data-testid="status-pill"
      data-status={status}
      data-terminal={terminal ? 'true' : 'false'}
      className={[
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        terminal ? 'bg-gray-200 text-gray-700 line-through' : 'bg-blue-50 text-blue-700',
      ].join(' ')}
    >
      {LABELS[status] ?? status}
    </span>
  )
}
