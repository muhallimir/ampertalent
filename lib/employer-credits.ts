export interface CreditsAccount {
  employerId: string
  balance: number
  lifetimePurchased: number
  lifetimeConsumed: number
}

export interface CreditsState extends CreditsAccount {
  transactions: CreditsTransaction[]
}

export type CreditsTransactionKind = 'purchase' | 'consume' | 'refund' | 'grant' | 'expire'

export interface CreditsTransaction {
  id: string
  kind: CreditsTransactionKind
  amount: number // signed: purchases/refunds/grants/expirations are positive on credit, consumes are negative
  reason: string
  at: string // ISO timestamp
}

export function emptyAccount(employerId: string): CreditsState {
  return {
    employerId,
    balance: 0,
    lifetimePurchased: 0,
    lifetimeConsumed: 0,
    transactions: [],
  }
}

export function applyTransaction(state: CreditsState, tx: Omit<CreditsTransaction, 'id' | 'at'> & { id?: string; at?: string }): CreditsState {
  const id = tx.id ?? `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const at = tx.at ?? new Date().toISOString()
  const signed = tx.kind === 'consume' ? -Math.abs(tx.amount) : Math.abs(tx.amount)
  const next: CreditsState = {
    ...state,
    balance: state.balance + signed,
    transactions: [...state.transactions, { id, at, kind: tx.kind, amount: signed, reason: tx.reason }],
  }
  if (tx.kind === 'purchase' || tx.kind === 'grant' || tx.kind === 'refund') {
    next.lifetimePurchased = state.lifetimePurchased + Math.abs(tx.amount)
  } else if (tx.kind === 'consume') {
    next.lifetimeConsumed = state.lifetimeConsumed + Math.abs(tx.amount)
  }
  return next
}

export function canConsume(state: CreditsState, amount = 1): boolean {
  return state.balance >= amount
}

export function consume(state: CreditsState, reason: string, amount = 1): CreditsState {
  if (!canConsume(state, amount)) {
    throw new Error(`insufficient credits: have ${state.balance}, need ${amount}`)
  }
  return applyTransaction(state, { kind: 'consume', amount, reason })
}
