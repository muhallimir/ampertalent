/**
 * Stripe Webhook Handler
 * Receives and processes webhook events from Stripe
 *
 * Events handled:
 * - payment_intent.succeeded / payment_intent.payment_failed
 * - customer.subscription.created / updated / deleted
 * - invoice.payment_succeeded / invoice.payment_failed
 * - charge.refunded
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';

/**
 * Handle payment intent succeeded
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Stripe] Payment succeeded: ${paymentIntent.id}`);
  console.log(`  Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}`);
  console.log(`  Customer: ${paymentIntent.customer}`);
}

/**
 * Handle payment intent failed
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Stripe] Payment failed: ${paymentIntent.id}`);
  console.log(`  Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency}`);
  console.log(`  Failure message: ${paymentIntent.last_payment_error?.message}`);
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`[Stripe] Subscription created: ${subscription.id}`);
  console.log(`  Customer: ${subscription.customer}`);
  console.log(`  Status: ${subscription.status}`);
  console.log(`  Current period: ${new Date(subscription.current_period_start * 1000).toISOString()} to ${new Date(subscription.current_period_end * 1000).toISOString()}`);
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`[Stripe] Subscription updated: ${subscription.id}`);
  console.log(`  Status: ${subscription.status}`);
  console.log(`  Cancel at period end: ${subscription.cancel_at_period_end}`);
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`[Stripe] Subscription deleted: ${subscription.id}`);
  console.log(`  Customer: ${subscription.customer}`);
}

/**
 * Handle invoice payment succeeded
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`[Stripe] Invoice payment succeeded: ${invoice.id}`);
  console.log(`  Amount: ${(invoice.total || 0) / 100} ${invoice.currency}`);
  console.log(`  Customer: ${invoice.customer}`);
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`[Stripe] Invoice payment failed: ${invoice.id}`);
  console.log(`  Amount: ${(invoice.total || 0) / 100} ${invoice.currency}`);
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(`[Stripe] Charge refunded: ${charge.id}`);
  console.log(`  Amount: ${charge.amount / 100} ${charge.currency}`);
  console.log(`  Reason: ${charge.refunds.data[0]?.reason || 'unknown'}`);
}

/**
 * POST /api/webhooks/stripe
 * Receive Stripe webhook events
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
