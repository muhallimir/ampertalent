'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, User, FileText, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { useToast } from '@/components/ui/toast'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { getWithImpersonation, putWithImpersonation } from '@/lib/api-client'

interface InterviewHistory {
    id: string
    stage: string
    formattedStage: string
    scheduledAt?: string
    completedAt?: string
    notes?: string
    feedback?: string
    interviewerId?: string
    createdAt: string
    updatedAt: string
}

interface Application {
    id: string
    jobTitle: string
    companyName: string
    candidateName: string
    candidateEmail: string
    currentStage?: string
    formattedCurrentStage?: string
    interviewScheduledAt?: string
    interviewCompletedAt?: string
    interviewerNotes?: string
    nextActionRequired?: string
    nextActionDeadline?: string
}

interface InterviewPipelineProps {
    application: Application
    onStageUpdate?: (applicationId: string, stageData: any) => Promise<void>
}

const INTERVIEW_STAGES = [
    { value: 'initial_screening', label: 'Initial Screening' },
    { value: 'technical_interview', label: 'Technical Interview' },
    { value: 'behavioral_interview', label: 'Behavioral Interview' },
    { value: 'final_interview', label: 'Final Interview' },
    { value: 'offer_extended', label: 'Offer Extended' },
    { value: 'offer_accepted', label: 'Offer Accepted' },
    { value: 'offer_rejected', label: 'Offer Declined' }
]

