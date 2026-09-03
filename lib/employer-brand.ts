export interface BrandAsset {
  id: string
  type: 'logo' | 'banner' | 'photo' | 'video' | 'testimonial'
  url: string
  title?: string
  weight?: number
}

export interface BrandProfile {
  employerId: string
  assets: BrandAsset[]
  tagline?: string
  about?: string
}

export interface BrandCompleteness {
  hasLogo: boolean
  hasBanner: boolean
  hasAbout: boolean
  hasTestimonial: boolean
  photoCount: number
  videoCount: number
  score: number
  missing: string[]
}

export function scoreBrandCompleteness(p: BrandProfile): BrandCompleteness {
  const hasLogo = p.assets.some((a) => a.type === 'logo')
  const hasBanner = p.assets.some((a) => a.type === 'banner')
  const hasAbout = !!p.about && p.about.trim().length > 40
  const hasTestimonial = p.assets.some((a) => a.type === 'testimonial')
  const photoCount = p.assets.filter((a) => a.type === 'photo').length
  const videoCount = p.assets.filter((a) => a.type === 'video').length

  let score = 0
  if (hasLogo) score += 20
  if (hasBanner) score += 15
  if (hasAbout) score += 25
  if (hasTestimonial) score += 20
  if (photoCount >= 3) score += 10
  else if (photoCount >= 1) score += 5
  if (videoCount >= 1) score += 10

  const missing: string[] = []
  if (!hasLogo) missing.push('Add a logo')
  if (!hasBanner) missing.push('Add a banner image')
  if (!hasAbout) missing.push('Write an "About" paragraph (40+ chars)')
  if (!hasTestimonial) missing.push('Add at least one employee testimonial')
  if (photoCount < 3) missing.push(`Upload ${3 - photoCount} more office/team photo${photoCount === 2 ? '' : 's'}`)
  if (videoCount < 1) missing.push('Add a short intro or culture video')

  return { hasLogo, hasBanner, hasAbout, hasTestimonial, photoCount, videoCount, score, missing }
}
