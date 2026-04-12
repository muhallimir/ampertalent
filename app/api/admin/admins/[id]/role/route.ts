import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
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

        const { action } = await request.json()

        // Validate action
        if (!action || !['promote', 'demote'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Must be "promote" or "demote"' },
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

        // Prevent modifying the current super admin's own role
        if (existingAdmin.clerkUserId === userId) {
            return NextResponse.json(
                { error: 'Cannot modify your own role' },
                { status: 403 }
            )
        }

        let newRole: string
        let message: string

        if (action === 'promote') {
            // Can only promote normal admins to super admin
            if (existingAdmin.role !== 'admin') {
                return NextResponse.json(
                    { error: 'Can only promote normal admins to super admin' },
                    { status: 400 }
                )
            }
            newRole = 'super_admin'
            message = 'Admin promoted to super admin successfully'
        } else {
            // Can only demote super admins to normal admin
            if (existingAdmin.role !== 'super_admin') {
                return NextResponse.json(
                    { error: 'Can only demote super admins to normal admin' },
                    { status: 400 }
                )
            }
            newRole = 'admin'
            message = 'Super admin demoted to normal admin successfully'
        }

        // Update admin role
        const updatedAdmin = await db.userProfile.update({
            where: { id },
            data: { role: newRole },
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

        // Create in-app notification for the affected admin
        try {
            const notificationType = action === 'promote' ? 'admin_role_promoted' : 'admin_role_demoted'
            const notificationTitle = action === 'promote' ? 'Role Promotion' : 'Role Change'
            const notificationMessage = action === 'promote'
                ? 'Congratulations! You have been promoted to Super Administrator. You now have access to advanced administrative features and can manage other administrators.'
                : 'Your administrator role has been updated. You are now a standard administrator with regular administrative privileges.'

            await db.notification.create({
                data: {
                    userId: existingAdmin.id,
                    type: notificationType,
                    title: notificationTitle,
                    message: notificationMessage,
                    priority: 'high',
                    data: {
                        previousRole: existingAdmin.role,
                        newRole: newRole,
                        changedBy: userId,
                        changeType: action
                    }
                }
            })
        } catch (notificationError) {
            console.error('Error creating notification:', notificationError)
            // Don't fail the entire operation if notification creation fails
            // The role change was successful, so we should still return success
        }

        return NextResponse.json({
            admin: updatedAdmin,
            message
        })
    } catch (error) {
        console.error('Error updating admin role:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}