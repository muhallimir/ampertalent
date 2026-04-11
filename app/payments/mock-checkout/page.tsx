'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function MockCheckoutPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect away from this page immediately
    console.error('❌ MOCK-CHECKOUT: This page should not be accessed. Redirecting...')
    router.push('/employer/jobs')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Checkout Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-700">
              This mock checkout page should not be accessible. You are being redirected to the jobs page.
            </p>
            <p className="text-sm text-red-600">
              If you continue to see this page, please contact support.
            </p>
            <Button 
              onClick={() => router.push('/employer/jobs')}
              className="bg-red-600 hover:bg-red-700"
            >
              Go to Jobs Page
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}