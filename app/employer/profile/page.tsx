'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmailChangeForm } from '@/components/employer/EmailChangeForm'
import { PasswordResetSection } from '@/components/employer/PasswordResetSection'
import { PasswordChangeForm } from '@/components/employer/PasswordChangeForm'
import { ProfilePictureUpload } from '@/components/common/ProfilePictureUpload'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import { User, Mail, Shield, Calendar, Building2 } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  lastLoginAt?: string
  companyName?: string
  profilePictureUrl?: string
}

export default function EmployerUserProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      console.log('Loading user profile...')

      // Check for impersonation context only on client side
      const headers: HeadersInit = {}

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          console.log('🎭 FRONTEND: Adding impersonation headers to user profile request', {
            impersonatedUserId: impersonationSession.impersonatedUser.id,
            adminId: impersonationSession.adminId
          })
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch('/api/employer/profile', { headers })
      if (response.ok) {
        const data = await response.json()
        console.log('Raw API response:', data)

        // Transform the data to match our UserProfile interface
        const profile: UserProfile = {
          id: data.profile?.id || 'unknown',
          email: data.userEmail || 'No email found',
          name: data.profile?.companyName || 'Employer User',
          role: 'Employer',
          createdAt: data.profile?.createdAt || new Date().toISOString(),
          companyName: data.profile?.companyName || 'No company name',
          profilePictureUrl: data.profile?.profilePictureUrl
        }

        setUserProfile(profile)

        console.log('User profile loaded successfully:', profile)
      } else {
        console.error('Failed to load user profile, status:', response.status)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    try {
      console.log('Requesting password reset for:', userProfile?.email)

      // Check for impersonation context only on client side
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch('/api/employer/account/password-reset', {
        method: 'POST',
        headers,
      })

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

  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    try {
      console.log('Requesting password change')

      // Check for impersonation context only on client side
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch('/api/employer/account/password-change', {
        method: 'POST',
        headers,
        body: JSON.stringify({ currentPassword, newPassword })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change password')
      }

      const result = await response.json()
      console.log('Password change successful:', result)
    } catch (error) {
      console.error('Password change error:', error)
      throw error
    }
  }

  const handleProfilePictureUpdate = (newUrl: string | null) => {
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        profilePictureUrl: newUrl || undefined
      })
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Profile</h1>
        <p className="text-gray-600">
          Manage your personal account information, security settings, and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Picture Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Picture</span>
            </CardTitle>
            <CardDescription>
              Upload and manage your profile picture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfilePictureUpload
              currentImageUrl={userProfile?.profilePictureUrl}
              onImageUpdate={handleProfilePictureUpdate}
              userName={userProfile?.name || 'User'}
            />
          </CardContent>
        </Card>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Account Information</span>
            </CardTitle>
            <CardDescription>
              Your basic account details and information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-700">Email Address</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-900">{userProfile?.email || 'No email found'}</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Account Type</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-900">{userProfile?.role || 'Employer'}</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Company</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-900">{userProfile?.companyName || 'No company set'}</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Member Since</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-900">
                    {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Change Section */}
        <EmailChangeForm
          currentEmail={userProfile?.email || ''}
        />

        {/* Password Change Section */}
        <PasswordChangeForm
          onPasswordChange={handlePasswordChange}
        />

        {/* Password Reset Section */}
        <PasswordResetSection
          userEmail={userProfile?.email || ''}
          onPasswordReset={handlePasswordReset}
        />
      </div>
    </div>
  )
}