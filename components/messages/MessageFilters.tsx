'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Filter, X, User, Eye, EyeOff } from 'lucide-react'

const ALL_SENDERS_VALUE = '__all_senders__'
const ALL_MESSAGES_VALUE = '__all_messages__'

interface MessageFiltersProps {
    threadId: string
    onFiltersChange: (filters: FilterState) => void
    participants: Array<{
        id: string
        name: string
        firstName?: string
        lastName?: string
    }>
}

export interface FilterState {
    startDate?: Date
    endDate?: Date
    senderId?: string
    readStatus?: 'read' | 'unread'
    quickFilter?: 'today' | 'week' | 'unread'
}

export function MessageFilters({ threadId, onFiltersChange, participants }: MessageFiltersProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [filters, setFilters] = useState<FilterState>({})
    const [startDate, setStartDate] = useState<Date>()
    const [endDate, setEndDate] = useState<Date>()

    const activeFiltersCount = Object.values(filters).filter(value =>
        value !== undefined && value !== null && value !== ''
    ).length

    const handleFilterChange = (newFilters: Partial<FilterState>) => {
        const updatedFilters = { ...filters, ...newFilters }

        // Clear conflicting filters
        if (newFilters.quickFilter) {
            // Clear date range when using quick filter
            delete updatedFilters.startDate
            delete updatedFilters.endDate
            setStartDate(undefined)
            setEndDate(undefined)
        }

        if (newFilters.startDate || newFilters.endDate) {
            // Clear quick filter when using date range
            delete updatedFilters.quickFilter
        }

        setFilters(updatedFilters)
        onFiltersChange(updatedFilters)
    }

    const clearFilters = () => {
        setFilters({})
        setStartDate(undefined)
        setEndDate(undefined)
        onFiltersChange({})
    }

    const removeFilter = (filterKey: keyof FilterState) => {
        const newFilters = { ...filters }
        delete newFilters[filterKey]

        if (filterKey === 'startDate' || filterKey === 'endDate') {
            if (filterKey === 'startDate') setStartDate(undefined)
            if (filterKey === 'endDate') setEndDate(undefined)
        }

        setFilters(newFilters)
        onFiltersChange(newFilters)
    }

    const handleDateRangeApply = () => {
        handleFilterChange({
            startDate: startDate,
            endDate: endDate
        })
    }

    const getFilterLabel = (key: keyof FilterState, value: any): string => {
        switch (key) {
            case 'startDate':
            case 'endDate':
                return value ? value.toLocaleDateString() : ''
            case 'senderId':
                const participant = participants.find(p => p.id === value)
                return participant?.name || 'Unknown'
            case 'readStatus':
                return value === 'read' ? 'Read' : 'Unread'
            case 'quickFilter':
                switch (value) {
                    case 'today': return 'Today'
                    case 'week': return 'This Week'
                    case 'unread': return 'Unread'
                    default: return value
                }
            default:
                return String(value)
        }
    }

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2"
            >
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                        {activeFiltersCount}
                    </Badge>
                )}
            </Button>

            {isOpen && (
                <Card className="absolute top-full mt-2 right-0 z-50 w-80 shadow-lg border">
                    <CardContent className="p-4 space-y-4">
                        {/* Quick Filters */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Quick Filters</label>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={filters.quickFilter === 'today' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleFilterChange({ quickFilter: 'today' })}
                                >
                                    Today
                                </Button>
                                <Button
                                    variant={filters.quickFilter === 'week' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleFilterChange({ quickFilter: 'week' })}
                                >
                                    This Week
                                </Button>
                                <Button
                                    variant={filters.quickFilter === 'unread' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleFilterChange({ quickFilter: 'unread' })}
                                >
                                    Unread Only
                                </Button>
                            </div>
                        </div>

                        {/* Date Range */}
                        <div>
                            <Label className="text-sm font-medium mb-2 block">Date Range</Label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input
                                        type="date"
                                        value={startDate ? startDate.toISOString().split('T')[0] : ''}
                                        onChange={(e) => {
                                            const date = e.target.value ? new Date(e.target.value) : undefined
                                            setStartDate(date)
                                        }}
                                        placeholder="Start date"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        type="date"
                                        value={endDate ? endDate.toISOString().split('T')[0] : ''}
                                        onChange={(e) => {
                                            const date = e.target.value ? new Date(e.target.value) : undefined
                                            setEndDate(date)
                                        }}
                                        placeholder="End date"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDateRangeApply}
                                    disabled={!startDate && !endDate}
                                >
                                    Apply
                                </Button>
                            </div>
                        </div>

                        {/* Sender Filter */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Sender</label>
                            <Select
                                value={filters.senderId ?? ALL_SENDERS_VALUE}
                                onValueChange={(value) =>
                                    handleFilterChange({
                                        senderId: value === ALL_SENDERS_VALUE ? undefined : value
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All senders" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_SENDERS_VALUE}>All senders</SelectItem>
                                    {participants.map((participant) => (
                                        <SelectItem key={participant.id} value={participant.id}>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                {participant.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Read Status */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Read Status</label>
                            <Select
                                value={filters.readStatus ?? ALL_MESSAGES_VALUE}
                                onValueChange={(value) =>
                                    handleFilterChange({
                                        readStatus:
                                            value === ALL_MESSAGES_VALUE ? undefined : (value as 'read' | 'unread')
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All messages" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_MESSAGES_VALUE}>All messages</SelectItem>
                                    <SelectItem value="unread">
                                        <div className="flex items-center gap-2">
                                            <EyeOff className="h-4 w-4" />
                                            Unread only
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="read">
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-4 w-4" />
                                            Read only
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Active Filters */}
                        {activeFiltersCount > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium">Active Filters</label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="h-auto p-1 text-xs"
                                    >
                                        Clear all
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {Object.entries(filters).map(([key, value]) => {
                                        if (!value) return null
                                        const label = getFilterLabel(key as keyof FilterState, value)
                                        if (!label) return null

                                        return (
                                            <Badge
                                                key={key}
                                                variant="secondary"
                                                className="flex items-center gap-1 text-xs"
                                            >
                                                {label}
                                                <X
                                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                    onClick={() => removeFilter(key as keyof FilterState)}
                                                />
                                            </Badge>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
