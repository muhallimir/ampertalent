import { db } from './db';
import { inAppNotificationService } from './in-app-notification-service';
import { realTimeNotificationService } from './real-time-notification-service';

export interface ConciergeChat {
  id: string;
  jobId: string;
  employerId: string;
  adminId?: string;
  status: 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ConciergeChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderType: 'admin' | 'employer' | 'seeker';
  message: string;
  messageType: 'text' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  readAt?: Date;
  createdAt: Date;
}

export interface ChatWithMessages extends ConciergeChat {
  messages: ConciergeChatMessage[];
  lastMessage?: ConciergeChatMessage;
  unreadCount: number;
  // Concierge information
  conciergeName?: string;
  conciergePicture?: string;
  conciergeTitle?: string;
  conciergeBio?: string;
  conciergeSpecialties?: string[];
  conciergeExperience?: number;
}

export class ConciergeChatService {
  /**
   * Initialize database tables for concierge chat
   */
  static async initializeChatTables(): Promise<void> {
    try {
      // Create concierge_chats table
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS concierge_chats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          employer_id UUID NOT NULL REFERENCES employers(user_id) ON DELETE CASCADE,
          admin_id UUID REFERENCES user_profiles(id),
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // Create concierge_chat_messages table
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS concierge_chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          chat_id UUID NOT NULL REFERENCES concierge_chats(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL REFERENCES user_profiles(id),
          sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('admin', 'employer')),
          message TEXT NOT NULL,
          message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
          file_url TEXT,
          file_name TEXT,
          file_size INTEGER,
          read_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // Create seeker_concierge_chats table
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS seeker_concierge_chats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          seeker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
          admin_id UUID REFERENCES user_profiles(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // Create seeker_concierge_chat_messages table
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS seeker_concierge_chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          chat_id UUID NOT NULL REFERENCES seeker_concierge_chats(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL REFERENCES user_profiles(id),
          sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('admin', 'seeker')),
          message TEXT NOT NULL,
          message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
          file_url TEXT,
          file_name TEXT,
          file_size INTEGER,
          read_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      // Add applicant visibility fields to jobs table
      await db.$executeRaw`
        ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS applicants_visible_to_employer BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS applicants_visible_last_toggled TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS applicants_visible_toggled_by UUID REFERENCES user_profiles(id),
        ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS chat_enabled_at TIMESTAMP WITH TIME ZONE
      `;

      // Create indexes
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_concierge_chats_job_id ON concierge_chats(job_id)`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_concierge_chats_employer_id ON concierge_chats(employer_id)`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_concierge_chats_admin_id ON concierge_chats(admin_id)`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_concierge_chats_status ON concierge_chats(status)`;

      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_concierge_chat_messages_chat_id ON concierge_chat_messages(chat_id)`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_concierge_chat_messages_sender_id ON concierge_chat_messages(sender_id)`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_concierge_chat_messages_created_at ON concierge_chat_messages(created_at)`;

      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_jobs_applicants_visible ON jobs(applicants_visible_to_employer)`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_jobs_chat_enabled ON jobs(chat_enabled)`;

      // Create indexes for seeker concierge chat tables
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_seeker_concierge_chats_job_id ON seeker_concierge_chats(job_id)`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_seeker_concierge_chats_seeker_id ON seeker_concierge_chats(seeker_id)`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_seeker_concierge_chats_admin_id ON seeker_concierge_chats(admin_id)`;

      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_seeker_concierge_chat_messages_chat_id ON seeker_concierge_chat_messages(chat_id)`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_seeker_concierge_chat_messages_sender_id ON seeker_concierge_chat_messages(sender_id)`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_seeker_concierge_chat_messages_created_at ON seeker_concierge_chat_messages(created_at)`;

      console.log('Concierge chat tables initialized successfully');
    } catch (error) {
      console.error('Error initializing concierge chat tables:', error);
      throw error;
    }
  }

  /**
   * Get or create a chat for a concierge job
   */
  static async getOrCreateChat(jobId: string, employerId: string): Promise<ConciergeChat> {
    try {
      // Check if chat already exists
      const existingChat = await db.$queryRaw`
        SELECT * FROM concierge_chats WHERE job_id = ${jobId} LIMIT 1
      ` as any[];

      if (existingChat.length > 0) {
        return {
          id: existingChat[0].id,
          jobId: existingChat[0].job_id,
          employerId: existingChat[0].employer_id,
          adminId: existingChat[0].admin_id,
          status: existingChat[0].status,
          createdAt: existingChat[0].created_at,
          updatedAt: existingChat[0].updated_at
        };
      }

      // Create new chat
      const result = await db.$queryRaw`
        INSERT INTO concierge_chats (job_id, employer_id, status, created_at, updated_at)
        VALUES (${jobId}, ${employerId}, 'active', NOW(), NOW())
        RETURNING *
      ` as any[];

      // Enable chat for the job
      await db.job.update({
        where: { id: jobId },
        data: {
          chatEnabled: true,
          chatEnabledAt: new Date()
        }
      });

      return {
        id: result[0].id,
        jobId: result[0].job_id,
        employerId: result[0].employer_id,
        adminId: result[0].admin_id,
        status: result[0].status,
        createdAt: result[0].created_at,
        updatedAt: result[0].updated_at
      };
    } catch (error) {
      console.error('Error getting or creating chat:', error);
      throw error;
    }
  }

  /**
   * Send a message in a chat
   */
  static async sendMessage(
    chatId: string,
    senderId: string,
    senderType: 'admin' | 'employer',
    message: string,
    messageType: 'text' | 'file' | 'system' = 'text',
    fileData?: { url: string; name: string; size: number }
  ): Promise<ConciergeChatMessage> {
    try {
      let query = `
        INSERT INTO concierge_chat_messages (chat_id, sender_id, sender_type, message, message_type, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      let params: any[] = [chatId, senderId, senderType, message, messageType];

      if (fileData) {
        query = `
          INSERT INTO concierge_chat_messages (chat_id, sender_id, sender_type, message, message_type, file_url, file_name, file_size, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `;
        params = [chatId, senderId, senderType, message, messageType, fileData.url, fileData.name, fileData.size];
      }

      const result = await db.$queryRawUnsafe(query, ...params) as any[];

      // Update chat's updated_at timestamp
      await db.$queryRaw`
        UPDATE concierge_chats SET updated_at = NOW() WHERE id = ${chatId}
      `;

      // Send notification to the other party
      await this.sendChatNotification(chatId, senderId, senderType, message, messageType);

      return {
        id: result[0]?.id || 'temp-id',
        chatId,
        senderId,
        senderType,
        message,
        messageType,
        fileUrl: fileData?.url,
        fileName: fileData?.name,
        fileSize: fileData?.size,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a chat
   */
  static async getMessages(chatId: string, userId: string, userType: 'admin' | 'employer'): Promise<ConciergeChatMessage[]> {
    try {
      const messages = await db.$queryRaw`
        SELECT * FROM concierge_chat_messages
        WHERE chat_id = ${chatId}
        ORDER BY created_at ASC
      ` as any[];

      // Mark messages as read if user is not the sender
      if (userType === 'employer') {
        await db.$queryRaw`
          UPDATE concierge_chat_messages
          SET read_at = NOW()
          WHERE chat_id = ${chatId}
          AND sender_type = 'admin'
          AND read_at IS NULL
        `;
      } else if (userType === 'admin') {
        await db.$queryRaw`
          UPDATE concierge_chat_messages
          SET read_at = NOW()
          WHERE chat_id = ${chatId}
          AND sender_type = 'employer'
          AND read_at IS NULL
        `;
      }

      return messages.map(msg => ({
        id: msg.id,
        chatId: msg.chat_id,
        senderId: msg.sender_id,
        senderType: msg.sender_type,
        message: msg.message,
        messageType: msg.message_type,
        fileUrl: msg.file_url,
        fileName: msg.file_name,
        fileSize: msg.file_size,
        readAt: msg.read_at,
        createdAt: msg.created_at
      }));
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  /**
   * Get chat with messages and metadata
   */
  static async getChatWithMessages(chatId: string, userId: string, userType: 'admin' | 'employer'): Promise<ChatWithMessages | null> {
    try {
      const chatResult = await db.$queryRaw`
        SELECT * FROM concierge_chats WHERE id = ${chatId} LIMIT 1
      ` as any[];

      if (chatResult.length === 0) {
        return null;
      }

      const chat = chatResult[0];
      const messages = await this.getMessages(chatId, userId, userType);

      // Get unread count
      let unreadCount = 0;
      if (userType === 'employer') {
        const unreadResult = await db.$queryRaw`
          SELECT COUNT(*) as count FROM concierge_chat_messages
          WHERE chat_id = ${chatId} AND sender_type = 'admin' AND read_at IS NULL
        ` as any[];
        unreadCount = parseInt(unreadResult[0]?.count || '0');
      } else {
        const unreadResult = await db.$queryRaw`
          SELECT COUNT(*) as count FROM concierge_chat_messages
          WHERE chat_id = ${chatId} AND sender_type = 'employer' AND read_at IS NULL
        ` as any[];
        unreadCount = parseInt(unreadResult[0]?.count || '0');
      }

      return {
        id: chat.id,
        jobId: chat.job_id,
        employerId: chat.employer_id,
        adminId: chat.admin_id,
        status: chat.status,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        messages,
        lastMessage: messages[messages.length - 1],
        unreadCount,
        // Include concierge information
        conciergeName: chat.concierge_name,
        conciergePicture: chat.concierge_picture,
        conciergeTitle: chat.concierge_title,
        conciergeBio: chat.concierge_bio,
        conciergeSpecialties: chat.concierge_specialties,
        conciergeExperience: chat.concierge_experience
      };
    } catch (error) {
      console.error('Error getting chat with messages:', error);
      return null;
    }
  }

  /**
   * Assign admin to chat
   */
  static async assignAdmin(chatId: string, adminId: string): Promise<boolean> {
    try {
      await db.$queryRaw`
        UPDATE concierge_chats SET admin_id = ${adminId}, updated_at = NOW() WHERE id = ${chatId}
      `;
      return true;
    } catch (error) {
      console.error('Error assigning admin to chat:', error);
      return false;
    }
  }

  /**
   * Toggle applicant visibility for a job
   */
  static async toggleApplicantVisibility(jobId: string, adminId: string, visible: boolean): Promise<boolean> {
    try {
      await db.job.update({
        where: { id: jobId },
        data: {
          applicantsVisibleToEmployer: visible,
          applicantsVisibleLastToggled: new Date(),
          applicantsVisibleToggledBy: adminId
        }
      });
      return true;
    } catch (error) {
      console.error('Error toggling applicant visibility:', error);
      return false;
    }
  }

  /**
   * Get applicant visibility status for a job
   */
  static async getApplicantVisibility(jobId: string): Promise<{
    visible: boolean;
    lastToggled?: Date;
    toggledBy?: string;
  }> {
    try {
      const job = await db.job.findUnique({
        where: { id: jobId },
        select: {
          applicantsVisibleToEmployer: true,
          applicantsVisibleLastToggled: true,
          applicantsVisibleToggledBy: true
        }
      });

      if (!job) {
        throw new Error('Job not found');
      }

      return {
        visible: job.applicantsVisibleToEmployer || false,
        lastToggled: job.applicantsVisibleLastToggled || undefined,
        toggledBy: job.applicantsVisibleToggledBy || undefined
      };
    } catch (error) {
      console.error('Error getting applicant visibility:', error);
      return { visible: false };
    }
  }

  /**
   * Get chats for admin (all concierge chats)
   */
  static async getAdminChats(adminId?: string): Promise<ChatWithMessages[]> {
    try {
      let query = `
        SELECT cc.*, j.title as job_title, e.company_name, up.name as employer_name
        FROM concierge_chats cc
        JOIN jobs j ON cc.job_id = j.id
        JOIN employers e ON cc.employer_id = e.user_id
        JOIN user_profiles up ON e.user_id = up.id
        WHERE cc.status = 'active'
      `;

      if (adminId) {
        query += ` AND (cc.admin_id = '${adminId}' OR cc.admin_id IS NULL)`;
      }

      query += ` ORDER BY cc.updated_at DESC`;

      const chats = await db.$queryRawUnsafe(query) as any[];

      const chatsWithMessages = await Promise.all(
        chats.map(async (chat) => {
          const messages = await this.getMessages(chat.id, adminId || '', 'admin');
          const unreadCount = await this.getUnreadCount(chat.id, 'admin');

          return {
            id: chat.id,
            jobId: chat.job_id,
            employerId: chat.employer_id,
            adminId: chat.admin_id,
            status: chat.status,
            createdAt: chat.created_at,
            updatedAt: chat.updated_at,
            messages,
            lastMessage: messages[messages.length - 1],
            unreadCount,
            jobTitle: chat.job_title,
            companyName: chat.company_name,
            employerName: chat.employer_name
          };
        })
      );

      return chatsWithMessages;
    } catch (error) {
      console.error('Error getting admin chats:', error);
      return [];
    }
  }

  /**
   * Get chats for employer
   */
  static async getEmployerChats(employerId: string): Promise<ChatWithMessages[]> {
    try {
      const chats = await db.$queryRaw`
        SELECT cc.*, j.title as job_title
        FROM concierge_chats cc
        JOIN jobs j ON cc.job_id = j.id
        WHERE cc.employer_id = ${employerId} AND cc.status = 'active'
        ORDER BY cc.updated_at DESC
      ` as any[];

      const chatsWithMessages = await Promise.all(
        chats.map(async (chat) => {
          const messages = await this.getMessages(chat.id, employerId, 'employer');
          const unreadCount = await this.getUnreadCount(chat.id, 'employer');

          return {
            id: chat.id,
            jobId: chat.job_id,
            employerId: chat.employer_id,
            adminId: chat.admin_id,
            status: chat.status,
            createdAt: chat.created_at,
            updatedAt: chat.updated_at,
            messages,
            lastMessage: messages[messages.length - 1],
            unreadCount,
            jobTitle: chat.job_title
          };
        })
      );

      return chatsWithMessages;
    } catch (error) {
      console.error('Error getting employer chats:', error);
      return [];
    }
  }

  /**
   * Get unread count for a chat
   */
  private static async getUnreadCount(chatId: string, userType: 'admin' | 'employer'): Promise<number> {
    try {
      let query = '';
      if (userType === 'employer') {
        query = `SELECT COUNT(*) as count FROM concierge_chat_messages WHERE chat_id = '${chatId}' AND sender_type = 'admin' AND read_at IS NULL`;
      } else {
        query = `SELECT COUNT(*) as count FROM concierge_chat_messages WHERE chat_id = '${chatId}' AND sender_type = 'employer' AND read_at IS NULL`;
      }

      const result = await db.$queryRawUnsafe(query) as any[];
      return parseInt(result[0]?.count || '0');
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Get available concierge admins
   */
  static async getAvailableConciergeAdmins(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    profilePictureUrl?: string;
    isActiveConcierge: boolean;
    assignedRequestsCount: number;
    conciergeTitle?: string;
    conciergeSpecialties: string[];
    conciergeExperience?: number;
  }>> {
    try {
      const admins = await db.userProfile.findMany({
        where: {
          role: 'admin',
          isActiveConcierge: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          conciergeTitle: true,
          conciergeSpecialties: true,
          conciergeExperience: true,
          profilePictureUrl: true,
          isActiveConcierge: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      // Get assigned request counts for each admin
      const adminCounts = await Promise.all(
        admins.map(async (admin) => {
          const countResult = await db.$queryRaw`
            SELECT COUNT(*) as count FROM concierge_requests
            WHERE assigned_admin_id = ${admin.id} AND status != 'completed'
          ` as any[];

          return {
            adminId: admin.id,
            count: parseInt(countResult[0]?.count || '0')
          };
        })
      );

      return admins.map(admin => {
        const countInfo = adminCounts.find(c => c.adminId === admin.id);

        return {
          id: admin.id,
          name: admin.name,
          email: admin.email || '',
          profilePictureUrl: admin.profilePictureUrl || undefined,
          isActiveConcierge: admin.isActiveConcierge || false,
          assignedRequestsCount: countInfo?.count || 0,
          conciergeTitle: admin.conciergeTitle || undefined,
          conciergeSpecialties: admin.conciergeSpecialties || [],
          conciergeExperience: admin.conciergeExperience || undefined
        };
      });
    } catch (error) {
      console.error('Error getting available concierge admins:', error);
      return [];
    }
  }

  /**
   * Assign admin to concierge job
   */
  static async assignAdminToJob(jobId: string, adminId: string): Promise<boolean> {
    try {
      // Check if admin is available and active
      const admin = await db.userProfile.findFirst({
        where: {
          id: adminId,
          role: 'admin',
          isActiveConcierge: true
        }
      });

      if (!admin) {
        throw new Error('Admin not found or not available for concierge assignments');
      }

      // Update concierge request with assigned admin
      const conciergeRequest = await db.conciergeRequest.findFirst({
        where: { jobId }
      });

      if (conciergeRequest) {
        await db.conciergeRequest.update({
          where: { id: conciergeRequest.id },
          data: { assignedAdminId: adminId }
        });
      }

      // Update chat with assigned admin
      const chat = await db.$queryRaw`
        SELECT id FROM concierge_chats WHERE job_id = ${jobId} LIMIT 1
      ` as any[];

      if (chat.length > 0) {
        await db.$queryRaw`
          UPDATE concierge_chats SET admin_id = ${adminId}, updated_at = NOW() WHERE id = ${chat[0].id}
        `;
      }

      return true;
    } catch (error) {
      console.error('Error assigning admin to job:', error);
      return false;
    }
  }

  /**
   * Get assigned admin for a job
   */
  static async getAssignedAdmin(jobId: string): Promise<{
    id: string;
    name: string;
    conciergeTitle?: string;
    conciergeBio?: string;
    conciergeSpecialties: string[];
    conciergeExperience?: number;
    profilePictureUrl?: string;
  } | null> {
    try {
      const conciergeRequest = await db.conciergeRequest.findFirst({
        where: { jobId },
        include: {
          assignedAdmin: {
            select: {
              id: true,
              name: true,
              conciergeTitle: true,
              conciergeBio: true,
              conciergeSpecialties: true,
              conciergeExperience: true,
              profilePictureUrl: true
            }
          }
        }
      });

      if (!conciergeRequest?.assignedAdmin) {
        return null;
      }

      const admin = conciergeRequest.assignedAdmin;
      return {
        id: admin.id,
        name: admin.name,
        conciergeTitle: admin.conciergeTitle || undefined,
        conciergeBio: admin.conciergeBio || undefined,
        conciergeSpecialties: admin.conciergeSpecialties || [],
        conciergeExperience: admin.conciergeExperience || undefined,
        profilePictureUrl: admin.profilePictureUrl || undefined
      };
    } catch (error) {
      console.error('Error getting assigned admin:', error);
      return null;
    }
  }

  /**
   * Cherry-pick candidates for a concierge job
   */
  static async cherryPickCandidates(
    jobId: string,
    adminId: string,
    candidateIds: string[]
  ): Promise<{ success: boolean; message: string; applicationsCreated: number }> {
    try {
      // Verify admin is assigned to this concierge job
      const conciergeRequest = await db.conciergeRequest.findFirst({
        where: {
          jobId,
          assignedAdminId: adminId
        }
      });

      if (!conciergeRequest) {
        throw new Error('Admin not assigned to this concierge job');
      }

      // Get job details
      const job = await db.job.findUnique({
        where: { id: jobId },
        include: { employer: true }
      });

      if (!job) {
        throw new Error('Job not found');
      }

      let applicationsCreated = 0;

      // Create applications for selected candidates
      for (const candidateId of candidateIds) {
        // Check if application already exists
        const existingApplication = await db.application.findFirst({
          where: {
            jobId,
            seekerId: candidateId
          }
        });

        if (!existingApplication) {
          // Get seeker's primary resume
          const seeker = await db.jobSeeker.findUnique({
            where: { userId: candidateId },
            select: { resumeUrl: true }
          });

          // Create new application
          await db.application.create({
            data: {
              jobId,
              seekerId: candidateId,
              resumeUrl: seeker?.resumeUrl || '',
              status: 'pending'
            }
          });
          applicationsCreated++;
        }
      }

      // Send notification to employer about new cherry-picked candidates
      if (applicationsCreated > 0) {
        await inAppNotificationService.createNotification({
          userId: job.employerId,
          type: 'system_alert',
          title: 'New Candidates Added to Your Job',
          message: `${applicationsCreated} candidate(s) have been carefully selected and added to your concierge job.`,
          data: {
            jobId,
            jobTitle: job.title,
            candidatesAdded: applicationsCreated,
            conciergeAdminId: adminId
          },
          actionUrl: `/employer/jobs/${jobId}/applications`
        });
      }

      return {
        success: true,
        message: `Successfully added ${applicationsCreated} candidate(s) to the job`,
        applicationsCreated
      };
    } catch (error) {
      console.error('Error cherry-picking candidates:', error);
      return {
        success: false,
        message: 'Failed to add candidates to job',
        applicationsCreated: 0
      };
    }
  }

  /**
   * Get available candidates for cherry-picking (seekers who haven't applied yet)
   */
  static async getAvailableCandidates(jobId: string): Promise<Array<{
    id: string;
    name: string;
    email: string;
    skills: string[];
    headline?: string;
    profilePictureUrl?: string;
  }>> {
    try {
      // Get all seekers who haven't applied to this job
      const appliedSeekerIds = await db.application.findMany({
        where: { jobId },
        select: { seekerId: true }
      });

      const appliedIds = appliedSeekerIds.map(app => app.seekerId);

      const candidates = await db.jobSeeker.findMany({
        where: {
          userId: {
            notIn: appliedIds
          },
          isSuspended: false
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              profilePictureUrl: true
            }
          }
        },
        take: 50 // Limit for performance
      });

      return candidates.map(seeker => ({
        id: seeker.userId,
        name: seeker.user.name,
        email: seeker.user.email || '',
        skills: seeker.skills || [],
        headline: seeker.headline || undefined,
        profilePictureUrl: seeker.user.profilePictureUrl || undefined
      }));
    } catch (error) {
      console.error('Error getting available candidates:', error);
      return [];
    }
  }

  /**
   * Get or create a concierge chat for seeker-admin communication
   */
  static async getOrCreateSeekerChat(jobId: string, seekerId: string): Promise<{
    id: string;
    jobId: string;
    seekerId: string;
    adminId?: string;
    conciergeName?: string;
    conciergePicture?: string;
    conciergeTitle?: string;
  } | null> {
    try {
      console.log('🔍 getOrCreateSeekerChat called with:', { jobId, seekerId });

      // Check if seeker chat already exists using Prisma model
      console.log('🔍 Querying existing seeker chat...');
      const existingChat = await db.seekerConciergeChat.findFirst({
        where: {
          jobId: jobId,
          seekerId: seekerId
        },
        include: {
          admin: {
            select: {
              name: true,
              profilePictureUrl: true,
              conciergeTitle: true
            }
          }
        }
      });
      console.log('🔍 Existing chat query result:', existingChat);

      if (existingChat) {
        return {
          id: existingChat.id,
          jobId: existingChat.jobId,
          seekerId: existingChat.seekerId,
          adminId: existingChat.adminId ?? undefined,
          conciergeName: existingChat.admin?.name ?? undefined,
          conciergePicture: existingChat.admin?.profilePictureUrl ?? undefined,
          conciergeTitle: existingChat.admin?.conciergeTitle ?? undefined
        };
      }

      // Get the concierge admin assigned to this job
      console.log('🔍 Looking for concierge request for jobId:', jobId);
      const conciergeRequest = await db.conciergeRequest.findFirst({
        where: { jobId },
        include: {
          assignedAdmin: {
            select: {
              id: true,
              name: true,
              profilePictureUrl: true,
              conciergeTitle: true
            }
          }
        }
      });
      console.log('🔍 Concierge request found:', conciergeRequest ? {
        id: conciergeRequest.id,
        assignedAdminId: conciergeRequest.assignedAdmin?.id,
        assignedAdminName: conciergeRequest.assignedAdmin?.name
      } : 'null');

      const adminId = conciergeRequest?.assignedAdmin?.id;
      console.log('🔍 Admin ID to assign:', adminId);

      // Create new seeker concierge chat using Prisma model
      console.log('🔍 Creating new seeker concierge chat...');
      const newChat = await db.seekerConciergeChat.create({
        data: {
          jobId,
          seekerId,
          adminId: adminId || null
        },
        include: {
          admin: {
            select: {
              name: true,
              profilePictureUrl: true,
              conciergeTitle: true
            }
          }
        }
      });
      console.log('🔍 Chat creation result:', newChat);

      const chatResult = {
        id: newChat.id,
        jobId: newChat.jobId,
        seekerId: newChat.seekerId,
        adminId: newChat.adminId ?? undefined,
        conciergeName: newChat.admin?.name ?? conciergeRequest?.assignedAdmin?.name ?? undefined,
        conciergePicture: newChat.admin?.profilePictureUrl ?? conciergeRequest?.assignedAdmin?.profilePictureUrl ?? undefined,
        conciergeTitle: newChat.admin?.conciergeTitle ?? conciergeRequest?.assignedAdmin?.conciergeTitle ?? undefined
      };
      console.log('🔍 Returning chat result:', chatResult);
      return chatResult;
    } catch (error) {
      console.error('❌ CRITICAL ERROR in getOrCreateSeekerChat:', error);
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        jobId,
        seekerId
      });

      // Log the specific error type to help diagnose
      if (error instanceof Error) {
        if (error.message.includes('relation') || error.message.includes('table')) {
          console.error('🗂️ DATABASE TABLE ERROR - Check if seeker_concierge_chats table exists');
        } else if (error.message.includes('column')) {
          console.error('📋 DATABASE COLUMN ERROR - Check if all columns exist in tables');
        } else if (error.message.includes('permission') || error.message.includes('access')) {
          console.error('🔐 PERMISSION ERROR - Check database access permissions');
        }
      }

      throw new Error(`Failed to create/get seeker chat: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get messages for seeker concierge chat
   */
  static async getSeekerChatMessages(chatId: string, seekerId: string): Promise<ConciergeChatMessage[]> {
    try {
      console.log('🔍 Getting seeker chat messages:', { chatId, seekerId });

      // Use Prisma model instead of raw SQL
      const messages = await db.seekerConciergeChatMessage.findMany({
        where: { chatId },
        orderBy: { createdAt: 'asc' }
      });

      console.log('✅ Found messages:', { count: messages.length });

      // Mark admin messages as read by the seeker
      await db.seekerConciergeChatMessage.updateMany({
        where: {
          chatId,
          senderType: 'admin',
          readAt: null
        },
        data: {
          readAt: new Date()
        }
      });

      return messages.map(msg => ({
        id: msg.id,
        chatId: msg.chatId,
        senderId: msg.senderId,
        senderType: msg.senderType as 'admin' | 'employer' | 'seeker',
        message: msg.message,
        messageType: msg.messageType as 'text' | 'file' | 'system',
        fileUrl: msg.fileUrl || undefined,
        fileName: msg.fileName || undefined,
        fileSize: msg.fileSize || undefined,
        readAt: msg.readAt || undefined,
        createdAt: msg.createdAt
      }));
    } catch (error) {
      console.error('Error getting seeker chat messages:', error);
      return [];
    }
  }

  /**
   * Send message from seeker in concierge chat
   */
  static async sendSeekerMessage(
    chatId: string,
    seekerId: string,
    message: string
  ): Promise<ConciergeChatMessage> {
    try {
      console.log('🔍 Sending seeker message:', { chatId, seekerId, messageLength: message.length });

      // Use Prisma model instead of raw SQL to avoid ID generation issues
      const newMessage = await db.seekerConciergeChatMessage.create({
        data: {
          chatId,
          senderId: seekerId,
          senderType: 'seeker',
          message,
          messageType: 'text'
        }
      });

      console.log('✅ Message created:', { messageId: newMessage.id });

      // Send notification to concierge admin
      await this.sendSeekerChatNotification(chatId, seekerId, 'seeker', message);

      return {
        id: newMessage.id,
        chatId: newMessage.chatId,
        senderId: newMessage.senderId,
        senderType: newMessage.senderType as 'admin' | 'employer' | 'seeker',
        message: newMessage.message,
        messageType: newMessage.messageType as 'text',
        createdAt: newMessage.createdAt
      };
    } catch (error) {
      console.error('Error sending seeker message:', error);
      throw error;
    }
  }

  /**
   * Send message from admin to seeker in concierge chat
   */
  static async sendAdminToSeekerMessage(
    chatId: string,
    adminId: string,
    message: string
  ): Promise<ConciergeChatMessage> {
    try {
      console.log('🔍 Sending admin to seeker message:', { chatId, adminId, messageLength: message.length });

      // Use Prisma model instead of raw SQL to avoid ID generation issues
      const newMessage = await db.seekerConciergeChatMessage.create({
        data: {
          chatId,
          senderId: adminId,
          senderType: 'admin',
          message,
          messageType: 'text'
        }
      });

      console.log('✅ Message created:', { messageId: newMessage.id });

      // Send notification to seeker
      await this.sendSeekerChatNotification(chatId, adminId, 'admin', message);

      return {
        id: newMessage.id,
        chatId: newMessage.chatId,
        senderId: newMessage.senderId,
        senderType: newMessage.senderType as 'admin' | 'employer' | 'seeker',
        message: newMessage.message,
        messageType: newMessage.messageType as 'text',
        createdAt: newMessage.createdAt
      };
    } catch (error) {
      console.error('Error sending admin to seeker message:', error);
      throw error;
    }
  }

  /**
   * Send seeker chat notification to the other party
   */
  private static async sendSeekerChatNotification(
    chatId: string,
    senderId: string,
    senderType: 'admin' | 'seeker',
    message: string
  ): Promise<void> {
    try {
      // Get chat details
      const chatResult = await db.$queryRaw`
        SELECT sc.*, j.title as job_title, e.company_name,
               admin_profile.name as concierge_name,
               seeker_profile.name as seeker_name
        FROM seeker_concierge_chats sc
        JOIN jobs j ON sc.job_id = j.id
        JOIN employers e ON j.employer_id = e.user_id
        LEFT JOIN user_profiles admin_profile ON sc.admin_id = admin_profile.id
        LEFT JOIN user_profiles seeker_profile ON sc.seeker_id = seeker_profile.id
        WHERE sc.id = ${chatId} LIMIT 1
      ` as any[];

      if (chatResult.length === 0) {
        return;
      }

      const chat = chatResult[0];
      const recipientId = senderType === 'admin' ? chat.seeker_id : chat.admin_id;

      if (!recipientId) {
        return; // No recipient to notify
      }

      // Create in-app notification
      const notificationMessage = message.length > 50
        ? `${message.substring(0, 50)}...`
        : message;

      const title = senderType === 'admin'
        ? `Message from ${chat.concierge_name || 'Concierge'}`
        : `Message from ${chat.seeker_name}`;

      await inAppNotificationService.createNotification({
        userId: recipientId,
        type: 'system_alert',
        title,
        message: notificationMessage,
        data: {
          chatId,
          jobId: chat.job_id,
          jobTitle: chat.job_title,
          senderType,
          companyName: chat.company_name
        },
        actionUrl: senderType === 'admin'
          ? `/seeker/concierge-chat/${chat.job_id}/${chatId}`
          : `/admin/concierge/seeker-chat/${chatId}`
      });

      // Send real-time notification
      await realTimeNotificationService.sendToUser(recipientId, {
        id: `seeker_chat_${Date.now()}`,
        type: 'system_alert',
        title,
        message: notificationMessage,
        priority: 'medium',
        showToast: true,
        toastVariant: 'default',
        actionUrl: senderType === 'admin'
          ? `/seeker/concierge-chat/${chat.job_id}/${chatId}`
          : `/admin/concierge/seeker-chat/${chatId}`,
        data: {
          chatId,
          jobId: chat.job_id,
          jobTitle: chat.job_title,
          senderType
        }
      });

    } catch (error) {
      console.error('Error sending seeker chat notification:', error);
    }
  }

  /**
   * Send chat notification to the other party
   */
  private static async sendChatNotification(
    chatId: string,
    senderId: string,
    senderType: 'admin' | 'employer',
    message: string,
    messageType: 'text' | 'file' | 'system'
  ): Promise<void> {
    try {
      // Get chat details with concierge info
      const chatResult = await db.$queryRaw`
        SELECT cc.*, j.title as job_title, e.company_name, up.name as employer_name,
               admin_profile.name as concierge_name, admin_profile.profile_picture_url as concierge_picture,
               admin_profile.concierge_title, admin_profile.concierge_bio, admin_profile.concierge_specialties,
               admin_profile.concierge_experience
        FROM concierge_chats cc
        JOIN jobs j ON cc.job_id = j.id
        JOIN employers e ON cc.employer_id = e.user_id
        JOIN user_profiles up ON e.user_id = up.id
        LEFT JOIN user_profiles admin_profile ON cc.admin_id = admin_profile.id
        WHERE cc.id = ${chatId} LIMIT 1
      ` as any[];

      if (chatResult.length === 0) {
        return;
      }

      const chat = chatResult[0];
      const recipientId = senderType === 'admin' ? chat.employer_id : chat.admin_id;
      const recipientType = senderType === 'admin' ? 'employer' : 'admin';

      if (!recipientId) {
        return; // No recipient to notify
      }

      // Create in-app notification
      await inAppNotificationService.createNotification({
        userId: recipientId,
        type: 'system_alert',
        title: `New message in concierge chat`,
        message: messageType === 'file'
          ? `File shared in ${chat.job_title} chat`
          : message.length > 50
            ? `${message.substring(0, 50)}...`
            : message,
        data: {
          chatId,
          jobId: chat.job_id,
          jobTitle: chat.job_title,
          senderType,
          companyName: chat.company_name
        },
        actionUrl: recipientType === 'admin'
          ? `/admin/concierge/${chat.job_id}`
          : `/employer/concierge/${chat.job_id}`
      });

      // Send real-time notification
      const notificationMessage = messageType === 'file'
        ? `File shared in ${chat.job_title} chat`
        : message.length > 100
          ? `${message.substring(0, 100)}...`
          : message;

      await realTimeNotificationService.sendToUser(recipientId, {
        id: `chat_${Date.now()}`,
        type: 'system_alert',
        title: 'New Concierge Message',
        message: notificationMessage,
        priority: 'medium',
        showToast: true,
        toastVariant: 'default',
        actionUrl: recipientType === 'admin'
          ? `/admin/concierge/${chat.job_id}`
          : `/employer/concierge/${chat.job_id}`,
        data: {
          chatId,
          jobId: chat.job_id,
          jobTitle: chat.job_title,
          senderType
        }
      });

    } catch (error) {
      console.error('Error sending chat notification:', error);
    }
  }
}