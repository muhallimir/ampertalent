import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Verify admin access (both admin and super_admin can search users)
    const currentUser = await getCurrentUser()

    console.log('🔍 User Search Debug - Auth Check:', {
      hasCurrentUser: !!currentUser,
      hasProfile: !!currentUser?.profile,
      profileRole: currentUser?.profile?.role,
      clerkUserId: currentUser?.profile?.clerkUserId,
      profileId: currentUser?.profile?.id
    })

    if (!currentUser?.profile?.role || (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin')) {
      console.error('Unauthorized access attempt to user search')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const role = searchParams.get('role') // Optional role filter
    const limit = parseInt(searchParams.get('limit') || '20')

    console.log('🔍 User Search Debug - Query Params:', {
      query,
      role,
      limit,
      queryLength: query.length
    })

    if (query.length < 2) {
      return NextResponse.json({ users: [] })
    }

    // Verify clerkUserId exists before using it
    if (!currentUser.profile.clerkUserId) {
      console.error('🔍 User Search Error - Missing clerkUserId:', {
        profileId: currentUser.profile.id,
        hasClerkUserId: !!currentUser.profile.clerkUserId,
        clerkUserIdValue: currentUser.profile.clerkUserId
      })
      return NextResponse.json(
        { error: 'Invalid user profile - missing clerkUserId' },
        { status: 500 }
      )
    }

    // Build search conditions - search by name, email, and company name
    let searchConditions: any = {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            { email: { contains: query, mode: 'insensitive' as const } },
            // Also search by company name for employers
            {
              employer: {
                companyName: { contains: query, mode: 'insensitive' as const }
              }
            }
          ],
        },
        // Exclude the current user from search results using id (always present)
        {
          clerkUserId: {
            not: currentUser.clerkUser.id
          }
        }
      ]
    }

    console.log('🔍 User Search Debug - Search Conditions:', {
      searchConditions: JSON.stringify(searchConditions, null, 2)
    })

    // Add role filter if specified
    if (role && (role === 'employer' || role === 'seeker')) {
      searchConditions = {
        AND: [
          searchConditions,
          { role: role as any }
        ]
      }
    }

    console.log('🔍 User Search Debug - Final Search Conditions:', {
      finalConditions: JSON.stringify(searchConditions, null, 2)
    })

    // Search users
    console.log('🔍 User Search Debug - Executing database query...')
    const users = await db.userProfile.findMany({
      where: searchConditions,
      include: {
        employer: {
          select: {
            companyName: true,
            companyWebsite: true,
          },
        },
        jobSeeker: {
          select: {
            headline: true,
            skills: true,
          },
        },
      },
      take: limit,
      orderBy: [
        { name: 'asc' },
      ],
    })

    console.log('🔍 User Search Debug - Query Results:', {
      userCount: users.length,
      users: users.map(u => ({ id: u.id, name: u.name, email: u.email }))
    })

    // Format response
    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      clerkUserId: user.clerkUserId,
      name: user.name,
      email: user.email,
      role: user.role,
      companyName: user.employer?.companyName,
      companyWebsite: user.employer?.companyWebsite,
      headline: user.jobSeeker?.headline,
      skills: user.jobSeeker?.skills,
      createdAt: user.createdAt,
    }))

    console.log('🔍 User Search Debug - Response:', {
      formattedUserCount: formattedUsers.length
    })

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('❌ Error searching users:', error)
    console.error('Error type:', typeof error)
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown')
    console.error('Error message:', error instanceof Error ? error.message : 'No message')
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')

    // Log the full error object
    if (error && typeof error === 'object') {
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : typeof error
      },
      { status: 500 }
    )
  }
}