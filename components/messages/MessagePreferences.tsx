'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Settings, Mail, Bell } from 'lucide-react'

interface Preferences {
    allowDirectMessages: boolean
    messageNotificationEmail: boolean
    messageNotificationInApp: boolean
}

interface MessagePreferencesProps {
    onUpdate?: () => void
}

export function MessagePreferences({ onUpdate }: MessagePreferencesProps) {
    const [preferences, setPreferences] = useState<Preferences | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch current preferences
    useEffect(() => {
        const fetchPreferences = async () => {
            try {
                const response = await fetch('/api/messages/preferences')
                if (!response.ok) {
                    throw new Error('Failed to fetch preferences')
                }
                const data = await response.json()
                setPreferences(data.preferences)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load preferences')
            } finally {
                setLoading(false)
            }
        }

        fetchPreferences()
    }, [])

    const handleSave = async () => {
        if (!preferences) return

        setSaving(true)
        setError(null)

        try {
            const response = await fetch('/api/messages/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(preferences)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update preferences')
            }

            const data = await response.json()
            setPreferences(data.preferences)
            onUpdate?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update preferences')
        } finally {
            setSaving(false)
        }
    }

    const updatePreference = (key: keyof Preferences, value: boolean) => {
        if (!preferences) return
        setPreferences({ ...preferences, [key]: value })
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Message Preferences
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-6 w-11" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        )
    }

    if (!preferences) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-destructive">Failed to load preferences</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Message Preferences
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="allow-direct-messages" className="text-sm font-medium">
                            Allow Direct Messages
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Let employers and candidates send you direct messages
                        </p>
                    </div>
                    <Switch
                        id="allow-direct-messages"
                        checked={preferences.allowDirectMessages}
                        onCheckedChange={(checked) => updatePreference('allowDirectMessages', checked)}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="email-notifications" className="text-sm font-medium flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email Notifications
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Receive email notifications for new messages
                        </p>
                    </div>
                    <Switch
                        id="email-notifications"
                        checked={preferences.messageNotificationEmail}
                        onCheckedChange={(checked) => updatePreference('messageNotificationEmail', checked)}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label htmlFor="in-app-notifications" className="text-sm font-medium flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            In-App Notifications
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Show notifications within the application
                        </p>
                    </div>
                    <Switch
                        id="in-app-notifications"
                        checked={preferences.messageNotificationInApp}
                        onCheckedChange={(checked) => updatePreference('messageNotificationInApp', checked)}
                    />
                </div>

                {error && (
                    <div className="text-destructive text-sm">{error}</div>
                )}

                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}