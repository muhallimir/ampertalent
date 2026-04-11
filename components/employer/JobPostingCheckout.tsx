'use client'

import { useState, useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { JOB_PACKAGES, JobPackage } from './PackageSelection'
import { CreditConfirmation } from './CreditConfirmation'
import {
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Building,
  User,
  Globe,
  Lock,
  CheckCircle,
  Coins,
  AlertTriangle
} from 'lucide-react'
import { getWithImpersonation } from '@/lib/api-client'

const checkoutSchema = z.object({
  // Billing Details
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  streetAddress: z.string().min(1, 'Street address is required'),
  apartment: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'ZIP code is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Please enter a valid email address'),
  orderNotes: z.string().optional(),
  hearAboutUs: z.string().optional(),
  
  // Payment Details
  paymentMethod: z.enum(['credit_card', 'paypal']),
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
  cardName: z.string().optional(),
  
  // Terms
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  })
}).refine((data) => {
  if (data.paymentMethod === 'credit_card') {
    return data.cardNumber && data.expiryDate && data.cvv && data.cardName
  }
  return true
}, {
  message: 'Credit card details are required',
  path: ['cardNumber']
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

interface CreditInfo {
  total: number
  hasCredits: boolean
  packages: Array<{
    id: string
    type: string
    creditsRemaining: number
    expiresAt: string | null
    isExpiringSoon: boolean
  }>
}

interface JobPostingCheckoutProps {
  selectedPackage: string
  jobTitle: string
  onSubmit: (data: CheckoutFormData) => Promise<void>
  onBack: () => void
  initialData?: {
    firstName?: string
    lastName?: string
    companyName?: string
    email?: string
    phone?: string
  }
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
]

const HEAR_ABOUT_OPTIONS = [
  'Google Search',
  'Social Media (Facebook, LinkedIn, etc.)',
  'Referral from a friend/colleague',
  'Industry publication/website',
  'Email newsletter',
  'Advertisement',
  'Other'
]

const CLEAR_SELECT_VALUE = '__clear__'

export function JobPostingCheckout({ selectedPackage, jobTitle, onSubmit, onBack, initialData }: JobPostingCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null)
  const [isLoadingCredits, setIsLoadingCredits] = useState(true)
  const [showCreditConfirmation, setShowCreditConfirmation] = useState(false)
  const [useCredits, setUseCredits] = useState(false)
  
  const selectedPkg = JOB_PACKAGES.find(pkg => pkg.id === selectedPackage)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
    control,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      companyName: initialData?.companyName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      country: 'United States',
      paymentMethod: 'credit_card',
      acceptTerms: false
    },
  })

  const watchedPaymentMethod = watch('paymentMethod')
  const watchedAcceptTerms = watch('acceptTerms')

  // Fetch credit information on component mount
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await getWithImpersonation('/api/employer/credits')
        if (response.ok) {
          const data = await response.json()
          setCreditInfo(data.credits)
          // Auto-select credit usage if user has sufficient credits
          if (data.credits.hasCredits && data.credits.total >= 1) {
            setUseCredits(true)
          }
        } else {
          console.error('Failed to fetch credit information')
        }
      } catch (error) {
        console.error('Error fetching credits:', error)
      } finally {
        setIsLoadingCredits(false)
      }
    }

    fetchCredits()
  }, [])

  const handleCreditConfirm = async () => {
    // This will be called when user confirms credit usage
    const formData = getValues()
    // Add useCredits flag to the form data
    const dataWithCredits = { ...formData, useCredits: true }
    await onSubmit(dataWithCredits)
    setShowCreditConfirmation(false)
  }

  const handlePurchaseMore = () => {
    // Switch to package purchase mode
    setUseCredits(false)
    setShowCreditConfirmation(false)
  }

  const handleFormSubmit = async (data: CheckoutFormData) => {
    // If using credits and user has sufficient credits, show confirmation
    if (useCredits && creditInfo?.hasCredits && creditInfo.total >= 1) {
      setShowCreditConfirmation(true)
      return
    }

    // Otherwise proceed with normal checkout
    setIsLoading(true)
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Error submitting checkout:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number, isMonthly?: boolean) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    })
    
    return `${formatter.format(price)}${isMonthly ? '/month' : ''}`
  }

  if (!selectedPkg) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Package not found. Please go back and select a package.</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Credit Confirmation Modal */}
      <CreditConfirmation
        isOpen={showCreditConfirmation}
        onClose={() => setShowCreditConfirmation(false)}
        onConfirm={handleCreditConfirm}
        onPurchaseMore={handlePurchaseMore}
        jobTitle={jobTitle}
        creditInfo={creditInfo}
        isLoading={isLoadingCredits}
      />

      {/* Development Notice */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <div>
            <h3 className="font-medium text-blue-800 mb-1">Development Mode</h3>
            <p className="text-sm text-blue-700">
              Payment processing is currently disabled for development. Your job will be posted successfully without actual payment.
            </p>
          </div>
        </div>
      </div>

      {/* Credit Balance Display */}
      {!isLoadingCredits && creditInfo && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coins className="h-5 w-5 text-brand-teal" />
                <span>Credit Balance</span>
              </CardTitle>
              <CardDescription>
                Choose how you'd like to pay for this job posting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Current Credits</p>
                  <p className="text-sm text-gray-600">Available for job postings</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-teal">{creditInfo.total}</p>
                  <p className="text-sm text-gray-500">credits</p>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Payment Method</h4>
                
                {creditInfo.hasCredits && creditInfo.total >= 1 ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                         onClick={() => setUseCredits(true)}>
                      <input
                        type="radio"
                        id="use_credits"
                        checked={useCredits}
                        onChange={() => setUseCredits(true)}
                        className="text-brand-teal focus:ring-brand-teal"
                      />
                      <div className="flex-1">
                        <Label htmlFor="use_credits" className="cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <Coins className="h-4 w-4 text-brand-teal" />
                            <span className="font-medium">Use Credits (Recommended)</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Use 1 credit from your balance. {creditInfo.total - 1} credits will remain.
                          </p>
                        </Label>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                         onClick={() => setUseCredits(false)}>
                      <input
                        type="radio"
                        id="purchase_package"
                        checked={!useCredits}
                        onChange={() => setUseCredits(false)}
                        className="text-brand-teal focus:ring-brand-teal"
                      />
                      <div className="flex-1">
                        <Label htmlFor="purchase_package" className="cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-gray-600" />
                            <span className="font-medium">Purchase New Package</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Buy a new job posting package with payment
                          </p>
                        </Label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800">No Credits Available</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          You need to purchase a job posting package to continue.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Billing Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Billing Details</span>
                </CardTitle>
                <CardDescription>
                  Please provide your billing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-gray-700 font-medium">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      className="mt-1 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                      {...register('firstName')}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName" className="text-gray-700 font-medium">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      className="mt-1 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                      {...register('lastName')}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="companyName" className="text-gray-700 font-medium">Company Name (optional)</Label>
                  <div className="relative mt-1">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="companyName"
                      placeholder="Your Company Inc."
                      className="pl-10 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                      {...register('companyName')}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="country" className="text-gray-700 font-medium">Country/Region *</Label>
                  <div className="relative mt-1">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Controller
                      name="country"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value || undefined}
                          onValueChange={(value) => field.onChange(value === CLEAR_SELECT_VALUE ? '' : value)}
                        >
                          <SelectTrigger className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-teal focus:border-brand-teal">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="United States">United States</SelectItem>
                            <SelectItem value="Canada">Canada</SelectItem>
                            <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                            <SelectItem value="Australia">Australia</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                            <SelectItem value={CLEAR_SELECT_VALUE}>Clear selection</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  {errors.country && (
                    <p className="text-sm text-red-600 mt-1">{errors.country.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="streetAddress" className="text-gray-700 font-medium">Street Address *</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="streetAddress"
                      placeholder="123 Main Street"
                      className="pl-10 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                      {...register('streetAddress')}
                    />
                  </div>
                  {errors.streetAddress && (
                    <p className="text-sm text-red-600 mt-1">{errors.streetAddress.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="apartment" className="text-gray-700 font-medium">Apartment, suite, etc. (optional)</Label>
                  <Input
                    id="apartment"
                    placeholder="Apt 4B"
                    className="mt-1 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                    {...register('apartment')}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-gray-700 font-medium">Town/City *</Label>
                    <Input
                      id="city"
                      placeholder="New York"
                      className="mt-1 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                      {...register('city')}
                    />
                    {errors.city && (
                      <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="state" className="text-gray-700 font-medium">State *</Label>
                    <Controller
                      name="state"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value || undefined}
                          onValueChange={(value) => field.onChange(value === CLEAR_SELECT_VALUE ? '' : value)}
                        >
                          <SelectTrigger className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-teal focus:border-brand-teal">
                            <SelectValue placeholder="Select State" />
                          </SelectTrigger>
                          <SelectContent>
                            {US_STATES.map(state => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                            <SelectItem value={CLEAR_SELECT_VALUE}>Clear selection</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.state && (
                      <p className="text-sm text-red-600 mt-1">{errors.state.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="zipCode" className="text-gray-700 font-medium">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      placeholder="10001"
                      className="mt-1 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                      {...register('zipCode')}
                    />
                    {errors.zipCode && (
                      <p className="text-sm text-red-600 mt-1">{errors.zipCode.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-gray-700 font-medium">Phone *</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        className="pl-10 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                        {...register('phone')}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-gray-700 font-medium">Email Address *</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@company.com"
                        className="pl-10 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="hearAboutUs" className="text-gray-700 font-medium">How did you hear about us?</Label>
                  <Controller
                    name="hearAboutUs"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || undefined}
                        onValueChange={(value) => field.onChange(value === CLEAR_SELECT_VALUE ? '' : value)}
                      >
                        <SelectTrigger className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-teal focus:border-brand-teal">
                          <SelectValue placeholder="Please select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {HEAR_ABOUT_OPTIONS.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                          <SelectItem value={CLEAR_SELECT_VALUE}>Clear selection</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="orderNotes" className="text-gray-700 font-medium">Order Notes (optional)</Label>
                  <Textarea
                    id="orderNotes"
                    placeholder="Any special instructions or notes about your order..."
                    rows={3}
                    className="mt-1 border-gray-300 focus:border-brand-teal focus:ring-brand-teal resize-none"
                    {...register('orderNotes')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment Method</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="credit_card"
                      value="credit_card"
                      className="text-brand-teal focus:ring-brand-teal"
                      {...register('paymentMethod')}
                    />
                    <Label htmlFor="credit_card" className="flex items-center space-x-2 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      <span>Credit Card</span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="paypal"
                      value="paypal"
                      className="text-brand-teal focus:ring-brand-teal"
                      {...register('paymentMethod')}
                    />
                    <Label htmlFor="paypal" className="flex items-center space-x-2 cursor-pointer">
                      <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">P</span>
                      </div>
                      <span>PayPal</span>
                    </Label>
                  </div>
                </div>

                {watchedPaymentMethod === 'credit_card' && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div>
                      <Label htmlFor="cardNumber" className="text-gray-700 font-medium">Card Number *</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        className="mt-1 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                        {...register('cardNumber')}
                      />
                      {errors.cardNumber && (
                        <p className="text-sm text-red-600 mt-1">{errors.cardNumber.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="expiryDate" className="text-gray-700 font-medium">Expiry Date *</Label>
                        <Input
                          id="expiryDate"
                          placeholder="MM/YY"
                          className="mt-1 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                          {...register('expiryDate')}
                        />
                        {errors.expiryDate && (
                          <p className="text-sm text-red-600 mt-1">{errors.expiryDate.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="cvv" className="text-gray-700 font-medium">CVV *</Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          className="mt-1 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                          {...register('cvv')}
                        />
                        {errors.cvv && (
                          <p className="text-sm text-red-600 mt-1">{errors.cvv.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cardName" className="text-gray-700 font-medium">Name on Card *</Label>
                      <Input
                        id="cardName"
                        placeholder="John Doe"
                        className="mt-1 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                        {...register('cardName')}
                      />
                      {errors.cardName && (
                        <p className="text-sm text-red-600 mt-1">{errors.cardName.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {watchedPaymentMethod === 'paypal' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      You will be redirected to PayPal to complete your payment securely.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Terms and Conditions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="acceptTerms"
                    checked={watchedAcceptTerms}
                    onCheckedChange={(checked) => setValue('acceptTerms', checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="acceptTerms" className="text-sm text-gray-700 cursor-pointer">
                      I have read and agree to the{' '}
                      <a href="/terms" target="_blank" className="text-brand-teal hover:underline">
                        Terms and Conditions
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" target="_blank" className="text-brand-teal hover:underline">
                        Privacy Policy
                      </a>
                      . *
                    </Label>
                    {errors.acceptTerms && (
                      <p className="text-sm text-red-600 mt-1">{errors.acceptTerms.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {useCredits && creditInfo?.hasCredits ? 'Job Posting (Credit)' : selectedPkg.name}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">Job: {jobTitle}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">
                        {useCredits && creditInfo?.hasCredits ? '1 Credit' : formatPrice(selectedPkg.price, selectedPkg.isMonthly)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  {useCredits && creditInfo?.hasCredits ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Credits</span>
                        <span className="font-medium">{creditInfo.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Job Posting Cost</span>
                        <span className="font-medium">-1</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold text-brand-teal">
                        <span>Remaining Credits</span>
                        <span>{creditInfo.total - 1}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">
                          {formatPrice(selectedPkg.price, selectedPkg.isMonthly)}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span>{formatPrice(selectedPkg.price, selectedPkg.isMonthly)}</span>
                      </div>
                    </>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={isLoading || !watchedAcceptTerms || (useCredits && (!creditInfo?.hasCredits || creditInfo.total < 1))}
                    className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white"
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Processing...
                      </>
                    ) : useCredits && creditInfo?.hasCredits ? (
                      <>
                        <Coins className="h-4 w-4 mr-2" />
                        Use Credit & Post Job
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Complete Order
                      </>
                    )}
                  </Button>

                  {!useCredits && (
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                      <Lock className="h-4 w-4" />
                      <span>Secure SSL encrypted payment</span>
                    </div>
                  )}
                </div>

                {!useCredits && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-green-700">
                        <p className="font-medium">30-day money-back guarantee</p>
                        <p className="text-xs mt-1">Not satisfied? Get a full refund within 30 days.</p>
                      </div>
                    </div>
                  </div>
                )}

                {useCredits && creditInfo?.hasCredits && (
                  <div className="bg-brand-teal/10 border border-brand-teal/20 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <Coins className="h-4 w-4 text-brand-teal flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-brand-teal">
                        <p className="font-medium">Using Credits</p>
                        <p className="text-xs mt-1">Your job will be posted immediately using 1 credit from your balance.</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
