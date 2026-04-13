import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { clerkClient } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser) {
      console.log('Email change attempt: Unauthorized - no user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Email change API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is an employer or admin impersonating an employer
    if (!currentUser.profile || (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer'))) {
      console.log('🚫 EMPLOYER EMAIL CHANGE: Access denied', {
        userId: currentUser.clerkUser.id,
        role: currentUser.profile?.role,
        isImpersonating: currentUser.isImpersonating,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { newEmail } = await request.json()

    // Validate input
    if (!newEmail) {
      console.log('Email change attempt: Missing new email', {
        userId: currentUser.clerkUser.id
      })
      return NextResponse.json({ error: 'New email address is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    // Check if new email is different from current
    const currentEmail = currentUser.clerkUser.primaryEmailAddress?.emailAddress
    if (newEmail === currentEmail) {
      return NextResponse.json({ error: 'New email must be different from current email' }, { status: 400 })
    }

    console.log('Processing email change request using backend approach', {
      userId: currentUser.clerkUser.id,
      currentEmail: currentEmail,
      newEmail: newEmail,
      timestamp: new Date().toISOString()
    })

    try {
      const clerk = await clerkClient()

      // Get the current primary email address ID
      const currentPrimaryEmailId = currentUser.clerkUser.primaryEmailAddress?.id

      if (!currentPrimaryEmailId) {
        console.error('No primary email address found for user', currentUser.clerkUser.id)
        return NextResponse.json({ error: 'No primary email address found' }, { status: 400 })
      }

      // Create the new email address as verified and primary
      console.log('Creating new verified email address...')
      const newEmailAddress = await clerk.emailAddresses.createEmailAddress({
        userId: currentUser.clerkUser.id,
        emailAddress: newEmail,
        verified: true,
        primary: true // Set as primary immediately
      })

      console.log('New email address created and set as primary:', newEmailAddress)

      // Delete ALL existing email addresses except the new one
      console.log('Deleting all existing email addresses...')
      const allEmails = currentUser.clerkUser.emailAddresses || []

      for (const emailAddr of allEmails) {
        if (emailAddr.id !== newEmailAddress.id) {
          try {
            console.log('Deleting email address:', emailAddr.emailAddress, '(ID:', emailAddr.id, ')')
            await clerk.emailAddresses.deleteEmailAddress(emailAddr.id)
          } catch (deleteError: any) {
            console.error('Failed to delete email address', emailAddr.emailAddress, ':', deleteError)
            // Continue with other deletions
          }
        }
      }

      console.log('Email cleanup completed')

      // Verify the change by fetching user emails
      const updatedUser = await clerk.users.getUser(currentUser.clerkUser.id)
      console.log('User email addresses after change:', {
        primary: updatedUser.primaryEmailAddress?.emailAddress,
        allEmails: updatedUser.emailAddresses.map(e => ({
          email: e.emailAddress,
          id: e.id,
          verification: e.verification?.status
        }))
      })

      // Update the email in the database
      const prisma = new PrismaClient()

      try {
        await prisma.userProfile.update({
          where: { id: currentUser.profile?.id },
          data: { email: newEmail }
        })
        console.log('Database email updated successfully')

        // CRM SYNC: Sync email change to GHL
        // This updates the email field in GHL contact
        try {
          const { createGHLService } = await import('@/lib/ghl-sync-service')
          const ghlService = await createGHLService()

          if (ghlService && currentUser.profile?.id) {
            console.log('🔄 EMPLOYER EMAIL CHANGE: Syncing updated email to GHL...', {
              userId: currentUser.profile.id,
              oldEmail: currentEmail,
              newEmail: newEmail
            })

            await ghlService.syncUserToGHL(currentUser.profile.id, 'update')

            console.log('✅ EMPLOYER EMAIL CHANGE: Email synced to GHL successfully')
          } else {
            console.log('ℹ️ EMPLOYER EMAIL CHANGE: GHL service not configured, skipping sync')
          }
        } catch (ghlError) {
          console.error('❌ EMPLOYER EMAIL CHANGE: Failed to sync to GHL:', ghlError)
          // Don't fail the email change if GHL sync fails - it's non-critical
        }
      } catch (dbError: any) {
        console.error('Failed to update database email:', dbError)
        // Continue anyway - Clerk update was successful
      } finally {
        await prisma.$disconnect()
      }

      return NextResponse.json({
        success: true,
        message: 'Email address updated successfully',
        newEmail: newEmail,
        emailAddressId: newEmailAddress.id
      })

    } catch (clerkError: any) {
      console.error('Clerk backend email change error:', {
        userId: currentUser.clerkUser.id,
        error: clerkError,
        timestamp: new Date().toISOString()
      })

      // Handle specific Clerk errors
      if (clerkError?.message?.includes('email already exists')) {
        return NextResponse.json({
          error: 'This email address is already in use by another account'
        }, { status: 400 })
      }

      if (clerkError?.message?.includes('rate limit')) {
        return NextResponse.json({
          error: 'Too many email change attempts. Please wait before trying again.'
        }, { status: 429 })
      }

      return NextResponse.json({
        error: 'Failed to change email address. Please try again.'
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Email change endpoint error:', {
      error: error?.message || String(error),
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}