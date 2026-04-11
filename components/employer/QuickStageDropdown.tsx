'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { CheckCircle, Clock } from 'lucide-react'
import { putWithImpersonation } from '@/lib/api-client'

interface QuickStageDropdownProps {
    applicationId: string
    currentStage?: string
    formattedCurrentStage?: string
    onStageUpdate?: (applicationId: string, newStage: string) => void
    disabled?: boolean
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

function formatStageName(stage: string): string {
    const stageMap: { [key: string]: string } = {
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

export function QuickStageDropdown({
    applicationId,
    currentStage,
    formattedCurrentStage,
    onStageUpdate,
    disabled = false
}: QuickStageDropdownProps) {
    const { addToast } = useToast()
    const [isUpdating, setIsUpdating] = useState(false)

    const handleStageChange = async (newStage: string) => {
        if (newStage === currentStage || isUpdating) return

        setIsUpdating(true)
        try {
            const response = await putWithImpersonation(
                `/api/employer/applications/${applicationId}/interview`,
                { stage: newStage }
            )

            if (response.ok) {
                addToast({
                    title: 'Success',
                    description: 'Interview stage updated successfully',
                    variant: 'success'
                })

                // Call the parent callback if provided
                if (onStageUpdate) {
                    onStageUpdate(applicationId, newStage)
                }
            } else {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update stage')
            }
        } catch (error) {
            console.error('Error updating interview stage:', error)
            addToast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to update interview stage',
                variant: 'destructive'
            })
        } finally {
            setIsUpdating(false)
        }
    }

    // If no current stage, show as a simple badge
    if (!currentStage) {
        return (
            <span className="text-sm text-gray-400">-</span>
        )
    }

    return (
        <div className="flex items-center">
            {isUpdating ? (
                <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1 animate-spin" />
                    Updating...
                </Badge>
            ) : (
                <Select
                    value={currentStage}
                    onValueChange={handleStageChange}
                    disabled={disabled || isUpdating}
                >
                    <SelectTrigger className="w-auto h-6 text-xs border-none bg-transparent p-1 hover:bg-gray-50">
                        <SelectValue>
                            <Badge variant="outline" className="text-xs">
                                {formattedCurrentStage || formatStageName(currentStage)}
                            </Badge>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {INTERVIEW_STAGES.map((stage) => (
                            <SelectItem key={stage.value} value={stage.value} className="text-xs">
                                <div className="flex items-center">
                                    {stage.value === currentStage && (
                                        <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                                    )}
                                    {stage.label}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    )
}