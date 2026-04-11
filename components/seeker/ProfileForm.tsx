'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SkillsSelector } from '@/components/common/SkillsSelector'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProfilePictureUpload } from '@/components/common/ProfilePictureUpload'
import { RichTextEditor } from '@/components/common/RichTextEditor'
import { EducationSection, EducationEntry } from '@/components/seeker/EducationSection'
import { Save, User, Briefcase, Globe, Clock, GraduationCap, Building } from 'lucide-react'

const CLEAR_SELECT_VALUE = '__clear__'

const educationSchema = z.object({
  id: z.string(),
  institution: z.string().min(1, 'Institution is required').max(200, 'Institution must be less than 200 characters'),
  certifications: z.string().min(1, 'Certifications are required').max(300, 'Certifications must be less than 300 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
}).refine((data) => {
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) >= new Date(data.startDate)
  }
  return true
}, {
  message: 'End date must be after start date',
  path: ['endDate']
})

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  headline: z.string().min(1, 'Headline is required').max(100, 'Headline must be less than 100 characters'),
  professionalSummary: z.string().max(2000, 'Professional summary must be less than 2000 characters').optional(),
  availability: z.string().min(1, 'Availability is required'),
  salaryExpectations: z.string().optional(),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  portfolioUrls: z.array(z.string().url('Invalid URL')).optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  workExperience: z.string().max(5000, 'Work experience must be less than 5000 characters').optional(),
  education: z.array(educationSchema).max(10, 'Maximum 10 education entries allowed').optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileFormProps {
  initialData?: Partial<ProfileFormData> & {
    name?: string
    firstName?: string
    lastName?: string
    salaryExpectations?: string
    profilePictureUrl?: string
    workExperience?: string
    professionalSummary?: string
    education?: EducationEntry[]
  }
  onSubmit: (data: ProfileFormData) => Promise<void>
}

