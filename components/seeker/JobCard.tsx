'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import { ShareJobIconButton } from '@/components/jobs/ShareJobButton'
import { getCategoryLabel, JOB_TYPES } from '@/lib/job-constants'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import {
  Building2,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  ExternalLink,
  Bookmark,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { JobSearchItem } from '@/lib/search'

interface JobCardProps {
  job: JobSearchItem & {
    companyLogoUrl?: string;
    employerId?: string;
    isFilled?: boolean;
    filledAt?: string;
    isArchived?: boolean;
    archivedAt?: string;
    isUnavailable?: boolean;
    applicationStatus?: {
      hasApplied: boolean
      status?: string
      appliedAt?: string
    }
  }
  onSave?: (jobId: string) => void
  isSaved?: boolean
  onJobSelect?: (job: JobSearchItem) => void
  isSaving?: boolean
}

export function JobCard({ job, onSave, isSaved = false, onJobSelect, isSaving = false }: JobCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(isSaved)

  // Update local state when isSaved prop changes
  React.useEffect(() => {
    setIsBookmarked(isSaved)
  }, [isSaved])

  const handleBookmark = (e: React.MouseEvent) => {
    if (isSaving) return
    e.preventDefault()
    e.stopPropagation()
    setIsBookmarked(!isBookmarked)
    if (onSave) {
      onSave(job.id)
    }
  }

  const formatPayRange = () => {
    if (job.payRange?.text) {
      return job.payRange.text
    }

    // Get salary type from job data, default to 'yearly' if not specified
    const salaryType = (job as any).salaryType || 'yearly'
    const salaryTypeText = salaryType === 'yearly' ? '/yr' :
      salaryType === 'monthly' ? '/mo' :
        salaryType === 'hourly' ? '/hr' : '/yr'

    if (job.payRange?.min && job.payRange?.max) {
      return `$${job.payRange.min.toLocaleString()}-${job.payRange.max.toLocaleString()}${salaryTypeText}`
    }
    if (job.payRange?.min) {
      return `$${job.payRange.min.toLocaleString()}+${salaryTypeText}`
    }
    return 'Competitive'
  }

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'recently'

    const date = new Date(dateString)
    const now = new Date()

    // Check if date is valid
    if (isNaN(date.getTime())) return 'recently'

    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'just now'
    if (diffInHours < 24) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`

    return date.toLocaleDateString()
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'full-time':
      case 'full_time':
        return 'bg-green-100 text-green-800'
      case 'part-time':
      case 'part_time':
        return 'bg-blue-100 text-blue-800'
      case 'project':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'Administrative': 'bg-orange-100 text-orange-800',
      'Marketing': 'bg-pink-100 text-pink-800',
      'Customer Service': 'bg-cyan-100 text-cyan-800',
      'Writing': 'bg-indigo-100 text-indigo-800',
      'Accounting': 'bg-emerald-100 text-emerald-800',
      'Design': 'bg-violet-100 text-violet-800',
      'Development': 'bg-blue-100 text-blue-800',
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (onJobSelect) {
      e.preventDefault()
      onJobSelect(job)
    }
  }

  const getApplicationStatusButton = () => {
    // Show "Job Archived" if job is archived
    if (job.isArchived) {
      return (
        <Badge variant="outline" className="text-gray-700 bg-gray-100 border-gray-300 px-3 py-1 cursor-default hover:bg-gray-100">
          📁 Archived
        </Badge>
      )
    }

    // Show "Position Filled" if job is filled
    if (job.isFilled) {
      return (
        <Badge className="text-red-700 bg-red-100 border-red-300 px-3 py-1">
          <XCircle className="h-3 w-3 mr-1" />
          Position Filled
        </Badge>
      )
    }

    if (!job.applicationStatus?.hasApplied) {
      return (
        <Button
          size="sm"
          className="flex items-center space-x-1 bg-brand-coral hover:bg-brand-coral/90 text-white"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            window.open(`/seeker/jobs/${job.id}`, '_blank')
          }}
        >
          <span>Apply Now</span>
        </Button>
      )
    }

    const status = job.applicationStatus.status?.toLowerCase()
    switch (status) {
      case 'pending':
        return (
          <Badge className="text-yellow-700 bg-yellow-100 border-yellow-300 px-3 py-1">
            <Clock className="h-3 w-3 mr-1" />
            Application Pending
          </Badge>
        )
      case 'reviewed':
        return (
          <Badge className="text-blue-700 bg-blue-100 border-blue-300 px-3 py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            Reviewed
          </Badge>
        )
      case 'interview':
        return (
          <Badge className="text-purple-700 bg-purple-100 border-purple-300 px-3 py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            Interview Scheduled
          </Badge>
        )
      case 'hired':
        return (
          <Badge className="text-green-700 bg-green-100 border-green-300 px-3 py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            Hired
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="text-red-700 bg-red-100 border-red-300 px-3 py-1">
            <XCircle className="h-3 w-3 mr-1" />
            Not Selected
          </Badge>
        )
      default:
        return (
          <Badge className="text-blue-700 bg-blue-100 border-blue-300 px-3 py-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            Applied
          </Badge>
        )
    }
  }

  return (
    <>
      <Link href={`/seeker/jobs/${job.id}`} onClick={handleCardClick}>
        <div className="relative">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 hover:border-brand-teal/50 bg-white">
            <CardHeader className="pb-2 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Company Logo */}
                  <CompanyLogo
                    companyLogoUrl={job.companyLogoUrl}
                    companyName={job.company}
                    size="sm"
                  />

                  {/* Job Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle
                          className="text-base leading-tight mb-0.5 text-gray-900 hover:text-brand-teal transition-colors"
                          dangerouslySetInnerHTML={{ __html: job.title }}
                        />
                        <CardDescription className="text-sm font-medium text-gray-700">
                          {job.company}
                        </CardDescription>
                      </div>

                      {/* Action Buttons - Hide for filled jobs */}
                      {!job.isFilled && (
                        <div className="flex items-start justify-end space-x-1 ml-2 flex-shrink-0 mt-2">
                          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <ShareJobIconButton jobId={job.id} jobTitle={job.title} />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBookmark}
                            className="hover:bg-brand-teal-light"
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin text-brand-teal" />
                            ) : (
                              <Bookmark
                                className={`h-4 w-4 ${isBookmarked ? 'fill-current text-brand-teal' : 'text-gray-400 hover:text-brand-teal'}`}
                              />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Job Meta - Compact single line */}
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-brand-teal" />
                        <span>{job.location || 'Remote'}</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3 text-brand-coral" />
                        <span className="font-medium">{formatPayRange()}</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <span>Posted {formatTimeAgo(job.postedDate)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-3">
              {/* Job Description */}
              <MarkdownRenderer
                content={job.description}
                className="text-gray-600 text-xs mb-2 line-clamp-2 leading-relaxed"
                disableLinks={true}
                inline
              />

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-2">
                {job.type && (
                  <Badge className={getTypeColor(job.type)} variant="secondary">
                    {JOB_TYPES.find(t => t.value.toLocaleLowerCase() === job.type!.replace('_', '-').toLocaleLowerCase())?.label || job.type.replace('-', ' ')}
                  </Badge>
                )}

                <Badge className={getCategoryColor(job.category)} variant="secondary">
                  {getCategoryLabel(job.category)}
                </Badge>

                {job.isFlexible && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200" variant="secondary">
                    Flexible Hours
                  </Badge>
                )}
              </div>

              {/* Skills */}
              <div className="mb-2">
                <div className="flex flex-wrap gap-1">
                  {(job.skills || []).slice(0, 3).map((skill: string, index: number) => (
                    <span
                      key={index}
                      className="inline-block px-1.5 py-0.5 text-xs bg-brand-teal-light text-brand-teal rounded-md border border-brand-teal/20"
                    >
                      {skill}
                    </span>
                  ))}
                  {(job.skills || []).length > 3 && (
                    <span className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-md border border-gray-200">
                      +{(job.skills || []).length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                {getApplicationStatusButton()}

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1 border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // Handle view details
                    window.open(`/seeker/jobs/${job.id}`, '_blank')
                  }}
                >
                  <span>View Details</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </Link>

    </>
  )
}
