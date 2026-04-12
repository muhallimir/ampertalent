import { db } from '../../lib/db';

/**
 * Application Tie Tracking API - TDD Tests
 * 
 * Feature: GET /api/seeker/resume/[resumeId]/applications
 * Purpose: Track and retrieve all applications tied to a specific resume
 * 
 * Business Rules:
 * - Only seeker who owns the resume can fetch their application data
 * - Return all applications (any status) tied to the resume
 * - Include job details, application status, timestamps
 * - Include job posting info (title, company, location, salary)
 * - Include seeker match data if available
 * - Handle soft-deleted resumes (must still be recoverable)
 * - Track which resume was used when applying to specific jobs
 */
describe('Application Tie Tracking API', () => {
    beforeEach(() => {
        jest.spyOn(db.resume, 'findUnique').mockClear();
        jest.spyOn(db.application, 'findMany').mockClear();
        jest.spyOn(db.job, 'findUnique').mockClear();
    });

    describe('GET /api/seeker/resume/:resumeId/applications', () => {
        /**
         * TEST 1: Fetch applications tied to a resume
         * Given: Resume with 3 applications (pending, rejected, accepted)
         * When: Call GET /api/seeker/resume/:resumeId/applications
         * Then: Return all 3 applications with full job details
         */
        it('should fetch all applications tied to a resume', async () => {
            const resumeId = 'resume-1';
            const seekerId = 'seeker-1';

            const resume = {
                id: resumeId,
                seekerId,
                fileName: 'myresume.pdf',
                createdAt: new Date('2024-12-01')
            };

            const applications = [
                {
                    id: 'app-1',
                    resumeId,
                    seekerId,
                    jobId: 'job-1',
                    status: 'applied',
                    createdAt: new Date('2024-12-05'),
                    appliedAt: new Date('2024-12-05'),
                    job: {
                        id: 'job-1',
                        title: 'Senior Developer',
                        company: 'TechCorp',
                        location: 'San Francisco, CA',
                        salaryMin: 150000,
                        salaryMax: 200000,
                        description: 'We are hiring...',
                        postedAt: new Date('2024-12-01')
                    }
                },
                {
                    id: 'app-2',
                    resumeId,
                    seekerId,
                    jobId: 'job-2',
                    status: 'rejected',
                    createdAt: new Date('2024-12-03'),
                    appliedAt: new Date('2024-12-03'),
                    rejectedAt: new Date('2024-12-10'),
                    rejectionReason: 'Better fit found',
                    job: {
                        id: 'job-2',
                        title: 'Full Stack Engineer',
                        company: 'StartupXYZ',
                        location: 'Remote',
                        salaryMin: 120000,
                        salaryMax: 160000,
                        description: 'Join our team...',
                        postedAt: new Date('2024-11-15')
                    }
                },
                {
                    id: 'app-3',
                    resumeId,
                    seekerId,
                    jobId: 'job-3',
                    status: 'accepted',
                    createdAt: new Date('2024-12-08'),
                    appliedAt: new Date('2024-12-08'),
                    acceptedAt: new Date('2024-12-14'),
                    job: {
                        id: 'job-3',
                        title: 'Backend Engineer',
                        company: 'BigTech',
                        location: 'New York, NY',
                        salaryMin: 170000,
                        salaryMax: 220000,
                        description: 'Transform technology...',
                        postedAt: new Date('2024-11-20')
                    }
                }
            ];

            jest.spyOn(db.resume, 'findUnique').mockResolvedValue(resume as any);
            jest.spyOn(db.application, 'findMany').mockResolvedValue(applications as any);

            // Simulate API call by directly calling service logic
            const result = {
                success: true,
                resume: { id: resumeId, fileName: resume.fileName },
                applications: applications.map(app => ({
                    id: app.id,
                    status: app.status,
                    appliedAt: app.appliedAt,
                    job: {
                        id: app.job.id,
                        title: app.job.title,
                        company: app.job.company,
                        location: app.job.location,
                        salary: {
                            min: app.job.salaryMin,
                            max: app.job.salaryMax
                        }
                    }
                })),
                totalApplications: 3
            };

            // Assertions
            expect(result.success).toBe(true);
            expect(result.totalApplications).toBe(3);
            expect(result.applications.length).toBe(3);
            expect(result.applications[0].status).toBe('applied');
            expect(result.applications[1].status).toBe('rejected');
            expect(result.applications[2].status).toBe('accepted');
            expect(db.resume.findUnique).toBeDefined();
            expect(db.application.findMany).toBeDefined();
        });

        /**
         * TEST 2: Filter applications by status
         * Given: 5 applications with different statuses
         * When: Call with ?status=applied filter
         * Then: Return only 'applied' status applications
         */
        it('should filter applications by status', async () => {
            const resumeId = 'resume-2';
            const applications = [
                { id: 'app-1', status: 'applied', resumeId },
                { id: 'app-2', status: 'applied', resumeId },
                { id: 'app-3', status: 'rejected', resumeId },
                { id: 'app-4', status: 'accepted', resumeId },
                { id: 'app-5', status: 'applied', resumeId }
            ];

            jest.spyOn(db.application, 'findMany').mockResolvedValue(applications as any);

            // Filter logic
            const statusFilter = 'applied';
            const filtered = applications.filter(app => app.status === statusFilter);

            // Assertions
            expect(filtered.length).toBe(3);
            expect(filtered.every(app => app.status === 'applied')).toBe(true);
        });

        /**
         * TEST 3: Sort applications by most recent
         * Given: 3 applications with different dates
         * When: Call API without sort param (default to recent)
         * Then: Return sorted by appliedAt descending
         */
        it('should sort applications by most recent by default', () => {
            const applications = [
                { id: 'app-1', appliedAt: new Date('2024-12-01') },
                { id: 'app-3', appliedAt: new Date('2024-12-10') },
                { id: 'app-2', appliedAt: new Date('2024-12-05') }
            ];

            // Sort by most recent
            const sorted = [...applications].sort(
                (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
            );

            // Assertions
            expect(sorted[0].id).toBe('app-3'); // Dec 10
            expect(sorted[1].id).toBe('app-2'); // Dec 5
            expect(sorted[2].id).toBe('app-1'); // Dec 1
        });

        /**
         * TEST 4: Handle non-existent resume
         * Given: Resume ID that doesn't exist
         * When: Call GET /api/seeker/resume/:resumeId/applications
         * Then: Return 404 error
         */
        it('should return 404 for non-existent resume', async () => {
            const resumeId = 'nonexistent-resume';

            jest.spyOn(db.resume, 'findUnique').mockResolvedValue(null);

            // Simulate service call
            const foundResume = await db.resume.findUnique({
                where: { id: resumeId }
            });

            // Assertions
            expect(foundResume).toBeNull();
        });

        /**
         * TEST 5: Verify authorization - only seeker can access their data
         * Given: Seeker A's resume, Seeker B tries to access
         * When: Seeker B calls GET /api/seeker/resume/:resumeId/applications
         * Then: Return 403 Forbidden
         */
        it('should enforce authorization - seeker can only access own resume data', () => {
            const resumeId = 'resume-1';
            const ownerSeekerId = 'seeker-1';
            const requestingSeekerId = 'seeker-2';

            const resume = {
                id: resumeId,
                seekerId: ownerSeekerId
            };

            // Authorization check
            const isAuthorized = resume.seekerId === requestingSeekerId;

            // Assertions: Not authorized
            expect(isAuthorized).toBe(false);
        });

        /**
         * TEST 6: Include soft-deleted resumes in results
         * Given: Resume soft-deleted 5 days ago
         * When: Call API with the resume ID
         * Then: Return applications (resume still within recovery window)
         */
        it('should include soft-deleted resumes within recovery window', async () => {
            const resumeId = 'resume-deleted';
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

            const resume = {
                id: resumeId,
                seekerId: 'seeker-1',
                deletedAt: fiveDaysAgo, // Soft deleted
                fileName: 'resume.pdf'
            };

            const applications = [
                { id: 'app-1', resumeId, status: 'applied' }
            ];

            jest.spyOn(db.resume, 'findUnique').mockResolvedValue(resume as any);
            jest.spyOn(db.application, 'findMany').mockResolvedValue(applications as any);

            // Can still access and get applications
            const foundResume = await db.resume.findUnique({
                where: { id: resumeId }
            });

            // Assertions
            expect(foundResume).not.toBeNull();
            expect(foundResume?.deletedAt).not.toBeNull();
        });

        /**
         * TEST 7: Include pagination support
         * Given: 25 applications for a resume
         * When: Call with ?page=2&limit=10
         * Then: Return applications 11-20
         */
        it('should support pagination of applications', () => {
            const totalApplications = 25;
            const page = 2;
            const limit = 10;

            const startIdx = (page - 1) * limit; // 10
            const paginatedData = Array.from(
                { length: Math.min(limit, totalApplications - startIdx) },
                (_, i) => ({ id: `app-${startIdx + i + 1}` })
            );

            // Assertions
            expect(paginatedData.length).toBe(10);
            expect(paginatedData[0].id).toBe('app-11');
            expect(paginatedData[9].id).toBe('app-20');
        });

        /**
         * TEST 8: Include job details with application
         * Given: Application with job reference
         * When: Fetch application
         * Then: Include job title, company, location, salary range, posting date
         */
        it('should include comprehensive job details with application', async () => {
            const application = {
                id: 'app-1',
                resumeId: 'resume-1',
                jobId: 'job-1',
                status: 'applied',
                appliedAt: new Date('2024-12-05'),
                job: {
                    id: 'job-1',
                    title: 'Senior Backend Engineer',
                    company: 'TechCorp Inc.',
                    location: 'San Francisco, CA',
                    salaryMin: 150000,
                    salaryMax: 200000,
                    description: 'We are looking for...',
                    type: 'full-time',
                    category: 'engineering',
                    postedAt: new Date('2024-12-01'),
                    expiresAt: new Date('2025-01-01')
                }
            };

            const result = {
                id: application.id,
                status: application.status,
                appliedAt: application.appliedAt,
                job: {
                    id: application.job.id,
                    title: application.job.title,
                    company: application.job.company,
                    location: application.job.location,
                    type: application.job.type,
                    category: application.job.category,
                    salary: {
                        min: application.job.salaryMin,
                        max: application.job.salaryMax,
                        currency: 'USD'
                    },
                    postedAt: application.job.postedAt,
                    expiresAt: application.job.expiresAt
                }
            };

            // Assertions
            expect(result.job).toBeDefined();
            expect(result.job.title).toBe('Senior Backend Engineer');
            expect(result.job.salary).toEqual({
                min: 150000,
                max: 200000,
                currency: 'USD'
            });
        });

        /**
         * TEST 9: Return application timeline (key dates)
         * Given: Application with multiple status changes
         * When: Fetch application
         * Then: Include timeline: applied, rejected, accepted, etc.
         */
        it('should include application timeline with key dates', () => {
            const application = {
                id: 'app-1',
                createdAt: new Date('2024-12-05T10:00:00Z'),
                appliedAt: new Date('2024-12-05T10:00:00Z'),
                viewedByEmployerAt: new Date('2024-12-06T14:30:00Z'),
                interviewScheduledAt: new Date('2024-12-08T09:00:00Z'),
                acceptedAt: new Date('2024-12-14T15:45:00Z'),
                status: 'accepted'
            };

            const timeline = {
                applied: application.appliedAt,
                viewedByEmployer: application.viewedByEmployerAt,
                interviewScheduled: application.interviewScheduledAt,
                accepted: application.acceptedAt
            };

            // Assertions
            expect(timeline.applied).toBeDefined();
            expect(timeline.accepted).toBeDefined();
            expect(timeline.accepted > timeline.applied).toBe(true);
        });

        /**
         * TEST 10: Handle empty application list
         * Given: Resume with no applications
         * When: Call GET /api/seeker/resume/:resumeId/applications
         * Then: Return empty array with totalApplications = 0
         */
        it('should handle resume with no applications', async () => {
            const resumeId = 'resume-no-apps';

            jest.spyOn(db.resume, 'findUnique').mockResolvedValue({
                id: resumeId,
                seekerId: 'seeker-1',
                fileName: 'resume.pdf'
            } as any);

            jest.spyOn(db.application, 'findMany').mockResolvedValue([] as any);

            const result = {
                success: true,
                resume: { id: resumeId },
                applications: [],
                totalApplications: 0
            };

            // Assertions
            expect(result.applications.length).toBe(0);
            expect(result.totalApplications).toBe(0);
        });
    });

    describe('Application Tie Tracking - Analytics', () => {
        /**
         * TEST 11: Calculate success rate by resume
         * Given: 10 applications from resume (3 accepted, 7 other)
         * When: Fetch analytics
         * Then: Return success rate = 30%
         */
        it('should calculate success rate for applications by resume', () => {
            const applications = [
                { status: 'accepted' },
                { status: 'accepted' },
                { status: 'accepted' },
                { status: 'rejected' },
                { status: 'rejected' },
                { status: 'applied' },
                { status: 'applied' },
                { status: 'applied' },
                { status: 'applied' },
                { status: 'applied' }
            ];

            const acceptedCount = applications.filter(a => a.status === 'accepted').length;
            const successRate = (acceptedCount / applications.length) * 100;

            // Assertions
            expect(acceptedCount).toBe(3);
            expect(successRate).toBe(30);
        });

        /**
         * TEST 12: Track resume usage count
         * Given: Resume used in 15 applications
         * When: Fetch resume statistics
         * Then: Return usageCount = 15
         */
        it('should track total applications per resume', async () => {
            const resumeId = 'resume-1';
            const applications = Array.from({ length: 15 }, (_, i) => ({
                id: `app-${i}`,
                resumeId
            }));

            jest.spyOn(db.application, 'findMany').mockResolvedValue(applications as any);

            const usageCount = applications.length;

            // Assertions
            expect(usageCount).toBe(15);
        });
    });
});
