'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ImageUpload } from '@/components/common/ImageUpload'
import { Save, Building2, Globe, FileText, Wallet, Heart } from 'lucide-react'

const companySchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(100, 'Company name must be less than 100 characters'),
  companyWebsite: z.string()
    .refine((val) => {
      if (!val || val.trim() === '') return true
      // Add https:// if not present for validation
      const urlToValidate = val.startsWith('http://') || val.startsWith('https://')
        ? val
        : `https://${val}`
      try {
        new URL(urlToValidate)
        return true
      } catch {
        return false
      }
    }, 'Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
  companyDescription: z.string().min(50, 'Company description must be at least 50 characters').max(2000, 'Description must be less than 2000 characters'),
  companyLogoUrl: z.string().optional(),
  missionStatement: z.string().max(1000, 'Mission statement must be less than 1000 characters').optional().or(z.literal('')),
  coreValues: z.string().max(1000, 'Core values must be less than 1000 characters').optional().or(z.literal('')),
  billingAddress: z.string().max(500, 'Billing address must be less than 500 characters').optional().or(z.literal('')),
  taxId: z.string().max(50, 'Tax ID must be less than 50 characters').optional().or(z.literal('')),
})

type CompanyFormData = z.infer<typeof companySchema>

interface CompanyFormProps {
  initialData?: Partial<CompanyFormData>
  onSubmit: (data: CompanyFormData) => Promise<void>
}

