import { db } from './db'
import { hasActiveSubscription } from './subscription-check'
import { externalWebhookService } from './external-webhook-service'

/**
 * Resume Critique System
 * Provides professional feedback and scoring for job seeker resumes
 */

export interface ResumeAnalysis {
  overallScore: number
  sections: {
    formatting: {
      score: number
      feedback: string[]
      suggestions: string[]
    }
    content: {
      score: number
      feedback: string[]
      suggestions: string[]
    }
    keywords: {
      score: number
      feedback: string[]
      suggestions: string[]
      missingKeywords: string[]
      industryKeywords: string[]
    }
    experience: {
      score: number
      feedback: string[]
      suggestions: string[]
    }
    skills: {
      score: number
      feedback: string[]
      suggestions: string[]
    }
  }
  recommendations: {
    priority: 'high' | 'medium' | 'low'
    category: string
    title: string
    description: string
    impact: string
  }[]
  industryComparison: {
    averageScore: number
    percentile: number
    topPerformingAreas: string[]
    improvementAreas: string[]
  }
}

export interface CritiqueRequest {
  id: string
  seekerId: string
  resumeUrl: string
  targetRole?: string
  targetIndustry?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  analysis?: ResumeAnalysis
  reviewerId?: string
  reviewerName?: string
  requestedAt: Date
  completedAt?: Date
  priority: 'standard' | 'rush'
  cost: number
}

