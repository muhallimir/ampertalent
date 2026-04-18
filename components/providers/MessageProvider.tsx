'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
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

  // Polling as fallback (60s interval)
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 60000)
    return () => clearInterval(interval)
  }, [])


  // Listen for real-time message updates via SSE
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
