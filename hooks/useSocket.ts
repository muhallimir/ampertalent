'use client'

// Socket.io has been replaced with SSE (Server-Sent Events) via useRealTimeNotifications.
// This hook is kept as a no-op stub so existing consumers compile without changes.

export interface UseSocketReturn {
    socket: null
    isConnected: boolean
    joinThread: (threadId: string) => void
    leaveThread: (threadId: string) => void
    sendTypingStart: (threadId: string) => void
    sendTypingStop: (threadId: string) => void
    sendMessage: (threadId: string, message: any) => void
    requestOnlineStatus: (userIds: string[]) => void
}

export function useSocket(): UseSocketReturn {
    return {
        socket: null,
        isConnected: false,
        joinThread: () => {},
        leaveThread: () => {},
        sendTypingStart: () => {},
        sendTypingStop: () => {},
        sendMessage: () => {},
        requestOnlineStatus: () => {},
    }
}
