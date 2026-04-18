'use client'

import { useState } from 'react'
import { useNotificationListener } from './useRealTimeNotifications'

interface UserPresence {
    userId: string
    isOnline: boolean
    lastSeenAt: string
}

interface UsePresenceReturn {
    userPresence: Map<string, UserPresence>
    getPresence: (userId: string) => UserPresence | null
    isOnline: (userId: string) => boolean
}

export function usePresence(): UsePresenceReturn {
    const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map())

    // Listen for presence updates via SSE
    useNotificationListener('presence', (notification: any) => {
        setUserPresence(prev => {
            const newMap = new Map(prev)
            newMap.set(notification.userId, {
                userId: notification.userId,
                isOnline: notification.isOnline,
                lastSeenAt: new Date().toISOString(),
            })
            return newMap
        })
    })

    const getPresence = (userId: string): UserPresence | null => {
        return userPresence.get(userId) || null
    }

    const isOnline = (userId: string): boolean => {
        const presence = userPresence.get(userId)
        return presence?.isOnline || false
    }

    return {
        userPresence,
        getPresence,
        isOnline,
    }
}
