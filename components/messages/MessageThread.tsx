'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSocket } from '@/hooks/useSocket';
import { useNotificationListener } from '@/hooks/useRealTimeNotifications';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getImpersonationSession } from '@/lib/admin-impersonation';

import { MessageTemplates } from './MessageTemplates';
import { MessageDrafts } from './MessageDrafts';
import { FileAttachmentUpload } from './FileAttachmentUpload';
import { InterviewScheduleIndicator } from './InterviewScheduleIndicator';
import { AttachmentPreview } from './AttachmentPreview';

import { TalentProfileModal } from '@/components/employer/TalentProfileModal';
import { ApplicantProfileModal } from '@/components/employer/ApplicantProfileModal';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

import {
    ArrowLeft,
    Send,
    Check,
    CheckCheck,
    Loader2,
    Briefcase,
    User,
    Calendar,
    Clock,
} from 'lucide-react';

/** =========================
 * Types
 * ========================= */
interface MessageAttachment {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    mimeType?: string;
    createdAt?: string;
}

interface Message {
    id: string;
    threadId: string;
    senderId: string;
    recipientId: string;
    content: string;
    isRead: boolean;
    deliveryStatus?: string;
    createdAt: string;
    attachments?: MessageAttachment[];
    sender: {
        id: string;
        name: string;
        firstName?: string;
        lastName?: string;
        profilePictureUrl?: string;
        presignedProfilePictureUrl?: string;
        employer?: { companyName: string };
    };
    application?: {
        id: string;
        job: {
            id: string;
            title: string;
            employer: { companyName: string };
        };
        interviewScheduledAt?: string;
        interviewStage?: string;
        interviewCompletedAt?: string;
    };
    job?: {
        id: string;
        title: string;
        employer: {
            companyName: string;
            user: { name: string };
        };
    };
}

interface ParticipantDetail {
    id: string;
    clerkUserId?: string | null;
    name: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
    presignedProfilePictureUrl?: string;
    employer?: { companyName: string };
}

interface ThreadMeta {
    id: string;
    participants: string[];
    participantDetails?: ParticipantDetail[];
    lastMessageAt: string;
}

interface ThreadApiResponse {
    success: boolean;
    thread: ThreadMeta;
    messages: Message[];
    nextCursor?: string | null;
}

interface MessageThreadProps {
    threadId: string;
    onBack: () => void;
}

interface FilterState {
    startDate?: Date;
    endDate?: Date;
    senderId?: string;
    readStatus?: 'read' | 'unread' | 'all';
    quickFilter?: 'today' | 'week' | 'unread';
}

/** =========================
 * Typing Indicator Hook
 * ========================= */
function useTypingIndicator(threadId: string, isConnected: boolean) {
    const { sendTypingStart, sendTypingStop } = useSocket();
    const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = useRef(false);
    const lastStartTimeRef = useRef<number>(0);

    const STOP_DELAY = 3000; // 3 seconds after stopping typing
    const START_THROTTLE = 2000; // Only send "start" every 2 seconds max

    const handleTyping = useCallback(() => {
        if (!isConnected) return;

        const now = Date.now();

        // Clear any pending "stop" 
        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
        }

        // Only send "start" if not already typing OR enough time passed
        if (!isTypingRef.current || now - lastStartTimeRef.current > START_THROTTLE) {
            sendTypingStart(threadId);
            isTypingRef.current = true;
            lastStartTimeRef.current = now;
            console.log('⌨️ Sent typing_start');
        }

        // Schedule "stop" after user stops typing
        stopTimeoutRef.current = setTimeout(() => {
            if (isTypingRef.current) {
                sendTypingStop(threadId);
                isTypingRef.current = false;
                console.log('⌨️ Sent typing_stop (auto)');
            }
        }, STOP_DELAY);
    }, [threadId, isConnected, sendTypingStart, sendTypingStop]);

    const stopTyping = useCallback(() => {
        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
        }
        if (isTypingRef.current) {
            sendTypingStop(threadId);
            isTypingRef.current = false;
            console.log('⌨️ Sent typing_stop (manual)');
        }
    }, [threadId, sendTypingStop]);

    // Cleanup on unmount or thread change
    useEffect(() => {
        return () => {
            if (stopTimeoutRef.current) {
                clearTimeout(stopTimeoutRef.current);
            }
            if (isTypingRef.current) {
                sendTypingStop(threadId);
            }
        };
    }, [threadId, sendTypingStop]);

    return { handleTyping, stopTyping };
}

/** =========================
 * Small helper component (Seeker)
 * ========================= */
interface SeekerApplication {
    id: string;
    status: string;
    appliedAt: string;
    interviewStage?: string;
    interviewScheduledAt?: string;
    interviewCompletedAt?: string;
    job: { id: string; title: string; company: string };
}

