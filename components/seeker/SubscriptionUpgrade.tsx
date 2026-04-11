'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PackageSelectionCard } from '@/components/onboarding/PackageSelectionCard'
import { SEEKER_SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { postWithImpersonation } from '@/lib/api-client'

interface SubscriptionUpgradeProps {
  currentPlan?: string
  membershipExpiresAt?: string | null
  isOnTrial?: boolean
  onUpgradeComplete?: () => void
}

export function SubscriptionUpgrade({ 
  currentPlan = 'none', 
  membershipExpiresAt,
  isOnTrial = false,
  onUpgradeComplete 
}: SubscriptionUpgradeProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCurrentPlanDetails = () => {
    return SEEKER_SUBSCRIPTION_PLANS.find(plan => plan.id === currentPlan)
  }

  const getUpgradeType = (newPlanId: string) => {
    if (currentPlan === 'none') return 'new'
    
    const currentPlanDetails = getCurrentPlanDetails()
    const newPlanDetails = SEEKER_SUBSCRIPTION_PLANS.find(plan => plan.id === newPlanId)
    
    if (!currentPlanDetails || !newPlanDetails) return 'new'
    
    return newPlanDetails.price > currentPlanDetails.price ? 'upgrade' : 'downgrade'
  }

  const handleCheckout = async () => {
    if (!selectedPackage) return

    setIsProcessing(true)
    setError(null)

    try {
      const upgradeType = getUpgradeType(selectedPackage)
      
      const response = await postWithImpersonation('/api/seeker/subscription/checkout', {
        selectedPackage,
        upgradeType
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { checkoutUrl } = await response.json()
      
      // Redirect to GoHighLevel checkout
      window.location.href = checkoutUrl

    } catch (error) {
      console.error('Checkout error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const isCurrentPlan = (planId: string) => planId === currentPlan
  const isDowngrade = (planId: string) => {
    const currentPlanDetails = getCurrentPlanDetails()
    const planDetails = SEEKER_SUBSCRIPTION_PLANS.find(plan => plan.id === planId)
    
    if (!currentPlanDetails || !planDetails) return false
    return planDetails.price < currentPlanDetails.price
  }

  const currentPlanDetails = getCurrentPlanDetails()

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      {currentPlan !== 'none' && (
        <Card className="border-l-4 border-l-brand-teal">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Current Plan</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{currentPlanDetails?.name}</h3>
                <p className="text-gray-600">${currentPlanDetails?.price} per {currentPlanDetails?.billing}</p>
                {isOnTrial && (
                  <Badge variant="secondary" className="mt-2">
                    Free Trial Active
                  </Badge>
                )}
              </div>
              <div className="text-right">
                {membershipExpiresAt && (
                  <p className="text-sm text-gray-500">
                    {isOnTrial ? 'Trial ends' : 'Renews'}: {new Date(membershipExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Selection */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {currentPlan === 'none' ? 'Choose Your Plan' : 'Upgrade Your Plan'}
        </h2>
        <p className="text-gray-600 mb-6">
          {currentPlan === 'none' 
            ? 'Select a membership plan to access premium features and job opportunities.'
            : 'Upgrade to access more features and increase your job search success.'
          }
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SEEKER_SUBSCRIPTION_PLANS.map((plan) => (
            <div key={plan.id} className="relative">
              <PackageSelectionCard
                plan={plan}
                selected={selectedPackage === plan.id}
                onSelect={() => setSelectedPackage(plan.id)}
              />
              
              {/* Plan Status Badges */}
              <div className="absolute top-2 right-2 space-y-1">
                {isCurrentPlan(plan.id) && (
                  <Badge className="bg-green-500 text-white">
                    Current
                  </Badge>
                )}
                {isDowngrade(plan.id) && !isCurrentPlan(plan.id) && (
                  <Badge variant="outline" className="border-orange-500 text-orange-600">
                    Downgrade
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      {selectedPackage && !isCurrentPlan(selectedPackage) && (
        <div className="flex justify-center">
          <Button
            onClick={handleCheckout}
            disabled={isProcessing}
            size="lg"
            className="bg-brand-teal hover:bg-brand-teal/90 text-white px-8 py-3"
          >
            {isProcessing ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Processing...
              </>
            ) : (
              <>
                {getUpgradeType(selectedPackage) === 'upgrade' ? 'Upgrade Plan' : 
                 getUpgradeType(selectedPackage) === 'downgrade' ? 'Change Plan' : 
                 'Subscribe Now'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Plan Comparison Note */}
      {selectedPackage && !isCurrentPlan(selectedPackage) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-800">
              <strong>Note:</strong> {
                getUpgradeType(selectedPackage) === 'upgrade' 
                  ? 'You will be charged the difference and your billing cycle will be adjusted.'
                  : getUpgradeType(selectedPackage) === 'downgrade'
                  ? 'Your plan will change at the end of your current billing period.'
                  : 'You will be charged immediately and gain access to all plan features.'
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}