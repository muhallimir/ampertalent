'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface InterviewScheduleIndicatorProps {
    applicationId: string
}

interface ApplicationData {
    interviewScheduledAt: string | null
    interviewStage: string | null
}

export function InterviewScheduleIndicator({ applicationId }: InterviewScheduleIndicatorProps) {
    const [applicationData, setApplicationData] = useState<ApplicationData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchApplicationData = async () => {
            try {
                const response = await fetch(`/api/applications/${applicationId}`)
                if (response.ok) {
                    const data = await response.json()
                    setApplicationData({
                        interviewScheduledAt: data.interviewScheduledAt,
                        interviewStage: data.interviewStage
                    })
                }
            } catch (error) {
                console.error('Error fetching application data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchApplicationData()
    }, [applicationId])

    if (loading || !applicationData?.interviewScheduledAt) {
        return null
    }

    const interviewDate = new Date(applicationData.interviewScheduledAt)
    const now = new Date()
    const isUpcoming = interviewDate > now

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        })
    }

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    return (
        <div className={`p-3 rounded-lg border-2 ${isUpcoming
                ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-300'
                : 'bg-gray-50 border-gray-300'
            }`}>
            <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isUpcoming ? 'bg-purple-100' : 'bg-gray-200'
                    }`}>
                    <Calendar className={`h-5 w-5 ${isUpcoming ? 'text-purple-600' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className={`text-sm font-semibold ${isUpcoming ? 'text-purple-900' : 'text-gray-700'
                            }`}>
                            {isUpcoming ? '📅 Interview Scheduled' : 'Interview Completed'}
                        </h4>
                        {isUpcoming && (
                            <Badge className="bg-purple-600 hover:bg-purple-700">
                                Upcoming
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-700 mb-1">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="font-medium">{formatDate(interviewDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="font-medium">{formatTime(interviewDate)}</span>
                        </div>
                    </div>
                    {applicationData.interviewStage && (
                        <div className="text-xs text-gray-600">
                            Stage: <span className="font-medium">{applicationData.interviewStage.replace(/_/g, ' ')}</span>
                        </div>
                    )}
                    {isUpcoming && (
                        <div className="mt-2 text-xs text-purple-700">
                            💡 Make sure to prepare any questions you&apos;d like to ask about the role!
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
