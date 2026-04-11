'use client'

import { SignIn, useUser } from '@clerk/nextjs';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { processMarketingSkuFromUrl, getSignedInRedirectUrl } from '@/lib/marketing-preselect';

function SignInContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isSignedIn, isLoaded } = useUser()
  const [skuProcessed, setSkuProcessed] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // Handle already signed-in users with SKU parameter
  useEffect(() => {
    if (!isLoaded || !isSignedIn || redirecting) return

    const urlParams = searchParams || new URLSearchParams(window.location.search)
    const sku = urlParams.get('sku')

    if (sku) {
      console.log('📦 SIGN-IN: User already signed in with SKU:', sku)
      setRedirecting(true)

      // Process the SKU to get preselect data
      const preselect = processMarketingSkuFromUrl(urlParams)

      if (preselect) {
        // Use centralized redirect URL logic (handles services, subscriptions, packages)
        const redirectUrl = getSignedInRedirectUrl(preselect)
        console.log('📦 SIGN-IN: Redirecting signed-in user to:', redirectUrl)
        router.push(redirectUrl)
      } else {
        // Invalid SKU, just go to home (middleware will handle routing)
        router.push('/')
      }
      return
    }

    // No SKU, user is signed in - redirect to home (middleware handles routing)
    console.log('📦 SIGN-IN: User already signed in, redirecting to home')
    router.push('/')
  }, [isLoaded, isSignedIn, searchParams, router, redirecting])

  // Process SKU for users who will sign in (not signed in yet)
  useEffect(() => {
    if (typeof window === 'undefined' || skuProcessed || isSignedIn) return

    // Use window.location.search as fallback if searchParams not ready
    const urlParams = searchParams || new URLSearchParams(window.location.search)

    // Process marketing SKU from URL (e.g., ?sku=2215562)
    // This saves the preselection to a cookie for use after sign-in
    const sku = urlParams.get('sku')
    if (sku) {
      console.log('📦 SIGN-IN: Processing SKU from URL:', sku)
      const preselect = processMarketingSkuFromUrl(urlParams)
      if (preselect) {
        console.log('📦 SIGN-IN: Marketing preselection saved:', preselect)
      } else {
        console.warn('📦 SIGN-IN: Invalid SKU, no preselection saved')
      }
    } else {
      // No SKU in URL - clear any leftover post-onboarding service redirect
      // This prevents a previous user's service SKU from affecting a new signin
      console.log('📦 SIGN-IN: No SKU in URL, clearing leftover hmm_post_onboarding_service')
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          }
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/onboarding"
      />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}