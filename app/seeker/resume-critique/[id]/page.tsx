'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ResumeCritiqueResults } from '@/components/seeker/ResumeCritiqueResults'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function ResumeCritiqueDetailPage() {
  const params = useParams()
  const [critiqueData, setCritiqueData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchCritiqueData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch critique data
        const response = await fetch(`/api/resume-critique/requests/${params.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch critique data')
        }
        const data = await response.json()
        setCritiqueData(data.request)
      } catch (err) {
        console.error('Error fetching critique data:', err)
        setError('Failed to load critique data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchCritiqueData()
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !critiqueData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {error || 'Critique not found'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {error || 'The requested critique could not be found.'}
                </p>
                <Button onClick={() => router.back()} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Critiques
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={() => router.back()} variant="outline" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Critiques
          </Button>
        </div>

        {critiqueData.status === 'completed' && critiqueData.analysis ? (
          <ResumeCritiqueResults 
            analysis={critiqueData.analysis}
            requestId={critiqueData.id}
            completedAt={critiqueData.completedAt}
            targetRole={critiqueData.targetRole}
            targetIndustry={critiqueData.targetIndustry}
            reviewerName={critiqueData.reviewerName}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Resume Critique in Progress</CardTitle>
              <CardDescription>
                Your resume critique is being processed by our experts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <div className="h-16 w-16 bg-blue-200 rounded-full mx-auto mb-4"></div>
                </div>
                <p className="text-gray-600 mt-4">
                  {critiqueData.status === 'pending' 
                    ? 'Your resume is in the review queue and will be processed soon.' 
                    : 'Our experts are currently reviewing your resume.'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  You will receive an email notification when your critique is ready.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
