import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

interface RouteParams {
    params: Promise<{
        id: string
    }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        // Await params for Next.js 16
        const { id } = await params

        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is super admin
        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: userId },
            select: { role: true }
        })

        if (!userProfile || userProfile.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { isActive } = await request.json()

        // Validate isActive field
        if (typeof isActive !== 'boolean') {
            return NextResponse.json(
                { error: 'isActive must be a boolean' },
                { status: 400 }
            )
        }

        // Check if admin exists
        const existingAdmin = await db.userProfile.findUnique({
            where: { id }
        })

        if (!existingAdmin) {
            return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
        }

        // Prevent deactivating super admin accounts
        if (existingAdmin.role === 'super_admin' && !isActive) {
            return NextResponse.json(
                { error: 'Cannot deactivate super admin accounts' },
                { status: 403 }
            )
        }

        // Update admin status
        const updatedAdmin = await db.userProfile.update({
            where: { id },
            data: { isActive },
            select: {
                id: true,
                clerkUserId: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                profilePictureUrl: true
            }
        })

        // If deactivating the admin, suspend their Clerk account and revoke sessions to log them out immediately
        if (!isActive && existingAdmin.clerkUserId) {
            try {
                // First revoke all sessions to log them out immediately
                await clerkClient.users.revokeAllSessions(existingAdmin.clerkUserId);
                // Then suspend the account to prevent re-login
                await clerkClient.users.updateUser(existingAdmin.clerkUserId, {
                    suspended: true
                });
                console.log(`✅ Suspended Clerk account and revoked sessions for deactivated admin: ${existingAdmin.email}`);
            } catch (suspendError) {
                console.error('❌ Error suspending Clerk account:', suspendError);
                // Don't fail the deactivation if suspension fails
                // The account is still deactivated in the database
            }
        }

        // If reactivating the admin, unsuspend their Clerk account
        if (isActive && existingAdmin.clerkUserId) {
            try {
                await clerkClient.users.updateUser(existingAdmin.clerkUserId, {
                    suspended: false
                });
                console.log(`✅ Unsuspended Clerk account for reactivated admin: ${existingAdmin.email}`);
            } catch (unsuspendError) {
                console.error('❌ Error unsuspending Clerk account:', unsuspendError);
                // Don't fail the reactivation if unsuspension fails
            }
        }

        return NextResponse.json({
            admin: updatedAdmin,
            message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`
        })
    } catch (error) {
        console.error('Error updating admin status:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}