'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import { InterviewProgress } from '@/components/seeker/InterviewProgress'
import { FollowUpModal } from '@/components/seeker/FollowUpModal'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Eye,
  ExternalLink,
  CheckCircle
} from 'lucide-react'
import { ChatButton } from '@/components/seeker/ChatButton'
import { useNotificationListener } from '@/hooks/useRealTimeNotifications'

interface Application {
  id: string
  status: 'pending' | 'reviewed' | 'interview' | 'rejected' | 'hired'
  appliedAt: string
  interviewStage?: string
  interviewScheduledAt?: string
  interviewCompletedAt?: string
  hasEmployerContact?: boolean
  hasFollowedUp?: boolean
  job: {
    id: string
    title: string
    company: string
    companyLogoUrl?: string
    employerId?: string
    location: string
    type: string
    payRange: string
    description: string
    isArchived?: boolean
    archivedAt?: string | null
  }
}

export default function SeekerApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [followUpModalApplication, setFollowUpModalApplication] = useState<Application | null>(null)
  const router = useRouter()

  const loadApplications = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true)
    }

    try {
      // Check for impersonation context only on client side
      const headers: HeadersInit = {}

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          console.log('🎭 FRONTEND: Adding impersonation headers to applications request', {
            impersonatedUserId: impersonationSession.impersonatedUser.id,
            adminId: impersonationSession.adminId
          })
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch('/api/seeker/applications', { headers })
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      } else {
        console.error('Failed to load applications:', response.statusText)
        setApplications([])
      }
    } catch (error) {
      console.error('Error loading applications:', error)
      setApplications([])
    } finally {
      if (showSpinner) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    loadApplications(true)
  }, [loadApplications])

  useEffect(() => {
    const handleFocus = () => {
      router.refresh()
      loadApplications()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [router, loadApplications])

  useNotificationListener('interview_stage_update', (notification) => {
    const data = notification.data as any
    if (!data?.applicationId) {
      return
    }

    setApplications((prev) =>
      prev.map((app) =>
        app.id === data.applicationId
          ? {
            ...app,
            status: data.status ?? app.status,
            interviewStage: data.interviewStageKey ?? data.interviewStage ?? app.interviewStage,
            interviewScheduledAt: data.interviewScheduledAt ?? app.interviewScheduledAt,
            interviewCompletedAt: data.interviewCompletedAt ?? app.interviewCompletedAt
          }
          : app
      )
    )
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'reviewed':
        return 'bg-blue-100 text-blue-800'
      case 'interview':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'hired':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'pending'
      case 'reviewed':
        return 'Reviewed'
      case 'interview':
        return 'Interview'
      case 'rejected':
        return 'Not Selected'
      case 'hired':
        return 'Hired'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-600 mt-2">
            Track the status of your job applications and follow up on opportunities.
          </p>
        </div>
        <Button asChild className="bg-brand-teal hover:bg-brand-teal/90">
          <Link href="/seeker/jobs">
            <FileText className="h-4 w-4 mr-2" />
            Browse Jobs
          </Link>
        </Button>
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card className="shadow-sm border border-gray-100">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-teal-light rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-10 w-10 text-brand-teal" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Applications Yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                You haven&apos;t applied to any jobs yet. Start browsing available positions and submit your applications.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button asChild className="bg-brand-teal hover:bg-brand-teal/90">
                  <Link href="/seeker/jobs">Browse Jobs</Link>
                </Button>
                <Button asChild variant="outline" className="border-brand-coral text-brand-coral hover:bg-brand-coral hover:text-white">
                  <Link href="/seeker/profile">Complete Profile</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id} className="shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Company Logo */}
                    <CompanyLogo
                      companyLogoUrl={application.job.companyLogoUrl}
                      companyName={application.job.company}
                      size="md"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                        <CardTitle className="text-lg sm:text-xl text-gray-900 leading-tight">
                          {application.job.title}
                        </CardTitle>
                        <div className="flex items-center text-xs text-gray-500 sm:ml-4">
                          <Calendar className="h-3 w-3 mr-1" />
                          Applied {new Date(application.appliedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: new Date(application.appliedAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{application.job.company}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{application.job.location}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{application.job.payRange}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2">
                    <Badge className={`${getStatusColor(application.status)} whitespace-nowrap`}>
                      {getStatusText(application.status)}
                    </Badge>
                    {application.job.isArchived && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300 whitespace-nowrap">
                        📁 Archived
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 order-2 sm:order-1">
                    {/* Additional application details */}
                    {application.interviewScheduledAt && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-blue-500" />
                        Interview: {new Date(application.interviewScheduledAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                    {application.interviewCompletedAt && (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                        Completed: {new Date(application.interviewCompletedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 order-1 sm:order-2">
                    <Button asChild variant="outline" size="sm" className="text-xs">
                      <Link href={`/seeker/jobs/${application.job.id}`}>
                        <Eye className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">View Job</span>
                        <span className="sm:hidden">View</span>
                      </Link>
                    </Button>
                    {application.status === 'pending' && (
                      application.hasFollowedUp ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-gray-400 border-gray-300 cursor-default text-xs"
                          disabled
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Followed Up</span>
                          <span className="sm:hidden">Sent</span>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-brand-coral border-brand-coral hover:bg-brand-coral hover:text-white text-xs"
                          onClick={() => setFollowUpModalApplication(application)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Follow Up</span>
                          <span className="sm:hidden">Follow</span>
                        </Button>
                      )
                    )}
                    {/* Show chat button for applications beyond pending and initial screening - allows seekers to reach out proactively */}
                    {(application.status === 'interview' || application.status === 'rejected' || application.status === 'hired') && (
                      <ChatButton
                        applicationId={application.id}
                        jobId={application.job.id}
                        employerId={application.job.employerId}
                        size="sm"
                        variant="outline"
                        showUnreadBadge={true}
                        className="text-brand-teal border-brand-teal hover:bg-brand-teal hover:text-white transition-all"
                      />
                    )}
                  </div>
                </div>

                {/* Interview Progress */}
                {(application.status === 'reviewed' || application.status === 'interview') && application.interviewStage && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <InterviewProgress
                      jobTitle={application.job.title}
                      companyName={application.job.company}
                      currentStage={application.interviewStage}
                      interviewScheduledAt={application.interviewScheduledAt}
                      interviewCompletedAt={application.interviewCompletedAt}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Application Tips */}
      <Card className="shadow-sm border border-gray-100">
        <CardHeader className="bg-gradient-to-r from-brand-teal to-brand-teal-light text-white rounded-t-lg">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Application Tips</span>
          </CardTitle>
          <CardDescription className="text-white/90">
            Improve your chances of getting hired
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Before Applying</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Complete your profile with relevant skills</li>
                <li>• Upload an updated resume</li>
                <li>• Research the company and role</li>
                <li>• Tailor your application to the job</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">After Applying</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Follow up within 1-2 weeks</li>
                <li>• Keep your profile updated</li>
                <li>• Continue applying to similar roles</li>
                <li>• Network with industry professionals</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Follow Up Modal */}
      {followUpModalApplication && (
        <FollowUpModal
          isOpen={!!followUpModalApplication}
          onClose={() => setFollowUpModalApplication(null)}
          onSuccess={() => {
            setApplications(prev =>
              prev.map(app =>
                app.id === followUpModalApplication.id
                  ? { ...app, hasFollowedUp: true }
                  : app
              )
            )
          }}
          application={followUpModalApplication}
        />
      )}
    </div>
  )
}
