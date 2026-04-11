'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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
import { Switch } from '@/components/ui/switch'
import {
    Plus,
    Edit2,
    Trash2,
    Loader2,
    ArrowRight,
    ArrowLeft,
    ArrowLeftRight,
    AlertTriangle,
    RefreshCw,
    Filter
} from 'lucide-react'

interface GhlField {
    id: string
    ghlFieldKey: string
    name: string
    dataType: string
    isSystemField: boolean
}

interface AppField {
    id: string
    fieldKey: string
    name: string
    dataType: string
    modelName?: string
    isSystemField: boolean
}

interface FieldGroup {
    id: string
    name: string
}

interface FieldMapping {
    id: string
    ghlField: GhlField
    appField: AppField
    syncDirection: 'app_to_ghl' | 'ghl_to_app' | 'two_way'  // Per-mapping direction (can override settings default)
    isEnabled: boolean
    groupId?: string | null
    group?: FieldGroup | null
    createdAt: string
    updatedAt: string
}

/**
 * Field Mappings Tab - Create and manage field mappings between App and GHL
 * 
 * Sync Direction Architecture:
 * - Settings.defaultSyncDirection: Global default used when creating new mappings
 * - FieldMapping.syncDirection: Per-mapping direction (can differ from global default)
 * - When creating a new mapping, the dialog pre-fills with settings.defaultSyncDirection
 * - Admins can override on a per-mapping basis if needed
 */
