'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ServiceCard } from '@/components/services/ServiceCard'
import { PurchaseHistory } from '@/components/services/PurchaseHistory'
import { ServicePurchaseModal } from '@/components/services/ServicePurchaseModal'
import { PaymentMethodForm } from '@/components/payments/PaymentMethodForm'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { AlertCircle, Briefcase } from 'lucide-react'
import { getActiveServicesByUserType, AdditionalServiceConfig } from '@/lib/additional-services'
import { useToast } from '@/components/ui/toast'
import { getServiceIdFromSku } from '@/lib/wordpress-sku-mapping'

interface ServicePurchase {
  id: string
  serviceId: string
  amountPaid: number
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: string
  completedAt?: string | null
  fulfillmentNotes?: string | null
}

function SeekerServicesContent() {
  const { addToast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('browse')
  const [purchases, setPurchases] = useState<ServicePurchase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasHandledAutoOpen, setHasHandledAutoOpen] = useState(false)
  const [hasHandledSuccess, setHasHandledSuccess] = useState(false)
  // Track if modal was opened from post-onboarding redirect (to know when to clean up localStorage)
  const [isFromPostOnboarding, setIsFromPostOnboarding] = useState(false)

  // Modal states
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [selectedService, setSelectedService] = useState<AdditionalServiceConfig | null>(null)
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false)
  const [returnToPurchaseModal, setReturnToPurchaseModal] = useState(false)

  // Get all active seeker services
  const services = getActiveServicesByUserType('seeker')

  // Handle URL params for auto-opening service modal (from marketing SKU flow)
  // Also handle tab param from PayPal return (success message already shown on PayPal return page)
  useEffect(() => {
    // Handle tab param from PayPal success return
    const tabParam = searchParams.get('tab')
    const successParam = searchParams.get('success')

    if (tabParam === 'history' && successParam === 'true' && !hasHandledSuccess) {
      setHasHandledSuccess(true)
      setActiveTab('history')
      // Don't show toast here - PayPal return page already showed success message
      // Just clear URL params to prevent issues on refresh
      router.replace('/seeker/services', { scroll: false })
    } else if (tabParam === 'history' && !successParam) {
      setActiveTab('history')
    }

    if (hasHandledAutoOpen) return

    const serviceParam = searchParams.get('service')
    const autoOpen = searchParams.get('autoOpen')

    if (serviceParam && autoOpen === 'true') {
      console.log('📦 SERVICES: Auto-opening modal for service param:', serviceParam)

      // Check if the param is a SKU (numeric) or a service ID (string like 'resume_refresh')
      // SKUs are numeric strings like '2228720', service IDs are like 'resume_refresh'
      let serviceId = serviceParam
      const isSku = /^\d+$/.test(serviceParam)
      if (isSku) {
        // It's a SKU - map to service ID
        const mappedServiceId = getServiceIdFromSku(serviceParam)
        if (mappedServiceId) {
          console.log('📦 SERVICES: Mapped SKU to service ID:', serviceParam, '->', mappedServiceId)
          serviceId = mappedServiceId
        } else {
          console.warn('📦 SERVICES: Unknown SKU:', serviceParam)
        }
      }

      const service = services.find(s => s.id === serviceId)
      if (service) {
        setSelectedService(service)
        setShowPurchaseModal(true)
        // Mark as from post-onboarding if it's a SKU (came from dashboard redirect)
        // This tells us to clean up localStorage when modal closes
        if (isSku) {
          setIsFromPostOnboarding(true)
        }
        addToast({
          title: 'Complete Your Purchase',
          description: `You selected ${service.name}. Complete payment to proceed.`,
          variant: 'default',
          duration: 5000,
        })
        // Clear URL params
        router.replace('/seeker/services', { scroll: false })
      } else {
        console.warn('📦 SERVICES: Service not found for ID:', serviceId)
      }
      setHasHandledAutoOpen(true)
    }
  }, [searchParams, services, hasHandledAutoOpen, hasHandledSuccess, addToast, router])

  // Fetch purchase history
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/seeker/services/purchased')
        if (!response.ok) {
          throw new Error('Failed to fetch purchase history')
        }

        const data = await response.json()
        setPurchases(data.purchases || [])
      } catch (err) {
        console.error('Error fetching purchases:', err)
        setError('Failed to load purchase history')
      } finally {
        setIsLoading(false)
      }
    }

    if (activeTab === 'history') {
      fetchPurchases()
    } else {
      setIsLoading(false)
    }
  }, [activeTab])

  const handlePurchase = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (service) {
      setSelectedService(service)
      setShowPurchaseModal(true)
    }
  }

  const handlePurchaseSuccess = async () => {
    addToast({
      title: 'Service Purchased Successfully!',
      description: 'Our team will contact you within 1-2 business days.',
      variant: 'success',
    })

    // ALWAYS clean up localStorage on successful purchase
    // This prevents the dashboard redirect loop issue regardless of how user got here
    // (via SKU redirect, direct navigation, or after adding payment method)
    const hadPostOnboardingService = localStorage.getItem('hmm_post_onboarding_service')
    if (hadPostOnboardingService) {
      console.log('📦 SERVICES: Purchase successful, cleaning up post-onboarding localStorage')
      localStorage.removeItem('hmm_post_onboarding_service')
    }
    setIsFromPostOnboarding(false)

    // Dispatch a local service_purchase event to trigger NotificationCenterProvider refresh
    // This is a fallback in case the SSE real-time notification wasn't received
    // (e.g., SSE connection not established, server-side broadcast failed)
    if (selectedService) {
      console.log('📦 SERVICES: Dispatching local service_purchase event for notification refresh')
      window.dispatchEvent(new CustomEvent('realTimeNotification', {
        detail: {
          id: `local_service_purchase_${Date.now()}`,
          type: 'service_purchase',
          title: 'Service Purchase Confirmed',
          message: `Your purchase of ${selectedService.name} has been confirmed.`,
          priority: 'high',
          showToast: false, // Don't show toast - we already showed one above
        }
      }))
    }

    // Refresh purchase history
    if (activeTab === 'history') {
      const response = await fetch('/api/seeker/services/purchased')
      if (response.ok) {
        const data = await response.json()
        setPurchases(data.purchases || [])
      }
    }

    // Switch to history tab to show the purchase
    setActiveTab('history')
  }

  const handlePurchaseError = (message: string) => {
    addToast({
      title: 'Purchase Failed',
      description: message,
      variant: 'destructive',
    })
  }

  const handleAddPaymentMethod = () => {
    setShowPaymentMethodForm(true)
    if (selectedService) {
      setReturnToPurchaseModal(true)
    }
  }

  const handleAddPaymentMethodWithReturn = () => {
    setShowPurchaseModal(false)
    handleAddPaymentMethod()
  }

  const handlePaymentMethodSuccess = () => {
    addToast({
      title: 'Payment Method Added',
      description: 'Your payment method has been added successfully.',
      variant: 'success',
    })

    if (returnToPurchaseModal) {
      setShowPaymentMethodForm(false)
      setShowPurchaseModal(true)
      setReturnToPurchaseModal(false)
    }
  }

  const handlePaymentMethodError = (message: string) => {
    addToast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Premium Services</h1>
          <p className="text-gray-600 mt-2">
            Boost your job search with our professional career services
          </p>
        </div>

        {/* Success Message (if redirected from successful purchase) */}
        {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') === 'true' && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Briefcase className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900">Purchase Successful!</h3>
                  <p className="text-sm text-green-800 mt-1">
                    Thank you for your purchase. Our team will contact you within 1-2 business days to get started.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse Services</TabsTrigger>
            <TabsTrigger value="history">
              My Purchases ({purchases.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6 mt-6">
            {services.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No services available
                    </h3>
                    <p className="text-gray-600">
                      Check back later for new career services
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onPurchase={handlePurchase}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                      <LoadingSpinner size="lg" className="mx-auto mb-4" />
                      <p className="text-gray-600">Loading your purchases...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Error Loading Purchases
                    </h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                      onClick={() => setActiveTab('browse')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Browse Services →
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <PurchaseHistory purchases={purchases} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Purchase Modal */}
      {selectedService && (
        <ServicePurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => {
            setShowPurchaseModal(false)
            // Clean up localStorage if this was from post-onboarding redirect
            // This prevents the user from being redirected again when they visit the dashboard
            if (isFromPostOnboarding) {
              console.log('📦 SERVICES: Cleaning up post-onboarding localStorage')
              localStorage.removeItem('hmm_post_onboarding_service')
              setIsFromPostOnboarding(false)
            }
          }}
          service={selectedService}
          onSuccess={handlePurchaseSuccess}
          onError={handlePurchaseError}
          onAddPaymentMethod={handleAddPaymentMethod}
          onAddPaymentMethodWithReturn={handleAddPaymentMethodWithReturn}
        />
      )}

      {/* Payment Method Form */}
      <PaymentMethodForm
        isOpen={showPaymentMethodForm}
        onClose={() => {
          setShowPaymentMethodForm(false)
          if (returnToPurchaseModal) {
            setReturnToPurchaseModal(false)
          }
        }}
        onSuccess={handlePaymentMethodSuccess}
        onError={handlePaymentMethodError}
        userType="seeker"
        mode="add"
      />
    </div>
  )
}

export default function SeekerServicesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SeekerServicesContent />
    </Suspense>
  )
}
