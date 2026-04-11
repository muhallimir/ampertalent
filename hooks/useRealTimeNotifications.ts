import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { useUserProfile } from '@/hooks/useUserProfile'
import { getNotificationPriorityStyle } from '@/lib/notificationStyles'

interface RealTimeNotification {
  id: string
  type: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high'
  actionUrl?: string
  data?: Record<string, any>
  showToast?: boolean
  toastVariant?: 'default' | 'success' | 'destructive'
  toastDuration?: number
}

interface SSEMessage {
  type: 'connected' | 'notification' | 'broadcast'
  notification?: RealTimeNotification
  message?: string
  timestamp: string
}

export function useRealTimeNotifications() {
  const { profile } = useUserProfile()
  const { addToast } = useToast()
  const eventSourceRef = useRef<EventSource | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [lastNotification, setLastNotification] = useState<RealTimeNotification | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = () => {
    // Only connect if user is authenticated
    if (!profile?.id) {
      return
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    console.log('🔌 Connecting to real-time notifications...')
    
    // Create EventSource connection
    const eventSource = new EventSource('/api/notifications/stream')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('✅ Real-time notifications connected')
      setIsConnected(true)
      setConnectionError(null)
      reconnectAttempts.current = 0 // Reset reconnect attempts on successful connection
    }

    eventSource.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data)
        console.log('📨 Real-time message received:', data)

        switch (data.type) {
          case 'connected':
            console.log('🎉 Real-time notifications ready')
            break

          case 'notification':
          case 'broadcast':
            if (data.notification) {
              handleNotification(data.notification)
            }
            break

          default:
            console.log('Unknown message type:', data.type)
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('❌ Real-time notifications error:', error)
      setIsConnected(false)
      
      // Attempt to reconnect with exponential backoff
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000) // Max 30 seconds
        reconnectAttempts.current++
        setConnectionError(`Connection lost. Attempting to reconnect in ${delay/1000}s... (${reconnectAttempts.current}/${maxReconnectAttempts})`)
        
        setTimeout(() => {
          console.log(`🔁 Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`)
          connect()
        }, delay)
      } else {
        setConnectionError('Connection failed. Please refresh the page to reconnect.')
      }
    }
  }

  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting real-time notifications')
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsConnected(false)
      reconnectAttempts.current = 0
    }
  }, [profile?.id])

  const handleNotification = (notification: RealTimeNotification) => {
    console.log('🔔 Processing notification:', notification)
    
    // Update last notification state
    setLastNotification(notification)

    // Show toast if requested
    const isOnMessagesPage =
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/seeker/messages') ||
        window.location.pathname.startsWith('/employer/messages') ||
        window.location.pathname === '/messages')

    if (notification.showToast && !isOnMessagesPage) {
      const priorityStyle = getNotificationPriorityStyle(notification.priority)
      const toastConfig: any = {
        title: notification.title,
        description: notification.message,
        variant: priorityStyle.toastVariant,
        duration: notification.toastDuration || 5000,
        className: priorityStyle.toastClassName,
        titleClassName: priorityStyle.toastTitleClass
      }

      // Add click handler if actionUrl exists
      toastConfig.onClick = () => {
        window.dispatchEvent(new CustomEvent('realTimeToastClick', { detail: notification }))
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl
        }
      }
      toastConfig.description = notification.actionUrl
        ? `${notification.message} (Click to view)`
        : notification.message

      addToast(toastConfig)
    }

    // Trigger custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('realTimeNotification', {
      detail: notification
    }))
  }

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
      reconnectAttempts.current = 0
    }
  }

  const reconnect = () => {
    console.log('🔄 Manual reconnection requested')
    reconnectAttempts.current = 0
    connect()
  }

  return {
    isConnected,
    connectionError,
    lastNotification,
    disconnect,
    reconnect
  }
}

// Hook for listening to specific notification types
export function useNotificationListener(
  notificationType: string,
  callback: (notification: RealTimeNotification) => void
) {
  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      const notification = event.detail as RealTimeNotification
      if (notification.type === notificationType) {
        callback(notification)
      }
    }

    window.addEventListener('realTimeNotification', handleNotification as EventListener)
    
    return () => {
      window.removeEventListener('realTimeNotification', handleNotification as EventListener)
    }
  }, [notificationType, callback])
}
