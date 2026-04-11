// Shared connections store for real-time notifications
// This needs to be a singleton that persists across API route instances

interface ConnectionInfo {
  controller: ReadableStreamDefaultController
  userId: string
  connectedAt: Date
}

class ConnectionsStore {
  private connections = new Map<string, ConnectionInfo>()

  addConnection(userId: string, controller: ReadableStreamDefaultController) {
    console.log(`➕ Adding connection for user: ${userId}`)
    this.connections.set(userId, {
      controller,
      userId,
      connectedAt: new Date()
    })
  }

  removeConnection(userId: string) {
    console.log(`➖ Removing connection for user: ${userId}`)
    this.connections.delete(userId)
  }

  broadcastToUser(userId: string, notification: any): boolean {
    console.log(`📡 Broadcasting to user: ${userId}, connections: ${this.connections.size}`)
    const connection = this.connections.get(userId)
    if (connection) {
      try {
        connection.controller.enqueue(`data: ${JSON.stringify({
          type: 'notification',
          notification,
          timestamp: new Date().toISOString()
        })}\n\n`)
        console.log(`✅ Notification broadcasted to user: ${userId}`)
        return true
      } catch (error) {
        console.error(`❌ Failed to broadcast to user ${userId}:`, error)
        // Remove dead connection
        this.connections.delete(userId)
        return false
      }
    }
    console.log(`❌ User ${userId} not connected`)
    return false
  }

  broadcastToAll(notification: any): number {
    let successCount = 0
    for (const [userId, connection] of this.connections.entries()) {
      try {
        connection.controller.enqueue(`data: ${JSON.stringify({
          type: 'broadcast',
          notification,
          timestamp: new Date().toISOString()
        })}\n\n`)
        successCount++
      } catch (error) {
        console.error(`❌ Failed to broadcast to user ${userId}:`, error)
        this.connections.delete(userId)
      }
    }
    console.log(`📢 Broadcast sent to ${successCount} connected users`)
    return successCount
  }

  getStats() {
    return {
      activeConnections: this.connections.size,
      connectedUsers: Array.from(this.connections.keys())
    }
  }

  cleanup() {
    // Clean up old connections (optional)
    const now = new Date()
    for (const [userId, connection] of this.connections.entries()) {
      const age = now.getTime() - connection.connectedAt.getTime()
      if (age > 24 * 60 * 60 * 1000) { // 24 hours
        console.log(`🧹 Cleaning up old connection for user: ${userId}`)
        this.connections.delete(userId)
      }
    }
  }
}

// Export singleton instance
export const connectionsStore = new ConnectionsStore()