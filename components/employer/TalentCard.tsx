'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Clock, Eye, UserPlus, FileText, Star, MapPin, Calendar, Check } from 'lucide-react'
import { useState } from 'react'

interface TalentProfile {
  id: string
  name: string
  firstName: string | null
  lastName: string | null
  headline: string | null
  aboutMe: string | null
  availability: string | null
  salaryExpectations: string | null
  showSalaryExpectations: boolean
  skills: string[]
  profilePictureUrl: string | null
  membershipPlan: string
  portfolioUrls: string[]
  hasResume: boolean
  joinedAt: string
  applicationStatus: string | null
  jobStatus: string | null
  jobTitle: string | null
}

interface TalentCardProps {
  talent: TalentProfile
  onViewProfile: (talentId: string) => void
  onInvite: (talentId: string) => void
  isInvited?: boolean
}

export function TalentCard({ talent, onViewProfile, onInvite, isInvited = false }: TalentCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Format join date
  const joinDate = new Date(talent.joinedAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  })

  // Get membership plan display
  const getMembershipDisplay = (plan: string) => {
    switch (plan) {
      case 'gold_bimonthly': return { label: 'Gold', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
      case 'vip_quarterly': return { label: 'VIP', color: 'bg-purple-100 text-purple-800 border-purple-200' }
      case 'annual_platinum': return { label: 'Platinum', color: 'bg-gray-100 text-gray-800 border-gray-200' }
      default: return null
    }
  }

  // Get application status display
  const getApplicationStatusDisplay = (status: string | null, jobStatus: string | null) => {
    if (!status) return null

    switch (status) {
      case 'hired':
        return {
          label: 'Hired',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: '✓'
        }
      case 'interview':
        if (jobStatus === 'expired' || jobStatus === 'filled') {
          return {
            label: 'Past Interview',
            color: 'bg-gray-100 text-gray-600 border-gray-200',
            icon: '◐'
          }
        }
        return {
          label: 'Interview',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '◉'
        }
      case 'reviewed':
        return {
          label: 'Reviewed',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: '◎'
        }
      case 'pending':
        return {
          label: 'Applied',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '○'
        }
      case 'rejected':
        return {
          label: 'Declined',
          color: 'bg-red-100 text-red-600 border-red-200',
          icon: '✕'
        }
      default:
        return null
    }
  }

  const membershipInfo = getMembershipDisplay(talent.membershipPlan)
  const applicationStatusInfo = getApplicationStatusDisplay(talent.applicationStatus, talent.jobStatus)

  return (
    <Card
      className="group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border shadow-sm bg-white overflow-hidden h-full flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onViewProfile(talent.id)}
    >
      {/* Compact Header */}
      <CardHeader className="pb-3 p-4 bg-gradient-to-r from-brand-teal/5 to-brand-coral/5 relative">
        {/* Status badges - top right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {/* Application Status Badge */}
          {applicationStatusInfo && (
            <Badge
              className={`text-xs font-medium ${applicationStatusInfo.color} border`}
              title={talent.jobTitle ? `${applicationStatusInfo.label} for "${talent.jobTitle}"` : applicationStatusInfo.label}
            >
              <span className="mr-1">{applicationStatusInfo.icon}</span>
              {applicationStatusInfo.label}
            </Badge>
          )}

          {/* Membership badge */}
          {membershipInfo && (
            <Badge className={`text-xs font-medium ${membershipInfo.color} border`}>
              <Star className="h-2.5 w-2.5 mr-1" />
              {membershipInfo.label}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-1 ring-white shadow">
              <AvatarImage
                src={talent.profilePictureUrl || ''}
                alt={talent.name}
                onLoad={() => setImageLoaded(true)}
                className={`transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
              <AvatarFallback className="bg-gradient-to-br from-brand-teal to-brand-coral text-white text-sm font-semibold">
                {talent.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {talent.hasResume && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full p-0.5">
                <FileText className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-bold text-gray-900 truncate group-hover:text-brand-teal transition-colors">
              {talent.firstName && talent.lastName
                ? `${talent.firstName} ${talent.lastName}`
                : talent.name
              }
            </CardTitle>
            {talent.headline && (
              <p className="text-xs text-gray-600 truncate font-medium mt-0.5">{talent.headline}</p>
            )}
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <Calendar className="h-2.5 w-2.5 mr-1" />
              <span>Joined {joinDate}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 p-4">
        {/* Content area that grows to fill space */}
        <div className="flex-1 space-y-3">
          {/* About Me Preview - More compact */}
          {talent.aboutMe && (
            <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
              {talent.aboutMe}
            </p>
          )}

          {/* Key Info Row - More compact */}
          <div className="flex items-center justify-between text-xs min-h-[20px]">
            {/* Availability */}
            {talent.availability && (
              <div className="flex items-center text-gray-600 bg-gray-50 px-2 py-1 rounded-full">
                <Clock className="h-2.5 w-2.5 mr-1" />
                <span className="font-medium">{talent.availability}</span>
              </div>
            )}

            {/* Salary Expectations */}
            {talent.salaryExpectations && talent.showSalaryExpectations && (
              <div className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <span className="font-semibold">💰 {talent.salaryExpectations}</span>
              </div>
            )}
          </div>

          {/* Skills - More compact with consistent height */}
          <div className="min-h-[32px] flex items-start">
            {(talent.skills || []).length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {(talent.skills || []).slice(0, 3).map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs font-medium bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 transition-colors px-2 py-0.5"
                  >
                    {skill}
                  </Badge>
                ))}
                {(talent.skills || []).length > 3 && (
                  <Badge variant="outline" className="text-xs text-gray-500 px-2 py-0.5">
                    +{(talent.skills || []).length - 3}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic">No skills listed</div>
            )}
          </div>

          {/* Compact indicators with consistent height */}
          <div className="flex items-center justify-between text-xs min-h-[16px]">
            {talent.portfolioUrls.length > 0 ? (
              <div className="flex items-center text-blue-600">
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8zM16 10h.01" />
                </svg>
                <span>Portfolio</span>
              </div>
            ) : (
              <div></div>
            )}
          </div>
        </div>

        {/* Action Buttons - Always at bottom */}
        <div className="flex space-x-2 pt-3 mt-auto">
          <Button
            variant="outline"
            size="sm"
            className={`flex-1 text-xs font-medium transition-all duration-200 py-1.5 ${isHovered ? 'border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white' : ''
              }`}
            onClick={(e) => {
              e.stopPropagation()
              onViewProfile(talent.id)
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button
            size="sm"
            className={`flex-1 text-xs font-medium transition-all duration-200 py-1.5 ${isInvited
                ? 'bg-gray-200 text-gray-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-brand-coral to-brand-coral/90 hover:from-brand-coral/90 hover:to-brand-coral text-white'
              } ${isHovered && !isInvited ? 'scale-105' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              if (!isInvited) {
                onInvite(talent.id)
              }
            }}
            disabled={isInvited}
          >
            {isInvited ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Invited
              </>
            ) : (
              <>
                <UserPlus className="h-3 w-3 mr-1" />
                Invite
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
