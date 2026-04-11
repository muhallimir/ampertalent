'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ResumeCritiqueRequest } from '@/components/seeker/ResumeCritiqueRequest'
import { ResumeCritiqueResults } from '@/components/seeker/ResumeCritiqueResults' 
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { CritiqueRequest } from '@/lib/resume-critique'
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function ResumeCritiquePage() {
  const [activeTab, setActiveTab] = useState('request')
  const [critiqueRequests, setCritiqueRequests] = useState<CritiqueRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seekerData, setSeekerData] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRequests, setTotalRequests] = useState(0)
  const [itemsPerPage] = useState(10)
  
  // State to track expanded requests
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({})

  // Fetch user data and critique requests
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch current user data
        const userResponse = await fetch('/api/seeker/profile')
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data')
        }
        const userData = await userResponse.json()
        
        // Set seeker data
        const jobSeeker = userData.profile || {}
        setSeekerData({
          id: userData.profile?.id,
          resumeCredits: jobSeeker.resumeCredits || 0,
          hasActiveSubscription: jobSeeker.hasActiveSubscription ?? false
        })
        
        // Fetch critique requests with pagination
        const requestsResponse = await fetch(`/api/resume-critique/requests?seekerId=${userData.profile?.id}&page=${currentPage}&limit=${itemsPerPage}`)
        if (!requestsResponse.ok) {
          throw new Error('Failed to fetch critique requests')
        }
        const requestsData = await requestsResponse.json()
        setCritiqueRequests(requestsData.requests || [])
        setTotalRequests(requestsData.totalCount || 0)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [currentPage])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'in_progress':
        return <Badge variant="destructive">In Progress</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Toggle expanded state for a request
  const toggleRequestExpansion = (requestId: string) => {
    setExpandedRequests(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-gray-600">Loading resume critique service...</p>
              </div>
            </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Error Loading Data
              </h3>
              <p className="text-gray-600 mb-4">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Try Again →
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Refresh requests after a new submission
  const handleRequestSubmitted = async () => {
    try {
      const requestsResponse = await fetch(`/api/resume-critique/requests?seekerId=${seekerData?.id}&page=${currentPage}&limit=${itemsPerPage}`)
      if (!requestsResponse.ok) {
        throw new Error('Failed to fetch critique requests')
      }
      const requestsData = await requestsResponse.json()
      setCritiqueRequests(requestsData.requests || [])
      setTotalRequests(requestsData.totalCount || 0)
      setActiveTab('history')
    } catch (err) {
      console.error('Error refreshing data:', err)
      setError('Failed to refresh data. Please try again.')
    }
  }

  // Calculate pagination values
  const totalPages = Math.ceil(totalRequests / itemsPerPage)
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className='space-y-6'>
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resume Critique</h1>
          <p className="text-gray-600 mt-2">
            Get professional feedback to improve your resume and land more interviews
          </p>
        </div>

        {/* Credits Info */}
        {seekerData && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="text-sm text-gray-600">Resume Credits</p>
                    <p className="text-2xl font-bold text-blue-600">{seekerData.resumeCredits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Membership Status</p>
                    <Badge variant={seekerData.hasActiveSubscription ? "default" : "secondary"}>
                      {seekerData.hasActiveSubscription ? "Premium" : "Free"}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Standard Critique</p>
                  <p className="text-lg font-semibold">
                    {seekerData.hasActiveSubscription ? "Free" : "$29.99"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="request">New Request</TabsTrigger>
            <TabsTrigger value="history">
              My Critiques ({totalRequests})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="request">
            {seekerData && (
              <ResumeCritiqueRequest
                seekerId={seekerData.id}
                currentCredits={seekerData.resumeCredits}
                hasActiveSubscription={seekerData.hasActiveSubscription}
                onRequestSubmitted={handleRequestSubmitted}
              />
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {critiqueRequests.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No critique requests yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Submit your first resume for professional feedback
                    </p>
                    <button
                      onClick={() => setActiveTab('request')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Request a critique →
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  {critiqueRequests.map((request) => (
                    <Card key={request.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center space-x-2">
                            {getStatusIcon(request.status)}
                            <span>Resume Critique</span>
                            {request.targetRole && (
                              <span className="text-sm font-normal text-gray-600">
                                - {request.targetRole}
                              </span>
                            )}
                          </CardTitle>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(request.status)}
                            <Badge variant="outline" className="text-xs">
                              {request.priority === 'rush' ? 'Rush' : 'Standard'}
                            </Badge>
                          </div>
                        </div>
                        <CardDescription>
                          Requested on {new Date(request.requestedAt).toLocaleDateString()}
                          {request.completedAt && (
                            <span> • Completed on {new Date(request.completedAt).toLocaleDateString()}</span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {request.status === 'completed' && request.analysis ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div>
                                  <p className="text-sm text-gray-600">Overall Score</p>
                                  <p className="text-2xl font-bold text-blue-600">
                                    {request.analysis.overallScore}/100
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Industry Percentile</p>
                                  <p className="text-lg font-semibold">
                                    {request.analysis.industryComparison.percentile}th
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  toggleRequestExpansion(request.id)
                                }}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                              >
                                {expandedRequests[request.id] ? 'Hide Details' : 'View Full Report'} →
                              </button>
                            </div>
                            
                            {/* Toggleable Content */}
                            {expandedRequests[request.id] ? (
                              <div className="border-t pt-4 mt-4">
                                <ResumeCritiqueResults
                                  analysis={request.analysis}
                                  requestId={request.id}
                                  completedAt={request.completedAt!}
                                  setActiveTab={setActiveTab}
                                />
                              </div>
                            ) : (
                              <div className="border-t pt-4">
                                <p className="text-sm text-gray-600">
                                  Click "View Full Report" to see detailed feedback and recommendations.
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">
                                {request.status === 'pending' && 'Your resume is in the review queue'}
                                {request.status === 'in_progress' && 'Our experts are reviewing your resume'}
                                {request.status === 'failed' && 'There was an issue processing your request'}
                              </p>
                              {request.targetIndustry && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Target Industry: {request.targetIndustry}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">${request.cost}</p>
                              <p className="text-xs text-gray-500">
                                {request.priority === 'rush' ? '24 hour delivery' : '3-5 business days'}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <nav className="inline-flex rounded-md shadow">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 rounded-l-md border ${
                          currentPage === 1 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 border-t border-b ${
                              currentPage === page
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            } ${page === 1 ? '' : '-ml-px'}`}
                          >
                            {page}
                          </button>
                        )
                      })}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 rounded-r-md border ${
                          currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        } -ml-px`}
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
