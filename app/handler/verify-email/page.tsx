'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { CheckCircle, ArrowRight } from 'lucide-react'

export default function VerifyEmailHandler() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is verified
    if (user?.id) {
      if (user.primaryEmailAddress?.verification.status === 'verified') {
        setIsVerified(true)
      }
      setIsLoading(false)
    }
  }, [user])

  const handleContinue = () => {
    // Redirect to onboarding or dashboard based on user state
    router.push('/onboarding')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {isVerified ? 'Email Verified!' : 'Verification Complete'}
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              {isVerified
                ? 'Your email has been successfully verified.'
                : 'Thank you for verifying your email address.'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              You can now continue with your account setup.
            </p>
            
            <Button
              onClick={handleContinue}
              className="w-full auth-continue-button"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}