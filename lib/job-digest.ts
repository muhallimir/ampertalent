export interface DigestJob {
  id: string
  title: string
  company: string
  location?: string
  remote?: boolean
  salaryMin?: number
  salaryMax?: number
  url: string
}

export interface DigestSection {
  heading: string
  jobs: DigestJob[]
}

export interface ComposedDigest {
  subject: string
  preheader: string
  sections: DigestSection[]
  totalJobs: number
  markdown: string
  html: string
}

function formatSalary(j: DigestJob): string {
  if (j.salaryMin == null && j.salaryMax == null) return ''
  if (j.salaryMin != null && j.salaryMax != null) return ` · $${j.salaryMin.toLocaleString()}-$${j.salaryMax.toLocaleString()}`
  if (j.salaryMin != null) return ` · from $${j.salaryMin.toLocaleString()}`
  return ` · up to $${j.salaryMax!.toLocaleString()}`
}

function formatJob(j: DigestJob): string {
  const loc = j.remote ? 'Remote' : j.location ?? ''
  return `- **${j.title}** at *${j.company}*${loc ? ` (${loc})` : ''}${formatSalary(j)} — [Apply](${j.url})`
}

/**
 * Compose a digest email subject + body from grouped jobs.
 *
 * The grouped structure is preserved (so we can render a TOC) and the same
 * jobs are flattened into a markdown body + a minimal HTML body.
 */
export function composeDigest(input: {
  recipientName: string
  sections: DigestSection[]
  date?: Date
}): ComposedDigest {
  const date = input.date ?? new Date()
  const dateLabel = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const totalJobs = input.sections.reduce((n, s) => n + s.jobs.length, 0)
  const subject = `${totalJobs} new jobs for ${input.recipientName} — ${dateLabel}`
  const preheader = `${totalJobs} hand-picked roles across ${input.sections.length} categories`
  const markdown = [
    `Hi ${input.recipientName},`,
    ``,
    `Here are today's ${totalJobs} new roles (${dateLabel}):`,
    ``,
    ...input.sections.flatMap((s) => [
      `## ${s.heading}`,
      ...s.jobs.map(formatJob),
      ``,
    ]),
  ].join('\n')
  const html = `<!doctype html>
<html><body>
<p>Hi ${escapeHtml(input.recipientName)},</p>
<p>${totalJobs} new roles for ${dateLabel}:</p>
${input.sections
  .map(
    (s) =>
      `<h2>${escapeHtml(s.heading)}</h2><ul>${s.jobs
        .map((j) => `<li><a href="${escapeAttr(j.url)}">${escapeHtml(j.title)}</a> at ${escapeHtml(j.company)}</li>`)
        .join('')}</ul>`,
  )
  .join('')}
</body></html>`
  return { subject, preheader, sections: input.sections, totalJobs, markdown, html }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function escapeAttr(s: string): string {
  return escapeHtml(s)
}
