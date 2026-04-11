'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

function ProcessingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pendingId = searchParams.get('pending_id')
  const sessionToken = searchParams.get('token')
  const email = searchParams.get('email')
  const type = searchParams.get('type')
  const [status, setStatus] = useState<'processing' | 'completed' | 'error'>('processing')
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    // Support both session-based and email-based processing
    const hasSessionParams = pendingId && sessionToken
    const hasEmailParams = email && type === 'payment_processing'

    if (!hasSessionParams && !hasEmailParams) {
      router.push('/sign-in?error=invalid_session')
      return
    }

    const checkStatus = async () => {
      try {
        let url = '/api/auth/check-processing?'
        if (hasEmailParams) {
          url += `email=${encodeURIComponent(email!)}&type=${type}`
        } else {
          url += `pending_id=${pendingId}&token=${sessionToken}`
        }

        const response = await fetch(url)
        const data = await response.json()

        if (data.completed) {
          setStatus('completed')
          setTimeout(() => {
            // Redirect based on user type
            const dashboardUrl = data.userType === 'employer'
              ? '/employer/dashboard?welcome=true&payment_success=true'
              : '/seeker/dashboard?welcome=true&payment_success=true'
            router.push(dashboardUrl)
          }, 2000)
        } else if (attempts >= 30) { // 5 minutes max (30 * 10 seconds)
          setStatus('error')
        } else {
          setAttempts(prev => prev + 1)
          setTimeout(checkStatus, 10000) // Check every 10 seconds
        }
      } catch (error) {
        console.error('Error checking status:', error)
        if (attempts >= 30) {
          setStatus('error')
        } else {
          setAttempts(prev => prev + 1)
          setTimeout(checkStatus, 10000)
        }
      }
    }

    checkStatus()
  }, [pendingId, sessionToken, email, type, router, attempts])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            {status === 'processing' && (
              <>
                <LoadingSpinner size="sm" />
                <span>Processing Your Payment</span>
              </>
            )}
            {status === 'completed' && (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Payment Confirmed!</span>
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <span>Taking Longer Than Expected</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'processing' && (
            <div>
              <p className="text-gray-600 mb-4">
                We're confirming your payment and setting up your account.
                This usually takes just a few moments.
              </p>
              <div className="text-sm text-gray-500">
                Please don't close this window...
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Attempt {attempts + 1} of 30
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div>
              <p className="text-green-600 mb-4">
                Your payment has been confirmed and your account is ready!
              </p>
              <p className="text-sm text-gray-500">
                Redirecting you to your dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <p className="text-gray-600 mb-4">
                Your payment is being processed but it's taking longer than usual.
                You can safely close this window - we'll email you once everything is ready.
              </p>
              <button
                onClick={() => router.push('/seeker/dashboard')}
                className="bg-brand-teal text-white px-4 py-2 rounded-md hover:bg-brand-teal/90 transition-colors"
              >
                Continue to Dashboard
              </button>
              <p className="text-xs text-gray-500 mt-2">
                If you continue to have issues, please contact support.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProcessingContent />
    </Suspense>
  )
}