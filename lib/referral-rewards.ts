export type ReferralStatus = 'pending' | 'in_progress' | 'hired' | 'rejected' | 'expired'

export interface Referral {
  id: string
  referrerId: string
  candidateId: string
  jobId: string
  status: ReferralStatus
  rewardCents: number
  createdAt: string
  hiredAt?: string
}

const REWARD_BY_STATUS: Record<ReferralStatus, number> = {
  pending: 0,
  in_progress: 0,
  hired: 50000, // $500
  rejected: 0,
  expired: 0,
}

const STATUS_FLOW: Record<ReferralStatus, ReferralStatus[]> = {
  pending: ['in_progress', 'rejected', 'expired'],
  in_progress: ['hired', 'rejected', 'expired'],
  hired: [],
  rejected: [],
  expired: [],
}

export function canTransitionReferral(from: ReferralStatus, to: ReferralStatus): boolean {
  return STATUS_FLOW[from]?.includes(to) ?? false
}

export function rewardFor(status: ReferralStatus): number {
  return REWARD_BY_STATUS[status]
}

export interface ReferralEarnings {
  totalCents: number
  pendingCents: number
  paidCents: number
  byJob: Record<string, number>
}

export function earnings(referrals: Referral[], options: { paidStatuses?: ReferralStatus[] } = {}): ReferralEarnings {
  const paid = new Set(options.paidStatuses ?? ['hired'])
  let totalCents = 0
  let pendingCents = 0
  let paidCents = 0
  const byJob: Record<string, number> = {}
  for (const r of referrals) {
    const amount = rewardFor(r.status)
    if (amount === 0) continue
    totalCents += amount
    byJob[r.jobId] = (byJob[r.jobId] ?? 0) + amount
    if (paid.has(r.status)) paidCents += amount
    else pendingCents += amount
  }
  return { totalCents, pendingCents, paidCents, byJob }
}
