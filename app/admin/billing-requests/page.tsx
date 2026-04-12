'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function BillingRequestsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new subscription management page
    router.replace('/admin/subscription-management')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Redirecting to Subscription Management...</p>
      </div>
    </div>
  )
}