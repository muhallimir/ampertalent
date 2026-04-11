'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Coins,
  ArrowRight
} from 'lucide-react'

interface CreditInfo {
  total: number
  hasCredits: boolean
  packages: Array<{
    id: string
    type: string
    creditsRemaining: number
    expiresAt: string | null
    isExpiringSoon: boolean
  }>
}

interface CreditConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  onPurchaseMore: () => void
  jobTitle: string
  creditInfo: CreditInfo | null
  isLoading?: boolean
}

export function CreditConfirmation({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onPurchaseMore,
  jobTitle, 
  creditInfo,
  isLoading = false
}: CreditConfirmationProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
    } catch (error) {
      console.error('Error confirming credit usage:', error)
    } finally {
      setIsConfirming(false)
    }
  }

  const formatPackageType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'starter': 'Starter Package',
      'professional': 'Professional Package', 
      'enterprise': 'Enterprise Package',
      'unlimited': 'Unlimited Package'
    }
    return typeMap[type] || type
  }

  const jobCost = 1 // Each job costs 1 credit
  const remainingAfter = (creditInfo?.total || 0) - jobCost
  const hasInsufficientCredits = !creditInfo?.hasCredits || creditInfo.total < jobCost

  if (!creditInfo && !isLoading) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Coins className="h-5 w-5 text-brand-teal" />
            <span>Confirm Job Posting</span>
          </DialogTitle>
          <DialogDescription>
            Review your credit usage before posting this job
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Job Details */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Job Details</h4>
                  <p className="text-sm text-gray-600 break-words">{jobTitle}</p>
                </div>
              </CardContent>
            </Card>

            {/* Credit Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Credit Summary</h4>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Credits</span>
                    <span className="font-medium">{creditInfo?.total || 0}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Job Posting Cost</span>
                    <span className="font-medium">-{jobCost}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Remaining Credits</span>
                    <span className={`font-semibold ${remainingAfter >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {remainingAfter}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Package Details */}
            {creditInfo?.packages && creditInfo.packages.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Active Packages</h4>
                  <div className="space-y-2">
                    {creditInfo.packages.map((pkg) => (
                      <div key={pkg.id} className="flex justify-between items-center text-sm">
                        <div>
                          <span className="text-gray-600">{formatPackageType(pkg.type)}</span>
                          {pkg.isExpiringSoon && (
                            <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                              Expiring Soon
                            </span>
                          )}
                        </div>
                        <span className="font-medium">{pkg.creditsRemaining} credits</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warning for insufficient credits */}
            {hasInsufficientCredits && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">Insufficient Credits</h4>
                    <p className="text-sm text-red-700 mt-1">
                      You need {jobCost} credit{jobCost > 1 ? 's' : ''} to post this job, but you only have {creditInfo?.total || 0}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success indicator for sufficient credits */}
            {!hasInsufficientCredits && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">Ready to Post</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Your job will be posted and {jobCost} credit will be deducted from your account.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              {hasInsufficientCredits ? (
                <>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={onPurchaseMore}
                    className="flex-1 bg-brand-teal hover:bg-brand-teal/90 text-white"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Purchase Credits
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isConfirming}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    className="flex-1 bg-brand-teal hover:bg-brand-teal/90 text-white"
                  >
                    {isConfirming ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Confirm & Post
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}