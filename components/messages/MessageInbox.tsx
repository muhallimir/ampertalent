'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
    Send,
    User,
    ArrowLeft,
    Users,
    Building2,
    MessageSquare,
    Search,
    AlertCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

import { MessageComposer } from './MessageComposer'
import { MessageThread } from './MessageThread'
import { useNotificationListener } from '@/hooks/useRealTimeNotifications'
import { useUserProfile } from '@/hooks/useUserProfile'
import { getImpersonationSession } from '@/lib/admin-impersonation'

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
    otherParticipant?: {
        id: string
        name: string
        firstName?: string
        lastName?: string
        profilePictureUrl?: string
        presignedProfilePictureUrl?: string
        employer?: {
            companyName: string
        }
    } | null
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

interface InboxData {
    messages: Message[]
    pagination: {
        total: number
        limit: number
        offset: number
        hasMore: boolean
    }
    unreadCount: number
}

interface MessageInboxProps {
    userType?: 'employer' | 'seeker'
}

export function MessageInbox({ userType = 'employer' }: MessageInboxProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { profile } = useUserProfile()
    const currentUserId = profile?.id

    const [inboxData, setInboxData] = useState<InboxData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showComposer, setShowComposer] = useState(false)
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
    const [preselectedRecipient, setPreselectedRecipient] = useState<{
        id: string
        name: string
        jobId?: string
        jobTitle?: string
        sourcePage?: string
    } | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

    // --------------------------------------------------
    const fetchInbox = useCallback(async (options?: { showSpinner?: boolean }) => {
        const showSpinner = options?.showSpinner ?? true
        try {
            if (showSpinner) {
                setLoading(true)
            }
            const impersonationSession = typeof window !== 'undefined' ? getImpersonationSession() : null
            const headers: HeadersInit = {}
            if (impersonationSession) {
                headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
                headers['x-admin-user-id'] = impersonationSession.adminId
            }
            const response = await fetch('/api/messages/inbox', { headers })
            if (!response.ok) {
                throw new Error('Failed to fetch messages')
            }
            const data = await response.json()
            setInboxData(data)
            setError(null)
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'An error occurred while loading messages'
            )
        } finally {
            if (showSpinner) {
                setLoading(false)
            }
        }
    }, [])

    // Initial load
    useEffect(() => {
        fetchInbox({ showSpinner: true })
    }, [fetchInbox])

    // --------------------------------------------------
    // SSE fallback for new_message
    // --------------------------------------------------
    const handleSseNewMessage = useCallback(() => {
        fetchInbox({ showSpinner: false })
    }, [fetchInbox])

    useNotificationListener('new_message', handleSseNewMessage)

    useNotificationListener('message_read', (notification) => {
        if (!notification.data?.threadId || !notification.data?.messageId) return
        setInboxData(prev => {
            if (!prev) return prev
            return {
                ...prev,
                messages: prev.messages.map(thread =>
                    thread.threadId === notification.data.threadId
                        ? { ...thread, isRead: true }
                        : thread
                )
            }
        })
    })

    // --------------------------------------------------
    // Handle URL params for preselected recipient (compose mode)
    // --------------------------------------------------
    useEffect(() => {
        if (!searchParams) return

        const compose = searchParams.get('compose')
        const recipientId = searchParams.get('recipientId')
        const recipientName = searchParams.get('recipientName')
        const jobId = searchParams.get('jobId')
        const jobTitle = searchParams.get('jobTitle')

        if (compose === 'true' && recipientId && recipientName && !showComposer) {
            const referrer = document.referrer
            let sourcePage = ''

            if (referrer && referrer.includes('/employer/jobs/')) {
                const jobIdMatch = referrer.match(/\/employer\/jobs\/([^\/]+)\/applications/)?.[1]
                if (jobIdMatch) {
                    sourcePage = `/employer/jobs/${jobIdMatch}/applications`
                }
            } else if (referrer && referrer.includes('/employer/applications')) {
                sourcePage = '/employer/applications'
            }

            setPreselectedRecipient({
                id: recipientId,
                name: recipientName,
                jobId: jobId || undefined,
                jobTitle: jobTitle || undefined,
                sourcePage,
            })
            setShowComposer(true)
        }
    }, [searchParams, showComposer])

    // --------------------------------------------------
    // After message is sent from composer
    // --------------------------------------------------
    const handleMessageSent = (threadId?: string) => {
        setShowComposer(false)
        setPreselectedRecipient(null)
        fetchInbox()
        if (threadId) {
            setSelectedThreadId(threadId)
        }
    }

    // --------------------------------------------------
    // Closing the composer (smart back behavior)
    // --------------------------------------------------
    const handleCloseComposer = () => {
        if (preselectedRecipient?.sourcePage) {
            router.push(preselectedRecipient.sourcePage)
            return
        }

        const hasPreselectedContext =
            preselectedRecipient && (preselectedRecipient.jobId || preselectedRecipient.jobTitle)

        if (hasPreselectedContext) {
            router.push('/employer/applications')
            return
        }

        setShowComposer(false)
        setPreselectedRecipient(null)
    }

    // --------------------------------------------------
    // Selecting and leaving a thread
    // --------------------------------------------------
    const handleThreadSelect = (threadId: string) => {
        setSelectedThreadId(threadId)
    }

    const handleBackToInbox = () => {
        setSelectedThreadId(null)
        fetchInbox()
    }

    // --------------------------------------------------
    // Search filter for sidebar
    // --------------------------------------------------
    const filteredMessages =
        inboxData?.messages.filter(message => {
            if (!searchQuery) return true
            const q = searchQuery.toLowerCase()
            return (
                message.sender.name.toLowerCase().includes(q) ||
                message.content.toLowerCase().includes(q) ||
                (message.sender.employer?.companyName?.toLowerCase().includes(q)) ||
                (message.application?.job.title.toLowerCase().includes(q))
            )
        }) || []

    // --------------------------------------------------
    // Render
    // --------------------------------------------------
    return (
        <div className="bg-gray-50 h-full flex flex-col">
            <div className="container mx-auto px-4 py-6 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <div className="flex items-center space-x-4">
                        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                {userType === 'employer' ? (
                                    <>
                                        <Users className="h-6 w-6 mr-2 text-green-600" />
                                        Chat with Seekers
                                    </>
                                ) : (
                                    <>
                                        <Building2 className="h-6 w-6 mr-2 text-blue-600" />
                                        Chat with Employers
                                    </>
                                )}
                            </h1>
                            <p className="text-gray-600">
                                {userType === 'employer'
                                    ? 'Manage conversations with potential candidates for your job postings'
                                    : 'Manage conversations with employers about your applications'}
                            </p>
                        </div>
                    </div>
                    {userType === 'employer' && (
                        <Button
                            onClick={() => {
                                setShowComposer(true)
                                setSelectedThreadId(null)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Send className="h-4 w-4 mr-2" />
                            New Message
                        </Button>
                    )}
                </div>

                {/* Seeker restrictions banner */}
                {userType === 'seeker' && (
                    <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Building2 className="h-4 w-4 text-blue-600" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                                    Messaging Restrictions
                                </h3>
                                <p className="text-sm text-blue-700">
                                    You can reply to employers who have reached out to you directly. Only employers can start new conversations.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                    {/* Sidebar / thread list */}
                    <Card className="lg:col-span-1 flex flex-col">
                        <CardHeader className="pb-3 flex-shrink-0">
                            <CardTitle className="text-lg">
                                {userType === 'employer' ? 'Seeker Conversations' : 'Employer Conversations'}
                            </CardTitle>

                            {/* Search bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search conversations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                    autoComplete="off"
                                />
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 p-0 overflow-y-auto">
                            {error && (
                                <div className="p-4 border-b bg-red-50">
                                    <p className="text-red-600 text-sm">{error}</p>
                                    <Button variant="outline" onClick={fetchInbox} className="mt-2" size="sm">
                                        Try Again
                                    </Button>
                                </div>
                            )}

                            {loading ? (
                                <div className="p-4 space-y-2">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="p-3 border-b border-gray-100">
                                            <div className="flex items-start gap-3">
                                                <Skeleton className="h-10 w-10 rounded-full" />
                                                <div className="flex-1 space-y-2">
                                                    <Skeleton className="h-4 w-3/4" />
                                                    <Skeleton className="h-3 w-1/2" />
                                                    <Skeleton className="h-3 w-full" />
                                                </div>
                                                <Skeleton className="h-3 w-16" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : inboxData?.messages.length === 0 ? (
                                <div className="text-center py-8 px-4">
                                    <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                                    <p className="text-sm text-gray-600">No messages yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {filteredMessages.map((message) => {
                                        const isSelected = selectedThreadId === message.threadId
                                        const isUnread = !message.isRead

                                        return (
                                            <div
                                                key={message.threadId}
                                                className={[
                                                    'p-4 cursor-pointer transition-all duration-200 relative',
                                                    message.application ? 'min-h-[100px]' : 'min-h-[80px]',
                                                    // Selected: orange bar
                                                    isSelected
                                                        ? 'bg-orange-50 border-l-4 border-l-orange-500 shadow-md'
                                                        // Unread but not selected: subtle gray bar
                                                        : isUnread
                                                            ? 'bg-white border-l-2 border-l-gray-200 hover:bg-gray-50'
                                                            // Read and not selected
                                                            : 'bg-white hover:bg-gray-50 border-l-2 border-l-transparent',
                                                ].join(' ')}
                                                onClick={() => handleThreadSelect(message.threadId)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="relative h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                                        {message.otherParticipant &&
                                                            (message.otherParticipant.presignedProfilePictureUrl ||
                                                                message.otherParticipant.profilePictureUrl) ? (
                                                            <Image
                                                                src={
                                                                    message.otherParticipant.presignedProfilePictureUrl ||
                                                                    message.otherParticipant.profilePictureUrl ||
                                                                    ''
                                                                }
                                                                alt={message.otherParticipant.name}
                                                                width={32}
                                                                height={32}
                                                                className="h-8 w-8 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <User className="h-4 w-4 text-gray-500" />
                                                        )}

                                                        {message.otherParticipant &&
                                                            onlineUsers.has(message.otherParticipant.id) && (
                                                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                                                            )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                {message.application ? (
                                                                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                                                        Chat with{' '}
                                                                        {message.otherParticipant?.name || message.sender.name}{' '}
                                                                        regarding {message.application.job.title}
                                                                    </p>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                                            Chat with{' '}
                                                                            {message.otherParticipant?.name || message.sender.name}
                                                                        </p>
                                                                        {message.otherParticipant &&
                                                                            onlineUsers.has(message.otherParticipant.id) && (
                                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full text-[10px] font-medium flex-shrink-0">
                                                                                    <div className="w-1 h-1 bg-green-500 rounded-full" />
                                                                                    Online
                                                                                </span>
                                                                            )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {!message.isRead && (
                                                                <div className="bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
                                                                    New
                                                                </div>
                                                            )}
                                                        </div>

                                                        {message.otherParticipant?.employer && (
                                                            <p className="text-xs text-gray-500 truncate mb-1">
                                                                {message.otherParticipant.employer.companyName}
                                                            </p>
                                                        )}

                                                        <p className="text-xs text-gray-500 truncate mb-1">
                                                            {message.content}
                                                        </p>

                                                        {message.application && (
                                                            <p className="text-xs text-gray-400 truncate mb-1">
                                                                Re: {message.application.job.title}
                                                            </p>
                                                        )}

                                                        <p className="text-xs text-gray-400">
                                                            {new Date(message.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {inboxData?.pagination.hasMore && (
                                        <div className="p-4 text-center border-t">
                                            <Button variant="outline" onClick={fetchInbox} size="sm">
                                                Load More Messages
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Right side */}
                    <Card className="lg:col-span-3 flex flex-col">
                        {selectedThreadId ? (
                            <MessageThread threadId={selectedThreadId} onBack={handleBackToInbox} />
                        ) : showComposer ? (
                            <MessageComposer
                                onCancel={handleCloseComposer}
                                onSent={handleMessageSent}
                                initialRecipientId={preselectedRecipient?.id}
                                initialJobId={preselectedRecipient?.jobId}
                                initialJobTitle={preselectedRecipient?.jobTitle}
                                autoJobContext={!!preselectedRecipient?.jobId}
                                sourcePage={preselectedRecipient?.sourcePage}
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                                <div className="text-center max-w-sm">
                                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                                        <MessageSquare className="h-8 w-8 md:h-10 md:w-10 text-blue-500" />
                                    </div>
                                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                                        Select a Conversation
                                    </h3>
                                    <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
                                        Choose a message from the list to view the conversation.
                                    </p>
                                    {userType === 'employer' && (
                                        <Button
                                            onClick={() => {
                                                setShowComposer(true)
                                                setSelectedThreadId(null)
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                                            size="default"
                                        >
                                            <Send className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Start New Message</span>
                                            <span className="sm:hidden">New Message</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Footer note */}
                <div className="mt-6 text-center text-sm text-gray-500 flex-shrink-0">
                    <p className="flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Conversations may be reviewed to ensure quality, professionalism, and compliance
                        with our communication guidelines.
                    </p>
                </div>
            </div>
        </div>
    )
}
