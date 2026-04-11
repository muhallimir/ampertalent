'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useClerk } from '@clerk/nextjs'

function EmailVerificationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { signOut } = useClerk()
  const { user } = useUser()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    const handleAutoVerification = async () => {
      try {
        const code = searchParams?.get('code')
        const afterAuthReturnTo = searchParams?.get('after_auth_return_to')

        if (!code) {
          setStatus('error')
          setMessage('No verification code found in URL')
          return
        }

        console.log('🔍 EMAIL-VERIFICATION: Starting automatic verification', {
          code: code.substring(0, 10) + '...',
          afterAuthReturnTo
        })

        // With Clerk, email verification is handled automatically
        // This page is reached after the user clicks the verification link
        // We just need to reload the user and check verification status

        if (!user?.id) {
          setStatus('error')
          setMessage('Please sign in to verify your email.')
          return
        }

        // Reload user to get latest verification status
        await user.reload()

        if (user.primaryEmailAddress?.verification.status === 'verified') {
          setStatus('success')
          setMessage('Email verified successfully! Redirecting...')

          // Redirect after showing success message
          setTimeout(() => {
            const redirectUrl = afterAuthReturnTo ? decodeURIComponent(afterAuthReturnTo) : '/onboarding'
            console.log('🔄 EMAIL-VERIFICATION: Redirecting to:', redirectUrl)
            router.push(redirectUrl)
          }, 1500)
        } else {
          setStatus('error')
          setMessage('Email verification failed. Please try again.')
        }

      } catch (error) {
        console.error('❌ EMAIL-VERIFICATION: Error during verification:', error)
        setStatus('error')
        setMessage('An error occurred during email verification')
      }
    }

    handleAutoVerification()
  }, [searchParams, router, user])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>

          <div className="mt-8 space-y-4">
            {status === 'verifying' && (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">{message}</span>
              </div>
            )}

            {status === 'success' && (
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{message}</span>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 text-red-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>{message}</span>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => {
                      const afterAuthReturnTo = searchParams?.get('after_auth_return_to')
                      const redirectUrl = afterAuthReturnTo ? decodeURIComponent(afterAuthReturnTo) : '/onboarding'
                      router.push(redirectUrl)
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Continue to Onboarding
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmailVerificationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmailVerificationContent />
    </Suspense>
  )
}