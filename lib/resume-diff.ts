export interface ResumeVersion {
  rawText: string
  skills: string[]
  experienceBullets: string[]
  yearsExperience: number
}

export interface ResumeDiff {
  addedSkills: string[]
  removedSkills: string[]
  addedBullets: string[]
  removedBullets: string[]
  yearsDelta: number
  wordsAdded: number
  wordsRemoved: number
  summary: string
}

function wordSet(s: string): Set<string> {
  return new Set(s.toLowerCase().split(/\s+/).filter((w) => w.length > 2))
}

function lineSet(s: string): Set<string> {
  return new Set(s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
}

export function diffResume(a: ResumeVersion, b: ResumeVersion): ResumeDiff {
  const aSkills = new Set(a.skills.map((s) => s.toLowerCase()))
  const bSkills = new Set(b.skills.map((s) => s.toLowerCase()))
  const addedSkills = [...bSkills].filter((s) => !aSkills.has(s))
  const removedSkills = [...aSkills].filter((s) => !bSkills.has(s))

  const aBullets = lineSet(a.experienceBullets.join('\n'))
  const bBullets = lineSet(b.experienceBullets.join('\n'))
  const addedBullets = [...bBullets].filter((l) => !aBullets.has(l))
  const removedBullets = [...aBullets].filter((l) => !bBullets.has(l))

  const aWords = wordSet(a.rawText)
  const bWords = wordSet(b.rawText)
  const wordsAdded = [...bWords].filter((w) => !aWords.has(w)).length
  const wordsRemoved = [...aWords].filter((w) => !bWords.has(w)).length

  const yearsDelta = b.yearsExperience - a.yearsExperience

  const summary = `${addedSkills.length} skills added, ${removedSkills.length} removed, ${addedBullets.length} new bullets, ${yearsDelta > 0 ? '+' : ''}${yearsDelta}y experience.`

  return { addedSkills, removedSkills, addedBullets, removedBullets, yearsDelta, wordsAdded, wordsRemoved, summary }
}
