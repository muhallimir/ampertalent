'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import { PaymentMethodForm } from '@/components/payments/PaymentMethodForm'
import { PackagePurchaseModal } from '@/components/payments/PackagePurchaseModal'
import { PackageCard, JOB_PACKAGES, CONCIERGE_PACKAGES } from '@/components/payments/PackageCard'
import { ExclusivePlanCard } from '@/components/employer/ExclusivePlanCard'
import { getWithImpersonation, postWithImpersonation, putWithImpersonation, deleteWithImpersonation } from '@/lib/api-client'
import { clearMarketingPreselect } from '@/lib/marketing-preselect'
import {
  CreditCard,
  AlertTriangle,
  Download,
  Receipt,
  Settings,
  Package,
  TrendingUp,
  Eye,
  CheckCircle,
  ShoppingCart
} from 'lucide-react'

interface JobPostingBreakdown {
  id: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
}

interface JobPostingCounter {
  jobPostingsUsed: number
  jobPostingsRemaining: number
}

interface FeaturedListingCounter {
  featuredListingsUsed: number
  featuredListingsRemaining: number
}

interface SinglePackage {
  id: string
  packageId: string
  packagePrice: number
  status: 'active' | 'expired' | 'pending'
  purchaseDate: string
  expiryDate: string
  jobPostingsUsed: number
  jobPostingsRemaining: number
  featuredListingsUsed: number
  featuredListingsRemaining: number
  // Recurring package info
  isRecurring?: boolean
  billingCyclesTotal?: number
  billingCyclesCompleted?: number
  recurringAmountCents?: number
  recurringStatus?: string
  nextBillingDate?: string | null
  arbSubscriptionId?: string | null
  purchasedAddOns?: Array<{
    id: string
    quantity: number
    price: number
    expiresAt: string | null
    serviceRequestId?: string | null
    name?: string
    status?: string
  }>
  jobPostingBreakdown?: JobPostingBreakdown[]
  // Extension request info
  extensionRequestStatus?: string | null
  extensionRequestedMonths?: number | null
  extensionRequestedAt?: string | null
}

interface PaymentMethod {
  id: string
  type: 'card'
  last4: string
  brand: string
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
}

interface Transaction {
  id: string
  amount: number
  currency: string
  status: string
  description: string
  date: string
  paymentMethod: {
    type: string
    last4?: string
    brand?: string
  }
  metadata?: Record<string, any>
}

