'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Upload, 
  Star, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Target,
  TrendingUp
} from 'lucide-react'
import { uploadResumeWithoutDebitCredits } from '@/lib/resume-upload'
import { ResumeCritiquePaymentModal } from './ResumeCritiquePaymentModal'
import { PaymentMethodForm } from '@/components/payments/PaymentMethodForm'
import { useToast } from '@/components/ui/toast'

interface ResumeCritiqueRequestProps {
  seekerId: string
  currentCredits: number
  hasActiveSubscription: boolean
  onRequestSubmitted?: () => void
}

export function ResumeCritiqueRequest({
  seekerId,
  currentCredits,
  hasActiveSubscription,
  onRequestSubmitted
}: ResumeCritiqueRequestProps) {
  const { addToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [targetRole, setTargetRole] = useState('')
  const [targetIndustry, setTargetIndustry] = useState('')
  const [priority, setPriority] = useState<'standard' | 'rush'>('standard')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [showAddPaymentMethodForm, setShowAddPaymentMethodForm] = useState(false)

  const canSubmit = hasActiveSubscription || currentCredits > 0
  const cost = priority === 'rush' ? (hasActiveSubscription ? 19.99 : 49.99) : (hasActiveSubscription ? 0 : 29.99)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf' && !file.type.includes('word')) {
        setError('Please upload a PDF or Word document')
        return
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB')
        return
      }
      setResumeFile(file)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resumeFile) {
      setError('Please upload your resume')
      return
    }

    // For rush reviews that require payment, show payment form first
    if (priority === 'rush' && cost > 0) {
      setShowPaymentForm(true)
      return
    }

    // If we get here, either it's a free request or we're ready to process payment
    await processCritiqueRequest()
  }

  const processCritiqueRequest = async (paymentMethodId?: string) => {
    setIsSubmitting(true)
    setError('')

    try {
      // First, we need to get the current user ID for S3 key generation
      // In a real implementation, this would come from auth context
      // For now, we'll use the seekerId as userId since it's available
      const userId = seekerId
      
      // Upload resume to S3
      if (!resumeFile) {
        throw new Error('Resume file is missing')
      }
      const uploadResult = await uploadResumeWithoutDebitCredits(resumeFile, seekerId, userId)
      
      // Determine the final payment method ID to use
      // Use the passed paymentMethodId if available, otherwise use selectedPaymentMethod if applicable
      let finalPaymentMethodId = paymentMethodId
      if (!finalPaymentMethodId && priority === 'rush' && selectedPaymentMethod) {
        finalPaymentMethodId = selectedPaymentMethod
      }
      
      // Submit the critique request with payment processing
      const response = await fetch('/api/resume-critique/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seekerId,
          resumeUrl: uploadResult.url,
          targetRole: targetRole || undefined,
          targetIndustry: targetIndustry || undefined,
          priority,
          paymentMethodId: finalPaymentMethodId
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit resume critique request')
      }
      
      // Call the callback to refresh the parent component
      if (onRequestSubmitted) {
        onRequestSubmitted()
      }
      
      // Show success toast notification
      addToast({
        title: 'Critique Request Submitted!',
        description: `Your ${priority === 'rush' ? 'Rush' : 'Standard'} Resume Critique request has been submitted successfully.`,
        variant: 'success',
        duration: 5000,
      })
      
      setSuccess(true)
      setShowPaymentForm(false)
    } catch (err) {
      console.error('Error submitting resume critique request:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit resume critique request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Request Submitted!</h3>
              <p className="text-gray-600 mt-2">
                Your resume critique request has been submitted successfully.
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>What happens next:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Our experts will review your resume within {priority === 'rush' ? '24 hours' : '3-5 business days'}</li>
                <li>• You&apos;ll receive a detailed analysis with actionable feedback</li>
                <li>• We&apos;ll email you when your critique is ready</li>
              </ul>
            </div>
            <Button onClick={() => setSuccess(false)} variant="outline">
              Submit Another Request
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Resume Critique Service</h2>
        <p className="text-gray-600 mt-2">
          Get professional feedback to improve your resume and increase your chances of landing interviews
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-3">
              <Target className="h-8 w-8 text-blue-500" />
              <div>
                <h3 className="font-semibold">Expert Analysis</h3>
                <p className="text-sm text-gray-600">Professional reviewers with industry experience</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-semibold">Actionable Feedback</h3>
                <p className="text-sm text-gray-600">Specific suggestions to improve your resume</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-3">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <h3 className="font-semibold">ATS Optimization</h3>
                <p className="text-sm text-gray-600">Ensure your resume passes automated screening</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={`${priority === 'standard' ? 'ring-2 ring-blue-500' : 'ring-1 ring-gray-200'} cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all duration-200`}
          onClick={() => setPriority('standard')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Standard Review</span>
              </CardTitle>
              <Badge variant="secondary">3-5 Days</Badge>
            </div>
            <CardDescription>
              Comprehensive review with detailed feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-4">
              {hasActiveSubscription ? 'Free' : '$29.99'}
            </div>
            <div className={`px-4 py-2 rounded-md text-center ${
              priority === 'standard' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {priority === 'standard' ? 'Selected' : 'Select Standard'}
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`${priority === 'rush' ? 'ring-2 ring-orange-500' : 'ring-1 ring-gray-200'} cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all duration-200`}
          onClick={() => setPriority('rush')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Rush Review</span>
              </CardTitle>
              <Badge variant="destructive">24 Hours</Badge>
            </div>
            <CardDescription>
              Priority review with expedited delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-4">
              {hasActiveSubscription ? '$19.99' : '$49.99'}
            </div>
            <div className={`px-4 py-2 rounded-md text-center ${
              priority === 'rush' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {priority === 'rush' ? 'Selected' : 'Select Rush'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Eligibility Check */}
      {!canSubmit && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need an active subscription or resume credits to request a critique.
            <Button asChild className="ml-2" size="sm">
              <a href="/seeker/subscription">Upgrade Now</a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Request Form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Your Resume</CardTitle>
          <CardDescription>
            Upload your resume and provide details about your target role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <Label htmlFor="resume">Resume File *</Label>
              <div className="mt-2">
                {resumeFile ? (
                  // Show file info and change option when file is selected
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-700">{resumeFile.name}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        type="button"
                        onClick={() => {
                          setResumeFile(null);
                          // Clear the file input
                          const fileInput = document.getElementById('resume') as HTMLInputElement;
                          if (fileInput) {
                            fileInput.value = '';
                          }
                        }}
                      >
                        Remove
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        type="button"
                        onClick={() => {
                          // Trigger the file input click event
                          const fileInput = document.getElementById('resume') as HTMLInputElement;
                          if (fileInput) {
                            fileInput.click();
                          }
                        }}
                      >
                        Change File
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Show upload area when no file is selected
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="resume"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF or Word documents (MAX. 5MB)</p>
                      </div>
                    </label>
                  </div>
                )}
                {/* Hidden file input */}
                <input
                  id="resume"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  required
                />
              </div>
            </div>

            {/* Target Role */}
            <div>
              <Label htmlFor="targetRole">Target Role (Optional)</Label>
              <Input
                id="targetRole"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g., Frontend Developer, Marketing Manager"
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Help us provide more targeted feedback
              </p>
            </div>

            {/* Target Industry */}
            <div>
              <Label htmlFor="targetIndustry">Target Industry (Optional)</Label>
              <Select value={targetIndustry} onValueChange={setTargetIndustry}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                { (hasActiveSubscription && priority === 'standard') ? <span className="text-green-600 font-medium">✓ Included in your subscription</span>
                : (!hasActiveSubscription ? (<span>Cost: ${cost} • Credits available: {currentCredits}</span>) : '')}
              </div>
              <Button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? 'Submitting...' : `Submit Request`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Payment Method Selector Modal */}
      <ResumeCritiquePaymentModal
        isOpen={showPaymentForm}
        onClose={() => setShowPaymentForm(false)}
        onConfirm={(paymentMethodId) => {
          setSelectedPaymentMethod(paymentMethodId)
          processCritiqueRequest(paymentMethodId)
        }}
        onAddPaymentMethod={() => {
          // Show inline payment method form instead of redirecting
          setShowPaymentForm(false)
          setShowAddPaymentMethodForm(true)
        }}
        amount={cost}
        description={`${priority === 'rush' ? 'Rush' : 'Standard'} Resume Critique`}
        isLoading={isSubmitting}
      />
      <PaymentMethodForm
        isOpen={showAddPaymentMethodForm}
        onClose={() => {
          setShowAddPaymentMethodForm(false)
          // Return to payment selection modal
          setShowPaymentForm(true)
        }}
        onSuccess={() => {
          setShowAddPaymentMethodForm(false)
          // Reload payment methods and show payment selection modal
          setShowPaymentForm(true)
        }}
        onError={(message) => {
          setError(message)
          setShowAddPaymentMethodForm(false)
          setShowPaymentForm(true)
        }}
        userType="seeker"
        mode="add"
      />
    </div>
  )
}