export function FieldMappingsTab() {
    const { addToast } = useToast()
    const [mappings, setMappings] = useState<FieldMapping[]>([])
    const [ghlFields, setGhlFields] = useState<GhlField[]>([])
    const [appFields, setAppFields] = useState<AppField[]>([])
    const [groups, setGroups] = useState<FieldGroup[]>([])
    const [defaultSyncDirection, setDefaultSyncDirection] = useState<'app_to_ghl' | 'ghl_to_app' | 'two_way'>('app_to_ghl')
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [editingMapping, setEditingMapping] = useState<FieldMapping | null>(null)
    const [deletingMapping, setDeletingMapping] = useState<FieldMapping | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isAutoGenerating, setIsAutoGenerating] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [currentPage, setCurrentPage] = useState<number>(1)
    const itemsPerPage = 10

    // Grouped field data for filtering
    const [appFieldsByModel, setAppFieldsByModel] = useState<Record<string, AppField[]>>({})
    const [ghlFieldsByType, setGhlFieldsByType] = useState<Record<string, GhlField[]>>({})
    const [appFieldModels, setAppFieldModels] = useState<string[]>([])
    const [ghlFieldTypes, setGhlFieldTypes] = useState<string[]>([])

    const [formData, setFormData] = useState({
        ghlFieldId: '',
        appFieldId: '',
        syncDirection: 'app_to_ghl' as 'app_to_ghl' | 'ghl_to_app' | 'two_way',
        groupId: '',
        appFieldGroup: '', // Selected app field model/group
        ghlFieldGroup: ''  // Selected GHL field type (system/custom)
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setIsLoading(true)
        try {
            await Promise.all([
                loadMappings(),
                loadGhlFields(),
                loadAppFields(),
                loadGroups(),
                loadSettings()
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const loadSettings = async () => {
        try {
            const response = await fetch('/api/admin/crm-sync/settings')
            if (response.ok) {
                const data = await response.json()
                if (data.settings?.defaultSyncDirection) {
                    setDefaultSyncDirection(data.settings.defaultSyncDirection)
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error)
        }
    }

    const loadMappings = async () => {
        try {
            const response = await fetch('/api/admin/crm-sync/mappings')
            if (response.ok) {
                const data = await response.json()
                setMappings(data.mappings || [])
            }
        } catch (error) {
            console.error('Error loading mappings:', error)
        }
    }

    const loadGhlFields = async () => {
        try {
            const response = await fetch('/api/admin/crm-sync/ghl-fields')
            if (response.ok) {
                const data = await response.json()
                setGhlFields(data.fields || [])

                // Store grouped data
                if (data.groupedByType) {
                    setGhlFieldsByType(data.groupedByType)
                    setGhlFieldTypes(Object.keys(data.groupedByType))
                }
            }
        } catch (error) {
            console.error('Error loading GHL fields:', error)
        }
    }

    const loadAppFields = async () => {
        try {
            const response = await fetch('/api/admin/crm-sync/app-fields')
            if (response.ok) {
                const data = await response.json()
                setAppFields(data.fields || [])

                // Store grouped data
                if (data.groupedByModel) {
                    setAppFieldsByModel(data.groupedByModel)
                    setAppFieldModels(Object.keys(data.groupedByModel).sort())
                }
            }
        } catch (error) {
            console.error('Error loading app fields:', error)
        }
    }

    const loadGroups = async () => {
        try {
            const response = await fetch('/api/admin/crm-sync/groups')
            if (response.ok) {
                const data = await response.json()
                setGroups(data.groups || [])
            }
        } catch (error) {
            console.error('Error loading groups:', error)
        }
    }

    const refreshGhlFields = async () => {
        setIsRefreshing(true)
        try {
            const response = await fetch('/api/admin/crm-sync/ghl-fields/refresh', {
                method: 'POST'
            })
            if (response.ok) {
                await loadGhlFields()
                addToast({ title: 'Success', description: 'GHL fields refreshed successfully', variant: 'success' })
            } else {
                addToast({ title: 'Error', description: 'Failed to refresh GHL fields', variant: 'destructive' })
            }
        } catch (error) {
            console.error('Error refreshing GHL fields:', error)
            addToast({ title: 'Error', description: 'Failed to refresh GHL fields', variant: 'destructive' })
        } finally {
            setIsRefreshing(false)
        }
    }

    const refreshAppFields = async () => {
        setIsRefreshing(true)
        try {
            const response = await fetch('/api/admin/crm-sync/app-fields?refresh=true', {
                method: 'GET'
            })
            if (response.ok) {
                await loadAppFields()
                addToast({ title: 'Success', description: 'App fields refreshed from schema', variant: 'success' })
            } else {
                addToast({ title: 'Error', description: 'Failed to refresh app fields', variant: 'destructive' })
            }
        } catch (error) {
            console.error('Error refreshing app fields:', error)
            addToast({ title: 'Error', description: 'Failed to refresh app fields', variant: 'destructive' })
        } finally {
            setIsRefreshing(false)
        }
    }

    const openCreateDialog = () => {
        setEditingMapping(null)
        setFormData({
            ghlFieldId: '',
            appFieldId: '',
            syncDirection: defaultSyncDirection, // Use settings default
            groupId: '',
            appFieldGroup: '',
            ghlFieldGroup: ''
        })
        setIsDialogOpen(true)
    }

    const openEditDialog = (mapping: FieldMapping) => {
        setEditingMapping(mapping)
        const appField = appFields.find(f => f.id === mapping.appField.id)
        const ghlField = ghlFields.find(f => f.id === mapping.ghlField.id)

        setFormData({
            ghlFieldId: mapping.ghlField.id,
            appFieldId: mapping.appField.id,
            syncDirection: mapping.syncDirection,
            groupId: mapping.groupId || '',
            appFieldGroup: appField?.modelName || '',
            ghlFieldGroup: ghlField?.isSystemField ? 'System Fields' : 'Custom Fields'
        })
        setIsDialogOpen(true)
    }

    const openDeleteDialog = (mapping: FieldMapping) => {
        setDeletingMapping(mapping)
        setIsDeleteDialogOpen(true)
    }

    // Filter fields based on selected groups
    const getFilteredAppFields = (): AppField[] => {
        if (!formData.appFieldGroup) {
            return appFields
        }
        return appFields.filter(f => f.modelName === formData.appFieldGroup)
    }

    const getFilteredGhlFields = (): GhlField[] => {
        if (!formData.ghlFieldGroup) {
            return ghlFields
        }
        if (formData.ghlFieldGroup === 'System Fields') {
            return ghlFields.filter(f => f.isSystemField)
        }
        if (formData.ghlFieldGroup === 'Custom Fields') {
            return ghlFields.filter(f => !f.isSystemField)
        }
        return ghlFields
    }

    const isCompatible = (ghlType: string, appType: string): boolean => {
        // Normalize to lowercase for case-insensitive comparison
        const ghlTypeLower = ghlType.toLowerCase()
        const appTypeLower = appType.toLowerCase()

        const compatibilityMatrix: Record<string, string[]> = {
            text: ['text', 'picklist', 'phone', 'email', 'url', 'string', 'varchar', 'char'],
            large_text: ['text', 'string', 'textarea', 'longtext'],
            number: ['number', 'integer', 'float', 'int', 'decimal', 'double'],
            numerical: ['number', 'integer', 'int', 'decimal'],
            float: ['number', 'float', 'double', 'decimal'],
            boolean: ['boolean', 'bool', 'bit'],
            checkbox: ['boolean', 'bool', 'bit'],
            date: ['date', 'datetime', 'timestamp', 'time'],
            picklist: ['text', 'picklist', 'string', 'enum'],
            single_options: ['text', 'string', 'enum', 'userrole', 'membershipplan', 'subscriptionstatus', 'packagetype'],
            multiple_options: ['text', 'string', 'enum', 'membershipplan', 'array'],
            textbox_list: ['text', 'string', 'array'],
            email: ['email', 'text', 'string'],
            phone: ['phone', 'text', 'string'],
            monetory: ['number', 'decimal', 'float', 'double'],
            textarea: ['text', 'string', 'textarea', 'longtext']
        }

        return compatibilityMatrix[ghlTypeLower]?.includes(appTypeLower) || ghlTypeLower === appTypeLower
    }

    const getCompatibilityWarning = (): string | null => {
        if (!formData.ghlFieldId || !formData.appFieldId) return null

        const ghlField = ghlFields.find(f => f.id === formData.ghlFieldId)
        const appField = appFields.find(f => f.id === formData.appFieldId)

        if (!ghlField || !appField) return null

        if (!isCompatible(ghlField.dataType, appField.dataType)) {
            return `Warning: ${ghlField.dataType} (GHL) and ${appField.dataType} (App) may not be compatible. Data conversion may fail or lose precision.`
        }

        return null
    }

    const isDuplicate = (): boolean => {
        return mappings.some(m =>
            m.ghlField.id === formData.ghlFieldId &&
            m.appField.id === formData.appFieldId &&
            (!editingMapping || m.id !== editingMapping.id)
        )
    }

    const saveMapping = async () => {
        if (!formData.ghlFieldId || !formData.appFieldId) {
            addToast({ title: 'Validation Error', description: 'Please select both GHL and App fields', variant: 'destructive' })
            return
        }

        if (isDuplicate()) {
            addToast({ title: 'Validation Error', description: 'This field mapping already exists', variant: 'destructive' })
            return
        }

        setIsSaving(true)
        try {
            const url = editingMapping
                ? `/api/admin/crm-sync/mappings/${editingMapping.id}`
                : '/api/admin/crm-sync/mappings'

            const method = editingMapping ? 'PUT' : 'POST'

            // Convert "none" to null for groupId
            const requestBody = {
                ...formData,
                groupId: formData.groupId === 'none' ? null : formData.groupId
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            })

            if (response.ok) {
                await loadMappings()
                setIsDialogOpen(false)
                addToast({ title: 'Success', description: editingMapping ? 'Mapping updated successfully' : 'Mapping created successfully', variant: 'success' })
            } else {
                const data = await response.json()
                addToast({ title: 'Error', description: data.error || 'Failed to save mapping', variant: 'destructive' })
            }
        } catch (error) {
            console.error('Error saving mapping:', error)
            addToast({ title: 'Error', description: 'Failed to save mapping', variant: 'destructive' })
        } finally {
            setIsSaving(false)
        }
    }

    const deleteMapping = async () => {
        if (!deletingMapping) return

        setIsSaving(true)
        try {
            const response = await fetch(`/api/admin/crm-sync/mappings/${deletingMapping.id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                await loadMappings()
                setIsDeleteDialogOpen(false)
                setDeletingMapping(null)
                addToast({ title: 'Success', description: 'Mapping deleted successfully', variant: 'success' })
            } else {
                addToast({ title: 'Error', description: 'Failed to delete mapping', variant: 'destructive' })
            }
        } catch (error) {
            console.error('Error deleting mapping:', error)
            addToast({ title: 'Error', description: 'Failed to delete mapping', variant: 'destructive' })
        } finally {
            setIsSaving(false)
        }
    }

    const autoGenerateMappings = async () => {
        setIsAutoGenerating(true)
        try {
            const response = await fetch('/api/admin/crm-sync/auto-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })

            if (response.ok) {
                const result = await response.json()

                // Reload all data to show new mappings and group
                await Promise.all([
                    loadMappings(),
                    loadGroups(),
                    loadAppFields(),
                    loadGhlFields()
                ])

                // Success message with details
                const message = result.mappingsCreated > 0
                    ? `Created ${result.mappingsCreated} mappings${result.mappingsSkipped > 0 ? ` (${result.mappingsSkipped} already existed)` : ''}`
                    : result.mappingsSkipped > 0
                        ? `All ${result.mappingsSkipped} mappings already exist`
                        : 'Auto-generation complete'

                addToast({
                    title: 'Success',
                    description: `${message}. Group: "${result.groupName}"`,
                    variant: 'success'
                })

                // Auto-select the system group if mappings were created
                if (result.groupId && result.mappingsCreated > 0) {
                    setSelectedGroup(result.groupId)
                }
            } else {
                const error = await response.json()
                addToast({
                    title: 'Error',
                    description: error.error || 'Failed to auto-generate mappings',
                    variant: 'destructive'
                })
            }
        } catch (error) {
            console.error('Error auto-generating mappings:', error)
            addToast({
                title: 'Error',
                description: 'Failed to auto-generate mappings',
                variant: 'destructive'
            })
        } finally {
            setIsAutoGenerating(false)
        }
    }

    const toggleMapping = async (mapping: FieldMapping) => {
        try {
            const response = await fetch(`/api/admin/crm-sync/mappings/${mapping.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ghlFieldId: mapping.ghlField.id,
                    appFieldId: mapping.appField.id,
                    syncDirection: mapping.syncDirection,
                    groupId: mapping.groupId,
                    isEnabled: !mapping.isEnabled
                })
            })

            if (response.ok) {
                await loadMappings()
            }
        } catch (error) {
            console.error('Error toggling mapping:', error)
        }
    }

    const getSyncDirectionIcon = (direction: string) => {
        switch (direction) {
            case 'app_to_ghl':
                return <ArrowRight className="h-4 w-4" />
            case 'ghl_to_app':
                return <ArrowLeft className="h-4 w-4" />
            case 'two_way':
                return <ArrowLeftRight className="h-4 w-4" />
            default:
                return null
        }
    }

    const getSyncDirectionLabel = (direction: string) => {
        switch (direction) {
            case 'app_to_ghl':
                return 'App → GHL'
            case 'ghl_to_app':
                return 'GHL → App'
            case 'two_way':
                return 'Two-way'
            default:
                return direction
        }
    }

    // Filter by group and search query
    let filteredMappings = selectedGroup === 'all'
        ? mappings
        : mappings.filter(m => m.groupId === selectedGroup)

    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filteredMappings = filteredMappings.filter(m =>
            m.appField.name.toLowerCase().includes(query) ||
            m.appField.fieldKey.toLowerCase().includes(query) ||
            m.ghlField.name.toLowerCase().includes(query) ||
            m.ghlField.ghlFieldKey.toLowerCase().includes(query)
        )
    }

    // Pagination
    const totalPages = Math.ceil(filteredMappings.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedMappings = filteredMappings.slice(startIndex, endIndex)

    const stats = {
        total: mappings.length,
        enabled: mappings.filter(m => m.isEnabled).length,
        disabled: mappings.filter(m => !m.isEnabled).length
    }

    if (isLoading) {
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
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Total Mappings</CardDescription>
                        <CardTitle className="text-3xl">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Enabled</CardDescription>
                        <CardTitle className="text-3xl text-green-600">{stats.enabled}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardDescription>Disabled</CardDescription>
                        <CardTitle className="text-3xl text-gray-400">{stats.disabled}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Main Table Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Field Mappings</CardTitle>
                            <CardDescription>Map app fields to GoHighLevel custom fields</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshAppFields}
                                disabled={isRefreshing}
                            >
                                {isRefreshing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Refreshing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Refresh App Fields
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={refreshGhlFields}
                                disabled={isRefreshing}
                            >
                                {isRefreshing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Refreshing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Refresh GHL Fields
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={autoGenerateMappings}
                                disabled={isAutoGenerating || isRefreshing}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                            >
                                {isAutoGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Auto-Generating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Auto-Generate Mappings
                                    </>
                                )}
                            </Button>
                            <Button onClick={openCreateDialog} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Mapping
                            </Button>
                        </div>
                    </div>

                    {/* Quick Guide Info Box */}
                    <Alert className="mt-4 bg-indigo-50 border-indigo-200">
                        <AlertTriangle className="h-4 w-4 text-indigo-600" />
                        <AlertDescription className="text-sm text-indigo-900">
                            <strong>Field Mapping Overview:</strong> Connect your app's database fields with GoHighLevel CRM fields to automatically sync member data for marketing campaigns.
                            Use <strong>Sync Direction</strong> to control data flow direction. Enable/disable mappings as needed without deleting them.
                        </AlertDescription>
                    </Alert>

                    {/* IMPORTANT: Refresh Fields Before Auto-Generate */}
                    <Alert className="mt-4 bg-blue-50 border-blue-300">
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-sm text-blue-900">
                            <strong>📋 BEFORE Using Auto-Generate:</strong> Make sure your fields are up-to-date:<br />
                            <div className="mt-2 ml-4 space-y-1">
                                <div>
                                    <strong className="text-blue-800">Option 1 (Quick):</strong> Use the refresh buttons next to "Auto-Generate Mappings" button
                                    <ul className="mt-1 ml-4 list-disc">
                                        <li>Click "Refresh App Fields" button (syncs database schema)</li>
                                        <li>Click "Refresh GHL Fields" button (syncs from GoHighLevel API)</li>
                                    </ul>
                                </div>
                                <div className="mt-2">
                                    <strong className="text-blue-800">Option 2 (Full View):</strong> Go to the "Fields" tab
                                    <ul className="mt-1 ml-4 list-disc">
                                        <li>In "App Fields" sub-tab → Click "Refresh App Fields" button</li>
                                        <li>In "GHL Fields" sub-tab → Click "Refresh GHL Fields" button</li>
                                    </ul>
                                </div>
                            </div>
                            <strong className="mt-2 inline-block text-blue-700">✅ Once both field lists are refreshed, you can click "Auto-Generate Mappings"</strong> to create 10 field mappings automatically.
                        </AlertDescription>
                    </Alert>

                    {/* Auto-Generated Fields Warning Banner */}
                    <Alert className="mt-4 bg-amber-50 border-amber-300">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-sm text-amber-900">
                            <strong>⚠️ Auto-Generated Mappings:</strong> The system automatically creates 10 critical field mappings when you click "Auto-Generate":<br />

                            <div className="mt-2 ml-4">
                                <strong className="text-amber-800">Standard Fields (Required by GHL API):</strong>
                                <ul className="mt-1 space-y-1 list-disc ml-4">
                                    <li><strong>email</strong> – User email address (REQUIRED for contact creation/lookup)</li>
                                    <li><strong>firstName</strong> – User first name for personalization</li>
                                    <li><strong>lastName</strong> – User last name for personalization</li>
                                    <li><strong>phone</strong> – Phone number (alternative identifier if email missing)</li>
                                    <li><strong>name</strong> – Full name (auto-combined from first+last)</li>
                                    <li><strong>companyName</strong> – Employer company name (employer role only)</li>
                                </ul>
                            </div>

                            <div className="mt-2 ml-4">
                                <strong className="text-amber-800">Custom Fields (Marketing Segmentation):</strong>
                                <ul className="mt-1 space-y-1 list-disc ml-4">
                                    <li><strong>user_type</strong> – Captures seeker/employer role during registration (existing accounts will sync on purchase or profile update)</li>
                                    <li><strong>plan_id</strong> – Syncs membership plan on subscription/package purchase</li>
                                    <li><strong>membership_status</strong> – Updates subscription status (active/expired/cancelled)</li>
                                    <li><strong>addon_id</strong> – Tracks purchased add-ons (concierge services, resume reviews)</li>
                                </ul>
                            </div>

                            <strong className="mt-3 inline-block text-red-700">🚨 CRITICAL: DO NOT delete or disable standard field mappings (email, firstName, lastName, phone, name, companyName)</strong> – These ensure GHL contact sync succeeds. Without them, contact creation will fail with "email or phone required" error.
                        </AlertDescription>
                    </Alert>
                </CardHeader>
                <CardContent>
                    {/* Search and Filter Bar */}
                    <div className="mb-6 space-y-4">
                        {/* Search Input */}
                        <div>
                            <Label htmlFor="search" className="mb-2 block">Search Mappings</Label>
                            <Input
                                id="search"
                                type="text"
                                placeholder="Search by app field, GHL field, or field key..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setCurrentPage(1) // Reset to first page on search
                                }}
                                className="w-full"
                            />
                        </div>

                        {/* Group Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-500" />
                            <Label className="text-sm" htmlFor="group-filter">Group:</Label>
                            <Select value={selectedGroup} onValueChange={(val) => {
                                setSelectedGroup(val)
                                setCurrentPage(1) // Reset to first page on filter change
                            }}>
                                <SelectTrigger className="w-48" id="group-filter">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Groups</SelectItem>
                                    {groups.map(group => (
                                        <SelectItem key={group.id} value={group.id}>
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search Results Info */}
                        <div className="text-sm text-gray-600">
                            Showing {filteredMappings.length === 0 ? '0' : startIndex + 1}–{Math.min(endIndex, filteredMappings.length)} of {filteredMappings.length} mapping{filteredMappings.length !== 1 ? 's' : ''}
                            {searchQuery && ` (search: "${searchQuery}")`}
                        </div>
                    </div>

                    {/* Table */}
                    {filteredMappings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <p className="text-gray-600">
                                {searchQuery ? `No mappings found matching "${searchQuery}"` : 'No field mappings found'}
                            </p>
                            <Button onClick={openCreateDialog} variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
                                Create your first mapping
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Table with proper responsive design */}
                            <div className="w-full overflow-x-auto border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="w-1/4 px-4 py-3">
                                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">App Field</span>
                                            </TableHead>
                                            <TableHead className="w-auto px-4 py-3">
                                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">Direction</span>
                                            </TableHead>
                                            <TableHead className="w-1/4 px-4 py-3">
                                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">GHL Field</span>
                                            </TableHead>
                                            <TableHead className="w-auto px-4 py-3">
                                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">Group</span>
                                            </TableHead>
                                            <TableHead className="w-auto px-4 py-3">
                                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">Status</span>
                                            </TableHead>
                                            <TableHead className="w-24 px-4 py-3 text-right">
                                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">Actions</span>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedMappings.map(mapping => (
                                            <TableRow key={mapping.id} className="hover:bg-gray-50 border-b">
                                                {/* App Field - with proper word wrapping */}
                                                <TableCell className="px-4 py-4 w-1/4">
                                                    <div className="break-words">
                                                        <p className="font-medium text-sm break-all leading-snug">{mapping.appField.name}</p>
                                                        <p className="text-xs text-gray-500 break-all leading-snug">
                                                            {mapping.appField.fieldKey}
                                                        </p>
                                                        <p className="text-xs text-gray-400">({mapping.appField.dataType})</p>
                                                    </div>
                                                </TableCell>

                                                {/* Direction - centered, compact */}
                                                <TableCell className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {getSyncDirectionIcon(mapping.syncDirection)}
                                                        <span className="text-xs font-medium">{getSyncDirectionLabel(mapping.syncDirection)}</span>
                                                    </div>
                                                </TableCell>

                                                {/* GHL Field - with proper word wrapping */}
                                                <TableCell className="px-4 py-4 w-1/4">
                                                    <div className="break-words">
                                                        <p className="font-medium text-sm break-all leading-snug">{mapping.ghlField.name}</p>
                                                        <p className="text-xs text-gray-500 break-all leading-snug">
                                                            {mapping.ghlField.ghlFieldKey}
                                                        </p>
                                                        <p className="text-xs text-gray-400">({mapping.ghlField.dataType})</p>
                                                    </div>
                                                </TableCell>

                                                {/* Group - badge */}
                                                <TableCell className="px-4 py-4 whitespace-nowrap">
                                                    {mapping.group?.name ? (
                                                        <Badge variant="outline" className="text-xs">{mapping.group.name}</Badge>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">—</span>
                                                    )}
                                                </TableCell>

                                                {/* Status - properly aligned badges */}
                                                <TableCell className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={mapping.isEnabled}
                                                            onCheckedChange={() => toggleMapping(mapping)}
                                                            className="scale-75"
                                                        />
                                                        <Badge
                                                            variant={mapping.isEnabled ? 'default' : 'secondary'}
                                                            className="text-xs whitespace-nowrap"
                                                        >
                                                            {mapping.isEnabled ? 'Enabled' : 'Disabled'}
                                                        </Badge>
                                                    </div>
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="px-4 py-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditDialog(mapping)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openDeleteDialog(mapping)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4">
                                    <div className="text-sm text-gray-600">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingMapping ? 'Edit Field Mapping' : 'Create Field Mapping'}
                        </DialogTitle>
                        <DialogDescription>
                            Map an app field to a GoHighLevel custom field for data synchronization
                        </DialogDescription>
                    </DialogHeader>

                    {/* Info Section */}
                    <Alert className="bg-blue-50 border-blue-200">
                        <AlertDescription className="text-sm text-blue-900 space-y-2">
                            <p className="font-semibold">📘 What is Field Mapping?</p>
                            <p>Field mapping connects data between your AmperTalent database and GoHighLevel CRM:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li><strong>Purpose:</strong> Automatically sync user data to GHL for marketing campaigns and lead management</li>
                                <li><strong>Sync Direction:</strong> Choose how data flows - from App to GHL, from GHL to App, or both ways</li>
                                <li><strong>Data Types:</strong> Ensure compatible types (e.g., text→TEXT, number→NUMBER) to avoid conversion errors</li>
                                <li><strong>Groups:</strong> Organize mappings by category (optional) for easier management</li>
                            </ul>
                            <p className="text-xs text-blue-700 mt-2">
                                <strong>Example:</strong> Map UserProfile.email → GHL Contact.email to sync member emails to your marketing CRM.
                            </p>
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-4 py-4">
                        {/* GHL Field Group Selector */}
                        <div className="space-y-2">
                            <Label>GHL Field Category</Label>
                            <Select
                                value={formData.ghlFieldGroup}
                                onValueChange={(value) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        ghlFieldGroup: value,
                                        ghlFieldId: '' // Reset field selection when group changes
                                    }))
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select field category..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Fields</SelectItem>
                                    {ghlFieldTypes.map(type => (
                                        <SelectItem key={type} value={type}>
                                            {type} ({ghlFieldsByType[type]?.length || 0} fields)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* GHL Field */}
                        <div className="space-y-2">
                            <Label>GoHighLevel Field</Label>
                            <Select
                                value={formData.ghlFieldId}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, ghlFieldId: value }))}
                                disabled={!formData.ghlFieldGroup || formData.ghlFieldGroup === 'all'}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={
                                        !formData.ghlFieldGroup || formData.ghlFieldGroup === 'all'
                                            ? "Select a category first..."
                                            : "Select GHL field"
                                    } />
                                </SelectTrigger>
                                <SelectContent>
                                    {getFilteredGhlFields().map(field => (
                                        <SelectItem key={field.id} value={field.id}>
                                            {field.name} ({field.ghlFieldKey}) - {field.dataType}
                                            {field.isSystemField && ' [System]'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* App Field Group Selector */}
                        <div className="space-y-2">
                            <Label>App Field Model</Label>
                            <Select
                                value={formData.appFieldGroup}
                                onValueChange={(value) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        appFieldGroup: value,
                                        appFieldId: '' // Reset field selection when group changes
                                    }))
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select model/table..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Models</SelectItem>
                                    {appFieldModels.map(model => (
                                        <SelectItem key={model} value={model}>
                                            {model} ({appFieldsByModel[model]?.length || 0} fields)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* App Field */}
                        <div className="space-y-2">
                            <Label>App Field</Label>
                            <Select
                                value={formData.appFieldId}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, appFieldId: value }))}
                                disabled={!formData.appFieldGroup || formData.appFieldGroup === 'all'}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={
                                        !formData.appFieldGroup || formData.appFieldGroup === 'all'
                                            ? "Select a model first..."
                                            : "Select app field"
                                    } />
                                </SelectTrigger>
                                <SelectContent>
                                    {getFilteredAppFields().map(field => (
                                        <SelectItem key={field.id} value={field.id}>
                                            {field.name} ({field.fieldKey}) - {field.dataType}
                                            {field.modelName && ` [${field.modelName}]`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sync Direction */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label>Sync Direction</Label>
                                <div className="relative group">
                                    <AlertTriangle className="h-4 w-4 text-blue-500 cursor-help" />
                                    <div className="absolute left-0 top-6 hidden group-hover:block w-72 p-3 bg-white border border-blue-200 rounded shadow-lg z-50 text-xs">
                                        <p className="font-semibold text-blue-900 mb-1">How Sync Direction Works:</p>
                                        <p className="text-gray-700 mb-2">
                                            <strong>Default:</strong> Set in Settings tab (currently: <code className="bg-blue-100 px-1 rounded">{defaultSyncDirection.replace(/_/g, ' ')}</code>)
                                        </p>
                                        <p className="text-gray-700">
                                            <strong>This Mapping:</strong> Can override the default for this specific field pair. Choose based on which system is the "source of truth" for this data.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <Select
                                value={formData.syncDirection}
                                onValueChange={(value: any) => setFormData(prev => ({ ...prev, syncDirection: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="app_to_ghl">
                                        <div className="flex items-center">
                                            <ArrowRight className="h-4 w-4 mr-2" />
                                            App → GHL (One-way to GHL)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="ghl_to_app" disabled>
                                        <div className="flex items-center opacity-50">
                                            <ArrowLeft className="h-4 w-4 mr-2" />
                                            GHL → App (coming soon)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="two_way" disabled>
                                        <div className="flex items-center opacity-50">
                                            <ArrowLeftRight className="h-4 w-4 mr-2" />
                                            Two-way Sync (coming soon)
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                                💡 This overrides the global default from Settings tab for this mapping only
                            </p>
                        </div>

                        {/* Group */}
                        <div className="space-y-2">
                            <Label>Group (Optional)</Label>
                            <Select
                                value={formData.groupId}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, groupId: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="No group" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No group</SelectItem>
                                    {groups.map(group => (
                                        <SelectItem key={group.id} value={group.id}>
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Compatibility Warning */}
                        {getCompatibilityWarning() && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{getCompatibilityWarning()}</AlertDescription>
                            </Alert>
                        )}

                        {/* Duplicate Warning */}
                        {isDuplicate() && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>This field mapping already exists</AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={saveMapping} disabled={isSaving || isDuplicate()}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                editingMapping ? 'Update Mapping' : 'Create Mapping'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Mapping</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the mapping for{' '}
                            <strong>{deletingMapping?.appField.name} → {deletingMapping?.ghlField.name}</strong>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={deleteMapping} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Mapping'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}