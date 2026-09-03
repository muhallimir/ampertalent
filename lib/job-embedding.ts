export interface JobVector {
  id: string
  tokens: string[]
  /** Sparse term-frequency map. */
  tf: Record<string, number>
  length: number
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+\-#.]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

export function embed(input: { id: string; title: string; description?: string; skills?: string[] }): JobVector {
  const tokens = [
    ...tokenize(input.title),
    ...tokenize(input.title),
    ...tokenize(input.description ?? ''),
    ...(input.skills ?? []).flatMap((s) => tokenize(s)),
  ]
  const tf: Record<string, number> = {}
  for (const t of tokens) {
    tf[t] = (tf[t] ?? 0) + 1
  }
  return { id: input.id, tokens, tf, length: tokens.length }
}

function cosine(a: JobVector, b: JobVector): number {
  let dot = 0
  for (const k of Object.keys(a.tf)) {
    if (b.tf[k] != null) dot += a.tf[k] * b.tf[k]
  }
  const na = Math.sqrt(Object.values(a.tf).reduce((n, v) => n + v * v, 0))
  const nb = Math.sqrt(Object.values(b.tf).reduce((n, v) => n + v * v, 0))
  if (na === 0 || nb === 0) return 0
  return dot / (na * nb)
}

export function similarJobs(vectors: JobVector[], query: JobVector, topK = 5): { id: string; score: number }[] {
  return vectors
    .filter((v) => v.id !== query.id)
    .map((v) => ({ id: v.id, score: cosine(query, v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
