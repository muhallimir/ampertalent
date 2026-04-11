'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface BillingRequestFormProps {
  isOpen: boolean
  onClose: () => void
  requestType?: string
  prefilledData?: { title: string; description: string }
  onSuccess?: () => void
}

const REQUEST_TYPES = {
  PAYMENT_METHOD_CHANGE: 'Change Payment Method',
  PACKAGE_UPGRADE: 'Package Upgrade',
  PACKAGE_DOWNGRADE: 'Package Downgrade', 
  ADDITIONAL_CREDITS: 'Additional Credits',
  CANCELLATION: 'Cancellation',
  BILLING_SUPPORT: 'Billing Support'
}

export function BillingRequestForm({
  isOpen,
  onClose,
  requestType,
  prefilledData,
  onSuccess
}: BillingRequestFormProps) {
  const [formData, setFormData] = useState({
    type: requestType || '',
    title: prefilledData?.title || '',
    description: prefilledData?.description || '',
    requestData: {}
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.type || !formData.title || !formData.description) {
      addToast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/billing-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit billing request')
      }

      addToast({
        title: 'Success',
        description: 'Your billing request has been submitted successfully. We\'ll process it within 1-2 business days.',
        variant: 'default'
      })

      // Reset form
      setFormData({
        type: requestType || '',
        title: prefilledData?.title || '',
        description: prefilledData?.description || '',
        requestData: {}
      })

      onSuccess?.()
      onClose()

    } catch (error) {
      console.error('Error submitting billing request:', error)
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit billing request',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDefaultTitle = (type: string) => {
    switch (type) {
      case 'PAYMENT_METHOD_CHANGE':
        return 'Update Payment Method'
      case 'PACKAGE_UPGRADE':
        return 'Upgrade Package Request'
      case 'PACKAGE_DOWNGRADE':
        return 'Downgrade Package Request'
      case 'ADDITIONAL_CREDITS':
        return 'Purchase Additional Credits'
      case 'CANCELLATION':
        return 'Cancel Subscription'
      case 'BILLING_SUPPORT':
        return 'Billing Support Request'
      default:
        return ''
    }
  }

  const handleTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      type,
      title: prefilledData?.title || getDefaultTitle(type),
      description: prefilledData?.description || prev.description
    }))
  }

  // Update form data when prefilledData changes
  useEffect(() => {
    if (prefilledData) {
      setFormData(prev => ({
        ...prev,
        title: prefilledData.title,
        description: prefilledData.description
      }))
    }
  }, [prefilledData])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Billing Request</DialogTitle>
          <DialogDescription>
            Submit a request for billing changes or support. Our team will process your request within 1-2 business days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Request Type *</Label>
            <Select
              value={formData.type}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REQUEST_TYPES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief title for your request"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Please provide detailed information about your request..."
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}