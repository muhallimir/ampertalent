'use client'

import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { CheckCircle, Send } from 'lucide-react'

interface FollowUpModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    application: {
        id: string
        job: {
            id: string
            title: string
            company?: string
            companyLogoUrl?: string
            employerId?: string
            employer?: {
                companyName: string
            }
        }
        appliedAt: string
    }
}

export function FollowUpModal({ isOpen, onClose, onSuccess, application }: FollowUpModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [notificationSent, setNotificationSent] = useState(false)
    const [alreadySent, setAlreadySent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { addToast } = useToast()

    const companyName = application.job.employer?.companyName || (application.job as any).company || 'Company'

    const handleSendFollowUp = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/seeker/applications/follow-up', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    applicationId: application.id,
                    jobId: application.job.id,
                    employerId: application.job.employerId,
                    message: `I'd like to follow up on my application for ${application.job.title}.`
                })
            })

            if (response.status === 429) {
                setAlreadySent(true)
                return
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                const errorMsg = data?.error || `Request failed (${response.status})`
                setError(errorMsg)
                addToast({
                    title: "Could not send follow-up",
                    description: errorMsg,
                    variant: 'destructive'
                })
                return
            }

            setNotificationSent(true)
            onSuccess?.()
            addToast({
                title: "Follow-up sent!",
                description: `The employer has been notified of your interest in ${application.job.title}.`,
                variant: 'success'
            })

        } catch (err) {
            console.error('Error sending follow-up:', err)
            const errorMsg = 'An unexpected error occurred. Please try again.'
            setError(errorMsg)
            addToast({
                title: "Could not send follow-up",
                description: errorMsg,
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setNotificationSent(false)
        setAlreadySent(false)
        setError(null)
        onClose()
    }

    // Already sent (either from 429 response or pre-detected)
    if (alreadySent) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-700">
                            <CheckCircle className="h-5 w-5" />
                            Follow-up already sent
                        </DialogTitle>
                        <DialogDescription>
                            You've already sent a follow-up for <strong>{application.job.title}</strong> at <strong>{companyName}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                        <p className="text-sm text-amber-800">
                            Only one follow-up is allowed per application. The employer has already been notified of your interest.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleClose} className="w-full">Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }

    // Successfully sent
    if (notificationSent) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="h-5 w-5" />
                            Follow-up sent successfully!
                        </DialogTitle>
                        <DialogDescription>
                            The employer has been notified of your interest in <strong>{application.job.title}</strong> at <strong>{companyName}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-green-700">
                            Only one follow-up is allowed per application. Good luck!
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleClose} className="w-full">Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-brand-coral" />
                        Follow Up on Application
                    </DialogTitle>
                    <DialogDescription>
                        Notify the employer of your continued interest in <strong>{application.job.title}</strong> at <strong>{companyName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="space-y-2">
                        <p className="text-sm text-blue-700">
                            <strong>Position:</strong> {application.job.title}
                        </p>
                        <p className="text-sm text-blue-700">
                            <strong>Company:</strong> {companyName}
                        </p>
                        <p className="text-sm text-blue-700">
                            <strong>Applied:</strong> {new Date(application.appliedAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-800">
                        You can only send <strong>one follow-up per application</strong>. This will notify the employer that you're still interested in the role.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSendFollowUp}
                        disabled={isLoading}
                        className="bg-brand-coral hover:bg-brand-coral/90"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Send Follow-up
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
