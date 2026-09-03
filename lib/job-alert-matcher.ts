export interface JobAlertCriteria {
  keywords: string[]
  location?: string
  remoteOnly?: boolean
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship'
  minSalary?: number
}

export interface JobPosting {
  id: string
  title: string
  description: string
  location?: string
  remote?: boolean
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship'
  salaryMin?: number
  salaryMax?: number
}

export interface MatchResult {
  jobId: string
  score: number
  reasons: string[]
}

/**
 * Score a job against an alert. The score is a number in [0, 100] plus a
 * list of human-readable reasons explaining the contribution of each
 * criterion. The score is not a probability; it is a ranking signal.
 */
export function scoreJobAgainstAlert(job: JobPosting, criteria: JobAlertCriteria): MatchResult {
  const reasons: string[] = []
  let score = 0

  const title = (job.title ?? '').toLowerCase()
  const description = (job.description ?? '').toLowerCase()
  const haystack = `${title} ${description}`
  const keywords = (criteria.keywords ?? []).map((k) => k.toLowerCase().trim()).filter(Boolean)

  if (keywords.length > 0) {
    const matched = keywords.filter((k) => haystack.includes(k))
    if (matched.length > 0) {
      const keywordScore = Math.round((matched.length / keywords.length) * 60)
      score += keywordScore
      reasons.push(`${matched.length} of ${keywords.length} keywords matched`)
    } else {
      reasons.push('no keyword matches')
    }
  } else {
    // No keywords supplied — don't penalize, just don't contribute.
    score += 30
    reasons.push('no keywords supplied; baseline 30')
  }

  if (criteria.remoteOnly) {
    if (job.remote) {
      score += 15
      reasons.push('remote-only satisfied')
    } else {
      score -= 25
      reasons.push('remote-only violated')
    }
  } else if (criteria.location) {
    const wanted = criteria.location.toLowerCase().trim()
    if (wanted && job.location && job.location.toLowerCase().includes(wanted)) {
      score += 15
      reasons.push(`location contains "${wanted}"`)
    } else if (wanted) {
      reasons.push(`location "${job.location ?? 'unset'}" does not contain "${wanted}"`)
    }
  }

  if (criteria.jobType && job.jobType) {
    if (criteria.jobType === job.jobType) {
      score += 10
      reasons.push(`job type matches (${job.jobType})`)
    } else {
      reasons.push(`job type ${job.jobType} does not match wanted ${criteria.jobType}`)
    }
  }

  if (typeof criteria.minSalary === 'number' && criteria.minSalary > 0) {
    if (typeof job.salaryMax === 'number' && job.salaryMax >= criteria.minSalary) {
      score += 15
      reasons.push(`salary cap ${job.salaryMax} >= floor ${criteria.minSalary}`)
    } else if (typeof job.salaryMin === 'number' && job.salaryMin >= criteria.minSalary) {
      score += 10
      reasons.push(`salary min ${job.salaryMin} >= floor ${criteria.minSalary}`)
    } else {
      reasons.push(`salary below floor ${criteria.minSalary}`)
    }
  }

  return { jobId: job.id, score: Math.max(0, Math.min(100, score)), reasons }
}

export function rankJobs(
  jobs: JobPosting[],
  criteria: JobAlertCriteria,
  options: { minScore?: number } = {}
): MatchResult[] {
  const minScore = options.minScore ?? 0
  return jobs
    .map((j) => scoreJobAgainstAlert(j, criteria))
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
}
