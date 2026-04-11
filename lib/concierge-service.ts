import { db } from './db';
import { S3Service } from './s3';
import { decodeHtmlEntities } from './utils';

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'hire-my-mom-files';

// Helper function to generate presigned URLs for company logos
async function generatePresignedLogoUrl(companyLogoUrl: string | null): Promise<string | null> {
  if (!companyLogoUrl || companyLogoUrl.trim() === '') {
    return null;
  }

  try {
    // Extract S3 key from the full URL
    const url = new URL(companyLogoUrl);
    const s3Key = url.pathname.substring(1); // Remove leading slash
    
    // Generate presigned URL for download (valid for 1 hour)
    const presignedUrl = await S3Service.generatePresignedDownloadUrl(
      BUCKET_NAME,
      s3Key,
      3600 // 1 hour
    );

    return presignedUrl;
  } catch (error) {
    console.error('Error generating presigned URL for company logo:', error);
    // Fall back to original URL if presigned URL generation fails
    return companyLogoUrl;
  }
}

// Helper function to generate presigned URLs for profile pictures
async function generatePresignedProfileUrl(profilePictureUrl: string | null): Promise<string | null> {
  if (!profilePictureUrl || profilePictureUrl.trim() === '') {
    return null;
  }

  try {
    // Extract S3 key from the full URL
    const url = new URL(profilePictureUrl);
    const s3Key = url.pathname.substring(1); // Remove leading slash
    
    // Generate presigned URL for download (valid for 1 hour)
    const presignedUrl = await S3Service.generatePresignedDownloadUrl(
      BUCKET_NAME,
      s3Key,
      3600 // 1 hour
    );

    return presignedUrl;
  } catch (error) {
    console.error('Error generating presigned URL for profile picture:', error);
    // Fall back to original URL if presigned URL generation fails
    return profilePictureUrl;
  }
}

export interface ConciergeRequest {
  id: string;
  jobId: string;
  employerId: string;
  status: 'pending' | 'discovery_call' | 'job_optimization' | 'candidate_screening' | 'interviews' | 'completed';
  assignedAdminId?: string;
  discoveryCallNotes?: string;
  optimizedJobDescription?: string;
  shortlistedCandidates?: any;
  createdAt: Date;
  updatedAt: Date;
  unreadMessagesCount?: number;
}

