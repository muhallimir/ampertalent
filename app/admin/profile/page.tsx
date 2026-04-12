'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfilePictureUpload } from '@/components/common/ProfilePictureUpload'
import { useUserProfile } from '@/hooks/useUserProfile'
import { Shield, User, Settings, Bell } from 'lucide-react'

export default function AdminProfilePage() {
  const { user } = useUser()
  const { profile, isLoading, refetch } = useUserProfile()
  const [isUpdating, setIsUpdating] = useState(false)

  const [formData, setFormData] = useState({
    displayName: '',
    email: ''
  })

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.name || '',
        email: profile.email || ''
      })
    }
  }, [profile])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleUpdateProfile = async () => {
    if (!profile) return

    setIsUpdating(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.displayName
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      console.log('Profile updated successfully')
      refetch()
    } catch (error) {
      console.error('Error updating profile:', error)
      console.error('Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleImageUpdate = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <Shield className="h-8 w-8 text-gray-800" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{profile?.role === 'super_admin' ? 'Super Admin Profile' : 'Admin Profile'}</h1>
            <p className="text-gray-600">Manage your {profile?.role === 'super_admin' ? 'super administrator' : 'administrator'} account settings</p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="picture" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Profile Picture</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Admin Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Information Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      placeholder="Enter your display name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">Email cannot be changed from this page</p>
                  </div>

                </div>

                <div className="space-y-2">
                  <Label>Admin Role</Label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                    <Shield className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-700">{profile?.role === 'super_admin' ? 'Super Administrator' : 'System Administrator'}</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={isUpdating}
                    className="bg-gray-800 hover:bg-gray-900"
                  >
                    {isUpdating ? 'Updating...' : 'Update Profile'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Picture Tab */}
          <TabsContent value="picture">
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>
                  Upload and manage your profile picture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfilePictureUpload
                  currentImageUrl={profile?.presignedProfilePictureUrl || profile?.profilePictureUrl}
                  onImageUpdate={handleImageUpdate}
                  userName={profile?.name || 'Admin'}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>
                  Configure your administrator preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-gray-600" />
                      <div>
                        <h4 className="font-medium">Email Notifications</h4>
                        <p className="text-sm text-gray-600">Receive email alerts for system events</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-gray-600" />
                      <div>
                        <h4 className="font-medium">Security Settings</h4>
                        <p className="text-sm text-gray-600">Manage two-factor authentication and security</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Settings className="h-5 w-5 text-gray-600" />
                      <div>
                        <h4 className="font-medium">System Preferences</h4>
                        <p className="text-sm text-gray-600">Configure dashboard and system settings</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">{profile?.role === 'super_admin' ? 'Super Administrator Access' : 'Administrator Access'}</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          You have full administrative privileges. Use these settings responsibly and ensure your account remains secure.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}