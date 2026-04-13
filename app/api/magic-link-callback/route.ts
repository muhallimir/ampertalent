import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { email, clerkUserId } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Clerk user ID is required' }, { status: 400 })
    }

    console.log('🔍 START: Checking admin status for user:', {
      email: email.toLowerCase(),
      clerkUserId
    })

    // First, directly check if there's an adminActionLog entry with this email
    console.log('🔍 Looking for adminActionLog entries with actionType user_invitation_sent')

    const adminLogEntry = await db.adminActionLog.findFirst({
      where: {
        targetId: email,
        details: {
          path: ['role'],
          equals: 'admin'
        }
      }
    })

    console.log('🔍 Direct query result:', {
      found: !!adminLogEntry,
      entryId: adminLogEntry?.id || null
    })

    let isAdmin = false

    if (adminLogEntry) {
      console.log('✅ Found admin invitation entry for this email:', {
        email: email.toLowerCase(),
        entryId: adminLogEntry.id,
        details: adminLogEntry.details
      })
      isAdmin = true
    }

    // Add logging for admin check
    console.log('🔍 Final admin check result:', {
      email: email.toLowerCase(),
      isAdmin
    })

    // If user is admin, create a userProfile for them
    if (isAdmin) {
      console.log('🚀 User is admin, creating/updating profile...')

      try {
        // Get user name from the admin action log
        let userName = email.split('@')[0] || 'Admin User'

        // Try to extract name from details
        try {
          const details = adminLogEntry?.details as {
            email: string;
            role: string;
            invitedUserName: string;
          }

          if (details?.invitedUserName) {
            userName = details.invitedUserName
            console.log('👤 Extracted user name from admin log:', userName)
          } else {
            console.log('⚠️ No invitedUserName in details, using email prefix:', userName)
          }
        } catch (parseError) {
          console.log('⚠️ Could not parse details for name, using email prefix:', userName)
        }

        // Check if user profile already exists
        console.log('🔍 Checking if user profile already exists for clerkUserId:', clerkUserId)
        const existingProfile = await db.userProfile.findUnique({
          where: { clerkUserId }
        })

        if (!existingProfile) {
          console.log('✨ Creating NEW admin user profile:', {
            clerkUserId,
            role: 'admin',
            name: userName,
            email: email.toLowerCase()
          })

          // THIS IS WHERE THE PROFILE SHOULD BE CREATED
          const userProfile = await db.userProfile.create({
            data: {
              clerkUserId: clerkUserId,
              role: 'admin',
              name: userName,
              email: email.toLowerCase(),
              timezone: 'America/Chicago'
            }
          })

          console.log('🎉 SUCCESS: Admin user profile CREATED:', {
            userProfileId: userProfile.id,
            clerkUserId: userProfile.clerkUserId,
            name: userProfile.name,
            role: userProfile.role,
            email: userProfile.email
          })
        } else {
          console.log('✅ User profile already exists:', {
            userProfileId: existingProfile.id,
            clerkUserId: existingProfile.clerkUserId,
            name: existingProfile.name,
            role: existingProfile.role,
            email: existingProfile.email
          })

          // Update the existing profile to ensure it has admin role if needed
          if (existingProfile.role !== 'admin') {
            console.log('🔄 Updating existing profile to admin role')
            const updatedProfile = await db.userProfile.update({
              where: { clerkUserId },
              data: {
                role: 'admin'
              }
            })

            console.log('✅ Profile updated to admin role:', updatedProfile.id)
          } else {
            console.log('✅ Profile already has admin role')
          }
        }
      } catch (profileError) {
        console.error('💥 ERROR creating/updating admin user profile:', profileError)
        // Don't fail the entire request if profile creation fails, just log the error
      }
    } else {
      console.log('👤 User is not an admin, no profile creation needed')
    }

    console.log('🏁 Returning admin status result:', { isAdmin })
    return NextResponse.json({ isAdmin })
  } catch (error) {
    console.error('💥 ERROR checking admin status:', error)
    return NextResponse.json({ error: 'Failed to check admin status' }, { status: 500 })
  }
}