export class ConciergeService {
  /**
   * Request concierge service for a job
   */
  static async requestConciergeService(jobId: string, employerId: string): Promise<ConciergeRequest> {
    try {
      // Check if job exists and belongs to employer
      const job = await db.job.findFirst({
        where: {
          id: jobId,
          employerId: employerId
        }
      });

      if (!job) {
        throw new Error('Job not found or access denied');
      }

      // Check if concierge request already exists in the database (more reliable than job flag)
      const existingRequest = await db.$queryRaw`
        SELECT id FROM concierge_requests WHERE job_id = ${jobId} LIMIT 1
      ` as any[];

      if (existingRequest.length > 0) {
        console.log('🔍 CONCIERGE-SERVICE: Concierge request already exists for job:', jobId);
        // Return existing request instead of throwing error
        return this.getConciergeRequest(jobId).then(req => req!);
      }

      // For now, we'll use a direct database query since Prisma client needs regeneration
      // This would normally be: await db.conciergeRequest.create(...)
      const result = await db.$queryRaw`
        INSERT INTO concierge_requests (id, job_id, employer_id, status, created_at, updated_at)
        VALUES (gen_random_uuid(), ${jobId}, ${employerId}, 'pending', NOW(), NOW())
        RETURNING *
      `;

      console.log('🔍 CONCIERGE-SERVICE: Inserted concierge request:', result);

      // Update job status and enable chat (only if not already set)
      const updateData: any = {
        conciergeRequested: true,
        conciergeStatus: 'pending'
      };

      // Only set chat fields if not already enabled
      if (!job.chatEnabled) {
        updateData.chatEnabled = true;
        updateData.chatEnabledAt = new Date();
      }

      await db.job.update({
        where: { id: jobId },
        data: updateData
      });

      // Try to get the real inserted record
      let createdRequest;
      try {
        const insertedRecord = result as any[];
        if (insertedRecord && insertedRecord.length > 0) {
          const record = insertedRecord[0];
          createdRequest = {
            id: record.id,
            jobId: record.job_id,
            employerId: record.employer_id,
            status: record.status,
            createdAt: record.created_at,
            updatedAt: record.updated_at
          };
        }
      } catch (parseError) {
        console.log('🔍 CONCIERGE-SERVICE: Could not parse insert result, using fallback');
      }

      // Return the created request
      return createdRequest || {
        id: 'temp-id',
        jobId,
        employerId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error requesting concierge service:', error);
      throw error;
    }
  }

  /**
   * Get concierge request for a job
   */
  static async getConciergeRequest(jobId: string): Promise<ConciergeRequest | null> {
    try {
      // For now, use raw query until Prisma client is regenerated
      const result = await db.$queryRaw`
        SELECT * FROM concierge_requests WHERE job_id = ${jobId} LIMIT 1
      ` as any[];

      if (result.length === 0) {
        return null;
      }

      const request = result[0];
      return {
        id: request.id,
        jobId: request.job_id,
        employerId: request.employer_id,
        status: request.status,
        assignedAdminId: request.assigned_admin_id,
        discoveryCallNotes: request.discovery_call_notes,
        optimizedJobDescription: request.optimized_job_description,
        shortlistedCandidates: request.shortlisted_candidates,
        createdAt: request.created_at,
        updatedAt: request.updated_at
      };
    } catch (error) {
      console.error('Error fetching concierge request:', error);
      return null;
    }
  }

  /**
   * Get all concierge requests for admin
   */
  static async getAllConciergeRequests(status?: string): Promise<ConciergeRequest[]> {
    try {
      let query = `
        SELECT cr.*, j.title as job_title, j.is_company_private,
               e.company_name, e.company_logo_url,
               up.name as employer_name, up.profile_picture_url,
               COALESCE(unread.unread_count, 0) as unread_messages_count
        FROM concierge_requests cr
        JOIN jobs j ON cr.job_id = j.id
        JOIN employers e ON cr.employer_id = e.user_id
        JOIN user_profiles up ON e.user_id = up.id
        LEFT JOIN (
          SELECT cc.job_id, COUNT(ccm.id) as unread_count
          FROM concierge_chats cc
          LEFT JOIN concierge_chat_messages ccm ON cc.id = ccm.chat_id
            AND ccm.sender_type = 'employer'
            AND ccm.read_at IS NULL
          GROUP BY cc.job_id
        ) unread ON cr.job_id = unread.job_id
      `;

      if (status) {
        query += ` WHERE cr.status = '${status}'`;
      }

      query += ` ORDER BY cr.created_at DESC`;

      const results = await db.$queryRawUnsafe(query) as any[];

      // Generate presigned URLs for profile pictures and company logos
      const requestsWithPresignedUrls = await Promise.all(
        results.map(async (row) => {
          const presignedProfileUrl = await generatePresignedProfileUrl(row.profile_picture_url);
          const presignedLogoUrl = await generatePresignedLogoUrl(row.company_logo_url);
          
          return {
            id: row.id,
            jobId: row.job_id,
            employerId: row.employer_id,
            status: row.status,
            assignedAdminId: row.assigned_admin_id,
            discoveryCallNotes: row.discovery_call_notes,
            optimizedJobDescription: row.optimized_job_description,
            shortlistedCandidates: row.shortlisted_candidates,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            // Additional fields for admin view
            jobTitle: decodeHtmlEntities(row.job_title || ''),
            companyName: row.company_name,
            companyLogoUrl: presignedLogoUrl || row.company_logo_url,
            employerName: row.employer_name,
            employerProfilePictureUrl: presignedProfileUrl || row.profile_picture_url,
            isCompanyPrivate: row.is_company_private,
            unreadMessagesCount: parseInt(row.unread_messages_count) || 0
          };
        })
      );

      return requestsWithPresignedUrls;
    } catch (error) {
      console.error('Error fetching concierge requests:', error);
      return [];
    }
  }

  /**
   * Update concierge request status
   */
  static async updateConciergeStatus(
    requestId: string,
    status: string,
    adminId?: string,
    notes?: string
  ): Promise<boolean> {
    try {
      await db.$queryRaw`
        UPDATE concierge_requests 
        SET status = ${status}, 
            assigned_admin_id = ${adminId || null},
            discovery_call_notes = ${notes || null},
            updated_at = NOW()
        WHERE id = ${requestId}
      `;

      return true;
    } catch (error) {
      console.error('Error updating concierge status:', error);
      return false;
    }
  }

  /**
   * Get concierge request details (alias for getConciergeRequest for backward compatibility)
   */
  static async getConciergeRequestDetails(jobId: string): Promise<ConciergeRequest | null> {
    return this.getConciergeRequest(jobId);
  }

  /**
   * Complete concierge service
   */
  static async completeConciergeService(
    jobId: string,
    adminId: string,
    shortlistedApplicationIds: string[],
    finalNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // First find the concierge request for this job
      const request = await db.$queryRaw`
        SELECT id FROM concierge_requests WHERE job_id = ${jobId} LIMIT 1
      ` as any[];

      if (request.length === 0) {
        return { success: false, message: 'Concierge request not found for this job' };
      }

      const requestId = request[0].id;

      // Update the concierge request
      await db.$queryRaw`
        UPDATE concierge_requests
        SET status = 'completed',
            assigned_admin_id = ${adminId},
            shortlisted_candidates = ${JSON.stringify(shortlistedApplicationIds)},
            discovery_call_notes = COALESCE(discovery_call_notes, '') || ${finalNotes ? '\n\nFinal Notes: ' + finalNotes : ''},
            updated_at = NOW()
        WHERE id = ${requestId}
      `;

      // Update the job status
      await db.job.update({
        where: { id: jobId },
        data: {
          conciergeStatus: 'completed'
        }
      });

      return { success: true, message: 'Concierge service completed successfully' };
    } catch (error) {
      console.error('Error completing concierge service:', error);
      return { success: false, message: 'Failed to complete concierge service' };
    }
  }

