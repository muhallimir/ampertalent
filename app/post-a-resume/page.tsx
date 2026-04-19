'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface JobInfo {
  title?: string
  id?: string
  company?: string
  location?: string
}

function PostResumeForm() {
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const [jobInfo, setJobInfo] = useState<JobInfo>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    coverLetter: '',
    linkedinUrl: '',
    portfolioUrl: ''
  })

  useEffect(() => {
    // Extract job information from URL parameters
    const jobTitle = searchParams.get('jobTitle') || searchParams.get('title')
    const jobId = searchParams.get('jobId') || searchParams.get('id')
    const company = searchParams.get('company')
    const location = searchParams.get('location')

    setJobInfo({
      title: jobTitle || undefined,
      id: jobId || undefined,
      company: company || undefined,
      location: location || undefined
    })
  }, [searchParams])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowedTypes.includes(file.type)) {
        addToast({
          title: 'Invalid file type',
          description: 'Please upload a PDF or Word document',
          variant: 'destructive'
        })
        return
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        addToast({
          title: 'File too large',
          description: 'File size must be less than 5MB',
          variant: 'destructive'
        })
        return
      }

      setResumeFile(file)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!resumeFile) {
      addToast({
        title: 'Resume required',
        description: 'Please upload your resume',
        variant: 'destructive'
      })
      return
    }

    if (!formData.firstName || !formData.lastName || !formData.email) {
      addToast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)

    try {
      // First, get a presigned URL for file upload
      const uploadResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: resumeFile.name,
          fileType: resumeFile.type,
          fileSize: resumeFile.size,
        }),
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, fileUrl } = await uploadResponse.json()

      // Upload the file to S3
      const s3Response = await fetch(uploadUrl, {
        method: 'PUT',
        body: resumeFile,
        headers: {
          'Content-Type': resumeFile.type,
        },
      })

      if (!s3Response.ok) {
        throw new Error('Failed to upload file')
      }

      // Submit the application
      const applicationData = {
        ...formData,
        resumeUrl: fileUrl,
        jobId: jobInfo.id,
        jobTitle: jobInfo.title,
        source: 'marketing_referral'
      }

      const submitResponse = await fetch('/api/public/applications/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      })

      if (!submitResponse.ok) {
        throw new Error('Failed to submit application')
      }

      setIsSubmitted(true)
      addToast({
        title: 'Application submitted!',
        description: 'Your application has been submitted successfully!',
        variant: 'success'
      })

    } catch (error) {
      console.error('Submission error:', error)
      addToast({
        title: 'Submission failed',
        description: 'Failed to submit application. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Application Submitted Successfully!
                </h1>
                <p className="text-gray-600 mb-6">
                  Thank you for your interest in {jobInfo.title ? `the "${jobInfo.title}" position` : 'this position'}.
                  We have received your application and will review it shortly.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Our team will review your application within 2-3 business days</li>
                    <li>• If you're a good fit, we'll contact you for next steps</li>
                    <li>• You'll receive email updates about your application status</li>
                  </ul>
                </div>
                <Button
                  onClick={() => window.location.href = 'https://ampertalent.com'}
                  className="bg-brand-coral hover:bg-brand-coral/90"
                >
                  Return to AmperTalent.com
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Submit Your Resume
          </h1>
          {jobInfo.title ? (
            <p className="text-lg text-gray-600">
              Submit your resume below to apply for the job <span className="font-semibold text-brand-coral">"{jobInfo.title}"</span>
              {jobInfo.company && <span className="text-gray-500"> at {jobInfo.company}</span>}
              {jobInfo.location && <span className="text-gray-500"> in {jobInfo.location}</span>}
            </p>
          ) : (
            <p className="text-lg text-gray-600">
              Submit your resume below to apply for this position
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
            <CardDescription>
              Please fill out all required fields and upload your resume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
              </div>

              {/* Resume Upload */}
              <div>
                <Label htmlFor="resume">Resume *</Label>
                <div className="mt-1">
                  <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-brand-coral transition-colors">
                    <div className="space-y-1 text-center">
                      {resumeFile ? (
                        <div className="flex items-center justify-center space-x-2">
                          <FileText className="h-8 w-8 text-brand-coral" />
                          <span className="text-sm font-medium text-gray-900">
                            {resumeFile.name}
                          </span>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="resume"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-brand-coral hover:text-brand-coral/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-coral"
                            >
                              <span>Upload your resume</span>
                              <input
                                id="resume"
                                name="resume"
                                type="file"
                                className="sr-only"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileChange}
                                required
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            PDF, DOC, DOCX up to 5MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Fields */}
              <div>
                <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={formData.linkedinUrl}
                  onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="portfolioUrl">Portfolio/Website URL</Label>
                <Input
                  id="portfolioUrl"
                  type="url"
                  placeholder="https://yourportfolio.com"
                  value={formData.portfolioUrl}
                  onChange={(e) => handleInputChange('portfolioUrl', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="coverLetter">Cover Letter / Additional Comments</Label>
                <Textarea
                  id="coverLetter"
                  placeholder="Tell us why you're interested in this position..."
                  value={formData.coverLetter}
                  onChange={(e) => handleInputChange('coverLetter', e.target.value)}
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-coral hover:bg-brand-coral/90"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting Application...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              </div>

              <div className="text-xs text-gray-500 text-center">
                By submitting this application, you agree to our terms of service and privacy policy.
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PostResumePublicPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PostResumeForm />
    </Suspense>
  )
}