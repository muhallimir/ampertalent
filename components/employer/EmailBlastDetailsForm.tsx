'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import { Upload, Link, FileText, Image, ExternalLink } from 'lucide-react'

interface EmailBlastDetailsFormProps {
  jobId: string
  onComplete?: () => void
}

interface CompanyProfile {
  companyName: string
  companyLogoUrl: string | null
}

interface EmailBlastRequest {
  id: string
  logoUrl: string | null
  content: string | null
  customLink: string | null
  useJobLink: boolean
  status: string
}

export function EmailBlastDetailsForm({ jobId, onComplete }: EmailBlastDetailsFormProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
  const [emailBlastRequest, setEmailBlastRequest] = useState<EmailBlastRequest | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const [formData, setFormData] = useState({
    logoUrl: '',
    content: '',
    customLink: '',
    useJobLink: true,
    useExistingLogo: true
  })

  useEffect(() => {
    loadData()
  }, [jobId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Check for impersonation context only on client side
      const headers: HeadersInit = {}
      
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          console.log('🎭 FRONTEND: Adding impersonation headers to email blast form requests', {
            impersonatedUserId: impersonationSession.impersonatedUser.id,
            adminId: impersonationSession.adminId
          })
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }
      
      // Load company profile
      const profileResponse = await fetch('/api/employer/profile', { headers })
      let profileData = null
      if (profileResponse.ok) {
        profileData = await profileResponse.json()
        console.log('📧 EmailBlastForm: Profile data received', {
          profile: profileData.profile,
          companyName: profileData.profile?.companyName,
          companyLogoUrl: profileData.profile?.companyLogoUrl,
          hasLogo: !!profileData.profile?.companyLogoUrl
        })
        setCompanyProfile(profileData.profile)
      } else {
        console.error('📧 EmailBlastForm: Failed to load profile', {
          status: profileResponse.status,
          statusText: profileResponse.statusText
        })
      }

      // Load existing email blast request data
      const emailBlastResponse = await fetch(`/api/employer/jobs/${jobId}/email-blast`, { headers })
      if (emailBlastResponse.ok) {
        const emailBlastData = await emailBlastResponse.json()
        setEmailBlastRequest(emailBlastData.emailBlastRequest)
        
        if (emailBlastData.emailBlastRequest) {
          const request = emailBlastData.emailBlastRequest
          setFormData({
            logoUrl: request.logoUrl || '',
            content: request.content || '',
            customLink: request.customLink || '',
            useJobLink: request.useJobLink,
            useExistingLogo: !request.logoUrl || request.logoUrl === profileData?.profile?.companyLogoUrl
          })
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      addToast({
        title: 'Error',
        description: 'Failed to load email blast details',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive'
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsUploading(true)
      
      // Check for impersonation context only on client side
      const headers: HeadersInit = {}
      
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }
      
      const formData = new FormData()
      formData.append('logo', file)
      
      const response = await fetch('/api/employer/company-logo', {
        method: 'POST',
        headers,
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({
          ...prev,
          logoUrl: data.logoUrl,
          useExistingLogo: false
        }))
        
        addToast({
          title: 'Success',
          description: 'Logo uploaded successfully',
          variant: 'default'
        })
      } else {
        const error = await response.json()
        addToast({
          title: 'Upload Failed',
          description: error.error || 'Failed to upload logo',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      addToast({
        title: 'Upload Error',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.content.trim()) {
      addToast({
        title: 'Content Required',
        description: 'Please provide content for the email blast',
        variant: 'destructive'
      })
      return
    }

    if (formData.content.trim().split(/\s+/).length > 100) {
      addToast({
        title: 'Content Too Long',
        description: 'Content must be 100 words or less',
        variant: 'destructive'
      })
      return
    }

    if (!formData.useJobLink && !formData.customLink.trim()) {
      addToast({
        title: 'Link Required',
        description: 'Please provide a custom link or use the job post link',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsSaving(true)
      
      const submitData = {
        logoUrl: formData.useExistingLogo ? companyProfile?.companyLogoUrl : formData.logoUrl,
        content: formData.content.trim(),
        customLink: formData.useJobLink ? null : formData.customLink.trim(),
        useJobLink: formData.useJobLink
      }
      
      // Check for impersonation context only on client side
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }
      
      const response = await fetch(`/api/employer/jobs/${jobId}/email-blast`, {
        method: 'POST',
        headers,
        body: JSON.stringify(submitData)
      })
      
      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Email blast details saved successfully',
          variant: 'default'
        })
        
        if (onComplete) {
          onComplete()
        } else {
          router.push('/employer/jobs')
        }
      } else {
        const error = await response.json()
        addToast({
          title: 'Save Failed',
          description: error.error || 'Failed to save email blast details',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error saving email blast details:', error)
      addToast({
        title: 'Save Error',
        description: 'Failed to save email blast details. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const wordCount = formData.content.trim().split(/\s+/).filter(word => word.length > 0).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Don't allow editing if processing has started or email has been sent
  const isReadOnly = emailBlastRequest?.status === 'pending' || emailBlastRequest?.status === 'completed'

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Email Blast Details</span>
          </CardTitle>
          <CardDescription>
            {isReadOnly
              ? emailBlastRequest?.status === 'completed'
                ? 'Email blast details (read-only - email has been sent)'
                : 'Email blast details (read-only - processing has started)'
              : 'Provide the details for your email blast to our candidate database'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Company Logo</Label>
              
              {companyProfile?.companyLogoUrl ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <div className="text-sm text-blue-800 font-medium">Choose your logo option:</div>
                  
                  {/* Existing Logo Option */}
                  <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.useExistingLogo ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`} onClick={() => !isReadOnly && setFormData(prev => ({ ...prev, useExistingLogo: true }))}>
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="existing"
                        name="logoChoice"
                        checked={formData.useExistingLogo}
                        onChange={() => setFormData(prev => ({ ...prev, useExistingLogo: true }))}
                        disabled={isReadOnly}
                        className="h-4 w-4 text-blue-600"
                      />
                      <div className="flex items-center space-x-3 flex-1">
                        <CompanyLogo
                          companyName={companyProfile.companyName}
                          companyLogoUrl={companyProfile.companyLogoUrl}
                          size="md"
                        />
                        <div>
                          <Label htmlFor="existing" className="font-medium cursor-pointer">
                            Use existing company logo
                          </Label>
                          <div className="text-sm text-gray-600">
                            Your current company logo from your profile
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Upload New Logo Option */}
                  <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    !formData.useExistingLogo ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`} onClick={() => !isReadOnly && setFormData(prev => ({ ...prev, useExistingLogo: false }))}>
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="upload"
                        name="logoChoice"
                        checked={!formData.useExistingLogo}
                        onChange={() => setFormData(prev => ({ ...prev, useExistingLogo: false }))}
                        disabled={isReadOnly}
                        className="h-4 w-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <Label htmlFor="upload" className="font-medium cursor-pointer">
                          Upload a different logo
                        </Label>
                        <div className="text-sm text-gray-600">
                          Upload a custom logo specifically for this email blast
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-sm text-yellow-800">
                    <strong>No company logo found.</strong> You can upload a logo for this email blast below, or add one to your company profile first.
                  </div>
                </div>
              )}

              {(!formData.useExistingLogo || !companyProfile?.companyLogoUrl) && !isReadOnly && (
                <div className="space-y-2">
                  <Label htmlFor="logo-upload">Upload Logo</Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploading}
                      className="flex-1"
                    />
                    {isUploading && <LoadingSpinner size="sm" />}
                  </div>
                  <p className="text-sm text-gray-500">
                    Recommended: PNG or JPG, max 5MB
                  </p>
                </div>
              )}

              {formData.logoUrl && !formData.useExistingLogo && (
                <div className="flex items-center space-x-2">
                  <Image className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Custom logo uploaded</span>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="space-y-2">
              <Label htmlFor="content">Email Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Describe your job opportunity and what makes it attractive to candidates..."
                rows={6}
                disabled={isReadOnly}
                className="resize-none"
              />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {wordCount}/100 words
                </span>
                {wordCount > 100 && (
                  <span className="text-red-600">Content exceeds 100 word limit</span>
                )}
              </div>
            </div>

            {/* Link Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Link Destination</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="job-link"
                    name="linkChoice"
                    checked={formData.useJobLink}
                    onChange={() => setFormData(prev => ({ ...prev, useJobLink: true }))}
                    disabled={isReadOnly}
                    className="h-4 w-4 text-blue-600"
                  />
                  <Label htmlFor="job-link" className="flex items-center space-x-2">
                    <Link className="h-4 w-4" />
                    <span>Use HMM job post link</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="custom-link"
                    name="linkChoice"
                    checked={!formData.useJobLink}
                    onChange={() => setFormData(prev => ({ ...prev, useJobLink: false }))}
                    disabled={isReadOnly}
                    className="h-4 w-4 text-blue-600"
                  />
                  <Label htmlFor="custom-link" className="flex items-center space-x-2">
                    <ExternalLink className="h-4 w-4" />
                    <span>Use custom link</span>
                  </Label>
                </div>
              </div>

              {!formData.useJobLink && (
                <div className="space-y-2">
                  <Label htmlFor="custom-link-input">Custom Link</Label>
                  <Input
                    id="custom-link-input"
                    type="url"
                    value={formData.customLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, customLink: e.target.value }))}
                    placeholder="https://your-website.com/apply"
                    disabled={isReadOnly}
                  />
                  <p className="text-sm text-gray-500">
                    Where candidates will be directed when they click the email
                  </p>
                </div>
              )}
            </div>

            {!isReadOnly && (
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/employer/jobs')}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || wordCount > 100}
                >
                  {isSaving ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Email Blast Details'
                  )}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}