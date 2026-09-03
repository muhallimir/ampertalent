export interface ResumeSignals {
  rawText: string
  /** Optional pre-parsed skills for keyword density. */
  skills?: string[]
  /** Optional email/phone for contact-info presence. */
  email?: string
  phone?: string
}

export interface ResumeScore {
  overall: number
  signals: { name: string; present: boolean; points: number; note?: string }[]
  suggestions: string[]
}

const ACTION_VERBS = [
  'built', 'led', 'designed', 'shipped', 'launched', 'created', 'improved', 'reduced',
  'increased', 'owned', 'mentored', 'architected', 'implemented', 'automated',
  'migrated', 'scaled', 'deployed', 'analyzed', 'negotiated', 'recruited',
]

const WEAK_PHRASES = [
  'responsible for', 'worked on', 'helped with', 'duties included', 'in charge of',
]

function countMatches(text: string, words: string[]): number {
  const lc = text.toLowerCase()
  let n = 0
  for (const w of words) {
    const re = new RegExp(`\\b${w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g')
    n += (lc.match(re) ?? []).length
  }
  return n
}

function countBullets(text: string): number {
  return (text.match(/^\s*[-•*]/gm) ?? []).length
}

function countNumbers(text: string): number {
  return (text.match(/\b\d+([.,]\d+)?%?\b/g) ?? []).length
}

export function scoreResume(s: ResumeSignals): ResumeScore {
  const text = s.rawText ?? ''
  const signals: ResumeScore['signals'] = []
  const suggestions: string[] = []

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  const wordOk = wordCount >= 250 && wordCount <= 900
  signals.push({
    name: 'Length (250–900 words)',
    present: wordOk,
    points: wordOk ? 15 : wordCount > 0 ? 5 : 0,
    note: `Current: ${wordCount} words`,
  })
  if (!wordOk) suggestions.push('Aim for a one-page resume (250–600 words is typical).')

  const bulletCount = countBullets(text)
  const bulletsOk = bulletCount >= 8
  signals.push({
    name: 'Bullet-point experience',
    present: bulletsOk,
    points: bulletsOk ? 15 : Math.min(15, bulletCount * 2),
    note: `${bulletCount} bullets`,
  })
  if (!bulletsOk) suggestions.push('Convert paragraphs into bullet points under each role.')

  const actionVerbs = countMatches(text, ACTION_VERBS)
  const actionOk = actionVerbs >= 5
  signals.push({
    name: 'Action verbs',
    present: actionOk,
    points: actionOk ? 15 : Math.min(15, actionVerbs * 3),
    note: `${actionVerbs} action verbs found`,
  })
  if (!actionOk) suggestions.push('Start bullets with strong action verbs (Built, Led, Shipped).')

  const numbers = countNumbers(text)
  const metricsOk = numbers >= 4
  signals.push({
    name: 'Quantified impact',
    present: metricsOk,
    points: metricsOk ? 20 : Math.min(20, numbers * 4),
    note: `${numbers} numeric values`,
  })
  if (!metricsOk) suggestions.push('Add at least 4 numeric metrics (% growth, $ saved, time reduced).')

  const weak = countMatches(text, WEAK_PHRASES)
  const weakOk = weak === 0
  signals.push({
    name: 'No weak phrases',
    present: weakOk,
    points: weakOk ? 10 : Math.max(0, 10 - weak * 3),
    note: weak === 0 ? 'clean' : `${weak} weak phrases`,
  })
  if (!weakOk) suggestions.push('Replace "responsible for" with concrete action verbs.')

  if (s.email) {
    signals.push({ name: 'Email present', present: true, points: 5 })
  } else {
    signals.push({ name: 'Email present', present: false, points: 0, note: 'add a contact email' })
    suggestions.push('Include a professional email address.')
  }
  if (s.phone) {
    signals.push({ name: 'Phone present', present: true, points: 5 })
  } else {
    signals.push({ name: 'Phone present', present: false, points: 0 })
  }

  if (s.skills && s.skills.length > 0) {
    const lc = text.toLowerCase()
    const matched = s.skills.filter((sk) => lc.includes(sk.toLowerCase()))
    const ratio = matched.length / s.skills.length
    signals.push({
      name: 'Skills surfaced in body',
      present: ratio >= 0.5,
      points: Math.round(ratio * 15),
      note: `${matched.length}/${s.skills.length} skills mentioned`,
    })
    if (ratio < 0.5) suggestions.push('Mention your listed skills in your experience bullets.')
  }

  const overall = Math.max(0, Math.min(100, signals.reduce((n, sig) => n + sig.points, 0)))
  return { overall, signals, suggestions: suggestions.slice(0, 5) }
}
