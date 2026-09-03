export interface CandidateNote {
  id: string
  candidateId: string
  authorId: string
  body: string
  at: string // ISO
  pinned?: boolean
  tags: string[]
}

export interface NewCandidateNote {
  candidateId: string
  authorId: string
  body: string
  pinned?: boolean
  tags?: string[]
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32)
}

let counter = 0
function genId() {
  counter++
  return `note-${Date.now().toString(36)}-${counter}`
}

export function createNote(input: NewCandidateNote): CandidateNote {
  const body = (input.body ?? '').trim()
  if (!body) throw new Error('createNote: body is required')
  if (body.length > 5000) throw new Error('createNote: body too long')
  return {
    id: genId(),
    candidateId: input.candidateId,
    authorId: input.authorId,
    body,
    at: new Date().toISOString(),
    pinned: !!input.pinned,
    tags: (input.tags ?? []).map((t) => slug(t)).filter(Boolean).slice(0, 8),
  }
}

export function searchNotes(notes: CandidateNote[], candidateId: string, query?: string): CandidateNote[] {
  const q = (query ?? '').toLowerCase().trim()
  return notes
    .filter((n) => n.candidateId === candidateId)
    .filter((n) => (q ? `${n.body} ${n.tags.join(' ')}`.toLowerCase().includes(q) : true))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.at.localeCompare(a.at)
    })
}

export function tagCounts(notes: CandidateNote[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const n of notes) {
    for (const t of n.tags) {
      out[t] = (out[t] ?? 0) + 1
    }
  }
  return out
}
