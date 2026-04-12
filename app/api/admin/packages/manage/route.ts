import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, action, status } = await request.json()

    if (!id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: id, action' },
        { status: 400 }
      )
    }

    // Find the package
    const employerPackage = await db.employerPackage.findUnique({
      where: { id },
      include: {
        employer: {
          include: {
            user: true
          }
        }
      }
    })

    if (!employerPackage) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    let updatedPackage

    switch (action) {
      case 'extend':
        // Extend package expiry by 30 days
        const newExpiryDate = new Date()
        newExpiryDate.setDate(newExpiryDate.getDate() + 30)

        updatedPackage = await db.employerPackage.update({
          where: { id },
          data: {
            expiresAt: newExpiryDate,
            updatedAt: new Date()
          }
        })
        break

      case 'add_credits':
        // Add 1 additional listing
        updatedPackage = await db.employerPackage.update({
          where: { id },
          data: {
            listingsRemaining: employerPackage.listingsRemaining + 1,
            updatedAt: new Date()
          }
        })
        break

      case 'expire':
        // Expire the package immediately
        updatedPackage = await db.employerPackage.update({
          where: { id },
          data: {
            expiresAt: new Date(),
            listingsRemaining: 0,
            updatedAt: new Date()
          }
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Log the admin action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'package_management',
        targetEntity: 'employer_package',
        targetId: id,
        details: {
          action,
          packageType: employerPackage.packageType,
          previousListingsRemaining: employerPackage.listingsRemaining,
          newListingsRemaining: updatedPackage.listingsRemaining,
          previousExpiresAt: employerPackage.expiresAt?.toISOString(),
          newExpiresAt: updatedPackage.expiresAt?.toISOString(),
          employerId: employerPackage.employerId,
          timestamp: new Date().toISOString()
        }
      }
    })

    // Create notification for the employer
    let notificationMessage = ''
    switch (action) {
      case 'extend':
        notificationMessage = 'Your package has been extended by 30 days by an administrator.'
        break
      case 'add_credits':
        notificationMessage = 'Additional job posting credits have been added to your package by an administrator.'
        break
      case 'expire':
        notificationMessage = 'Your package has been expired by an administrator.'
        break
    }

    await db.notification.create({
      data: {
        userId: employerPackage.employer.user.id,
        type: 'system_alert',
        title: 'Package Updated',
        message: notificationMessage,
        priority: 'medium',
        data: {
          packageId: id,
          action,
          packageType: employerPackage.packageType
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Package ${action} completed successfully`,
      package: updatedPackage
    })
  } catch (error) {
    console.error('Error managing package:', error)
    return NextResponse.json(
      { error: 'Failed to manage package' },
      { status: 500 }
    )
  }
}