export class ResumeCritiqueService {
  /**
   * Submit a resume for critique
   */
  static async submitResumeCritique(params: {
    seekerId: string
    resumeUrl: string
    targetRole?: string
    targetIndustry?: string
    priority?: 'standard' | 'rush'
  }): Promise<CritiqueRequest> {
    try {
      const { seekerId, resumeUrl, targetRole, targetIndustry, priority = 'standard' } = params

      // Calculate cost based on priority
      const cost = priority === 'rush' ? 49.99 : 29.99

      // Check if seeker has active subscription or credits
      const seeker = await db.jobSeeker.findUnique({
        where: { userId: seekerId },
        select: {
          membershipPlan: true,
          membershipExpiresAt: true,
          resumeCredits: true,
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })

      if (!seeker) {
        throw new Error('Job seeker not found')
      }

      if (!seeker.user) {
        throw new Error('Job seeker user data not found')
      }

      // Check if they have credits or active premium membership
      const isSubscriptionActive = await hasActiveSubscription(seekerId)

      // Create critique request in database
      const request = await db.$transaction(async (tx) => {
        // Deduct credit if not premium subscriber and seeker has credits
        if (!isSubscriptionActive && (seeker.resumeCredits || 0) > 0) {
          await tx.jobSeeker.update({
            where: { userId: seekerId },
            data: {
              resumeCredits: {
                decrement: 1
              }
            }
          })
        }

        // Create the critique request in database
        const critiqueData = await tx.resumeCritique.create({
          data: {
            seekerId,
            resumeUrl,
            targetRole,
            targetIndustry,
            priority,
            cost,
            status: 'pending'
          }
        })

        return critiqueData
      })

      // Convert database model to our interface
      const critiqueRequest: CritiqueRequest = {
        id: request.id,
        seekerId: request.seekerId,
        resumeUrl: request.resumeUrl,
        targetRole: request.targetRole || undefined,
        targetIndustry: request.targetIndustry || undefined,
        status: request.status,
        priority: request.priority,
        cost: request.cost,
        requestedAt: request.requestedAt,
        completedAt: request.completedAt || undefined
      }

      // Send webhook notification
      try {
        await externalWebhookService.sendSeekerResumeCritiqueCreated({
          userId: seekerId,
          email: seeker.user.email || '',
          firstName: seeker.user.firstName || '',
          lastName: seeker.user.lastName || undefined,
          critiqueRequestId: request.id,
          resumeUrl: request.resumeUrl,
          targetRole: request.targetRole || '',
          targetIndustry: request.targetIndustry || '',
          priority: request.priority,
          cost: request.cost
        })
      } catch (webhookError) {
        console.error('Failed to send resume critique webhook:', webhookError)
        // Don't throw here as we don't want webhook failures to break the main flow
      }

      // Queue the critique for processing
      // await this.queueCritiqueProcessing(request.id)

      return critiqueRequest
    } catch (error) {
      console.error('Error submitting resume critique:', error)
      throw error
    }
  }

  /**
   * Get critique requests for a seeker
   */
  static async getCritiqueRequests(seekerId: string, page: number = 1, limit: number = 10): Promise<{ requests: CritiqueRequest[], totalCount: number }> {
    try {
      // Query the database for critique requests with pagination
      const [requests, totalCount] = await Promise.all([
        db.resumeCritique.findMany({
          where: { seekerId },
          orderBy: { requestedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        db.resumeCritique.count({
          where: { seekerId }
        })
      ])

      // Convert database models to our interface, fetching reviewer names
      const convertedRequests = await Promise.all(requests.map(async (request) => {
        let reviewerName = undefined;
        if (request.reviewerId) {
          const reviewerProfile = await db.userProfile.findUnique({
            where: { clerkUserId: request.reviewerId },
            select: { name: true }
          });
          reviewerName = reviewerProfile?.name || undefined;
        }

        return {
          id: request.id,
          seekerId: request.seekerId,
          resumeUrl: request.resumeUrl,
          targetRole: request.targetRole || undefined,
          targetIndustry: request.targetIndustry || undefined,
          status: request.status,
          priority: request.priority,
          cost: request.cost,
          requestedAt: request.requestedAt,
          completedAt: request.completedAt || undefined,
          reviewerId: request.reviewerId || undefined,
          reviewerName: reviewerName,
          analysis: request.analysis ? JSON.parse(request.analysis as string) : undefined
        };
      }));

      return { requests: convertedRequests, totalCount }
    } catch (error) {
      console.error('Error getting critique requests:', error)
      return { requests: [], totalCount: 0 }
    }
  }

  /**
   * Get critique request by ID
   */
  static async getCritiqueRequest(requestId: string): Promise<CritiqueRequest | null> {
    try {
      // Query the database for the specific critique request
      const request = await db.resumeCritique.findUnique({
        where: { id: requestId }
      })

      if (!request) {
        return null
      }

      // Convert database model to our interface, fetching reviewer name
      let reviewerName = undefined;
      if (request.reviewerId) {
        const reviewerProfile = await db.userProfile.findUnique({
          where: { clerkUserId: request.reviewerId },
          select: { name: true }
        });
        reviewerName = reviewerProfile?.name || undefined;
      }

      return {
        id: request.id,
        seekerId: request.seekerId,
        resumeUrl: request.resumeUrl,
        targetRole: request.targetRole || undefined,
        targetIndustry: request.targetIndustry || undefined,
        status: request.status,
        priority: request.priority,
        cost: request.cost,
        requestedAt: request.requestedAt,
        completedAt: request.completedAt || undefined,
        reviewerId: request.reviewerId || undefined,
        reviewerName: reviewerName,
        analysis: request.analysis ? JSON.parse(request.analysis as string) : undefined
      }
    } catch (error) {
      console.error('Error getting critique request:', error)
      return null
    }
  }

  /**
   * Process resume critique (admin function)
   */
  static async processCritique(
    requestId: string,
    reviewerId: string,
    analysis: ResumeAnalysis,
    status: 'completed' | 'in_progress'
  ): Promise<void> {
    try {
      // Update the critique request in the database
      await db.resumeCritique.update({
        where: { id: requestId },
        data: {
          status: status,
          completedAt: new Date(),
          analysis: JSON.stringify(analysis),
          reviewerId
        }
      })

      // Send notification to seeker
      await this.notifySeekerCritiqueComplete(requestId)
    } catch (error) {
      console.error('Error processing critique:', error)
      throw error
    }
  }

  /**
   * Get pending critiques for admin review
   */
  static async getPendingCritiques(): Promise<CritiqueRequest[]> {
    try {
      // Query the database for pending critique requests
      const requests = await db.resumeCritique.findMany({
        where: { status: 'pending' },
        orderBy: { requestedAt: 'asc' }
      })

      // Convert database models to our interface
      return requests.map(request => ({
        id: request.id,
        seekerId: request.seekerId,
        resumeUrl: request.resumeUrl,
        targetRole: request.targetRole || undefined,
        targetIndustry: request.targetIndustry || undefined,
        status: request.status,
        priority: request.priority,
        cost: request.cost,
        requestedAt: request.requestedAt,
        completedAt: request.completedAt || undefined,
        reviewerId: request.reviewerId || undefined
      }))
    } catch (error) {
      console.error('Error getting pending critiques:', error)
      return []
    }
  }

  /**
   * Generate automated analysis (AI-powered)
   */
  static async generateAutomatedAnalysis(
    resumeUrl: string,
    targetRole?: string,
    targetIndustry?: string
  ): Promise<ResumeAnalysis> {
    try {
      // In a real implementation, this would use AI/ML services
      // For now, return a comprehensive mock analysis

      const mockAnalysis: ResumeAnalysis = {
        overallScore: Math.floor(Math.random() * 30) + 60, // 60-90
        sections: {
          formatting: {
            score: Math.floor(Math.random() * 20) + 70,
            feedback: [
              'Professional layout with clear sections',
              'Consistent formatting throughout',
              'Good use of bullet points'
            ],
            suggestions: [
              'Consider using a more modern font like Calibri or Arial',
              'Add subtle color accents to section headers',
              'Ensure consistent spacing between sections'
            ]
          },
          content: {
            score: Math.floor(Math.random() * 25) + 65,
            feedback: [
              'Clear and concise job descriptions',
              'Good chronological order',
              'Relevant work experience highlighted'
            ],
            suggestions: [
              'Add a professional summary at the top',
              'Include more quantifiable achievements',
              'Use stronger action verbs to start bullet points'
            ]
          },
          keywords: {
            score: Math.floor(Math.random() * 30) + 60,
            feedback: [
              'Some relevant industry keywords present',
              'Technical skills clearly listed'
            ],
            suggestions: [
              'Add more role-specific keywords',
              'Include industry buzzwords naturally in descriptions'
            ],
            missingKeywords: targetRole ? this.getRelevantKeywords(targetRole) : [],
            industryKeywords: targetIndustry ? this.getIndustryKeywords(targetIndustry) : []
          },
          experience: {
            score: Math.floor(Math.random() * 25) + 70,
            feedback: [
              'Relevant work experience for target role',
              'Good progression in responsibilities'
            ],
            suggestions: [
              'Add more specific project details',
              'Include team size and budget managed',
              'Highlight leadership and collaboration skills'
            ]
          },
          skills: {
            score: Math.floor(Math.random() * 20) + 75,
            feedback: [
              'Comprehensive skills section',
              'Mix of technical and soft skills'
            ],
            suggestions: [
              'Organize skills by category (Technical, Leadership, etc.)',
              'Add proficiency levels for key skills',
              'Remove outdated or irrelevant skills'
            ]
          }
        },
        recommendations: [
          {
            priority: 'high',
            category: 'Content',
            title: 'Add Quantifiable Achievements',
            description: 'Replace generic job duties with specific, measurable accomplishments',
            impact: 'Could increase interview callbacks by 35-50%'
          },
          {
            priority: 'high',
            category: 'Keywords',
            title: 'Optimize for Applicant Tracking Systems',
            description: 'Include relevant keywords that match job descriptions in your field',
            impact: 'Improves chances of passing automated resume screening'
          },
          {
            priority: 'medium',
            category: 'Formatting',
            title: 'Modernize Design',
            description: 'Update to a more contemporary, clean design while maintaining professionalism',
            impact: 'Creates better first impression with hiring managers'
          }
        ],
        industryComparison: {
          averageScore: 68,
          percentile: Math.floor(Math.random() * 40) + 60,
          topPerformingAreas: ['Experience', 'Skills'],
          improvementAreas: ['Keywords', 'Content']
        }
      }

      return mockAnalysis
    } catch (error) {
      console.error('Error generating automated analysis:', error)
      throw error
    }
  }

  /**
   * Queue critique for processing
   */
  private static async queueCritiqueProcessing(requestId: string): Promise<void> {
    try {
      // In a real implementation, this would add to a job queue
      console.log('Queuing critique for processing:', requestId)

      // For demo purposes, simulate processing after a delay
      setTimeout(async () => {
        try {
          const analysis = await this.generateAutomatedAnalysis('/mock/resume.pdf')
          await this.processCritique(requestId, 'ai_reviewer', analysis)
        } catch (error) {
          console.error('Error in automated processing:', error)
          // Update status to failed if processing fails
          await db.resumeCritique.update({
            where: { id: requestId },
            data: {
              status: 'failed'
            }
          })
        }
      }, 5000) // 5 second delay for demo
    } catch (error) {
      console.error('Error queuing critique:', error)
    }
  }

  /**
   * Send notification when critique is complete
   */
  private static async notifySeekerCritiqueComplete(requestId: string): Promise<void> {
    try {
      // In a real implementation, this would send email/push notification
      console.log('Sending critique completion notification for:', requestId)
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  /**
   * Get relevant keywords for a role
   */
  private static getRelevantKeywords(role: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'Frontend Developer': ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Vue', 'Angular'],
      'Backend Developer': ['Node.js', 'Python', 'Java', 'API', 'Database', 'SQL', 'MongoDB'],
      'Marketing Manager': ['SEO', 'SEM', 'Analytics', 'Campaign', 'ROI', 'Lead Generation'],
      'Project Manager': ['Agile', 'Scrum', 'Kanban', 'Stakeholder', 'Budget', 'Timeline'],
      'Data Analyst': ['SQL', 'Python', 'Excel', 'Tableau', 'Statistics', 'Visualization']
    }

    return keywordMap[role] || ['Leadership', 'Communication', 'Problem Solving']
  }

  /**
   * Get industry-specific keywords
   */
  private static getIndustryKeywords(industry: string): string[] {
    const industryMap: Record<string, string[]> = {
      'Technology': ['Innovation', 'Digital', 'Software', 'Platform', 'Cloud', 'AI'],
      'Healthcare': ['Patient Care', 'Compliance', 'Medical', 'Clinical', 'Safety'],
      'Finance': ['Risk Management', 'Compliance', 'Analysis', 'Portfolio', 'Investment'],
      'Marketing': ['Brand', 'Campaign', 'Digital Marketing', 'Content', 'Social Media'],
      'Education': ['Curriculum', 'Student', 'Learning', 'Assessment', 'Development']
    }

    return industryMap[industry] || ['Professional', 'Excellence', 'Quality']
  }
}

// Export the service
export const resumeCritique = ResumeCritiqueService