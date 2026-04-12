import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { planPrice, planDisplayName } from '@/lib/subscription-plans';

const EXTERNAL_PLAN_LABELS: Record<string, string> = {
  rush_critique: 'Rush Critique',
  standard_critique: 'Standard Critique',
}

function normalizePlanLabel(planId: string) {
  return planId.split(/[-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    const seeker = await db.jobSeeker.findUnique({
      where: { userId: id },
      select: {
        userId: true,
        headline: true,
        aboutMe: true,
        availability: true,
        skills: true,
        resumeUrl: true,
        resumeLastUploaded: true,
        salaryExpectations: true,
        membershipPlan: true,
        membershipExpiresAt: true,
        resumeLimit: true,
        resumesUsed: true,
        resumeCredits: true,
        isOnTrial: true,
        isSuspended: true,
        cancelledSeeker: true,
        cancelledAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            profilePictureUrl: true,
            legacyId: true,
            clerkUserId: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            plan: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            createdAt: true,
            legacyId: true,
          },
        },
        paymentMethods: {
          select: {
            id: true,
            type: true,
            last4: true,
            brand: true,
            expiryMonth: true,
            expiryYear: true,
            isDefault: true,
            authnetPaymentProfileId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        resumes: {
          select: {
            id: true,
            filename: true,
            uploadedAt: true,
          },
          orderBy: { uploadedAt: 'desc' },
        },
        _count: {
          select: { applications: true },
        },
        applications: {
          where: { status: 'hired' },
          select: { appliedAt: true },
        },
      },
    });

    if (!seeker) {
      return NextResponse.json({ error: 'Seeker not found' }, { status: 404 });
    }

    // Fetch pending signup (abandoned cart) if seeker has no active plan
    const pendingSignup = seeker.membershipPlan === 'none' && !seeker.cancelledSeeker && seeker.user.clerkUserId
      ? await db.pendingSignup.findFirst({
          where: { clerkUserId: seeker.user.clerkUserId },
          select: { createdAt: true, selectedPlan: true },
          orderBy: { createdAt: 'desc' },
        })
      : null

    // Fetch payment transactions (same logic as /api/seeker/transactions)
    const [externalPayments, subscriptionsForTx] = await Promise.all([
      db.externalPayment.findMany({
        where: { userId: seeker.user.id },
        orderBy: { createdAt: 'desc' },
      }),
      db.subscription.findMany({
        where: { seekerId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const externalTransactions = externalPayments.map((payment: any) => ({
      id: payment.id,
      amount: Number(payment.amount),
      currency: 'USD',
      status: payment.status === 'completed' ? 'succeeded' : payment.status,
      description: EXTERNAL_PLAN_LABELS[payment.planId] || planDisplayName(payment.planId) || normalizePlanLabel(payment.planId),
      date: payment.createdAt.toISOString(),
      paymentMethod: { type: 'card' },
      ghlTransactionId: payment.ghlTransactionId,
      source: 'external_payment',
    }))

    const subscriptionTransactions = subscriptionsForTx
      .filter((sub: any) => {
        if (sub.externalPaymentId) return false
        if (externalPayments.some((ep: any) => ep.ghlTransactionId === sub.ghlTransactionId)) return false
        return true
      })
      .map((sub: any) => ({
        id: sub.id,
        amount: planPrice(sub.plan),
        currency: 'USD',
        status: sub.status === 'active' ? 'succeeded' : sub.status,
        description: planDisplayName(sub.plan) || normalizePlanLabel(sub.plan),
        date: (sub.updatedAt || sub.createdAt).toISOString(),
        paymentMethod: { type: 'card' },
        source: 'subscription',
      }))

    const transactions = [...externalTransactions, ...subscriptionTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const hireCount = seeker.applications.length;
    const lastResumeDate =
      seeker.resumes.length > 0 ? new Date(seeker.resumes[0].uploadedAt) : null;
    const profileUpdateDate = new Date(seeker.updatedAt);
    const lastActiveDate = [lastResumeDate, profileUpdateDate]
      .filter((d): d is Date => d !== null)
      .reduce((latest, current) => (current > latest ? current : latest), new Date(0));

    return NextResponse.json({
      success: true,
      seeker: {
        ...seeker,
        user: {
          ...seeker.user,
          legacyId: seeker.user.legacyId ? String(seeker.user.legacyId) : null,
        },
        subscriptions: seeker.subscriptions.map((sub) => ({
          ...sub,
          legacyId: sub.legacyId ? String(sub.legacyId) : null,
        })),
        hireCount,
        lastActiveDate:
          lastActiveDate.getTime() === 0 ? null : lastActiveDate.toISOString(),
        applications: undefined,
        transactions,
        pendingSignup,
      },
    });
  } catch (error) {
    console.error('Error fetching seeker detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seeker detail' },
      { status: 500 }
    );
  }
}