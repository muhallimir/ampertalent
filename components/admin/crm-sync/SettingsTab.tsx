'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, AlertTriangle, Info } from 'lucide-react'

interface Settings {
    isGlobalSyncEnabled: boolean
    defaultSyncDirection: 'app_to_ghl' | 'ghl_to_app' | 'two_way'
    syncOnCreate: boolean
    syncOnUpdate: boolean
    syncBatchSize: number
    retryAttempts: number
}

const DEFAULT_SETTINGS: Settings = {
    isGlobalSyncEnabled: false,
    defaultSyncDirection: 'app_to_ghl',
    syncOnCreate: true,
    syncOnUpdate: true,
    syncBatchSize: 50,
    retryAttempts: 3
}

export function SettingsTab() {
    const { addToast } = useToast()
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
    const [originalSettings, setOriginalSettings] = useState<Settings>(DEFAULT_SETTINGS)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/admin/crm-sync/settings')
            if (response.ok) {
                const data = await response.json()
                setSettings(data.settings || DEFAULT_SETTINGS)
                setOriginalSettings(data.settings || DEFAULT_SETTINGS)
            }
        } catch (error) {
            console.error('Error loading settings:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const hasChanges = (): boolean => {
        return JSON.stringify(settings) !== JSON.stringify(originalSettings)
    }

    const validateSettings = (): boolean => {
        const errors: Record<string, string> = {}

        if (settings.syncBatchSize < 1 || settings.syncBatchSize > 100) {
            errors.syncBatchSize = 'Batch size must be between 1 and 100'
        }

        if (settings.retryAttempts < 0 || settings.retryAttempts > 10) {
            errors.retryAttempts = 'Retry attempts must be between 0 and 10'
        }

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    const saveSettings = async () => {
        if (!validateSettings()) {
            return
        }

        setIsSaving(true)
        try {
            const response = await fetch('/api/admin/crm-sync/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })

            if (response.ok) {
                const data = await response.json()
                setSettings(data.settings)
                setOriginalSettings(data.settings)
                addToast({ title: 'Success', description: 'Settings saved successfully', variant: 'success' })
            } else {
                const data = await response.json()
                addToast({ title: 'Error', description: data.error || 'Failed to save settings', variant: 'destructive' })
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            addToast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
        } finally {
            setIsSaving(false)
        }
    }

    const resetSettings = () => {
        setSettings(originalSettings)
        setValidationErrors({})
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
            <Card>
                <CardHeader>
                    <CardTitle>Global Sync Settings</CardTitle>
                    <CardDescription>
                        Configure how the CRM Sync system synchronizes data between the app and GoHighLevel
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Global Sync Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1 flex-1">
                            <Label htmlFor="globalSync" className="text-base font-medium">
                                Enable Global Sync
                            </Label>
                            <p className="text-sm text-gray-500">
                                Turn on/off all synchronization between the app and GoHighLevel
                            </p>
                        </div>
                        <Switch
                            id="globalSync"
                            checked={settings.isGlobalSyncEnabled}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, isGlobalSyncEnabled: checked }))
                            }
                        />
                    </div>

                    {!settings.isGlobalSyncEnabled && (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Global sync is disabled. No data will be synchronized until you enable it.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Default Sync Direction */}
                    <div className="space-y-2">
                        <Label htmlFor="defaultDirection">Default Sync Direction</Label>
                        <Select
                            value={settings.defaultSyncDirection}
                            onValueChange={(value) =>
                                setSettings(prev => ({
                                    ...prev,
                                    defaultSyncDirection: value as Settings['defaultSyncDirection']
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="app_to_ghl">App → GoHighLevel</SelectItem>
                                <SelectItem value="ghl_to_app" disabled>
                                    <span className="opacity-50">GoHighLevel → App (coming soon)</span>
                                </SelectItem>
                                <SelectItem value="two_way" disabled>
                                    <span className="opacity-50">Two-Way Sync (coming soon)</span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Alert className="mt-2 bg-blue-50 border-blue-200">
                            <AlertDescription className="text-xs text-blue-900">
                                <strong>How this works:</strong> This sets the default sync direction when creating new field mappings.
                                Each mapping can override this setting individually in the Field Mappings tab if different behavior is needed for specific fields.
                            </AlertDescription>
                        </Alert>
                    </div>

                    {/* Sync Triggers */}
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-medium">Sync Triggers</h3>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1 flex-1">
                                <Label htmlFor="syncOnCreate">Sync on Create</Label>
                                <p className="text-xs text-gray-500">
                                    Automatically sync when new records are created
                                </p>
                            </div>
                            <Switch
                                id="syncOnCreate"
                                checked={settings.syncOnCreate}
                                onCheckedChange={(checked) =>
                                    setSettings(prev => ({ ...prev, syncOnCreate: checked }))
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1 flex-1">
                                <Label htmlFor="syncOnUpdate">Sync on Update</Label>
                                <p className="text-xs text-gray-500">
                                    Automatically sync when existing records are updated
                                </p>
                            </div>
                            <Switch
                                id="syncOnUpdate"
                                checked={settings.syncOnUpdate}
                                onCheckedChange={(checked) =>
                                    setSettings(prev => ({ ...prev, syncOnUpdate: checked }))
                                }
                            />
                        </div>
                    </div>

                    {/* Performance Settings */}
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-medium">Performance & Reliability</h3>

                        <div className="space-y-2">
                            <Label htmlFor="batchSize">
                                Batch Size
                                {validationErrors.syncBatchSize && (
                                    <span className="text-red-500 ml-2 text-xs">
                                        {validationErrors.syncBatchSize}
                                    </span>
                                )}
                            </Label>
                            <Input
                                id="batchSize"
                                type="number"
                                min={1}
                                max={100}
                                value={settings.syncBatchSize}
                                onChange={(e) =>
                                    setSettings(prev => ({ ...prev, syncBatchSize: parseInt(e.target.value) || 1 }))
                                }
                                className={validationErrors.syncBatchSize ? 'border-red-500' : ''}
                            />
                            <p className="text-xs text-gray-500">
                                Number of records to sync in each batch (1-100)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="retryAttempts">
                                Retry Attempts
                                {validationErrors.retryAttempts && (
                                    <span className="text-red-500 ml-2 text-xs">
                                        {validationErrors.retryAttempts}
                                    </span>
                                )}
                            </Label>
                            <Input
                                id="retryAttempts"
                                type="number"
                                min={0}
                                max={10}
                                value={settings.retryAttempts}
                                onChange={(e) =>
                                    setSettings(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) || 0 }))
                                }
                                className={validationErrors.retryAttempts ? 'border-red-500' : ''}
                            />
                            <p className="text-xs text-gray-500">
                                Number of times to retry failed sync operations (0-10)
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t">
                        <Button
                            onClick={saveSettings}
                            disabled={isSaving || !hasChanges() || Object.keys(validationErrors).length > 0}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Settings
                                </>
                            )}
                        </Button>
                        {hasChanges() && (
                            <Button variant="outline" onClick={resetSettings} disabled={isSaving}>
                                Cancel
                            </Button>
                        )}
                        {!hasChanges() && (
                            <span className="text-sm text-gray-500">No changes</span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Information Card */}
            <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                    <CardTitle className="text-blue-900 flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Settings Guide
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-blue-800">
                    <div>
                        <strong>Global Sync:</strong> Master switch to enable/disable all synchronization.
                        Useful for maintenance or troubleshooting.
                    </div>
                    <div>
                        <strong>Default Sync Direction:</strong> Sets the default direction for new field mappings.
                        Individual mappings can override this.
                    </div>
                    <div>
                        <strong>Sync Triggers:</strong> Control when automatic synchronization occurs.
                        Disable to use manual sync only.
                    </div>
                    <div>
                        <strong>Batch Size:</strong> Larger batches are faster but use more memory.
                        Smaller batches are more reliable for slow connections.
                    </div>
                    <div>
                        <strong>Retry Attempts:</strong> Number of retries for failed operations before giving up.
                        Set to 0 to disable retries.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
