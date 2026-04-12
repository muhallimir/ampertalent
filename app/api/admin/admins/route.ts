import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET() {
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

        // Get all admin users
        const admins = await db.userProfile.findMany({
            where: {
                role: {
                    in: ['admin', 'super_admin']
                }
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
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json({ admins })
    } catch (error) {
        console.error('Error fetching admins:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
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

        const { email, firstName, lastName } = await request.json()

        // Validate required fields
        if (!email || !firstName || !lastName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Check if email already exists
        const existingUser = await db.userProfile.findFirst({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 400 }
            )
        }

        // Create new admin user (without password for now - using Clerk)
        const newAdmin = await db.userProfile.create({
            data: {
                clerkUserId: `admin_${Date.now()}`, // Temporary clerk ID for admin users
                email,
                firstName,
                lastName,
                role: 'admin',
                isActive: true,
                emailVerified: true
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
            admin: newAdmin,
            message: 'Admin created successfully'
        })
    } catch (error) {
        console.error('Error creating admin:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}