export interface Job {
  id: string
  title: string
  company: string
  description?: string
  location?: string
  url?: string
  postedAt?: string
}

export interface DuplicatePair {
  a: Job
  b: Job
  score: number // 0..100, higher = more likely duplicate
  reasons: string[]
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a)
  const B = new Set(b)
  let inter = 0
  A.forEach((x) => { if (B.has(x)) inter++ })
  const union = A.size + B.size - inter
  return union === 0 ? 0 : inter / union
}

function tokens(s: string): string[] {
  return norm(s).split(' ').filter((t) => t.length > 2)
}

export function similarity(a: Job, b: Job): number {
  let score = 0
  const reasons: string[] = []
  const titleA = norm(a.title)
  const titleB = norm(b.title)
  if (titleA === titleB) {
    score += 60
    reasons.push('title identical')
  } else {
    const tJ = jaccard(tokens(a.title), tokens(b.title))
    score += Math.round(tJ * 40)
    if (tJ > 0) reasons.push(`title jaccard ${tJ.toFixed(2)}`)
  }
  const compA = norm(a.company)
  const compB = norm(b.company)
  if (compA && compB) {
    if (compA === compB) {
      score += 30
      reasons.push('company identical')
    } else if (compA.includes(compB) || compB.includes(compA)) {
      score += 20
      reasons.push('company substring match')
    }
  }
  if (a.location && b.location && norm(a.location) === norm(b.location)) {
    score += 10
    reasons.push('location identical')
  }
  return Math.max(0, Math.min(100, score))
}

export function findDuplicates(jobs: Job[], threshold = 70): DuplicatePair[] {
  const out: DuplicatePair[] = []
  for (let i = 0; i < jobs.length; i++) {
    for (let j = i + 1; j < jobs.length; j++) {
      const s = similarity(jobs[i], jobs[j])
      if (s >= threshold) {
        out.push({ a: jobs[i], b: jobs[j], score: s, reasons: [] })
      }
    }
  }
  return out.sort((x, y) => y.score - x.score)
}