  /**
   * Get concierge statistics
   */
  static async getConciergeStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    averageCompletionTime: number;
  }> {
    try {
      const stats = await db.$queryRaw`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status IN ('discovery_call', 'job_optimization', 'candidate_screening', 'interviews') THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          AVG(CASE WHEN status = 'completed' THEN EXTRACT(EPOCH FROM (updated_at - created_at))/86400 END) as avg_completion_days
        FROM concierge_requests
      ` as any[];

      const result = stats[0];
      return {
        total: parseInt(result.total) || 0,
        pending: parseInt(result.pending) || 0,
        inProgress: parseInt(result.in_progress) || 0,
        completed: parseInt(result.completed) || 0,
        averageCompletionTime: parseFloat(result.avg_completion_days) || 0
      };
    } catch (error) {
      console.error('Error getting concierge stats:', error);
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        averageCompletionTime: 0
      };
    }
  }

  /**
   * Get concierge workflow steps
   */
  static getConciergeWorkflowSteps() {
    return [
      {
        id: 'pending',
        name: 'Request Received',
        description: 'Concierge service requested by employer'
      },
      {
        id: 'discovery_call',
        name: 'Discovery Call',
        description: 'Learn needs and define ideal hire'
      },
      {
        id: 'job_optimization',
        name: 'Job Post Optimization',
        description: 'Write or refine job listing for maximum impact'
      },
      {
        id: 'candidate_screening',
        name: 'Expert Screening',
        description: 'Review resumes and cover letters'
      },
      {
        id: 'interviews',
        name: 'Interview Coordination',
        description: 'Prep questions and coordinate interviews'
      },
      {
        id: 'completed',
        name: 'Completed',
        description: 'Final recommendations and next steps'
      }
    ];
  }

  /**
   * Get job details with concierge information for admin
   */
  static async getJobWithConciergeDetails(jobId: string): Promise<{
    id: string;
    title: string;
    description: string;
    location?: string;
    salaryMin?: number;
    salaryMax?: number;
    status: string;
    employerId: string;
    companyName?: string;
    companyLogoUrl?: string | null;
    applicantsVisibleToEmployer?: boolean;
    chatEnabled?: boolean;
    isCompanyPrivate?: boolean;
    createdAt: Date;
    applications?: Array<{
      id: string;
      status: string;
      createdAt: string;
      seeker: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    }>;
  } | null> {
    try {
      const result = await db.$queryRaw`
        SELECT j.id, j.title, j.description, j.location_text as location,
               j.pay_range_min::float as salary_min, j.pay_range_max::float as salary_max,
               j.status, j.employer_id, j.created_at,
               j.applicants_visible_to_employer, j.chat_enabled, j.is_company_private,
               e.company_name, e.company_logo_url
        FROM jobs j
        JOIN employers e ON j.employer_id = e.user_id
        WHERE j.id = ${jobId}
        LIMIT 1
      ` as any[];

      if (result.length === 0) {
        return null;
      }

      const row = result[0];

      // Get applications for this job
      const applications = await db.$queryRaw`
        SELECT a.id, a.status, a.applied_at as created_at,
               up.id as seeker_id, up.first_name, up.last_name, up.email
        FROM applications a
        JOIN job_seekers js ON a.seeker_id = js.user_id
        JOIN user_profiles up ON js.user_id = up.id
        WHERE a.job_id = ${jobId}
        ORDER BY a.applied_at DESC
      ` as any[];

      const formattedApplications = applications.map((app: any) => ({
        id: app.id,
        status: app.status,
        createdAt: app.created_at,
        seeker: {
          id: app.seeker_id,
          firstName: app.first_name || '',
          lastName: app.last_name || '',
          email: app.email
        }
      }));

      // Generate presigned URL for company logo
      const presignedLogoUrl = await generatePresignedLogoUrl(row.company_logo_url);

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        location: row.location,
        salaryMin: row.salary_min,
        salaryMax: row.salary_max,
        status: row.status,
        employerId: row.employer_id,
        companyName: row.company_name,
        companyLogoUrl: presignedLogoUrl,
        applicantsVisibleToEmployer: row.applicants_visible_to_employer,
        chatEnabled: row.chat_enabled,
        isCompanyPrivate: row.is_company_private,
        createdAt: row.created_at,
        applications: formattedApplications
      };
    } catch (error) {
      console.error('Error getting job with concierge details:', error);
      return null;
    }
  }
}