import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ConciergeService } from '@/lib/concierge-service'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log('Concierge API called with status:', status, 'limit:', limit)

    // Get concierge requests from the service
    const allRequests = await ConciergeService.getAllConciergeRequests(status)

    console.log('Raw concierge requests count:', allRequests?.length || 0)
    console.log('Raw concierge requests:', JSON.stringify(allRequests, null, 2))

    // Handle case where no requests are returned
    if (!allRequests || allRequests.length === 0) {
      console.log('No concierge requests found, returning empty array')
      return NextResponse.json({
        success: true,
        requests: [],
        total: 0
      })
    }

    // Limit the results if specified
    const requests = limit ? allRequests.slice(0, limit) : allRequests

    // Transform the data to match dashboard expectations with better error handling
    const transformedRequests = requests.map((request: any) => {
      console.log('Processing request:', JSON.stringify(request, null, 2))

      return {
        id: request.id || 'unknown-id',
        jobId: request.jobId || 'unknown-job',
        status: request.status || 'pending',
        createdAt: request.createdAt || new Date().toISOString(),
        job: {
          title: request.jobTitle || request.job?.title || 'Untitled Job',
          employer: {
            companyName: request.companyName || request.employer?.companyName || request.job?.employer?.companyName || 'Unknown Company'
          }
        }
      }
    }).filter(request => request.id !== 'unknown-id') // Filter out invalid requests

    console.log('Transformed requests:', JSON.stringify(transformedRequests, null, 2))

    return NextResponse.json({
      success: true,
      requests: transformedRequests,
      total: transformedRequests.length
    })
  } catch (error) {
    console.error('Error fetching concierge requests for dashboard:', error)
    // Return empty array instead of error to prevent dashboard crash
    return NextResponse.json({
      success: true,
      requests: [],
      total: 0
    })
  }
}