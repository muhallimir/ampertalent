'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import { ShareJobIconButton } from '@/components/jobs/ShareJobButton'
import { JOB_TYPES } from '@/lib/job-constants'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import {
  MapPin,
  Clock,
  DollarSign,
  Users,
  Eye,
  Calendar,
  Star,
  Zap,
  Building,
  Bookmark,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'

interface FeaturedJob {
  id: string
  title: string
  company: string
  companyLogo?: string
  companyWebsite?: string
  location: string
  type: string
  experienceLevel?: string
  salaryMin?: number
  salaryMax?: number
  salaryText?: string
  salaryType?: string
  description: string
  skills: string[]
  benefits?: string
  requirements?: string
  applicationCount: number
  viewsCount: number
  createdAt: string
  expiresAt?: string
  category: string
  isFeatured: boolean
  isEmailBlast: boolean
  featuredType: 'featured' | 'email_blast' | null
  emailBlastExpiresAt?: string
}

interface FeaturedJobCardProps {
  job: FeaturedJob
  onJobSelect: (job: FeaturedJob) => void
  onSave?: (jobId: string) => void
  isSaved?: boolean
  hasApplied?: boolean
  applicationStatus?: 'pending' | 'reviewed' | 'interview' | 'rejected' | 'hired'
  isSaving?: boolean
}

export function FeaturedJobCard({ job, onJobSelect, onSave, isSaved = false, hasApplied = false, applicationStatus, isSaving = false }: FeaturedJobCardProps) {
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

  const formatSalary = (min?: number, max?: number, type?: string, text?: string) => {
    if (text) return text
    if (!min && !max) return 'Salary not specified'

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    })

    const period = type === 'hourly' ? '/hr' : type === 'monthly' ? '/mo' : '/yr'

    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)} ${period}`
    } else if (min) {
      return `${formatter.format(min)}+ ${period}`
    } else if (max) {
      return `Up to ${formatter.format(max)} ${period}`
    }

    return 'Salary not specified'
  }

  const getDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const getApplicationStatusBadge = () => {
    if (!hasApplied || !applicationStatus) return null

    switch (applicationStatus) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 px-3 py-1 ml-2">
            <Clock className="h-3 w-3 mr-1" />
            Application Pending
          </Badge>
        )
      case 'reviewed':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 px-3 py-1 ml-2">
            <CheckCircle className="h-3 w-3 mr-1" />
            Reviewed
          </Badge>
        )
      case 'interview':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 px-3 py-1 ml-2">
            <CheckCircle className="h-3 w-3 mr-1" />
            Interview Scheduled
          </Badge>
        )
      case 'hired':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300 px-3 py-1 ml-2">
            <CheckCircle className="h-3 w-3 mr-1" />
            Hired
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 px-3 py-1 ml-2">
            <XCircle className="h-3 w-3 mr-1" />
            Not Selected
          </Badge>
        )
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1 ml-2">
            <CheckCircle className="h-3 w-3 mr-1" />
            Applied
          </Badge>
        )
    }
  }

  const getFeaturedBadge = () => {
    if (job.isEmailBlast) {
      const daysLeft = getDaysRemaining(job.emailBlastExpiresAt)
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200">
          <Zap className="h-3 w-3 mr-1" />
          Solo Email Blast {daysLeft !== null && `(${daysLeft}d left)`}
        </Badge>
      )
    } else if (job.isFeatured) {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
          <Star className="h-3 w-3 mr-1" />
          Featured Job
        </Badge>
      )
    }
    return null
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500 relative overflow-hidden">
      {/* Featured gradient background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-100/50 to-transparent pointer-events-none" />

      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CompanyLogo
                companyLogoUrl={job.companyLogo}
                companyName={job.company}
                size="sm"
              />
              <div>
                <h3
                  className="text-lg font-semibold text-gray-900 hover:text-purple-600 cursor-pointer"
                  dangerouslySetInnerHTML={{ __html: job.title }}
                />

                <div className="flex items-center text-gray-600">
                  <Building className="h-4 w-4 mr-1" />
                  <span className="font-medium">{job.company}</span>
                  {job.companyWebsite && (
                    <a
                      href={job.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-purple-600 hover:text-purple-800 text-sm"
                    >
                      Visit Website
                    </a>
                  )}
                </div>
              </div>
            </div>

            {getFeaturedBadge()}

            {getApplicationStatusBadge()}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
            <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <ShareJobIconButton jobId={job.id} jobTitle={job.title} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmark}
              className="hover:bg-purple-100"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
              ) : (
                <Bookmark
                  className={`h-4 w-4 ${isBookmarked ? 'fill-current text-purple-600' : 'text-gray-400 hover:text-purple-600'}`}
                />
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-2">
          <span className="flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            {job.location}
          </span>
          <span className="text-gray-400">•</span>
          <span className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {JOB_TYPES.find(t => t.value === job.type)?.label || job.type} {job.experienceLevel && `• ${job.experienceLevel}`}
          </span>
          <span className="text-gray-400">•</span>
          <span className="flex items-center">
            <DollarSign className="h-3 w-3 mr-1" />
            {formatSalary(job.salaryMin, job.salaryMax, job.salaryType, job.salaryText)}
          </span>
        </div>

        <MarkdownRenderer
          content={job.description.length > 200
            ? `${job.description.substring(0, 200)}...`
            : job.description
          }
          className="text-gray-700 mb-2 line-clamp-2 text-sm"
          inline
          disableLinks={true}
        />

        <div className="flex flex-wrap gap-1 mb-2">
          {job.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
              +{job.skills.length - 4} more
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-xs text-gray-600">
            <span className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {job.applicationCount}
            </span>
            <span className="text-gray-400">•</span>
            <span className="flex items-center">
              <Eye className="h-3 w-3 mr-1" />
              {job.viewsCount}
            </span>
            <span className="text-gray-400">•</span>
            <span className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(job.createdAt).toLocaleDateString()}
            </span>
          </div>

          <Button
            onClick={() => onJobSelect(job)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            View Details
          </Button>
        </div>

        {job.isEmailBlast && (
          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
            <p className="text-xs text-orange-800">
              <Zap className="h-3 w-3 inline mr-1" />
              <strong>Solo Email Blast:</strong> Sent to entire database for maximum visibility.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
