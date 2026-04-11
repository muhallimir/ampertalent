/**
 * Job Constants
 * Centralized constants for job categories, types, and related enums
 */

// Job Categories - Object format with keys and labels
export const JOB_CATEGORIES = {
  ACCOUNTING_BOOKKEEPING: 'Accounting & Bookkeeping',
  ADMINISTRATION_VIRTUAL_ASSISTANT: 'Administration & Virtual Assistant',
  ADVERTISING: 'Advertising',
  BLOGGER: 'Blogger',
  BUSINESS_DEVELOPMENT: 'Business Development',
  COMPUTER_IT: 'Computer & IT',
  CONSULTANT: 'Consultant',
  CUSTOMER_SERVICE: 'Customer Service',
  DATABASE_DEVELOPMENT: 'Database Development',
  DESIGN: 'Design',
  FINANCE: 'Finance',
  GRAPHIC_DESIGN_ARTIST: 'Graphic Design & Artist',
  HUMAN_RESOURCES: 'Human Resources',
  INTERNET_MARKETING_SPECIALIST: 'Internet Marketing Specialist',
  MANAGER: 'Manager',
  MARKETING_PUBLIC_RELATIONS: 'Marketing & Public Relations',
  MEDIA_SPECIALIST: 'Media Specialist',
  OTHER: 'Other',
  PARALEGAL_LEGAL: 'Paralegal & Legal',
  PROGRAMMER: 'Programmer',
  RESEARCHER: 'Researcher',
  SALES: 'Sales',
  SOCIAL_MEDIA: 'Social Media',
  STRATEGIC_PLANNER: 'Strategic Planner',
  VIDEO_PRODUCTION_EDITING: 'Video Production & Editing',
  WEB_DESIGN_DEVELOPMENT: 'Web Design & Development',
  WEBSITE_MANAGER: 'Website Manager',
  WRITING_EDITING: 'Writing & Editing'
} as const

// Job Categories as array of objects (for select/dropdown components)
export const JOB_CATEGORIES_ARRAY = Object.entries(JOB_CATEGORIES).map(([value, label]) => ({
  value,
  label
}))

// Job Categories as simple array of strings (for filters)
export const JOB_CATEGORY_LABELS = Object.values(JOB_CATEGORIES)

// Job Categories keys only
export const JOB_CATEGORY_KEYS = Object.keys(JOB_CATEGORIES) as Array<keyof typeof JOB_CATEGORIES>

// Job Types
export const JOB_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'project', label: 'Project-based' }
] as const

// Experience Levels
export const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
  { value: 'lead', label: 'Lead/Principal' }
] as const

// Salary Types
export const SALARY_TYPES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
] as const

// Job Type Enums (for API compatibility)
export const JOB_TYPE_ENUMS = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  PERMANENT: 'PERMANENT',
  TEMPORARY: 'TEMPORARY',
  NOT_SPECIFIED: 'NOT_SPECIFIED'
} as const

// Job Types as array for admin forms (uppercase values)
export const JOB_TYPES_ADMIN = [
  { value: JOB_TYPE_ENUMS.FULL_TIME, label: 'Full Time' },
  { value: JOB_TYPE_ENUMS.PART_TIME, label: 'Part Time' },
  { value: JOB_TYPE_ENUMS.PERMANENT, label: 'Permanent' },
  { value: JOB_TYPE_ENUMS.TEMPORARY, label: 'Temporary' },
  { value: 'NOT_SPECIFIED', label: 'Not Specified' }
] as const

/**
 * Helper function to get the display label for a job category
 * Converts database values (e.g., MARKETING_PUBLIC_RELATIONS) to readable labels (e.g., Marketing & Public Relations)
 * @param category - The category key from the database
 * @returns The human-readable label, or the original value if not found
 */
export function getCategoryLabel(category: string | null | undefined): string {
  if (!category) return 'N/A'
  return JOB_CATEGORIES[category as keyof typeof JOB_CATEGORIES] || category
}

/**
 * Helper function to get the display label for a job type
 * Converts database values (e.g., FULL_TIME, PART_TIME) to readable labels (e.g., Full Time, Part Time)
 * @param jobType - The job type key from the database
 * @returns The human-readable label, or the original value if not found
 */
export function getJobTypeLabel(jobType: string | null | undefined): string {
  if (!jobType) return 'N/A'

  // Handle uppercase enum values (FULL_TIME, PART_TIME, etc.)
  const upperCaseMatch = JOB_TYPES_ADMIN.find(t => t.value === jobType)
  if (upperCaseMatch) return upperCaseMatch.label

  // Handle lowercase hyphenated values (full-time, part-time, etc.)
  const lowerCaseMatch = JOB_TYPES.find(t => t.value === jobType)
  if (lowerCaseMatch) return lowerCaseMatch.label

  // Fallback: convert underscores to spaces and capitalize
  return jobType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
