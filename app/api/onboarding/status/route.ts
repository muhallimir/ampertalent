import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            console.log('No user found in getCurrentUser()')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = currentUser.clerkUser

        // Check if this is a middleware request for faster processing
        const isMiddlewareRequest = request.headers.get('X-Middleware-Request') === 'true'

        if (isMiddlewareRequest) {
            console.log('🔄 Fast middleware onboarding check for user:', user.id)
        } else {
            console.log('🔍 ONBOARDING STATUS: Checking for user:', user.id)
        }

        // Log Clerk metadata for debugging
        console.log('📊 CLERK METADATA:', {
            userId: user.id,
            publicMetadata: user.publicMetadata,
            hasOnboardingCompleted: user.publicMetadata?.onboardingCompleted,
            metadataRole: user.publicMetadata?.role,
            hasExistingProfile: !!currentUser.profile
        })

        // Check if user profile exists in database
        let userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: user.id },
            include: {
                employer: true
            }
        })

        // Check for pending team invitations for this user BEFORE creating profile
        let hasPendingTeamInvitation = false
        let pendingTeamMemberRecords: any[] = []
        const userEmail = user.emailAddresses[0]?.emailAddress
        if (userEmail && !userProfile) {
            try {
                pendingTeamMemberRecords = await db.teamMember.findMany({
                    where: {
                        email: userEmail.toLowerCase(),
                        status: 'pending',
                        userId: null
                    }
                })

                hasPendingTeamInvitation = pendingTeamMemberRecords.length > 0
                console.log('👥 ONBOARDING STATUS: Pending team invitations found:', pendingTeamMemberRecords.length)
            } catch (teamError) {
                console.error('⚠️ ONBOARDING STATUS: Error checking team invitations:', teamError)
            }
        }

        // If user has pending team invitations but no profile, create team_member profile
        if (hasPendingTeamInvitation && !userProfile) {
            console.log('👥 ONBOARDING STATUS: User has pending team invitation but no profile - creating team_member profile')
            try {
                const name = user.publicMetadata?.name as string || `${user.firstName || ''} ${user.lastName || ''}`.trim() || userEmail?.split("@")[0] || "Team Member"
                const nameParts = name.split(" ")

                const createdProfile = await db.userProfile.create({
                    data: {
                        clerkUserId: user.id,
                        role: "team_member",
                        name: name,
                        firstName: nameParts[0] || "",
                        lastName: nameParts.slice(1).join(" ") || "",
                        email: userEmail || null,
                        timezone: "America/Chicago"
                    }
                })

                // Refetch with employer included
                userProfile = await db.userProfile.findUnique({
                    where: { id: createdProfile.id },
                    include: { employer: true }
                })

                if (userProfile) {
                    console.log("✅ ONBOARDING STATUS: Created team_member profile:", userProfile.id)

                    // Update all pending TeamMember records to connect to this user profile
                    for (const teamMemberRecord of pendingTeamMemberRecords) {
                        try {
                            await db.teamMember.update({
                                where: { id: teamMemberRecord.id },
                                data: {
                                    userId: userProfile.id,
                                    name: userProfile.name,
                                    // Note: We keep status as 'pending' here - it will be updated to 'active'
                                    // when the user actually accepts the invitation on the team-invite page
                                }
                            })
                            console.log("✅ ONBOARDING STATUS: Updated team member record:", teamMemberRecord.id)
                        } catch (updateError) {
                            console.error("⚠️ ONBOARDING STATUS: Error updating team member record:", updateError)
                        }
                    }
                }
            } catch (createError) {
                console.error('❌ ONBOARDING STATUS: Error creating team_member profile:', createError)
            }
        }

        // If no profile exists, user hasn't completed onboarding
        if (!userProfile) {
            if (isMiddlewareRequest) {
                console.log('🔄 MIDDLEWARE: No profile found - user needs onboarding')
            } else {
                console.log('📝 ONBOARDING STATUS: No profile found - user needs onboarding')
            }
            return NextResponse.json({
                completed: false,
                role: null
            })
        }

        // User has completed onboarding
        if (isMiddlewareRequest) {
            console.log('🔄 MIDDLEWARE: Profile found - onboarding completed', {
                role: userProfile.role,
                profileId: userProfile.id
            })
        } else {
            console.log('✅ ONBOARDING STATUS: Profile found - onboarding completed', {
                role: userProfile.role,
                profileId: userProfile.id
            })
        }

        return NextResponse.json({
            completed: true,
            role: userProfile.role
        })
    } catch (error) {
        console.error('❌ ONBOARDING STATUS: Error:', error)
        return NextResponse.json(
            { error: 'Failed to check status' },
            { status: 500 }
        )
    }
}
