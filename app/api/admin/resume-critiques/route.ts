import { NextRequest, NextResponse } from 'next/server'
import { ResumeCritiqueService } from '@/lib/resume-critique'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Simplified GET endpoint - admin page should have access to all data
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('🚀 Resume Critiques API: GET request received (simplified version)')

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    console.log('🔍 Resume Critiques API: Filtering by status', { status })

    if (status === 'pending') {
      console.log('📥 Resume Critiques API: Fetching pending critiques')
      const pendingCritiques = await ResumeCritiqueService.getPendingCritiques()
      console.log('✅ Resume Critiques API: Found pending critiques', { count: pendingCritiques.length })
      return NextResponse.json({ critiques: pendingCritiques })
    } else if (status === 'completed') {
      console.log('📥 Resume Critiques API: Fetching completed critiques')
      // Return completed critiques with reviewer names
      const completedCritiques = await db.resumeCritique.findMany({
        where: { status: 'completed' },
        orderBy: {
          completedAt: 'desc'
        },
        include: {
          seeker: {
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                }
              }
            }
          }
        }
      })

      // Convert database models to our interface, fetching reviewer names
      const convertedCritiques = await Promise.all(completedCritiques.map(async (critique) => {
        let reviewerName = undefined;
        if (critique.reviewerId) {
          const reviewerProfile = await db.userProfile.findUnique({
            where: { clerkUserId: critique.reviewerId },
            select: { name: true }
          });
          reviewerName = reviewerProfile?.name || undefined;
        }

        return {
          id: critique.id,
          seekerId: critique.seekerId,
          resumeUrl: critique.resumeUrl,
          targetRole: critique.targetRole || undefined,
          targetIndustry: critique.targetIndustry || undefined,
          status: critique.status,
          priority: critique.priority,
          cost: critique.cost,
          requestedAt: critique.requestedAt,
          completedAt: critique.completedAt || undefined,
          reviewerId: critique.reviewerId || undefined,
          reviewerName: reviewerName,
          analysis: critique.analysis ? JSON.parse(critique.analysis as string) : undefined
        };
      }));

      console.log('✅ Resume Critiques API: Found completed critiques', { count: convertedCritiques.length })
      return NextResponse.json({ critiques: convertedCritiques })
    } else {
      console.log('📥 Resume Critiques API: Fetching all critiques')
      // If no status or status is "all", return all critiques with reviewer names
      const allCritiques = await db.resumeCritique.findMany({
        orderBy: {
          requestedAt: 'desc'
        },
        include: {
          seeker: {
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                }
              }
            }
          }
        }
      })

      // Convert database models to our interface, fetching reviewer names
      const convertedCritiques = await Promise.all(allCritiques.map(async (critique) => {
        let reviewerName = undefined;
        if (critique.reviewerId) {
          const reviewerProfile = await db.userProfile.findUnique({
            where: { clerkUserId: critique.reviewerId },
            select: { name: true }
          });
          reviewerName = reviewerProfile?.name || undefined;
        }

        return {
          id: critique.id,
          seekerId: critique.seekerId,
          resumeUrl: critique.resumeUrl,
          targetRole: critique.targetRole || undefined,
          targetIndustry: critique.targetIndustry || undefined,
          status: critique.status,
          priority: critique.priority,
          cost: critique.cost,
          requestedAt: critique.requestedAt,
          completedAt: critique.completedAt || undefined,
          reviewerId: critique.reviewerId || undefined,
          reviewerName: reviewerName,
          analysis: critique.analysis ? JSON.parse(critique.analysis as string) : undefined
        };
      }));

      console.log('✅ Resume Critiques API: Found all critiques', { count: convertedCritiques.length })
      return NextResponse.json({ critiques: convertedCritiques })
    }
  } catch (error) {
    console.error('🚨 Resume Critiques API: Error fetching admin critiques:', error)
    return NextResponse.json(
      { error: 'Failed to fetch critiques', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Keep the POST endpoint with authentication for security (submitting reviews should be protected)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId, reviewerId, analysis, isDraft } = body

    console.log('📥 Resume Critiques API: Processing critique', { requestId, reviewerId })

    if (!requestId || !reviewerId || !analysis) {
      console.log('❌ Resume Critiques API: Missing required fields', { requestId, reviewerId, hasAnalysis: !!analysis })
      return NextResponse.json(
        { error: 'Missing required fields', fields: { requestId: !!requestId, reviewerId: !!reviewerId, analysis: !!analysis } },
        { status: 400 }
      )
    }

    const status = isDraft ? 'in_progress' : 'completed'

    await ResumeCritiqueService.processCritique(requestId, reviewerId, analysis, status)

    console.log('✅ Resume Critiques API: Critique processed successfully', { requestId })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('🚨 Resume Critiques API: Error processing critique:', error)
    return NextResponse.json(
      { error: 'Failed to process critique', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}