/**
 * Clerk Webhook Handler
 * Processes user lifecycle events from Clerk (user.created, user.updated, user.deleted)
 *
 * Events:
 * - user.created: New user signed up via Clerk
 * - user.updated: User profile updated in Clerk
 * - user.deleted: User deleted from Clerk
 */

import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'

export const dynamic = 'force-dynamic'

/**
 * Verify webhook signature using Svix
 */
function verifyWebhookSignature(payload: any, headers: any) {
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')
  try {
    return wh.verify(JSON.stringify(payload), headers)
  } catch (error) {
    throw new Error(`Webhook verification failed: ${error}`)
  }
}

/**
 * Handle user.created event
 */
async function handleUserCreated(clerkUser: any) {
  console.log(`[Clerk Webhook] user.created: ${clerkUser.id}`)
  console.log(`  Email: ${clerkUser.email_addresses?.[0]?.email_address}`)
  console.log(`  Name: ${clerkUser.first_name} ${clerkUser.last_name}`)

  // Note: User profile creation happens in the onboarding flow
  // This webhook just logs the event for debugging/audit purposes
}

/**
 * Handle user.updated event
 */
async function handleUserUpdated(clerkUser: any) {
  console.log(`[Clerk Webhook] user.updated: ${clerkUser.id}`)
  console.log(`  Updated at: ${clerkUser.updated_at}`)

  // Sync email/name updates if needed
  // For now, just log
}

/**
 * Handle user.deleted event
 */
async function handleUserDeleted(clerkUser: any) {
  console.log(`[Clerk Webhook] user.deleted: ${clerkUser.id}`)
  console.log(`  Deleted at: ${clerkUser.deleted_at}`)

  // Note: Data retention policy should handle soft-deletes
  // For now, just log
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const headers = {
      'svix-id': request.headers.get('svix-id'),
      'svix-timestamp': request.headers.get('svix-timestamp'),
      'svix-signature': request.headers.get('svix-signature'),
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(payload, headers)

    console.log(`[Clerk Webhook] Event: ${event.type}`)

    // Handle event types
    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event.data)
        break

      case 'user.updated':
        await handleUserUpdated(event.data)
        break

      case 'user.deleted':
        await handleUserDeleted(event.data)
        break

      default:
        console.log(`[Clerk Webhook] Unknown event type: ${event.type}`)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[Clerk Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    )
  }
}

/**
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok', webhook: 'clerk' }, { status: 200 })
}
