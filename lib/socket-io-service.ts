import { connectionsStore } from './connections-store'

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
   * Emit a new message to the recipient via SSE
   */
  public async emitNewMessage(threadId: string, messageData: MessageData): Promise<boolean> {
    try {
      if (!messageData.recipientId) return false
      connectionsStore.broadcastToUser(messageData.recipientId, {
        type: 'new_message',
        threadId,
        message: messageData,
      })
      return true
    } catch (error) {
      console.error('[SSE] emitNewMessage error:', error)
      return false
    }
  }

  /**
   * Emit a new thread notification to the recipient via SSE
   */
  public async emitNewThread(recipientId: string, thread: any, messageData: MessageData): Promise<boolean> {
    try {
      if (!recipientId) return false
      connectionsStore.broadcastToUser(recipientId, {
        type: 'new_thread',
        thread,
        message: messageData,
      })
      return true
    } catch (error) {
      console.error('[SSE] emitNewThread error:', error)
      return false
    }
  }

  /**
   * Typing events are best-effort; skipped without external server
   */
  public async emitTypingStart(_threadId: string, _userId: string): Promise<boolean> {
    return true
  }

  public async emitTypingStop(_threadId: string, _userId: string): Promise<boolean> {
    return true
  }

  /**
   * Broadcast presence update to all connected users
   */
  public async updateUserPresence(userId: string, isOnline: boolean): Promise<boolean> {
    try {
      connectionsStore.broadcastToAll({
        type: 'presence',
        userId,
        isOnline,
      })
      return true
    } catch (error) {
      console.error('[SSE] updateUserPresence error:', error)
      return false
    }
  }
}

export const socketIOService = SocketIOService.getInstance()
