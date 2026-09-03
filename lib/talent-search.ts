export interface TalentProfile {
  id: string
  name: string
  headline: string
  skills: string[]
  yearsExperience: number
  /** "open", "casual", "closed" */
  status: 'open' | 'casual' | 'closed'
  location?: string
  remote?: boolean
  expectedSalaryMin?: number
}

export interface TalentQuery {
  text?: string
  skills?: string[]
  minYears?: number
  openOnly?: boolean
  remote?: boolean
  location?: string
}

export interface TalentSearchResult {
  profile: TalentProfile
  score: number
  reasons: string[]
}

export function searchTalent(profiles: TalentProfile[], q: TalentQuery): TalentSearchResult[] {
  const text = (q.text ?? '').toLowerCase().trim()
  const skills = (q.skills ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean)
  const minYears = q.minYears ?? 0
  const results: TalentSearchResult[] = []
  for (const p of profiles) {
    if (q.openOnly && p.status !== 'open') continue
    if (q.remote && !p.remote) continue
    if (q.location && (!p.location || !p.location.toLowerCase().includes(q.location.toLowerCase()))) continue
    if (p.yearsExperience < minYears) continue

    const reasons: string[] = []
    let score = 0
    const haystack = `${p.name} ${p.headline} ${p.skills.join(' ')}`.toLowerCase()
    if (text) {
      if (haystack.includes(text)) {
        score += 40
        reasons.push(`text match on "${text}"`)
      } else {
        score -= 10
        reasons.push(`text "${text}" not found`)
      }
    } else {
      score += 20
    }
    if (skills.length > 0) {
      const matched = skills.filter((s) => p.skills.map((x) => x.toLowerCase()).includes(s))
      score += Math.round((matched.length / skills.length) * 50)
      if (matched.length > 0) reasons.push(`${matched.length}/${skills.length} skills matched`)
    } else {
      score += 25
    }
    if (p.yearsExperience >= minYears && minYears > 0) {
      score += 10
      reasons.push(`experience ${p.yearsExperience} >= ${minYears}`)
    }
    if (p.status === 'open') {
      score += 10
      reasons.push('actively open')
    } else if (p.status === 'casual') {
      score += 4
    }

    results.push({ profile: p, score: Math.max(0, Math.min(100, score)), reasons })
  }
  return results.sort((a, b) => b.score - a.score)
}
