'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { FileText, Trash2, Edit, Clock } from 'lucide-react'

interface MessageDraft {
    id: string
    recipientId?: string
    threadId?: string
    subject?: string
    content: string
    attachments?: any
    lastSavedAt: string
}

interface MessageDraftsProps {
    onSelectDraft?: (draft: MessageDraft) => void
    className?: string
}

export function MessageDrafts({ onSelectDraft, className }: MessageDraftsProps) {
    const [drafts, setDrafts] = useState<MessageDraft[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [draftToDelete, setDraftToDelete] = useState<string | null>(null)

    const fetchDrafts = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/messages/drafts')
            if (!response.ok) {
                throw new Error('Failed to fetch drafts')
            }
            const data = await response.json()
            setDrafts(data.drafts)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const deleteDraft = async (draftId: string) => {
        try {
            const response = await fetch(`/api/messages/drafts/${draftId}`, {
                method: 'DELETE'
            })
            if (!response.ok) {
                throw new Error('Failed to delete draft')
            }
            // Remove from local state
            setDrafts(drafts.filter(draft => draft.id !== draftId))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete draft')
        }
    }

    const handleSelectDraft = (draft: MessageDraft) => {
        onSelectDraft?.(draft)
        setIsOpen(false)
    }

    useEffect(() => {
        if (isOpen) {
            fetchDrafts()
        }
    }, [isOpen])

    const formatDraftTime = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

        if (diffInHours < 1) {
            return 'Just now'
        } else if (diffInHours < 24) {
            return `${diffInHours}h ago`
        } else {
            return date.toLocaleDateString()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={className}>
                    <FileText className="h-4 w-4 mr-2" />
                    Drafts
                    {drafts.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                            {drafts.length}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Message Drafts</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal mx-auto"></div>
                            <p className="text-sm text-muted-foreground mt-2">Loading drafts...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <p className="text-destructive">{error}</p>
                            <Button
                                variant="outline"
                                onClick={fetchDrafts}
                                className="mt-2"
                            >
                                Try Again
                            </Button>
                        </div>
                    ) : drafts.length === 0 ? (
                        <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No drafts saved yet</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Your drafts will appear here as you type messages
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {drafts.map((draft) => (
                                <Card key={draft.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div
                                                className="flex-1 cursor-pointer"
                                                onClick={() => handleSelectDraft(draft)}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">
                                                        Draft Message
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {draft.threadId ? 'Thread' : 'New Message'}
                                                    </Badge>
                                                </div>

                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                    {draft.content}
                                                </p>

                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    <span>Saved {formatDraftTime(draft.lastSavedAt)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 ml-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleSelectDraft(draft)
                                                    }}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setDraftToDelete(draft.id)
                                                        setDeleteDialogOpen(true)
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                <ConfirmationDialog
                    isOpen={deleteDialogOpen}
                    onClose={() => {
                        setDeleteDialogOpen(false)
                        setDraftToDelete(null)
                    }}
                    onConfirm={() => {
                        if (draftToDelete) {
                            deleteDraft(draftToDelete)
                            setDeleteDialogOpen(false)
                            setDraftToDelete(null)
                        }
                    }}
                    title="Delete Draft"
                    description="Are you sure you want to delete this draft? This action cannot be undone."
                    confirmText="Delete"
                    variant="destructive"
                />
            </DialogContent>
        </Dialog>
    )
}