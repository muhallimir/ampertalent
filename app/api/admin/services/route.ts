import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

/**
 * GET /api/admin/services
 *
 * List all service purchase requests with optional filtering
 *
 * Query params:
 * - status: filter by status (pending, in_progress, completed, cancelled)
 * - userType: filter by user type (seeker, employer)
 * - assignedAdminId: filter by assigned admin
 */
export async function GET(request: NextRequest) {
  try {
    // 1. AUTHENTICATION: Verify admin access
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. GET ADMIN PROFILE
    const adminProfile = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, role: true },
    });

    if (!adminProfile || (adminProfile.role !== 'admin' && adminProfile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // 3. PARSE QUERY PARAMETERS
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userType = searchParams.get('userType');
    const assignedAdminId = searchParams.get('assignedAdminId');

    // 4. BUILD FILTER OBJECT
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (assignedAdminId) {
      where.assignedAdminId = assignedAdminId;
    }

    // For userType filtering, we need to check if seekerId or employerId is set
    if (userType === 'seeker') {
      where.seekerId = { not: null };
    } else if (userType === 'employer') {
      where.employerId = { not: null };
    }

    // 5. FETCH SERVICE REQUESTS
    const serviceRequests = await db.additionalServicePurchase.findMany({
      where,
      include: {
        service: {
          select: {
            serviceId: true,
            name: true,
            category: true,
            userType: true,
          },
        },
        user_profiles_additional_service_purchases_user_idTouser_profiles: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        externalPayment: {
          select: {
            id: true,
            authnetTransactionId: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 6. FORMAT RESPONSE
    const formattedRequests = serviceRequests.map((request) => ({
      id: request.id,
      serviceId: request.serviceId,
      serviceName: request.service.name,
      serviceCategory: request.service.category,
      userType: request.service.userType,
      userId: request.userId,
      userName: request.user_profiles_additional_service_purchases_user_idTouser_profiles.name,
      userEmail: request.user_profiles_additional_service_purchases_user_idTouser_profiles.email,
      amountPaid: Number(request.amountPaid),
      status: request.status,
      assignedAdminId: request.assignedAdminId,
      assignedAdminName: request.user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles?.name || null,
      fulfillmentNotes: request.fulfillmentNotes,
      completedAt: request.completedAt?.toISOString() || null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      payment: request.externalPayment
        ? {
            id: request.externalPayment.id,
            transactionId: request.externalPayment.authnetTransactionId,
            amount: Number(request.externalPayment.amount),
            status: request.externalPayment.status,
          }
        : null,
    }));

    // 7. RETURN RESULTS
    return NextResponse.json({
      success: true,
      requests: formattedRequests,
      total: formattedRequests.length,
      filters: {
        status: status || 'all',
        userType: userType || 'all',
        assignedAdminId: assignedAdminId || 'all',
      },
    });
  } catch (error) {
    console.error('Error fetching service requests:', error);
    return NextResponse.json({ error: 'Failed to fetch service requests' }, { status: 500 });
  }
}
