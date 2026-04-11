'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import Image from 'next/image'
import { Mail, CheckCircle, RefreshCw, ArrowLeft, Clock } from 'lucide-react'

export default function VerifyEmailPage() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [verificationDetected, setVerificationDetected] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!user?.id) {
      router.push('/sign-in')
      return
    }

    // If email is already verified, redirect to onboarding
    // Clerk checks verification status on the primary email address
    if (user.primaryEmailAddress?.verification.status === 'verified') {
      router.push('/onboarding')
      return
    }

    // Start automatic polling for verification status
    startPolling()

    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [user, router])

  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    setIsPolling(true)
    
    // Poll every 3 seconds to check verification status
    pollingIntervalRef.current = setInterval(() => {
      try {
        // Check if user verification status has changed
        // The useUser hook will automatically update when Clerk detects changes
        if (user?.primaryEmailAddress?.verification.status === 'verified') {
          console.log('✅ EMAIL-VERIFY: Email verified detected via polling!')
          setVerificationDetected(true)
          setIsPolling(false)
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
          }
          
          // Show success message briefly before redirecting
          setTimeout(() => {
            router.push('/onboarding')
          }, 2000)
        }
      } catch (error) {
        console.error('❌ EMAIL-VERIFY: Error during polling:', error)
      }
    }, 3000)
  }

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setIsPolling(false)
  }

  const handleResendVerification = async () => {
    if (!user?.id) return
    
    setIsResending(true)
    try {
      // Clerk method to resend verification email
      await user.primaryEmailAddress?.prepareVerification({ strategy: 'email_code' })
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (error) {
      console.error('Error resending verification email:', error)
      alert('Failed to resend verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const handleCheckVerification = async () => {
    if (!user?.id) return
    
    setIsChecking(true)
    try {
      console.log('🔍 EMAIL-VERIFY: Manual verification check...')
      console.log('🔍 EMAIL-VERIFY: Current verification status:', user.primaryEmailAddress?.verification.status)
      
      // Reload user data from Clerk
      await user.reload()
      
      // Wait a moment to allow for any pending verification to process
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check current verification status
      if (user.primaryEmailAddress?.verification.status === 'verified') {
        console.log('✅ EMAIL-VERIFY: Email verified! Redirecting to onboarding...')
        setVerificationDetected(true)
        stopPolling()
        
        // Show success message briefly before redirecting
        setTimeout(() => {
          router.push('/onboarding')
        }, 2000)
        return
      }
      
      // If not verified, show helpful message and suggest refreshing the page
      console.log('🔄 EMAIL-VERIFY: Email not yet verified')
      const shouldRefresh = confirm('Email not yet verified. Would you like to refresh the page to check for updates?')
      if (shouldRefresh) {
        window.location.reload()
      }
      
    } catch (error) {
      console.error('❌ EMAIL-VERIFY: Error checking verification status:', error)
      alert('Error checking verification status. Please try again.')
    } finally {
      setIsChecking(false)
    }
  }

  if (!user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="verify-email-page min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full">
              <Mail className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              We sent a verification link to your email address
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Verification email sent to:</strong>
              </p>
              <p className="text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded border">
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
            
            <div className="text-sm text-gray-600 space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p>Check your inbox for an email from AmperTalent</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p>Click the verification link in the email</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p>Return here and click "I've Verified My Email"</p>
              </div>
            </div>

            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-medium">
                  ✅ Verification email sent successfully!
                </p>
              </div>
            )}

            {verificationDetected && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <p className="text-sm text-green-700 font-medium">
                    ✅ Email verified successfully! Redirecting you to continue...
                  </p>
                </div>
              </div>
            )}

            {isPolling && !verificationDetected && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-blue-500 mr-2" />
                  <p className="text-sm text-blue-700">
                    Automatically checking for verification... You can also verify in another tab and we'll detect it here.
                  </p>
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
              <p><strong>Don't see the email?</strong></p>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Check your spam/junk folder</li>
                <li>Make sure {user.primaryEmailAddress?.emailAddress} is correct</li>
                <li>Try resending the verification email</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={handleCheckVerification}
                disabled={isChecking}
                className="w-full auth-verify-button"
              >
                {isChecking ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Checking...
                  </>
                ) : (
                  "I've Verified My Email"
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2 text-gray-700" />
                    <span className="text-gray-700">Sending...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 text-gray-700" />
                    <span className="text-gray-700">Resend Verification Email</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}