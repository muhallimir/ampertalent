import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/admin/pending-job-posts
 * Fetch all pending job posts (abandoned employer checkouts)
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: 'all' | 'active' | 'expired' (default: 'all')
 * - search: Search by email (optional)
 */
export async function GET(request: NextRequest) {
    try {
        // 1. AUTHENTICATION: Verify user is admin
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.profile || currentUser.profile.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 401 }
            )
        }

        // 2. PARSE QUERY PARAMETERS
        const searchParams = request.nextUrl.searchParams
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const status = searchParams.get('status') || 'all' // 'all' | 'active' | 'expired'
        const search = searchParams.get('search') || ''

        // 3. BUILD WHERE CLAUSE
        const where: any = {}

        // Filter by status
        if (status === 'active') {
            where.expiresAt = { gte: new Date() }
        } else if (status === 'expired') {
            where.expiresAt = { lt: new Date() }
        }

        // Search by email
        if (search) {
            where.email = {
                contains: search,
                mode: 'insensitive'
            }
        }

        // 4. FETCH ALL PENDING JOB POSTS
        const allPendingJobPosts = await db.pendingJobPost.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        })

        // NOTE: NO DEDUPLICATION for employer job posts!
        // Unlike seeker signups (1 subscription per email), employers can have
        // multiple job postings, so we keep ALL abandoned job post attempts.
        // Each record represents a different job posting that was abandoned.

        // 5. CALCULATE TOTAL COUNT AND PAGINATION
        const total = allPendingJobPosts.length
        const pages = Math.ceil(total / limit)
        const skip = (page - 1) * limit

        // 6. PAGINATE RESULTS
        const paginatedJobPosts = allPendingJobPosts.slice(skip, skip + limit)

        // 7. ENRICH WITH ADDITIONAL DATA
        const now = new Date()
        const enrichedJobPosts = paginatedJobPosts.map(jobPost => {
            const isExpired = new Date(jobPost.expiresAt) < now
            const timeRemainingMs = new Date(jobPost.expiresAt).getTime() - now.getTime()

            // Parse job data to extract job title
            let jobTitle = 'Untitled Job'
            try {
                const jobData = typeof jobPost.jobData === 'string'
                    ? JSON.parse(jobPost.jobData)
                    : jobPost.jobData
                jobTitle = jobData?.title || jobData?.jobTitle || 'Untitled Job'
            } catch (e) {
                console.error('Error parsing job data:', e)
            }

            return {
                id: jobPost.id,
                email: jobPost.email,
                selectedPackage: jobPost.selectedPackage || 'standard',
                sessionToken: jobPost.sessionToken,
                returnUrl: jobPost.returnUrl,
                createdAt: jobPost.createdAt.toISOString(),
                expiresAt: jobPost.expiresAt.toISOString(),
                isExpired,
                timeRemaining: timeRemainingMs,
                jobTitle,
                userType: 'employer' as const
            }
        })

        // 8. CALCULATE STATISTICS
        const stats = {
            total: allPendingJobPosts.length,
            active: allPendingJobPosts.filter(jp => new Date(jp.expiresAt) >= now).length,
            expired: allPendingJobPosts.filter(jp => new Date(jp.expiresAt) < now).length
        }

        // 9. RETURN RESPONSE
        return NextResponse.json({
            pendingJobPosts: enrichedJobPosts,
            stats,
            pagination: {
                page,
                limit,
                total,
                pages
            }
        })

    } catch (error) {
        console.error('❌ Error fetching pending job posts:', error)
        return NextResponse.json(
            { error: 'Failed to fetch pending job posts' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/admin/pending-job-posts
 * Delete a specific pending job post
 * 
 * Body:
 * - id: Pending job post ID to delete
 */
export async function DELETE(request: NextRequest) {
    try {
        // 1. AUTHENTICATION: Verify user is admin
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.profile || currentUser.profile.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 401 }
            )
        }

        // 2. PARSE REQUEST BODY
        const body = await request.json()
        const { id } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Pending job post ID is required' },
                { status: 400 }
            )
        }

        // 3. DELETE THE PENDING JOB POST
        await db.pendingJobPost.delete({
            where: { id }
        })

        console.log(`✅ Admin deleted pending job post: ${id}`)

        return NextResponse.json({
            success: true,
            message: 'Pending job post deleted successfully'
        })

    } catch (error) {
        console.error('❌ Error deleting pending job post:', error)
        return NextResponse.json(
            { error: 'Failed to delete pending job post' },
            { status: 500 }
        )
    }
}
