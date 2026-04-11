export type EmployerDisplayStatus = 'Approved' | 'Inactive' | 'Suspended'

export interface EmployerJobSummary {
  status: string
  expiresAt: string | Date | null
}

export interface EmployerPackageSummary {
  expiresAt: string | Date | null
}

/**
 * Active job condition — mirrors the Prisma WHERE subquery used in the API filter.
 * A job is "active" when its status is active/published AND it is not expired.
 */
export function isActiveJob(job: EmployerJobSummary): boolean {
  const isActiveStatus = job.status === 'approved'
  const isNotExpired = !job.expiresAt || new Date(job.expiresAt) > new Date()
  return isActiveStatus && isNotExpired
}

/**
 * A package is "valid" when it has not expired.
 */
export function isValidPackage(pkg: EmployerPackageSummary): boolean {
  return !pkg.expiresAt || new Date(pkg.expiresAt) > new Date()
}

/**
 * Returns the display status shown on badges and used by API filters.
 *
 * - Suspended  → isSuspended = true
 * - Approved   → not suspended + at least one active job OR valid package
 * - Inactive   → not suspended + no active jobs AND no valid packages
 */
export function getEmployerDisplayStatus(
  isSuspended: boolean,
  jobs: EmployerJobSummary[],
  packages: EmployerPackageSummary[] = []
): EmployerDisplayStatus {
  if (isSuspended) return 'Suspended'
  const hasActiveJob = jobs.some(isActiveJob)
  const hasValidPackage = packages.some(isValidPackage)
  return hasActiveJob || hasValidPackage ? 'Approved' : 'Inactive'
}

/**
 * Prisma-compatible WHERE subquery that matches the isActiveJob logic above.
 * Use with `jobs: { some: activeJobWhereClause() }` or `jobs: { none: activeJobWhereClause() }`.
 * Called as a function so `new Date()` is evaluated at query time, not at module load time.
 */
export function activeJobWhereClause() {
  return {
    status: 'approved' as const,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  }
}

/**
 * Prisma-compatible WHERE subquery for valid (non-expired) packages.
 * Called as a function so `new Date()` is evaluated at query time.
 */
export function validPackageWhereClause() {
  return {
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  }
}
