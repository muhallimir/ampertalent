import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { connectionsStore } from '@/lib/connections-store';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = currentUser.profile.id;

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Store connection for this user
        connectionsStore.addConnection(userId, controller);

        // Send initial connection message
        controller.enqueue(
          `data: ${JSON.stringify({
            type: 'connected',
            message: 'Real-time notifications connected',
            timestamp: new Date().toISOString(),
          })}\n\n`,
        );

        console.log(`SSE connection established for user: ${userId}`);

      },
      cancel() {
        // Clean up connection when client disconnects
        connectionsStore.removeConnection(userId);
        console.log(`SSE connection closed for user: ${userId}`);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Function to broadcast notification to specific user
export function broadcastToUser(userId: string, notification: any) {
  return connectionsStore.broadcastToUser(userId, notification);
}

// Function to broadcast to all connected users
export function broadcastToAll(notification: any) {
  return connectionsStore.broadcastToAll(notification);
}

// Get connection stats
export function getConnectionStats() {
  return connectionsStore.getStats();
}
