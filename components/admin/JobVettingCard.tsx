'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import { JobRejectionModal } from '@/components/admin/JobRejectionModal'
import {
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Flag,
  MessageSquare,
  Calendar,
  RefreshCw,
  Package,
  Shield
} from 'lucide-react'

// Package display functions
const getPackageDisplayName = (packageType: string) => {
  switch (packageType) {
    case 'standard': return 'Standard Package'
    case 'featured': return 'Featured Package'
    case 'email_blast': return 'Email Blast Package'
    case 'gold_plus': return 'Gold Plus Package'
    case 'concierge_lite': return 'Concierge LITE (Legacy)'
    case 'concierge_level_1': return 'Concierge Level I'
    case 'concierge_level_2': return 'Concierge Level II'
    case 'concierge_level_3': return 'Concierge Level III'
    default: return packageType
  }
}

const getPackageBadgeColor = (packageType: string) => {
  switch (packageType) {
    case 'standard': return 'bg-blue-100 text-blue-800'
    case 'featured': return 'bg-purple-100 text-purple-800'
    case 'email_blast': return 'bg-green-100 text-green-800'
    case 'gold_plus': return 'bg-yellow-100 text-yellow-800'
    case 'concierge_lite': return 'bg-orange-100 text-orange-800'
    case 'concierge_level_1': return 'bg-red-100 text-red-800'
    case 'concierge_level_2': return 'bg-indigo-100 text-indigo-800'
    case 'concierge_level_3': return 'bg-emerald-100 text-emerald-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getPackageVisibilityDuration = (packageType: string) => {
  switch (packageType) {
    case 'standard': return '30 days'
    case 'featured': return '45 days'
    case 'email_blast': return '60 days'
    case 'gold_plus': return '90 days'
    case 'concierge_lite': return 'Full service hiring'
    case 'concierge_level_1': return 'Full service hiring'
    case 'concierge_level_2': return 'Full service hiring'
    case 'concierge_level_3': return 'Full service hiring'
    default: return 'Unknown'
  }
}

interface JobVettingData {
  id: string
  title: string
  companyName: string
  companyLogoUrl?: string
  companyWebsite?: string
  location: string
  jobType: string
  experienceLevel: string
  salaryMin: number
  salaryMax: number
  salaryType: string
  description: string
  requirements: string
  benefits?: string
  skills: string[]
  submittedAt: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  employerEmail: string
  applicationDeadline?: string
  flaggedReasons?: string[]
  adminNotes?: string
  employerId: string
  isCompanyPrivate: boolean
  packageInfo?: {
    packageType: string
    listingsRemaining: number
    expiresAt: string | null
  }
  companyInfo?: {
    companyName: string
    companyWebsite?: string
    companyDescription?: string
    companyLogoUrl?: string
    billingAddress?: string
    taxId?: string
    isVetted: boolean
    vettedAt?: string
    vettedBy?: string
    isSuspended: boolean
    createdAt: string
    updatedAt: string
    userInfo: {
      id: string
      name?: string
      email?: string
      firstName?: string
      lastName?: string
      phone?: string
      profilePictureUrl?: string
      accountCreated: string
      lastActive: string
    }
    packageHistory: Array<{
      id: string
      packageType: string
      listingsRemaining: number
      purchasedAt: string
      expiresAt?: string
      createdAt: string
    }>
    jobStatistics: {
      total: number
      approved: number
      rejected: number
      pending: number
      firstJobDate?: string
      lastJobDate?: string
      totalApplications?: number
      totalHires?: number
    }
  }
}

interface JobVettingCardProps {
  job: JobVettingData
  onStatusChange: (jobId: string, status: string, notes?: string, isManualApproval?: boolean) => Promise<void>
  onFlag: (jobId: string, reasons: string[]) => Promise<void>
  initialExpanded?: boolean
  showQuickActions?: boolean
  reviewButtonLabel?: string
}

const QUALITY_CHECKLIST = [
  { id: 'salary', label: 'Competitive salary range', weight: 'high' },
  { id: 'description', label: 'Clear job description', weight: 'high' },
  { id: 'requirements', label: 'Reasonable requirements', weight: 'high' },
  { id: 'remote', label: 'Genuinely remote-friendly', weight: 'high' },
  { id: 'benefits', label: 'Family-friendly benefits', weight: 'medium' },
  { id: 'company', label: 'Legitimate company', weight: 'high' },
  { id: 'contact', label: 'Professional contact info', weight: 'medium' },
  { id: 'timeline', label: 'Reasonable timeline', weight: 'low' },
]

export function JobVettingCard({ job, onStatusChange, onFlag, initialExpanded = false, showQuickActions = false, reviewButtonLabel }: JobVettingCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(initialExpanded)
  const [adminNotes, setAdminNotes] = useState(job.adminNotes || '')
  const [qualityChecks, setQualityChecks] = useState<Record<string, boolean>>({})
  const [showRejectionModal, setShowRejectionModal] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
    try {
      // Pass isManualApproval=true only when approving
      const isManualApproval = newStatus === 'approved'
      await onStatusChange(job.id, newStatus, adminNotes, isManualApproval)
    } catch (error) {
      console.error('Error updating job status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejection = async (feedback: string, reasons: string[]) => {
    await onStatusChange(job.id, 'rejected', feedback)
  }

  const formatSalary = (min: number, max: number, type: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    })

    const period = type === 'hourly' ? '/hr' : type === 'monthly' ? '/mo' : '/yr'
    return `${formatter.format(min)} - ${formatter.format(max)} ${period}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'reviewing': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending'
      case 'reviewing': return 'Reviewing'
      case 'approved': return 'Approved'
      case 'rejected': return 'Declined'
      default: return status
    }
  }

  const getQualityScore = () => {
    const checkedItems = Object.values(qualityChecks).filter(Boolean).length
    const totalItems = QUALITY_CHECKLIST.length
    return Math.round((checkedItems / totalItems) * 100)
  }

  const toggleQualityCheck = (checkId: string) => {
    setQualityChecks(prev => ({
      ...prev,
      [checkId]: !prev[checkId]
    }))
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <CompanyLogo
                companyLogoUrl={job.companyLogoUrl}
                companyName={job.companyName}
                size="md"
              />
              <div className="flex items-center space-x-3">
                <CardTitle className="text-xl">{job.title}</CardTitle>
                <Badge className={getStatusColor(job.status)}>
                  {formatStatusDisplay(job.status)}
                </Badge>
                {job.isCompanyPrivate && (
                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                    <Shield className="h-3 w-3 mr-1" />
                    Private Company
                  </Badge>
                )}
                {job.flaggedReasons && job.flaggedReasons.length > 0 && (
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    <Flag className="h-3 w-3 mr-1" />
                    Flagged
                  </Badge>
                )}
              </div>
            </div>

            <CardDescription className="flex flex-wrap items-center gap-4">
              <span className="flex items-center">
                <Building2 className="h-4 w-4 mr-1" />
                {job.companyName}
              </span>
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {job.location}
              </span>
              <span className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
              </span>
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {job.jobType} • {job.experienceLevel}
              </span>
            </CardDescription>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showDetails ? 'Hide Details' : (reviewButtonLabel || 'View Details')}
            </Button>
            {/* Quick action buttons when showQuickActions is true */}
            {showQuickActions && (job.status === 'pending' || job.status === 'reviewing') && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleStatusChange('approved')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve
              </Button>
            )}
          </div>
        </div>

        {/* Submission Info */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 pt-2 border-t">
          <span className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            Submitted {new Date(job.submittedAt).toLocaleDateString()}
          </span>
          <span className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            {job.employerEmail}
          </span>

          {/* Package Information */}
          {job.packageInfo && (
            <span className="flex items-center">
              <Package className="h-4 w-4 mr-1" />
              <Badge className={getPackageBadgeColor(job.packageInfo.packageType)}>
                {getPackageDisplayName(job.packageInfo.packageType)}
              </Badge>
              <span className="ml-2 text-gray-600">
                • {getPackageVisibilityDuration(job.packageInfo.packageType)} visibility
              </span>
              {job.packageInfo.listingsRemaining > 0 && (
                <span className="ml-2 text-gray-600">
                  • {job.packageInfo.listingsRemaining} credits remaining
                </span>
              )}
            </span>
          )}
        </div>
      </CardHeader>

      {showDetails && (
        <CardContent className="space-y-6">
          {/* Company Vetting Information */}
          {job.companyInfo && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Company Vetting Information
                {job.companyInfo.isVetted && (
                  <Badge className="ml-2 bg-purple-100 text-purple-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Vetted Company
                  </Badge>
                )}
              </h4>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {/* Company Details */}
                <div className="space-y-2">
                  <div><strong>Company:</strong> {job.companyInfo.companyName}</div>
                  {job.companyInfo.companyWebsite && (
                    <div><strong>Website:</strong>
                      <a href={job.companyInfo.companyWebsite} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-1">
                        {job.companyInfo.companyWebsite}
                      </a>
                    </div>
                  )}
                  {job.companyInfo.companyDescription && (
                    <div><strong>Description:</strong> {job.companyInfo.companyDescription}</div>
                  )}
                  {job.companyInfo.billingAddress && (
                    <div><strong>Billing Address:</strong> {job.companyInfo.billingAddress}</div>
                  )}
                  {job.companyInfo.taxId && (
                    <div><strong>Tax ID:</strong> {job.companyInfo.taxId}</div>
                  )}
                </div>

                {/* Account Information */}
                <div className="space-y-2">
                  <div><strong>Account Created:</strong> {new Date(job.companyInfo.createdAt).toLocaleDateString()}</div>
                  <div><strong>Last Updated:</strong> {new Date(job.companyInfo.updatedAt).toLocaleDateString()}</div>
                  {job.companyInfo.isVetted && job.companyInfo.vettedAt && (
                    <>
                      <div><strong>Vetted Date:</strong> {new Date(job.companyInfo.vettedAt).toLocaleDateString()}</div>
                      {job.companyInfo.vettedBy && (
                        <div><strong>Vetted By:</strong> {job.companyInfo.vettedBy}</div>
                      )}
                    </>
                  )}
                  <div><strong>Status:</strong>
                    <span className={`ml-1 px-2 py-1 rounded text-xs ${job.companyInfo.isSuspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                      {job.companyInfo.isSuspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Information */}
              <div className="mt-4 pt-4 border-t border-blue-200">
                <h5 className="font-medium text-blue-800 mb-2">Contact Information</h5>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div><strong>Name:</strong> {job.companyInfo.userInfo.name || 'Not provided'}</div>
                    <div><strong>Email:</strong> {job.companyInfo.userInfo.email || 'Not provided'}</div>
                    {job.companyInfo.userInfo.phone && (
                      <div><strong>Phone:</strong> {job.companyInfo.userInfo.phone}</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div><strong>First Name:</strong> {job.companyInfo.userInfo.firstName || 'Not provided'}</div>
                    <div><strong>Last Name:</strong> {job.companyInfo.userInfo.lastName || 'Not provided'}</div>
                    <div><strong>Last Active:</strong> {new Date(job.companyInfo.userInfo.lastActive).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              {/* Job Statistics */}
              <div className="mt-4 pt-4 border-t border-blue-200">
                <h5 className="font-medium text-blue-800 mb-2">Job Posting History</h5>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{job.companyInfo.jobStatistics.total}</div>
                    <div className="text-gray-600">Total Jobs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{job.companyInfo.jobStatistics.approved}</div>
                    <div className="text-gray-600">Approved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{job.companyInfo.jobStatistics.rejected}</div>
                    <div className="text-gray-600">Declined</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">{job.companyInfo.jobStatistics.pending}</div>
                    <div className="text-gray-600">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{job.companyInfo.jobStatistics.totalApplications || 0}</div>
                    <div className="text-gray-600">Applications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{job.companyInfo.jobStatistics.totalHires || 0}</div>
                    <div className="text-gray-600">Hires</div>
                  </div>
                </div>
                {job.companyInfo.jobStatistics.firstJobDate && (
                  <div className="mt-2 text-xs text-gray-600">
                    First job posted: {new Date(job.companyInfo.jobStatistics.firstJobDate).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Package History */}
              {job.companyInfo.packageHistory.length > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <h5 className="font-medium text-blue-800 mb-2">Package Purchase History</h5>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {job.companyInfo.packageHistory.map((pkg) => (
                      <div key={pkg.id} className="flex justify-between items-center text-xs bg-white p-2 rounded">
                        <span>{getPackageDisplayName(pkg.packageType)}</span>
                        <span>{pkg.listingsRemaining} credits remaining</span>
                        <span>{new Date(pkg.purchasedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quality Assessment */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center">
              Quality Assessment
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({getQualityScore()}% complete)
              </span>
            </h4>
            <div className="grid md:grid-cols-2 gap-3">
              {QUALITY_CHECKLIST.map((check) => (
                <label key={check.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qualityChecks[check.id] || false}
                    onChange={() => toggleQualityCheck(check.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{check.label}</span>
                  {check.weight === 'high' && (
                    <Badge variant="outline" className="text-xs">High Priority</Badge>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Job Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Job Description</h4>
              <div className="bg-gray-50 p-3 rounded text-sm max-h-40 overflow-y-auto">
                {job.description}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Requirements</h4>
              <div className="bg-gray-50 p-3 rounded text-sm max-h-40 overflow-y-auto">
                {job.requirements}
              </div>
            </div>
          </div>

          {/* Skills */}
          <div>
            <h4 className="font-semibold mb-2">Required Skills</h4>
            <div className="flex flex-wrap gap-2">
              {(job.skills || []).map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Benefits */}
          {job.benefits && (
            <div>
              <h4 className="font-semibold mb-2">Benefits & Perks</h4>
              <div className="bg-gray-50 p-3 rounded text-sm">
                {job.benefits}
              </div>
            </div>
          )}

          {/* Flagged Reasons */}
          {job.flaggedReasons && job.flaggedReasons.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Flagged Issues
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                {job.flaggedReasons.map((reason, index) => (
                  <li key={index}>• {reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Declination Feedback Display */}
          {job.status === 'rejected' && job.adminNotes && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                <XCircle className="h-4 w-4 mr-2" />
                Declination Feedback
              </h4>
              <div className="text-sm text-red-700 whitespace-pre-wrap">
                {job.adminNotes}
              </div>
              <div className="mt-3 flex items-center text-xs text-red-600">
                <RefreshCw className="h-3 w-3 mr-1" />
                Employer can edit and resubmit this job posting
              </div>
            </div>
          )}

          {/* Admin Notes */}
          <div>
            <Label htmlFor="adminNotes">Admin Notes</Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about this job posting..."
              rows={3}
            />
          </div>

          {/* Quick Actions Note */}
          {job.status !== 'rejected' && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Review Actions</h4>
              <p className="text-sm text-blue-700 mb-3">
                Use the action buttons below to approve, mark for review, or decline this job posting.
                The declination modal will guide you through providing detailed feedback to the employer.
              </p>
              <div className="text-xs text-blue-600">
                💡 Tip: Use "Mark Reviewing" to indicate you're actively reviewing this job before making a final decision.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`mailto:${job.employerEmail}`, '_blank')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Employer
              </Button>

              {job.companyWebsite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(job.companyWebsite, '_blank')}
                >
                  Visit Website
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {job.status === 'pending' || job.status === 'reviewing' ? (
                <>
                  {job.status === 'pending' && (
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange('reviewing')}
                      disabled={isLoading}
                      className="text-blue-600"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Mark Reviewing
                    </Button>
                  )}
                  <Button
                    onClick={() => handleStatusChange('approved')}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectionModal(true)}
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('reviewing')}
                  disabled={isLoading}
                >
                  Re-review
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}

      {/* Rejection Modal */}
      <JobRejectionModal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        onConfirm={handleRejection}
        jobTitle={job.title}
        companyName={job.companyName}
        employerEmail={job.employerEmail}
      />
    </Card>
  )
}