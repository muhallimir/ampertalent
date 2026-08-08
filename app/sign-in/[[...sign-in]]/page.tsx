'use client'

import Link from 'next/link';
import { SignIn, useUser } from '@clerk/nextjs';
import { useEffect, useState, Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { processMarketingSkuFromUrl, getSignedInRedirectUrl } from '@/lib/marketing-preselect';

function SignInContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isSignedIn, isLoaded } = useUser()
  const [skuProcessed, setSkuProcessed] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // When the visitor lands on /sign-in?demo_email=... (the manual sign-in
  // fallback from the demo flow), we can't pre-fill Clerk's <SignIn /> directly,
  // but we can show a banner reminding them which credentials to use.
  const demoEmailFromUrl = searchParams?.get('demo_email')
  const demoRoleFromUrl = searchParams?.get('demo_role')

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 underline underline-offset-4 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        {demoEmailFromUrl && (
          <div
            data-testid="demo-manual-signin-banner"
            className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <strong>Demo account ready.</strong> Sign in with{' '}
            <code className="font-mono text-xs">{demoEmailFromUrl}</code>
            {demoRoleFromUrl ? (
              <>
                {' '}(role: <strong>{demoRoleFromUrl}</strong>)
              </>
            ) : null}
            . Your password is shown in the persistent demo banner at the top.
          </div>
        )}
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