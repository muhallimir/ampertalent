interface MessageData {
  id: string
  threadId: string
  recipientId: string
  senderId: string
  content: string
  createdAt: string
  sender: {
    id: string
    name: string
    firstName?: string
    lastName?: string
    profilePictureUrl?: string
    presignedProfilePictureUrl?: string
    employer?: {
      companyName: string
    }
  }
  attachments?: any[]
}

// Realtime server URL (Render in production, localhost in development)
const REALTIME_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'https://hire-my-mom-saas-realtime-server-1.onrender.com'; // Staging Env

export class SocketIOService {
  private static instance: SocketIOService

  private constructor() { }

  public static getInstance(): SocketIOService {
    if (!SocketIOService.instance) {
      SocketIOService.instance = new SocketIOService()
    }
    return SocketIOService.instance
  }

  /**
   * Emit a new message to all users in a thread (via Realtime Server)
   */
  public async emitNewMessage(threadId: string, messageData: MessageData): Promise<boolean> {
    try {
      const res = await fetch(`${REALTIME_SERVER_URL}/broadcast/new-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId,
          message: messageData,
        }),
      })

      if (!res.ok) {
        console.error('❌ emitNewMessage failed with HTTP status', res.status)
        return false
      }

      return true
    } catch (err) {
      console.error('❌ emitNewMessage network error:', err)
      return false
    }
  }

  /**
   * Emit typing_start event
   */
  public async emitTypingStart(threadId: string, userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${REALTIME_SERVER_URL}/broadcast/typing-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, userId }),
      })

      return res.ok
    } catch (err) {
      console.error('❌ emitTypingStart error:', err)
      return false
    }
  }

  /**
   * Emit typing_stop event
   */
  public async emitTypingStop(threadId: string, userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${REALTIME_SERVER_URL}/broadcast/typing-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, userId }),
      })

      return res.ok
    } catch (err) {
      console.error('❌ emitTypingStop error:', err)
      return false
    }
  }

  /**
   * Update user presence (online/offline)
   */
  public async updateUserPresence(userId: string, isOnline: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${REALTIME_SERVER_URL}/broadcast/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isOnline }),
      })

      return res.ok
    } catch (err) {
      console.error('❌ updateUserPresence error:', err)
      return false
    }
  }

  /**
   * Emit a new thread creation event
   * This should be called when the first message of a brand-new thread is created.
   * It notifies the recipient so their inbox can show the new conversation immediately.
   */
  public async emitNewThread(
    recipientId: string,
    thread: {
      id: string
      participantDetails: {
        id: string
        name: string
        firstName?: string
        lastName?: string
        profilePictureUrl?: string
        presignedProfilePictureUrl?: string
        employer?: { companyName: string }
      }[]
    },
    messageData: MessageData
  ): Promise<boolean> {
    try {
      const res = await fetch(`${REALTIME_SERVER_URL}/broadcast/new-thread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId,
          thread,
          message: messageData,
        }),
      })

      if (!res.ok) {
        console.error('❌ emitNewThread failed with HTTP status', res.status)
        return false
      }

      return true
    } catch (err) {
      console.error('❌ emitNewThread network error:', err)
      return false
    }
  }

  /**
   * Optional helper for debugging realtime stats
   */
  public async getConnectionStats(): Promise<{ connectedSockets: number } | null> {
    try {
      const res = await fetch(`${REALTIME_SERVER_URL}/stats`, {
        method: 'GET',
      })
      if (!res.ok) return null
      return res.json()
    } catch (err) {
      console.error('❌ getConnectionStats error:', err)
      return null
    }
  }
}

// Export singleton instance
export const socketIOService = SocketIOService.getInstance()
