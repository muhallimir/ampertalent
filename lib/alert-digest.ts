export interface AlertableJob {
  id: string
  title: string
  company: string
  location?: string
  remote?: boolean
  url: string
  salaryMin?: number
  salaryMax?: number
  postedAt: string
}

export interface AlertRule {
  userId: string
  keywords: string[]
  remoteOnly?: boolean
  minSalary?: number
}

export interface AlertDigestItem {
  job: AlertableJob
  matched: string[]
  score: number
}

export interface AlertDigest {
  rule: AlertRule
  items: AlertDigestItem[]
  generatedAt: string
}

function lc(s: string): string {
  return s.toLowerCase()
}

export function buildAlertDigest(
  rule: AlertRule,
  jobs: AlertableJob[],
  options: { now?: Date; maxItems?: number } = {}
): AlertDigest {
  const now = options.now ?? new Date()
  const maxItems = options.maxItems ?? 25
  const items: AlertDigestItem[] = []
  for (const job of jobs) {
    if (rule.remoteOnly && !job.remote) continue
    if (typeof rule.minSalary === 'number' && typeof job.salaryMax === 'number' && job.salaryMax < rule.minSalary) continue
    const haystack = `${job.title} ${job.company}`.toLowerCase()
    const matched = rule.keywords.filter((k) => haystack.includes(lc(k.trim()))).filter(Boolean)
    if (rule.keywords.length > 0 && matched.length === 0) continue
    const score = rule.keywords.length === 0 ? 50 : Math.round((matched.length / rule.keywords.length) * 100)
    items.push({ job, matched, score })
  }
  items.sort((a, b) => b.score - a.score || b.job.postedAt.localeCompare(a.job.postedAt))
  return { rule, items: items.slice(0, maxItems), generatedAt: now.toISOString() }
}

export function alertDigestSubject(d: AlertDigest): string {
  return `${d.items.length} new jobs for you — ${new Date(d.generatedAt).toDateString()}`
}
