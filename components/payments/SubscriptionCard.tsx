'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import {
  Check,
  Star,
  Crown,
  Zap,
  Shield,
  Users,
  FileText,
  Calendar,
  CreditCard
} from 'lucide-react'

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: 'monthly' | 'yearly'
  description: string
  features: string[]
  popular?: boolean
  current?: boolean
  icon: React.ComponentType<{ className?: string }>
  color: string
}

interface SubscriptionCardProps {
  plan: SubscriptionPlan
  onSubscribe: (planId: string) => Promise<void>
  onCancel?: () => Promise<void>
  isLoading?: boolean
  disabled?: boolean
}

export function SubscriptionCard({ 
  plan, 
  onSubscribe, 
  onCancel, 
  isLoading = false, 
  disabled = false 
}: SubscriptionCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubscribe = async () => {
    setIsProcessing(true)
    try {
      await onSubscribe(plan.id)
    } catch (error) {
      console.error('Error subscribing:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = async () => {
    if (!onCancel) return
    
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return
    }
    
    setIsProcessing(true)
    try {
      await onCancel()
    } catch (error) {
      console.error('Error canceling subscription:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const Icon = plan.icon
  const isYearly = plan.interval === 'yearly'
  const monthlyPrice = isYearly ? plan.price / 12 : plan.price
  const savings = isYearly ? Math.round(((monthlyPrice * 12) - plan.price) / (monthlyPrice * 12) * 100) : 0

  return (
    <Card className={`relative transition-all duration-200 ${
      plan.popular 
        ? 'border-2 border-blue-500 shadow-lg scale-105' 
        : plan.current
        ? 'border-2 border-green-500'
        : 'border border-gray-200 hover:shadow-md'
    }`}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-500 text-white px-3 py-1">
            <Star className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}
      
      {plan.current && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-green-500 text-white px-3 py-1">
            <Check className="h-3 w-3 mr-1" />
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${plan.color}`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
        
        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
        <CardDescription className="text-gray-600 mb-4">
          {plan.description}
        </CardDescription>
        
        <div className="space-y-2">
          <div className="flex items-baseline justify-center space-x-1">
            <span className="text-4xl font-bold text-gray-900">
              ${isYearly ? Math.round(monthlyPrice) : plan.price}
            </span>
            <span className="text-gray-600">
              /{isYearly ? 'mo' : plan.interval === 'monthly' ? 'mo' : 'yr'}
            </span>
          </div>
          
          {isYearly && (
            <div className="space-y-1">
              <p className="text-sm text-gray-500">
                Billed ${plan.price} yearly
              </p>
              <Badge variant="outline" className="text-green-600 border-green-200">
                Save {savings}%
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Features List */}
        <div className="space-y-3">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3">
              <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="pt-4">
          {plan.current ? (
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full" 
                disabled
              >
                <Check className="h-4 w-4 mr-2" />
                Current Plan
              </Button>
              {onCancel && (
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 hover:text-red-700" 
                  onClick={handleCancel}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Canceling...
                    </>
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
              )}
            </div>
          ) : (
            <Button 
              className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              onClick={handleSubscribe}
              disabled={disabled || isLoading || isProcessing}
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {plan.price === 0 ? 'Get Started Free' : 'Subscribe Now'}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Additional Info */}
        {plan.price > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center">
                <Shield className="h-3 w-3 mr-1" />
                Secure Payment
              </span>
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Cancel Anytime
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Predefined subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'monthly',
    description: 'Perfect for getting started with job searching',
    icon: Users,
    color: 'bg-gray-500',
    features: [
      'Browse all job listings',
      'Apply to up to 5 jobs per month',
      'Basic profile creation',
      'Email job alerts',
      'Community forum access',
    ],
  },
  {
    id: 'basic_monthly',
    name: 'Basic',
    price: 19,
    interval: 'monthly',
    description: 'Essential features for active job seekers',
    icon: FileText,
    color: 'bg-blue-500',
    features: [
      'Everything in Free',
      'Unlimited job applications',
      'Priority application status',
      'Resume review service (1 per month)',
      'Advanced search filters',
      'Application tracking dashboard',
      'Direct messaging with employers',
    ],
  },
  {
    id: 'basic_yearly',
    name: 'Basic',
    price: 190,
    interval: 'yearly',
    description: 'Essential features for active job seekers',
    icon: FileText,
    color: 'bg-blue-500',
    popular: true,
    features: [
      'Everything in Free',
      'Unlimited job applications',
      'Priority application status',
      'Resume review service (1 per month)',
      'Advanced search filters',
      'Application tracking dashboard',
      'Direct messaging with employers',
    ],
  },
  {
    id: 'premium_monthly',
    name: 'Premium',
    price: 39,
    interval: 'monthly',
    description: 'Advanced features for serious job seekers',
    icon: Crown,
    color: 'bg-purple-500',
    features: [
      'Everything in Basic',
      'Featured profile in search results',
      'Resume review service (unlimited)',
      'Career coaching session (1 per month)',
      'Interview preparation resources',
      'Salary negotiation guidance',
      'LinkedIn profile optimization',
      'Job application templates',
      'Priority customer support',
    ],
  },
  {
    id: 'premium_yearly',
    name: 'Premium',
    price: 390,
    interval: 'yearly',
    description: 'Advanced features for serious job seekers',
    icon: Crown,
    color: 'bg-purple-500',
    features: [
      'Everything in Basic',
      'Featured profile in search results',
      'Resume review service (unlimited)',
      'Career coaching session (1 per month)',
      'Interview preparation resources',
      'Salary negotiation guidance',
      'LinkedIn profile optimization',
      'Job application templates',
      'Priority customer support',
    ],
  },
  {
    id: 'pro_monthly',
    name: 'Pro',
    price: 79,
    interval: 'monthly',
    description: 'Complete career acceleration package',
    icon: Zap,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    features: [
      'Everything in Premium',
      'Personal career coach assignment',
      'Weekly 1-on-1 coaching calls',
      'Custom job search strategy',
      'Network introduction service',
      'Exclusive job opportunities',
      'Resume writing service',
      'Interview coaching sessions',
      'Salary negotiation support',
      'Career transition guidance',
      'White-glove job search support',
    ],
  },
  {
    id: 'pro_yearly',
    name: 'Pro',
    price: 790,
    interval: 'yearly',
    description: 'Complete career acceleration package',
    icon: Zap,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    features: [
      'Everything in Premium',
      'Personal career coach assignment',
      'Weekly 1-on-1 coaching calls',
      'Custom job search strategy',
      'Network introduction service',
      'Exclusive job opportunities',
      'Resume writing service',
      'Interview coaching sessions',
      'Salary negotiation support',
      'Career transition guidance',
      'White-glove job search support',
    ],
  },
]