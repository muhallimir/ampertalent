import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { S3Service } from '@/lib/s3'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'hire-my-mom-files'

// Helper function to generate presigned URL for company logo
async function generatePresignedLogoUrl(companyLogoUrl: string | null): Promise<string | null> {
  if (!companyLogoUrl || companyLogoUrl.trim() === '') {
    return null
  }

  try {
    // Extract S3 key from the full URL
    const url = new URL(companyLogoUrl)
    const s3Key = url.pathname.substring(1) // Remove leading slash

    // Generate presigned URL for download (valid for 1 hour)
    const presignedUrl = await S3Service.generatePresignedDownloadUrl(
      BUCKET_NAME,
      s3Key,
      3600 // 1 hour
    )

    return presignedUrl
  } catch (error) {
    console.error('Error generating presigned URL for company logo:', error)
    // Fall back to original URL if presigned URL generation fails
    return companyLogoUrl
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role (both admin and super_admin can manage users)
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query parameters for pagination and filtering
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const lastActive = searchParams.get('lastActive') || ''

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Build where clause for filtering
    const whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role && role !== 'all') {
      whereClause.role = role
    }

    // Add last active filter
    if (lastActive && lastActive !== 'all') {
      const now = new Date()
      let dateThreshold: Date | undefined

      switch (lastActive) {
        case 'today':
          dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          dateThreshold = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case '3months':
          dateThreshold = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case '6months':
          dateThreshold = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
          break
        case 'inactive':
          // Users inactive for 6+ months
          dateThreshold = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
          whereClause.updatedAt = { lt: dateThreshold }
          break
        default:
          // No filter applied for unknown values
          break
      }

      // For all cases except 'inactive', filter for users active since the threshold
      if (lastActive !== 'inactive' && dateThreshold) {
        whereClause.updatedAt = { gte: dateThreshold }
      }
    }

    // Get total count for pagination
    const totalUsers = await db.userProfile.count({
      where: whereClause
    })

    // Fetch paginated users with their related data
    const users = await db.userProfile.findMany({
      where: whereClause,
      include: {
        jobSeeker: {
          select: {
            membershipPlan: true,
            membershipExpiresAt: true,
            isSuspended: true,
            applications: {
              select: { id: true }
            }
          }
        },
        employer: {
          select: {
            companyName: true,
            companyLogoUrl: true,
            isSuspended: true,
            jobs: {
              select: { id: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    })

    // Transform users to match the expected interface
    const transformedUsers = await Promise.all(users.map(async (user: typeof users[0]) => {
      const isJobSeeker = user.role === 'seeker'
      const isEmployer = user.role === 'employer'

      // Use the stored email address from our database
      const userEmail = user.email || 'No email provided'

      // Determine status based on role-specific suspension flags
      let status: 'active' | 'suspended' | 'pending' | 'banned' = 'active'
      if (isJobSeeker && user.jobSeeker?.isSuspended) {
        status = 'suspended'
      } else if (isEmployer && user.employer?.isSuspended) {
        status = 'suspended'
      }

      // Determine subscription status for job seekers
      let subscriptionStatus: 'active' | 'expired' | 'trial' | undefined = undefined
      if (isJobSeeker && user.jobSeeker) {
        const membershipPlan = user.jobSeeker.membershipPlan
        const expiresAt = user.jobSeeker.membershipExpiresAt

        if (membershipPlan === 'none') {
          subscriptionStatus = undefined
        } else if (expiresAt && new Date() > expiresAt) {
          subscriptionStatus = 'expired'
        } else {
          subscriptionStatus = 'active'
        }
      }

      // Use database timestamp for last active
      const lastActiveTimestamp = user.updatedAt

      // Generate presigned URL for company logo if employer
      const presignedLogoUrl = isEmployer && user.employer?.companyLogoUrl
        ? await generatePresignedLogoUrl(user.employer.companyLogoUrl)
        : null

      return {
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: userEmail,
        role: user.role,
        status,
        joinedAt: user.createdAt.toISOString(),
        lastActive: lastActiveTimestamp.toISOString(),
        profilePictureUrl: user.profilePictureUrl,
        // Add company info for employers
        ...(isEmployer && {
          companyName: user.employer?.companyName,
          companyLogoUrl: presignedLogoUrl || user.employer?.companyLogoUrl,
          jobsPosted: user.employer?.jobs?.length || 0
        }),
        // Add seeker info
        ...(isJobSeeker && { applicationsSubmitted: user.jobSeeker?.applications?.length || 0 }),
        ...(subscriptionStatus && { subscriptionStatus }),
        // Set default values for fields that don't exist in our schema yet
        verificationStatus: 'verified' as const,
        flaggedReports: 0
      }
    }))

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalUsers / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      users: transformedUsers,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
        hasNextPage,
        hasPreviousPage
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role (both admin and super_admin can manage users)
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, action, value } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find the user to update
    const targetUser = await db.userProfile.findUnique({
      where: { id: userId },
      include: {
        jobSeeker: true,
        employer: true
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Protect owner account from suspension or deletion
    if (targetUser.email === 'lesley@ampertalent.com') {
      if (action === 'updateStatus' && value !== 'active') {
        return NextResponse.json({
          error: 'Owner account cannot be suspended or banned'
        }, { status: 403 })
      }
      if (action === 'delete') {
        return NextResponse.json({
          error: 'Owner account cannot be deleted'
        }, { status: 403 })
      }
    }

    let updatedUser

    if (action === 'updateStatus') {
      // Update suspension status based on user role
      if (targetUser.role === 'seeker' && targetUser.jobSeeker) {
        updatedUser = await db.jobSeeker.update({
          where: { userId: targetUser.id },
          data: { isSuspended: value === 'suspended' }
        })
      } else if (targetUser.role === 'employer' && targetUser.employer) {
        updatedUser = await db.employer.update({
          where: { userId: targetUser.id },
          data: { isSuspended: value === 'suspended' }
        })
      }
    } else if (action === 'updateRole') {
      // Update user role
      updatedUser = await db.userProfile.update({
        where: { id: userId },
        data: { role: value }
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        action,
        value
      }
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}