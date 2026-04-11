'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DateTimePickerProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    label?: string
    disabled?: boolean
    dateLocked?: boolean // When true, date is locked but time can be edited
}

export function DateTimePicker({ value, onChange, placeholder, label, disabled, dateLocked }: DateTimePickerProps) {
    const [isFocused, setIsFocused] = useState(false)

    // If date is locked, split the value into date and time parts
    const getDatePart = (dateTimeString: string) => {
        if (!dateTimeString) return ''
        return dateTimeString.split('T')[0] || ''
    }

    const getTimePart = (dateTimeString: string) => {
        if (!dateTimeString) return ''
        return dateTimeString.split('T')[1] || ''
    }

    const handleTimeChange = (newTime: string) => {
        const currentDate = getDatePart(value)
        if (currentDate) {
            onChange(`${currentDate}T${newTime}`)
        } else {
            // If no date is set, use current date
            const today = new Date().toISOString().split('T')[0]
            onChange(`${today}T${newTime}`)
        }
    }

    if (dateLocked && value) {
        // Render separate date (disabled) and time (editable) inputs
        return (
            <div className="space-y-2">
                {label && <Label>{label}</Label>}
                <div className="flex gap-2">
                    <Input
                        type="date"
                        value={getDatePart(value)}
                        disabled={true}
                        className="flex-1 pr-3 pl-3 py-2 h-9 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                        title="Date is locked after marking as done"
                    />
                    <Input
                        type="time"
                        value={getTimePart(value)}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        disabled={disabled}
                        className="flex-1 pr-3 pl-3 py-2 h-9 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                        title="Time can still be adjusted"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onChange('')}
                        className="px-2 py-1 h-9 text-xs font-medium shrink-0 hover:bg-gray-50"
                        title="Clear date"
                    >
                        CLEAR
                    </Button>
                </div>
            </div>
        )
    }

    // Normal datetime-local input
    return (
        <div className="space-y-2">
            {label && <Label>{label}</Label>}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Input
                        type="datetime-local"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={`pr-10 pl-3 py-2 h-9 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
                    />
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onChange('')}
                    className="px-2 py-1 h-9 text-xs font-medium shrink-0 hover:bg-gray-50"
                    title="Clear date"
                >
                    CLEAR
                </Button>
            </div>
        </div>
    )
}