'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PasswordChangeForm } from '@/components/seeker/PasswordChangeForm'
import { EmailChangeForm } from '@/components/seeker/EmailChangeForm'
import { useToast } from '@/components/ui/toast'
import { DeleteAccountDialog } from '@/components/common/DeleteAccountDialog'
import Link from 'next/link'
import {
  Bell,
  Shield,
  User,
  Eye,
  Save,
  Trash2,
} from 'lucide-react'

interface UserSettings {
  notifications: {
    emailAlerts: boolean
    jobRecommendations: boolean
    applicationUpdates: boolean
    weeklyDigest: boolean
  }
  privacy: {
    profileVisibility: 'private' | 'employers-only'
    showSalaryExpectations: boolean
    allowJobInvitations: boolean
    allowDirectMessages: boolean
  }
  account: {
    email: string
    name: string
  }
}

interface UserProfile {
  email: string
  name: string
}

export default function SeekerSettings() {
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      emailAlerts: true,
      jobRecommendations: true,
      applicationUpdates: true,
      weeklyDigest: false
    },
    privacy: {
      profileVisibility: 'employers-only',
      showSalaryExpectations: true,
      allowJobInvitations: true,
      allowDirectMessages: true
    },
    account: {
      email: '',
      name: ''
    }
  })
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    loadSettings()
    loadUserProfile()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/seeker/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/seeker/profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile({
          email: data.profile.email || '',
          name: data.profile.name || ''
        })
        // Update settings with actual email
        setSettings(prev => ({
          ...prev,
          account: {
            ...prev.account,
            email: data.profile.email || '',
            name: data.profile.name || ''
          }
        }))
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/seeker/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      const data = await response.json()
      setSettings(data.settings)

      // Show success toast notification
      addToast({
        title: "Settings saved successfully",
        description: "Your preferences have been updated.",
        variant: "success"
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      // Show error toast notification
      addToast({
        title: "Error saving settings",
        description: "There was a problem updating your preferences. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const updateNotificationSetting = (key: keyof UserSettings['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }))
  }

  const updatePrivacySetting = (key: keyof UserSettings['privacy'], value: string | boolean) => {
    setSettings(prev => {
      const newPrivacy = {
        ...prev.privacy,
        [key]: value
      }

      /**
       * FEATURE FLAG: NEXT_PUBLIC_PRIVATE_PROFILE_DISABLES_INVITATIONS
       * When enabled AND profileVisibility changes to 'private':
       *   - Automatically uncheck allowJobInvitations
       * When profileVisibility changes back to 'employers-only':
       *   - Automatically re-check allowJobInvitations
       * To disable this behavior: Set NEXT_PUBLIC_PRIVATE_PROFILE_DISABLES_INVITATIONS="false" in .env
       */
      if (process.env.NEXT_PUBLIC_PRIVATE_PROFILE_DISABLES_INVITATIONS !== 'false') {
        if (key === 'profileVisibility') {
          if (value === 'private') {
            newPrivacy.allowJobInvitations = false
          } else if (value === 'employers-only') {
            newPrivacy.allowJobInvitations = true
          }
        }
      }

      return {
        ...prev,
        privacy: newPrivacy
      }
    })
  }

  const handleDeleteAccount = async () => {
    try {
      // Show confirmation to user before proceeding
      addToast({
        title: "Deleting account...",
        description: "Please wait while we remove your account data.",
        variant: "default"
      });

      const response = await fetch('/api/seeker/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete account')
      }

      // Show success message
      addToast({
        title: "Account deleted successfully",
        description: "Your account and all associated data have been removed.",
        variant: "success"
      })

      // Redirect to home or login page after a short delay
      setTimeout(() => {
        // The account deletion API has already handled cleanup
        window.location.href = '/'
      }, 2000)
    } catch (error) {
      console.error('Error deleting account:', error)
      addToast({
        title: "Error deleting account",
        description: error instanceof Error ? error.message : "There was a problem deleting your account. Please try again.",
        variant: "destructive"
      })
      setShowDeleteDialog(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4">
      {/* Sticky Header */}
      <div className="sticky top-24 z-10 py-4">
        <div className="flex justify-between items-center bg-white rounded-lg shadow-md px-6 py-4 border border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">
              Manage your account preferences and privacy settings.
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
      </div>

      {/* Scrollable content */}
      <div className="space-y-8 pb-8">
        <Card className="shadow-sm border border-gray-100">
          <CardHeader className="bg-gradient-to-r from-brand-teal to-brand-teal-light text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notification Preferences</span>
            </CardTitle>
            <CardDescription className="text-white/90">
              Choose how you want to be notified about job opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Email Alerts</Label>
                <p className="text-sm text-gray-600">Receive email notifications for important updates</p>
              </div>
              <Checkbox
                checked={settings.notifications.emailAlerts}
                onCheckedChange={(checked: boolean) => updateNotificationSetting('emailAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Job Recommendations</Label>
                <p className="text-sm text-gray-600">Get personalized job suggestions based on your profile</p>
              </div>
              <Checkbox
                checked={settings.notifications.jobRecommendations}
                onCheckedChange={(checked: boolean) => updateNotificationSetting('jobRecommendations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Application Updates</Label>
                <p className="text-sm text-gray-600">Notifications when employers review your applications</p>
              </div>
              <Checkbox
                checked={settings.notifications.applicationUpdates}
                onCheckedChange={(checked: boolean) => updateNotificationSetting('applicationUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Weekly Digest</Label>
                <p className="text-sm text-gray-600">Summary of new jobs and activity once per week</p>
              </div>
              <Checkbox
                checked={settings.notifications.weeklyDigest}
                onCheckedChange={(checked: boolean) => updateNotificationSetting('weeklyDigest', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Security */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Password Change */}
          <PasswordChangeForm />

          {/* Email Change */}
          {userProfile && (
            <EmailChangeForm
              currentEmail={userProfile.email}
            />
          )}
        </div>

        {/* Privacy Settings */}
        <Card className="shadow-sm border border-gray-100">
          <CardHeader className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Privacy & Visibility</span>
            </CardTitle>
            <CardDescription className="text-white/90">
              Control who can see your profile and information
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">Profile Visibility</Label>
              <p className="text-sm text-gray-600">Choose who can view your profile</p>
              <div className="space-y-2">
                {/* 
               * FEATURE FLAG: NEXT_PUBLIC_PRIVATE_PROFILE_DISABLES_INVITATIONS
               * Label change: "Employers Only - Only verified employers" → "Only Logged in Employers"
               * To revert: Set NEXT_PUBLIC_PRIVATE_PROFILE_DISABLES_INVITATIONS="false" in .env
               */}
                {[
                  {
                    value: 'employers-only',
                    label: process.env.NEXT_PUBLIC_PRIVATE_PROFILE_DISABLES_INVITATIONS !== 'false'
                      ? 'Only Logged in Employers'
                      : 'Employers Only - Only verified employers'
                  },
                  { value: 'private', label: 'Private - Only you can view' }
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={option.value}
                      name="profileVisibility"
                      value={option.value}
                      checked={settings.privacy.profileVisibility === option.value}
                      onChange={(e) => updatePrivacySetting('profileVisibility', e.target.value)}
                      className="text-brand-teal"
                    />
                    <Label htmlFor={option.value} className="text-sm">{option.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Show Salary Expectations</Label>
                <p className="text-sm text-gray-600">Display your expected salary range to employers</p>
              </div>
              <Checkbox
                checked={settings.privacy.showSalaryExpectations}
                onCheckedChange={(checked: boolean) => updatePrivacySetting('showSalaryExpectations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Allow Job Invitations</Label>
                <p className="text-sm text-gray-600">Let employers invite you to apply for specific jobs</p>
              </div>
              {/* 
             * FEATURE FLAG: NEXT_PUBLIC_PRIVATE_PROFILE_DISABLES_INVITATIONS
             * Checkbox is disabled when profile visibility is set to 'private'
             * This prevents contradictory settings (private profile + accepting invitations)
             * To disable this behavior: Set NEXT_PUBLIC_PRIVATE_PROFILE_DISABLES_INVITATIONS="false" in .env
             */}
              <Checkbox
                checked={settings.privacy.allowJobInvitations}
                onCheckedChange={(checked: boolean) => updatePrivacySetting('allowJobInvitations', checked)}
                disabled={process.env.NEXT_PUBLIC_PRIVATE_PROFILE_DISABLES_INVITATIONS !== 'false' && settings.privacy.profileVisibility === 'private'}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Allow Direct Messages</Label>
                <p className="text-sm text-gray-600">Allow employers to send you direct messages</p>
              </div>
              <Checkbox
                checked={settings.privacy.allowDirectMessages}
                onCheckedChange={(checked: boolean) => updatePrivacySetting('allowDirectMessages', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Management */}
        <Card className="shadow-sm border border-gray-100">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900">
              <User className="h-5 w-5" />
              <span>Account Management</span>
            </CardTitle>
            <CardDescription>
              Manage your account details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Button asChild variant="outline" className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white">
                <Link href="/seeker/profile">
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>

              <Button asChild variant="outline" className="border-brand-coral text-brand-coral hover:bg-brand-coral hover:text-white">
                <Link href="/seeker/subscription">
                  <Eye className="h-4 w-4 mr-2" />
                  Subscription
                </Link>
              </Button>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-semibold text-gray-900 mb-4">Danger Zone</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="font-medium text-red-900">Delete Account</h5>
                    <p className="text-sm text-red-700">
                      Permanently delete your account and all data. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <DeleteAccountDialog
              isOpen={showDeleteDialog}
              onClose={() => setShowDeleteDialog(false)}
              onConfirm={handleDeleteAccount}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
