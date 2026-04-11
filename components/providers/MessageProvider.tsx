'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useNotificationListener } from '@/hooks/useRealTimeNotifications'

interface MessageContextValue {
  unreadCount: number
  isLoading: boolean
  refetch: () => Promise<void>
  incrementUnreadCount: () => void
  decrementUnreadCount: () => void
  resetUnreadCount: () => void
}

const MessageContext = createContext<MessageContextValue | undefined>(undefined)

export function MessageProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { socket } = useSocket()
  const hasFetchedRef = useRef(false)

  const fetchUnreadCount = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/messages/unread-count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch on mount
  useEffect(() => {
    if (!hasFetchedRef.current) {
      fetchUnreadCount()
      hasFetchedRef.current = true
    }
  }, [])

  // Polling as fallback (60s interval) - only if Socket.IO is not available
  useEffect(() => {
    if (!socket) {
      const interval = setInterval(fetchUnreadCount, 60000)
      return () => clearInterval(interval)
    }
  }, [socket])

  // Listen for real-time message updates via Socket.IO
  useEffect(() => {
    if (!socket) return

    const handleMessageReceived = (data: any) => {
      console.log('🔄 MessageProvider: Received message_received via Socket.IO:', data)
      setUnreadCount(prev => {
        const newCount = prev + 1
        console.log('✅ MessageProvider: Incremented unread count from', prev, 'to', newCount)
        return newCount
      })
    }

    const handleNewMessage = (data: any) => {
      console.log('🔄 MessageProvider: Received new_message via Socket.IO:', data)
      setUnreadCount(prev => {
        const newCount = prev + 1
        console.log('✅ MessageProvider: Incremented unread count from', prev, 'to', newCount, 'via new_message')
        return newCount
      })
    }

    socket.on('message_received', handleMessageReceived)
    socket.on('new_message', handleNewMessage)

    return () => {
      socket.off('message_received', handleMessageReceived)
      socket.off('new_message', handleNewMessage)
    }
  }, [socket])

  // Listen for real-time message updates via SSE (fallback)
  useNotificationListener('new_message', (notification) => {
    console.log('📡 MessageProvider: Received new_message via SSE, updating unread count', notification)
    fetchUnreadCount()
  })

  const incrementUnreadCount = () => {
    setUnreadCount(prev => prev + 1)
  }

  const decrementUnreadCount = () => {
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const resetUnreadCount = () => {
    setUnreadCount(0)
  }

  const value = {
    unreadCount,
    isLoading,
    refetch: fetchUnreadCount,
    incrementUnreadCount,
    decrementUnreadCount,
    resetUnreadCount
  }

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  )
}

export function useMessages() {
  const context = useContext(MessageContext)
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessageProvider')
  }
  return context
}
