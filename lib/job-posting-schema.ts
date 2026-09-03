export interface JobPostingSchemaInput {
  title: string
  description: string
  company: string
  datePosted: string
  validThrough?: string
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN'
  location?: { city?: string; region?: string; country?: string; remote?: boolean }
  salaryMin?: number
  salaryMax?: number
  currency?: string
  hiringOrganizationUrl?: string
  url: string
}

export interface JobPostingSchema {
  '@context': 'https://schema.org'
  '@type': 'JobPosting'
  title: string
  description: string
  datePosted: string
  validThrough?: string
  employmentType?: string
  hiringOrganization: { '@type': 'Organization'; name: string; sameAs?: string }
  jobLocation?:
    | { '@type': 'Place'; address: { '@type': 'PostalAddress'; addressLocality?: string; addressRegion?: string; addressCountry?: string } }
    | { '@type': 'Place'; addressCountry?: string } & { additionalType?: string }
  jobLocationType?: 'TELECOMMUTE'
  baseSalary?: {
    '@type': 'MonetaryAmount'
    currency: string
    value: { '@type': 'QuantitativeValue'; minValue?: number; maxValue?: number; unitText: 'YEAR' }
  }
  url: string
}

export function jobPostingJsonLd(input: JobPostingSchemaInput): JobPostingSchema {
  const out: JobPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: input.title,
    description: input.description,
    datePosted: input.datePosted,
    hiringOrganization: { '@type': 'Organization', name: input.company },
    url: input.url,
  }
  if (input.validThrough) out.validThrough = input.validThrough
  if (input.employmentType) out.employmentType = input.employmentType

  if (input.location) {
    if (input.location.remote) {
      out.jobLocationType = 'TELECOMMUTE'
    } else {
      const addr: { '@type': 'PostalAddress'; addressLocality?: string; addressRegion?: string; addressCountry?: string } = {
        '@type': 'PostalAddress',
      }
      if (input.location.city) addr.addressLocality = input.location.city
      if (input.location.region) addr.addressRegion = input.location.region
      if (input.location.country) addr.addressCountry = input.location.country
      out.jobLocation = { '@type': 'Place', address: addr }
    }
  }
  if (typeof input.salaryMin === 'number' || typeof input.salaryMax === 'number') {
    out.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: (input.currency ?? 'USD').toUpperCase(),
      value: {
        '@type': 'QuantitativeValue',
        unitText: 'YEAR',
      },
    }
    if (typeof input.salaryMin === 'number') out.baseSalary.value.minValue = input.salaryMin
    if (typeof input.salaryMax === 'number') out.baseSalary.value.maxValue = input.salaryMax
  }
  if (input.hiringOrganizationUrl) out.hiringOrganization.sameAs = input.hiringOrganizationUrl
  return out
}

export function jobPostingScriptTag(schema: JobPostingSchema): string {
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}