export function ProfileForm({ initialData, onSubmit }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>(initialData?.portfolioUrls || [''])
  const [education, setEducation] = useState<EducationEntry[]>(
    initialData?.education || []
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      headline: initialData?.headline || '',
      professionalSummary: initialData?.professionalSummary || '',
      availability: initialData?.availability || '',
      salaryExpectations: initialData?.salaryExpectations || '',
      skills: initialData?.skills || [],
      portfolioUrls: initialData?.portfolioUrls || [],
      timezone: initialData?.timezone || 'America/Chicago',
      workExperience: initialData?.workExperience || '',
      education: initialData?.education || [],
    },
  })

  useEffect(() => {
    if (initialData) {
      reset({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        headline: initialData.headline || '',
        professionalSummary: initialData.professionalSummary || '',
        availability: initialData.availability || '',
        salaryExpectations: initialData.salaryExpectations || '',
        skills: initialData.skills || [],
        portfolioUrls: initialData.portfolioUrls || [],
        timezone: initialData.timezone || 'America/Chicago',
        workExperience: initialData.workExperience || '',
        education: initialData.education || [],
      })
    }
  }, [initialData, reset])

  const skills = watch('skills')

  const handleFormSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    try {
      await onSubmit({
        ...data,
        portfolioUrls: portfolioUrls.filter(url => url.trim() !== ''),
        education: education,
      })
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addPortfolioUrl = () => {
    setPortfolioUrls([...portfolioUrls, ''])
  }

  const updatePortfolioUrl = (index: number, value: string) => {
    const updated = [...portfolioUrls]
    updated[index] = value
    setPortfolioUrls(updated)
    setValue('portfolioUrls', updated.filter(url => url.trim() !== ''))
  }

  const removePortfolioUrl = (index: number) => {
    const updated = portfolioUrls.filter((_, i) => i !== index)
    setPortfolioUrls(updated)
    setValue('portfolioUrls', updated.filter(url => url.trim() !== ''))
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Basic Information</span>
          </CardTitle>
          <CardDescription>
            Tell employers about yourself and what you&apos;re looking for
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfilePictureUpload
            currentImageUrl={initialData?.profilePictureUrl}
            userName={`${initialData?.firstName || ''} ${initialData?.lastName || ''}`.trim() || initialData?.name || 'User'}
            onImageUpdate={(imageUrl: string | null) => {
              // Profile picture is handled separately via the component's API calls
              console.log('Profile picture updated:', imageUrl)
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="Enter your first name"
                {...register('firstName')}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Enter your last name"
                {...register('lastName')}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="headline">Professional Headline</Label>
            <Input
              id="headline"
              placeholder="e.g., Virtual Administrative Assistant with 5+ years experience"
              {...register('headline')}
            />
            {errors.headline && (
              <p className="text-sm text-red-600 mt-1">{errors.headline.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="professionalSummary">Professional Summary</Label>
            <Textarea
              id="professionalSummary"
              placeholder="A professional summary that includes your career title, years of experience, key skills, and career goals. This helps employers quickly understand your background."
              rows={4}
              {...register('professionalSummary')}
            />
            {errors.professionalSummary && (
              <p className="text-sm text-red-600 mt-1">{errors.professionalSummary.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Optional: Share your career highlights, remote work skills, and what makes you a great candidate.
            </p>
          </div>

          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Controller
              name="timezone"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(value) => field.onChange(value === CLEAR_SELECT_VALUE ? '' : value)}
                >
                  <SelectTrigger className="w-full p-2 border border-gray-300">
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii Time (HT)</SelectItem>
                    <SelectItem value={CLEAR_SELECT_VALUE}>Clear selection</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.timezone && (
              <p className="text-sm text-red-600 mt-1">{errors.timezone.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Work Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Work Preferences</span>
          </CardTitle>
          <CardDescription>
            Let employers know your availability and work style
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="availability">Availability</Label>
            <Controller
              name="availability"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(value) => field.onChange(value === CLEAR_SELECT_VALUE ? '' : value)}
                >
                  <SelectTrigger className="w-full p-2 border border-gray-300">
                    <SelectValue placeholder="Select your availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time (40+ hours/week)">Full-time (40+ hours/week)</SelectItem>
                    <SelectItem value="Part-time (20-39 hours/week)">Part-time (20-39 hours/week)</SelectItem>
                    <SelectItem value="Part-time (10-19 hours/week)">Part-time (10-19 hours/week)</SelectItem>
                    <SelectItem value="Part-time (Under 10 hours/week)">Part-time (Under 10 hours/week)</SelectItem>
                    <SelectItem value="Project-based">Project-based</SelectItem>
                    <SelectItem value="Flexible hours">Flexible hours</SelectItem>
                    <SelectItem value={CLEAR_SELECT_VALUE}>Clear selection</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.availability && (
              <p className="text-sm text-red-600 mt-1">{errors.availability.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="salaryExpectations">Salary Expectations</Label>
            <Controller
              name="salaryExpectations"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(value) => field.onChange(value === CLEAR_SELECT_VALUE ? '' : value)}
                >
                  <SelectTrigger className="w-full p-2 border border-gray-300">
                    <SelectValue placeholder="Select your salary expectations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="$15-20/hour">$15-20/hour</SelectItem>
                    <SelectItem value="$20-25/hour">$20-25/hour</SelectItem>
                    <SelectItem value="$25-30/hour">$25-30/hour</SelectItem>
                    <SelectItem value="$30-35/hour">$30-35/hour</SelectItem>
                    <SelectItem value="$35-40/hour">$35-40/hour</SelectItem>
                    <SelectItem value="$40-50/hour">$40-50/hour</SelectItem>
                    <SelectItem value="$50-60/hour">$50-60/hour</SelectItem>
                    <SelectItem value="$60-75/hour">$60-75/hour</SelectItem>
                    <SelectItem value="$75-100/hour">$75-100/hour</SelectItem>
                    <SelectItem value="$100+/hour">$100+/hour</SelectItem>
                    <SelectItem value="$30,000-40,000/year">$30,000-40,000/year</SelectItem>
                    <SelectItem value="$40,000-50,000/year">$40,000-50,000/year</SelectItem>
                    <SelectItem value="$50,000-60,000/year">$50,000-60,000/year</SelectItem>
                    <SelectItem value="$60,000-70,000/year">$60,000-70,000/year</SelectItem>
                    <SelectItem value="$70,000-80,000/year">$70,000-80,000/year</SelectItem>
                    <SelectItem value="$80,000-100,000/year">$80,000-100,000/year</SelectItem>
                    <SelectItem value="$100,000+/year">$100,000+/year</SelectItem>
                    <SelectItem value="Negotiable">Negotiable</SelectItem>
                    <SelectItem value={CLEAR_SELECT_VALUE}>Clear selection</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.salaryExpectations && (
              <p className="text-sm text-red-600 mt-1">{errors.salaryExpectations.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5" />
            <span>Skills & Expertise</span>
          </CardTitle>
          <CardDescription>
            Add your skills to help employers find you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SkillsSelector
            selectedSkills={skills}
            onSkillsChange={(newSkills) => setValue('skills', newSkills)}
          />
          {errors.skills && (
            <p className="text-sm text-red-600 mt-2">{errors.skills.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Portfolio URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Portfolio & Links</span>
          </CardTitle>
          <CardDescription>
            Add links to your portfolio, LinkedIn, or other professional profiles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {portfolioUrls.map((url, index) => (
            <div key={index} className="flex space-x-2">
              <Input
                placeholder="https://linkedin.com/in/yourname"
                value={url}
                onChange={(e) => updatePortfolioUrl(index, e.target.value)}
              />
              {portfolioUrls.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removePortfolioUrl(index)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addPortfolioUrl}
            className="w-full"
          >
            Add Another Link
          </Button>
        </CardContent>
      </Card>

      {/* Work Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Work Experience</span>
          </CardTitle>
          <CardDescription>
            Describe your work experience and achievements (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RichTextEditor
            value={watch('workExperience') || ''}
            onChange={(value) => setValue('workExperience', value)}
            placeholder="Describe your work experience, key achievements, and relevant projects..."
            height={300}
            maxLength={5000}
          />
          {errors.workExperience && (
            <p className="text-sm text-red-600 mt-2">{errors.workExperience.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GraduationCap className="h-5 w-5" />
            <span>Education</span>
          </CardTitle>
          <CardDescription>
            Add your educational background and certifications (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EducationSection
            education={education}
            onChange={setEducation}
            errors={errors as any}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