export function InterviewPipeline({ application, onStageUpdate }: InterviewPipelineProps) {
    const { addToast } = useToast()
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
    const [interviewHistory, setInterviewHistory] = useState<InterviewHistory[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    // Confirmation dialog state
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)

    // Handle confirmation dialog confirm
    const handleConfirmNoChanges = async () => {
        setIsConfirmDialogOpen(false)
        await performUpdate()
    }

    // Extract update logic into separate function
    const performUpdate = async () => {
        setIsUpdating(true)
        try {
            // Get stage indices for validation logic
            const currentStageIndex = INTERVIEW_STAGES.findIndex(stage => stage.value === application.currentStage)
            const selectedStageIndex = INTERVIEW_STAGES.findIndex(stage => stage.value === selectedStage)

            // Validation logic based on stage movement direction
            if (completedAt && scheduledAt) {
                const scheduledTime = new Date(scheduledAt).getTime()
                const completedTime = new Date(completedAt).getTime()
                const thirtyMinutes = 30 * 60 * 1000 // 30 minutes in milliseconds

                // Moving upward (to higher stage) - validate new stage scheduling against current stage
                if (selectedStageIndex > currentStageIndex) {
                    // When scheduling a new interview for upward movement, validate against current stage status
                    if (scheduledAt) {
                        const newScheduledTime = new Date(scheduledAt).getTime()
                        let referenceTime: number | null = null
                        let referenceDescription = ''

                        // If current stage is completed, new schedule must be after completion
                        if (application.interviewCompletedAt) {
                            referenceTime = new Date(application.interviewCompletedAt).getTime()
                            referenceDescription = 'the completion of the current interview'
                        }
                        // If current stage is scheduled but not completed, new schedule must be after current schedule
                        else if (application.interviewScheduledAt) {
                            referenceTime = new Date(application.interviewScheduledAt).getTime()
                            referenceDescription = 'the scheduled time of the current interview'
                        }

                        if (referenceTime && newScheduledTime <= referenceTime) {
                            addToast({
                                title: 'Validation Error',
                                description: `New interview schedule must be after ${referenceDescription}.`,
                                variant: 'destructive'
                            })
                            setIsUpdating(false)
                            return
                        }
                    }
                }

                // Moving downward (to lower stage) - validate against new stage requirements
                if (selectedStageIndex < currentStageIndex) {
                    // When moving to a lower stage, ensure logical consistency
                    if (completedTime <= scheduledTime) {
                        addToast({
                            title: 'Validation Error',
                            description: 'Completed time must be after scheduled time.',
                            variant: 'destructive'
                        })
                        setIsUpdating(false)
                        return
                    }
                }

                // Same stage updates - validate time consistency
                if (selectedStageIndex === currentStageIndex) {
                    if (completedTime <= scheduledTime) {
                        addToast({
                            title: 'Validation Error',
                            description: 'Completed time must be after scheduled time.',
                            variant: 'destructive'
                        })
                        setIsUpdating(false)
                        return
                    }
                }
            }

            // Process dates - convert empty strings to undefined for API
            const processedScheduledAt = scheduledAt === '' ? undefined : scheduledAt
            const processedCompletedAt = completedAt === '' ? undefined : completedAt

            // Build update data with only changed fields
            const updateData: any = {
                stage: selectedStage
            }

            // Only include fields that have changed from original values
            if (notes !== originalValues.notes) {
                updateData.notes = notes.trim() || undefined
            }
            if (processedScheduledAt !== originalValues.scheduledAt) {
                updateData.scheduledAt = processedScheduledAt ? new Date(processedScheduledAt).toISOString() : undefined
            }
            if (processedCompletedAt !== originalValues.completedAt) {
                updateData.completedAt = processedCompletedAt ? new Date(processedCompletedAt).toISOString() : undefined
            }
            if (nextAction !== originalValues.nextAction) {
                updateData.nextActionRequired = nextAction.trim() || undefined
            }
            if (nextActionDeadline !== originalValues.nextActionDeadline) {
                updateData.nextActionDeadline = nextActionDeadline ? new Date(nextActionDeadline).toISOString() : undefined
            }

            const response = await putWithImpersonation(`/api/employer/applications/${application.id}/interview`, updateData)

            if (response.ok) {
                const data = await response.json()
                addToast({
                    title: 'Success',
                    description: 'Interview stage updated successfully',
                    variant: 'success'
                })

                // Update local state
                application.currentStage = data.application.interviewStage
                application.formattedCurrentStage = formatStageName(data.application.interviewStage)
                application.interviewScheduledAt = data.application.interviewScheduledAt
                application.interviewCompletedAt = data.application.interviewCompletedAt
                application.interviewerNotes = data.application.interviewerNotes
                application.nextActionRequired = data.application.nextActionRequired
                application.nextActionDeadline = data.application.nextActionDeadline

                // Reset form with the processed values (cleared fields) - ensure no null values
                setNotes(application.interviewerNotes || '')
                setScheduledAt(processedScheduledAt || '')
                setCompletedAt(processedCompletedAt || '')
                setNextAction(application.nextActionRequired || '')
                setNextActionDeadline(application.nextActionDeadline || '')

                setIsUpdateDialogOpen(false)

                // Call parent callback if provided
                if (onStageUpdate) {
                    await onStageUpdate(application.id, updateData)
                }
            } else {
                const error = await response.json()
                addToast({
                    title: 'Error',
                    description: error.error || 'Failed to update interview stage',
                    variant: 'destructive'
                })
            }
        } catch (error) {
            console.error('Error updating interview stage:', error)
            addToast({
                title: 'Error',
                description: 'Failed to update interview stage',
                variant: 'destructive'
            })
        } finally {
            setIsUpdating(false)
        }
    }

    // Track if we're in initial dialog setup to prevent clearing pre-populated values
    const isInitialSetup = useRef(false)

    // Form state - ensure no null values for Input components
    const [selectedStage, setSelectedStage] = useState(application.currentStage || '')
    const [notes, setNotes] = useState(application.interviewerNotes || '')
    const [scheduledAt, setScheduledAt] = useState(application.interviewScheduledAt || '')
    const [completedAt, setCompletedAt] = useState(application.interviewCompletedAt || '')
    const [nextAction, setNextAction] = useState(application.nextActionRequired || '')
    const [nextActionDeadline, setNextActionDeadline] = useState(application.nextActionDeadline || '')

    // Track original values for change detection
    const [originalValues, setOriginalValues] = useState({
        selectedStage: '',
        notes: '',
        scheduledAt: '',
        completedAt: '',
        nextAction: '',
        nextActionDeadline: ''
    })

    // Track disabled states for smart form behavior
    const [isScheduledDisabled, setIsScheduledDisabled] = useState(false)
    const [isCompletedDisabled, setIsCompletedDisabled] = useState(false)
    const [isCompletedDateLocked, setIsCompletedDateLocked] = useState(false)

    // Clear scheduling fields when switching to initial screening
    useEffect(() => {
        if (selectedStage === 'initial_screening') {
            setScheduledAt('')
            setCompletedAt('')
        }
    }, [selectedStage])

    // Clear all form fields when stage selection changes (to prevent carrying over values from previous stage)
    useEffect(() => {
        // Only clear if not in initial setup phase (when dialog first opens)
        if (!isInitialSetup.current && isUpdateDialogOpen) {
            setNotes('')
            setScheduledAt('')
            setCompletedAt('')
            setNextAction('')
            setNextActionDeadline('')
            // Reset disabled states when stage changes
            setIsScheduledDisabled(false)
            setIsCompletedDisabled(false)
            setIsCompletedDateLocked(false)
        }
    }, [selectedStage, isUpdateDialogOpen])

    // Reset form when dialog opens
    useEffect(() => {
        if (isUpdateDialogOpen) {
            isInitialSetup.current = true
            const currentStage = application.currentStage || ''
            setSelectedStage(currentStage)

            // Pre-populate form with current values when updating existing stage
            if (currentStage) {
                setNotes(application.interviewerNotes || '')
                setScheduledAt(application.interviewScheduledAt || '')
                setCompletedAt(application.interviewCompletedAt || '')
                setNextAction(application.nextActionRequired || '')
                setNextActionDeadline(application.nextActionDeadline || '')

                // If there's already a completion date, lock the date part to prevent confusion
                if (application.interviewCompletedAt) {
                    setIsCompletedDateLocked(true)
                }
            } else {
                // Fresh start - empty form
                setNotes('')
                setScheduledAt('')
                setCompletedAt('')
                setNextAction('')
                setNextActionDeadline('')
            }

            // Store original values for change detection
            setOriginalValues({
                selectedStage: currentStage,
                notes: application.interviewerNotes || '',
                scheduledAt: application.interviewScheduledAt || '',
                completedAt: application.interviewCompletedAt || '',
                nextAction: application.nextActionRequired || '',
                nextActionDeadline: application.nextActionDeadline || ''
            })

            // Reset disabled states when modal opens
            setIsScheduledDisabled(false)
            setIsCompletedDisabled(false)
            setIsCompletedDateLocked(false)

            // Reset initial setup flag after a short delay to allow pre-population
            setTimeout(() => {
                isInitialSetup.current = false
            }, 0)
        }
    }, [isUpdateDialogOpen, application])

    const loadInterviewHistory = async () => {
        setIsLoadingHistory(true)
        try {
            const response = await getWithImpersonation(`/api/employer/applications/${application.id}/interview/history`)
            if (response.ok) {
                const data = await response.json()
                // Sort history by most recent first
                const sortedHistory = (data.interviewHistory || []).sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
                setInterviewHistory(sortedHistory)
            } else {
                addToast({
                    title: 'Error',
                    description: 'Failed to load interview history',
                    variant: 'destructive'
                })
            }
        } catch (error) {
            console.error('Error loading interview history:', error)
            addToast({
                title: 'Error',
                description: 'Failed to load interview history',
                variant: 'destructive'
            })
        } finally {
            setIsLoadingHistory(false)
        }
    }

    const handleStageUpdate = async () => {
        // Check for changes
        const hasChanges =
            selectedStage !== originalValues.selectedStage ||
            notes !== originalValues.notes ||
            scheduledAt !== originalValues.scheduledAt ||
            completedAt !== originalValues.completedAt ||
            nextAction !== originalValues.nextAction ||
            nextActionDeadline !== originalValues.nextActionDeadline

        // If no changes detected, show confirmation dialog
        if (!hasChanges) {
            setIsConfirmDialogOpen(true)
            return
        }

        // Proceed with update if changes detected
        await performUpdate()
    }

    const getStageIcon = (stage: string) => {
        switch (stage) {
            case 'initial_screening':
                return <User className="h-4 w-4" />
            case 'technical_interview':
            case 'behavioral_interview':
            case 'final_interview':
                return <FileText className="h-4 w-4" />
            case 'offer_extended':
                return <CheckCircle className="h-4 w-4" />
            case 'offer_accepted':
                return <CheckCircle className="h-4 w-4 text-green-500" />
            case 'offer_rejected':
                return <XCircle className="h-4 w-4 text-red-500" />
            default:
                return <Clock className="h-4 w-4" />
        }
    }

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'offer_accepted':
                return 'bg-green-100 text-green-800'
            case 'offer_rejected':
                return 'bg-red-100 text-red-800'
            case 'offer_extended':
                return 'bg-blue-100 text-blue-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <>
            <Card className="border border-gray-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Interview Pipeline
                    </CardTitle>
                    <CardDescription>
                        Manage interview stages for {application.candidateName}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Current Stage */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {application.currentStage && getStageIcon(application.currentStage)}
                            <div>
                                <p className="font-medium">Current Stage</p>
                                <p className="text-sm text-muted-foreground">
                                    {application.formattedCurrentStage || 'Not started'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={loadInterviewHistory}
                                        disabled={isLoadingHistory}
                                    >
                                        {isLoadingHistory ? 'Loading...' : 'View History'}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Interview History</DialogTitle>
                                        <DialogDescription>
                                            Complete interview history for {application.candidateName}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {isLoadingHistory ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="text-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                                                    <p className="text-sm text-muted-foreground">Loading interview history...</p>
                                                </div>
                                            </div>
                                        ) : interviewHistory.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-8">
                                                No interview history available
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {interviewHistory.map((history, index) => (
                                                    <div key={history.id} className="relative">
                                                        {/* Timeline connector line */}
                                                        {index < interviewHistory.length - 1 && (
                                                            <div className="absolute left-6 top-12 w-0.5 h-8 bg-border"></div>
                                                        )}
                                                        <Card className={index === 0 ? "border-primary/20 bg-primary/5" : ""}>
                                                            <CardContent className="pt-4">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="flex-shrink-0 mt-1">
                                                                        {getStageIcon(history.stage)}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <Badge variant="outline" className={getStageColor(history.stage)}>
                                                                                {history.formattedStage}
                                                                            </Badge>
                                                                            {index === 0 && (
                                                                                <Badge variant="secondary" className="text-xs">
                                                                                    Latest
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground mb-2">
                                                                            {new Date(history.createdAt).toLocaleString()}
                                                                        </p>
                                                                        {history.notes && (
                                                                            <div className="mb-2">
                                                                                <Label className="text-xs font-medium">Notes</Label>
                                                                                <p className="text-sm mt-1">{history.notes}</p>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex gap-4 text-xs">
                                                                            {history.scheduledAt && (
                                                                                <div>
                                                                                    <Label className="font-medium">Scheduled</Label>
                                                                                    <p className="text-muted-foreground mt-1">
                                                                                        {new Date(history.scheduledAt).toLocaleString()}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                            {history.completedAt && (
                                                                                <div>
                                                                                    <Label className="font-medium">Completed</Label>
                                                                                    <p className="text-muted-foreground mt-1">
                                                                                        {new Date(history.completedAt).toLocaleString()}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        Update Stage
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Update Interview Stage</DialogTitle>
                                        <DialogDescription>
                                            Update the interview stage for {application.candidateName}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="stage">Interview Stage</Label>
                                            <Select value={selectedStage} onValueChange={setSelectedStage}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select stage" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {INTERVIEW_STAGES.map((stage) => (
                                                        <SelectItem key={stage.value} value={stage.value}>
                                                            {stage.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Conditional scheduling fields - hidden for initial screening */}
                                        {selectedStage !== 'initial_screening' && (
                                            <>
                                                <div>
                                                    <DateTimePicker
                                                        value={scheduledAt}
                                                        onChange={setScheduledAt}
                                                        label="Scheduled Date/Time (Optional)"
                                                        placeholder="Select date and time"
                                                        disabled={isScheduledDisabled}
                                                    />
                                                </div>

                                                {/* Completed Date/Time - only show when updating existing interview stage */}
                                                {['technical_interview', 'behavioral_interview', 'final_interview'].includes(selectedStage) && selectedStage === application.currentStage && (
                                                    <div>
                                                        <DateTimePicker
                                                            value={completedAt}
                                                            onChange={setCompletedAt}
                                                            label="Completed Date/Time (Optional)"
                                                            placeholder="Select completion date and time"
                                                            disabled={isCompletedDisabled}
                                                            dateLocked={isCompletedDateLocked}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Seeker Visibility Info */}
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <div className="text-blue-600 mt-0.5">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="text-sm text-blue-800">
                                                    <p className="font-medium mb-1">Seeker Visibility</p>
                                                    <div className="space-y-1 text-xs">
                                                        <p>• <strong>With schedule:</strong> Seeker sees the date/time in their progress</p>
                                                        <p>• <strong>Without schedule:</strong> Seeker sees progress but no specific timing</p>
                                                        {selectedStage === 'initial_screening' && (
                                                            <p className="text-orange-700 font-medium">• Initial screening typically doesn&apos;t need scheduling</p>
                                                        )}
                                                        {['technical_interview', 'behavioral_interview', 'final_interview'].includes(selectedStage) && (
                                                            <p className="text-green-700 font-medium">• Interview stages should include dates when scheduled</p>
                                                        )}
                                                        {['offer_extended', 'offer_accepted', 'offer_rejected'].includes(selectedStage) && (
                                                            <p className="text-purple-700 font-medium">• Offer stages usually don&apos;t need scheduling</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="notes">Notes/Feedback</Label>
                                            <Textarea
                                                id="notes"
                                                placeholder={
                                                    selectedStage === 'initial_screening'
                                                        ? "Add notes about your initial review of this application..."
                                                        : "Add notes about this interview stage..."
                                                }
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                rows={3}
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="nextAction">Next Action Required (Optional)</Label>
                                            <Input
                                                id="nextAction"
                                                placeholder={
                                                    selectedStage === 'initial_screening'
                                                        ? "e.g., Schedule technical interview, Reject application, Request more info"
                                                        : "e.g., Schedule behavioral interview, Send offer letter"
                                                }
                                                value={nextAction}
                                                onChange={(e) => setNextAction(e.target.value)}
                                            />
                                        </div>

                                        <div>
                                            <DateTimePicker
                                                value={nextActionDeadline}
                                                onChange={setNextActionDeadline}
                                                label="Next Action Deadline (Optional)"
                                                placeholder="Select deadline date and time"
                                            />
                                        </div>

                                        {/* Quick Action Buttons - only show when updating existing interview stage with scheduled date */}
                                        {['technical_interview', 'behavioral_interview', 'final_interview'].includes(selectedStage) && selectedStage === application.currentStage && scheduledAt && (
                                            <div className="border-t pt-4">
                                                <Label className="text-sm font-medium text-muted-foreground mb-3 block">Quick Actions</Label>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            // Set completion date to the same date as scheduled interview (without time)
                                                            // This prevents seeker confusion by showing interview completed on scheduled date
                                                            if (scheduledAt) {
                                                                const scheduledDate = new Date(scheduledAt);
                                                                const year = scheduledDate.getFullYear();
                                                                const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
                                                                const day = String(scheduledDate.getDate()).padStart(2, '0');
                                                                // Set completion to end of the scheduled day to indicate completion
                                                                const completionDateTime = `${year}-${month}-${day}T23:59:00`;
                                                                setCompletedAt(completionDateTime);
                                                            }
                                                            setNotes('Interview completed successfully.');
                                                            // Disable scheduled date since interview is now complete, enable completed date
                                                            setIsScheduledDisabled(true);
                                                            setIsCompletedDisabled(false);
                                                            // Lock the completion date to prevent editing, but allow time adjustment
                                                            setIsCompletedDateLocked(true);
                                                        }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                        Mark as Done
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setCompletedAt('');
                                                            setScheduledAt('');
                                                            setNotes('Interview rescheduled.');
                                                            // Disable completed date since interview is being rescheduled, enable scheduled date
                                                            setIsCompletedDisabled(true);
                                                            setIsScheduledDisabled(false);
                                                            // Reset date locking since we're rescheduling
                                                            setIsCompletedDateLocked(false);
                                                        }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Calendar className="h-4 w-4" />
                                                        Reschedule
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    &quot;Mark as Done&quot; sets completion to the scheduled date (date locked, time editable). &quot;Reschedule&quot; clears dates for new scheduling.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            onClick={handleStageUpdate}
                                            disabled={isUpdating || !selectedStage}
                                        >
                                            {isUpdating ? 'Updating...' : 'Update Stage'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    {/* Additional Info */}
                    {application.nextActionRequired && (
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <div>
                                <p className="font-medium text-yellow-800">Next Action Required</p>
                                <p className="text-sm text-yellow-700">{application.nextActionRequired}</p>
                                {application.nextActionDeadline && (
                                    <p className="text-xs text-yellow-600">
                                        Due: {new Date(application.nextActionDeadline).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {application.interviewerNotes && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <Label className="text-xs font-medium">Latest Notes</Label>
                            <p className="text-sm mt-1">{application.interviewerNotes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation Dialog for No Changes */}
            <ConfirmationDialog
                isOpen={isConfirmDialogOpen}
                onClose={() => setIsConfirmDialogOpen(false)}
                onConfirm={handleConfirmNoChanges}
                title="No Changes Detected"
                description="This will clear all existing interview data. Are you sure you want to continue?"
                confirmText="Continue"
                cancelText="Cancel"
                variant="warning"
            />
        </>
    )
}

// Helper function to format stage names
function formatStageName(stage: string): string {
    const stageMap: Record<string, string> = {
        'initial_screening': 'Initial Screening',
        'technical_interview': 'Technical Interview',
        'behavioral_interview': 'Behavioral Interview',
        'final_interview': 'Final Interview',
        'offer_extended': 'Offer Extended',
        'offer_accepted': 'Offer Accepted',
        'offer_rejected': 'Offer Declined'
    }
    return stageMap[stage] || stage
}