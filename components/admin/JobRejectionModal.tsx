'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import {
  AlertTriangle,
  CreditCard,
  MessageSquare,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface JobRejectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (feedback: string, reasons: string[]) => Promise<void>
  jobTitle: string
  companyName: string
  employerEmail: string
}

const REJECTION_REASONS = [
  'Salary below minimum threshold',
  'Job description lacks detail or clarity',
  'Requirements too restrictive or unrealistic',
  'Not genuinely remote-friendly',
  'Potential scam or fraudulent indicators',
  'Discriminatory language or requirements',
  'Unrealistic expectations for the role',
  'Missing essential information',
  'Company information appears incomplete',
  'Job posting violates platform guidelines',
  'Duplicate posting detected',
  'Position appears to be MLM or commission-only'
]

export function JobRejectionModal({
  isOpen,
  onClose,
  onConfirm,
  jobTitle,
  companyName,
  employerEmail
}: JobRejectionModalProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [customFeedback, setCustomFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addToast } = useToast()

  const handleReasonToggle = (reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason)
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    )
  }

  const handleSubmit = async () => {
    if (selectedReasons.length === 0 && !customFeedback.trim()) {
      addToast({
        title: "Feedback Required",
        description: "Please select at least one reason or provide custom feedback.",
        variant: "destructive"
      })
      return
    }

    if (!customFeedback.trim()) {
      addToast({
        title: "Custom Feedback Required",
        description: "Please provide specific feedback to help the employer improve their job posting.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      const allFeedback = [
        ...selectedReasons,
        customFeedback.trim()
      ].filter(Boolean).join('\n\n')

      await onConfirm(allFeedback, selectedReasons)

      // Reset form
      setSelectedReasons([])
      setCustomFeedback('')
      onClose()

      addToast({
        title: "Job Declined Successfully",
        description: "The employer has been notified and their credit has been refunded.",
        variant: "success"
      })
    } catch (error) {
      console.error('Error declining job:', error)
      addToast({
        title: "Error",
        description: "Failed to decline job. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setSelectedReasons([])
    setCustomFeedback('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span>Decline Job Posting</span>
          </DialogTitle>
          <DialogDescription>
            Provide feedback to help the employer improve their job posting. Their credit will be automatically refunded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Job Details</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Title:</strong> {jobTitle}</p>
              <p><strong>Company:</strong> {companyName}</p>
              <p><strong>Employer:</strong> {employerEmail}</p>
            </div>
          </div>

          {/* Credit Refund Notice */}
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-800">Automatic Credit Refund</h4>
            </div>
            <p className="text-sm text-green-700">
              When you decline this job posting, 1 job posting credit will be automatically refunded to the employer's account.
              They can use this credit to resubmit an improved version of their job posting.
            </p>
          </div>

          {/* Rejection Reasons */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Select Applicable Issues (Optional)
            </Label>
            <div className="grid md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {REJECTION_REASONS.map((reason) => (
                <div key={reason} className="flex items-start space-x-2">
                  <Checkbox
                    id={reason}
                    checked={selectedReasons.includes(reason)}
                    onCheckedChange={() => handleReasonToggle(reason)}
                  />
                  <Label
                    htmlFor={reason}
                    className="text-sm leading-5 cursor-pointer"
                  >
                    {reason}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Feedback */}
          <div>
            <Label htmlFor="customFeedback" className="text-base font-semibold mb-2 block">
              Specific Feedback (Required) <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="customFeedback"
              value={customFeedback}
              onChange={(e) => setCustomFeedback(e.target.value)}
              placeholder="Provide specific, constructive feedback to help the employer improve their job posting. This will be included in the declination email..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This feedback will be sent directly to the employer to help them understand what needs to be improved.
            </p>
          </div>

          {/* Preview */}
          {(selectedReasons.length > 0 || customFeedback.trim()) && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-800">Feedback Preview</h4>
              </div>
              <div className="text-sm text-blue-700 space-y-2">
                {selectedReasons.length > 0 && (
                  <div>
                    <p className="font-medium">Issues identified:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      {selectedReasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {customFeedback.trim() && (
                  <div>
                    <p className="font-medium">Additional feedback:</p>
                    <p className="ml-2 italic">"{customFeedback.trim()}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> This action cannot be undone. The employer will be notified immediately
                and their credit will be refunded. Make sure your feedback is constructive and helpful.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (!customFeedback.trim())}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Declining...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Decline Job & Refund Credit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}