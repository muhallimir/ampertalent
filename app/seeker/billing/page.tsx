'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SeekerBillingRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new subscription page
    router.replace('/seeker/subscription')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-2">Redirecting...</h1>
        <p className="text-gray-600">Taking you to your subscription page</p>
      </div>
    </div>
  )
}