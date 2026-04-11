'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Loader2, Download, ChevronDown, ChevronRight, FileText, Filter, X } from 'lucide-react'

interface ChangeLogEntry {
    id: string
    superAdminId: string
    superAdminName?: string
    superAdminEmail?: string
    actionType: string  // From database
    actionDetails?: any  // From database - contains structured details
    oldValue?: any
    newValue?: any
    createdAt: string
}

/**
 * Format actionDetails JSON into human-readable message
 */
function formatActionMessage(actionType: string, actionDetails: any): string {
    if (!actionDetails) return 'No details available'

    switch (actionType.toUpperCase()) {
        case 'REFRESH_APP_FIELDS':
            const appCount = actionDetails.fieldsRefreshed || 0
            return `Refreshed ${appCount} app fields from database schema`

        case 'REFRESH_GHL_FIELDS':
            const ghlCount = actionDetails.fieldsRefreshed || 0
            const standardCount = actionDetails.standardFields || 0
            const customCount = actionDetails.customFields || 0
            return `Refreshed ${ghlCount} GHL fields (${standardCount} standard, ${customCount} custom)`

        case 'CREATE_MAPPING':
        case 'MAPPING_CREATED':
            const ghlField = actionDetails.ghlFieldName || actionDetails.ghlFieldKey || 'unknown'
            const appField = actionDetails.appFieldName || actionDetails.appFieldKey || 'unknown'
            return `Created mapping: ${appField} → ${ghlField}`

        case 'UPDATE_MAPPING':
        case 'MAPPING_UPDATED':
            const updates = actionDetails.fieldsChanged || []
            if (updates.length > 0) {
                return `Updated mapping: changed ${updates.join(', ')}`
            }
            return 'Updated mapping configuration'

        case 'DELETE_MAPPING':
        case 'MAPPING_DELETED':
            return `Deleted mapping for ${actionDetails.appFieldKey || 'field'}`

        case 'TEST_CONNECTION':
        case 'CONNECTION_TESTED':
            const status = actionDetails.success ? 'successful' : 'failed'
            return `Connection test ${status}${actionDetails.locationName ? ` (${actionDetails.locationName})` : ''}`

        case 'UPDATE_CREDENTIALS':
        case 'CREDENTIALS_UPDATED':
            return 'Updated GHL API credentials'

        case 'CREATE_GROUP':
        case 'GROUP_CREATED':
            return `Created field group: ${actionDetails.groupName || 'unnamed'}`

        case 'UPDATE_GROUP':
        case 'GROUP_UPDATED':
            return `Updated field group: ${actionDetails.groupName || 'unnamed'}`

        case 'DELETE_GROUP':
        case 'GROUP_DELETED':
            return `Deleted field group: ${actionDetails.groupName || 'unnamed'}`

        case 'UPDATE_SETTINGS':
        case 'SETTINGS_UPDATED':
            const settingsChanged = actionDetails.settingsChanged || []
            if (settingsChanged.length > 0) {
                return `Updated settings: ${settingsChanged.join(', ')}`
            }
            return 'Updated CRM sync settings'

        default:
            // Fallback: try to create a readable summary
            const keys = Object.keys(actionDetails)
            if (keys.length === 0) return 'Action completed'
            if (keys.length === 1) return `${keys[0]}: ${actionDetails[keys[0]]}`
            return `Action completed with ${keys.length} changes`
    }
}

interface PaginationInfo {
    page: number
    pageSize: number
    totalEntries: number
    totalPages: number
}

const ACTION_TYPES = [
    { value: 'CREATE_CREDENTIALS', label: 'Credentials Created' },
    { value: 'UPDATE_CREDENTIALS', label: 'Credentials Updated' },
    { value: 'TEST_CONNECTION', label: 'Connection Tested' },
    { value: 'CREATE_MAPPING', label: 'Mapping Created' },
    { value: 'UPDATE_MAPPING', label: 'Mapping Updated' },
    { value: 'DELETE_MAPPING', label: 'Mapping Deleted' },
    { value: 'CREATE_GROUP', label: 'Group Created' },
    { value: 'UPDATE_GROUP', label: 'Group Updated' },
    { value: 'DELETE_GROUP', label: 'Group Deleted' },
    { value: 'UPDATE_SETTINGS', label: 'Settings Updated' },
    { value: 'REFRESH_GHL_FIELDS', label: 'GHL Fields Refreshed' },
    { value: 'REFRESH_APP_FIELDS', label: 'App Fields Refreshed' }
]

