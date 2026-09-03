export interface ProfileSignals {
  name?: string
  headline?: string
  about?: string
  skills: string[]
  experienceCount: number
  educationCount: number
  hasAvatar: boolean
  hasResumeFile: boolean
  links: { label: string; url: string }[]
}

export interface ProfileStrength {
  score: number
  level: 'sparse' | 'building' | 'strong' | 'complete'
  missing: string[]
}

const MIN_ABOUT = 120
const MIN_SKILLS = 5

export function profileStrength(p: ProfileSignals): ProfileStrength {
  let score = 0
  const missing: string[] = []

  if (p.name && p.name.trim().length >= 2) score += 10
  else missing.push('Add your name')

  if (p.headline && p.headline.trim().length >= 8) score += 10
  else missing.push('Add a short headline (e.g. "Senior Frontend Engineer")')

  if (p.about && p.about.trim().length >= MIN_ABOUT) score += 20
  else missing.push(`Write an "About" section (>= ${MIN_ABOUT} chars)`)

  if (p.skills.length >= MIN_SKILLS) score += 15
  else missing.push(`Add at least ${MIN_SKILLS} skills`)

  if (p.experienceCount >= 1) score += 15
  else missing.push('Add at least one work experience')

  if (p.educationCount >= 1) score += 10
  else missing.push('Add your education')

  if (p.hasAvatar) score += 10
  else missing.push('Upload a profile photo')

  if (p.hasResumeFile) score += 5
  else missing.push('Upload a resume file')

  if (p.links.length >= 1) score += 5
  else missing.push('Add a portfolio or LinkedIn link')

  let level: ProfileStrength['level'] = 'sparse'
  if (score >= 90) level = 'complete'
  else if (score >= 70) level = 'strong'
  else if (score >= 40) level = 'building'

  return { score, level, missing: missing.slice(0, 6) }
}
