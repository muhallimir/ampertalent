'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar, X } from 'lucide-react'

interface DateRangePickerPopupProps {
    startDate: Date | undefined
    endDate: Date | undefined
    onStartDateChange: (date: Date | undefined) => void
    onEndDateChange: (date: Date | undefined) => void
    onApply: () => void
    placeholder?: string
    disabled?: boolean
}

export function DateRangePickerPopup({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onApply,
    placeholder = "Custom range",
    disabled
}: DateRangePickerPopupProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [tempStartDate, setTempStartDate] = useState<Date | undefined>(startDate)
    const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endDate)

    const formatDateForInput = (date: Date | undefined): string => {
        if (!date) return ''
        return date.toISOString().split('T')[0]
    }

    const formatDateRange = () => {
        if (!startDate && !endDate) return placeholder
        if (startDate && !endDate) return startDate.toLocaleDateString()
        if (!startDate && endDate) return endDate.toLocaleDateString()
        return `${startDate!.toLocaleDateString()} - ${endDate!.toLocaleDateString()}`
    }

    const handleApply = () => {
        if (!tempStartDate || !tempEndDate) {
            return
        }

        if (tempStartDate > tempEndDate) {
            // Swap dates if start is after end
            onStartDateChange(tempEndDate)
            onEndDateChange(tempStartDate)
        } else {
            onStartDateChange(tempStartDate)
            onEndDateChange(tempEndDate)
        }

        setIsOpen(false)
        onApply()
    }

    const handleClear = () => {
        setTempStartDate(undefined)
        setTempEndDate(undefined)
    }

    const handleCancel = () => {
        setTempStartDate(startDate)
        setTempEndDate(endDate)
        setIsOpen(false)
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="px-3 py-2 h-9 text-sm justify-start text-left"
                    disabled={disabled}
                >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formatDateRange()}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4 space-y-4">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Label className="text-sm font-medium text-gray-700">Start Date</Label>
                            <Input
                                type="date"
                                value={formatDateForInput(tempStartDate)}
                                onChange={(e) => setTempStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                                className="w-full"
                            />
                        </div>
                        <div className="flex-1">
                            <Label className="text-sm font-medium text-gray-700">End Date</Label>
                            <Input
                                type="date"
                                value={formatDateForInput(tempEndDate)}
                                onChange={(e) => setTempEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                                className="w-full"
                            />
                        </div>
                    </div>
                    <div className="flex justify-between gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleClear}
                            className="flex-1"
                        >
                            <X className="mr-1 h-3 w-3" />
                            Clear
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleApply}
                            className="flex-1"
                            disabled={!tempStartDate || !tempEndDate}
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}