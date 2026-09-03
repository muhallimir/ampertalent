import type { DigestSection } from '@/lib/job-digest'

export function DigestPreview({
  subject,
  preheader,
  totalJobs,
  sections,
}: {
  subject: string
  preheader: string
  totalJobs: number
  sections: DigestSection[]
}) {
  if (totalJobs === 0) {
    return (
      <div data-testid="digest-empty" className="rounded-md border border-dashed p-4 text-sm text-gray-500">
        No new jobs today.
      </div>
    )
  }
  return (
    <article data-testid="digest" className="rounded-md border p-4 text-sm">
      <header>
        <h2 data-testid="digest-subject" className="text-base font-semibold">{subject}</h2>
        <p data-testid="digest-preheader" className="text-xs text-gray-500">{preheader}</p>
        <p data-testid="digest-total" className="mt-1 text-xs">Total: {totalJobs}</p>
      </header>
      <ul className="mt-3 space-y-2">
        {sections.map((s) => (
          <li key={s.heading}>
            <h3 className="font-medium">{s.heading}</h3>
            <ul>
              {s.jobs.map((j) => (
                <li key={j.id}>
                  <a href={j.url}>{j.title}</a> at {j.company}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </article>
  )
}
