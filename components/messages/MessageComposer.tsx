'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Combobox } from '@/components/ui/combobox'
import { ArrowLeft, Send, FileText, Save, X, File, Trash2 } from 'lucide-react'
import { FileAttachmentUpload } from './FileAttachmentUpload'
import { TemplateManager } from './TemplateManager'

interface Contact {
    userId: string
    name: string
    firstName?: string
    lastName?: string
    profilePictureUrl?: string
    role: string
    companyName?: string
    context?: {
        type: string
        jobId: string
        jobTitle: string
        applicationId: string
    }
}

interface Job {
    id: string
    title: string
    status: string
}

interface MessageDraft {
    id: string
    recipientId?: string
    content: string
    jobId?: string
    applicationId?: string
    createdAt: string
    lastSavedAt: string
}

interface MessageComposerProps {
    onCancel: () => void
    onSent: (threadId?: string) => void
    initialRecipientId?: string
    initialApplicationId?: string
    initialJobId?: string
    initialJobTitle?: string
    autoJobContext?: boolean // When true, job context is pre-selected and disabled
    sourcePage?: string // Optional source page for better back navigation
}

export function MessageComposer({
    onCancel,
    onSent,
    initialRecipientId,
    initialApplicationId,
    initialJobId,
    initialJobTitle,
    autoJobContext = false,
    sourcePage // eslint-disable-line @typescript-eslint/no-unused-vars
}: MessageComposerProps) {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [jobs, setJobs] = useState<Job[]>([])
    const [loadingContacts, setLoadingContacts] = useState(true)
    const [loadingJobs, setLoadingJobs] = useState(true)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        recipientId: initialRecipientId || '',
        content: '',
        applicationId: initialApplicationId || '',
        jobId: initialJobId || ''
    })

    const [attachments, setAttachments] = useState<any[]>([])
    const [isUploadingAttachments, setIsUploadingAttachments] = useState(false)
    const [showTemplates, setShowTemplates] = useState(false)
    const [savedDraft, setSavedDraft] = useState<any>(null)
    const [drafts, setDrafts] = useState<MessageDraft[]>([])
    const [loadingDrafts, setLoadingDrafts] = useState(false)
    const [showDrafts, setShowDrafts] = useState(false)
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Auto-save draft functionality
    const saveDraft = useCallback(async () => {
        if (!formData.recipientId || !formData.content.trim()) return

        try {
            const draftData = {
                recipientId: formData.recipientId,
                content: formData.content,
                jobId: formData.jobId,
                applicationId: formData.applicationId
            }

            const response = await fetch('/api/messages/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draftData)
            })

            if (response.ok) {
                setSavedDraft(true)
                setTimeout(() => setSavedDraft(false), 3000)
            }
        } catch (error) {
            console.error('Error saving draft:', error)
        }
    }, [formData])    // Auto-save when content changes

    useEffect(() => {
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current)
        }

        const timeout = setTimeout(() => {
            saveDraft()
        }, 2000) // Save after 2 seconds of inactivity

        autoSaveTimeoutRef.current = timeout

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.content, formData.recipientId, saveDraft])

    // Template selection handler
    const handleTemplateSelect = (template: any) => {
        // Replace template variables with actual values
        let content = template.content

        // Basic variable replacement - can be enhanced with more variables
        const contact = contacts.find(c => c.userId === formData.recipientId)
        const selectedJob = jobs.find(j => j.id === formData.jobId)

        if (contact) {
            content = content.replace(/{{candidateName}}/g, contact.name)
        }
        if (selectedJob) {
            content = content.replace(/{{jobTitle}}/g, selectedJob.title)
        }
        content = content.replace(/{{companyName}}/g, '[Your Company Name]')
        content = content.replace(/{{employerName}}/g, '[Your Name]')

        setFormData(prev => ({
            ...prev,
            content: content
        }))

        setShowTemplates(false)
    }

    // Draft selection handler
    const handleDraftSelect = (draft: MessageDraft) => {
        setFormData(prev => ({
            ...prev,
            recipientId: draft.recipientId || '',
            content: draft.content,
            jobId: draft.jobId || '',
            applicationId: draft.applicationId || ''
        }))
        setShowDrafts(false)
    }

    // Delete draft handler
    const handleDeleteDraft = async (draftId: string) => {
        try {
            const response = await fetch(`/api/messages/drafts/${draftId}`, {
                method: 'DELETE'
            })
            if (response.ok) {
                setDrafts(prev => prev.filter(draft => draft.id !== draftId))
            }
        } catch (error) {
            console.error('Error deleting draft:', error)
        }
    }

    // Fetch contacts
    useEffect(() => {
        const fetchContacts = async () => {
            if (contacts.length > 0) return // Don't refetch if already loaded

            try {
                const response = await fetch('/api/messages/contacts')
                if (!response.ok) {
                    throw new Error('Failed to fetch contacts')
                }
                const data = await response.json()
                setContacts(data.contacts)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load contacts')
            } finally {
                setLoadingContacts(false)
            }
        }

        if (loadingContacts) {
            fetchContacts()
        }
    }, [contacts.length, loadingContacts])

    // Fetch employer jobs for job context selection
    useEffect(() => {
        const fetchJobs = async () => {
            if (jobs.length > 0) return // Don't refetch if already loaded

            try {
                const response = await fetch('/api/employer/jobs?status=approved')
                if (!response.ok) {
                    throw new Error('Failed to fetch jobs')
                }
                const data = await response.json()
                setJobs(data.jobs || [])
            } catch (err) {
                console.error('Failed to load jobs:', err)
                // Don't set error here as jobs are optional
            } finally {
                setLoadingJobs(false)
            }
        }

        if (loadingJobs) {
            fetchJobs()
        }
    }, [jobs.length, loadingJobs])

    // Load drafts on component mount
    useEffect(() => {
        const loadDrafts = async () => {
            try {
                setLoadingDrafts(true)
                const response = await fetch('/api/messages/drafts')
                if (response.ok) {
                    const data = await response.json()
                    setDrafts(data.drafts || [])
                }
            } catch (error) {
                console.error('Error loading drafts:', error)
            } finally {
                setLoadingDrafts(false)
            }
        }

        loadDrafts()
    }, [])

    // Set initial recipient if provided
    useEffect(() => {
        if (initialRecipientId) {
            setFormData(prev => ({ ...prev, recipientId: initialRecipientId }))
        }
    }, [initialRecipientId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.recipientId || !formData.content.trim()) {
            setError('Please fill in all required fields: recipient and message content')
            return
        }

        setSending(true)
        setError(null)

        try {
            const payload: any = {
                recipientId: formData.recipientId,
                content: formData.content.trim()
            }

            if (formData.applicationId) {
                payload.applicationId = formData.applicationId
            }

            if (formData.jobId && formData.jobId !== 'none') {
                payload.jobId = formData.jobId
            }

            if (attachments.length > 0) {
                // Only send attachments that have been uploaded (have fileUrl)
                const uploadedAttachments = attachments.filter(att => att.fileUrl)
                if (uploadedAttachments.length > 0) {
                    payload.attachments = uploadedAttachments.map(att => ({
                        fileName: att.fileName,
                        fileUrl: att.fileUrl,
                        fileType: att.fileType,
                        fileSize: att.fileSize,
                        mimeType: att.mimeType
                    }))
                }
            }

            const response = await fetch('/api/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to send message')
            }

            const responseData = await response.json()
            console.log('📨 Message send response:', responseData)

            // Reset composer state so attachments don't linger after send
            setFormData(prev => ({ ...prev, content: '' }))
            setAttachments([])

            onSent(responseData.messageSummary?.threadId || responseData.thread?.id)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message')
        } finally {
            setSending(false)
        }
    }



    return (
        <div className="space-y-4 md:space-y-6 p-4 md:p-0">
            <Card>
                <CardHeader>
                    <CardTitle>Send a Message</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Recipient Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="recipient">Recipient *</Label>
                            {loadingContacts ? (
                                <Skeleton className="h-10 w-full" />
                            ) : (
                                <Combobox
                                    value={formData.recipientId}
                                    onValueChange={(value) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            recipientId: value
                                        }))
                                    }}
                                    placeholder="Select a recipient"
                                    searchPlaceholder="Search recipients..."
                                    emptyMessage="No recipients found."
                                    options={contacts.map((contact) => ({
                                        value: contact.userId,
                                        label: contact.name,
                                        description: contact.companyName ? `(${contact.companyName})` : undefined
                                    }))}
                                />
                            )}

                        </div>

                        {/* Job Context Selection - Always show for universal messaging */}
                        <div className="space-y-2">
                            <Label htmlFor="jobId">Job Context {!autoJobContext && '(Optional)'}</Label>
                            {loadingJobs ? (
                                <Skeleton className="h-10 w-full" />
                            ) : (
                                <Combobox
                                    value={formData.jobId}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, jobId: value }))}
                                    placeholder={
                                        autoJobContext && initialJobTitle
                                            ? initialJobTitle
                                            : "Select a job for context (optional)"
                                    }
                                    searchPlaceholder="Search jobs..."
                                    emptyMessage="No jobs found."
                                    disabled={autoJobContext}
                                    options={[
                                        ...(autoJobContext ? [] : [{ value: "none", label: "No specific job context" }]),
                                        ...jobs.map((job) => ({
                                            value: job.id,
                                            label: job.title
                                        }))
                                    ]}
                                />
                            )}
                            <p className="text-xs text-muted-foreground">
                                {autoJobContext
                                    ? "Job context is pre-selected based on the application."
                                    : "Select a job to provide context for your message. This helps the recipient understand which position you're discussing."
                                }
                            </p>
                        </div>



                        {/* Content */}
                        <div className="space-y-2">
                            <Label htmlFor="content">Message *</Label>
                            <Textarea
                                id="content"
                                value={formData.content}
                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="Type your message here..."
                                rows={6}
                                maxLength={5000}
                                autoComplete="off"
                            />
                            <p className="text-xs text-muted-foreground">
                                {formData.content.length}/5000 characters
                            </p>
                        </div>

                        {/* File Attachments */}
                        <div className="space-y-2">
                            <Label>Attachments (Optional)</Label>
                            <FileAttachmentUpload
                                attachments={attachments}
                                onAttachmentsChange={setAttachments}
                                onUploadStateChange={setIsUploadingAttachments}
                                maxFiles={5}
                                maxFileSize={10 * 1024 * 1024} // 10MB
                            />
                            <p className="text-xs text-muted-foreground">
                                Supported formats: Images, PDFs, Documents, Spreadsheets, Videos (max 10MB each, up to 5 files)
                            </p>
                        </div>

                        {error && (
                            <div className="text-destructive text-sm">{error}</div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <div className="flex gap-2 items-center">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowTemplates(true)}
                                    disabled={sending}
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Templates
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowDrafts(true)}
                                    disabled={sending || loadingDrafts}
                                >
                                    <File className="h-4 w-4 mr-2" />
                                    Drafts {drafts.length > 0 && `(${drafts.length})`}
                                </Button>
                                {savedDraft && (
                                    <div className="flex items-center text-sm text-green-600">
                                        <Save className="h-4 w-4 mr-1" />
                                        Draft saved
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 ml-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onCancel}
                                    disabled={sending}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={sending || isUploadingAttachments || !formData.recipientId || !formData.content.trim()}
                                    className="bg-brand-teal hover:bg-brand-teal/90 text-white w-full sm:w-auto"
                                >
                                    {sending ? (
                                        <>Sending...</>
                                    ) : isUploadingAttachments ? (
                                        <>Uploading attachments...</>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Send Message</span>
                                            <span className="sm:hidden">Send</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Template Modal */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Select Message Template</h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowTemplates(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="p-4">
                            <TemplateManager
                                onSelectTemplate={handleTemplateSelect}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Drafts Modal */}
            {showDrafts && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Saved Drafts</h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDrafts(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="p-4">
                            {loadingDrafts ? (
                                <div className="text-center py-8">
                                    <div className="text-gray-500">Loading drafts...</div>
                                </div>
                            ) : drafts.length === 0 ? (
                                <div className="text-center py-8">
                                    <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved drafts</h3>
                                    <p className="text-gray-600">
                                        Your message drafts will appear here when you start typing and navigate away.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {drafts.map((draft) => {
                                        const recipient = contacts.find(c => c.userId === draft.recipientId)
                                        const job = jobs.find(j => j.id === draft.jobId)

                                        return (
                                            <div
                                                key={draft.id}
                                                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                                                onClick={() => handleDraftSelect(draft)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-gray-900">
                                                            Draft Message
                                                        </h4>
                                                        {recipient && (
                                                            <p className="text-sm text-gray-600">
                                                                To: {recipient.name}
                                                            </p>
                                                        )}
                                                        {job && (
                                                            <p className="text-sm text-gray-500">
                                                                Re: {job.title}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(draft.lastSavedAt).toLocaleDateString()}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeleteDraft(draft.id)
                                                            }}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-700 line-clamp-2">
                                                    {draft.content}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