export function ChangeLogTab() {
    const { addToast } = useToast()
    const [entries, setEntries] = useState<ChangeLogEntry[]>([])
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        pageSize: 25,
        totalEntries: 0,
        totalPages: 0
    })
    const [isLoading, setIsLoading] = useState(true)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    // Filters
    const [adminFilter, setAdminFilter] = useState<string>('')
    const [actionTypeFilter, setActionTypeFilter] = useState<string[]>([])
    const [startDateFilter, setStartDateFilter] = useState<string>('')
    const [endDateFilter, setEndDateFilter] = useState<string>('')
    const [availableAdmins, setAvailableAdmins] = useState<Array<{ id: string, name: string, email: string }>>([])

    useEffect(() => {
        loadChangeLog()
    }, [pagination.page, pagination.pageSize, adminFilter, actionTypeFilter, startDateFilter, endDateFilter])

    useEffect(() => {
        loadAdminList()
    }, [])

    const loadChangeLog = async () => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                pageSize: pagination.pageSize.toString()
            })

            if (adminFilter) params.append('adminId', adminFilter)
            if (actionTypeFilter.length > 0) params.append('actionTypes', actionTypeFilter.join(','))
            if (startDateFilter) params.append('startDate', startDateFilter)
            if (endDateFilter) params.append('endDate', endDateFilter)

            const response = await fetch(`/api/admin/crm-sync/change-log?${params}`)
            if (response.ok) {
                const data = await response.json()
                setEntries(Array.isArray(data.changeLogs) ? data.changeLogs : [])
                setPagination({
                    page: data.pagination?.currentPage || 1,
                    pageSize: data.pagination?.limit || 25,
                    totalEntries: data.pagination?.totalCount || 0,
                    totalPages: data.pagination?.totalPages || 0
                })
            } else {
                setEntries([])
            }
        } catch (error) {
            console.error('Error loading change log:', error)
            setEntries([])
        } finally {
            setIsLoading(false)
        }
    }

    const loadAdminList = async () => {
        try {
            const response = await fetch('/api/admin/crm-sync/change-log/admins')
            if (response.ok) {
                const data = await response.json()
                setAvailableAdmins(data.admins || [])
            }
        } catch (error) {
            console.error('Error loading admin list:', error)
        }
    }

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const exportToCSV = async () => {
        try {
            const params = new URLSearchParams()
            if (adminFilter) params.append('adminId', adminFilter)
            if (actionTypeFilter.length > 0) params.append('actionTypes', actionTypeFilter.join(','))
            if (startDateFilter) params.append('startDate', startDateFilter)
            if (endDateFilter) params.append('endDate', endDateFilter)

            const response = await fetch(`/api/admin/crm-sync/change-log/export?${params}`)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `crm-sync-change-log-${new Date().toISOString().split('T')[0]}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)
            }
        } catch (error) {
            console.error('Error exporting CSV:', error)
            addToast({ title: 'Error', description: 'Failed to export CSV', variant: 'destructive' })
        }
    }

    const clearFilters = () => {
        setAdminFilter('')
        setActionTypeFilter([])
        setStartDateFilter('')
        setEndDateFilter('')
        setPagination(prev => ({ ...prev, page: 1 }))
    }

    const hasActiveFilters = (): boolean => {
        return !!(adminFilter || actionTypeFilter.length > 0 || startDateFilter || endDateFilter)
    }

    const formatDate = (dateString: string | undefined): string => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    }

    const getActionBadgeVariant = (action: string | undefined): "default" | "secondary" | "destructive" | "outline" => {
        if (!action) return 'outline'
        const actionLower = action.toLowerCase()
        if (actionLower.includes('deleted') || actionLower.includes('delete')) return 'destructive'
        if (actionLower.includes('created') || actionLower.includes('create')) return 'default'
        if (actionLower.includes('updated') || actionLower.includes('update')) return 'secondary'
        return 'outline'
    }

    const toggleActionTypeFilter = (actionType: string) => {
        setActionTypeFilter(prev => {
            if (prev.includes(actionType)) {
                return prev.filter(a => a !== actionType)
            } else {
                return [...prev, actionType]
            }
        })
        setPagination(prev => ({ ...prev, page: 1 }))
    }

    if (isLoading && entries.length === 0) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Filters Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Filters
                            </CardTitle>
                            <CardDescription>Filter change log entries by admin, action, or date</CardDescription>
                        </div>
                        {hasActiveFilters() && (
                            <Button variant="outline" size="sm" onClick={clearFilters}>
                                <X className="h-4 w-4 mr-2" />
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Admin Filter */}
                        <div className="space-y-2">
                            <Label>Super Admin</Label>
                            <Select value={adminFilter} onValueChange={(value) => {
                                setAdminFilter(value)
                                setPagination(prev => ({ ...prev, page: 1 }))
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    {availableAdmins.map(admin => (
                                        <SelectItem key={admin.id} value={admin.id}>
                                            {admin.name || admin.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Start Date */}
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                                type="date"
                                value={startDateFilter}
                                onChange={(e) => {
                                    setStartDateFilter(e.target.value)
                                    setPagination(prev => ({ ...prev, page: 1 }))
                                }}
                            />
                        </div>

                        {/* End Date */}
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                                type="date"
                                value={endDateFilter}
                                onChange={(e) => {
                                    setEndDateFilter(e.target.value)
                                    setPagination(prev => ({ ...prev, page: 1 }))
                                }}
                            />
                        </div>

                        {/* Page Size */}
                        <div className="space-y-2">
                            <Label>Entries per page</Label>
                            <Select
                                value={pagination.pageSize.toString()}
                                onValueChange={(value) => {
                                    setPagination(prev => ({ ...prev, pageSize: parseInt(value), page: 1 }))
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Action Type Filters */}
                    <div className="space-y-2">
                        <Label>Action Types</Label>
                        <div className="flex flex-wrap gap-2">
                            {ACTION_TYPES.map(type => (
                                <Badge
                                    key={type.value}
                                    variant={actionTypeFilter.includes(type.value) ? 'default' : 'outline'}
                                    className="cursor-pointer"
                                    onClick={() => toggleActionTypeFilter(type.value)}
                                >
                                    {type.label}
                                    {actionTypeFilter.includes(type.value) && (
                                        <X className="h-3 w-3 ml-1" />
                                    )}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Change Log Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Change Log</CardTitle>
                            <CardDescription>
                                Showing {entries.length} of {pagination.totalEntries} entries
                                {hasActiveFilters() && ' (filtered)'}
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={exportToCSV}>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <FileText className="h-12 w-12 text-gray-400" />
                            <p className="text-gray-600">No change log entries found</p>
                            {hasActiveFilters() && (
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12"></TableHead>
                                            <TableHead>Timestamp</TableHead>
                                            <TableHead>Super Admin</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Message</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {entries.map(entry => (
                                            <Collapsible key={entry.id} asChild open={expandedRows.has(entry.id)}>
                                                <>
                                                    <TableRow className="cursor-pointer" onClick={() => toggleRow(entry.id)}>
                                                        <TableCell>
                                                            <CollapsibleTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    {expandedRows.has(entry.id) ? (
                                                                        <ChevronDown className="h-4 w-4" />
                                                                    ) : (
                                                                        <ChevronRight className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </CollapsibleTrigger>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {formatDate(entry.createdAt)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <div className="font-medium">{entry.superAdminName || 'Unknown'}</div>
                                                                <div className="text-xs text-gray-500">{entry.superAdminEmail || 'N/A'}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={getActionBadgeVariant(entry.actionType)}>
                                                                {ACTION_TYPES.find(t => t.value === entry.actionType)?.label || entry.actionType || 'Unknown Action'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{formatActionMessage(entry.actionType, entry.actionDetails)}</TableCell>
                                                    </TableRow>
                                                    <CollapsibleContent asChild>
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="bg-gray-50">
                                                                <div className="p-4 space-y-3">
                                                                    {entry.oldValue && (
                                                                        <div>
                                                                            <div className="text-sm font-medium text-gray-700 mb-1">
                                                                                Previous Value:
                                                                            </div>
                                                                            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                                                                                {JSON.stringify(entry.oldValue, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                    {entry.newValue && (
                                                                        <div>
                                                                            <div className="text-sm font-medium text-gray-700 mb-1">
                                                                                New Value:
                                                                            </div>
                                                                            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                                                                                {JSON.stringify(entry.newValue, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                    {!entry.oldValue && !entry.newValue && (
                                                                        <p className="text-sm text-gray-500 italic">
                                                                            No additional details available
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    </CollapsibleContent>
                                                </>
                                            </Collapsible>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-gray-600">
                                    Page {pagination.page} of {pagination.totalPages}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                        disabled={pagination.page === 1 || isLoading}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                                        disabled={pagination.page === pagination.totalPages || isLoading}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
