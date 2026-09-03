export interface ImportRow {
  name?: string
  email?: string
  skills?: string
  yearsExperience?: string
  location?: string
}

export interface ParsedCandidate {
  name: string
  email: string
  skills: string[]
  yearsExperience: number
  location?: string
}

export interface ImportIssue {
  line: number
  field: string
  message: string
}

export interface ImportResult {
  candidates: ParsedCandidate[]
  issues: ImportIssue[]
  total: number
  imported: number
}

const REQUIRED = ['name', 'email'] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

export function parseCsv(csv: string): { header: string[]; rows: ImportRow[] } {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { header: [], rows: [] }
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const rows: ImportRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const row: ImportRow = {}
    for (let j = 0; j < header.length; j++) {
      const key = header[j] as keyof ImportRow
      ;(row as Record<string, string | undefined>)[key] = cells[j] ?? ''
    }
    rows.push(row)
  }
  return { header, rows }
}

export function validateAndBuild(csv: string): ImportResult {
  const { rows } = parseCsv(csv)
  const issues: ImportIssue[] = []
  const candidates: ParsedCandidate[] = []
  rows.forEach((r, idx) => {
    const line = idx + 2 // +1 header, +1 for 1-indexed
    for (const req of REQUIRED) {
      if (!r[req] || String(r[req]).trim() === '') {
        issues.push({ line, field: req, message: 'required' })
      }
    }
    if (r.email && !EMAIL_RE.test(r.email.trim())) {
      issues.push({ line, field: 'email', message: 'invalid email' })
    }
    const years = r.yearsExperience ? parseInt(r.yearsExperience, 10) : NaN
    if (r.yearsExperience && (Number.isNaN(years) || years < 0 || years > 60)) {
      issues.push({ line, field: 'yearsExperience', message: 'out of range' })
    }
    if (r.name && r.email && EMAIL_RE.test(r.email.trim())) {
      candidates.push({
        name: r.name.trim(),
        email: r.email.trim().toLowerCase(),
        skills: (r.skills ?? '').split(/[;|]/).map((s) => s.trim()).filter(Boolean),
        yearsExperience: Number.isNaN(years) ? 0 : years,
        location: r.location?.trim() || undefined,
      })
    }
  })
  return { candidates, issues, total: rows.length, imported: candidates.length }
}
