'use client'

import { useState, useEffect } from 'react'
import { useClerk } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmailChangeForm } from '@/components/employer/EmailChangeForm'
import { PasswordResetSection } from '@/components/employer/PasswordResetSection'
import { PasswordChangeForm } from '@/components/employer/PasswordChangeForm'
import { useToast } from '@/components/ui/toast'
import { Settings } from 'lucide-react'
import { DeleteAccountDialog } from '@/components/common/DeleteAccountDialog'
import { downloadAccountData } from '@/lib/employer-download-account-data'
import { getWithImpersonation, deleteWithImpersonation, postWithImpersonation } from '@/lib/api-client'

export default function EmployerSettingsPage() {
  const { signOut } = useClerk()
  const [userEmail, setUserEmail] = useState<string>('')
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [])

  const handleDeleteAccount = async () => {
    try {
      console.log("Deleting account...");

      // Show confirmation to user before proceeding
      addToast({
        title: "Deleting account...",
        description: "Please wait while we remove your account data.",
        variant: "default"
      });

      const response = await deleteWithImpersonation('/api/employer/account/delete')

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

      // Sign out the user using Clerk which will handle token cleanup
      setTimeout(async () => {
        try {
          await signOut({ redirectUrl: '/sign-in' })
        } catch (signOutError) {
          console.error('Error signing out user:', signOutError)
          window.location.href = '/'
        }
      }, 2000)
    } catch (error) {
      console.error('Error deleting account:', error)
      addToast({
        title: "Error deleting account",
        description: error instanceof Error ? error.message : "There was a problem deleting your account. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  }

  const handleDownloadAccountData = async () => {
    setIsDownloading(true)
    try {
      const result = await downloadAccountData()

      if (result.success && result.data && result.filename) {
        // Create a Blob with the data
        const blob = new Blob([result.data], { type: 'application/json' })

        // Create a download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename

        // Trigger the download
        document.body.appendChild(a)
        a.click()

        // Clean up
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        addToast({
          title: 'Download complete',
          description: 'Your account data has been downloaded.',
        })
      } else {
        addToast({
          title: 'Error',
          description: result.error || 'Failed to download account data.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error downloading account data:', error)
      addToast({
        title: 'Error',
        description: 'Failed to download account data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const loadUserData = async () => {
    try {
      console.log('Loading user data for settings...')

      const response = await getWithImpersonation('/api/employer/profile')
      if (response.ok) {
        const data = await response.json()

        // Better email handling with fallbacks
        const email = data.userEmail || data.email || 'No email found'
        setUserEmail(email)

        console.log('User data loaded successfully:', {
          userEmail: email,
          rawData: data
        })
      } else {
        console.error('Failed to load user data, status:', response.status)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
        setUserEmail('Error loading email')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      setUserEmail('Error loading email')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    try {
      console.log('Requesting password reset for:', userEmail)

      const response = await postWithImpersonation('/api/employer/account/password-reset')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send password reset email')
      }

      const result = await response.json()
      console.log('Password reset request successful:', result)

    } catch (error) {
      console.error('Password reset error:', error)
      throw error
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
        <p className="text-gray-600">
          Manage your account security, email preferences, and notification settings.
        </p>
      </div>

      <div className="space-y-6">
        {/* Email Change Section */}
        <EmailChangeForm
          currentEmail={userEmail}
        />

        {/* Password Change Section */}
        <PasswordChangeForm />

        {/* Password Reset Section */}
        <PasswordResetSection
          userEmail={userEmail}
          onPasswordReset={handlePasswordReset}
        />

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Notification Preferences</span>
            </CardTitle>
            <CardDescription>
              Manage your email notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Email Notifications */}
              <div>
                <h3 className="font-semibold mb-4">Email Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New Applications</p>
                      <p className="text-sm text-gray-600">Get notified when someone applies to your jobs</p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Job Expiration Reminders</p>
                      <p className="text-sm text-gray-600">Reminders 7 days before your job posting expires</p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Platform Updates</p>
                      <p className="text-sm text-gray-600">News about new features and platform improvements</p>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div>
                <h3 className="font-semibold mb-4">Account Actions</h3>
                <div className="space-y-3">
                  <button
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    onClick={handleDownloadAccountData}
                    disabled={isDownloading}
                  >
                    {isDownloading ? 'Downloading...' : 'Download Account Data'}
                  </button>
                  <br />
                  <button
                    className="text-red-600 hover:text-red-700 font-medium"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteAccountDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        description="Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data including job postings, applications, and company information will be removed from our system."
        confirmText="Delete Account"
      />
    </div>
  )
}
