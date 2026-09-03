export interface PostingSignals {
  title: string
  description: string
  salaryMin?: number
  salaryMax?: number
  location?: string
  remote?: boolean
  employmentType?: string
  companyName: string
  applyUrl?: string
}

export interface PostingScore {
  overall: number
  reasons: string[]
  signals: { name: string; present: boolean; points: number; note?: string }[]
  suggestions: string[]
}

export function scoreJobPosting(p: PostingSignals): PostingScore {
  const signals: PostingScore['signals'] = []
  const reasons: string[] = []
  const suggestions: string[] = []

  const titleOk = p.title.length >= 8 && p.title.length <= 80
  signals.push({
    name: 'Title length (8-80)',
    present: titleOk,
    points: titleOk ? 10 : 4,
    note: `length ${p.title.length}`,
  })
  if (!titleOk) suggestions.push('Use a clear, specific job title (8-80 chars).')
  if (titleOk) reasons.push('title length is good')

  const descLen = (p.description ?? '').split(/\s+/).filter(Boolean).length
  const descOk = descLen >= 120
  signals.push({
    name: 'Description (>= 120 words)',
    present: descOk,
    points: descOk ? 20 : Math.min(20, Math.round((descLen / 120) * 20)),
    note: `${descLen} words`,
  })
  if (!descOk) suggestions.push('Add more detail: responsibilities, requirements, and perks.')
  if (descOk) reasons.push('description is detailed')

  const salaryOk = typeof p.salaryMin === 'number' || typeof p.salaryMax === 'number'
  signals.push({
    name: 'Salary disclosed',
    present: salaryOk,
    points: salaryOk ? 20 : 0,
  })
  if (!salaryOk) suggestions.push('Posting salary lifts apply rate by ~30%. Add a range.')
  if (salaryOk) reasons.push('salary disclosed')

  const locOk = !!p.location || !!p.remote
  signals.push({ name: 'Location or remote flag', present: locOk, points: locOk ? 10 : 0 })
  if (!locOk) suggestions.push('Add a location or mark the role as remote.')
  if (locOk) reasons.push('location provided')

  const typeOk = !!p.employmentType
  signals.push({ name: 'Employment type', present: typeOk, points: typeOk ? 10 : 0 })
  if (!typeOk) suggestions.push('Specify full-time, part-time, or contract.')

  const companyOk = (p.companyName ?? '').length >= 2
  signals.push({ name: 'Company name', present: companyOk, points: companyOk ? 10 : 0 })

  const applyOk = !!p.applyUrl
  signals.push({ name: 'Apply URL', present: applyOk, points: applyOk ? 10 : 0 })
  if (!applyOk) suggestions.push('Add a direct apply URL or email.')

  const overall = signals.reduce((n, s) => n + s.points, 0)
  return { overall, reasons, signals, suggestions: suggestions.slice(0, 5) }
}
