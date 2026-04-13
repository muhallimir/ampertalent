import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify seeker role
    if (currentUser.profile.role !== 'seeker') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get seeker profile with settings
    const seekerProfile = await db.jobSeeker.findUnique({
      where: { userId: currentUser.profile.id },
      select: {
        // Privacy & Visibility Settings
        profileVisibility: true,
        showSalaryExpectations: true,
        allowJobInvitations: true,
        allowDirectMessages: true,

        // Notification Preferences
        emailAlerts: true,
        jobRecommendations: true,
        applicationUpdates: true,
        weeklyDigest: true,

        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!seekerProfile) {
      return NextResponse.json({ error: 'Seeker profile not found' }, { status: 404 })
    }

    // Transform for frontend
    const settings = {
      notifications: {
        emailAlerts: seekerProfile.emailAlerts,
        jobRecommendations: seekerProfile.jobRecommendations,
        applicationUpdates: seekerProfile.applicationUpdates,
        weeklyDigest: seekerProfile.weeklyDigest
      },
      privacy: {
        profileVisibility: seekerProfile.profileVisibility.replace('_', '-'), // Convert employers_only to employers-only
        showSalaryExpectations: seekerProfile.showSalaryExpectations,
        allowJobInvitations: seekerProfile.allowJobInvitations,
        allowDirectMessages: seekerProfile.allowDirectMessages
      },
      account: {
        email: seekerProfile.user.email || '',
        name: seekerProfile.user.name || ''
      }
    }

    return NextResponse.json({ settings })

  } catch (error) {
    console.error('Error fetching seeker settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify seeker role
    if (currentUser.profile.role !== 'seeker') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { notifications, privacy } = body

    // Convert profileVisibility from frontend format to database format
    const profileVisibility = privacy.profileVisibility.replace('-', '_') // Convert employers-only to employers_only

    // Update seeker settings
    const updatedSeeker = await db.jobSeeker.update({
      where: { userId: currentUser.profile.id },
      data: {
        // Privacy & Visibility Settings
        profileVisibility: profileVisibility,
        showSalaryExpectations: privacy.showSalaryExpectations,
        allowJobInvitations: privacy.allowJobInvitations,
        allowDirectMessages: privacy.allowDirectMessages,

        // Notification Preferences
        emailAlerts: notifications.emailAlerts,
        jobRecommendations: notifications.jobRecommendations,
        applicationUpdates: notifications.applicationUpdates,
        weeklyDigest: notifications.weeklyDigest
      },
      select: {
        // Privacy & Visibility Settings
        profileVisibility: true,
        showSalaryExpectations: true,
        allowJobInvitations: true,
        allowDirectMessages: true,

        // Notification Preferences
        emailAlerts: true,
        jobRecommendations: true,
        applicationUpdates: true,
        weeklyDigest: true,

        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Sync allowDirectMessages to UserProfile so send/route.ts enforcement reads the correct value
    await db.userProfile.update({
      where: { id: currentUser.profile.id },
      data: { allowDirectMessages: privacy.allowDirectMessages }
    })

    // Transform for frontend — build response from updatedSeeker
    const settings = {
      notifications: {
        emailAlerts: updatedSeeker.emailAlerts,
        jobRecommendations: updatedSeeker.jobRecommendations,
        applicationUpdates: updatedSeeker.applicationUpdates,
        weeklyDigest: updatedSeeker.weeklyDigest
      },
      privacy: {
        profileVisibility: updatedSeeker.profileVisibility.replace('_', '-'), // Convert employers_only to employers-only
        showSalaryExpectations: updatedSeeker.showSalaryExpectations,
        allowJobInvitations: updatedSeeker.allowJobInvitations,
        allowDirectMessages: updatedSeeker.allowDirectMessages
      },
      account: {
        email: updatedSeeker.user.email || '',
        name: updatedSeeker.user.name || ''
      }
    }

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error('Error updating seeker settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}