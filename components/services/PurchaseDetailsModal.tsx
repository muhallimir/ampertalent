'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  FileText,
  CreditCard,
  User,
  Package
} from 'lucide-react'

interface PurchaseDetails {
  id: string
  serviceId: string
  service: {
    serviceId: string
    name: string
    description: string
    price: number
    category: string
    features: string[]
  }
  amountPaid: number
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  fulfillmentNotes?: string | null
  assignedAdmin?: {
    id: string
    name: string
    email: string
  } | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
  payment?: {
    id: string
    transactionId: string
    amount: number
    status: string
    createdAt: string
  } | null
}

interface PurchaseDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  purchase: PurchaseDetails | null
  isLoading?: boolean
}

export function PurchaseDetailsModal({
  isOpen,
  onClose,
  purchase,
  isLoading = false,
}: PurchaseDetailsModalProps) {
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
        return <Badge className="bg-green-500">Completed</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-500">In Progress</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (!purchase) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            {getStatusIcon(purchase.status)}
            <span>Purchase Details</span>
          </DialogTitle>
          <DialogDescription>
            Order ID: {purchase.id}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    {getStatusBadge(purchase.status)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(purchase.amountPaid)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Information */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">Service Information</h3>
              </div>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{purchase.service.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {purchase.service.description}
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-medium capitalize">{purchase.service.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Service Price</p>
                      <p className="font-medium">{formatCurrency(purchase.service.price)}</p>
                    </div>
                  </div>

                  {purchase.service.features && purchase.service.features.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">What's Included</p>
                        <ul className="space-y-1">
                          {purchase.service.features.map((feature, index) => (
                            <li key={index} className="flex items-start space-x-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Payment Information */}
            {purchase.payment && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Payment Information</h3>
                </div>
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Transaction ID</p>
                        <p className="font-mono text-sm">{purchase.payment.transactionId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Status</p>
                        <Badge variant="outline" className="capitalize">
                          {purchase.payment.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Date</p>
                      <p className="text-sm">{formatDate(purchase.payment.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Fulfillment Notes */}
            {purchase.fulfillmentNotes && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Notes from Our Team</h3>
                </div>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <p className="text-sm text-blue-900 whitespace-pre-wrap">
                      {purchase.fulfillmentNotes}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Assigned Admin */}
            {purchase.assignedAdmin && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Assigned Team Member</h3>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{purchase.assignedAdmin.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {purchase.assignedAdmin.email}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Timeline */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">Timeline</h3>
              </div>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Purchase Created</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(purchase.createdAt)}
                      </p>
                    </div>
                  </div>

                  {purchase.updatedAt !== purchase.createdAt && (
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Last Updated</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(purchase.updatedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {purchase.completedAt && (
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Service Completed</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(purchase.completedAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Status-specific message */}
            {purchase.status === 'pending' && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-yellow-900">
                    <strong>What's next?</strong> Our team will review your request and contact you within 1-2 business days to get started.
                  </p>
                </CardContent>
              </Card>
            )}

            {purchase.status === 'in_progress' && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-blue-900">
                    <strong>In progress:</strong> We're actively working on your request. You'll be notified when it's complete.
                  </p>
                </CardContent>
              </Card>
            )}

            {purchase.status === 'completed' && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-green-900">
                    <strong>Completed!</strong> Thank you for using our service. If you have any questions, please contact support.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
