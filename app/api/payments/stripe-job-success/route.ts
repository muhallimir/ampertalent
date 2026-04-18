import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any
})

const PACKAGE_LISTINGS: Record<string, number> = {
    standard: 1, featured: 1, email_blast: 1, gold_plus: 1,
    concierge_lite: 1, concierge_level_1: 1, concierge_level_2: 1, concierge_level_3: 1,
}

const JOB_TYPE_MAPPING: Record<string, string> = {
    'FULL_TIME': 'FULL_TIME', 'PART_TIME': 'PART_TIME',
    'PERMANENT': 'PERMANENT', 'TEMPORARY': 'TEMPORARY',
    'full-time': 'FULL_TIME', 'part-time': 'PART_TIME',
    'contract': 'TEMPORARY', 'freelance': 'TEMPORARY',
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('session_id')
        const pendingJobPostId = searchParams.get('pendingJobPostId')

        console.log('🔄 STRIPE-JOB-SUCCESS: Received request:', { sessionId, pendingJobPostId })

        if (!sessionId || !pendingJobPostId) {
            console.error('Missing required parameters')
            return NextResponse.redirect(new URL('/employer/jobs/new?error=invalid_return', request.url))
        }

        // Verify the Stripe session
        const session = await stripe.checkout.sessions.retrieve(sessionId)
        if (!session || session.payment_status !== 'paid') {
            console.error('Invalid or unpaid Stripe session')
            return NextResponse.redirect(new URL('/employer/jobs/new?error=payment_failed', request.url))
        }

        // Get the pending job post
        const pendingJobPost = await db.pendingJobPost.findUnique({
            where: { id: pendingJobPostId }
        })

        if (!pendingJobPost || !pendingJobPost.clerkUserId) {
            console.error('Pending job post not found')
            return NextResponse.redirect(new URL('/employer/jobs/new?error=session_expired', request.url))
        }

        // Check if already processed (idempotent)
        if (pendingJobPost.checkoutSessionId === sessionId) {
            console.log('Already processed, redirecting to jobs page')
            return NextResponse.redirect(new URL('/employer/jobs?checkout=success', request.url))
        }

        // Get employer profile
        const employer = await db.employer.findFirst({
            where: { user: { clerkUserId: pendingJobPost.clerkUserId } }
        })

        if (!employer) {
            console.error('Employer not found for clerkUserId:', pendingJobPost.clerkUserId)
            return NextResponse.redirect(new URL('/employer/jobs/new?error=employer_not_found', request.url))
        }

        const planId = session.metadata?.planId || pendingJobPost.selectedPackage || 'standard'
        const addOnIds: string[] = session.metadata?.addOnIds ? JSON.parse(session.metadata.addOnIds) : []

        // Parse job data from pending post
        let jobData: any = {}
        try {
            jobData = JSON.parse(pendingJobPost.jobData)
        } catch {
            console.error('Failed to parse job data')
            return NextResponse.redirect(new URL('/employer/jobs/new?error=invalid_job_data', request.url))
        }

        // Mark pending job post as processed (idempotency guard)
        await db.pendingJobPost.update({
            where: { id: pendingJobPostId },
            data: { checkoutSessionId: sessionId }
        })

        // Create employer package record
        const isEmailBlast = planId === 'email_blast'
        const employerPackage = await db.employerPackage.create({
            data: {
                employerId: employer.userId,
                packageType: planId as any,
                listingsRemaining: PACKAGE_LISTINGS[planId] ?? 1,
                purchasedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }
        })

        // Update employer's current package
        await db.employer.update({
            where: { userId: employer.userId },
            data: { currentPackageId: employerPackage.id }
        })

        // Determine vetting status
        const hasApprovedJob = await db.job.count({
            where: { employerId: employer.userId, status: 'approved' }
        }) > 0
        const isVetted = employer.isVetted || hasApprovedJob
        const jobStatus = isVetted ? 'approved' : 'pending_vetting'

        const mappedJobType = JOB_TYPE_MAPPING[jobData.jobType] || jobData.jobType || 'NOT_SPECIFIED'
        const emailBlastRequestedAt = isEmailBlast ? new Date() : null
        const emailBlastExpiresAt = isEmailBlast ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null

        // Create the actual job
        const job = await db.job.create({
            data: {
                employer: { connect: { userId: employer.userId } },
                title: jobData.title || 'Untitled',
                description: jobData.description || '',
                requirements: jobData.requirements || null,
                category: jobData.category || 'OTHER',
                experienceLevel: jobData.experienceLevel || null,
                payRangeMin: jobData.commissionOnly ? null : (jobData.salaryMin || jobData.payRangeMin || null),
                payRangeMax: jobData.commissionOnly ? null : (jobData.salaryMax || jobData.payRangeMax || null),
                payRangeText: jobData.commissionOnly ? 'Commission Only' : (jobData.payRangeText || null),
                salaryType: jobData.salaryType || null,
                type: mappedJobType as any,
                skillsRequired: jobData.skills || jobData.skillsRequired || [],
                benefits: jobData.benefits || null,
                applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                website: jobData.website || null,
                linkedinProfile: jobData.linkedinProfile || null,
                contactPhone: jobData.contactPhone || null,
                isFlexibleHours: jobData.isFlexibleHours || false,
                hoursPerWeek: jobData.hoursPerWeek || null,
                remoteSchedule: jobData.remoteSchedule || null,
                locationText: jobData.location || jobData.locationText || 'Remote',
                conciergeRequested: jobData.conciergeRequested || false,
                status: jobStatus,
                isCompanyPrivate: jobData.isCompanyPrivate || false,
                isEmailBlast: isEmailBlast,
                emailBlastRequestedAt,
                emailBlastExpiresAt,
            }
        })

        // Decrement listing credits
        await db.employerPackage.update({
            where: { id: employerPackage.id },
            data: { listingsRemaining: { decrement: 1 } }
        })

        if (addOnIds.length > 0) {
            console.log('Add-ons purchased:', addOnIds)
        }

        // Clean up pending job post
        await db.pendingJobPost.delete({ where: { id: pendingJobPostId } }).catch(console.error)

        console.log('✅ STRIPE-JOB-SUCCESS: Job created:', { jobId: job.id, planId, status: jobStatus })

        return NextResponse.redirect(new URL(`/employer/jobs?checkout=success&jobId=${job.id}`, request.url))

    } catch (error) {
        console.error('Error processing Stripe job success:', error)
        return NextResponse.redirect(new URL('/employer/jobs/new?error=processing_failed', request.url))
    }
}
