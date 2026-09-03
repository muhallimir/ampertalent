import { render, screen } from '@testing-library/react'
import { JobSchemaInspector } from '@/components/features/job-schema-inspector'

describe('JobSchemaInspector', () => {
  it('renders the JSON-LD title and company', () => {
    const schema = {
      '@context': 'https://schema.org' as const,
      '@type': 'JobPosting' as const,
      title: 'Senior FE',
      description: 'Build things',
      datePosted: '2026-01-05',
      hiringOrganization: { '@type': 'Organization' as const, name: 'Acme' },
      url: 'https://example.com/jobs/1',
    }
    render(<JobSchemaInspector schema={schema} />)
    expect(screen.getByTestId('schema-title').textContent).toMatch(/senior fe/i)
    expect(screen.getByTestId('schema-org').textContent).toMatch(/acme/i)
  })
})
