import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  planResumeLimit,
  planResumeCredits,
  calcPeriodEnd,
} from '@/lib/subscription-plans'
import { S3Service } from '@/lib/s3'
import { presignedUrlCache } from '@/lib/presigned-url-cache'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ampertalent-files'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const membershipPlan = searchParams.get('membershipPlan')
    const excludeNoPlan = searchParams.get('excludeNoPlan') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (status === 'active') {
      where.isSuspended = false
    } else if (status === 'suspended') {
      where.isSuspended = true
    } else if (status === 'canceling') {
      where.isSuspended = false
      where.subscriptions = {
        some: {
          status: 'active',
          cancelAtPeriodEnd: true,
        },
      }
    }

    if (membershipPlan && membershipPlan !== 'all') {
      where.membershipPlan = membershipPlan
    } else if (excludeNoPlan) {
      where.membershipPlan = { not: 'none' }
    }

    // Run count and data fetch in parallel
    const [totalCount, seekers] = await Promise.all([
      db.jobSeeker.count({ where }),
      db.jobSeeker.findMany({
        where,
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
          // Only fetch the most recent subscription for the badge shown in the list
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              plan: true,
              status: true,
              currentPeriodEnd: true,
              cancelAtPeriodEnd: true,
              createdAt: true,
              legacyId: true,
            },
          },
          resumes: {
            select: {
              id: true,
              filename: true,
              uploadedAt: true,
            },
            orderBy: { uploadedAt: 'desc' },
            // Only need the most recent resume date for lastActiveDate
            take: 1,
          },
          // Use DB aggregations instead of loading all rows into JS
          _count: {
            select: {
              applications: true,
            },
          },
          // Only fetch hired applications for hireCount, and limit for lastActiveDate
          applications: {
            where: { status: 'hired' },
            select: { appliedAt: true },
            orderBy: { appliedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ])

    // Also get the most recent non-hired application date per seeker for lastActiveDate
    // We do this in one batched query instead of per-seeker
    const seekerUserIds = seekers.map((s) => s.userId)
    const latestApplications = await db.application.findMany({
      where: { seekerId: { in: seekerUserIds } },
      select: { seekerId: true, appliedAt: true },
      orderBy: { appliedAt: 'desc' },
      distinct: ['seekerId'],
    })
    const latestAppBySeeker = new Map(
      latestApplications.map((a) => [a.seekerId, a.appliedAt])
    )

    // Fetch pending signups for no-plan seekers (abandoned carts)
    const abandonedCartClerkIds = seekers
      .filter(s => s.membershipPlan === 'none' && !s.cancelledSeeker && s.user.clerkUserId)
      .map(s => s.user.clerkUserId as string)

    const pendingSignups = abandonedCartClerkIds.length > 0
      ? await db.pendingSignup.findMany({
        where: { clerkUserId: { in: abandonedCartClerkIds } },
        select: { clerkUserId: true, createdAt: true, selectedPlan: true },
        orderBy: { createdAt: 'desc' },
        distinct: ['clerkUserId'],
      })
      : []

    const pendingSignupByClerkId = new Map(
      pendingSignups.map(p => [p.clerkUserId, p])
    )

    // Batch-resolve presigned URLs for S3 profile pictures to avoid N+1 fetches on the client
    const s3Pictures: { userId: string; fileKey: string }[] = []
    for (const seeker of seekers) {
      const picUrl = seeker.user.profilePictureUrl
      if (!picUrl || picUrl.includes('gravatar.com')) continue
      try {
        const url = new URL(picUrl)
        const pathParts = url.pathname.split('/').filter(Boolean)
        const fileKey = pathParts.slice(-3).join('/')
        if (fileKey.includes(seeker.userId)) {
          s3Pictures.push({ userId: seeker.userId, fileKey })
        }
      } catch {
        // skip malformed URLs
      }
    }

    const resolvedProfilePictures: Record<string, string> = {}
    const uncached = s3Pictures.filter((item) => {
      const cached = presignedUrlCache.get(item.fileKey)
      if (cached) {
        resolvedProfilePictures[item.userId] = cached
        return false
      }
      return true
    })

    if (uncached.length > 0) {
      const batchUrls = await S3Service.generateBatchPresignedDownloadUrls(
        BUCKET_NAME,
        uncached.map((i) => i.fileKey),
        24 * 60 * 60
      )
      for (const item of uncached) {
        const url = batchUrls[item.fileKey]
        if (url) {
          resolvedProfilePictures[item.userId] = url
          presignedUrlCache.set(item.fileKey, url, 23 * 60 * 60)
        }
      }
    }

    const planMap: Record<string, number> = {
      trial_monthly: 1,
      gold_bimonthly: 3,
      vip_quarterly: 999,
      annual_platinum: 999,
    }

    const seekersWithCredits = seekers.map((seeker) => {
      const hasActivePlan =
        seeker.membershipPlan && seeker.membershipPlan !== 'none'
      const resumeLimit = hasActivePlan
        ? planMap[seeker.membershipPlan] ?? 0
        : 0

      const hireCount = seeker.applications.length

      const lastAppDate = latestAppBySeeker.get(seeker.userId) ?? null
      const lastResumeDate =
        seeker.resumes.length > 0 ? new Date(seeker.resumes[0].uploadedAt) : null
      const profileUpdateDate = new Date(seeker.updatedAt)

      const lastActiveDate = [lastAppDate, lastResumeDate, profileUpdateDate]
        .filter((d): d is Date => d !== null)
        .reduce(
          (latest, current) => (current > latest ? current : latest),
          new Date(0)
        )

      return {
        ...seeker,
        user: {
          ...seeker.user,
          legacyId: seeker.user.legacyId ? String(seeker.user.legacyId) : null,
          resolvedProfilePictureUrl: resolvedProfilePictures[seeker.userId] ?? seeker.user.profilePictureUrl,
        },
        subscriptions: seeker.subscriptions.map((sub) => ({
          ...sub,
          legacyId: sub.legacyId ? String(sub.legacyId) : null,
        })),
        resumeLimit,
        resumesUsed: seeker.resumes.length,
        hireCount,
        lastActiveDate:
          lastActiveDate.getTime() === 0
            ? null
            : lastActiveDate.toISOString(),
        // Strip raw applications from response
        applications: undefined,
        // paymentMethods are NOT loaded here — fetch them lazily in the detail dialog
        paymentMethods: [],
        pendingSignup: seeker.user.clerkUserId
          ? (pendingSignupByClerkId.get(seeker.user.clerkUserId) ?? null)
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      seekers: seekersWithCredits,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching seekers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch seekers' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an admin or super admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { seekerId, action } = body

    if (!seekerId || !action) {
      return NextResponse.json(
        { error: 'Seeker ID and action are required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'suspend':
        const { isSuspended } = body

        if (typeof isSuspended !== 'boolean') {
          return NextResponse.json(
            { error: 'isSuspended must be a boolean' },
            { status: 400 }
          )
        }

        // Update seeker suspension status
        const updatedSeeker = await db.jobSeeker.update({
          where: { userId: seekerId },
          data: {
            isSuspended,
            updatedAt: new Date()
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          }
        })

        // Log the admin action
        await db.adminActionLog.create({
          data: {
            adminId: currentUser.profile.id,
            actionType: isSuspended ? 'seeker_suspended' : 'seeker_reactivated',
            targetEntity: 'job_seeker',
            targetId: seekerId,
            details: {
              seekerName: updatedSeeker.user.name,
              userEmail: updatedSeeker.user.email,
              previousStatus: !isSuspended,
              newStatus: isSuspended
            }
          }
        })

        return NextResponse.json({
          success: true,
          seeker: updatedSeeker
        })

      case 'updateMembership':
        const { membershipData, notes } = body

        if (!membershipData || !membershipData.membershipPlan) {
          return NextResponse.json(
            { error: 'Membership data with membershipPlan is required' },
            { status: 400 }
          )
        }

        // Validate membershipPlan against enum
        const validMembershipPlans = [
          'none', 'trial_monthly', 'gold_bimonthly', 'vip_quarterly', 'annual_platinum'
        ]

        if (!validMembershipPlans.includes(membershipData.membershipPlan)) {
          return NextResponse.json(
            { error: 'Invalid membership plan' },
            { status: 400 }
          )
        }

        // Set resume limit based on membership plan
        const getResumeLimit = (plan: string) => planResumeLimit(plan)

        // Calculate resume credits based on plan
        const planResumeCreditsCount = planResumeCredits(membershipData.membershipPlan)

        // Update seeker membership
        const updatedMembershipSeeker = await db.jobSeeker.update({
          where: { userId: seekerId },
          data: {
            membershipPlan: membershipData.membershipPlan,
            membershipExpiresAt: membershipData.membershipExpiresAt ? new Date(membershipData.membershipExpiresAt) : null,
            resumeLimit: getResumeLimit(membershipData.membershipPlan),
            resumeCredits: planResumeCreditsCount,
            updatedAt: new Date()
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        })

        // Create or update subscription entry if plan is not 'none'
        if (membershipData.membershipPlan !== 'none') {
          const existingSubscription = await db.subscription.findFirst({
            where: {
              seekerId: seekerId,
              plan: membershipData.membershipPlan,
              status: 'active'
            }
          });

          const currentPeriodEnd = calcPeriodEnd(membershipData.membershipPlan)

          if (existingSubscription) {
            // Update existing subscription
            await db.subscription.update({
              where: { id: existingSubscription.id },
              data: {
                currentPeriodEnd: currentPeriodEnd,
                updatedAt: new Date(),
                status: 'active'
              }
            });
          } else {
            // Create new subscription
            await db.subscription.create({
              data: {
                seekerId: seekerId,
                plan: membershipData.membershipPlan,
                status: 'active',
                currentPeriodEnd: currentPeriodEnd,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
          }
        }

        // Log the admin action
        await db.adminActionLog.create({
          data: {
            adminId: currentUser.profile.id,
            actionType: 'membership_updated',
            targetEntity: 'job_seeker',
            targetId: seekerId,
            details: {
              seekerName: updatedMembershipSeeker.user.name,
              userEmail: updatedMembershipSeeker.user.email,
              membershipPlan: membershipData.membershipPlan,
              resumeLimit: getResumeLimit(membershipData.membershipPlan),
              membershipExpiresAt: membershipData.membershipExpiresAt,
              notes: notes || null
            }
          }
        })

        return NextResponse.json({
          success: true,
          seeker: updatedMembershipSeeker
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error updating seeker:', error)
    return NextResponse.json(
      { error: 'Failed to update seeker' },
      { status: 500 }
    )
  }
}