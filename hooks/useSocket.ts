'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '@clerk/nextjs'
import { useUserProfile } from './useUserProfile'

interface UseSocketReturn {
    socket: Socket | null
    isConnected: boolean
    joinThread: (threadId: string) => void
    leaveThread: (threadId: string) => void
    sendTypingStart: (threadId: string) => void
    sendTypingStop: (threadId: string) => void
    sendMessage: (threadId: string, message: any) => void
    requestOnlineStatus: (userIds: string[]) => void
}

// ---------- method called SOCKET SINGLETON STATE (module-level) ----------
let globalSocket: Socket | null = null
let globalUserId: string | null = null

// Guards against concurrent setupSocket execution
let setupInProgress = false

// Cooldown so React mounting/unmounting doesn't spawn 10 sockets at once
let lastSocketCreationTime = 0
const SOCKET_CREATION_COOLDOWN = 5000 // ms

// Anyone using the hook can "subscribe" to connection state changes
const connectionListeners: Set<(connected: boolean) => void> = new Set()

export function useSocket(): UseSocketReturn {
    const auth = useAuth()
    const { getToken, userId } = auth || { getToken: null, userId: null }
    const { profile } = useUserProfile()
    const [isConnected, setIsConnected] = useState(globalSocket?.connected || false)

    useEffect(() => {
        // Register this component's connection state setter
        connectionListeners.add(setIsConnected)
        console.log(
            '🔌 useSocket: Component mounted, listeners:',
            connectionListeners.size
        )

        const setupSocket = async () => {
            // 0. Guard against concurrent execution
            if (setupInProgress) {
                console.log('⏸️ useSocket: Setup already in progress, skipping')
                return
            }

            // 1. If there's no logged-in user yet, don't open a socket
            if (!userId) {
                console.log('🔌 useSocket: No userId yet, skipping socket connect')
                return
            }

            // 2. If we already have a socket for this same user and it's live, reuse it
            if (globalSocket && globalUserId === userId && globalSocket.connected) {
                console.log('🔌 useSocket: Reusing existing connected socket for', userId)
                setIsConnected(true)
                return
            }

            // 3. If the socket belongs to a *different* user, kill it and recreate
            if (globalSocket && globalUserId !== userId) {
                console.log('🔄 useSocket: User changed, disconnecting old socket')
                globalSocket.disconnect()
                globalSocket = null
            }

            // 4. Basic flood protection
            const nowTs = Date.now()
            if (nowTs - lastSocketCreationTime < SOCKET_CREATION_COOLDOWN) {
                console.log('🕐 useSocket: Creation cooldown hit, not creating new socket')
                return
            }

            // Mark setup as in progress BEFORE any async operations
            setupInProgress = true
            globalUserId = userId
            lastSocketCreationTime = nowTs

            try {
                // 5. Get token from Clerk (if available)
                // let token: string | null = null
                // try {
                //     token = await getToken({ template: 'realtime' })
                // } catch (err) {
                //     console.warn('⚠️ useSocket: Failed to get Clerk token, continuing anyway:', err)
                // }

                // Double-check conditions haven't changed during async token fetch
                if (!userId || (globalSocket && globalSocket.connected)) {
                    console.log('⏸️ useSocket: Conditions changed during token fetch, aborting')
                    return
                }

                // 6. Figure out server URL
                const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'https://amper-talent-saas-realtime-server-1.onrender.com'

                // 7. Actually create the socket
                const socket = io(SOCKET_URL, {
                    path: '/socket',
                    withCredentials: true,
                    // auth: token ? { token: `Bearer ${token}` } : undefined,
                    auth: { userId },
                    reconnection: true,
                    reconnectionDelay: 3000,
                    reconnectionDelayMax: 15000,
                    reconnectionAttempts: 5,
                    timeout: 20000,
                })

                globalSocket = socket
                console.log('🔌 useSocket: Created new socket instance')

                // --- method called Core lifecycle listeners ---
                socket.on('connect', () => {
                    const now = new Date().toISOString()
                    console.log(`✅ [${now}] Socket connected as ${socket.id}`)
                    connectionListeners.forEach(fn => fn(true))

                    // Join this user's personal room so they get direct events
                    const userRoomId = profile?.id || userId
                    socket.emit('join_user', userRoomId)
                    console.log(`👤 [${now}] Joined user room: user_${userRoomId}`)
                })

                socket.on('disconnect', reason => {
                    const now = new Date().toISOString()
                    console.log(`🔌 [${now}] Socket disconnected. Reason: ${reason}`)
                    connectionListeners.forEach(fn => fn(false))
                })

                socket.on('connect_error', error => {
                    const now = new Date().toISOString()
                    console.error(`❌ [${now}] Socket connect_error:`, error)
                    connectionListeners.forEach(fn => fn(false))
                })

                // --- method called OPTIONAL: global listeners ---
                socket.on('new_thread', data => {
                    console.log('🧩 [global] useSocket heard new_thread:', data)
                })

                socket.on('new_message', data => {
                    console.log('💬 [global] useSocket heard new_message:', data)
                })

                socket.on('message_received', data => {
                    console.log('📨 [global] useSocket heard message_received:', data)
                })

                socket.on('user_presence', data => {
                    console.log('🟢 [global] presence update:', data)
                })

                socket.on('typing_start', data => {
                    console.log('⌨️ [global] typing_start:', data)
                })

                socket.on('typing_stop', data => {
                    console.log('⌨️ [global] typing_stop:', data)
                })

                socket.on('online_status_response', data => {
                    console.log('🌐 [global] online_status_response:', data)
                })
            } finally {
                // Always clear the in-progress flag, even if setup fails
                setupInProgress = false
                console.log('✅ useSocket: Setup completed, flag cleared')
            }
        }

        setupSocket()

        // Cleanup for this *component* (not the socket singleton!)
        return () => {
            connectionListeners.delete(setIsConnected)

            // Only tear down the actual socket if this was the *last* listener using it
            if (connectionListeners.size === 0 && globalSocket) {
                console.log('🧹 useSocket: Last subscriber unmounted, disconnecting socket')
                globalSocket.disconnect()
                globalSocket = null
                globalUserId = null
                // Also clear the setup flag when fully cleaning up
                setupInProgress = false
            }
        }
    }, [userId, getToken, profile?.id])

    // -------- method called Helper fns the rest of the app can call --------

    const joinThread = (threadId: string) => {
        if (globalSocket && globalSocket.connected && threadId) {
            console.log('🔥 joinThread ->', threadId)
            globalSocket.emit('join_thread', threadId)
        }
    }

    const leaveThread = (threadId: string) => {
        if (globalSocket && globalSocket.connected && threadId) {
            console.log('🔙 leaveThread ->', threadId)
            globalSocket.emit('leave_thread', threadId)
        }
    }

    const sendTypingStart = (threadId: string) => {
        if (globalSocket && globalSocket.connected && threadId) {
            console.log('⌨️ sendTypingStart ->', threadId)
            globalSocket.emit('typing_start', { threadId })
        }
    }

    const sendTypingStop = (threadId: string) => {
        if (globalSocket && globalSocket.connected && threadId) {
            console.log('⌨️ sendTypingStop ->', threadId)
            globalSocket.emit('typing_stop', { threadId })
        }
    }

    const requestOnlineStatus = (userIds: string[]) => {
        if (globalSocket && globalSocket.connected && Array.isArray(userIds) && userIds.length > 0) {
            console.log('🔍 requestOnlineStatus ->', userIds)
            globalSocket.emit('get_online_status', userIds)
        }
    }

    const sendMessage = (threadId: string, message: any) => {
        if (globalSocket && globalSocket.connected && threadId) {
            console.log('📨 sendMessage ->', { threadId, message })
            globalSocket.emit('new_message', { threadId, message })
        }
    }

    return {
        socket: globalSocket,
        isConnected,
        joinThread,
        leaveThread,
        sendTypingStart,
        sendTypingStop,
        sendMessage,
        requestOnlineStatus,
    }
}