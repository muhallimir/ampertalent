/**
 * Demo Seeding — Sample Data Builders — Unit Tests
 *
 * These tests pin the contract for `lib/demo-seeding.ts`:
 *  - buildSeekerOnboardingStub — what a fresh demo-seeker onboarding payload looks like
 *  - buildEmployerOnboardingStub — same for employer
 *  - buildSampleJobs — sample jobs owned by a demo-employer
 *  - buildSampleApplications — sample applications submitted by a demo-seeker
 *
 * All builders are PURE functions so they're tested in isolation without the DB.
 *
 * Field names mirror the real Prisma schema: `employerId` (not postedById),
 * `status: 'approved'` (a live listing), `type` / `category` enums.
 */

import { describe, it, expect } from '@jest/globals'
import {
  buildSeekerOnboardingStub,
  buildEmployerOnboardingStub,
  buildSampleJobs,
  buildSampleApplications,
} from '@/lib/demo-seeding'

describe('Demo Seeding — pure data builders', () => {
  describe('buildSeekerOnboardingStub', () => {
    it('produces a stub with firstName, lastName, role seeker', () => {
      const stub = buildSeekerOnboardingStub({ name: 'demo-seeker-1719938112443' })
      expect(stub.role).toBe('seeker')
      expect(stub.firstName).toBeTruthy()
      expect(stub.lastName).toBeTruthy()
    })

    it('derives a sensible first name from the demo name', () => {
      const stub = buildSeekerOnboardingStub({ name: 'demo-seeker-1234' })
      expect(stub.firstName.toLowerCase()).toContain('demo')
    })

    it('includes a professional summary so the seeker hits the package step', () => {
      const stub = buildSeekerOnboardingStub({ name: 'demo-seeker-1234' })
      expect(typeof stub.professionalSummary).toBe('string')
      expect(stub.professionalSummary.length).toBeGreaterThan(0)
    })

    it('includes a location so the seeker can complete the details step', () => {
      const stub = buildSeekerOnboardingStub({ name: 'demo-seeker-1234' })
      expect(stub.location).toBeTruthy()
    })

    it('includes a non-empty skills array', () => {
      const stub = buildSeekerOnboardingStub({ name: 'demo-seeker-1234' })
      expect(Array.isArray(stub.skills)).toBe(true)
      expect(stub.skills.length).toBeGreaterThan(0)
    })
  })

  describe('buildEmployerOnboardingStub', () => {
    it('produces a stub with firstName, lastName, role employer', () => {
      const stub = buildEmployerOnboardingStub({ name: 'demo-employer-1234' })
      expect(stub.role).toBe('employer')
      expect(stub.firstName).toBeTruthy()
      expect(stub.lastName).toBeTruthy()
    })

    it('includes a companyName so the employer can complete the details step', () => {
      const stub = buildEmployerOnboardingStub({ name: 'demo-employer-1234' })
      expect(stub.companyName).toBeTruthy()
    })

    it('includes a companySize so the details step is complete', () => {
      const stub = buildEmployerOnboardingStub({ name: 'demo-employer-1234' })
      expect(stub.companySize).toBeTruthy()
    })
  })

  describe('buildSampleJobs', () => {
    it('returns the requested number of jobs', () => {
      const jobs = buildSampleJobs({ employerProfileId: 'prof_123', count: 3 })
      expect(jobs).toHaveLength(3)
    })

    it('every job has the correct employerId', () => {
      const jobs = buildSampleJobs({ employerProfileId: 'prof_abc', count: 5 })
      for (const job of jobs) {
        expect(job.employerId).toBe('prof_abc')
      }
    })

    it('every job has a human-readable title that contains "Demo"', () => {
      const jobs = buildSampleJobs({ employerProfileId: 'prof_abc', count: 3 })
      for (const job of jobs) {
        expect(job.title).toMatch(/Demo/i)
      }
    })

    it('every job has a description and a status of "approved" (live listing)', () => {
      const jobs = buildSampleJobs({ employerProfileId: 'prof_abc', count: 3 })
      for (const job of jobs) {
        expect(job.description).toBeTruthy()
        expect(job.status).toBe('approved')
      }
    })

    it('every job has a JobType (FULL_TIME/PART_TIME/etc.) and a JobCategory', () => {
      const jobs = buildSampleJobs({ employerProfileId: 'prof_abc', count: 3 })
      for (const job of jobs) {
        expect(job.type).toBeTruthy()
        expect(job.category).toBeTruthy()
      }
    })

    it('defaults to 3 jobs when no count is given', () => {
      const jobs = buildSampleJobs({ employerProfileId: 'prof_abc' })
      expect(jobs.length).toBe(3)
    })

    it('produces unique titles across the batch', () => {
      const jobs = buildSampleJobs({ employerProfileId: 'prof_abc', count: 5 })
      const titles = jobs.map((j) => j.title)
      expect(new Set(titles).size).toBe(titles.length)
    })
  })

  describe('buildSampleApplications', () => {
    const sampleJobs = [
      { id: 'job_1', title: 'Demo Engineer' },
      { id: 'job_2', title: 'Demo Designer' },
      { id: 'job_3', title: 'Demo PM' },
    ] as any

    it('produces one application per provided job by default', () => {
      const apps = buildSampleApplications({ seekerProfileId: 'seeker_1', jobs: sampleJobs })
      expect(apps).toHaveLength(sampleJobs.length)
    })

    it('each application references the correct seeker and a real jobId', () => {
      const apps = buildSampleApplications({ seekerProfileId: 'seeker_x', jobs: sampleJobs })
      const jobIds = new Set(sampleJobs.map((j: any) => j.id))
      for (const app of apps) {
        expect(app.seekerId).toBe('seeker_x')
        expect(jobIds.has(app.jobId)).toBe(true)
      }
    })

    it('uses status "pending" (ApplicationStatus) so it shows up on the dashboard', () => {
      const apps = buildSampleApplications({ seekerProfileId: 'seeker_x', jobs: sampleJobs })
      for (const app of apps) {
        expect(app.status).toBe('pending')
      }
    })

    it('includes a resumeUrl for every application (Application.resumeUrl is required)', () => {
      const apps = buildSampleApplications({ seekerProfileId: 'seeker_x', jobs: sampleJobs })
      for (const app of apps) {
        expect(typeof app.resumeUrl).toBe('string')
        expect(app.resumeUrl.length).toBeGreaterThan(0)
      }
    })

    it('caps the application count at 3 even when more jobs are provided', () => {
      const manyJobs = Array.from({ length: 10 }, (_, i) => ({ id: `job_${i}`, title: `Demo ${i}` })) as any
      const apps = buildSampleApplications({ seekerProfileId: 'seeker_x', jobs: manyJobs })
      expect(apps.length).toBeLessThanOrEqual(3)
    })
  })
})
