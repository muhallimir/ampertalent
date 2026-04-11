'use client'

import { SignUp, useUser } from '@clerk/nextjs';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import UserInviteSignupForm from '@/components/UserInviteSignUpForm';
import { processMarketingSkuFromUrl, getSignedInRedirectUrl } from '@/lib/marketing-preselect';

function SignUpContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isSignedIn, isLoaded } = useUser()
  const [invitationToken, setInvitationToken] = useState<any>(null)
  const [skuProcessed, setSkuProcessed] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // Handle already signed-in users with SKU parameter
  useEffect(() => {
    if (!isLoaded || !isSignedIn || redirecting) return

    const urlParams = searchParams || new URLSearchParams(window.location.search)
    const sku = urlParams.get('sku')

    if (sku) {
      console.log('📦 SIGN-UP: User already signed in with SKU:', sku)
      setRedirecting(true)

      // Process the SKU to get preselect data
      const preselect = processMarketingSkuFromUrl(urlParams)

      if (preselect) {
        // Use centralized redirect URL logic (handles services, subscriptions, packages)
        const redirectUrl = getSignedInRedirectUrl(preselect)
        console.log('📦 SIGN-UP: Redirecting signed-in user to:', redirectUrl)
        router.push(redirectUrl)
      } else {
        // Invalid SKU, just go to home (middleware will handle routing)
        router.push('/')
      }
      return
    }

    // No SKU, user is signed in - redirect to home (middleware handles routing)
    console.log('📦 SIGN-UP: User already signed in, redirecting to home')
    router.push('/')
  }, [isLoaded, isSignedIn, searchParams, router, redirecting])

  // Process SKU for new users (not signed in yet)
  useEffect(() => {
    if (typeof window === 'undefined' || skuProcessed || isSignedIn) return

    // Use window.location.search as fallback if searchParams not ready
    const urlParams = searchParams || new URLSearchParams(window.location.search)

    // Get invitation token
    const token = urlParams.get('token')
    if (token) {
      setInvitationToken(token)
    }

    // Process marketing SKU from URL (e.g., ?sku=2215562)
    // This saves the preselection to a cookie for use during onboarding
    const sku = urlParams.get('sku')
    if (sku) {
      console.log('📦 SIGN-UP: Processing SKU from URL:', sku)
      const preselect = processMarketingSkuFromUrl(urlParams)
      if (preselect) {
        console.log('📦 SIGN-UP: Marketing preselection saved:', preselect)
      } else {
        console.warn('📦 SIGN-UP: Invalid SKU, no preselection saved')
      }
    } else {
      // No SKU in URL - clear any leftover post-onboarding service redirect
      // This prevents a previous user's service SKU from affecting a new signup
      console.log('📦 SIGN-UP: No SKU in URL, clearing leftover hmm_post_onboarding_service')
      localStorage.removeItem('hmm_post_onboarding_service')
    }

    setSkuProcessed(true)
  }, [searchParams, skuProcessed, isSignedIn])

  // Show loading while checking auth or redirecting
  if (!isLoaded || redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  // If signed in, the useEffect will handle redirect
  if (isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse">Redirecting...</div>
      </div>
    )
  }

  return invitationToken === null ? (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
            cardBox: "w-[27rem]"
          }
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/onboarding"
      />
    </div>
  ) : <UserInviteSignupForm invitationToken={invitationToken} />
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
}