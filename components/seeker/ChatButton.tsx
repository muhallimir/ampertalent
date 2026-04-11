'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useMessages } from '@/components/providers/MessageProvider'

interface ChatButtonProps {
    applicationId?: string
    jobId?: string
    employerId?: string
    size?: 'sm' | 'md' | 'lg'
    variant?: 'default' | 'outline' | 'ghost'
    showUnreadBadge?: boolean
    className?: string
}

export function ChatButton({
    applicationId,
    jobId,
    employerId,
    size = 'sm',
    variant = 'outline',
    showUnreadBadge = true,
    className = ''
}: ChatButtonProps) {
    const { unreadCount, isLoading } = useMessages()

    // Build the chat URL with context
    const buildChatUrl = () => {
        const params = new URLSearchParams()
        if (applicationId) params.set('applicationId', applicationId)
        if (jobId) params.set('jobId', jobId)
        if (employerId) params.set('recipientId', employerId)

        const queryString = params.toString()
        return `/seeker/messages${queryString ? `?${queryString}` : ''}`
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
            <Button
                asChild
                variant={variant}
                size={size === 'md' ? 'default' : size}
                className={`${buttonSizeClasses[size]} ${className}`}
                disabled={isLoading}
                style={{ color: '#9333EA', borderColor: '#9333EA' }}
            >
                <Link href={buildChatUrl()} className="flex items-center" style={{ color: '#9333EA' }}>
                    <MessageSquare className={`${iconSizeClasses[size]} mr-1`} />
                    <span className="hidden sm:inline">Chat</span>
                    <span className="sm:hidden">💬</span>
                </Link>
            </Button>

            {showUnreadBadge && unreadCount > 0 && (
                <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
                >
                    {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
            )}
        </div>
    )
}