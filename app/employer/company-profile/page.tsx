'use client'

import { useState, useEffect } from 'react'
import { CompanyForm } from '@/components/employer/CompanyForm'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useImpersonationAware } from '@/components/admin/ImpersonationContext'
import { useToast } from '@/components/ui/toast'

interface CompanyProfile {
  id: string
  companyName: string
  companyWebsite?: string
  companyDescription: string
  missionStatement?: string
  coreValues?: string
  billingAddress?: string
  taxId?: string
  companyLogoUrl?: string
  createdAt: string
  updatedAt: string
}

interface CompanyFormData {
  companyName: string
  companyWebsite?: string
  companyDescription: string
  missionStatement?: string
  coreValues?: string
  billingAddress?: string
  taxId?: string
  companyLogoUrl?: string
}

export default function EmployerCompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { profile: userProfile, isLoading: isUserProfileLoading } = useUserProfile()
  const { isImpersonating, impersonatedUser } = useImpersonationAware()
  const { addToast } = useToast()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      console.log('Loading employer profile...')
      
      // Check for impersonation context only on client side
      const headers: HeadersInit = {}
      
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          console.log('🎭 FRONTEND: Adding impersonation headers to profile request', {
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
        setProfile(data.profile)
        
        console.log('Profile loaded successfully:', {
          companyName: data.profile?.companyName,
          rawData: data
        })
      } else {
        console.error('Failed to load profile, status:', response.status)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
        setProfile(null)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompanySubmit = async (data: CompanyFormData) => {
    try {
      console.log('Saving company profile:', data)
      
      // Check for impersonation context only on client side
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          console.log('🎭 FRONTEND: Adding impersonation headers to profile update', {
            impersonatedUserId: impersonationSession.impersonatedUser.id,
            adminId: impersonationSession.adminId
          })
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }
      
      const response = await fetch('/api/employer/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        const result = await response.json()
        setProfile(result.profile)
        addToast({
          title: 'Success!',
          description: 'Company profile saved successfully!',
          variant: 'success'
        })
      } else {
        const error = await response.json()
        addToast({
          title: 'Error',
          description: `Error saving profile: ${error.error}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      addToast({
        title: 'Error',
        description: 'Error saving profile. Please try again.',
        variant: 'destructive'
      })
    }
  }

  if (isLoading || isUserProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Profile</h1>
        <p className="text-gray-600">
          Manage your company information to attract the best remote talent.
        </p>
      </div>

      <div className="space-y-6">
        <CompanyForm
          initialData={{
            ...profile
          }}
          onSubmit={handleCompanySubmit}
        />
      </div>
    </div>
  )
}