'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import Link from 'next/link'
import {
  Bell,
  Shield,
  Settings,
  Database,
  Save,
  AlertTriangle,
  Users,
  FileText,
  Clock
} from 'lucide-react'

interface AdminSettings {
  notifications: {
    systemAlerts: boolean
    userRegistrations: boolean
    jobSubmissions: boolean
    securityAlerts: boolean
    dailyReports: boolean
  }
  security: {
    requireTwoFactor: boolean
    sessionTimeout: number
    allowMultipleSessions: boolean
    auditLogging: boolean
  }
  platform: {
    maintenanceMode: boolean
    userRegistrationEnabled: boolean
    jobPostingEnabled: boolean
    autoApproveJobs: boolean
    maxJobsPerEmployer: number
  }
  system: {
    backupFrequency: 'daily' | 'weekly' | 'monthly'
    logRetentionDays: number
    enableDebugMode: boolean
  }
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>({
    notifications: {
      systemAlerts: true,
      userRegistrations: true,
      jobSubmissions: true,
      securityAlerts: true,
      dailyReports: false
    },
    security: {
      requireTwoFactor: false,
      sessionTimeout: 480, // 8 hours in minutes
      allowMultipleSessions: true,
      auditLogging: true
    },
    platform: {
      maintenanceMode: false,
      userRegistrationEnabled: true,
      jobPostingEnabled: true,
      autoApproveJobs: false,
      maxJobsPerEmployer: 10
    },
    system: {
      backupFrequency: 'daily',
      logRetentionDays: 90,
      enableDebugMode: false
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const text = await response.text()
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          // Session expired, redirect to sign-in
          window.location.href = '/sign-in'
          return
        }
        const data = JSON.parse(text)
        setSettings(data.settings)
      } else {
        console.error('Failed to load settings:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Admin settings saved successfully:', data.message)
        // TODO: Add toast notification for success
      } else {
        const errorData = await response.json()
        console.error('Failed to save settings:', errorData.error)
        // TODO: Add toast notification for error
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      // TODO: Add toast notification for error
    } finally {
      setIsSaving(false)
    }
  }

