import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { hasActiveSubscription } from '@/lib/subscription-check'

import { ExternalWebhookService } from '@/lib/external-webhook-service'
import { inAppNotificationService } from '@/lib/in-app-notification-service'
import { NotificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATION: Verify user is authenticated
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = currentUser.profile

    const body = await request.json()
    const {
      seekerId,
      resumeUrl,
      targetRole,
      targetIndustry,
      priority,
      paymentMethodId, // For saved payment methods
      opaqueDataDescriptor, // For new card payments
      opaqueDataValue,
      billingInfo
    } = body

    console.log('🔍 RUSH-REVIEW-PAYMENT: Received payment request:', {
      seekerId,
      priority,
      hasPaymentMethodId: !!paymentMethodId,
      hasOpaqueData: !!(opaqueDataDescriptor && opaqueDataValue)
    })

    // 2. INPUT VALIDATION
    if (!seekerId || !resumeUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate priority and calculate cost
    if (priority !== 'standard' && priority !== 'rush') {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      )
    }

    // Check for either saved payment method or new card data
    const hasSavedPaymentMethod = !!paymentMethodId
    const hasNewCardData = !!(opaqueDataDescriptor && opaqueDataValue)

    // For rush reviews, payment is required if user doesn't have subscription
    // But for users with active subscription, Rush Review costs $19.99 but doesn't require payment method
    // Check subscription status once and reuse below
    const isSubscriptionActive = await hasActiveSubscription(seekerId)

    if (priority === 'rush') {
      // Only require payment method for non-subscribers
      if (!isSubscriptionActive && !hasSavedPaymentMethod && !hasNewCardData) {
        return NextResponse.json(
          { error: 'Payment method required for rush review' },
          { status: 400 }
        )
      }
    }

    // 3. GET USER PROFILE AND CHECK SUBSCRIPTION STATUS
    const userProfile = await db.userProfile.findUnique({
      where: { id: user.id },
      include: {
        jobSeeker: {
          select: {
            membershipPlan: true,
            membershipExpiresAt: true,
            resumeCredits: true
          }
        }
      }
    })

    if (!userProfile || !userProfile.jobSeeker) {
      return NextResponse.json({ error: 'Job seeker profile not found' }, { status: 404 })
    }

    // Calculate cost based on priority and subscription status
    let cost = 0
    if (priority === 'rush') {
      cost = isSubscriptionActive ? 19.99 : 49.99
    } else {
      cost = isSubscriptionActive ? 0 : 29.99
    }

    // Check if user has sufficient credits or subscription
    const hasSufficientCredits = userProfile.jobSeeker.resumeCredits > 0

    console.log('🔍 RUSH-REVIEW-PAYMENT: Payment requirement check:', {
      isSubscriptionActive,
      hasSufficientCredits,
      cost,
      priority,
      resumeCredits: userProfile.jobSeeker.resumeCredits,
      membershipPlan: userProfile.jobSeeker.membershipPlan,
      message: isSubscriptionActive && priority === 'rush'
        ? 'Subscriber paying discounted rush review rate ($19.99)'
        : cost === 0
          ? 'Free critique (subscription or credits)'
          : 'Non-subscriber paying full rate'
    })

    // 4. PROCESS PAYMENT IF REQUIRED
    let transactionId = `FREE-${Date.now()}` // Default for free requests
    let paymentResult: any = null

    if (cost > 0) {
      // Change the transaction ID from FREE to RUSH-CRIT or STANDARD-CRIT
      transactionId = priority === 'rush' ? `RUSH-CRIT-${Date.now()}` : `STANDARD-CRIT-${Date.now()}`

      // Payment is required
      if (hasSavedPaymentMethod) {
        // Process payment with saved payment method
        console.log('🔍 RUSH-REVIEW-PAYMENT: Processing with saved payment method:', paymentMethodId)

        // Get saved payment method
        const paymentMethod = await db.$queryRaw`
          SELECT authnet_payment_profile_id as "authnetPaymentProfileId"
          FROM payment_methods
          WHERE id = ${paymentMethodId}
          AND seeker_id = ${userProfile.id}
        ` as Array<{ authnetPaymentProfileId: string }>

        if (paymentMethod.length === 0) {
          return NextResponse.json(
            { error: 'Payment method not found' },
            { status: 404 }
          )
        }

        // Process payment with saved method
        const [customerProfileId, paymentProfileId] = paymentMethod[0].authnetPaymentProfileId.split('|')

        console.log('💳 RUSH-REVIEW-PAYMENT: Processing payment with saved method:', {
          customerProfileId,
          paymentProfileId,
          amount: cost
        })

        const authorizeNetClient = getAuthorizeNetClient()

        paymentResult = await authorizeNetClient.createTransaction({
          transactionType: 'authCaptureTransaction',
          amount: cost.toString(),
          profile: {
            customerProfileId: customerProfileId,
            paymentProfile: {
              paymentProfileId: paymentProfileId
            }
          },
          order: {
            invoiceNumber: `CRITIQUE-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}`,
            description: `${priority === 'rush' ? 'Rush' : 'Standard'} Resume Critique`
          }
        })

        if (!paymentResult.success) {
          console.error('❌ RUSH-REVIEW-PAYMENT: Saved payment method failed:', paymentResult.errors)
          const errorDetail = paymentResult.errors?.length
            ? paymentResult.errors.map((e: any) => e.errorText || e.errorCode).join('; ')
            : 'Payment processing failed';
          return NextResponse.json(
            { error: 'Payment failed', details: errorDetail },
            { status: 400 }
          )
        }

        transactionId = paymentResult.transactionId
        console.log('✅ RUSH-REVIEW-PAYMENT: Saved payment method successful:', transactionId)
      } else if (hasNewCardData) {
        // Process payment with new card data
        console.log('💳 RUSH-REVIEW-PAYMENT: Processing with new card data')

        const authorizeNetClient = getAuthorizeNetClient()

        paymentResult = await authorizeNetClient.createTransaction({
          transactionType: 'authCaptureTransaction',
          amount: cost.toString(),
          payment: {
            opaqueData: {
              dataDescriptor: opaqueDataDescriptor,
              dataValue: opaqueDataValue
            }
          },
          order: {
            invoiceNumber: `CRITIQUE-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}`,
            description: `${priority === 'rush' ? 'Rush' : 'Standard'} Resume Critique`
          },
          billTo: billingInfo ? {
            firstName: billingInfo.firstName,
            lastName: billingInfo.lastName,
            address: billingInfo.address,
            city: billingInfo.city,
            state: billingInfo.state,
            zip: billingInfo.zipCode,
            country: billingInfo.country
          } : undefined
        })

        if (!paymentResult.success) {
          console.error('❌ RUSH-REVIEW-PAYMENT: New card payment failed:', paymentResult.errors)
          const errorDetail = paymentResult.errors?.length
            ? paymentResult.errors.map((e: any) => e.errorText || e.errorCode).join('; ')
            : 'Payment processing failed';
          return NextResponse.json(
            { error: 'Payment failed', details: errorDetail },
            { status: 400 }
          )
        }

        transactionId = paymentResult.transactionId
        console.log('✅ RUSH-REVIEW-PAYMENT: New card payment successful:', transactionId)
      } else {
        // This should not happen based on validation but as a safety check
        if (cost > 0) {
          return NextResponse.json(
            { error: 'Payment required but no payment method provided' },
            { status: 400 }
          )
        }
      }
    }

    // 5. DEDUCT CREDIT IF APPLICABLE (for users with subscription but no unlimited critiques)
    if (isSubscriptionActive && !hasSufficientCredits && cost === 0) {
      // For subscriptions that don't provide unlimited critiques, we might still need to deduct
      // But in this case, we're assuming subscription users get critiques included
      console.log('ℹ️ RUSH-REVIEW-PAYMENT: User has active subscription, no credit deduction needed')
    } else if (!isSubscriptionActive && hasSufficientCredits && cost === 0) {
      // Standard critique for user with credits
      console.log('🔍 RUSH-REVIEW-PAYMENT: Deducting credit for standard critique')
      await db.jobSeeker.update({
        where: { userId: seekerId },
        data: {
          resumeCredits: {
            decrement: 1
          }
        }
      })
    }

    // 6. CREATE CRITIQUE REQUEST IN DATABASE
    const critiqueData = await db.resumeCritique.create({
      data: {
        seekerId,
        resumeUrl,
        targetRole: targetRole || undefined,
        targetIndustry: targetIndustry || undefined,
        priority,
        cost,
        status: 'pending'
      }
    })

    console.log('✅ RUSH-REVIEW-PAYMENT: Critique request created:', critiqueData.id)

    // 7. RECORD PAYMENT TRANSACTION IF APPLICABLE
    if (cost > 0) {
      await db.externalPayment.create({
        data: {
          userId: userProfile.id,
          authnetTransactionId: transactionId,
          amount: cost,
          planId: priority === 'rush' ? 'rush_critique' : 'standard_critique',
          status: 'completed',
          webhookProcessedAt: new Date()
        }
      })

      console.log('✅ RUSH-REVIEW-PAYMENT: Payment recorded:', transactionId)
    }

    // 8. SEND NOTIFICATIONS
    try {
      await ExternalWebhookService.sendSeekerResumeCritiqueCreated({
        userId: seekerId,
        email: userProfile.email || '',
        firstName: userProfile.name?.split(' ')[0] || '',
        lastName: userProfile.name?.split(' ').slice(1).join(' ') || undefined,
        critiqueRequestId: critiqueData.id,
        resumeUrl: critiqueData.resumeUrl,
        targetRole: critiqueData.targetRole || '',
        targetIndustry: critiqueData.targetIndustry || '',
        priority: critiqueData.priority,
        cost: critiqueData.cost
      })

      console.log('✅ RUSH-REVIEW-PAYMENT: External webhook sent')
    } catch (webhookError) {
      console.error('⚠️ RUSH-REVIEW-PAYMENT: External webhook failed:', webhookError)
    }

    try {
      await inAppNotificationService.createNotification({
        userId: userProfile.id,
        type: 'system_alert',
        title: 'Critique Request Submitted',
        message: `Your ${priority === 'rush' ? 'Rush' : 'Standard'} Resume Critique request has been submitted successfully.`,
        data: {
          critiqueRequestId: critiqueData.id,
          priority: critiqueData.priority,
          cost: critiqueData.cost
        }
      })

      console.log('✅ RUSH-REVIEW-PAYMENT: In-app notification created')
    } catch (notificationError) {
      console.error('⚠️ RUSH-REVIEW-PAYMENT: In-app notification failed:', notificationError)
    }

    // 9. SEND ADMIN ORDER NOTIFICATION EMAIL (only if payment was made)
    if (cost > 0) {
      try {
        const orderDate = new Date()
        const orderNumber = `RC-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${critiqueData.id.slice(-6).toUpperCase()}`

        await NotificationService.sendAdminPaymentNotification({
          orderNumber,
          orderDate: orderDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          }),
          customerName: userProfile.name || 'Unknown',
          customerType: 'Seeker',
          customerId: seekerId,
          customerEmail: userProfile.email || '',
          productDescription: `${priority === 'rush' ? 'Rush' : 'Standard'} Resume Critique`,
          price: cost,
          paymentMethod: 'Credit Card (Authorize.net)',
          transactionId: transactionId || undefined,
          paymentType: 'card',
        })
        console.log('✅ RUSH-REVIEW-PAYMENT: Admin order notification email sent')

        // Send customer payment confirmation email - queued with feature flag
        await NotificationService.sendCustomerPaymentConfirmationEmail({
          email: userProfile.email || '',
          firstName: userProfile.firstName || userProfile.name || 'Valued Customer',
          amount: cost,
          description: `${priority === 'rush' ? 'Rush' : 'Standard'} Resume Critique`,
          transactionId: transactionId || 'N/A',
          lineItems: [{ name: `${priority === 'rush' ? 'Rush' : 'Standard'} Resume Critique`, amount: cost }],
          isRecurring: true,
          paymentType: 'card',
        })
        console.log('✅ RUSH-REVIEW-PAYMENT: Customer payment confirmation email queued')
      } catch (emailError) {
        console.error('⚠️ RUSH-REVIEW-PAYMENT: Email notification failed:', emailError)
      }
    }

    // Convert database model to our interface
    const critiqueRequest = {
      id: critiqueData.id,
      seekerId: critiqueData.seekerId,
      resumeUrl: critiqueData.resumeUrl,
      targetRole: critiqueData.targetRole || undefined,
      targetIndustry: critiqueData.targetIndustry || undefined,
      status: critiqueData.status,
      priority: critiqueData.priority,
      cost: critiqueData.cost,
      requestedAt: critiqueData.requestedAt,
      completedAt: critiqueData.completedAt || undefined,
      transactionId: cost > 0 ? transactionId : undefined
    }

    return NextResponse.json(critiqueRequest)

  } catch (error) {
    console.error('Error processing resume critique payment:', error)
    return NextResponse.json(
      { error: 'Failed to process resume critique request' },
      { status: 500 }
    )
  }
}
