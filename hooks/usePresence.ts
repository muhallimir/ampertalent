'use client'

import { useEffect, useState } from 'react'
import { useSocket } from './useSocket'

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
    const { socket } = useSocket()
    const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map())

    useEffect(() => {
        if (!socket) return

        const handleUserOnline = (data: { userId: string }) => {
            setUserPresence(prev => {
                const newMap = new Map(prev)
                newMap.set(data.userId, {
                    userId: data.userId,
                    isOnline: true,
                    lastSeenAt: new Date().toISOString()
                })
                return newMap
            })
        }

        const handleUserOffline = (data: { userId: string }) => {
            setUserPresence(prev => {
                const newMap = new Map(prev)
                const existingPresence = prev.get(data.userId)
                newMap.set(data.userId, {
                    userId: data.userId,
                    isOnline: false,
                    lastSeenAt: existingPresence?.lastSeenAt || new Date().toISOString()
                })
                return newMap
            })
        }

        socket.on('user_online', handleUserOnline)
        socket.on('user_offline', handleUserOffline)

        return () => {
            socket.off('user_online', handleUserOnline)
            socket.off('user_offline', handleUserOffline)
        }
    }, [socket])

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