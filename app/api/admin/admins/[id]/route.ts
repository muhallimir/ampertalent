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

        const { firstName, lastName, email } = await request.json()

        // Validate required fields
        if (!firstName || !lastName || !email) {
            return NextResponse.json(
                { error: 'Missing required fields' },
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

        // Prevent updating super admin role or other super admins
        if (existingAdmin.role === 'super_admin') {
            return NextResponse.json(
                { error: 'Cannot modify super admin accounts' },
                { status: 403 }
            )
        }

        // Check if email is already taken by another user
        const emailCheck = await db.userProfile.findFirst({
            where: {
                email,
                id: { not: id }
            }
        })

        if (emailCheck) {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 400 }
            )
        }

        // Update admin
        const updatedAdmin = await db.userProfile.update({
            where: { id },
            data: {
                firstName,
                lastName,
                email
            },
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

        return NextResponse.json({
            admin: updatedAdmin,
            message: 'Admin updated successfully'
        })
    } catch (error) {
        console.error('Error updating admin:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
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

        const { id } = await params

        // Check if admin exists
        const existingAdmin = await db.userProfile.findUnique({
            where: { id }
        })

        if (!existingAdmin) {
            return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
        }

        // Prevent deleting super admin accounts
        if (existingAdmin.role === 'super_admin') {
            return NextResponse.json(
                { error: 'Cannot delete super admin accounts' },
                { status: 403 }
            )
        }

        // Delete admin
        await db.userProfile.delete({
            where: { id }
        })

        return NextResponse.json({
            message: 'Admin deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting admin:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}