'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useNotificationListener } from '@/hooks/useRealTimeNotifications'
import { useUserProfile } from '@/hooks/useUserProfile'

interface EmployerChatButtonProps {
    applicationId?: string
    jobId?: string
    seekerId?: string
    size?: 'sm' | 'md' | 'lg'
    variant?: 'default' | 'outline' | 'ghost'
    showUnreadBadge?: boolean
    className?: string
    disabled?: boolean
}

export function EmployerChatButton({
    applicationId,
    jobId,
    seekerId,
    size = 'sm',
    variant = 'outline',
    showUnreadBadge = true,
    className = '',
    disabled = false
}: EmployerChatButtonProps) {
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const { profile } = useUserProfile()

    useEffect(() => {
        if (!showUnreadBadge) return

        const fetchUnreadCount = async () => {
            setIsLoading(true)
            try {
                const response = await fetch('/api/messages/inbox?limit=1')

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

        fetchUnreadCount()

        // Reduced polling - 60 seconds is sufficient since Socket.IO provides real-time updates
        const interval = setInterval(fetchUnreadCount, 60000)
        return () => clearInterval(interval)
    }, [showUnreadBadge])

    // Listen for real-time message updates via SSE
    useNotificationListener('new_message', (notification) => {
        console.log('📡 EmployerChatButton: Received new_message via SSE, updating unread count', notification)
        if (showUnreadBadge) {
            const fetchUnreadCount = async () => {
                try {
                    // Build URL with context parameters
                    const params = new URLSearchParams()
                    if (jobId) params.set('jobId', jobId)
                    if (applicationId) params.set('applicationId', applicationId)

                    const url = `/api/messages/unread-count${params.toString() ? `?${params.toString()}` : ''}`
                    const response = await fetch(url)

                    if (response.ok) {
                        const data = await response.json()
                        setUnreadCount(data.unreadCount || 0)
                        console.log('✅ EmployerChatButton: SSE updated unread count to', data.unreadCount || 0)
                    }
                } catch (error) {
                    console.error('❌ EmployerChatButton: SSE error fetching unread count:', error)
                }
            }
            fetchUnreadCount()
        }
    })

    // Build the chat URL with context
    const buildChatUrl = () => {
        const params = new URLSearchParams()
        if (applicationId) params.set('applicationId', applicationId)
        if (jobId) params.set('jobId', jobId)
        if (seekerId) params.set('recipientId', seekerId)

        const queryString = params.toString()
        return `/employer/messages${queryString ? `?${queryString}` : ''}`
    }

    const buttonSizeClasses = {
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-3 py-2',
        lg: 'text-base px-4 py-2'
    }

    const iconSizeClasses = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5'
    }

    return (
        <div className="relative inline-block">
            {disabled ? (
                <Button
                    variant={variant}
                    size={size === 'md' ? 'default' : size}
                    className={`${buttonSizeClasses[size]} transition-all ${className}`}
                    disabled={true}
                    title="This applicant has turned off direct messages"
                >
                    <MessageSquare className={`${iconSizeClasses[size]} mr-1`} />
                    <span className="hidden sm:inline">Chat Off</span>
                    <span className="sm:hidden">🚫</span>
                </Button>
            ) : (
                <Button
                    asChild
                    variant={variant}
                    size={size === 'md' ? 'default' : size}
                    className={`${buttonSizeClasses[size]} hover:bg-purple-50 transition-all ${className}`}
                    disabled={isLoading}
                    style={{ color: '#9333EA', borderColor: '#9333EA' }}
                >
                    <Link href={buildChatUrl()} className="flex items-center" style={{ color: '#9333EA' }}>
                        <MessageSquare className={`${iconSizeClasses[size]} mr-1`} />
                        <span className="hidden sm:inline">Chat</span>
                        <span className="sm:hidden">💬</span>
                    </Link>
                </Button>
            )}

            {!disabled && showUnreadBadge && unreadCount > 0 && (
                <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 min-w-[20px] rounded-full px-1 flex items-center justify-center text-[10px] font-bold shadow-md animate-in zoom-in duration-200"
                >
                    {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
            )}
        </div>
    )
}
