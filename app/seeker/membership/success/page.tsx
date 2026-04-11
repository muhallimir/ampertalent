'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  CheckCircle,
  Star,
  Gift,
  ArrowRight,
  Mail,
  Calendar
} from 'lucide-react'

interface PlanDetails {
  id: string
  name: string
  price: number
  billing: string
  duration: string
  features: string[]
}

const planDetails: Record<string, PlanDetails> = {
  'trial': {
    id: 'trial',
    name: '3 Day Free Trial Subscription',
    price: 34.99,
    billing: 'month',
    duration: '33 days',
    features: [
      'Apply for unlimited jobs',
      '3-day free trial',
      'Email support Monday-Friday'
    ]
  },
  'gold': {
    id: 'gold',
    name: 'Gold Mom Professional',
    price: 49.99,
    billing: '2 months',
    duration: '60 days',
    features: [
      'Apply for unlimited jobs',
      'Up to 3 versions of your resume',
      'Email & text support Monday-Friday'
    ]
  },
  'vip-platinum': {
    id: 'vip-platinum',
    name: 'VIP Platinum Mom Professional',
    price: 79.99,
    billing: '3 months',
    duration: '90 days',
    features: [
      'Apply for unlimited jobs',
      'Unlimited resumes',
      'Free HireMyMom T-shirt',
      'Email, text & phone support Monday-Friday'
    ]
  },
  'annual-platinum': {
    id: 'annual-platinum',
    name: 'Annual Platinum Mom Professional',
    price: 299.00,
    billing: 'year',
    duration: '365 days',
    features: [
      'Apply for unlimited jobs',
      'Unlimited resumes',
      'Free HireMyMom T-shirt',
      'Email, text & phone support Monday-Friday',
      'Best value - Save $120/year!'
    ]
  }
}

export default function MembershipSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [plan, setPlan] = useState<PlanDetails | null>(null)
  const [isMock, setIsMock] = useState(false)

  useEffect(() => {
    const planId = searchParams.get('plan')
    const mockParam = searchParams.get('mock')
    
    if (planId && planDetails[planId]) {
      setPlan(planDetails[planId])
    }
    
    if (mockParam === 'true') {
      setIsMock(true)
    }

    // TODO: In a real implementation, verify the payment with the backend
    // and update the user's membership status in the database
  }, [searchParams])

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Session</h1>
          <Button onClick={() => router.push('/seeker/membership')}>
            Return to Membership Plans
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to HireMyMom!
          </h1>
          <p className="text-xl text-gray-600">
            Your {plan.name} membership is now active
          </p>
          {isMock && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg inline-block">
              <p className="text-sm text-yellow-800">
                <strong>Demo Mode:</strong> This was a test transaction. No payment was processed.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Membership Details */}
          <Card className="border-green-200 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-800">
                <Star className="h-5 w-5" />
                <span>Your Membership</span>
              </CardTitle>
              <CardDescription>
                Here's what you now have access to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-600">
                  Active for {plan.duration}
                </p>
                <p className="text-lg font-bold text-green-600">
                  ${plan.price} / {plan.billing}
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Your Benefits:</h4>
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {(plan.id === 'vip-platinum' || plan.id === 'annual-platinum') && (
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Gift className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">
                        Free T-Shirt Coming Your Way!
                      </p>
                      <p className="text-xs text-purple-700">
                        We'll send your "Get The Job Done! Hire A Mom" t-shirt to your address within 2-3 weeks.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="border-blue-200 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <ArrowRight className="h-5 w-5" />
                <span>What's Next?</span>
              </CardTitle>
              <CardDescription>
                Get the most out of your membership
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-brand-teal rounded-full flex items-center justify-center text-white text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Complete Your Profile</h4>
                    <p className="text-sm text-gray-600">Add your skills, experience, and upload your resume</p>
                    <Button asChild size="sm" className="mt-2">
                      <Link href="/seeker/profile">Complete Profile</Link>
                    </Button>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-brand-coral rounded-full flex items-center justify-center text-white text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Browse & Apply to Jobs</h4>
                    <p className="text-sm text-gray-600">Start applying to unlimited remote job opportunities</p>
                    <Button asChild size="sm" className="mt-2 bg-brand-coral hover:bg-brand-coral/90">
                      <Link href="/seeker/jobs">Browse Jobs</Link>
                    </Button>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Track Your Applications</h4>
                    <p className="text-sm text-gray-600">Monitor your job applications and responses</p>
                    <Button asChild size="sm" variant="outline" className="mt-2">
                      <Link href="/seeker/dashboard">View Dashboard</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Important Information */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-blue-500 mt-1" />
                <div>
                  <h4 className="font-medium text-blue-900">Confirmation Email</h4>
                  <p className="text-sm text-blue-700">
                    You'll receive a confirmation email with your membership details and receipt.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-blue-500 mt-1" />
                <div>
                  <h4 className="font-medium text-blue-900">Membership Duration</h4>
                  <p className="text-sm text-blue-700">
                    Your membership is active for {plan.duration} starting today.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center mt-8">
          <Button asChild size="lg" className="bg-brand-teal hover:bg-brand-teal/90">
            <Link href="/seeker/dashboard">
              Go to Your Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}