'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, CheckCircle, AlertCircle, XCircle, Eye } from 'lucide-react'
import { getServiceById, formatServicePrice } from '@/lib/additional-services'
import { PurchaseDetailsModal } from './PurchaseDetailsModal'

interface ServicePurchase {
  id: string
  serviceId: string
  amountPaid: number
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  createdAt: string
  completedAt?: string | null
  fulfillmentNotes?: string | null
}

interface PurchaseHistoryProps {
  purchases: ServicePurchase[]
  isLoading?: boolean
}

export function PurchaseHistory({ purchases, isLoading }: PurchaseHistoryProps) {
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const handleViewDetails = async (purchaseId: string) => {
    try {
      setLoadingDetails(true)
      setDetailsModalOpen(true)

      const response = await fetch(`/api/seeker/services/${purchaseId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch purchase details')
      }

      const data = await response.json()
      setSelectedPurchase(data.purchase)
    } catch (error) {
      console.error('Error fetching purchase details:', error)
      // Keep modal open but show error state
      setSelectedPurchase(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500">In Progress</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Your request has been received and will be processed soon.'
      case 'in_progress':
        return 'Our team is currently working on your request.'
      case 'completed':
        return 'Your service has been completed!'
      case 'cancelled':
        return 'This request was cancelled.'
      default:
        return ''
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4 animate-spin" />
            <p className="text-gray-600">Loading your purchase history...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (purchases.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No purchases yet
            </h3>
            <p className="text-gray-600">
              When you purchase a service, it will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {purchases.map((purchase) => {
          const service = getServiceById(purchase.serviceId)

          return (
            <Card key={purchase.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-3">
                    {getStatusIcon(purchase.status)}
                    <span>{service?.name || 'Unknown Service'}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(purchase.status)}
                    <span className="text-lg font-semibold text-gray-900">
                      {formatServicePrice(purchase.amountPaid)}
                    </span>
                  </div>
                </div>
                <CardDescription>
                  Purchased on {new Date(purchase.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  {purchase.completedAt && (
                    <span className="ml-2">
                      • Completed on {new Date(purchase.completedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    {getStatusMessage(purchase.status)}
                  </p>

                  {purchase.fulfillmentNotes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-900 mb-1">
                        Notes from our team:
                      </p>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">
                        {purchase.fulfillmentNotes}
                      </p>
                    </div>
                  )}

                  {purchase.status === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>What's next?</strong> Our team will review your request and contact you within 1-2 business days to get started.
                      </p>
                    </div>
                  )}

                  {purchase.status === 'in_progress' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>In progress:</strong> We're working on your request. You'll be notified when it's complete.
                      </p>
                    </div>
                  )}

                  {purchase.status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        <strong>Completed!</strong> Thank you for using our service. If you have any questions, please contact support.
                      </p>
                    </div>
                  )}

                  <div className="pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(purchase.id)}
                      className="w-full sm:w-auto"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Purchase Details Modal */}
      <PurchaseDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false)
          setSelectedPurchase(null)
        }}
        purchase={selectedPurchase}
        isLoading={loadingDetails}
      />
    </>
  )
}
