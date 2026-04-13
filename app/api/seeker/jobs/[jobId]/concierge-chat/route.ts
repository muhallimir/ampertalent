import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ConciergeChatService } from '@/lib/concierge-chat-service';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Check seeker authorization
    const authResult = await requireAuth(['seeker'])(request);
    if (authResult) {
      return authResult;
    }

    const { jobId } = await params;

    // Verify job exists and is concierge-enabled
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        conciergeRequested: true,
        conciergeStatus: {
          not: 'not_requested'
        }
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Concierge chat not available for this job' },
        { status: 404 }
      );
    }

    // Get seeker user ID from auth (simplified - adjust based on your auth system)
    const seekerId = 'seeker-user-id'; // This should come from your auth system

    // Get or create concierge chat for this seeker-job combination
    const chatData = await ConciergeChatService.getOrCreateSeekerChat(jobId, seekerId);

    if (!chatData) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Get messages
    const messages = await ConciergeChatService.getSeekerChatMessages(chatData.id, seekerId);

    return NextResponse.json({
      chat: chatData,
      messages
    });
  } catch (error) {
    console.error('Error getting seeker concierge chat:', error);
    return NextResponse.json(
      { error: 'Failed to get concierge chat' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Check seeker authorization
    const authResult = await requireAuth(['seeker'])(request);
    if (authResult) {
      return authResult;
    }

    const { jobId } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Verify job exists and is concierge-enabled
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        conciergeRequested: true,
        conciergeStatus: {
          not: 'not_requested'
        }
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Concierge chat not available for this job' },
        { status: 404 }
      );
    }

    // Get seeker user ID from auth (simplified - adjust based on your auth system)
    const seekerId = 'seeker-user-id'; // This should come from your auth system

    // Get or create concierge chat for this seeker-job combination
    const chatData = await ConciergeChatService.getOrCreateSeekerChat(jobId, seekerId);

    if (!chatData) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Send message
    const newMessage = await ConciergeChatService.sendSeekerMessage(
      chatData.id,
      seekerId,
      message.trim()
    );

    return NextResponse.json({
      message: newMessage
    });
  } catch (error) {
    console.error('Error sending seeker concierge message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}