'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, Calendar } from 'lucide-react'

interface InterviewProgressProps {
    jobTitle: string
    companyName: string
    currentStage?: string // The detailed stage from employer side
    interviewScheduledAt?: string
    interviewCompletedAt?: string
}

const SEEKER_STAGES = [
    {
        key: 'application_review',
        label: 'Application Review',
        description: 'Your application is being reviewed',
        icon: Clock,
        employerStages: ['initial_screening'] // Initial screening is part of application review
    },
    {
        key: 'interview_process',
        label: 'Interview Process',
        description: 'Interview scheduled or in progress',
        icon: Calendar,
        employerStages: ['technical_interview', 'behavioral_interview', 'final_interview']
    },
    {
        key: 'decision_made',
        label: 'Decision Made',
        description: 'Final decision has been made',
        icon: CheckCircle,
        employerStages: ['offer_extended', 'offer_accepted', 'offer_rejected']
    }
]

export function InterviewProgress({
    jobTitle,
    companyName,
    currentStage,
    interviewScheduledAt,
    interviewCompletedAt
}: InterviewProgressProps) {
    // Map detailed employer stage to simplified seeker stage
    const getCurrentSeekerStage = () => {
        if (!currentStage) return 'application_review'

        for (const stage of SEEKER_STAGES) {
            if (stage.employerStages.includes(currentStage)) {
                return stage.key
            }
        }

        return 'application_review' // Default
    }

    const currentSeekerStage = getCurrentSeekerStage()
    const currentStageIndex = SEEKER_STAGES.findIndex(s => s.key === currentSeekerStage)

    // Calculate progress more granularly within stages
    const getProgressPercentage = () => {
        if (!currentStage) return 0 // No stage set yet

        const currentSeekerStageData = SEEKER_STAGES.find(s => s.key === currentSeekerStage)
        if (!currentSeekerStageData) return 0

        const employerStages = currentSeekerStageData.employerStages
        if (employerStages.length === 0) return 33 // Application review stage

        // For interview_process stage, calculate progress within the interview stages
        if (currentSeekerStage === 'interview_process') {
            const stageIndex = employerStages.indexOf(currentStage)
            if (stageIndex === -1) return 33 // Fallback

            // Progress from 33% (start of interview process) to 67% (end of interviews)
            const interviewProgress = (stageIndex / (employerStages.length - 1)) * 34 // 34% range (33-67)
            return 33 + interviewProgress
        }

        // For decision_made stage, always 100%
        if (currentSeekerStage === 'decision_made') {
            return 100
        }

        return 33 // Default
    }

    const progressPercentage = getProgressPercentage()

    const getStageStatus = (stageKey: string) => {
        const stageIndex = SEEKER_STAGES.findIndex(s => s.key === stageKey)
        if (stageIndex < currentStageIndex) return 'completed'
        if (stageIndex === currentStageIndex) return 'current'
        return 'pending'
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Interview Progress
                </CardTitle>
                <CardDescription>
                    Track your interview progress for {jobTitle} at {companyName}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Application Progress</span>
                        <span className="text-sm font-bold text-blue-600">{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="space-y-1">
                        <Progress value={progressPercentage} className="h-2 sm:h-3" />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Applied</span>
                            <span>In Progress</span>
                            <span>Decision</span>
                        </div>
                    </div>
                </div>

                {/* Stage Steps - Enhanced for mobile */}
                <div className="space-y-3 sm:space-y-4">
                    {SEEKER_STAGES.map((stage, index) => {
                        const status = getStageStatus(stage.key)
                        const Icon = stage.icon
                        const isLast = index === SEEKER_STAGES.length - 1

                        return (
                            <div key={stage.key} className="flex items-start gap-3">
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <div className={`p-1.5 sm:p-2 rounded-full transition-colors ${status === 'current'
                                        ? 'bg-blue-50 ring-2 ring-blue-200'
                                        : status === 'completed'
                                            ? 'bg-green-50 ring-2 ring-green-200'
                                            : 'bg-gray-50'
                                        }`}>
                                        {status === 'completed' ? (
                                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                                        ) : status === 'current' ? (
                                            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                                        ) : (
                                            <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-gray-300" />
                                        )}
                                    </div>
                                    {!isLast && (
                                        <div className={`w-0.5 h-6 sm:h-8 mt-2 transition-colors ${status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                                            }`} />
                                    )}
                                </div>
                                <div className="flex-1 pt-0.5 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <h4 className={`font-medium text-sm sm:text-base transition-colors ${status === 'current'
                                            ? 'text-blue-700'
                                            : status === 'completed'
                                                ? 'text-green-700'
                                                : 'text-gray-500'
                                            }`}>
                                            {stage.label}
                                        </h4>
                                        {status === 'current' && (
                                            <Badge variant="secondary" className="text-xs w-fit">
                                                Current
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                        {stage.description}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Additional Information */}
                <div className="space-y-3 pt-4 border-t">
                    {interviewScheduledAt && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                <span className="text-blue-700 font-medium">Interview scheduled:</span>
                            </div>
                            <span className="text-sm font-medium text-blue-800 sm:ml-auto">
                                {new Date(interviewScheduledAt).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                    )}

                    {interviewCompletedAt && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span className="text-green-700 font-medium">Last interview completed:</span>
                            </div>
                            <span className="text-sm font-medium text-green-800 sm:ml-auto">
                                {new Date(interviewCompletedAt).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </span>
                        </div>
                    )}

                    {!currentStage && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <Clock className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <p className="font-medium text-gray-700 text-sm">Application Under Review</p>
                                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                    Your application is being reviewed by the employer. You&apos;ll be notified of any updates.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}