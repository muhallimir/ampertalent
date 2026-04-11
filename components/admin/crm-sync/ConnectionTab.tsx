'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    CheckCircle,
    XCircle,
    Loader2,
    Key,
    MapPin,
    AlertCircle,
    Clock
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface Credentials {
    ghlApiKey: string
    ghlLocationId: string
}

interface ConnectionStatus {
    status: 'connected' | 'disconnected' | 'testing' | 'error'
    lastTested?: string
    lastTestedBy?: string
    lastSavedBy?: string
    lastSavedAt?: string
    lastSavedByName?: string
    errorMessage?: string
    locationName?: string
    responseTime?: number
}

export function ConnectionTab() {
    const [credentials, setCredentials] = useState<Credentials>({
        ghlApiKey: '',
        ghlLocationId: ''
    })
    const [originalCredentials, setOriginalCredentials] = useState<Credentials>({
        ghlApiKey: '',
        ghlLocationId: ''
    })
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
        status: 'disconnected'
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isTesting, setIsTesting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [hasChanges, setHasChanges] = useState(false)
    const { addToast } = useToast()

    // Load credentials on mount
    useEffect(() => {
        fetchCredentials()
    }, [])

    // Check if credentials have changed
    useEffect(() => {
        const changed =
            credentials.ghlApiKey !== originalCredentials.ghlApiKey ||
            credentials.ghlLocationId !== originalCredentials.ghlLocationId
        setHasChanges(changed)
    }, [credentials, originalCredentials])

    const fetchCredentials = async () => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/admin/crm-sync/connection/credentials')

            if (!response.ok) {
                throw new Error('Failed to fetch credentials')
            }

            const data = await response.json()

            const creds = {
                ghlApiKey: data.credentials?.ghlApiKey || '',
                ghlLocationId: data.credentials?.ghlLocationId || ''
            }

            setCredentials(creds)
            setOriginalCredentials(creds)

            if (data.connectionStatus) {
                setConnectionStatus(data.connectionStatus)
            }
        } catch (error) {
            console.error('Error fetching credentials:', error)
            addToast({
                title: 'Error',
                description: 'Failed to load credentials. Please refresh the page.',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const validateCredentials = (): string | null => {
        if (!credentials.ghlApiKey) return 'API Key is required'
        if (credentials.ghlApiKey.length < 10) return 'API Key is invalid'
        if (!credentials.ghlLocationId) return 'Location ID is required'
        return null
    }

    const testConnection = async () => {
        const error = validateCredentials()
        if (error) {
            setValidationError(error)
            return
        }

        setValidationError(null)
        setIsTesting(true)
        setConnectionStatus({ status: 'testing' })

        try {
            const response = await fetch('/api/admin/crm-sync/connection/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Connection test failed')
            }

            setConnectionStatus({
                status: 'connected',
                lastTested: new Date().toISOString(),
                lastTestedBy: 'You',
                locationName: data.locationName,
                responseTime: data.responseTime
            })

            addToast({
                title: 'Connection Successful',
                description: `Connected to ${data.locationName || 'GoHighLevel'} in ${data.responseTime}ms`
            })
        } catch (error: any) {
            setConnectionStatus({
                status: 'error',
                errorMessage: error.message,
                lastTested: new Date().toISOString()
            })

            addToast({
                title: 'Connection Failed',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsTesting(false)
        }
    }

    const saveCredentials = async () => {
        const error = validateCredentials()
        if (error) {
            setValidationError(error)
            return
        }

        setValidationError(null)
        setIsSaving(true)

        try {
            const response = await fetch('/api/admin/crm-sync/connection/credentials', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save credentials')
            }

            setOriginalCredentials(credentials)
            setHasChanges(false)

            addToast({
                title: 'Credentials Saved',
                description: 'GHL credentials have been updated successfully'
            })

            // Refresh to get updated connection status
            await fetchCredentials()

            // Automatically test connection to verify credentials are working
            // Use a small delay to ensure data is persisted
            setTimeout(async () => {
                setIsTesting(true)
                try {
                    const testResponse = await fetch('/api/admin/crm-sync/connection/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(credentials)
                    })

                    const testData = await testResponse.json()

                    if (!testResponse.ok) {
                        throw new Error(testData.error || 'Connection test failed')
                    }

                    setConnectionStatus({
                        status: 'connected',
                        lastTested: new Date().toISOString(),
                        lastTestedBy: 'Auto-test',
                        locationName: testData.locationName,
                        responseTime: testData.responseTime,
                        lastSavedAt: connectionStatus.lastSavedAt,
                        lastSavedByName: connectionStatus.lastSavedByName
                    })

                    addToast({
                        title: 'Connection Verified',
                        description: `Connected to ${testData.locationName || 'GoHighLevel'} in ${testData.responseTime}ms`
                    })
                } catch (error: any) {
                    console.error('Auto-test connection failed:', error)
                    // Don't show error toast - connection might still be valid
                } finally {
                    setIsTesting(false)
                }
            }, 500)
        } catch (error: any) {
            addToast({
                title: 'Save Failed',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const maskApiKey = (apiKey: string): string => {
        if (!apiKey || apiKey.length <= 8) return '***'
        return apiKey.slice(0, 4) + '***' + apiKey.slice(-4)
    }

    const formatLastTested = (dateString?: string): string => {
        if (!dateString) return 'Never'

        const date = new Date(dateString)
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusBadge = () => {
        const badges = {
            connected: {
                text: 'Connected',
                variant: 'default' as const,
                icon: CheckCircle,
                className: 'bg-green-100 text-green-800 border-green-300'
            },
            disconnected: {
                text: 'Disconnected',
                variant: 'secondary' as const,
                icon: XCircle,
                className: 'bg-gray-100 text-gray-800 border-gray-300'
            },
            testing: {
                text: 'Testing...',
                variant: 'outline' as const,
                icon: Loader2,
                className: 'bg-blue-100 text-blue-800 border-blue-300'
            },
            error: {
                text: 'Error',
                variant: 'destructive' as const,
                icon: AlertCircle,
                className: 'bg-red-100 text-red-800 border-red-300'
            }
        }

        const config = badges[connectionStatus.status] || badges.disconnected

        if (!config?.icon) {
            console.error('[ConnectionTab] Invalid connection status or missing icon:', connectionStatus.status)
            return null
        }

        const Icon = config.icon

        return (
            <Badge variant={config.variant} className={`${config.className} flex items-center gap-1`}>
                <Icon className={`h-3 w-3 ${connectionStatus.status === 'testing' ? 'animate-spin' : ''}`} />
                {config.text}
            </Badge>
        )
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
            {/* Connection Status Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Connection Status</CardTitle>
                            <CardDescription>Current GoHighLevel API connection state</CardDescription>
                        </div>
                        {getStatusBadge()}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {connectionStatus.status === 'connected' && connectionStatus.locationName && (
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                Successfully connected to <strong>{connectionStatus.locationName}</strong>
                                {connectionStatus.responseTime && ` in ${connectionStatus.responseTime}ms`}
                            </AlertDescription>
                        </Alert>
                    )}

                    {connectionStatus.status === 'error' && connectionStatus.errorMessage && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {connectionStatus.errorMessage}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>
                            Last tested: {formatLastTested(connectionStatus.lastTested)}
                            {connectionStatus.lastTestedBy && ` by ${connectionStatus.lastTestedBy}`}
                        </span>
                    </div>

                    {connectionStatus.lastSavedAt && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                            <Key className="h-4 w-4" />
                            <span>
                                Latest credentials saved by: <strong>{connectionStatus.lastSavedByName || 'Unknown'}</strong>
                                {connectionStatus.lastSavedAt && ` on ${formatLastTested(connectionStatus.lastSavedAt)}`}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Credentials Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle>GoHighLevel Credentials</CardTitle>
                    <CardDescription>
                        Shared credentials used by all super admins. Changes affect the entire system.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {validationError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{validationError}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-4">
                        {/* API Key Input */}
                        <div className="space-y-2">
                            <Label htmlFor="ghlApiKey" className="flex items-center gap-2">
                                <Key className="h-4 w-4" />
                                GHL API Key
                            </Label>
                            <Input
                                id="ghlApiKey"
                                type="password"
                                value={credentials.ghlApiKey}
                                onChange={(e) => setCredentials(prev => ({ ...prev, ghlApiKey: e.target.value }))}
                                placeholder="pit-xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                className="font-mono text-sm"
                            />
                            {credentials.ghlApiKey && (
                                <p className="text-xs text-gray-500">
                                    Currently: {maskApiKey(credentials.ghlApiKey)}
                                </p>
                            )}
                        </div>

                        {/* Location ID Input */}
                        <div className="space-y-2">
                            <Label htmlFor="ghlLocationId" className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                GHL Location ID
                            </Label>
                            <Input
                                id="ghlLocationId"
                                type="text"
                                value={credentials.ghlLocationId}
                                onChange={(e) => setCredentials(prev => ({ ...prev, ghlLocationId: e.target.value }))}
                                placeholder="jCT3Ps2zzYnDgXRdu4PK"
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t">
                        <Button
                            onClick={testConnection}
                            disabled={isTesting || !credentials.ghlApiKey || !credentials.ghlLocationId}
                            variant="outline"
                        >
                            {isTesting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Test Connection
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={saveCredentials}
                            disabled={isSaving || !hasChanges || !credentials.ghlApiKey || !credentials.ghlLocationId}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Key className="h-4 w-4 mr-2" />
                                    Save Credentials
                                </>
                            )}
                        </Button>

                        {hasChanges && (
                            <span className="text-sm text-orange-600 font-medium">
                                Unsaved changes
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Setup Instructions */}
            <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                    <CardTitle className="text-blue-900">Setup Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-blue-800">
                    <ol className="list-decimal list-inside space-y-2">
                        <li>Get your API Key from GoHighLevel Settings → API → Private Integration</li>
                        <li>Find your Location ID in the GHL URL or Settings → Business Profile</li>
                        <li>Enter both credentials above and click "Test Connection"</li>
                        <li>Once connected, click "Save Credentials" to persist changes</li>
                        <li>All super admins will share these credentials</li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    )
}
