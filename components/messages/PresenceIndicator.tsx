'use client'

import { usePresence } from '@/hooks/usePresence'

interface PresenceIndicatorProps {
    userId: string
    showText?: boolean
    size?: 'sm' | 'md' | 'lg'
}

export function PresenceIndicator({ userId, showText = false, size = 'sm' }: PresenceIndicatorProps) {
    const { isOnline, getPresence } = usePresence()
    const online = isOnline(userId)
    const presence = getPresence(userId)

    const sizeClasses = {
        sm: 'w-2 h-2',
        md: 'w-3 h-3',
        lg: 'w-4 h-4'
    }

    const formatLastSeen = (lastSeenAt: string) => {
        const date = new Date(lastSeenAt)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / (1000 * 60))

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`

        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h ago`

        const diffDays = Math.floor(diffHours / 24)
        return `${diffDays}d ago`
    }

    return (
        <div className="flex items-center gap-1">
            <div
                className={`rounded-full ${sizeClasses[size]} ${online
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    }`}
                title={online ? 'Online' : presence?.lastSeenAt ? `Last seen ${formatLastSeen(presence.lastSeenAt)}` : 'Offline'}
            />
            {showText && (
                <span className={`text-xs ${online ? 'text-green-600' : 'text-gray-500'}`}>
                    {online ? 'Online' : presence?.lastSeenAt ? formatLastSeen(presence.lastSeenAt) : 'Offline'}
                </span>
            )}
        </div>
    )
}