export function CompanyForm({ initialData, onSubmit }: CompanyFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(initialData?.companyLogoUrl || '')
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  // Sync logoUrl with initialData changes
  useEffect(() => {
    if (initialData?.companyLogoUrl !== undefined) {
      setLogoUrl(initialData.companyLogoUrl || '')
    }
  }, [initialData?.companyLogoUrl])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: initialData?.companyName || '',
      companyWebsite: initialData?.companyWebsite || '',
      companyDescription: initialData?.companyDescription || '',
      companyLogoUrl: initialData?.companyLogoUrl || '',
      missionStatement: initialData?.missionStatement || '',
      coreValues: initialData?.coreValues || '',
      billingAddress: initialData?.billingAddress || '',
      taxId: initialData?.taxId || '',
    },
  })

  // Helper function to normalize URL by adding https:// if needed
  const normalizeUrl = (url: string | undefined): string => {
    if (!url || url.trim() === '') return ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    return `https://${url}`
  }

  const handleFormSubmit = async (data: CompanyFormData) => {
    setIsLoading(true)
    try {
      await onSubmit({
        ...data,
        companyWebsite: normalizeUrl(data.companyWebsite),
        companyLogoUrl: logoUrl,
      })
    } catch (error) {
      console.error('Error saving company profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogoUploadComplete = async (logoUrl: string) => {
    setLogoUrl(logoUrl)
    setValue('companyLogoUrl', logoUrl)

    // If logoUrl is empty, it means user is removing the logo
    if (logoUrl === '') {
      try {
        // Immediately save the removal to database
        await onSubmit({
          companyName: watch('companyName'),
          companyWebsite: normalizeUrl(watch('companyWebsite')),
          companyDescription: watch('companyDescription'),
          companyLogoUrl: '',
          missionStatement: watch('missionStatement'),
          coreValues: watch('coreValues'),
          billingAddress: watch('billingAddress'),
          taxId: watch('taxId')
        })
        setUploadSuccess('Company logo removed successfully! Your profile has been updated.')
      } catch (error) {
        console.error('Error removing logo:', error)
        setUploadSuccess('Failed to remove logo. Please try again or contact support if the problem persists.')
      }
    } else {
      setUploadSuccess('Company logo uploaded successfully! Make sure to save your profile to keep all changes.')
    }

    // Clear success message after 5 seconds (longer to ensure user sees the message)
    setTimeout(() => {
      setUploadSuccess(null)
    }, 5000)
  }

  const getCompletionPercentage = () => {
    const data = watch()
    const fields = [
      data.companyName,
      data.companyWebsite,
      data.companyDescription,
      logoUrl,
      data.missionStatement,
      data.coreValues,
      data.billingAddress,
      data.taxId,
    ]

    const completedFields = fields.filter(field =>
      field && field.trim() !== ''
    ).length

    return Math.round((completedFields / fields.length) * 100)
  }

  const completionPercentage = getCompletionPercentage()

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Company Profile Completion</span>
          </CardTitle>
          <CardDescription>
            {completionPercentage === 100 
              ? 'Your company profile is complete!'
              : `Your profile is ${completionPercentage}% complete. Complete all sections to attract the best candidates.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">{completionPercentage}% complete</p>
        </CardContent>
      </Card>

      {/* Company Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Company Logo</span>
          </CardTitle>
          <CardDescription>
            Upload your company logo to make your job postings stand out
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            currentImageUrl={logoUrl}
            onUploadComplete={handleLogoUploadComplete}
            acceptedTypes={['image/jpeg', 'image/png', 'image/svg+xml']}
            maxSize={2 * 1024 * 1024} // 2MB
            aspectRatio="square"
            placeholder="Upload company logo"
            fileType="logo"
            objectFit="contain"
          />
          {uploadSuccess && (
            <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-md shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-semibold text-green-900 mb-1">Success!</p>
                  <p className="text-sm text-green-800">{uploadSuccess}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Company Information</span>
          </CardTitle>
          <CardDescription>
            Tell job seekers about your company and what makes it a great place to work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              placeholder="e.g., Acme Corporation"
              {...register('companyName')}
            />
            {errors.companyName && (
              <p className="text-sm text-red-600 mt-1">{errors.companyName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="companyWebsite">Company Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="companyWebsite"
                placeholder="https://www.yourcompany.com"
                className="pl-10"
                {...register('companyWebsite')}
              />
            </div>
            {errors.companyWebsite && (
              <p className="text-sm text-red-600 mt-1">{errors.companyWebsite.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="companyDescription">Company Description *</Label>
            <Textarea
              id="companyDescription"
              placeholder="Describe your company, mission, values, and what makes it a great place to work remotely..."
              rows={6}
              {...register('companyDescription')}
            />
            {errors.companyDescription && (
              <p className="text-sm text-red-600 mt-1">{errors.companyDescription.message}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {watch('companyDescription')?.length || 0}/2000 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Company Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5" />
            <span>Company Identity</span>
          </CardTitle>
          <CardDescription>
            Share your company's mission and core values with potential candidates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="missionStatement">Mission Statement</Label>
            <Textarea
              id="missionStatement"
              placeholder="What is your company's mission and purpose?..."
              rows={4}
              {...register('missionStatement')}
            />
            {errors.missionStatement && (
              <p className="text-sm text-red-600 mt-1">{errors.missionStatement.message}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {watch('missionStatement')?.length || 0}/1000 characters
            </p>
          </div>

          <div>
            <Label htmlFor="coreValues">Core Values</Label>
            <Textarea
              id="coreValues"
              placeholder="What are your company's core values and principles?..."
              rows={4}
              {...register('coreValues')}
            />
            {errors.coreValues && (
              <p className="text-sm text-red-600 mt-1">{errors.coreValues.message}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {watch('coreValues')?.length || 0}/1000 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Billing Information</span>
          </CardTitle>
          <CardDescription>
            Optional business details for invoicing and tax purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="billingAddress">Billing Address</Label>
            <Textarea
              id="billingAddress"
              placeholder="Enter your company's billing address..."
              rows={3}
              {...register('billingAddress')}
            />
            {errors.billingAddress && (
              <p className="text-sm text-red-600 mt-1">{errors.billingAddress.message}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Used for invoicing and business verification
            </p>
          </div>

          <div>
            <Label htmlFor="taxId">Tax ID / EIN</Label>
            <Input
              id="taxId"
              placeholder="e.g., 12-3456789"
              {...register('taxId')}
            />
            {errors.taxId && (
              <p className="text-sm text-red-600 mt-1">{errors.taxId.message}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Your company's tax identification number (optional)
            </p>
          </div>
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
              Save Company Profile
            </>
          )}
        </Button>
      </div>

      {/* Profile Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Tips</CardTitle>
          <CardDescription>
            Make your company profile attractive to remote workers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
              <div>
                <p className="font-medium">Highlight remote-first culture</p>
                <p className="text-sm text-gray-600">
                  Emphasize your commitment to remote work and flexible schedules
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
              <div>
                <p className="font-medium">Showcase company values</p>
                <p className="text-sm text-gray-600">
                  Mention work-life balance, family-friendly policies, and growth opportunities
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
              <div>
                <p className="font-medium">Include team collaboration tools</p>
                <p className="text-sm text-gray-600">
                  List the tools and technologies your remote team uses
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
              <div>
                <p className="font-medium">Add a professional logo</p>
                <p className="text-sm text-gray-600">
                  A clear, professional logo helps build trust with potential candidates
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}