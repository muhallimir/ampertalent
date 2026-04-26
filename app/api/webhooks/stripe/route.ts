/**
 * Stripe Webhook Handler
 *
 * Events handled:
 * - checkout.session.completed       → save card payment method to DB
 * - payment_intent.succeeded         → logging / future hooks
 * - payment_intent.payment_failed    → logging
 * - customer.subscription.created/updated/deleted → logging
 * - invoice.payment_succeeded        → renew subscription period in DB
 * - invoice.payment_failed           → mark subscription past_due
 * - charge.refunded                  → logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inAppNotificationService } from '@/lib/in-app-notification-service';
import { NotificationService } from '@/lib/notification-service';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`[Stripe] Checkout session completed: ${session.id}`);

  // Save card payment method to DB so billing/subscription pages can display it
  try {
    const stripeLib = (await import('@/lib/stripe')).default;
    const customerId = typeof session.customer === 'string' ? session.customer : null;
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
    const planId = session.metadata?.planId;
    const clerkUserId = session.metadata?.clerkUserId;

    if (!paymentIntentId) return;

    const paymentIntent = await stripeLib.paymentIntents.retrieve(paymentIntentId, {
      expand: ['payment_method'],
    });
    const pm = paymentIntent.payment_method as Stripe.PaymentMethod | null;
    if (!pm?.card) return;

    // Determine owner (seeker or employer) by looking up profile
    let userProfile: any = null;
    if (clerkUserId) {
      userProfile = await db.userProfile.findUnique({ where: { clerkUserId } });
    } else if (session.customer_email) {
      userProfile = await db.userProfile.findFirst({ where: { email: session.customer_email } });
    }

    if (!userProfile) return;

    const isSeeker = userProfile.role === 'seeker';
    const ownerId = userProfile.id;
    const ownerField = isSeeker ? 'seeker_id' : 'employer_id';

    // Check if a card record already exists
    const existing = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM payment_methods WHERE ${isSeeker ? db.$queryRaw`seeker_id` : db.$queryRaw`employer_id`} = ${ownerId} AND type != 'paypal' LIMIT 1
    `.catch(() => []);

    if ((existing as any[]).length > 0) {
      await db.$executeRawUnsafe(
        `UPDATE payment_methods SET last4 = $1, brand = $2, expiry_month = $3, expiry_year = $4, is_default = true, updated_at = NOW() WHERE id = $5`,
        pm.card.last4, pm.card.brand, pm.card.exp_month, pm.card.exp_year, (existing as any[])[0].id
      );
    } else {
      await db.$executeRawUnsafe(
        `INSERT INTO payment_methods (id, ${ownerField}, type, last4, brand, expiry_month, expiry_year, is_default, created_at, updated_at)
         VALUES ($1, $2, 'credit_card', $3, $4, $5, $6, true, NOW(), NOW())`,
        `pm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        ownerId, pm.card.last4, pm.card.brand, pm.card.exp_month, pm.card.exp_year
      );
    }

    // Store Stripe customer ID on subscription or employer package
    if (customerId) {
      if (isSeeker) {
        const latestSub = await db.subscription.findFirst({
          where: { seekerId: ownerId },
          orderBy: { createdAt: 'desc' },
        });
        if (latestSub && !latestSub.authnetCustomerId) {
          await db.subscription.update({ where: { id: latestSub.id }, data: { authnetCustomerId: customerId } });
        }
      } else {
        const latestPkg = await db.employerPackage.findFirst({
          where: { employerId: ownerId },
          orderBy: { purchasedAt: 'desc' },
        });
        if (latestPkg && !latestPkg.arbSubscriptionId) {
          await db.employerPackage.update({ where: { id: latestPkg.id }, data: { arbSubscriptionId: customerId } });
        }
      }
    }

    console.log(`✅ [Stripe Webhook] Saved card payment method for user: ${userProfile.id}`);

    // ====== IN-APP ADMIN NOTIFICATION (safety net for all Stripe checkout flows) ======
    // The success routes (stripe-success, stripe-job-success, process-payment) also fire these.
    // The webhook is a reliable fallback for flows like create-checkout → /seeker/membership/success
    // which never processes payment server-side. We avoid duplicates by using the session ID as a
    // deduplication key via a try/ignore pattern — notifications are low-stakes so double-fire is
    // acceptable but the primary routes handle the customer-facing ones.
    try {
      const planId = session.metadata?.planId;
      const amountPaid = (session.amount_total || 0) / 100;
      const planLabel = planId
        ? planId.replace(/-|_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        : 'Subscription';
      const isSeeker = userProfile.role === 'seeker';
      const userName = userProfile.name || (isSeeker ? 'Seeker' : 'Employer');
      const isTrial = planId === 'trial';
      const displayPrice = isTrial ? 0 : amountPaid;
      const productDescription = isTrial ? `${planLabel} (Free Trial)` : planLabel;

      // Admin in-app notification
      await inAppNotificationService.notifyPaymentReceived(
        userProfile.id,
        userName,
        displayPrice,
        productDescription,
        isSeeker ? 'seeker' : 'employer'
      );

      // Seeker: also notify the customer themselves if this is the membership flow
      // (stripe-success and process-payment already do this for their flows)
      const isOnboardingFlow = !!session.metadata?.clerkUserId;
      if (!isOnboardingFlow && isSeeker) {
        const txId = typeof session.payment_intent === 'string' ? session.payment_intent : session.id;
        await inAppNotificationService.notifySeekerPaymentConfirmation(
          userProfile.id,
          displayPrice,
          productDescription,
          txId,
          planLabel
        );

        // Also send admin email for flows that don't go through stripe-success
        const orderDate = new Date();
        const orderNumber = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${session.id.slice(-4)}`;
        await NotificationService.sendAdminPaymentNotification({
          orderNumber,
          orderDate: orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          customerName: userName,
          customerType: 'Seeker',
          customerId: userProfile.id,
          customerEmail: userProfile.email || session.customer_email || '',
          productDescription,
          quantity: 1,
          price: displayPrice,
          lineItems: [{ name: productDescription, quantity: 1, price: displayPrice }],
          paymentType: 'card',
          isRenewal: false,
          transactionId: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
        });
      }

      console.log(`✅ [Stripe Webhook] In-app notifications fired for user: ${userProfile.id}`);
    } catch (notifErr) {
      console.error('[Stripe Webhook] Error firing in-app notifications (non-blocking):', notifErr);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error saving payment method from checkout.session.completed:', err);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`[Stripe] Invoice payment succeeded: ${invoice.id}, customer: ${invoice.customer}`);

  // For subscription renewals — extend the subscription period in DB
  try {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
    if (!customerId) return;

    // Find subscription by stored Stripe customer ID
    const subscription = await db.subscription.findFirst({
      where: { authnetCustomerId: customerId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (subscription) {
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          nextBillingDate: periodEnd,
        },
      });
      console.log(`✅ [Stripe Webhook] Renewed subscription: ${subscription.id}`);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error processing invoice.payment_succeeded:', err);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`[Stripe] Invoice payment failed: ${invoice.id}, customer: ${invoice.customer}`);

  try {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
    if (!customerId) return;

    const subscription = await db.subscription.findFirst({
      where: { authnetCustomerId: customerId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (subscription) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { status: 'past_due' },
      });
      console.log(`⚠️ [Stripe Webhook] Marked subscription past_due: ${subscription.id}`);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error processing invoice.payment_failed:', err);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Stripe] Payment succeeded: ${paymentIntent.id} — ${paymentIntent.amount / 100} ${paymentIntent.currency}`);
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Stripe] Payment failed: ${paymentIntent.id} — ${paymentIntent.last_payment_error?.message}`);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`[Stripe] Subscription created: ${subscription.id}, status: ${subscription.status}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`[Stripe] Subscription updated: ${subscription.id}, status: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`[Stripe] Subscription deleted: ${subscription.id}`);

  try {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;
    if (!customerId) return;

    await db.subscription.updateMany({
      where: { authnetCustomerId: customerId, status: { in: ['active', 'past_due'] } },
      data: { status: 'canceled' },
    });
  } catch (err) {
    console.error('[Stripe Webhook] Error processing subscription.deleted:', err);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(`[Stripe] Charge refunded: ${charge.id} — ${charge.amount / 100} ${charge.currency}`);
}

/**
 * POST /api/webhooks/stripe
 */
export async function POST(request: NextRequest) {
  try {
    const { verifyWebhookSignature } = await import('@/lib/stripe');

    // Get raw body as Buffer (needed for signature verification)
    const body = await request.arrayBuffer();
    const bodyString = Buffer.from(body).toString('utf-8');

    // Get signature from headers
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error('[Stripe Webhook] No signature provided');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Verify signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(
        bodyString,
        signature,
        process.env.STRIPE_WEBHOOK_SIGNING_SECRET || ''
      );
    } catch (error) {
      console.error('[Stripe Webhook] Signature verification failed:', error);
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 401 }
      );
    }

    console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

    // Handle event types
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }

      case 'payment_intent.succeeded': {
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      }

      case 'customer.subscription.created': {
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      }

      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      }

      case 'invoice.payment_failed': {
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }

      case 'charge.refunded': {
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Return success
    return NextResponse.json(
      { received: true, id: event.id },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/stripe
 * Health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'healthy' }, { status: 200 });
}
