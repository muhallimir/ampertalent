'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import {
  Clock,

  Calendar,
  Download,
  ExternalLink,
  UserPlus,
  Mail,
  Phone,
  Building,
  GraduationCap,
  Briefcase,
  ArrowRight,
  MessageCircle,
  MessageSquare,
  Check
} from 'lucide-react'

interface TalentProfileData {
  id: string
  name: string
  firstName: string | null
  lastName: string | null
  email?: string | null
  phone?: string
  headline: string | null
  aboutMe: string | null
  professionalSummary: string | null
  availability: string | null
  salaryExpectations: string | null
  showSalaryExpectations: boolean
  skills: string[]
  profilePictureUrl: string | null
  membershipPlan: string
  portfolioUrls: string[]
  resumeUrl: string | null
  hasResume: boolean
  joinedAt: string
  timezone?: string
  workExperience?: string | null
  education?: any[] | null
  applicationHistory?: Array<{
    id: string
    jobId: string
    jobTitle: string
    jobStatus: string
    applicationStatus: string
    appliedAt: string
    jobCreatedAt: string
  }>
  allowDirectMessages: boolean
}

interface TalentProfileModalProps {
  isOpen: boolean
  onClose: () => void
  talentId: string | null
  onInvite: (talentId: string) => void
  isInvited?: boolean
}

