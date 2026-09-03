export interface ResumeSignal {
  yearsExperience?: number
  skills: string[]
  education?: string
  pastTitles: string[]
  /** Free-form "about me" / summary. */
  summary?: string
}

export interface JobRequirements {
  minYearsExperience?: number
  requiredSkills: string[]
  niceToHaveSkills: string[]
  /** Title the company is hiring for, lowercase. */
  title: string
  description?: string
}

export interface AtsBreakdown {
  matched: string[]
  missing: string[]
  niceMatched: string[]
  yearsOk: boolean
  titleOk: boolean
  /** Aggregate score 0..100. */
  score: number
}

/**
 * Score a resume against a job description.
 *
 * The breakdown is intentionally deterministic so the UI can show the user
 * exactly which signals moved the score up or down. The score is a heuristic
 * for ATS-style fit, not a guarantee of an interview.
 */
export function scoreAtsFit(resume: ResumeSignal, job: JobRequirements): AtsBreakdown {
  const resumeSkills = new Set(resume.skills.map((s) => s.toLowerCase().trim()).filter(Boolean))
  const required = job.requiredSkills.map((s) => s.toLowerCase().trim()).filter(Boolean)
  const nice = job.niceToHaveSkills.map((s) => s.toLowerCase().trim()).filter(Boolean)

  const matched = required.filter((s) => resumeSkills.has(s))
  const missing = required.filter((s) => !resumeSkills.has(s))
  const niceMatched = nice.filter((s) => resumeSkills.has(s))

  let score = 0

  if (required.length > 0) {
    score += Math.round((matched.length / required.length) * 60)
  } else {
    score += 30
  }

  if (nice.length > 0) {
    score += Math.min(15, niceMatched.length * 5)
  }

  const years = resume.yearsExperience ?? 0
  if (typeof job.minYearsExperience === 'number' && job.minYearsExperience > 0) {
    if (years >= job.minYearsExperience) {
      score += 15
    } else if (years >= job.minYearsExperience - 1) {
      score += 7
    }
  } else {
    score += 10
  }

  const titleOk = job.title
    ? (resume.pastTitles ?? []).some((t) => t.toLowerCase().includes(job.title.toLowerCase())) ||
      (resume.summary ?? '').toLowerCase().includes(job.title.toLowerCase())
    : true
  if (titleOk) score += 10

  return {
    matched,
    missing,
    niceMatched,
    yearsOk: typeof job.minYearsExperience === 'number' ? years >= job.minYearsExperience : true,
    titleOk,
    score: Math.max(0, Math.min(100, score)),
  }
}

export function atsSuggestions(breakdown: AtsBreakdown, max: number = 5): string[] {
  const out: string[] = []
  for (const m of breakdown.missing) {
    if (out.length >= max) break
    out.push(`Consider adding "${m}" if you have experience with it.`)
  }
  if (breakdown.matched.length > 0 && out.length < max) {
    out.push(`Highlight your ${breakdown.matched.length} matched skill(s) near the top of your resume.`)
  }
  if (!breakdown.titleOk && out.length < max) {
    out.push('Mirror the job title verbatim in your summary to pass keyword filters.')
  }
  if (!breakdown.yearsOk && out.length < max) {
    out.push('Quantify years of experience for each skill to make tenure obvious.')
  }
  return out.slice(0, max)
}
