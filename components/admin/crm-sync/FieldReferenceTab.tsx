'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
    Loader2,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    Database,
    Cloud,
    Search,
    Info
} from 'lucide-react'

interface AppField {
    id: string
    fieldKey: string
    name: string
    dataType: string
    modelName: string | null
    isSystemField: boolean
    isRequired: boolean
    description: string | null
}

interface GhlField {
    id: string
    ghlFieldId: string
    ghlFieldKey: string
    name: string
    dataType: string
    isSystemField: boolean
    picklistOptions: any
}

interface GroupedAppFields {
    [modelName: string]: AppField[]
}

export function FieldReferenceTab() {
    const { addToast } = useToast()

    // App Fields State
    const [appFields, setAppFields] = useState<AppField[]>([])
    const [groupedAppFields, setGroupedAppFields] = useState<GroupedAppFields>({})
    const [isLoadingAppFields, setIsLoadingAppFields] = useState(true)
    const [isRefreshingAppFields, setIsRefreshingAppFields] = useState(false)
    const [appFieldSearch, setAppFieldSearch] = useState('')
    const [expandedAppModels, setExpandedAppModels] = useState<Set<string>>(new Set())

    // GHL Fields State
    const [ghlFields, setGhlFields] = useState<GhlField[]>([])
    const [standardGhlFields, setStandardGhlFields] = useState<GhlField[]>([])
    const [customGhlFields, setCustomGhlFields] = useState<GhlField[]>([])
    const [isLoadingGhlFields, setIsLoadingGhlFields] = useState(true)
    const [isRefreshingGhlFields, setIsRefreshingGhlFields] = useState(false)
    const [ghlFieldSearch, setGhlFieldSearch] = useState('')
    const [isStandardExpanded, setIsStandardExpanded] = useState(true)
    const [isCustomExpanded, setIsCustomExpanded] = useState(true)

    useEffect(() => {
        loadAppFields()
        loadGhlFields()
    }, [])

    useEffect(() => {
        // Group app fields by model
        const grouped = appFields.reduce((acc, field) => {
            const model = field.modelName || 'Other'
            if (!acc[model]) {
                acc[model] = []
            }
            acc[model].push(field)
            return acc
        }, {} as GroupedAppFields)

        setGroupedAppFields(grouped)
    }, [appFields])

    useEffect(() => {
        // Separate GHL fields into standard and custom
        const standard = ghlFields.filter(f => f.isSystemField)
        const custom = ghlFields.filter(f => !f.isSystemField)
        setStandardGhlFields(standard)
        setCustomGhlFields(custom)
    }, [ghlFields])

    const loadAppFields = async () => {
        setIsLoadingAppFields(true)
        try {
            const response = await fetch('/api/admin/crm-sync/app-fields')
            if (response.ok) {
                const data = await response.json()
                const fields = data.fields || []
                setAppFields(fields)

                // Auto-refresh if no fields exist (first time load)
                if (fields.length === 0) {
                    console.log('No app fields found, auto-refreshing from schema...')
                    await refreshAppFields()
                }
            } else {
                addToast({ title: 'Error', description: 'Failed to load app fields', variant: 'destructive' })
            }
        } catch (error) {
            console.error('Error loading app fields:', error)
            addToast({ title: 'Error', description: 'Failed to load app fields', variant: 'destructive' })
        } finally {
            setIsLoadingAppFields(false)
        }
    }

    const loadGhlFields = async () => {
        setIsLoadingGhlFields(true)
        try {
            const response = await fetch('/api/admin/crm-sync/ghl-fields')
            if (response.ok) {
                const data = await response.json()
                const fields = data.fields || []
                setGhlFields(fields)

                // Auto-refresh if no fields exist (first time load)
                if (fields.length === 0) {
                    console.log('No GHL fields found, auto-refreshing from API...')
                    await refreshGhlFields()
                }
            } else {
                addToast({ title: 'Error', description: 'Failed to load GHL fields', variant: 'destructive' })
            }
        } catch (error) {
            console.error('Error loading GHL fields:', error)
            addToast({ title: 'Error', description: 'Failed to load GHL fields', variant: 'destructive' })
        } finally {
            setIsLoadingGhlFields(false)
        }
    }

    const refreshAppFields = async () => {
        setIsRefreshingAppFields(true)
        try {
            const response = await fetch('/api/admin/crm-sync/app-fields?refresh=true', {
                method: 'GET'
            })
            if (response.ok) {
                const data = await response.json()
                setAppFields(data.fields || [])
                addToast({
                    title: 'Success',
                    description: `Generated ${data.count || 0} app fields from database schema`,
                    variant: 'success'
                })
            } else {
                const error = await response.json()
                addToast({ title: 'Error', description: error.error || 'Failed to refresh app fields', variant: 'destructive' })
            }
        } catch (error) {
            console.error('Error refreshing app fields:', error)
            addToast({ title: 'Error', description: 'Failed to refresh app fields', variant: 'destructive' })
        } finally {
            setIsRefreshingAppFields(false)
        }
    }

    const refreshGhlFields = async () => {
        setIsRefreshingGhlFields(true)
        try {
            const response = await fetch('/api/admin/crm-sync/ghl-fields/refresh', {
                method: 'POST'
            })
            if (response.ok) {
                const data = await response.json()
                await loadGhlFields() // Reload to get updated fields
                addToast({
                    title: 'Success',
                    description: `Refreshed ${data.count || 0} GHL fields from API`,
                    variant: 'success'
                })
            } else {
                const error = await response.json()
                addToast({ title: 'Error', description: error.error || 'Failed to refresh GHL fields', variant: 'destructive' })
            }
        } catch (error) {
            console.error('Error refreshing GHL fields:', error)
            addToast({ title: 'Error', description: 'Failed to refresh GHL fields', variant: 'destructive' })
        } finally {
            setIsRefreshingGhlFields(false)
        }
    }

    const toggleAppModel = (modelName: string) => {
        setExpandedAppModels(prev => {
            const newSet = new Set(prev)
            if (newSet.has(modelName)) {
                newSet.delete(modelName)
            } else {
                newSet.add(modelName)
            }
            return newSet
        })
    }

    const filteredAppFields = appFieldSearch
        ? appFields.filter(f =>
            f.name.toLowerCase().includes(appFieldSearch.toLowerCase()) ||
            f.fieldKey.toLowerCase().includes(appFieldSearch.toLowerCase()) ||
            (f.modelName && f.modelName.toLowerCase().includes(appFieldSearch.toLowerCase()))
        )
        : appFields

    const filteredGhlFields = ghlFieldSearch
        ? ghlFields.filter(f =>
            f.name.toLowerCase().includes(ghlFieldSearch.toLowerCase()) ||
            f.ghlFieldKey.toLowerCase().includes(ghlFieldSearch.toLowerCase())
        )
        : ghlFields

    const filteredStandardGhlFields = ghlFieldSearch
        ? standardGhlFields.filter(f =>
            f.name.toLowerCase().includes(ghlFieldSearch.toLowerCase()) ||
            f.ghlFieldKey.toLowerCase().includes(ghlFieldSearch.toLowerCase())
        )
        : standardGhlFields

    const filteredCustomGhlFields = ghlFieldSearch
        ? customGhlFields.filter(f =>
            f.name.toLowerCase().includes(ghlFieldSearch.toLowerCase()) ||
            f.ghlFieldKey.toLowerCase().includes(ghlFieldSearch.toLowerCase())
        )
        : customGhlFields

    const getDataTypeBadge = (dataType: string) => {
        const typeColors: Record<string, string> = {
            'text': 'bg-blue-100 text-blue-800',
            'number': 'bg-green-100 text-green-800',
            'boolean': 'bg-purple-100 text-purple-800',
            'date': 'bg-yellow-100 text-yellow-800',
            'picklist': 'bg-orange-100 text-orange-800',
            'TEXT': 'bg-blue-100 text-blue-800',
            'LARGE_TEXT': 'bg-blue-100 text-blue-800',
            'NUMERICAL': 'bg-green-100 text-green-800',
            'DATE': 'bg-yellow-100 text-yellow-800',
            'CHECKBOX': 'bg-purple-100 text-purple-800',
            'SINGLE_OPTIONS': 'bg-orange-100 text-orange-800',
            'MULTIPLE_OPTIONS': 'bg-orange-100 text-orange-800',
        }
        return typeColors[dataType] || 'bg-gray-100 text-gray-800'
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Field Reference</h2>
                <p className="text-muted-foreground">
                    View all available fields for mapping. App fields are dynamically generated from your database schema,
                    and GHL fields are fetched from the GoHighLevel API.
                </p>
            </div>

            <Tabs defaultValue="app-fields" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="app-fields">
                        <Database className="h-4 w-4 mr-2" />
                        App Fields ({appFields.length})
                    </TabsTrigger>
                    <TabsTrigger value="ghl-fields">
                        <Cloud className="h-4 w-4 mr-2" />
                        GHL Fields ({ghlFields.length})
                    </TabsTrigger>
                </TabsList>

                {/* App Fields Tab */}
                <TabsContent value="app-fields" className="space-y-4">
                    {/* Info Banner */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            <strong>App Fields are auto-generated from your Prisma database schema.</strong>
                            {' '}They represent all mappable fields from your application's data models (UserProfile, Job, Application, etc.).
                            Fields are automatically loaded when you visit this tab. Use the refresh button to manually regenerate if schema changes are made.
                            <strong className="block mt-2 text-amber-600">⚠️ Note: Field mappings are preserved when refreshing.</strong>
                        </AlertDescription>
                    </Alert>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>App Fields</CardTitle>
                                    <CardDescription>
                                        Fields from your database schema, grouped by table/model
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={refreshAppFields}
                                    disabled={isRefreshingAppFields}
                                >
                                    {isRefreshingAppFields ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Generate App Fields
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Search */}
                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search app fields..."
                                        value={appFieldSearch}
                                        onChange={(e) => setAppFieldSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            {isLoadingAppFields ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : appFields.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No app fields found. Click "Generate App Fields" to fetch from schema.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {Object.entries(groupedAppFields).map(([modelName, fields]) => {
                                        const filteredModelFields = fields.filter(f =>
                                            filteredAppFields.includes(f)
                                        )

                                        if (filteredModelFields.length === 0) return null

                                        const isExpanded = expandedAppModels.has(modelName)

                                        return (
                                            <Collapsible
                                                key={modelName}
                                                open={isExpanded}
                                                onOpenChange={() => toggleAppModel(modelName)}
                                            >
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-accent">
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                        <span className="font-semibold">{modelName}</span>
                                                        <Badge variant="secondary">{filteredModelFields.length} fields</Badge>
                                                    </div>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="pt-2">
                                                    <div className="border rounded-lg overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="w-[200px]">Field Name</TableHead>
                                                                    <TableHead className="w-[250px]">Field Key</TableHead>
                                                                    <TableHead className="w-[150px]">Data Type</TableHead>
                                                                    <TableHead className="w-[120px]">Required</TableHead>
                                                                    <TableHead className="w-[120px]">System Field</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {filteredModelFields.map((field) => (
                                                                    <TableRow key={field.id}>
                                                                        <TableCell className="font-medium w-[200px]">{field.name}</TableCell>
                                                                        <TableCell className="font-mono text-sm text-muted-foreground w-[250px]">
                                                                            {field.fieldKey}
                                                                        </TableCell>
                                                                        <TableCell className="w-[150px]">
                                                                            <Badge className={getDataTypeBadge(field.dataType)}>
                                                                                {field.dataType}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="w-[120px]">
                                                                            {field.isRequired ? (
                                                                                <Badge variant="destructive">Required</Badge>
                                                                            ) : (
                                                                                <Badge variant="outline">Optional</Badge>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="w-[120px]">
                                                                            {field.isSystemField && (
                                                                                <Badge variant="secondary">System</Badge>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* GHL Fields Tab */}
                <TabsContent value="ghl-fields" className="space-y-4">
                    {/* Info Banner */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            <strong>GHL Fields are fetched from the GoHighLevel API.</strong>
                            {' '}They include standard contact fields (firstName, email, phone, etc.) and custom fields you've created in your GHL account.
                            Fields are automatically loaded when you visit this tab. Use the refresh button to fetch the latest fields if you've added new custom fields in GHL.
                            <strong className="block mt-2 text-amber-600">⚠️ Note: Existing field mappings are preserved when refreshing.</strong>
                        </AlertDescription>
                    </Alert>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>GoHighLevel Fields</CardTitle>
                                    <CardDescription>
                                        Standard and custom fields from GoHighLevel API
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={refreshGhlFields}
                                    disabled={isRefreshingGhlFields}
                                >
                                    {isRefreshingGhlFields ? (
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
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Search */}
                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search GHL fields..."
                                        value={ghlFieldSearch}
                                        onChange={(e) => setGhlFieldSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            {isLoadingGhlFields ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : ghlFields.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No GHL fields found. Click "Refresh GHL Fields" to fetch from API.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Standard Fields */}
                                    <Collapsible
                                        open={isStandardExpanded}
                                        onOpenChange={setIsStandardExpanded}
                                    >
                                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-accent">
                                            <div className="flex items-center gap-2">
                                                {isStandardExpanded ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                                <span className="font-semibold">Standard Fields</span>
                                                <Badge variant="default">{filteredStandardGhlFields.length} fields</Badge>
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="pt-2">
                                            <div className="border rounded-lg overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[250px]">Field Name</TableHead>
                                                            <TableHead className="w-[250px]">Field Key</TableHead>
                                                            <TableHead className="w-[180px]">Data Type</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredStandardGhlFields.map((field) => (
                                                            <TableRow key={field.id}>
                                                                <TableCell className="font-medium w-[250px]">{field.name}</TableCell>
                                                                <TableCell className="font-mono text-sm text-muted-foreground w-[250px]">
                                                                    {field.ghlFieldKey}
                                                                </TableCell>
                                                                <TableCell className="w-[180px]">
                                                                    <Badge className={getDataTypeBadge(field.dataType)}>
                                                                        {field.dataType}
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    {/* Custom Fields */}
                                    <Collapsible
                                        open={isCustomExpanded}
                                        onOpenChange={setIsCustomExpanded}
                                    >
                                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-accent">
                                            <div className="flex items-center gap-2">
                                                {isCustomExpanded ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                                <span className="font-semibold">Custom Fields</span>
                                                <Badge variant="secondary">{filteredCustomGhlFields.length} fields</Badge>
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="pt-2">
                                            <div className="border rounded-lg overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[250px]">Field Name</TableHead>
                                                            <TableHead className="w-[250px]">Field Key</TableHead>
                                                            <TableHead className="w-[180px]">Data Type</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredCustomGhlFields.map((field) => (
                                                            <TableRow key={field.id}>
                                                                <TableCell className="font-medium w-[250px] max-w-[250px]">
                                                                    <div className="truncate" title={field.name}>
                                                                        {field.name}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="font-mono text-sm text-muted-foreground w-[250px] max-w-[250px]">
                                                                    <div className="truncate break-all" title={field.ghlFieldKey}>
                                                                        {field.ghlFieldKey}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="w-[180px]">
                                                                    <Badge className={getDataTypeBadge(field.dataType)}>
                                                                        {field.dataType}
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