export function TalentProfileModal({ isOpen, onClose, talentId, onInvite, isInvited = false }: TalentProfileModalProps) {
  const router = useRouter()
  const [talent, setTalent] = useState<TalentProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isViewingResume, setIsViewingResume] = useState(false)
  const pathname = usePathname() || ""
  const isMessageThreadView = pathname.includes('/messages')

  // Fetch talent profile details
  const fetchTalentProfile = async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      // Check for impersonation context only on client side
      const headers: HeadersInit = {}

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          console.log('🎭 FRONTEND: Adding impersonation headers to talent profile request', {
            impersonatedUserId: impersonationSession.impersonatedUser.id,
            adminId: impersonationSession.adminId
          })
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch(`/api/employer/talent/${id}`, { headers })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch talent profile')
      }

      setTalent(data.profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Effect to fetch profile when modal opens
  useEffect(() => {
    if (isOpen && talentId) {
      fetchTalentProfile(talentId)
    } else {
      setTalent(null)
      setError(null)
    }
  }, [isOpen, talentId])

  const handleDownloadResume = async () => {
    if (!talent?.resumeUrl) return

    try {
      setIsViewingResume(true)
      // Check for impersonation context only on client side
      const headers: HeadersInit = {}

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          console.log('🎭 FRONTEND: Adding impersonation headers to resume view request', {
            impersonatedUserId: impersonationSession.impersonatedUser.id,
            adminId: impersonationSession.adminId
          })
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch(`/api/employer/talent/${talent.id}/resume`, { headers })
      if (response.ok) {
        const data = await response.json()
        window.open(data.downloadUrl, '_blank')
      } else {
        const error = await response.json()
        console.error('Error viewing resume:', error.error)
      }
    } catch (error) {
      console.error('Error viewing resume:', error)
    } finally {
      setIsViewingResume(false)
    }
  }

  const handleChatWithSeeker = () => {
    if (!talent) return

    const searchParams = new URLSearchParams({
      compose: 'true',
      recipientId: talent.id,
      recipientName: talent.name
    })

    router.push(`/employer/messages?${searchParams.toString()}`)
  }

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })
  }

  const formatApplicationDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hired': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'interview': return 'bg-green-100 text-green-800 border-green-200'
      case 'reviewed': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'rejected': return 'bg-red-100 text-red-600 border-red-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-50 text-green-700'
      case 'expired': return 'bg-gray-50 text-gray-600'
      case 'filled': return 'bg-blue-50 text-blue-700'
      case 'draft': return 'bg-yellow-50 text-yellow-700'
      default: return 'bg-gray-50 text-gray-600'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle>Professional Profile</DialogTitle>
          {/* Chat button positioned next to close X button */}
          {talent && !isMessageThreadView && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleChatWithSeeker}
              disabled={!talent.allowDirectMessages}
              title={!talent.allowDirectMessages ? 'This seeker has turned off direct messages' : undefined}
              className="absolute right-8 top-[-8] text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              {talent.allowDirectMessages ? 'Chat' : 'Chat Off'}
            </Button>
          )}
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
            <span className="ml-2 text-gray-600">Loading profile...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {talent && (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-start space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={talent.profilePictureUrl || ''} alt={talent.name} />
                <AvatarFallback className="bg-brand-teal text-white text-xl">
                  {talent.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {talent.firstName && talent.lastName
                    ? `${talent.firstName} ${talent.lastName}`
                    : talent.name
                  }
                </h2>
                {talent.headline && (
                  <p className="text-lg text-gray-600 mt-1">{talent.headline}</p>
                )}

                <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                  {talent.availability && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{talent.availability}</span>
                    </div>
                  )}

                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Joined {formatJoinDate(talent.joinedAt)}</span>
                  </div>
                </div>

                {/* Membership Badge */}
                {talent.membershipPlan !== 'none' && (
                  <Badge variant="outline" className="mt-2 text-brand-teal border-brand-teal">
                    Premium Member
                  </Badge>
                )}
              </div>
            </div>

            {/* Professional Summary Section - Backwards Compatible */}
            {(talent.professionalSummary || talent.aboutMe) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Professional Summary</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {talent.professionalSummary || talent.aboutMe}
                  </p>
                </div>
              </>
            )}

            {/* Salary Expectations Section */}
            {talent.salaryExpectations && talent.showSalaryExpectations && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Salary Expectations</h3>
                  <div className="flex items-center text-lg font-medium text-green-600">
                    <span>💰 {talent.salaryExpectations}</span>
                  </div>
                </div>
              </>
            )}

            {/* Skills Section */}
            {talent.skills.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills & Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {talent.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Portfolio Section */}
            {talent.portfolioUrls.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Portfolio</h3>
                  <div className="space-y-2">
                    {talent.portfolioUrls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-brand-teal hover:text-brand-teal/80 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        <span className="truncate">{url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Work Experience Section */}
            {talent.workExperience && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Work Experience
                  </h3>
                  <div
                    className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: talent.workExperience }}
                  />
                </div>
              </>
            )}

            {/* Education Section */}
            {talent.education && talent.education.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2" />
                    Education
                  </h3>
                  <div className="space-y-4">
                    {talent.education.map((edu: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex flex-col space-y-2">
                          <h4 className="font-semibold text-gray-900">{edu.institution}</h4>
                          <p className="text-gray-700">{edu.certifications}</p>
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>
                              {new Date(edu.startDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short'
                              })}
                              {edu.endDate && (
                                <> - {new Date(edu.endDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short'
                                })}</>
                              )}
                            </span>
                          </div>
                          {edu.notes && (
                            <p className="text-sm text-gray-600 mt-2">{edu.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Application History - Show if there's history with this employer */}
            {talent.applicationHistory && talent.applicationHistory.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <Briefcase className="h-5 w-5 mr-2" />
                    Application History with Your Company
                  </h3>
                  <div className="space-y-3">
                    {talent.applicationHistory.map((app) => (
                      <div key={app.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{app.jobTitle}</h4>
                            <p className="text-sm text-gray-600">Applied {formatApplicationDate(app.appliedAt)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={`text-xs font-medium border ${getStatusColor(app.applicationStatus)}`}>
                              {app.applicationStatus === 'hired' ? '✓ Hired' :
                                app.applicationStatus === 'interview' ? '◉ Interview' :
                                  app.applicationStatus === 'reviewed' ? '◎ Reviewed' :
                                    app.applicationStatus === 'pending' ? '○ Applied' :
                                      app.applicationStatus === 'rejected' ? '✕ Not Selected' :
                                        app.applicationStatus}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${getJobStatusColor(app.jobStatus)}`}>
                              Job: {app.jobStatus === 'approved' ? 'Active' :
                                app.jobStatus === 'expired' ? 'Expired' :
                                  app.jobStatus === 'filled' ? 'Filled' :
                                    app.jobStatus}
                            </Badge>
                          </div>
                        </div>

                        {/* Special messaging and action buttons */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex-1">
                            {app.applicationStatus === 'hired' && (
                              <div className="p-2 bg-purple-50 border border-purple-200 rounded text-sm text-purple-800">
                                <strong>🎉 Previously hired</strong> - This candidate has worked with your company before
                              </div>
                            )}
                            {app.applicationStatus === 'interview' && app.jobStatus !== 'expired' && (
                              <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                                <strong>📅 Currently in interview process</strong> - Active candidate for this position
                              </div>
                            )}
                            {app.applicationStatus === 'interview' && (app.jobStatus === 'expired' || app.jobStatus === 'filled') && (
                              <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
                                <strong>📋 Past interview</strong> - Was in interview process for this position
                              </div>
                            )}
                          </div>

                          {/* View Application Button */}
                          <div className="ml-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.open(`/employer/jobs/${app.jobId}/applications`, '_blank')
                              }}
                              className="text-xs flex items-center"
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              View Application
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Contact Information - Only show if email or phone is available */}
            {(talent.email || talent.phone) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    {talent.email && (
                      <div className="flex items-center text-gray-700">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{talent.email}</span>
                      </div>
                    )}
                    {!talent.email && (talent.phone) && (
                      <div
                        className="flex items-center text-gray-400 cursor-help"
                        title="Hire this candidate or invite them to interview on an active job to see their contact details"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="italic">Email available after hiring or interview</span>
                      </div>
                    )}
                    {talent.phone && (
                      <div className="flex items-center text-gray-700">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{talent.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {talent.hasResume && talent.resumeUrl && (
                <Button
                  variant="outline"
                  onClick={handleDownloadResume}
                  disabled={isViewingResume}
                  className="flex items-center"
                >
                  {isViewingResume ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  View Resume
                </Button>
              )}

              {!isMessageThreadView && (
                <Button
                  onClick={() => onInvite(talent.id)}
                  className="flex items-center bg-brand-coral hover:bg-brand-coral/90"
                  disabled={isInvited}
                >
                  {isInvited ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Already Invited
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite to Job
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