  const updateNotificationSetting = (key: keyof AdminSettings['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }))
  }

  const updateSecuritySetting = (key: keyof AdminSettings['security'], value: boolean | number) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value
      }
    }))
  }

  const updatePlatformSetting = (key: keyof AdminSettings['platform'], value: boolean | number) => {
    setSettings(prev => ({
      ...prev,
      platform: {
        ...prev.platform,
        [key]: value
      }
    }))
  }

  const updateSystemSetting = (key: keyof AdminSettings['system'], value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      system: {
        ...prev.system,
        [key]: value
      }
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage platform configuration, security, and system preferences.
          </p>
        </div>
        <Button
          onClick={saveSettings}
          disabled={isSaving}
          className="bg-brand-teal hover:bg-brand-teal/90"
        >
          {isSaving ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Notification Settings - COMMENTED OUT: Not fully implemented */}
      {/*
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="bg-gradient-to-r from-brand-teal to-brand-teal-light text-white rounded-t-lg">
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Admin Notifications</span>
          </CardTitle>
          <CardDescription className="text-white/90">
            Configure which events trigger admin notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">System Alerts</Label>
              <p className="text-sm text-gray-600">Critical system errors and warnings</p>
            </div>
            <Checkbox
              checked={settings.notifications.systemAlerts}
              onCheckedChange={(checked: boolean) => updateNotificationSetting('systemAlerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">User Registrations</Label>
              <p className="text-sm text-gray-600">New user account creations</p>
            </div>
            <Checkbox
              checked={settings.notifications.userRegistrations}
              onCheckedChange={(checked: boolean) => updateNotificationSetting('userRegistrations', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Job Submissions</Label>
              <p className="text-sm text-gray-600">New job postings requiring review</p>
            </div>
            <Checkbox
              checked={settings.notifications.jobSubmissions}
              onCheckedChange={(checked: boolean) => updateNotificationSetting('jobSubmissions', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Security Alerts</Label>
              <p className="text-sm text-gray-600">Failed login attempts and security events</p>
            </div>
            <Checkbox
              checked={settings.notifications.securityAlerts}
              onCheckedChange={(checked: boolean) => updateNotificationSetting('securityAlerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Daily Reports</Label>
              <p className="text-sm text-gray-600">Automated daily platform summary</p>
            </div>
            <Checkbox
              checked={settings.notifications.dailyReports}
              onCheckedChange={(checked: boolean) => updateNotificationSetting('dailyReports', checked)}
            />
          </div>
        </CardContent>
      </Card>
      */}

      {/* External Webhook Notifications */}
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>External Webhook Notifications</span>
          </CardTitle>
          <CardDescription className="text-white/90">
            All webhook notifications sent to external automation system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Seeker Webhooks */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Job Seeker Webhooks
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-green-900">Welcome</h4>
                    <p className="text-sm text-green-700">Triggered when new seekers complete registration and payment</p>
                    <code className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded mt-1 inline-block">seeker.welcome</code>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-blue-900">Pre-Signup</h4>
                    <p className="text-sm text-blue-700">Triggered during onboarding process before payment</p>
                    <code className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded mt-1 inline-block">seeker.pre_signup</code>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-orange-900">Application Status Update</h4>
                    <p className="text-sm text-orange-700">Triggered when employers update application status</p>
                    <code className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded mt-1 inline-block">seeker.application_status_update</code>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-purple-900">Job Invitation</h4>
                    <p className="text-sm text-purple-700">Triggered when employers invite seekers to apply</p>
                    <code className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded mt-1 inline-block">seeker.job_invitation</code>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-teal-900">Payment Confirmation</h4>
                    <p className="text-sm text-teal-700">Triggered when seeker payments are successfully processed</p>
                    <code className="text-xs text-teal-600 bg-teal-100 px-2 py-1 rounded mt-1 inline-block">seeker.payment_confirmation</code>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-yellow-900">Subscription Reminder</h4>
                    <p className="text-sm text-yellow-700">Triggered when subscription is about to expire (handled by GoHighLevel)</p>
                    <code className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded mt-1 inline-block">seeker.subscription_reminder</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Employer Webhooks */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Employer Webhooks
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-green-900">Welcome</h4>
                    <p className="text-sm text-green-700">Triggered when new employers complete registration and payment</p>
                    <code className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded mt-1 inline-block">employer.welcome</code>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-blue-900">Job Approved</h4>
                    <p className="text-sm text-blue-700">Triggered when admin approves job postings</p>
                    <code className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded mt-1 inline-block">employer.job_approved</code>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-red-900">Job Declined</h4>
                    <p className="text-sm text-red-700">Triggered when admin declines job postings</p>
                    <code className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded mt-1 inline-block">employer.job_rejected</code>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-indigo-900">New Application</h4>
                    <p className="text-sm text-indigo-700">Triggered when seekers apply to job postings</p>
                    <code className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded mt-1 inline-block">employer.new_application</code>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-teal-900">Payment Confirmation</h4>
                    <p className="text-sm text-teal-700">Triggered when employer payments are successfully processed</p>
                    <code className="text-xs text-teal-600 bg-teal-100 px-2 py-1 rounded mt-1 inline-block">employer.payment_confirmation</code>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mt-6">
                System Webhooks
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-red-900">System Error</h4>
                    <p className="text-sm text-red-700">Triggered when critical system errors occur</p>
                    <code className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded mt-1 inline-block">system.error</code>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-orange-900">Processing Error</h4>
                    <p className="text-sm text-orange-700">Triggered when webhook delivery fails</p>
                    <code className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded mt-1 inline-block">webhook.processing_error</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
              <Shield className="h-4 w-4 mr-2 text-gray-600" />
              Webhook Configuration
            </h4>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Endpoint:</strong> <code className="bg-gray-200 px-2 py-1 rounded">{""}</code></p>
              <p><strong>Authentication:</strong> Basic Auth with HMAC-SHA256 signatures</p>
              <p><strong>Timeout:</strong> 5 seconds</p>
              <p><strong>Retry Policy:</strong> Automatic error notifications on failure</p>
            </div>
            <div className="mt-3">
              <Button asChild variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100">
                <Link href="/admin/webhooks">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Webhooks
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings - COMMENTED OUT: Not fully implemented */}
      {/*
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white rounded-t-lg">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security & Access</span>
          </CardTitle>
          <CardDescription className="text-white/90">
            Configure security policies and access controls
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Require Two-Factor Authentication</Label>
              <p className="text-sm text-gray-600">Mandatory 2FA for all admin accounts</p>
            </div>
            <Checkbox
              checked={settings.security.requireTwoFactor}
              onCheckedChange={(checked: boolean) => updateSecuritySetting('requireTwoFactor', checked)}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Session Timeout (minutes)</Label>
            <p className="text-sm text-gray-600">Automatically log out inactive admin sessions</p>
            <Input
              type="number"
              value={settings.security.sessionTimeout}
              onChange={(e) => updateSecuritySetting('sessionTimeout', parseInt(e.target.value))}
              className="w-32"
              min="30"
              max="1440"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Allow Multiple Sessions</Label>
              <p className="text-sm text-gray-600">Allow admins to be logged in from multiple devices</p>
            </div>
            <Checkbox
              checked={settings.security.allowMultipleSessions}
              onCheckedChange={(checked: boolean) => updateSecuritySetting('allowMultipleSessions', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Audit Logging</Label>
              <p className="text-sm text-gray-600">Log all admin actions for security audits</p>
            </div>
            <Checkbox
              checked={settings.security.auditLogging}
              onCheckedChange={(checked: boolean) => updateSecuritySetting('auditLogging', checked)}
            />
          </div>
        </CardContent>
      </Card>
      */}

      {/* Platform Settings - COMMENTED OUT: Not fully implemented */}
      {/*
      <Card className="shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Settings className="h-5 w-5" />
            <span>Platform Configuration</span>
          </CardTitle>
          <CardDescription>
            Control platform features and user capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Maintenance Mode</Label>
              <p className="text-sm text-gray-600">Temporarily disable platform for maintenance</p>
            </div>
            <Checkbox
              checked={settings.platform.maintenanceMode}
              onCheckedChange={(checked: boolean) => updatePlatformSetting('maintenanceMode', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">User Registration Enabled</Label>
              <p className="text-sm text-gray-600">Allow new users to create accounts</p>
            </div>
            <Checkbox
              checked={settings.platform.userRegistrationEnabled}
              onCheckedChange={(checked: boolean) => updatePlatformSetting('userRegistrationEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Job Posting Enabled</Label>
              <p className="text-sm text-gray-600">Allow employers to post new jobs</p>
            </div>
            <Checkbox
              checked={settings.platform.jobPostingEnabled}
              onCheckedChange={(checked: boolean) => updatePlatformSetting('jobPostingEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Auto-Approve Jobs</Label>
              <p className="text-sm text-gray-600">Automatically approve job postings without review</p>
            </div>
            <Checkbox
              checked={settings.platform.autoApproveJobs}
              onCheckedChange={(checked: boolean) => updatePlatformSetting('autoApproveJobs', checked)}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Max Jobs Per Employer</Label>
            <p className="text-sm text-gray-600">Maximum active job postings per employer</p>
            <Input
              type="number"
              value={settings.platform.maxJobsPerEmployer}
              onChange={(e) => updatePlatformSetting('maxJobsPerEmployer', parseInt(e.target.value))}
              className="w-32"
              min="1"
              max="100"
            />
          </div>
        </CardContent>
      </Card>
      */}

      {/* System Settings - COMMENTED OUT: Not fully implemented */}
      {/*
      <Card className="shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Database className="h-5 w-5" />
            <span>System Configuration</span>
          </CardTitle>
          <CardDescription>
            Configure system-level settings and maintenance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-medium">Backup Frequency</Label>
            <p className="text-sm text-gray-600">How often to create system backups</p>
            <Select
              value={settings.system.backupFrequency}
              onValueChange={(value) => updateSystemSetting('backupFrequency', value as 'daily' | 'weekly' | 'monthly')}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Log Retention (days)</Label>
            <p className="text-sm text-gray-600">How long to keep system logs</p>
            <Input
              type="number"
              value={settings.system.logRetentionDays}
              onChange={(e) => updateSystemSetting('logRetentionDays', parseInt(e.target.value))}
              className="w-32"
              min="7"
              max="365"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Debug Mode</Label>
              <p className="text-sm text-gray-600">Enable detailed logging for troubleshooting</p>
            </div>
            <Checkbox
              checked={settings.system.enableDebugMode}
              onCheckedChange={(checked: boolean) => updateSystemSetting('enableDebugMode', checked)}
            />
          </div>
        </CardContent>
      </Card>
      */}

      {/* Quick Actions */}
      <Card className="shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Clock className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
          <CardDescription>
            Common administrative tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white">
              <Link href="/admin/users">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Link>
            </Button>

            <Button asChild variant="outline" className="border-brand-coral text-brand-coral hover:bg-brand-coral hover:text-white">
              <Link href="/admin/reports">
                <FileText className="h-4 w-4 mr-2" />
                System Reports
              </Link>
            </Button>

            <Button asChild variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white">
              <Link href="/admin/jobs">
                <Shield className="h-4 w-4 mr-2" />
                Job Vetting
              </Link>
            </Button>
          </div>

          {/* System Maintenance - COMMENTED OUT: Not functional */}
          {/*
          <div className="border-t pt-6 mt-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
              System Maintenance
            </h4>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="font-medium text-orange-900">Clear System Cache</h5>
                    <p className="text-sm text-orange-700">Clear cached data to improve performance</p>
                  </div>
                  <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                    Clear Cache
                  </Button>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="font-medium text-orange-900">Run System Backup</h5>
                    <p className="text-sm text-orange-700">Create an immediate backup of all data</p>
                  </div>
                  <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                    Backup Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
          */}
        </CardContent>
      </Card>
    </div>
  )
}