'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useClerk } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import {
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Mail,
  RefreshCw
} from 'lucide-react'

function MagicLinkCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams?.get('code')
  const next = searchParams?.get('next') || '/'
  const { user } = useUser()
  const { signOut } = useClerk()

  const [status, setStatus] = useState<'loading' | 'verifying' | 'checkingAdmin' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Processing your magic link...')
  const [showRedirect, setShowRedirect] = useState(false)

  useEffect(() => {
    const verifyMagicLink = async () => {
      if (!code) {
        setStatus('error')
        setMessage('Invalid magic link - no code provided')
        return
      }

      try {
        // Small delay to show the "Processing" state
        await new Promise(resolve => setTimeout(resolve, 800))

        setStatus('verifying')
        setMessage('Verifying your credentials...')

        // With Clerk, magic link authentication is handled automatically
        // The user should already be authenticated when they reach this page
        // We just need to verify they're signed in and check their admin status

        if (!user?.id) {
          console.error('No user found after magic link click')
          setStatus('error')
          setMessage('Authentication failed - user not found. Please try signing in again.')
          return
        }

        // Reload user to ensure we have the latest data
        await user.reload()

        // Check if user is admin by calling the API endpoint
        setStatus('checkingAdmin')
        setMessage('Checking admin status and setting up profile...')

        try {
          // Call API to check if user's email exists in adminActionLog and create profile if needed
          const response = await fetch('/api/magic-link-callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.primaryEmailAddress?.emailAddress,
              clerkUserId: user.id
            })
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Failed to check admin status')
          }

          const isAdmin = data.isAdmin

          // Add logging for admin check
          console.log('🔍 Checking admin status for user:', {
            email: user.primaryEmailAddress?.emailAddress,
            clerkUserId: user.id,
            isAdmin: isAdmin
          })

          setStatus('success')
          setMessage('Authentication successful! Redirecting you now...')
          setShowRedirect(true)

          console.log('✅ Magic link authentication successful for user:', {
            email: user.primaryEmailAddress?.emailAddress,
            clerkUserId: user.id,
            isAdmin: isAdmin
          })

          // Redirect based on admin status
          setTimeout(() => {
            if (isAdmin) {
              console.log('🚀 Redirecting admin user to dashboard')
              router.push('/admin/dashboard')
            } else {
              console.log('👤 Redirecting regular user to onboarding')
              const redirectUrl = next && next.startsWith('/') ? next : '/onboarding'
              router.push(redirectUrl)
            }
          }, 2000)
        } catch (error) {
          console.error('Error checking admin status:', error)
          setStatus('error')
          setMessage('Failed to check admin status. Please try again.')
          return
        }

      } catch (error) {
        console.error('Unexpected error during magic link authentication:', error)
        setStatus('error')
        setMessage('Authentication failed due to unexpected error. Please try again.')
      }
    }

    verifyMagicLink()
  }, [code, next, router, user])

  const handleRetry = () => {
    router.push('/auth/login')
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <div className="flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-0">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            {status === 'loading' || status === 'verifying' || status === 'checkingAdmin' ? (
              <Mail className="w-8 h-8 text-blue-600" />
            ) : status === 'success' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : status === 'error' ? (
              <AlertCircle className="w-8 h-8 text-red-600" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <CardTitle>
            {status === 'loading' ? 'Processing Link' :
              status === 'verifying' ? 'Verifying' :
                status === 'checkingAdmin' ? 'Checking Admin Status' :
                  status === 'success' ? 'Success!' :
                    'Authentication Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' ? 'Preparing your authentication' :
              status === 'verifying' ? 'Checking your credentials' :
                status === 'checkingAdmin' ? 'Setting up your account' :
                  status === 'success' ? 'You are now signed in' :
                    'Please try again'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-4">
            {status === 'loading' && (
              <>
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-center text-gray-600">{message}</p>
              </>
            )}

            {status === 'verifying' && (
              <>
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-center text-gray-600">{message}</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                </div>
              </>
            )}

            {status === 'checkingAdmin' && (
              <>
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-center text-gray-600">{message}</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '90%' }}></div>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <Alert className="border-green-200 bg-green-50 mb-4">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle>Authentication Successful</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                {showRedirect && (
                  <div className="flex items-center text-sm text-gray-600">
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Redirecting to your dashboard...
                  </div>
                )}
              </>
            )}

            {status === 'error' && (
              <>
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <div className="flex flex-col gap-2 w-full">
                  <Button onClick={handleRetry} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button onClick={handleGoHome} variant="outline" className="w-full !text-[#111827]">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function MagicLinkCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MagicLinkCallbackContent />
    </Suspense>
  )
}