export default function BillingPage() {
  const searchParams = useSearchParams()
  // const user = useUser()
  const [currentPackage, setCurrentPackage] = useState<SinglePackage | null>(null)
  const [allPurchasedPackages, setAllPurchasedPackages] = useState<SinglePackage[] | null>(null)
  const [jobPostingCounter, setJobPostingCounter] = useState<JobPostingCounter>({ jobPostingsUsed: 0, jobPostingsRemaining: 0 })
  // const [featuredListingCounter,setFeaturedListingCounter] = useState<FeaturedListingCounter>({featuredListingsRemaining: 0, featuredListingsUsed: 0})
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('current')
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const [isManaging, setIsManaging] = useState(false)
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false)
  const [paymentMethodFormMode, setPaymentMethodFormMode] = useState<'add' | 'update'>('add')
  const [paymentMethodToUpdate, setPaymentMethodToUpdate] = useState<string | null>(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<any>(null)
  const [showConciergePackages, setShowConciergePackages] = useState(false)
  const [highlightedPackage, setHighlightedPackage] = useState<string | null>(null)
  const packageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showAuditTrailModal, setShowAuditTrailModal] = useState(false)
  const [auditTrail, setAuditTrail] = useState<any[]>([])
  const [selectedAddOnDetails, setSelectedAddOnDetails] = useState<any>(null)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [auditSortOrder, setAuditSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [showPaymentMethodChoice, setShowPaymentMethodChoice] = useState(false)
  const [isAddingPayPal, setIsAddingPayPal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellingPackage, setCancellingPackage] = useState<SinglePackage | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  // Track if we came from exclusive plan flow to auto-activate after adding payment method
  const [pendingExclusivePlanActivation, setPendingExclusivePlanActivation] = useState(false)
  // Extension request state
  const [showExtensionRequestModal, setShowExtensionRequestModal] = useState(false)
  const [extensionRequestPackage, setExtensionRequestPackage] = useState<SinglePackage | null>(null)
  const [extensionMonths, setExtensionMonths] = useState<number>(6)
  const [isRequestingExtension, setIsRequestingExtension] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    // Check for checkout success parameter
    const checkout = searchParams?.get('checkout')
    if (checkout === 'success') {
      setCheckoutSuccess(true)
      setShowSuccessModal(true)
      addToast({
        title: "Package Purchased Successfully!",
        description: "Your package has been activated and is ready to use.",
        variant: "success",
        duration: 5000,
      })

      // Clear the parameter after showing success message
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      window.history.replaceState({}, '', url.toString())

      // Switch to current package tab
      setActiveTab('current')
    }

    // Check for tab parameter
    const tab = searchParams?.get('tab')
    if (tab) {
      setActiveTab(tab)
    }

    // Check for action parameter (e.g., add-card from ExclusivePlanCard)
    const action = searchParams?.get('action')
    const source = searchParams?.get('source')
    if (action === 'add-card') {
      // Open the payment method form directly
      setPaymentMethodFormMode('add')
      setPaymentMethodToUpdate(null)
      setShowPaymentMethodForm(true)
      // Track if we came from exclusive plan flow
      if (source === 'exclusive-plan') {
        setPendingExclusivePlanActivation(true)
      }
      // Clear the action and source parameters
      const url = new URL(window.location.href)
      url.searchParams.delete('action')
      url.searchParams.delete('source')
      window.history.replaceState({}, '', url.toString())
    }

    const highlight = searchParams?.get('highlight')

    // Check for section parameter (concierge)
    const section = searchParams?.get('section')
    if (section === 'concierge' || (highlight && highlight.startsWith('concierge'))) {
      setShowConciergePackages(true)
      setActiveTab('packages')
    } else if (highlight === 'email_blast') {
      setShowConciergePackages(false)
      setActiveTab('packages')
    }

    if (highlight) {
      setHighlightedPackage(highlight)
    }

    // Check for auto-open parameter (from marketing site pre-selection)
    const plan = searchParams?.get('plan')
    const autoOpen = searchParams?.get('autoOpen')
    if (plan && autoOpen === 'true') {
      console.log('📦 BILLING: Auto-opening purchase modal for plan:', plan)

      // Determine if this is a concierge package
      const isConcierge = plan.startsWith('concierge')
      if (isConcierge) {
        setShowConciergePackages(true)
      }
      setActiveTab('packages')

      // Find the package and open the modal
      const packageInfo = [...JOB_PACKAGES, ...CONCIERGE_PACKAGES].find(p => p.id === plan)
      if (packageInfo) {
        setSelectedPackage({
          id: packageInfo.id,
          name: packageInfo.name,
          price: packageInfo.price,
          listings: packageInfo.jobPostings,
          duration: packageInfo.duration,
          description: packageInfo.description
        })
        setShowPurchaseModal(true)

        // Clear the marketing preselect cookie
        clearMarketingPreselect()

        // Clear URL params
        const url = new URL(window.location.href)
        url.searchParams.delete('plan')
        url.searchParams.delete('autoOpen')
        window.history.replaceState({}, '', url.toString())

        addToast({
          title: "Complete Your Purchase",
          description: `Your selected package "${packageInfo.name}" is ready for checkout.`,
          variant: "default",
          duration: 5000,
        })
      }
    }

    // Check for pending job post parameters
    const pendingJobId = searchParams?.get('pendingJobId')
    const sessionToken = searchParams?.get('sessionToken')
    if (pendingJobId && sessionToken) {
      // Show a message about completing the job post
      addToast({
        title: "Complete Your Job Post",
        description: "Select a package to complete your job posting.",
        variant: "default",
        duration: 5000,
      })
    }

    loadBillingData()
  }, [searchParams, addToast])

  useEffect(() => {
    // Handle returning to purchase modal after adding payment method
  }, [])

  useEffect(() => {
    if (!highlightedPackage) return

    const target = packageRefs.current[highlightedPackage]
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    const timeout = setTimeout(() => setHighlightedPackage(null), 4000)

    return () => clearTimeout(timeout)
  }, [highlightedPackage, showConciergePackages])

  const loadBillingData = async () => {
    try {

      // Load packages and current package
      const packagesResponse = await getWithImpersonation('/api/employer/billing/packages')
      if (packagesResponse.ok) {
        const packagesData = await packagesResponse.json()
        setCurrentPackage(packagesData.currentPackage)
        setAllPurchasedPackages(packagesData.allPackages);


        const packageMetrics = packagesData.allPackages.map((p: SinglePackage) => {
          return {
            jobPostingsRemaining: p.jobPostingsRemaining,
            jobPostingsUsed: p.jobPostingsUsed,
            featuredListingsRemaining: p.featuredListingsRemaining,
            featuredListingsUsed: p.featuredListingsUsed
          }
        })

        const totalRemaining = packageMetrics.reduce((accumulator: number, currentValue: { jobPostingsRemaining: number }) =>
          accumulator + currentValue.jobPostingsRemaining, 0);
        const totalUsed = packageMetrics.reduce((accumulator: number, currentValue: { jobPostingsUsed: number }) =>
          accumulator + currentValue.jobPostingsUsed, 0);

        setJobPostingCounter({
          jobPostingsRemaining: totalRemaining,
          jobPostingsUsed: totalUsed
        })

        // setFeaturedListingCounter({
        //   featuredListingsRemaining : jf.reduce((accumulator:number, currentValue:{featuredListingsRemaining:number}) => 
        //     accumulator + currentValue.featuredListingsRemaining, 0),
        //   featuredListingsUsed: jf.reduce((accumulator:number, currentValue:{featuredListingsUsed:number}) => 
        //     accumulator + currentValue.featuredListingsUsed, 0)
        // })
      }

      // Load payment methods
      const paymentMethodsResponse = await getWithImpersonation('/api/employer/billing/payment-methods')
      if (paymentMethodsResponse.ok) {
        const paymentMethodsData = await paymentMethodsResponse.json()
        setPaymentMethods(paymentMethodsData.paymentMethods || [])
      }

      // Load transaction history from GoHighLevel
      const transactionsResponse = await getWithImpersonation('/api/employer/transactions')
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setTransactions(transactionsData.transactions || [])
      }

    } catch (error) {
      console.error('Error loading billing data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAddOnAuditTrail = async (serviceRequestId: string, addOnPrice: number, addOnExpiresAt: string) => {
    if (!serviceRequestId) {
      addToast({
        title: "Error",
        description: 'No service request found for this add-on',
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    try {
      setLoadingAudit(true)
      const response = await getWithImpersonation(`/api/employer/billing/add-on-details/${serviceRequestId}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setSelectedAddOnDetails({
          ...data.serviceRequest,
          price: addOnPrice,
          expiresAt: addOnExpiresAt
        })
        setAuditTrail(data.auditTrail || [])
        setShowAuditTrailModal(true)
      } else {
        addToast({
          title: "Error",
          description: data.error || 'Failed to load audit trail',
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error fetching audit trail:', error)
      addToast({
        title: "Error",
        description: 'Failed to load audit trail',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setLoadingAudit(false)
    }
  }

  const handlePurchasePackage = async (packageId: string) => {
    // Get package info and show purchase modal
    const packageInfo = getPackageInfo(packageId)
    if (packageInfo) {
      setSelectedPackage(packageInfo)
      setShowPurchaseModal(true)
    } else {
      addToast({
        title: "Error",
        description: 'Invalid package selected',
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  const getPackageInfo = (packageId: string) => {
    // Find package in JOB_PACKAGES or CONCIERGE_PACKAGES
    const allPackages = [...JOB_PACKAGES, ...CONCIERGE_PACKAGES]
    const pkg = allPackages.find(p => p.id === packageId)

    if (pkg) {
      return {
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        listings: pkg.jobPostings,
        duration: pkg.duration,
        description: pkg.description
      }
    }

    return null
  }

  const handleUpgradePackage = async (packageId: string) => {
    // Get package info and show purchase modal for upgrade
    const packageInfo = getPackageInfo(packageId)
    if (packageInfo) {
      setSelectedPackage(packageInfo)
      setShowPurchaseModal(true)
    } else {
      addToast({
        title: "Error",
        description: 'Invalid package selected',
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  const handleAddPaymentMethod = () => {
    // Show choice modal to select card or PayPal
    setShowPaymentMethodChoice(true)
  }

  const handleAddCard = () => {
    setShowPaymentMethodChoice(false)
    setPaymentMethodFormMode('add')
    setPaymentMethodToUpdate(null)
    setShowPaymentMethodForm(true)
  }

  const handleAddPayPal = async () => {
    setIsAddingPayPal(true)
    try {
      const currentUrl = window.location.origin
      const returnUrl = `${currentUrl}/employer/billing/paypal-return`
      const cancelUrl = `${currentUrl}/employer/billing?tab=payment-methods`

      const response = await postWithImpersonation(
        '/api/payments/create-billing-agreement',
        { userType: 'employer', returnUrl, cancelUrl, setupOnly: true }
      )

      const result = await response.json()

      if (response.ok && result.success && result.approvalUrl) {
        // Redirect to PayPal
        window.location.href = result.approvalUrl
      } else {
        throw new Error(result.error || 'Failed to initiate PayPal setup')
      }
    } catch (error) {
      console.error('PayPal setup error:', error)
      addToast({
        title: 'PayPal Setup Failed',
        description: error instanceof Error ? error.message : 'Failed to add PayPal',
        variant: 'destructive',
        duration: 5000,
      })
      setIsAddingPayPal(false)
    }
  }

  const handlePaymentMethodSuccess = async () => {
    addToast({
      title: "Payment Method Added",
      description: "Your payment method has been added successfully.",
      variant: "success",
      duration: 5000,
    })

    // Reload to show the new payment method
    await loadBillingData()

    // If user came from exclusive plan flow, automatically try to activate
    if (pendingExclusivePlanActivation) {
      setPendingExclusivePlanActivation(false)

      // Get the newly added payment method (should be the default or first one)
      try {
        const paymentMethodsResponse = await getWithImpersonation('/api/employer/billing/payment-methods')
        if (paymentMethodsResponse.ok) {
          const data = await paymentMethodsResponse.json()
          const methods = data.paymentMethods || []
          const defaultMethod = methods.find((pm: PaymentMethod) => pm.isDefault) || methods[0]

          if (defaultMethod) {
            addToast({
              title: "Activating Your Exclusive Plan...",
              description: "Processing your first payment.",
              variant: "default",
              duration: 3000,
            })

            // Automatically activate the exclusive plan
            const activateResponse = await fetch('/api/employer/exclusive-plan/activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentMethodId: defaultMethod.id })
            })

            const activateData = await activateResponse.json()

            if (activateResponse.ok && activateData.success) {
              addToast({
                title: '🎉 Exclusive Plan Activated!',
                description: `Your ${activateData.package?.name || 'plan'} is now active.`,
                variant: 'success',
                duration: 5000,
              })
              // Reload the page to show updated package
              window.location.reload()
            } else {
              addToast({
                title: 'Activation Issue',
                description: activateData.error || 'Could not activate automatically. Please click "Activate Now" below.',
                variant: 'destructive',
                duration: 5000,
              })
            }
          }
        }
      } catch (error) {
        console.error('Error auto-activating exclusive plan:', error)
        addToast({
          title: 'Activation Issue',
          description: 'Could not activate automatically. Please click "Activate Now" on the exclusive plan card.',
          variant: 'destructive',
          duration: 5000,
        })
      }
    }
  }

  const handlePaymentMethodError = (message: string) => {
    addToast({
      title: "Error",
      description: message,
      variant: "destructive",
      duration: 5000,
    })
  }

  const handlePurchaseSuccess = () => {
    addToast({
      title: "Package Purchased Successfully!",
      description: "Your package has been activated and is ready to use.",
      variant: "success",
      duration: 5000,
    })
    setCheckoutSuccess(true)
    setShowPurchaseModal(false)
    setShowSuccessModal(true)

    // Add a slight delay to ensure database records are written
    setTimeout(() => {
      loadBillingData() // Reload to show the new package with add-ons
    }, 500)
  }

  const handlePurchaseError = (message: string) => {
    addToast({
      title: "Purchase Failed",
      description: message,
      variant: "destructive",
      duration: 5000,
    })
  }

  const handleUpdatePaymentMethod = async (methodId: string) => {
    // Show payment method form for updating
    setPaymentMethodFormMode('update')
    setPaymentMethodToUpdate(methodId)
    setShowPaymentMethodForm(true)

    addToast({
      title: "Update Payment Method",
      description: "Please enter your new payment method details.",
      variant: "default",
      duration: 5000,
    })
  }

  const handleRemovePaymentMethod = async (methodId: string) => {
    // Prevent deletion if this is the only payment method
    if (paymentMethods.length <= 1) {
      addToast({
        title: "Cannot Remove Payment Method",
        description: "You must have at least one payment method. Please add another payment method before removing this one.",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    if (!confirm('Are you sure you want to remove this payment method?')) {
      return
    }

    try {
      const response = await deleteWithImpersonation(`/api/employer/billing/payment-methods?id=${methodId}`)

      const result = await response.json()

      if (result.success) {
        addToast({
          title: "Payment Method Removed",
          description: result.message,
          variant: "success",
          duration: 5000,
        })
        loadBillingData() // Reload to update the list
      } else {
        addToast({
          title: "Error",
          description: result.error || 'Failed to remove payment method',
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error removing payment method:', error)
      addToast({
        title: "Error",
        description: 'Failed to remove payment method',
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  const handleSetDefaultPaymentMethod = async (methodId: string) => {
    try {
      const response = await putWithImpersonation('/api/employer/billing/payment-methods', {
        paymentMethodId: methodId,
        action: 'setDefault'
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          title: "Default Payment Method Updated",
          description: result.message,
          variant: "success",
          duration: 5000,
        })
        loadBillingData() // Reload to update the list
      } else {
        addToast({
          title: "Error",
          description: result.error || 'Failed to set default payment method',
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error setting default payment method:', error)
      addToast({
        title: "Error",
        description: 'Failed to set default payment method',
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  const handleCancelPackage = async () => {
    if (!currentPackage) return

    const confirmed = window.confirm(
      'Are you sure you want to cancel your current package? This action cannot be undone and you will lose access to remaining credits.'
    )

    if (!confirmed) return

    setIsManaging(true)
    try {
      const response = await postWithImpersonation('/api/employer/billing/manage', {
        action: 'cancel',
        packageId: currentPackage.packageId
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          title: "Package Cancelled",
          description: result.message || 'Your package has been cancelled successfully.',
          variant: "success",
          duration: 5000,
        })
        // Reload billing data
        loadBillingData()
      } else {
        addToast({
          title: "Error",
          description: result.error || 'Failed to cancel package',
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error cancelling package:', error)
      addToast({
        title: "Error",
        description: 'Failed to cancel package',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsManaging(false)
    }
  }

  // Handler for cancelling recurring subscriptions (opens modal)
  const handleCancelRecurringSubscription = async () => {
    if (!cancellingPackage) return

    setIsCancelling(true)
    try {
      const response = await postWithImpersonation('/api/employer/billing/manage', {
        action: 'cancel',
        packageId: cancellingPackage.packageId
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          title: "Subscription Cancelled",
          description: 'Your recurring subscription has been cancelled. You will continue to have access until your current billing period ends.',
          variant: "success",
          duration: 7000,
        })
        setShowCancelModal(false)
        setCancellingPackage(null)
        loadBillingData()
      } else {
        addToast({
          title: "Error",
          description: result.error || 'Failed to cancel subscription',
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      addToast({
        title: "Error",
        description: 'Failed to cancel subscription. Please try again.',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsCancelling(false)
    }
  }

  // Handler for requesting extension to recurring subscription
  const handleRequestExtension = async () => {
    if (!extensionRequestPackage) return

    setIsRequestingExtension(true)
    try {
      const response = await postWithImpersonation('/api/employer/extension-request', {
        packageId: extensionRequestPackage.id,
        requestedMonths: extensionMonths
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          title: "Extension Request Submitted! 📩",
          description: `Your request for ${extensionMonths} additional months has been submitted. An admin will review and respond soon.`,
          variant: "success",
          duration: 7000,
        })
        setShowExtensionRequestModal(false)
        setExtensionRequestPackage(null)
        setExtensionMonths(6)
        loadBillingData()
      } else {
        addToast({
          title: "Error",
          description: result.error || 'Failed to submit extension request',
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Error requesting extension:', error)
      addToast({
        title: "Error",
        description: 'Failed to submit extension request. Please try again.',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsRequestingExtension(false)
    }
  }

  const getCurrentPackageDetails = (employerPackage: SinglePackage | null) => {
    if (!employerPackage) return null
    // Since we removed package selection UI, we'll create a simple package details object
    return {
      id: employerPackage.packageId,
      name: employerPackage.packageId.charAt(0).toUpperCase() + employerPackage.packageId.slice(1),
      description: 'Job posting package',
      price: employerPackage.packagePrice // Default price, this should come from the API in a real implementation
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUsagePercentage = (used: number, total: number) => {
    if (total === -1) return 0 // unlimited
    return Math.round((used / total) * 100)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // const currentPackageDetails = getCurrentPackageDetails(currentPackage)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Package purchased</DialogTitle>
            <DialogDescription className="text-gray-700">
              Your package is active. Head to “Post a Job” to apply it. If you purchased a Solo Email
              Blast, attach it on the package step and add your email content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowSuccessModal(false)} className="sm:w-auto w-full">
              Close
            </Button>
            <Button asChild className="sm:w-auto w-full">
              <Link href="/employer/jobs/new">Post a Job</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Message */}
      {checkoutSuccess && (
        <Card className="border-green-200 bg-green-50 mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Package Purchase Successful!</p>
                <p className="text-sm">
                  Your package has been activated and is ready to use. Head to “Post a Job” to
                  apply it—if you purchased a Solo Email Blast, attach it on the package step and
                  add your email content.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Packages</h1>
        <p className="text-gray-600">
          Manage your job posting packages and billing information
        </p>
      </div>

      {/* Exclusive Plan Card - Shows for invited employers */}
      <div className="mb-6">
        <ExclusivePlanCard />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="current">Active Packages</TabsTrigger>
          <TabsTrigger value="add-ons">Premium Add-Ons</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="invoices">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Packages</CardTitle>
              <CardDescription>
                Choose a package to purchase additional job posting credits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Package Toggle */}
              <div className="flex justify-center mb-6">
                <div className="bg-gray-100 p-1 rounded-lg">
                  <Button
                    variant={!showConciergePackages ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setShowConciergePackages(false)}
                    className="mr-1"
                  >
                    Job Posting Packages
                  </Button>
                  <Button
                    variant={showConciergePackages ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setShowConciergePackages(true)}
                  >
                    Concierge Services
                  </Button>
                </div>
              </div>

              {/* Package Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {(showConciergePackages ? CONCIERGE_PACKAGES : JOB_PACKAGES.filter(pkg => pkg.id !== 'gold_plus')).map((pkg) => {
                  const isHighlighted = highlightedPackage === pkg.id
                  return (
                    <div
                      key={pkg.id}
                      ref={(el) => { packageRefs.current[pkg.id] = el }}
                      className={`rounded-xl ${isHighlighted ? 'ring-2 ring-brand-coral shadow-lg bg-white' : ''}`}
                    >
                      <PackageCard
                        package={pkg}
                        onPurchase={handlePurchasePackage}
                        disabled={isManaging}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Package Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-4">
                  {showConciergePackages ? 'About Concierge Services:' : 'About Job Posting Packages:'}
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  {showConciergePackages ? (
                    <>
                      <p>• <strong>Level I ($1,695):</strong> For entry-level roles - Administrative, Support Services and Customer Service</p>
                      <p>• <strong>Level II ($2,695):</strong> For mid-level roles - Bookkeepers, Project Coordinators, Account Managers, Social Media/Content Creators</p>
                      <p>• <strong>Level III ($3,995):</strong> For executive and specialized roles - Managers, Marketing/PR, Accounting/CPA, Tech, Sales</p>
                    </>
                  ) : (
                    <>
                      <p>• <strong>Standard:</strong> Basic job posting with 30-day visibility</p>
                      <p>• <strong>Featured:</strong> Enhanced visibility with weekly email inclusion</p>
                      <p>• <strong>Solo Email Blast:</strong> Direct email to our entire candidate database</p>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Secure Checkout</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      All payments are processed securely through our integrated payment system. You'll be redirected to complete your purchase.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* PackageCard-- method called */}
        <TabsContent value="current" className="space-y-6">
          {allPurchasedPackages ? (
            <div className="space-y-6">
              {/* Usage Statistics */}
              <div className="grid md:grid-cols-none gap-6">
                {jobPostingCounter && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <span>Total Available Job Postings</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Used</span>
                          <span className="font-semibold">{jobPostingCounter.jobPostingsUsed}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Remaining</span>
                          <span className="font-semibold text-green-600">
                            {jobPostingCounter.jobPostingsRemaining === 999 ? 'Unlimited' : jobPostingCounter.jobPostingsRemaining}
                          </span>
                        </div>
                        {jobPostingCounter.jobPostingsRemaining !== 999 && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${getUsagePercentage(
                                  jobPostingCounter.jobPostingsUsed,
                                  jobPostingCounter.jobPostingsUsed + jobPostingCounter.jobPostingsRemaining
                                )}%`
                              }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* { featuredListingCounter && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Eye className="h-5 w-5 text-purple-600" />
                      <span>Total Available Featured Listings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Used</span>
                        <span className="font-semibold">{featuredListingCounter.featuredListingsUsed}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Remaining</span>
                        <span className="font-semibold text-purple-600">{featuredListingCounter.featuredListingsRemaining}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ 
                            width: `${getUsagePercentage(
                              featuredListingCounter.featuredListingsUsed, 
                              featuredListingCounter.featuredListingsUsed + featuredListingCounter.featuredListingsRemaining
                            )}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )} */}
              </div>

              {/* Current Package Overview */}
              {allPurchasedPackages.map(p => {
                const details = getCurrentPackageDetails(p);
                if (details == null || p.status === 'pending') return; // Skip if details is null

                return (
                  <Card key={p.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            <span className="capitalize">{details.name.replace(/_/g, ' ')} Package</span>
                          </CardTitle>
                          <CardDescription>
                            {details.description}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(p.status)}>
                          {p.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-6 justify-between item-center mb-4">
                        <div>
                          <h4 className="font-semibold">Remaining Job Postings: <span className="text-gray-600">{p.jobPostingsRemaining}</span></h4>
                        </div>
                      </div>

                      {/* Recurring Package Info */}
                      {p.isRecurring && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-700 font-medium">🔄 Recurring Subscription</span>
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                                {p.billingCyclesCompleted}/{p.billingCyclesTotal} payments
                              </Badge>
                              {p.extensionRequestStatus === 'pending' && (
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                  Extension Request Pending
                                </Badge>
                              )}
                            </div>
                            {p.recurringStatus === 'active' && (
                              <div className="flex items-center gap-2">
                                {p.extensionRequestStatus !== 'pending' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                    onClick={() => {
                                      setExtensionRequestPackage(p)
                                      setExtensionMonths(6)
                                      setShowExtensionRequestModal(true)
                                    }}
                                  >
                                    Request Extension
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  onClick={() => {
                                    setCancellingPackage(p)
                                    setShowCancelModal(true)
                                  }}
                                >
                                  Cancel Subscription
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Monthly Payment:</span>
                              <span className="ml-2 font-medium">${(p.recurringAmountCents || 0) / 100}/mo</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Next Billing:</span>
                              <span className="ml-2 font-medium">{p.nextBillingDate ? formatDate(p.nextBillingDate) : 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Total Value:</span>
                              <span className="ml-2 font-medium">${((p.recurringAmountCents || 0) / 100) * (p.billingCyclesTotal || 1)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid md:grid-cols-4 gap-6 items-end">
                        <div>
                          <h4 className="font-semibold mb-2">{p.isRecurring ? 'Monthly Rate' : 'Package Value'}</h4>
                          <p className="text-gray-600">
                            ${details.price}{p.isRecurring ? '/mo' : ''}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Purchase Date</h4>
                          <p className="text-gray-600">
                            {formatDate(p.purchaseDate)}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Expiry Date</h4>
                          <p className="text-gray-600">
                            {formatDate(p.expiryDate)}
                          </p>
                        </div>
                        {p.packageId === 'standard' &&
                          <Button
                            variant="outline"
                            onClick={() => handleUpgradePackage('featured')}
                            disabled={isManaging}
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            {isManaging ? 'Processing...' : 'Upgrade to Featured'}
                          </Button>
                        }
                      </div>

                      {p.status === 'expired' && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <p className="text-red-800 font-medium">
                              Your package expired on {formatDate(p.expiryDate)}
                            </p>
                          </div>
                          <p className="text-red-700 text-sm mt-1">
                            Purchase a new package to continue posting jobs.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
              }

              {/* Credit Usage Breakdown */}
              {currentPackage && currentPackage.jobPostingBreakdown && currentPackage.jobPostingBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Receipt className="h-5 w-5 text-blue-600" />
                      <span>Credit Usage Breakdown</span>
                    </CardTitle>
                    <CardDescription>
                      Detailed breakdown of job postings that used your package credits
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {currentPackage.jobPostingBreakdown.map((job, index) => (
                        <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{job.title}</p>
                              <p className="text-sm text-gray-600">
                                Posted on {formatDate(job.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge className={
                              job.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : job.status === 'pending_vetting'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : job.status === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                            }>
                              {job.status === 'pending_vetting' ? 'Pending Review' :
                                job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </Badge>
                            <span className="text-sm font-medium text-blue-600">1 Credit</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {currentPackage.jobPostingsRemaining > 0 && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>Remaining Credits:</strong> You have {currentPackage.jobPostingsRemaining} credits left in this package.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Package Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Package Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button onClick={() => setActiveTab('packages')} disabled={isManaging}>
                      <Package className="h-4 w-4 mr-2" />
                      Purchase Additional Package
                    </Button>
                    {/* <Button
                      variant="outline"
                      onClick={() => handleUpgradePackage('featured')}
                      disabled={isManaging}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      {isManaging ? 'Processing...' : 'Upgrade to Featured'}
                    </Button> */}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Package</h3>
                <p className="text-gray-600 mb-4">
                  You don&apos;t have an active package. Purchase one to start posting jobs.
                </p>
                <Button onClick={() => setActiveTab('packages')}>
                  View Packages
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="add-ons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Premium Add-On Services
              </CardTitle>
              <CardDescription>
                View and manage your purchased add-on services
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allPurchasedPackages && allPurchasedPackages.some((pkg: SinglePackage) => pkg.purchasedAddOns && pkg.purchasedAddOns.length > 0) ? (
                <div className="space-y-6">
                  {allPurchasedPackages.map((pkg: SinglePackage) => {
                    if (!pkg.purchasedAddOns || pkg.purchasedAddOns.length === 0) return null

                    return (
                      <div key={pkg.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-start justify-between pb-4 border-b">
                          <div>
                            <h3 className="font-semibold text-base capitalize">{pkg.packageId.replace(/_/g, ' ')}</h3>
                            <p className="text-sm text-gray-600">Purchased: {formatDate(pkg.purchaseDate)}</p>
                          </div>
                          <Badge variant="outline">{pkg.status}</Badge>
                        </div>

                        <div className="space-y-3">
                          {pkg.purchasedAddOns.map((addOn: any) => {
                            // Determine status color and display text
                            const getStatusStyles = (status: string) => {
                              const statusLower = status?.toLowerCase() || 'pending';
                              switch (statusLower) {
                                case 'in_progress':
                                  return { container: 'bg-blue-50 border border-blue-200', badge: 'bg-blue-100 text-blue-800 border-blue-300', displayText: 'In Progress' };
                                case 'completed':
                                  return { container: 'bg-green-50 border border-green-200', badge: 'bg-green-100 text-green-800 border-green-300', displayText: 'Completed' };
                                case 'cancelled':
                                  return { container: 'bg-red-50 border border-red-200', badge: 'bg-red-100 text-red-800 border-red-300', displayText: 'Cancelled' };
                                case 'pending':
                                default:
                                  return { container: 'bg-yellow-50 border border-yellow-200', badge: 'bg-yellow-100 text-yellow-800 border-yellow-300', displayText: 'Pending Review' };
                              }
                            }
                            const statusStyles = getStatusStyles(addOn.status)

                            return (
                              <div key={addOn.id} className={`${statusStyles.container} rounded-lg p-4 flex items-start justify-between`}>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <p className="font-medium text-sm">{addOn.name || 'Premium Service'}</p>
                                  </div>
                                  <div className="mt-3 space-y-2 text-sm">
                                    <p><strong>Amount Paid:</strong> ${Number(addOn.price).toFixed(2)}</p>
                                    {addOn.expiresAt && (
                                      <p><strong>Expires:</strong> {new Date(addOn.expiresAt).toLocaleDateString()}</p>
                                    )}
                                    <div className="pt-2 border-t border-gray-300/50">
                                      <div className="flex items-center gap-2">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusStyles.badge} border`}>
                                          {statusStyles.displayText}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="ml-4 bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                                  onClick={() => fetchAddOnAuditTrail(addOn.serviceRequestId, addOn.price, addOn.expiresAt)}
                                  disabled={loadingAudit || !addOn.serviceRequestId}
                                >
                                  {loadingAudit ? 'Loading...' : 'View Details'}
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No premium add-on services yet</p>
                  <p className="text-sm text-gray-500 mb-6">Add-on services enhance your packages with additional features</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveTab('packages')
                      setShowConciergePackages(true)
                    }}
                  >
                    Browse Concierge Packages
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <span>Payment Methods</span>
              </CardTitle>
              <CardDescription>
                Manage your payment methods for package purchases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethods.length > 0 ? (
                <div className="space-y-4">
                  {paymentMethods.map((method) => {
                    const isPayPal = method.brand.toLowerCase() === 'paypal';
                    return (
                      <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {isPayPal ? (
                            <svg className="h-5 w-5 text-[#003087]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.774.774 0 0 1 .763-.648h6.39c2.146 0 3.783.567 4.861 1.684 1.005 1.04 1.48 2.513 1.412 4.384-.017.458-.088.911-.214 1.345a7.29 7.29 0 0 1-.713 1.79c-.333.554-.733 1.048-1.209 1.475a5.557 5.557 0 0 1-1.679 1.075c-.625.258-1.309.43-2.037.515-.39.046-.813.068-1.254.068H9.108a.774.774 0 0 0-.763.648l-.975 5.527a.773.773 0 0 1-.762.648h-.532" />
                            </svg>
                          ) : (
                            <CreditCard className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <p className="font-medium">
                              {isPayPal ? 'PayPal' : method.brand} {isPayPal ? method.last4 : `•••• ${method.last4}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {isPayPal ? 'Linked Account' : `Expires ${method.expiryMonth.toString().padStart(2, '0')}/${method.expiryYear}`}
                              {method.isDefault && (
                                <span className="ml-2 text-blue-600 font-medium">• Default</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!method.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefaultPaymentMethod(method.id)}
                            >
                              Set as Default
                            </Button>
                          )}
                          {/* PayPal cannot be updated like cards - only removed and re-added */}
                          {!isPayPal && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdatePaymentMethod(method.id)}
                            >
                              Update
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemovePaymentMethod(method.id)}
                            disabled={paymentMethods.length <= 1}
                            title={paymentMethods.length <= 1 ? "Cannot remove the only payment method" : "Remove payment method"}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <Button className="w-full" onClick={handleAddPaymentMethod}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add New Payment Method
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payment Methods</h3>
                  <p className="text-gray-600 mb-4">
                    Add a payment method to make purchases easier
                  </p>
                  <Button onClick={handleAddPaymentMethod}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  View your package purchase payment history
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await getWithImpersonation('/api/employer/transactions/export')
                      if (response.ok) {
                        const blob = await response.blob()
                        const url = window.URL.createObjectURL(blob)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = `ampertalent-employer-transactions-${new Date().toISOString().split('T')[0]}.csv`
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        window.URL.revokeObjectURL(url)
                        addToast({
                          title: "Export Successful",
                          description: "Your transaction history has been downloaded as CSV.",
                          variant: "success",
                          duration: 5000,
                        })
                      } else {
                        throw new Error('Export failed')
                      }
                    } catch (error) {
                      addToast({
                        title: "Export Failed",
                        description: "Failed to export transaction history. Please try again.",
                        variant: "destructive",
                        duration: 5000,
                      })
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{transaction.description || 'Payment'}</p>
                          <p className="text-sm text-gray-600">
                            {transaction.date ? formatDate(transaction.date) : 'Unknown date'}
                            {transaction.paymentMethod?.last4 && (
                              <span className="ml-2">
                                • {transaction.paymentMethod.brand || 'Card'} ••••{transaction.paymentMethod.last4}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium">
                            ${transaction.amount ? transaction.amount.toFixed(2) : '0.00'} {transaction.currency || 'USD'}
                          </p>
                          <Badge className={
                            transaction.status === 'succeeded' || transaction.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }>
                            {transaction.status === 'succeeded' ? 'Paid' :
                              transaction.status ? transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1) : 'Unknown'}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await getWithImpersonation(`/api/employer/transactions/invoice/${transaction.id}`)
                              if (response.ok) {
                                const blob = await response.blob()
                                const url = window.URL.createObjectURL(blob)
                                const link = document.createElement('a')
                                link.href = url
                                link.download = `ampertalent-invoice-${transaction.id.slice(-8).toUpperCase()}.pdf`
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                window.URL.revokeObjectURL(url)
                                addToast({
                                  title: "PDF Downloaded",
                                  description: "Invoice PDF has been downloaded successfully.",
                                  variant: "success",
                                  duration: 3000,
                                })
                              } else {
                                throw new Error('Download failed')
                              }
                            } catch (error) {
                              addToast({
                                title: "Download Failed",
                                description: "Failed to download invoice. Please try again.",
                                variant: "destructive",
                                duration: 5000,
                              })
                            }
                          }}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          Invoice PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No payment history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Method Choice Modal */}
      <Dialog open={showPaymentMethodChoice} onOpenChange={setShowPaymentMethodChoice}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Choose how you&apos;d like to pay for future purchases
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="w-full h-16 flex items-center justify-start gap-4 px-6"
              onClick={handleAddCard}
            >
              <CreditCard className="h-6 w-6 text-blue-600" />
              <div className="text-left">
                <p className="font-medium">Credit or Debit Card</p>
                <p className="text-sm text-gray-500">Visa, Mastercard, Amex, Discover</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full h-16 flex items-center justify-start gap-4 px-6"
              onClick={() => {
                setShowPaymentMethodChoice(false)
                handleAddPayPal()
              }}
              disabled={isAddingPayPal}
            >
              {isAddingPayPal ? (
                <LoadingSpinner className="h-6 w-6" />
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 3.72a.766.766 0 01.757-.643h6.437c2.12 0 3.754.533 4.858 1.585 1.134 1.08 1.47 2.558 1.001 4.39-.628 2.45-2.087 4.165-4.213 4.96-1.013.38-2.126.57-3.306.57h-1.22a.766.766 0 00-.757.643l-.925 5.37a.641.641 0 01-.633.54l-.867.002z" fill="#003087" />
                  <path d="M19.514 7.612c-.628 2.45-2.087 4.165-4.213 4.96-1.013.38-2.126.57-3.306.57h-1.22a.766.766 0 00-.757.643l-1.355 7.87a.533.533 0 00.526.615h3.377a.638.638 0 00.63-.535l.674-3.923a.766.766 0 01.756-.643h1.22c1.18 0 2.293-.19 3.306-.57 2.126-.795 3.585-2.51 4.213-4.96.422-1.646.152-2.977-.759-3.962a4.85 4.85 0 00-1.092-.865 5.842 5.842 0 01-2 .8z" fill="#0070E0" />
                </svg>
              )}
              <div className="text-left">
                <p className="font-medium">PayPal</p>
                <p className="text-sm text-gray-500">Link your PayPal account</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentMethodForm
        isOpen={showPaymentMethodForm}
        onClose={() => {
          // Just close the form
          setShowPaymentMethodForm(false)
          setPaymentMethodToUpdate(null)
          setPaymentMethodFormMode('add')
        }}
        onSuccess={handlePaymentMethodSuccess}
        onError={handlePaymentMethodError}
        onPaymentMethodAdded={() => {
          // Close the form and reopen the purchase modal
          setShowPaymentMethodForm(false)
          setPaymentMethodToUpdate(null)
          setPaymentMethodFormMode('add')
          // Reload billing data to get the new payment method
          loadBillingData()
          // Reopen the purchase modal after a brief delay
          setTimeout(() => setShowPurchaseModal(true), 100)
        }}
        userType="employer"
        mode={paymentMethodFormMode}
        paymentMethodId={paymentMethodToUpdate || undefined}
      />
      {selectedPackage && (
        <PackagePurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          packageInfo={selectedPackage}
          onSuccess={handlePurchaseSuccess}
          onError={handlePurchaseError}
          onAddPaymentMethod={() => {
            setShowPurchaseModal(false)
            setShowPaymentMethodChoice(true)
          }}
        />
      )}

      {/* Cancel Recurring Subscription Modal */}
      <Dialog open={showCancelModal} onOpenChange={(open) => {
        if (!open) {
          setShowCancelModal(false)
          setCancellingPackage(null)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your recurring subscription?
            </DialogDescription>
          </DialogHeader>

          {cancellingPackage && (
            <div className="py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 mb-2">Subscription Details</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-600">Monthly Payment:</span> <span className="font-medium">${(cancellingPackage.recurringAmountCents || 0) / 100}/mo</span></p>
                  <p><span className="text-gray-600">Payments Completed:</span> <span className="font-medium">{cancellingPackage.billingCyclesCompleted}/{cancellingPackage.billingCyclesTotal}</span></p>
                  {cancellingPackage.nextBillingDate && (
                    <p><span className="text-gray-600">Next Billing Date:</span> <span className="font-medium">{formatDate(cancellingPackage.nextBillingDate)}</span></p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">What happens when you cancel:</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>No further charges will be made to your account</li>
                  <li>Your current job posting credits remain active until expiry</li>
                  <li>You can resubscribe at any time</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelModal(false)
                setCancellingPackage(null)
              }}
              disabled={isCancelling}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelRecurringSubscription}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Subscription'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extension Request Modal */}
      <Dialog open={showExtensionRequestModal} onOpenChange={(open) => {
        if (!open) {
          setShowExtensionRequestModal(false)
          setExtensionRequestPackage(null)
          setExtensionMonths(6)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Request Plan Extension
            </DialogTitle>
            <DialogDescription>
              Request additional months for your subscription. An admin will review and approve your request.
            </DialogDescription>
          </DialogHeader>

          {extensionRequestPackage && (
            <div className="py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 mb-2">Current Subscription</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-600">Monthly Payment:</span> <span className="font-medium">${(extensionRequestPackage.recurringAmountCents || 0) / 100}/mo</span></p>
                  <p><span className="text-gray-600">Progress:</span> <span className="font-medium">{extensionRequestPackage.billingCyclesCompleted}/{extensionRequestPackage.billingCyclesTotal} payments completed</span></p>
                  {extensionRequestPackage.nextBillingDate && (
                    <p><span className="text-gray-600">Next Billing:</span> <span className="font-medium">{formatDate(extensionRequestPackage.nextBillingDate)}</span></p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Extend by:</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={extensionMonths === 6 ? "default" : "outline"}
                    className={extensionMonths === 6 ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => setExtensionMonths(6)}
                  >
                    6 Months
                  </Button>
                  <Button
                    type="button"
                    variant={extensionMonths === 12 ? "default" : "outline"}
                    className={extensionMonths === 12 ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => setExtensionMonths(12)}
                  >
                    12 Months
                  </Button>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">After Extension (if approved):</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>New Total:</strong> {(extensionRequestPackage.billingCyclesTotal || 6) + extensionMonths} months</p>
                  <p><strong>Additional Payments:</strong> {extensionMonths} × ${(extensionRequestPackage.recurringAmountCents || 0) / 100} = ${(extensionMonths * ((extensionRequestPackage.recurringAmountCents || 0) / 100)).toFixed(2)}</p>
                  <p className="text-xs text-green-600 mt-2">Your next billing date will remain unchanged.</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowExtensionRequestModal(false)
                setExtensionRequestPackage(null)
                setExtensionMonths(6)
              }}
              disabled={isRequestingExtension}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleRequestExtension}
              disabled={isRequestingExtension}
            >
              {isRequestingExtension ? (
                <>
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                  Submitting...
                </>
              ) : (
                `Request ${extensionMonths} Month Extension`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add-On Audit Trail Modal */}
      <Dialog open={showAuditTrailModal} onOpenChange={setShowAuditTrailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add-On Service Details & Status History</DialogTitle>
            <DialogDescription>View the complete history of changes made to your add-on service</DialogDescription>
          </DialogHeader>

          {selectedAddOnDetails && (
            <div className="space-y-6">
              {/* Service Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Service Information</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Service:</strong> {selectedAddOnDetails.serviceName}</p>
                  <p><strong>Amount Paid:</strong> ${Number(selectedAddOnDetails.price).toFixed(2)}</p>
                  <p><strong>Expires:</strong> {new Date(selectedAddOnDetails.expiresAt).toLocaleDateString()}</p>
                  <p><strong>Current Status:</strong> <Badge>{selectedAddOnDetails.status}</Badge></p>
                  {selectedAddOnDetails.fulfillmentNotes && (
                    <p><strong>Notes:</strong> {selectedAddOnDetails.fulfillmentNotes}</p>
                  )}
                </div>
              </div>

              {/* Status History */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Status Update History</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Sort:</label>
                    <select
                      value={auditSortOrder}
                      onChange={(e) => setAuditSortOrder(e.target.value as 'newest' | 'oldest')}
                      className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                    >
                      <option value="newest">Latest to Oldest</option>
                      <option value="oldest">Oldest to Latest</option>
                    </select>
                  </div>
                </div>
                {auditTrail && auditTrail.filter(audit => audit.changeType === 'status').length > 0 ? (
                  <div className="space-y-3">
                    {auditTrail
                      .filter(audit => audit.changeType === 'status')
                      .sort((a, b) => {
                        const timeA = new Date(a.createdAt).getTime()
                        const timeB = new Date(b.createdAt).getTime()
                        return auditSortOrder === 'newest' ? timeB - timeA : timeA - timeB
                      })
                      .map((audit) => (
                        <div key={audit.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Badge className="mb-2">Status Change</Badge>
                              <div className="text-xs text-gray-600 mt-1">
                                {new Date(audit.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-xs text-gray-600">
                              Updated by: {audit.changedBy.name}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">
                                {audit.previousValue?.toUpperCase()}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                                {audit.newValue?.toUpperCase()}
                              </span>
                            </div>

                            {audit.description && (
                              <p className="text-xs text-gray-600 italic mt-2">{audit.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No status updates yet. Your add-on was recently created and is being reviewed.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditTrailModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
