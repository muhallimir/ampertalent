export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export interface UniquifyOptions {
  /** Existing slugs already taken. */
  taken: string[]
  /** Optional separator. */
  sep?: string
}

/** Make a slug unique by appending -2, -3, ... if necessary. */
export function uniquify(base: string, options: UniquifyOptions): string {
  const sep = options.sep ?? '-'
  const taken = new Set(options.taken)
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}${sep}${i}`)) i++
  return `${base}${sep}${i}`
}

export function jobSlug(title: string, company: string, taken: string[] = []): string {
  const base = slugify(`${title}-${company}`) || 'job'
  return uniquify(base, { taken })
}
