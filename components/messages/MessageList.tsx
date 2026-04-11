'use client'

import { MessageItem } from './MessageItem'

interface Message {
    id: string
    subject: string
    content: string
    isRead: boolean
    createdAt: string
    sender: {
        id: string
        name: string
        firstName?: string
        lastName?: string
        profilePictureUrl?: string
        employer?: {
            companyName: string
        }
    }
    application?: {
        id: string
        job: {
            id: string
            title: string
            companyName: string
        }
    }
    threadId: string
}

interface MessageListProps {
    messages: Message[]
    onMessageClick?: (message: Message) => void
    showThreadIndicator?: boolean
    emptyMessage?: string
}

export function MessageList({
    messages,
    onMessageClick,
    showThreadIndicator = false,
    emptyMessage = "No messages found"
}: MessageListProps) {
    if (messages.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                {emptyMessage}
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {messages.map((message) => (
                <MessageItem
                    key={message.id}
                    message={message}
                    onClick={() => onMessageClick?.(message)}
                    showThreadIndicator={showThreadIndicator}
                />
            ))}
        </div>
    )
}