'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ApplicantProfilePicture } from '@/components/common/ApplicantProfilePicture'
import {
  MapPin,
  Calendar,
  Download,
  Eye,
  Check,
  X,
  Clock,
  Star,
  Mail,
  Phone
} from 'lucide-react'
import { getWithImpersonation } from '@/lib/api-client'

interface Application {
  id: string
  applicantId: string
  applicantName: string
  applicantEmail: string
  applicantPhone?: string
  applicantLocation: string
  profilePictureUrl?: string
  resumeUrl: string
  coverLetter?: string
  appliedAt: string
  status: 'pending' | 'reviewed' | 'interview' | 'rejected' | 'hired'
  experience: string
  skills: string[]
  expectedSalary?: number
  availability: string
  rating?: number
}

interface ApplicationCardProps {
  application: Application
  jobTitle: string
  onStatusChange: (applicationId: string, newStatus: string, interviewStage?: string) => Promise<void>
  onViewProfile: (applicationId: string) => void
}

export function ApplicationCard({
  application,
  jobTitle,
  onStatusChange,
  onViewProfile
}: ApplicationCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDownloadingResume, setIsDownloadingResume] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
    newStatus: string
    actionText: string
    variant?: 'default' | 'destructive'
  }>({
    isOpen: false,
    title: '',
    description: '',
    newStatus: '',
    actionText: '',
    variant: 'default'
  })

  const handleResumeView = async () => {
    setIsDownloadingResume(true)
    try {
      const response = await getWithImpersonation(`/api/employer/applications/${application.id}/resume`)
      if (response.ok) {
        const data = await response.json()
        // Open the presigned URL in a new tab
        window.open(data.downloadUrl, '_blank')
      } else {
        const error = await response.json()
        console.error('Error viewing resume:', error.error)
        // Could add toast notification here in the future
      }
    } catch (error) {
      console.error('Error viewing resume:', error)
      // Could add toast notification here in the future
    } finally {
      setIsDownloadingResume(false)
    }
  }

  const showConfirmDialog = (newStatus: string) => {
    const statusMessages = {
      reviewed: {
        title: 'Mark as Reviewed',
        description: `Are you sure you want to mark ${application.applicantName}'s application as reviewed?`,
        actionText: 'Mark as Reviewed'
      },
      interview: {
        title: 'Schedule Interview',
        description: `Are you sure you want to move ${application.applicantName} to the interview stage?`,
        actionText: 'Schedule Interview'
      },
      hired: {
        title: 'Hire Applicant',
        description: `Are you sure you want to hire ${application.applicantName}? This will notify them of their successful application.`,
        actionText: 'Hire Applicant'
      },
      rejected: {
        title: 'Reject Application',
        description: `Are you sure you want to reject ${application.applicantName}'s application? This action will notify them that their application was not successful.`,
        actionText: 'Reject Application',
        variant: 'destructive' as const
      }
    }

    const config = statusMessages[newStatus as keyof typeof statusMessages]
    if (config) {
      setConfirmDialog({
        isOpen: true,
        newStatus,
        ...config
      })
    }
  }

  const handleConfirmedStatusChange = async () => {
    setIsUpdating(true)
    setConfirmDialog(prev => ({ ...prev, isOpen: false }))

    try {
      // Determine interview stage based on status change
      let interviewStage: string | undefined

      switch (confirmDialog.newStatus) {
        case 'reviewed':
          interviewStage = 'initial_screening'
          break
        case 'interview':
          interviewStage = 'technical_interview'
          break
        case 'rejected':
          interviewStage = 'offer_rejected'
          break
      }

      await onStatusChange(application.id, confirmDialog.newStatus, interviewStage)
    } catch (error) {
      console.error('Error updating application status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelDialog = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'reviewed': return 'bg-blue-100 text-blue-800'
      case 'interview': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'hired': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatusDisplay = (status: string) => {
    switch (status) {
      case 'rejected': return 'Declined'
      default: return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(salary)
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <ApplicantProfilePicture
              applicantId={application.applicantId}
              applicantName={application.applicantName}
              profilePictureUrl={application.profilePictureUrl || null}
              size="lg"
            />
            <div>
              <CardTitle className="text-lg">{application.applicantName}</CardTitle>
              <CardDescription className="flex items-center space-x-4">
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {application.applicantLocation}
                </span>
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Applied {new Date(application.appliedAt).toLocaleDateString()}
                </span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(application.status)}>
              {formatStatusDisplay(application.status)}
            </Badge>
            {application.rating && (
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">{application.rating}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span className="flex items-center">
            <Mail className="h-4 w-4 mr-1" />
            {application.applicantEmail}
          </span>
          {application.applicantPhone && (
            <span className="flex items-center">
              <Phone className="h-4 w-4 mr-1" />
              {application.applicantPhone}
            </span>
          )}
        </div>

        {/* Experience and Skills */}
        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium text-gray-700">Experience: </span>
            <span className="text-sm text-gray-600">{application.experience}</span>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-700">Skills: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {(application.skills || []).slice(0, 5).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                >
                  {skill}
                </span>
              ))}
              {(application.skills || []).length > 5 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  +{(application.skills || []).length - 5} more
                </span>
              )}
            </div>
          </div>

          {application.expectedSalary && (
            <div>
              <span className="text-sm font-medium text-gray-700">Expected Salary: </span>
              <span className="text-sm text-gray-600">{formatSalary(application.expectedSalary)}/year</span>
            </div>
          )}

          <div>
            <span className="text-sm font-medium text-gray-700">Availability: </span>
            <span className="text-sm text-gray-600">{application.availability}</span>
          </div>
        </div>

        {/* Cover Letter Preview */}
        {application.coverLetter && (
          <div>
            <span className="text-sm font-medium text-gray-700">Cover Letter: </span>
            <p className="text-sm text-gray-600 mt-1 line-clamp-3">
              {application.coverLetter}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewProfile(application.id)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResumeView}
              disabled={isDownloadingResume}
            >
              {isDownloadingResume ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Resume
            </Button>
          </div>

          {/* Status Action Buttons */}
          <div className="flex items-center space-x-2">
            {application.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showConfirmDialog('reviewed')}
                  disabled={isUpdating}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Review
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showConfirmDialog('rejected')}
                  disabled={isUpdating}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}

            {application.status === 'reviewed' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showConfirmDialog('interview')}
                  disabled={isUpdating}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Interview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showConfirmDialog('rejected')}
                  disabled={isUpdating}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}

            {application.status === 'interview' && (
              <>
                <Button
                  size="sm"
                  onClick={() => showConfirmDialog('hired')}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Hire
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showConfirmDialog('rejected')}
                  disabled={isUpdating}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}

            {(application.status === 'rejected' || application.status === 'hired') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => showConfirmDialog('reviewed')}
                disabled={isUpdating}
              >
                <Clock className="h-4 w-4 mr-2" />
                Reconsider
              </Button>
            )}
          </div>
        </div>

        {/* Application for Job */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          Application for: <span className="font-medium">{jobTitle}</span>
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={handleCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>
              {confirmDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDialog}>
              Cancel
            </Button>
            <Button
              variant={confirmDialog.variant || 'default'}
              onClick={handleConfirmedStatusChange}
              disabled={isUpdating}
            >
              {isUpdating ? 'Processing...' : confirmDialog.actionText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}