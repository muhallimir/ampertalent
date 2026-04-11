'use client'

import { useParams, useRouter } from 'next/navigation'
import { EmailBlastDetailsForm } from '@/components/employer/EmailBlastDetailsForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function EmailBlastDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/employer/jobs')}
              className="border-gray-300 hover:border-brand-teal hover:text-brand-teal"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Email Blast Details
            </h1>
            <p className="text-gray-600">
              Provide the required information to send your job to our candidate database
            </p>
          </div>

          {/* Form */}
          <EmailBlastDetailsForm 
            jobId={jobId}
            onComplete={() => router.push('/employer/jobs')}
          />
        </div>
      </div>
    </div>
  )
}