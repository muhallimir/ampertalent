'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Building, Clock, MessageCircle, Check, CheckCheck, Send, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Message {
    id: string
    subject: string
    content: string
    isRead: boolean
    deliveryStatus?: string
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

interface MessageItemProps {
    message: Message
    onClick?: () => void
    showThreadIndicator?: boolean
}

function getStatusDisplay(status?: string) {
    switch (status) {
        case 'sending':
            return { icon: Loader2, text: 'Sending...', color: 'text-yellow-500' }
        case 'sent':
            return { icon: Send, text: 'Sent', color: 'text-blue-500' }
        case 'delivered':
            return { icon: Check, text: 'Delivered', color: 'text-green-500' }
        case 'read':
            return { icon: CheckCheck, text: 'Read', color: 'text-green-600' }
        default:
            return null
    }
}

export function MessageItem({
    message,
    onClick,
    showThreadIndicator = false
}: MessageItemProps) {
    const statusDisplay = getStatusDisplay(message.deliveryStatus)
    return (
        <Card
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${!message.isRead ? 'border-l-4 border-l-brand-teal bg-muted/20' : ''
                } ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        {message.sender.profilePictureUrl ? (
                            <Image
                                src={message.sender.profilePictureUrl}
                                alt={message.sender.name}
                                width={40}
                                height={40}
                                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
                            />
                        ) : (
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold truncate text-sm">
                                {message.sender.name}
                            </h4>
                            {message.sender.employer && (
                                <Badge variant="outline" className="text-xs">
                                    <Building className="h-3 w-3 mr-1" />
                                    {message.sender.employer.companyName}
                                </Badge>
                            )}
                            {!message.isRead && (
                                <Badge variant="default" className="text-xs">
                                    New
                                </Badge>
                            )}
                            {showThreadIndicator && (
                                <Badge variant="secondary" className="text-xs">
                                    <MessageCircle className="h-3 w-3 mr-1" />
                                    Thread
                                </Badge>
                            )}
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {message.content}
                        </p>

                        {message.application && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                <Building className="h-3 w-3" />
                                Re: {message.application.job.title}
                            </div>
                        )}

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(message.createdAt).toLocaleDateString()}
                            {statusDisplay && (
                                <div className={`flex items-center gap-1 ml-2 ${statusDisplay.color}`}>
                                    <statusDisplay.icon className="h-3 w-3" />
                                    <span>{statusDisplay.text}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}