import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { notificationService } from '@/lib/notification-service';
import { inAppNotificationService } from '@/lib/in-app-notification-service';
import { serviceRequestAuditService } from '@/lib/service-request-audit-service';

/**
 * GET /api/admin/services/[id]
 *
 * Get detailed information about a specific service request
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params for Next.js 16
    const { id } = await params;

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

    // 3. FETCH SERVICE REQUEST
    const serviceRequest = await db.additionalServicePurchase.findUnique({
      where: { id },
      include: {
        service: true,
        user_profiles_additional_service_purchases_user_idTouser_profiles: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        seeker: {
          select: {
            userId: true,
            resumeUrl: true,
            skills: true,
            professionalSummary: true,
          },
        },
        employer: {
          select: {
            userId: true,
            companyName: true,
            companyWebsite: true,
          },
        },
        employerPackage: {
          select: {
            id: true,
            packageType: true,
            purchasedAt: true,
            expiresAt: true,
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
            createdAt: true,
          },
        },
      },
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    // 4. FORMAT RESPONSE
    const formattedRequest = {
      id: serviceRequest.id,
      serviceId: serviceRequest.serviceId,
      service: {
        serviceId: serviceRequest.service.serviceId,
        name: serviceRequest.service.name,
        description: serviceRequest.service.description,
        price: Number(serviceRequest.service.price),
        category: serviceRequest.service.category,
        userType: serviceRequest.service.userType,
        features: serviceRequest.service.features,
      },
      user: {
        id: serviceRequest.user_profiles_additional_service_purchases_user_idTouser_profiles.id,
        name: serviceRequest.user_profiles_additional_service_purchases_user_idTouser_profiles.name,
        email: serviceRequest.user_profiles_additional_service_purchases_user_idTouser_profiles.email,
        firstName:
          serviceRequest.user_profiles_additional_service_purchases_user_idTouser_profiles.firstName,
        lastName: serviceRequest.user_profiles_additional_service_purchases_user_idTouser_profiles.lastName,
        phone: serviceRequest.user_profiles_additional_service_purchases_user_idTouser_profiles.phone,
      },
      seekerDetails: serviceRequest.seeker
        ? {
          resumeUrl: serviceRequest.seeker.resumeUrl,
          skills: serviceRequest.seeker.skills,
          professionalSummary: serviceRequest.seeker.professionalSummary,
        }
        : null,
      employerDetails: serviceRequest.employer
        ? {
          companyName: serviceRequest.employer.companyName,
          companyWebsite: serviceRequest.employer.companyWebsite,
        }
        : null,
      packageContext: serviceRequest.employerPackage
        ? {
          id: serviceRequest.employerPackage.id,
          packageType: serviceRequest.employerPackage.packageType,
          purchasedAt: serviceRequest.employerPackage.purchasedAt.toISOString(),
          expiresAt: serviceRequest.employerPackage.expiresAt?.toISOString() || null,
        }
        : null,
      amountPaid: Number(serviceRequest.amountPaid),
      status: serviceRequest.status,
      assignedAdmin: serviceRequest.user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles
        ? {
          id: serviceRequest.user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles.id,
          name: serviceRequest.user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles
            .name,
          email:
            serviceRequest.user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles.email,
        }
        : null,
      fulfillmentNotes: serviceRequest.fulfillmentNotes,
      completedAt: serviceRequest.completedAt?.toISOString() || null,
      createdAt: serviceRequest.createdAt.toISOString(),
      updatedAt: serviceRequest.updatedAt.toISOString(),
      payment: serviceRequest.externalPayment
        ? {
          id: serviceRequest.externalPayment.id,
          transactionId: serviceRequest.externalPayment.authnetTransactionId,
          amount: Number(serviceRequest.externalPayment.amount),
          status: serviceRequest.externalPayment.status,
          createdAt: serviceRequest.externalPayment.createdAt.toISOString(),
        }
        : null,
    };

    return NextResponse.json({
      success: true,
      request: formattedRequest,
    });
  } catch (error) {
    console.error('Error fetching service request:', error);
    return NextResponse.json({ error: 'Failed to fetch service request' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/services/[id]
 *
 * Update a service request (status, assignment, notes)
 *
 * Body:
 * - status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
 * - assignedAdminId?: string | null
 * - fulfillmentNotes?: string
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params for Next.js 16
    const { id } = await params;

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

    // 3. PARSE REQUEST BODY
    const body = await request.json();
    const { status, assignedAdminId, fulfillmentNotes } = body;

    // 4. GET OLD DATA FOR AUDIT LOGGING
    let oldData: any = {};
    if (status !== undefined || assignedAdminId !== undefined || fulfillmentNotes !== undefined) {
      const currentRequest = await db.additionalServicePurchase.findUnique({
        where: { id },
        select: {
          status: true,
          fulfillmentNotes: true,
          assignedAdminId: true,
          employerPackageId: true,
          user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles: {
            select: { name: true }
          }
        },
      });
      oldData = currentRequest || {};
    }
    const oldStatus = oldData?.status;

    // 5. BUILD UPDATE OBJECT
    const updateData: any = {};

    if (status !== undefined) {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      updateData.status = status;

      // If marking as completed, set completedAt
      if (status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    if (assignedAdminId !== undefined) {
      // Verify admin exists if not null
      if (assignedAdminId !== null) {
        const assignedAdmin = await db.userProfile.findUnique({
          where: { id: assignedAdminId },
          select: { role: true },
        });

        if (!assignedAdmin || (assignedAdmin.role !== 'admin' && assignedAdmin.role !== 'super_admin')) {
          return NextResponse.json({ error: 'Invalid admin ID' }, { status: 400 });
        }
      }
      updateData.assignedAdminId = assignedAdminId;
    }

    if (fulfillmentNotes !== undefined) {
      updateData.fulfillmentNotes = fulfillmentNotes;
    }

    // 6. UPDATE SERVICE REQUEST
    const updatedRequest = await db.additionalServicePurchase.update({
      where: { id },
      data: updateData,
      include: {
        service: {
          select: {
            name: true,
            category: true,
          },
        },
        user_profiles_additional_service_purchases_user_idTouser_profiles: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
          },
        },
      },
    });

    // 7. LOG AUDIT TRAIL (only for employer add-ons)
    if (oldData?.employerPackageId) {
      // Log status change
      if (status !== undefined && oldStatus !== status) {
        await serviceRequestAuditService.logStatusChange(
          id,
          adminProfile.id,
          oldStatus || 'unknown',
          status,
          `Status changed from ${oldStatus} to ${status}`
        );
      }

      // Log fulfillment notes change
      if (fulfillmentNotes !== undefined && oldData?.fulfillmentNotes !== fulfillmentNotes) {
        await serviceRequestAuditService.logNotesChange(
          id,
          adminProfile.id,
          oldData?.fulfillmentNotes || null,
          fulfillmentNotes || null
        );
      }

      // Log admin assignment change
      if (assignedAdminId !== undefined && oldData?.assignedAdminId !== assignedAdminId) {
        const oldAdminName = oldData?.user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles?.name;
        await serviceRequestAuditService.logAssignmentChange(
          id,
          adminProfile.id,
          oldData?.assignedAdminId || null,
          assignedAdminId || null,
          oldAdminName,
          undefined // We'll need to fetch the new admin name if needed
        );
      }
    }

    // 8. SEND EMAIL NOTIFICATIONS
    if (status !== undefined && oldStatus !== status) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const servicesUrl = `${appUrl}/seeker/services?tab=history`;

        // Get user details for email
        const user = updatedRequest.user_profiles_additional_service_purchases_user_idTouser_profiles;
        const firstName = user?.firstName || user?.name?.split(' ')[0] || 'there';
        const userEmail = user?.email || '';

        if (status === 'completed') {
          // Send completion email
          await notificationService.sendServiceCompleted({
            firstName,
            serviceName: updatedRequest.service.name,
            completedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            notes: fulfillmentNotes || undefined,
            servicesUrl,
            email: userEmail,
            userId: updatedRequest.userId,
          });
          console.log('✅ Sent service completion email to:', userEmail);

          // Send in-app notification for completion
          await inAppNotificationService.notifyServiceCompleted(
            updatedRequest.userId,
            updatedRequest.service.name,
            updatedRequest.id
          );
        } else if (oldStatus && oldStatus !== status) {
          // Send status update email for other status changes
          await notificationService.sendServiceStatusUpdate({
            firstName,
            serviceName: updatedRequest.service.name,
            oldStatus,
            newStatus: status,
            notes: fulfillmentNotes || undefined,
            servicesUrl,
            email: userEmail,
            userId: updatedRequest.userId,
          });
          console.log('✅ Sent service status update email to:', userEmail);

          // Send in-app notification for status update
          await inAppNotificationService.notifyServiceStatusUpdate(
            updatedRequest.userId,
            updatedRequest.service.name,
            oldStatus,
            status,
            updatedRequest.id
          );
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the update if email fails
      }
    }

    // 9. RETURN SUCCESS
    return NextResponse.json({
      success: true,
      message: 'Service request updated successfully',
      request: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        assignedAdminId: updatedRequest.assignedAdminId,
        fulfillmentNotes: updatedRequest.fulfillmentNotes,
        completedAt: updatedRequest.completedAt?.toISOString() || null,
        updatedAt: updatedRequest.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error updating service request:', error);

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to update service request' }, { status: 500 });
  }
}