function SeekerInterviewDisplay({ jobId }: { jobId: string }) {
    const [application, setApplication] = useState<SeekerApplication | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSeekerApplications = async () => {
            try {
                const session = typeof window !== 'undefined' ? getImpersonationSession() : null;
                const impersonationHeaders: HeadersInit = session ? { 'x-impersonated-user-id': session.impersonatedUser.id, 'x-admin-user-id': session.adminId } : {};
                const response = await fetch('/api/seeker/applications', { headers: impersonationHeaders });
                if (response.ok) {
                    const data = await response.json();
                    const relevant = data.applications?.find(
                        (app: SeekerApplication) => app.job.id === jobId
                    );
                    setApplication(relevant || null);
                }
            } catch (e) {
                console.error('Error fetching seeker applications:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchSeekerApplications();
    }, [jobId]);

    if (loading || !application?.interviewScheduledAt) return null;

    const interviewDate = new Date(application.interviewScheduledAt);
    const now = new Date();
    const isUpcoming = interviewDate > now;

    return (
        <div
            className={`p-3 rounded-lg border-2 ${isUpcoming
                ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-300'
                : 'bg-gray-50 border-gray-300'
                }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isUpcoming ? 'bg-purple-100' : 'bg-gray-200'
                        }`}
                >
                    <Calendar className={`h-5 w-5 ${isUpcoming ? 'text-purple-600' : 'text-gray-600'}`} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className={`text-sm font-semibold ${isUpcoming ? 'text-purple-900' : 'text-gray-700'}`}>
                            {isUpcoming ? '📅 Interview Scheduled' : 'Interview Completed'}
                        </h4>
                        {isUpcoming && <Badge className="bg-purple-600 hover:bg-purple-700">Upcoming</Badge>}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-700 mb-1">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="font-medium">
                                {interviewDate.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: interviewDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
                                })}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="font-medium">
                                {interviewDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                        </div>
                    </div>

                    {application.interviewStage && (
                        <div className="text-xs text-gray-600">
                            Stage:{' '}
                            <span className="font-medium">{application.interviewStage.replace(/_/g, ' ')}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/** =========================
 * Main component
 * ========================= */
export function MessageThread({ threadId, onBack }: MessageThreadProps) {
    const {
        socket,
        isConnected,
        joinThread,
        leaveThread,
        requestOnlineStatus,
    } = useSocket();

    const { profile } = useUserProfile();

    // Build impersonation headers once per render cycle; passed into every fetch
    const getImpersonationHeaders = (): HeadersInit => {
        const session = typeof window !== 'undefined' ? getImpersonationSession() : null;
        if (!session) return {};
        return {
            'x-impersonated-user-id': session.impersonatedUser.id,
            'x-admin-user-id': session.adminId,
        };
    };

    const [thread, setThread] = useState<ThreadMeta | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [replyContent, setReplyContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
    const [attachments, setAttachments] = useState<any[]>([]);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [foundApplication, setFoundApplication] = useState<any[]>([]);
    const [employerInterviewData, setEmployerInterviewData] = useState<any>(null);
    const [applicationModalState, setApplicationModalState] = useState<{
        isOpen: boolean;
        applicationId: string;
        applicantName: string;
    }>({ isOpen: false, applicationId: '', applicantName: '' });

    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const clerkUserIdToPrismaId = useRef<Map<string, string>>(new Map());
    const hasRequestedOnlineStatus = useRef(false);
    const hasRequestedAfterMapping = useRef(false);

    const listRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isPrependingRef = useRef(false);
    const shouldStickToBottomRef = useRef(true);
    const isInitialLoadRef = useRef(true);
    const markingAsReadRef = useRef<Set<string>>(new Set());

    // Use the typing indicator hook
    const { handleTyping, stopTyping } = useTypingIndicator(threadId, isConnected);

    function isNearBottom(el: HTMLElement | null, threshold = 80) {
        if (!el) return true;
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        return distance <= threshold;
    }

    /** =========================
     * Fetch thread (first page)
     * ========================= */
    const fetchThread = useCallback(
        async (filterParams?: FilterState, options?: { showSpinner?: boolean }) => {
            const showSpinner = options?.showSpinner ?? true
            try {
                if (showSpinner) {
                    setLoading(true);
                }

                const params = new URLSearchParams();
                if (filterParams?.startDate) params.append('startDate', filterParams.startDate.toISOString());
                if (filterParams?.endDate) params.append('endDate', filterParams.endDate.toISOString());
                if (filterParams?.senderId) params.append('senderId', filterParams.senderId);
                if (filterParams?.readStatus) params.append('readStatus', filterParams.readStatus);
                if (filterParams?.quickFilter) params.append('quickFilter', filterParams.quickFilter);

                const queryString = params.toString();
                const url = `/api/messages/thread/${threadId}${queryString ? `?${queryString}` : ''}`;

                const res = await fetch(url, { headers: getImpersonationHeaders() });
                if (!res.ok) throw new Error('Failed to fetch thread');

                const data: ThreadApiResponse = await res.json();
                setThread(data.thread || null);
                setMessages(Array.isArray(data.messages) ? data.messages : []);
                setNextCursor(data.nextCursor ?? null);
                setError(null);

                shouldStickToBottomRef.current = true;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred while loading the thread');
            } finally {
                if (showSpinner) {
                    setLoading(false);
                }
            }
        },
        [threadId]
    );

    useEffect(() => {
        fetchThread(undefined, { showSpinner: true });
    }, [fetchThread]);

    // Scroll helper function - instant scroll to bottom
    const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'auto') => {
        if (!listRef.current) return;
        if (behavior === 'auto') {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        } else {
            listRef.current.scrollTo({
                top: listRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, []);

    // Force scroll to bottom ONLY on initial load
    useLayoutEffect(() => {
        if (!loading && messages.length > 0 && listRef.current && isInitialLoadRef.current) {
            // Immediate scroll on initial load
            scrollToBottom('auto');

            // Multiple checks to handle async content (images, etc)
            const timeouts = [
                setTimeout(() => scrollToBottom('auto'), 100),
                setTimeout(() => scrollToBottom('auto'), 300),
                setTimeout(() => {
                    scrollToBottom('auto');
                    isInitialLoadRef.current = false;
                }, 500)
            ];

            return () => timeouts.forEach(t => clearTimeout(t));
        }
    }, [loading, messages.length, scrollToBottom]);

    /** =========================
     * Employer interview helper
     * ========================= */
    const fetchEmployerInterviews = useCallback(
        async (applicationId?: string) => {
            try {
                if (applicationId) {
                    const response = await fetch(`/api/applications/${applicationId}`, { headers: getImpersonationHeaders() });
                    if (response.ok) {
                        const data = await response.json();
                        setEmployerInterviewData(data);
                        return data;
                    }
                } else {
                    await fetchThread(undefined, { showSpinner: true });
                }
            } catch (e) {
                console.error('Error fetching employer interviews:', e);
            }
        },
        [fetchThread]
    );

    /** =========================
     * Join/Leave room (fixed dependencies)
     * ========================= */
    useEffect(() => {
        if (!socket || !threadId) return;

        console.log('🔵 Joining thread:', threadId);
        joinThread(threadId);

        return () => {
            console.log('🔴 Leaving thread:', threadId);
            leaveThread(threadId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threadId, socket]); // ✅ Only re-run when threadId or socket changes

    /** =========================
     * Build Clerk -> Prisma map
     * ========================= */
    useEffect(() => {
        if (!thread?.participantDetails || !profile?.id || !profile?.clerkUserId) return;

        clerkUserIdToPrismaId.current.clear();
        clerkUserIdToPrismaId.current.set(profile.clerkUserId, profile.id);

        thread.participantDetails.forEach((p) => {
            if (p.clerkUserId) clerkUserIdToPrismaId.current.set(p.clerkUserId, p.id);
        });

        if (isConnected && !hasRequestedAfterMapping.current) {
            const clerkUserIds = thread.participantDetails
                .map((p) => p.clerkUserId)
                .filter((id): id is string => id != null && id !== profile.clerkUserId);

            if (clerkUserIds.length > 0) {
                hasRequestedAfterMapping.current = true;
                setTimeout(() => requestOnlineStatus?.(clerkUserIds), 100);
            }
        }
    }, [thread?.participantDetails, profile?.id, profile?.clerkUserId, isConnected, requestOnlineStatus]);

    useEffect(() => {
        hasRequestedOnlineStatus.current = false;
        hasRequestedAfterMapping.current = false;
        isInitialLoadRef.current = true;
    }, [threadId]);

    /** =========================
     * Initial presence request (fixed dependencies)
     * ========================= */
    useEffect(() => {
        if (!isConnected || !thread?.participantDetails || hasRequestedOnlineStatus.current) return;

        const clerkUserIds = thread.participantDetails
            .map((p) => p.clerkUserId)
            .filter((id): id is string => id != null && id !== profile?.clerkUserId);

        if (clerkUserIds.length === 0) return;

        hasRequestedOnlineStatus.current = true;
        const t = setTimeout(() => {
            if (requestOnlineStatus) {
                requestOnlineStatus(clerkUserIds);
            }
        }, 500);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, thread?.participantDetails, profile?.clerkUserId]); // ✅ Removed requestOnlineStatus

    /** =========================
     * SSE real-time: new_message
     * ========================= */
    useNotificationListener('new_message', (notification: any) => {
        const data = notification as { threadId: string; message: Message };
        if (data.threadId !== threadId) return;

        const isMyMessage = data.message.senderId === profile?.id;
        const wasNearBottom = isNearBottom(listRef.current);
        const stick = wasNearBottom || isMyMessage;
        shouldStickToBottomRef.current = stick;

        setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));

        if (stick) {
            requestAnimationFrame(() => {
                scrollToBottom(isMyMessage ? 'auto' : 'smooth');
            });
        }
    });

    /** =========================
     * SSE real-time: presence
     * ========================= */
    useNotificationListener('presence', (notification: any) => {
        const prismaUserId = clerkUserIdToPrismaId.current.get(notification.userId);
        if (!prismaUserId) return;
        setOnlineUsers((prev) => {
            const next = new Set(prev);
            if (notification.isOnline) next.add(prismaUserId);
            else next.delete(prismaUserId);
            return next;
        });
    });

    /** =========================
     * Employer: fetch applicant list (context)
     * ========================= */
    useEffect(() => {
        if (profile?.role !== 'employer' || !messages.length || foundApplication.length > 0) return;

        const msgWithJob = messages.find((m) => m.application?.job || m.job);
        const jobContext = msgWithJob?.application?.job || msgWithJob?.job;
        if (!jobContext) return;

        const run = async () => {
            try {
                const res = await fetch(`/api/employer/jobs/${jobContext.id}/applications`, { headers: getImpersonationHeaders() });
                if (!res.ok) {
                    setFoundApplication([]);
                    return;
                }
                const data = await res.json();
                setFoundApplication(data.applications || []);
            } catch {
                setFoundApplication([]);
            }
        };
        run();
    }, [profile?.role, messages, foundApplication.length]);

    /** =========================
     * SSE fallback
     * ========================= */
    useNotificationListener('new_message', (notification) => {
        if (notification.data?.threadId === threadId) {
            fetchThread(undefined, { showSpinner: false });
        }
    });

    useNotificationListener('message_read', (notification) => {
        if (!notification.data?.threadId || notification.data.threadId !== threadId) return
        const messageId = notification.data.messageId
        if (!messageId) return

        setMessages(prev =>
            prev.map(msg =>
                msg.id === messageId ? { ...msg, isRead: true } : msg
            )
        )
    })

    /** =========================
     * Mark messages as read when viewing
     * ========================= */
    useEffect(() => {
        if (!profile?.id) return;
        if (!messages.length) return;

        const unreadIds = messages
            .filter(msg => !msg.isRead && msg.recipientId === profile.id)
            .map(msg => msg.id)
            .filter(id => !markingAsReadRef.current.has(id));

        if (!unreadIds.length) return;

        markingAsReadRef.current = new Set([...markingAsReadRef.current, ...unreadIds]);

        setMessages(prev =>
            prev.map(msg =>
                unreadIds.includes(msg.id) ? { ...msg, isRead: true } : msg
            )
        );

        unreadIds.forEach(async (id) => {
            try {
                await fetch(`/api/messages/${id}/read`, { method: 'PUT', headers: getImpersonationHeaders() });
            } catch (error) {
                console.error('Failed to mark message as read:', error);
            } finally {
                markingAsReadRef.current.delete(id);
            }
        });
    }, [messages, profile?.id]);

    /** =========================
     * Prepend older messages (preserve scroll)
     * ========================= */
    const loadOlderMessages = useCallback(async () => {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);

        const scrollBox = listRef.current;
        const prevScrollHeight = scrollBox?.scrollHeight ?? 0;

        try {
            const res = await fetch(
                `/api/messages/thread/${threadId}?cursor=${encodeURIComponent(nextCursor)}&direction=older`,
                { headers: getImpersonationHeaders() }
            );
            if (!res.ok) throw new Error('Failed to load older messages');

            const data: ThreadApiResponse = await res.json();

            isPrependingRef.current = true;

            setMessages((prev) => ([...(data.messages || []), ...prev]));
            setNextCursor(data.nextCursor ?? null);

            requestAnimationFrame(() => {
                if (!scrollBox) return;
                const newScrollHeight = scrollBox.scrollHeight;
                const diff = newScrollHeight - prevScrollHeight;
                scrollBox.scrollTop = diff;
                requestAnimationFrame(() => {
                    isPrependingRef.current = false;
                });
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMore(false);
        }
    }, [threadId, nextCursor, loadingMore]);

    /** =========================
     * Autoscroll only when appropriate
     * ========================= */
    useEffect(() => {
        if (!messages.length) return;
        if (isPrependingRef.current) return;
        if (!shouldStickToBottomRef.current) return;
        if (isInitialLoadRef.current) return; // Don't interfere with initial load

        // Use requestAnimationFrame for smoother, more reliable scrolling
        requestAnimationFrame(() => {
            scrollToBottom('smooth');
        });
    }, [messages, scrollToBottom]);

    /** =========================
     * Composer: drafts + typing
     * ========================= */
    const handleReplyChange = (value: string) => {
        setReplyContent(value);
        if (selectedTemplateId && value !== replyContent) setSelectedTemplateId(null);

        if (autoSaveTimeout) clearTimeout(autoSaveTimeout);

        const timeout = setTimeout(() => {
            if (value.trim()) {
                fetch('/api/messages/drafts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getImpersonationHeaders() },
                    body: JSON.stringify({ threadId, content: value.trim() }),
                }).catch(() => { });
            }
        }, 3000);
        setAutoSaveTimeout(timeout);

        // ✅ NEW: Improved typing indicator logic
        if (value.trim()) {
            handleTyping();
        } else {
            stopTyping();
        }
    };

    const handleSendReply = async () => {
        if (!replyContent.trim()) return;

        try {
            setIsSending(true);
            stopTyping();

            const response = await fetch(`/api/messages/thread/${threadId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getImpersonationHeaders() },
                body: JSON.stringify({
                    content: replyContent.trim(),
                    templateId: selectedTemplateId,
                    attachments,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send reply');
            }

            shouldStickToBottomRef.current = true;
            setReplyContent('');
            setSelectedTemplateId(null);
            setAttachments([]);

            const result = await response.json()

            if (result?.message) {
                const newMessage = result.message as Message
                setMessages((prev) => (prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]))
                setThread((prev) => (prev ? { ...prev, updatedAt: newMessage.createdAt } : prev))
            }

            fetch('/api/messages/drafts', { headers: getImpersonationHeaders() })
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    const threadDraft = data?.drafts?.find((d: any) => d.threadId === threadId);
                    if (threadDraft) {
                        fetch(`/api/messages/drafts/${threadDraft.id}`, { method: 'DELETE', headers: getImpersonationHeaders() })
                            .catch(() => { });
                    }
                })
                .catch(() => { });

            // Immediate scroll after sending
            requestAnimationFrame(() => {
                scrollToBottom('auto');
                // Double-check after a short delay
                setTimeout(() => scrollToBottom('auto'), 100);
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send reply');
        } finally {
            setIsSending(false);
        }
    };

    /** =========================
     * Download attachment
     * ========================= */
    const handleAttachmentDownload = async (attachmentId: string, fileName: string) => {
        try {
            const response = await fetch(`/api/messages/attachments/download/${attachmentId}`, { headers: getImpersonationHeaders() });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get download URL');
            }
            const data = await response.json();
            if (data.success && data.downloadUrl) {
                const link = document.createElement('a');
                link.href = data.downloadUrl;
                link.download = fileName;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                throw new Error(data.error || 'Failed to get download URL');
            }
        } catch (error) {
            console.error('Error downloading attachment:', error);
            alert(`Failed to download attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    /** =========================
     * Render states
     * ========================= */
    if (loading || !profile) {
        return (
            <div className="flex items-center justify-center h-[500px] md:h-[600px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Loading conversation...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <h2 className="text-xl font-semibold">Message Thread</h2>
                </div>

                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error}</p>
                        <Button variant="outline" onClick={() => fetchThread(undefined, { showSpinner: true })} className="mt-2">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!thread) return null;

    const currentUserId = profile?.id || 'current-user-id';
    const otherParticipantId = thread.participants.find((id) => id !== currentUserId);
    const otherParticipant =
        thread.participantDetails?.find((p) => p.id === otherParticipantId) || null;

    const isCurrentUserMessage = (message: Message) => message.sender.id === currentUserId;

    /** =========================
     * UI
     * ========================= */
    return (
        <Card className="flex flex-col h-full shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* HEADER */}
            <div className="flex-shrink-0 border-b p-3 md:p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center space-x-2 md:space-x-3">
                    <Button variant="ghost" size="sm" onClick={onBack} className="p-2 hover:bg-white/60 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline ml-2 text-sm">Back</span>
                    </Button>

                    <div className="relative">
                        <div className="relative h-9 w-9 md:h-11 md:w-11 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {otherParticipant?.presignedProfilePictureUrl || otherParticipant?.profilePictureUrl ? (
                                <Image
                                    src={otherParticipant.presignedProfilePictureUrl || otherParticipant.profilePictureUrl || ''}
                                    alt={otherParticipant.name || 'User'}
                                    width={44}
                                    height={44}
                                    className="h-9 w-9 md:h-11 md:w-11 rounded-full object-cover"
                                />
                            ) : (
                                <User className="h-5 w-5 md:h-6 md:w-6 text-gray-500" />
                            )}

                            {otherParticipant && onlineUsers.has(otherParticipant.id) && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                            )}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="font-semibold text-base md:text-lg truncate flex items-center gap-2 flex-wrap">
                                <span>{otherParticipant?.name || 'Unknown User'}</span>
                                {otherParticipant && onlineUsers.has(otherParticipant.id) && (
                                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-normal px-2 py-0.5 bg-green-50 rounded-full animate-in fade-in zoom-in duration-300">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                        Online
                                    </span>
                                )}
                            </div>

                            {otherParticipant?.employer && (
                                <div className="text-xs md:text-sm text-gray-600 truncate">
                                    {otherParticipant.employer.companyName}
                                </div>
                            )}

                            {profile?.role === 'employer' && otherParticipant && (
                                <div className="text-xs text-gray-500 hidden md:block">
                                    {otherParticipant.firstName} {otherParticipant.lastName}
                                </div>
                            )}
                        </div>

                        {profile?.role === 'employer' && otherParticipant && !otherParticipant.employer && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsProfileModalOpen(true)}
                                    className="bg-white hover:bg-blue-50 text-blue-600 border-blue-200"
                                >
                                    <User className="h-3.5 w-3.5 mr-1.5" />
                                    <span className="hidden sm:inline">View Profile</span>
                                </Button>

                                {(() => {
                                    const messageWithApp = messages.find((msg) => msg.application);
                                    if (messageWithApp?.application) {
                                        return (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setApplicationModalState({
                                                        isOpen: true,
                                                        applicationId: messageWithApp.application!.id,
                                                        applicantName: otherParticipant?.name || 'Applicant',
                                                    })
                                                }
                                                className="bg-white hover:bg-purple-50 text-purple-600 border-purple-200"
                                            >
                                                <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                                                <span className="hidden sm:inline">Manage Application</span>
                                                <span className="sm:hidden">Manage</span>
                                            </Button>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CardContent className="flex-1 flex flex-col p-0 bg-gradient-to-b from-gray-50 to-white min-h-0">
                {/* CONTEXT BAR */}
                {messages.length > 0 && (
                    <div className="flex-shrink-0 px-3 md:px-4 lg:px-6 pt-3 md:pt-4 pb-2 space-y-2 border-b border-gray-200 bg-white">
                        {/* seeker side */}
                        {profile?.role === 'seeker' && (() => {
                            const messageWithApplication = messages.find((m) => m.sender.employer && m.application);
                            const messageWithJob = messages.find((m) => m.sender.employer && m.job && !m.application);
                            const messageToUse = messageWithApplication || messageWithJob;
                            if (!messageToUse) return null;

                            const jobContext = messageToUse.application?.job || messageToUse.job;
                            if (!jobContext) return null;
                            const companyName = jobContext?.employer?.companyName;

                            return (
                                <>
                                    <div className="p-3 bg-brand-teal/10 border-l-4 border-brand-teal rounded-r-lg overflow-hidden">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-brand-teal font-medium text-sm">
                                                    💼 <span className="truncate">Job: {jobContext.title}</span>
                                                    {companyName && <span className="text-brand-teal/70 truncate">— {companyName}</span>}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    This conversation is regarding the above position
                                                </div>
                                            </div>

                                            <Link href={`/seeker/jobs/${jobContext.id}`}>
                                                <Button variant="outline" size="sm" className="bg-white hover:bg-brand-teal/20 text-brand-teal border-brand-teal/30 flex-shrink-0">
                                                    <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                                                    <span className="hidden sm:inline">View Job</span>
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>

                                    <SeekerInterviewDisplay jobId={jobContext.id} />
                                </>
                            );
                        })()}

                        {/* employer side */}
                        {profile?.role === 'employer' && (() => {
                            const msgWithAppOrJob = messages.find((m) => m.application || m.job);
                            if (!msgWithAppOrJob) return null;

                            const directApplication = msgWithAppOrJob.application;
                            const directJob = msgWithAppOrJob.job;
                            const jobContext = directApplication?.job || directJob;
                            if (!jobContext) return null;

                            const companyName = jobContext?.employer?.companyName;
                            const otherId = otherParticipantId;
                            let applicationToUse = directApplication;

                            if (!applicationToUse && foundApplication?.length > 0) {
                                if (foundApplication.length === 1) applicationToUse = foundApplication[0];
                                else if (otherId) {
                                    applicationToUse = foundApplication.find((app: any) => app?.applicantId === otherId);
                                }
                            }

                            if (!applicationToUse && jobContext && otherId && foundApplication.length === 0) {
                                const foundInMessages = messages.filter((m) => m.application).find((m) => m.application!.job.id === jobContext.id);
                                if (foundInMessages) applicationToUse = foundInMessages.application;
                            }

                            return (
                                <>
                                    <div className="p-3 bg-purple-50/50 border-l-4 border-purple-500 rounded-r-lg overflow-hidden">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-purple-700 font-medium text-sm">
                                                    💼 <span className="truncate">Job: {jobContext.title}</span>
                                                    {companyName && <span className="text-purple-600/70 truncate">— {companyName}</span>}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">Chatting with applicant about this position</div>
                                            </div>

                                            {applicationToUse && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        setApplicationModalState({
                                                            isOpen: true,
                                                            applicationId: applicationToUse!.id,
                                                            applicantName: otherParticipant?.name || 'Applicant',
                                                        })
                                                    }
                                                    className="bg-white hover:bg-purple-50 text-purple-600 border-purple-200 flex-shrink-0"
                                                >
                                                    <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                                                    <span className="hidden sm:inline">Manage Application</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {applicationToUse && <InterviewScheduleIndicator applicationId={applicationToUse.id} />}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* MESSAGE LIST */}
                <div
                    ref={listRef}
                    className="flex-1 h-[calc(100vh-400px)] min-h-[400px] max-h-[600px] p-3 md:p-4 lg:p-6 overflow-y-auto"
                    onScroll={(e) => {
                        const el = e.currentTarget;
                        shouldStickToBottomRef.current = isNearBottom(el);

                        if (el.scrollTop < 80 && !loadingMore && nextCursor) {
                            loadOlderMessages();
                        }
                    }}
                >
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center animate-in fade-in duration-500">
                                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                                    <div className="text-4xl">💬</div>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">No messages yet</h3>
                                <p className="text-sm text-gray-500 mb-4">Start the conversation by sending a message!</p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                                    <Send className="h-3 w-3" />
                                    Type below to begin
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {/* Loading More Indicator or No More Messages */}
                            {loadingMore ? (
                                <div className="flex items-center justify-center py-4 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-medium shadow-sm">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>Loading older messages...</span>
                                    </div>
                                </div>
                            ) : (
                                messages.length > 20 && !nextCursor && (
                                    <div className="flex items-center justify-center py-4">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-500 rounded-full text-xs font-medium">
                                            <CheckCheck className="h-3.5 w-3.5" />
                                            <span>Beginning of conversation</span>
                                        </div>
                                    </div>
                                )
                            )}

                            {messages.map((message, index) => {
                                const isCurrentUser = isCurrentUserMessage(message);

                                const formatTime = (ts: string) =>
                                    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                const showDateSeparator =
                                    index === 0 ||
                                    new Date(message.createdAt).toDateString() !==
                                    new Date(messages[index - 1].createdAt).toDateString();

                                const formatDate = (date: Date) => {
                                    const today = new Date();
                                    const messageDate = new Date(date);
                                    if (messageDate.toDateString() === today.toDateString()) return 'Today';
                                    const yesterday = new Date(today);
                                    yesterday.setDate(yesterday.getDate() - 1);
                                    if (messageDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
                                    return new Intl.DateTimeFormat('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
                                    }).format(messageDate);
                                };

                                return (
                                    <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        {showDateSeparator && (
                                            <div className="flex items-center justify-center my-6">
                                                <div className="bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 text-xs font-medium px-4 py-1.5 rounded-full shadow-sm">
                                                    {formatDate(new Date(message.createdAt))}
                                                </div>
                                            </div>
                                        )}

                                        <div className={`flex mb-3 md:mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`flex items-start gap-2 max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'
                                                    }`}
                                            >
                                                {/* avatar */}
                                                <div className="flex-shrink-0 relative">
                                                    <div className="relative h-9 w-9 md:h-10 md:w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                                        {message.sender?.presignedProfilePictureUrl || message.sender?.profilePictureUrl ? (
                                                            <Image
                                                                src={
                                                                    message.sender.presignedProfilePictureUrl ||
                                                                    message.sender.profilePictureUrl ||
                                                                    ''
                                                                }
                                                                alt={message.sender?.name || 'User'}
                                                                width={32}
                                                                height={32}
                                                                className="h-9 w-9 md:h-10 md:w-10 rounded-full object-cover"
                                                                onLoad={() => {
                                                                    // Adjust scroll when images load during initial load
                                                                    if (isInitialLoadRef.current && shouldStickToBottomRef.current) {
                                                                        scrollToBottom('auto');
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <User className="h-5 w-5 text-gray-500" />
                                                        )}

                                                        {!isCurrentUser && message.sender && onlineUsers.has(message.sender.id) && (
                                                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* bubble */}
                                                <div
                                                    className={`rounded-2xl px-3 md:px-4 py-2 md:py-2.5 shadow-sm transition-all hover:shadow-md ${isCurrentUser
                                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-brand-teal/20'
                                                        : 'bg-white border border-gray-200 text-gray-900'
                                                        }`}
                                                >
                                                    {!isCurrentUser && (
                                                        <div className="text-xs mb-1.5 font-medium text-gray-700 flex items-center gap-2 flex-wrap">
                                                            <span>{message.sender.name}</span>
                                                            {onlineUsers.has(message.sender.id) && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full">
                                                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                                    <span className="text-[10px] font-medium">Online</span>
                                                                </span>
                                                            )}
                                                            {message.sender.employer && (
                                                                <span className="text-gray-500 text-[11px]">
                                                                    ({message.sender.employer.companyName})
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">
                                                        {message.content}
                                                    </div>

                                                    {message.attachments?.length ? (
                                                        <div className="mt-3 space-y-2">
                                                            {message.attachments.map((att) => (
                                                                <AttachmentPreview
                                                                    key={att.id}
                                                                    attachment={att}
                                                                    isCurrentUser={isCurrentUser}
                                                                    onDownload={handleAttachmentDownload}
                                                                    getHeaders={getImpersonationHeaders}
                                                                />
                                                            ))}
                                                        </div>
                                                    ) : null}

                                                    <div
                                                        className={`flex items-center justify-between mt-1 text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                                                            }`}
                                                    >
                                                        <span>{formatTime(message.createdAt)}</span>
                                                        {isCurrentUser && (
                                                            <div className="flex items-center">
                                                                {message.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* ✅ TYPING INDICATOR */}
                            {typingUsers.size > 0 && (
                                <div className="flex justify-start mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex items-start gap-2 max-w-[85%]">
                                        <div className="flex-shrink-0">
                                            <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                                {otherParticipant?.presignedProfilePictureUrl || otherParticipant?.profilePictureUrl ? (
                                                    <Image
                                                        src={otherParticipant.presignedProfilePictureUrl || otherParticipant.profilePictureUrl || ''}
                                                        alt={otherParticipant.name || 'User'}
                                                        width={40}
                                                        height={40}
                                                        className="h-9 w-9 md:h-10 md:w-10 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="h-5 w-5 text-gray-500" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Scroll anchor with ID for reliable scrolling */}
                            <div
                                id="messages-bottom-anchor"
                                ref={messagesEndRef}
                                className="h-px"
                                aria-hidden="true"
                            />
                        </div>
                    )}
                </div>

                {/* COMPOSER */}
                <div className="flex-shrink-0 border-t bg-white p-3 md:p-4">
                    <div className="mb-3 space-y-3">
                        <div className="flex items-center space-x-2">
                            <FileAttachmentUpload
                                attachments={attachments}
                                onAttachmentsChange={setAttachments}
                                maxFiles={5}
                                maxFileSize={10 * 1024 * 1024}
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            {profile?.role === 'employer' && (
                                <>
                                    <MessageTemplates onSelectTemplate={(template) => setReplyContent(template.content)} />
                                    <MessageDrafts onSelectDraft={(draft) => setReplyContent(draft.content)} />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-end gap-3">
                        <div className="flex-1 relative">
                            <Textarea
                                value={replyContent}
                                onChange={(e) => handleReplyChange(e.target.value)}
                                onBlur={stopTyping}
                                placeholder="Type your message..."
                                autoComplete="off"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendReply();
                                    }
                                }}
                                disabled={isSending}
                            />
                            <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none hidden sm:block">
                                {replyContent.length > 0 && `${replyContent.length} chars`}
                            </div>
                        </div>

                        <Button onClick={handleSendReply} disabled={!replyContent.trim() || isSending}>
                            {isSending ? <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" /> : <Send className="h-5 w-5 md:h-6 md:w-6" />}
                        </Button>
                    </div>

                    <div className="text-[11px] md:text-xs text-gray-500 mt-2 flex items-center justify-between">
                        <span className="hidden sm:inline">Press Enter to send • Shift+Enter for new line</span>
                        <span className="sm:hidden">Tap send or press Enter</span>
                        {isConnected && (
                            <span className="flex items-center gap-1 text-green-600">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                <span className="hidden md:inline">Connected</span>
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>

            {/* MODALS (employer only) */}
            {profile?.role === 'employer' && otherParticipant && (
                <TalentProfileModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    talentId={otherParticipant.id}
                    onInvite={(talentId) => {
                        console.log('Employer invited talent:', talentId);
                    }}
                />
            )}

            {profile?.role === 'employer' && (
                <ApplicantProfileModal
                    isOpen={applicationModalState.isOpen}
                    onClose={() => {
                        setApplicationModalState({ isOpen: false, applicationId: '', applicantName: '' });
                        if (applicationModalState.applicationId) {
                            fetchEmployerInterviews(applicationModalState.applicationId);
                        }
                    }}
                    applicationId={applicationModalState.applicationId}
                    applicantName={applicationModalState.applicantName}
                />
            )}
        </Card>
    );
}
