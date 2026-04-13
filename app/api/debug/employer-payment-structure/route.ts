import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with employer relation
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: currentUser.profile.clerkUserId },
      include: {
        employer: true
      }
    })

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get payment methods
    const paymentMethods = await db.$queryRaw`
      SELECT id, employer_id, type, last4, brand, is_default, authnet_payment_profile_id, created_at
      FROM payment_methods
      WHERE employer_id = ${userProfile.id}
      ORDER BY created_at DESC
    ` as Array<{
      id: string
      employer_id: string
      type: string
      last4: string
      brand: string
      is_default: boolean
      authnet_payment_profile_id: string
      created_at: Date
    }>

    // Also check if there are any payment methods with the wrong employer_id (using employer.userId pattern)
    const wrongPaymentMethods = userProfile.employer ? await db.$queryRaw`
      SELECT id, employer_id, type, last4, brand, is_default, authnet_payment_profile_id, created_at
      FROM payment_methods
      WHERE employer_id = ${userProfile.employer.userId}
      ORDER BY created_at DESC
    ` as Array<{
      id: string
      employer_id: string
      type: string
      last4: string
      brand: string
      is_default: boolean
      authnet_payment_profile_id: string
      created_at: Date
    }> : []

    return NextResponse.json({
      debug: 'Employer Payment Method Structure Analysis',
      userProfile: {
        id: userProfile.id,
        clerkUserId: userProfile.clerkUserId,
        role: userProfile.role,
        name: userProfile.name,
        email: userProfile.email,
        hasEmployer: !!userProfile.employer
      },
      employer: userProfile.employer ? {
        userId: userProfile.employer.userId,
        companyName: userProfile.employer.companyName,
        isSuspended: userProfile.employer.isSuspended,
        currentPackageId: userProfile.employer.currentPackageId
      } : null,
      paymentMethodStructure: {
        expectedEmployerId: userProfile.id,
        actualEmployerIdFromRelation: userProfile.employer?.userId || null,
        correctPaymentMethods: paymentMethods,
        wrongPaymentMethods: wrongPaymentMethods,
        totalCorrect: paymentMethods.length,
        totalWrong: wrongPaymentMethods.length
      },
      analysis: {
        hasCorrectPaymentMethods: paymentMethods.length > 0,
        hasWrongPaymentMethods: wrongPaymentMethods.length > 0,
        shouldUseEmployerId: userProfile.id,
        explanation: 'Payment methods should use userProfile.id as employer_id, not userProfile.employer.userId'
      }
    })

  } catch (error) {
    console.error('Debug employer payment structure error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}