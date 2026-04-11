'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { FileUpload } from '@/components/common/FileUpload'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import {
  CheckCircle,
  AlertCircle,
  Upload,
  FileText,
  Send,
  Eye,
  AlertTriangle,
  Crown,
  Mail,
  X
} from 'lucide-react'
import { getWithImpersonation, postWithImpersonation } from '@/lib/api-client'

interface ResumeLimits {
  currentResumeCount: number
  resumeLimit: number | 'unlimited'
  canUpload: boolean
  remainingUploads: number | 'unlimited'
  planName: string
  isExpired: boolean
  membershipExpiresAt?: string
}

interface Resume {
  id: string
  filename: string
  uploadedAt: string
  url: string
  isPrimary: boolean
  fileSize?: number
}

interface CoverLetterTemplate {
  id: string
  title: string
  content: string
  isDefault: boolean
}

interface ApplicationFormProps {
  jobId: string
  jobTitle: string
  companyName: string
  onSuccess?: (applicationId: string) => void
  onCancel?: () => void
}

export function ApplicationForm({
  jobId,
  jobTitle,
  companyName,
  onSuccess,
  onCancel
}: ApplicationFormProps) {
  const [coverLetter, setCoverLetter] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [resumes, setResumes] = useState<Resume[]>([])
  const [resumeOption, setResumeOption] = useState<'existing' | 'new' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [resumeLimits, setResumeLimits] = useState<ResumeLimits | null>(null)
  const [isLoadingLimits, setIsLoadingLimits] = useState(true)
  const [coverLetterTemplates, setCoverLetterTemplates] = useState<CoverLetterTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)

  // Check for existing resumes and limits on component mount
  useEffect(() => {
    loadResumesAndLimits()
    loadCoverLetterTemplates()
  }, [])

  const loadResumesAndLimits = async (preserveSelection = false) => {
    try {
      const response = await getWithImpersonation('/api/seeker/resumes')
      if (response.ok) {
        const data = await response.json()
        setResumes(data.resumes || [])
        setResumeLimits(data.limits)
        
        // Only auto-select if not preserving current selection
        if (!preserveSelection) {
          // Auto-select primary resume if available
          const primaryResume = data.resumes?.find((r: Resume) => r.isPrimary)
          if (primaryResume) {
            setSelectedResumeId(primaryResume.id)
            setResumeUrl(primaryResume.url)
            setResumeOption('existing')
          } else if (data.resumes?.length > 0) {
            // If no primary, select the first resume
            const firstResume = data.resumes[0]
            setSelectedResumeId(firstResume.id)
            setResumeUrl(firstResume.url)
            setResumeOption('existing')
          } else {
            // No existing resumes, force user to upload new one
            setResumeOption('new')
          }
        }
      } else {
        console.error('Failed to load resumes and limits')
        if (!preserveSelection) {
          setResumeOption('new')
        }
      }
    } catch (error) {
      console.error('Error loading resumes and limits:', error)
      if (!preserveSelection) {
        setResumeOption('new')
      }
    } finally {
      setIsLoadingLimits(false)
    }
  }

  const loadCoverLetterTemplates = async () => {
    try {
      const response = await getWithImpersonation('/api/seeker/cover-letter-templates')
      if (response.ok) {
        const data = await response.json()
        const templates = data.templates || []
        setCoverLetterTemplates(templates)
        
        // Auto-select default template if available
        const defaultTemplate = templates.find((t: CoverLetterTemplate) => t.isDefault)
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id)
          setCoverLetter(defaultTemplate.content)
        }
      }
    } catch (error) {
      console.error('Error loading cover letter templates:', error)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  // Function to clean filename by removing UUID prefix
  const cleanFilename = (filename: string) => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i
    return filename.replace(uuidPattern, '')
  }

  const handleResumeUpload = (url: string) => {
    // Check if upload is allowed
    if (resumeLimits && !resumeLimits.canUpload && resumes.length === 0) {
      setError(`You've reached your resume limit for the ${resumeLimits.planName} plan. Please upgrade to upload more resumes.`)
      return
    }
    
    setResumeUrl(url)
    setError(null)
    
    // Reload resumes and limits after successful upload, using same pattern as ResumeUpload
    setTimeout(() => {
      loadResumesAndLimits(true) // Preserve current selection
    }, 1000)
  }

  const handleResumeOptionChange = (option: 'existing' | 'new') => {
    setResumeOption(option)
    if (option === 'existing' && selectedResumeId) {
      const selectedResume = resumes.find(r => r.id === selectedResumeId)
      if (selectedResume) {
        setResumeUrl(selectedResume.url)
      }
    } else if (option === 'new') {
      setResumeUrl('')
      setSelectedResumeId('')
    }
    setError(null)
  }

  const handleResumeSelection = (resumeId: string) => {
    setSelectedResumeId(resumeId)
    const selectedResume = resumes.find(r => r.id === resumeId)
    if (selectedResume) {
      setResumeUrl(selectedResume.url)
    }
  }

  const handleDownloadResume = async (resumeId: string) => {
    try {
      const response = await getWithImpersonation(`/api/seeker/resumes/${resumeId}/download`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.downloadUrl) {
          // Open the signed URL in a new tab
          window.open(data.downloadUrl, '_blank')
        } else {
          console.error('Failed to get download URL')
        }
      } else {
        console.error('Failed to fetch download URL')
      }
    } catch (error) {
      console.error('Error downloading resume:', error)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (templateId && templateId !== 'none') {
      const template = coverLetterTemplates.find(t => t.id === templateId)
      if (template) {
        setCoverLetter(template.content)
      }
    } else {
      setCoverLetter('')
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!resumeUrl) {
      setError('Please upload your resume before submitting')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await postWithImpersonation(`/api/jobs/${jobId}/apply`, {
        coverLetter: coverLetter.trim() || null,
        resumeUrl
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      setSuccess(true)
      if (onSuccess) {
        onSuccess(data.applicationId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Application Submitted!
              </h3>
              <p className="text-gray-600 mb-4">
                Your application for <strong>{jobTitle}</strong> at <strong>{companyName}</strong> has been submitted successfully.
              </p>
              <p className="text-sm text-gray-500">
                You'll receive an email confirmation shortly, and the employer will review your application.
              </p>
            </div>
            <Button onClick={onCancel} variant="outline">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="relative">
        <CardTitle className="flex items-center space-x-2">
          <Send className="w-5 h-5" />
          <span>Apply for {jobTitle}</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          at <strong>{companyName}</strong>
        </p>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="absolute top-4 right-4 h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resume Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Resume <span className="text-red-500">*</span>
            </Label>
            
            {/* Resume Options */}
            {resumes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="existing-resume"
                    name="resume-option"
                    checked={resumeOption === 'existing'}
                    onChange={() => handleResumeOptionChange('existing')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="existing-resume" className="flex items-center space-x-2 cursor-pointer">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Use one of my existing resumes</span>
                  </label>
                </div>
                
                {/* Resume Selection Dropdown */}
                {resumeOption === 'existing' && (
                  <div className="ml-7 space-y-2">
                    <Select value={selectedResumeId} onValueChange={handleResumeSelection}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a resume..." />
                      </SelectTrigger>
                      <SelectContent>
                        {resumes.map((resume) => (
                          <SelectItem key={resume.id} value={resume.id}>
                            <div className="flex items-center space-x-2 w-full">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="flex-1">{cleanFilename(resume.filename)}</span>
                              {resume.isPrimary && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  Primary
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedResumeId && (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadResume(selectedResumeId)}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Preview Resume</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="new-resume"
                    name="resume-option"
                    checked={resumeOption === 'new'}
                    onChange={() => handleResumeOptionChange('new')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="new-resume" className="text-sm font-medium cursor-pointer">
                    Upload a different resume
                  </label>
                </div>
              </div>
            )}
            
            {/* Resume Limits Display */}
            {!isLoadingLimits && resumeLimits && resumeOption === 'new' && (
              <div className={`mb-4 p-3 rounded-lg border ${
                resumeLimits.isExpired ? 'border-red-200 bg-red-50' :
                resumeLimits.canUpload ? 'border-green-200 bg-green-50' :
                'border-orange-200 bg-orange-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${
                      resumeLimits.isExpired ? 'bg-red-100' :
                      resumeLimits.canUpload ? 'bg-green-100' :
                      'bg-orange-100'
                    }`}>
                      {resumeLimits.isExpired ? (
                        <AlertTriangle className="h-3 w-3 text-red-600" />
                      ) : resumeLimits.canUpload ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium">{resumeLimits.planName}</span>
                        {resumeLimits.planName !== 'No Active Plan' && (
                          <Badge variant="outline" className="text-xs">
                            <Crown className="h-2 w-2 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className={`text-xs ${
                        resumeLimits.isExpired ? 'text-red-600' :
                        resumeLimits.canUpload ? 'text-green-600' :
                        'text-orange-600'
                      }`}>
                        {resumeLimits.isExpired ? (
                          'Plan expired - cannot upload new resumes'
                        ) : resumeLimits.resumeLimit === 'unlimited' ? (
                          'Unlimited resume uploads available'
                        ) : resumeLimits.canUpload ? (
                           `${resumeLimits.currentResumeCount} of ${resumeLimits.resumeLimit} resumes uploaded • ${resumeLimits.remainingUploads} uploads remaining`
                        ) : (
                          `Resume limit reached (${resumeLimits.currentResumeCount}/${resumeLimits.resumeLimit})`
                        )}
                      </p>
                    </div>
                  </div>
                  {(!resumeLimits.canUpload || resumeLimits.isExpired) && (
                    <Link href="/seeker/subscription">
                      <Button size="sm" className="bg-brand-teal hover:bg-brand-teal/90 text-xs">
                        Upgrade
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Resume Upload Area */}
            {(resumeOption === 'new' || resumes.length === 0) && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {resumeUrl && resumeOption === 'new' ? (
                  <div className="flex items-center space-x-3 text-green-600">
                    <FileText className="w-5 h-5" />
                    <span className="text-sm font-medium">New resume uploaded successfully</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setResumeUrl('')}
                    >
                      Change
                    </Button>
                  </div>
                ) : resumeLimits && (!resumeLimits.canUpload || resumeLimits.isExpired) && resumes.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {resumeLimits.isExpired ? 'Plan Expired' : 'Upload Limit Reached'}
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      {resumeLimits.isExpired
                        ? 'Your subscription has expired. Renew your plan to upload resumes.'
                        : `You've used all ${resumeLimits.resumeLimit} resume uploads for your ${resumeLimits.planName} plan.`
                      }
                    </p>
                    <Link href="/seeker/subscription">
                      <Button className="bg-brand-teal hover:bg-brand-teal/90">
                        {resumeLimits.isExpired ? 'Renew Plan' : 'Upgrade Plan'}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <FileUpload
                    onUpload={handleResumeUpload}
                    accept=".pdf,.doc,.docx"
                    maxSize={5 * 1024 * 1024} // 5MB
                    className="w-full"
                  >
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">
                        Click to upload your resume
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, DOC, or DOCX (max 5MB)
                      </p>
                    </div>
                  </FileUpload>
                )}
              </div>
            )}
            
            {/* Current Resume Status */}
            {resumeOption === 'existing' && selectedResumeId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-green-700">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Using: {cleanFilename(resumes.find(r => r.id === selectedResumeId)?.filename || 'Selected Resume')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Cover Letter */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Cover Letter <span className="text-gray-400">(Optional)</span>
            </Label>
            
            {/* Template Selection */}
            {!isLoadingTemplates && coverLetterTemplates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="template-select" className="text-xs font-medium text-gray-600">
                  Use a template (optional)
                </Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a cover letter template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>Start from scratch</span>
                      </div>
                    </SelectItem>
                    {coverLetterTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-blue-500" />
                          <span>{template.title}</span>
                          {template.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Textarea
                id="coverLetter"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Tell the employer why you're interested in this position and what makes you a great fit..."
                rows={8}
                className="resize-none"
                maxLength={2000}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {selectedTemplateId ? 'Template loaded - customize as needed' : 'Optional but recommended'}
                </span>
                <span>{coverLetter.length}/2000</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !resumeUrl}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Application Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Application Tips
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• You can use your existing resume or upload a job-specific version</li>
              <li>• Make sure your resume is up-to-date and relevant to this position</li>
              <li>• Customize your cover letter to highlight relevant experience</li>
              <li>• Double-check your contact information is correct</li>
              <li>• Applications are typically reviewed within 2-3 business days</li>
              {resumeLimits && resumeLimits.planName === 'No Active Plan' && (
                <li className="text-orange-700 font-medium">• Active subscription required to upload new resumes</li>
              )}
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}