'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import {
  CreditCard,
  Package,
  TrendingUp,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Gift
} from 'lucide-react'
import { SEEKER_SUBSCRIPTION_PLANS, SeekerSubscriptionPlan } from '@/lib/subscription-plans'
import { ExclusiveOffersTab } from '@/components/admin/ExclusiveOffersTab'

interface Subscription {
  id: string
  userId: string
  planId: string
  status: 'active' | 'canceled' | 'expired' | 'pending' | 'past_due' | 'unpaid'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  plan: {
    id: string
    name: string
    price: number
    billing: string
  }
}

interface Package {
  id: string
  userId: string
  packageId: string
  status: 'active' | 'expired' | 'pending'
  purchaseDate: string
  expiryDate: string
  jobPostingsUsed: number
  jobPostingsRemaining: number
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface EmployerPackageTemplate {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  jobPostings: number
  duration: number // days
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  canceled: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  past_due: 'bg-orange-100 text-orange-800',
  unpaid: 'bg-red-100 text-red-800'
}

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  active: CheckCircle,
  canceled: XCircle,
  expired: AlertTriangle,
  pending: RefreshCw,
  past_due: AlertTriangle,
  unpaid: XCircle
}

const EMPLOYER_PACKAGE_TEMPLATES: EmployerPackageTemplate[] = [
  {
    id: 'standard',
    name: 'Standard Job Post',
    price: 97,
    description: 'Single job posting with standard visibility',
    features: ['30-day job posting', 'Standard visibility', 'Email support'],
    jobPostings: 1,
    duration: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'premium',
    name: 'Premium Job Post',
    price: 197,
    description: 'Enhanced job posting with premium features',
    features: ['60-day job posting', 'Premium visibility', 'Featured placement', 'Priority support'],
    jobPostings: 1,
    duration: 60,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'enterprise',
    name: 'Enterprise Package',
    price: 497,
    description: 'Multiple job postings with enterprise features',
    features: ['90-day job postings', 'Premium visibility', 'Featured placement', 'Priority support', 'Dedicated account manager'],
    jobPostings: 5,
    duration: 90,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export default function SubscriptionManagementPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')

  // Valid tab values
  const validTabs = ['subscriptions', 'packages', 'seeker-plans', 'employer-packages', 'exclusive-offers'] as const
  type TabType = typeof validTabs[number]

  // Get initial tab from URL or default to 'subscriptions'
  const getInitialTab = (): TabType => {
    if (tabParam && validTabs.includes(tabParam as TabType)) {
      return tabParam as TabType
    }
    return 'subscriptions'
  }

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [seekerPlans, setSeekerPlans] = useState<SeekerSubscriptionPlan[]>(SEEKER_SUBSCRIPTION_PLANS)
  const [employerPackages, setEmployerPackages] = useState<EmployerPackageTemplate[]>(EMPLOYER_PACKAGE_TEMPLATES)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<Subscription | Package | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab())
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  })
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })

  // Packages pagination state (client-side)
  const [packagesPagination, setPackagesPagination] = useState({
    page: 1,
    limit: 10,
  })

  // CRUD states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<SeekerSubscriptionPlan | EmployerPackageTemplate | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})

  const { addToast } = useToast()

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
      // Reset to page 1 when search changes
      setPagination(prev => ({ ...prev, page: 1 }))
      setPackagesPagination(prev => ({ ...prev, page: 1 }))
    }, 300) // 300ms delay

    return () => {
      clearTimeout(timer)
    }
  }, [filters.search])

  // Reset to page 1 when status filter or tab changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
    setPackagesPagination(prev => ({ ...prev, page: 1 }))
  }, [filters.status, activeTab])

  // Load data when filters, pagination, or tab changes
  useEffect(() => {
    loadData()
  }, [debouncedSearch, filters.status, activeTab, pagination.page])

  const loadData = async () => {
    try {
      setIsLoading(true)

      if (activeTab === 'subscriptions') {
        // Build query params for server-side filtering and pagination
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          status: filters.status,
          search: debouncedSearch
        })

        const response = await fetch(`/api/admin/subscriptions?${params}`)
        if (response.ok) {
          const text = await response.text()
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            // Session expired, redirect to sign-in
            window.location.href = '/sign-in'
            return
          }
          const data = JSON.parse(text)
          setSubscriptions(data.subscriptions || [])

          // Update pagination state from server response
          if (data.pagination) {
            setPagination(prev => ({
              ...prev,
              totalCount: data.pagination.totalCount,
              totalPages: data.pagination.totalPages,
              hasNextPage: data.pagination.hasNextPage,
              hasPrevPage: data.pagination.hasPrevPage
            }))
          }
        }
      } else if (activeTab === 'packages') {
        const response = await fetch('/api/admin/packages')
        if (response.ok) {
          const text = await response.text()
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            // Session expired, redirect to sign-in
            window.location.href = '/sign-in'
            return
          }
          const data = JSON.parse(text)
          let pkgs = data.packages || []

          // Apply filters (packages still use client-side filtering for now)
          if (filters.status && filters.status !== 'all') {
            pkgs = pkgs.filter((pkg: Package) => pkg.status === filters.status)
          }

          if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase()
            pkgs = pkgs.filter((pkg: Package) =>
              pkg.user.name.toLowerCase().includes(searchLower) ||
              pkg.user.email.toLowerCase().includes(searchLower) ||
              pkg.packageId.toLowerCase().includes(searchLower)
            )
          }

          setPackages(pkgs)
        }
      }
      // For template tabs, data is already loaded from state
    } catch (error) {
      console.error('Error loading data:', error)
      addToast({
        title: 'Error',
        description: 'Failed to load subscription data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemClick = (item: Subscription | Package) => {
    setSelectedItem(item)
    setIsDialogOpen(true)
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedItem) return

    try {
      setIsUpdating(true)

      const endpoint = activeTab === 'subscriptions'
        ? '/api/admin/subscriptions/manage'
        : '/api/admin/packages/manage'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: selectedItem.id,
          action: newStatus === 'canceled' ? 'cancel' : 'update',
          status: newStatus
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }
      const text = await response.text()
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        // Session expired, redirect to sign-in
        window.location.href = '/sign-in'
        return
      }
      const data = JSON.parse(text)


      addToast({
        title: 'Success',
        description: `${activeTab === 'subscriptions' ? 'Subscription' : 'Package'} updated successfully`,
        variant: 'default'
      })

      setIsDialogOpen(false)
      setSelectedItem(null)
      loadData()
    } catch (error) {
      console.error('Error updating status:', error)
      addToast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      setIsUpdating(true)

      if (activeTab === 'seeker-plans') {
        // Create new seeker plan
        const newPlan: SeekerSubscriptionPlan = {
          id: formData.id || `custom-${Date.now()}`,
          name: formData.name || 'New Plan',
          price: formData.price || 0,
          billing: formData.billing || 'month',
          duration: formData.duration || 30,
          resumeLimit: formData.resumeLimit || '1 Version of your Resume',
          description: formData.description || '',
          features: formData.features ? formData.features.split('\n').filter((f: string) => f.trim()) : [],
          support: formData.support ? formData.support.split('\n').filter((s: string) => s.trim()) : [],
          icon: CreditCard, // Default icon
          color: formData.color || 'text-blue-600',
          bgColor: formData.bgColor || 'bg-blue-100',
          borderColor: formData.borderColor || 'border-blue-500',
          popular: formData.popular || false,
          trialDays: formData.trialDays,
          includes: formData.includes
        }
        setSeekerPlans(prev => [...prev, newPlan])
      } else {
        // Create new employer package
        const newPackage: EmployerPackageTemplate = {
          id: formData.id || `custom-${Date.now()}`,
          name: formData.name || 'New Package',
          price: formData.price || 0,
          description: formData.description || '',
          features: formData.features ? formData.features.split('\n').filter((f: string) => f.trim()) : [],
          jobPostings: formData.jobPostings || 1,
          duration: formData.duration || 30,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setEmployerPackages(prev => [...prev, newPackage])
      }

      addToast({
        title: 'Success',
        description: `${activeTab === 'seeker-plans' ? 'Seeker plan' : 'Employer package'} created successfully`,
        variant: 'default'
      })

      setIsCreateDialogOpen(false)
      setFormData({})
    } catch (error) {
      console.error('Error creating template:', error)
      addToast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEditTemplate = async () => {
    try {
      setIsUpdating(true)

      if (activeTab === 'seeker-plans') {
        setSeekerPlans(prev => prev.map(plan =>
          plan.id === selectedTemplate?.id ? {
            ...plan,
            ...formData,
            features: formData.features ? formData.features.split('\n').filter((f: string) => f.trim()) : plan.features,
            support: formData.support ? formData.support.split('\n').filter((s: string) => s.trim()) : plan.support
          } : plan
        ))
      } else {
        setEmployerPackages(prev => prev.map(pkg =>
          pkg.id === selectedTemplate?.id ? {
            ...pkg,
            ...formData,
            features: formData.features ? formData.features.split('\n').filter((f: string) => f.trim()) : pkg.features,
            updatedAt: new Date().toISOString()
          } : pkg
        ))
      }

      addToast({
        title: 'Success',
        description: `${activeTab === 'seeker-plans' ? 'Seeker plan' : 'Employer package'} updated successfully`,
        variant: 'default'
      })

      setIsEditDialogOpen(false)
      setSelectedTemplate(null)
      setFormData({})
    } catch (error) {
      console.error('Error updating template:', error)
      addToast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteTemplate = async (template: SeekerSubscriptionPlan | EmployerPackageTemplate) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    try {
      if (activeTab === 'seeker-plans') {
        setSeekerPlans(prev => prev.filter(plan => plan.id !== template.id))
      } else {
        setEmployerPackages(prev => prev.filter(pkg => pkg.id !== template.id))
      }

      addToast({
        title: 'Success',
        description: `${activeTab === 'seeker-plans' ? 'Seeker plan' : 'Employer package'} deleted successfully`,
        variant: 'default'
      })
    } catch (error) {
      console.error('Error deleting template:', error)
      addToast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      })
    }
  }

  const handleEditClick = (template: SeekerSubscriptionPlan | EmployerPackageTemplate) => {
    setSelectedTemplate(template)
    const formDataWithArrays = {
      ...template,
      features: Array.isArray(template.features) ? template.features.join('\n') : template.features,
      support: 'support' in template && Array.isArray(template.support) ? template.support.join('\n') : ''
    }
    setFormData(formDataWithArrays)
    setIsEditDialogOpen(true)
  }

  const getCurrentData = () => {
    switch (activeTab) {
      case 'subscriptions':
        return subscriptions
      case 'packages':
        // Client-side pagination for packages
        const startIndex = (packagesPagination.page - 1) * packagesPagination.limit
        const endIndex = startIndex + packagesPagination.limit
        return packages.slice(startIndex, endIndex)
      case 'seeker-plans':
        return seekerPlans
      case 'employer-packages':
        return employerPackages
      default:
        return []
    }
  }

  // Get packages pagination info
  const packagesTotalPages = Math.ceil(packages.length / packagesPagination.limit)
  const packagesHasNextPage = packagesPagination.page < packagesTotalPages
  const packagesHasPrevPage = packagesPagination.page > 1

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading && (activeTab === 'subscriptions' || activeTab === 'packages')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const currentData = getCurrentData()

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Management</h1>
        <p className="text-gray-600">
          Manage user subscriptions, packages, and pricing templates
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'subscriptions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              User Subscriptions
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'packages'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              User Packages
            </button>
            <button
              onClick={() => setActiveTab('seeker-plans')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'seeker-plans'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Seeker Plans
            </button>
            <button
              onClick={() => setActiveTab('employer-packages')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'employer-packages'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Employer Packages
            </button>
            <button
              onClick={() => setActiveTab('exclusive-offers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-1 ${activeTab === 'exclusive-offers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Gift className="h-4 w-4" />
              Exclusive Offers
            </button>
          </nav>
        </div>
      </div>

      {/* Exclusive Offers Tab Content */}
      {activeTab === 'exclusive-offers' && (
        <ExclusiveOffersTab />
      )}

      {/* Filters - Only show for user data tabs */}
      {(activeTab === 'subscriptions' || activeTab === 'packages') && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search users..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value: string) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({ status: 'all', search: '' });
                    setDebouncedSearch('');
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Button for Templates */}
      {(activeTab === 'seeker-plans' || activeTab === 'employer-packages') && (
        <div className="mb-6">
          <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create New {activeTab === 'seeker-plans' ? 'Seeker Plan' : 'Employer Package'}</span>
          </Button>
        </div>
      )}

      {/* Data List - Not shown for exclusive-offers tab which has its own component */}
      {activeTab !== 'exclusive-offers' && (
        <div className="space-y-4">
          {currentData.length > 0 ? (
            currentData.map((item: any) => {
              // Handle different item types
              if (activeTab === 'subscriptions' || activeTab === 'packages') {
                // Use fallback icon/color for unknown statuses to prevent React error #130
                const StatusIcon = STATUS_ICONS[item.status] || AlertTriangle
                const statusColor = STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-800'

                return (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleItemClick(item)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="flex-shrink-0">
                            {activeTab === 'subscriptions' ? (
                              <CreditCard className="h-6 w-6 text-blue-600" />
                            ) : (
                              <Package className="h-6 w-6 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {activeTab === 'subscriptions'
                                  ? (item as Subscription).plan.name
                                  : (item as Package).packageId
                                }
                              </h3>
                              <Badge className={statusColor}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <User className="h-4 w-4" />
                                <span>{item.user.name} ({item.user.email})</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {activeTab === 'subscriptions'
                                    ? `Ends: ${formatDate((item as Subscription).currentPeriodEnd)}`
                                    : `Expires: ${formatDate((item as Package).expiryDate)}`
                                  }
                                </span>
                              </div>
                            </div>
                            {activeTab === 'subscriptions' && (item as Subscription).cancelAtPeriodEnd && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                  Cancels at period end
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          {activeTab === 'subscriptions' ? (
                            <div className="text-right">
                              <div className="font-semibold">${(item as Subscription).plan.price}</div>
                              <div className="text-sm text-gray-500">/{(item as Subscription).plan.billing}</div>
                            </div>
                          ) : (
                            <div className="text-right">
                              <div className="font-semibold">{(item as Package).jobPostingsRemaining} left</div>
                              <div className="text-sm text-gray-500">of {(item as Package).jobPostingsUsed + (item as Package).jobPostingsRemaining} credits</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              } else {
                // Handle template items (seeker plans and employer packages)
                return (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="flex-shrink-0">
                            {activeTab === 'seeker-plans' ? (
                              <CreditCard className="h-6 w-6 text-blue-600" />
                            ) : (
                              <Package className="h-6 w-6 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {item.name}
                              </h3>
                              {activeTab === 'seeker-plans' && item.popular && (
                                <Badge className="bg-yellow-100 text-yellow-800">Popular</Badge>
                              )}
                              {activeTab === 'employer-packages' && (
                                <Badge className={item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                  {item.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <DollarSign className="h-4 w-4" />
                                <span>${item.price}</span>
                              </div>
                              {activeTab === 'seeker-plans' && (
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{item.duration} days</span>
                                </div>
                              )}
                              {activeTab === 'employer-packages' && (
                                <div className="flex items-center space-x-1">
                                  <Package className="h-4 w-4" />
                                  <span>{item.jobPostings} job postings</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(item)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              }
            })
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                {activeTab === 'subscriptions' ? (
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                ) : (
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                )}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No {activeTab.replace('-', ' ')} found
                </h3>
                <p className="text-gray-600">
                  {Object.values(filters).some(f => f && f !== 'all')
                    ? 'Try adjusting your filters to see more results.'
                    : `No ${activeTab.replace('-', ' ')} have been created yet.`
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pagination Controls - Only show for subscriptions tab */}
      {activeTab === 'subscriptions' && pagination.totalPages > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} subscriptions
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={!pagination.hasPrevPage || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.hasNextPage || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Pagination Controls - User Packages tab */}
      {activeTab === 'packages' && packagesTotalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((packagesPagination.page - 1) * packagesPagination.limit) + 1} to{' '}
            {Math.min(packagesPagination.page * packagesPagination.limit, packages.length)} of{' '}
            {packages.length} packages
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPackagesPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={!packagesHasPrevPage || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm text-gray-600">
              Page {packagesPagination.page} of {packagesTotalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPackagesPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!packagesHasNextPage || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Update Dialog for User Data */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Manage {activeTab === 'subscriptions' ? 'Subscription' : 'Package'}
            </DialogTitle>
            <DialogDescription>
              Update the status or manage this {activeTab === 'subscriptions' ? 'subscription' : 'package'}.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              {/* Item Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">
                  {activeTab === 'subscriptions'
                    ? (selectedItem as Subscription).plan.name
                    : (selectedItem as Package).packageId
                  }
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">User:</span> {selectedItem.user.name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {selectedItem.user.email}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {selectedItem.status}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(
                      'createdAt' in selectedItem ? selectedItem.createdAt : selectedItem.purchaseDate
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <h4 className="font-semibold">Available Actions</h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedItem.status === 'active' && (
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus('canceled')}
                      disabled={isUpdating}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                  {selectedItem.status === 'canceled' && activeTab === 'subscriptions' && !(selectedItem as Subscription).cancelAtPeriodEnd && (
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus('active')}
                      disabled={isUpdating}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Reactivate
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Create New {activeTab === 'seeker-plans' ? 'Seeker Plan' : 'Employer Package'}
            </DialogTitle>
            <DialogDescription>
              Add a new {activeTab === 'seeker-plans' ? 'subscription plan for seekers' : 'package template for employers'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="id">ID</Label>
                <Input
                  id="id"
                  value={formData.id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                  placeholder="unique-id"
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Plan/Package name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                  placeholder="30"
                />
              </div>
            </div>

            {activeTab === 'seeker-plans' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billing">Billing Period</Label>
                  <Input
                    id="billing"
                    value={formData.billing || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, billing: e.target.value }))}
                    placeholder="month"
                  />
                </div>
                <div>
                  <Label htmlFor="resumeLimit">Resume Limit</Label>
                  <Input
                    id="resumeLimit"
                    value={formData.resumeLimit || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, resumeLimit: e.target.value }))}
                    placeholder="1 Version of your Resume"
                  />
                </div>
              </div>
            )}

            {activeTab === 'employer-packages' && (
              <div>
                <Label htmlFor="jobPostings">Job Postings</Label>
                <Input
                  id="jobPostings"
                  type="number"
                  value={formData.jobPostings || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobPostings: parseInt(e.target.value) || 0 }))}
                  placeholder="1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Plan/Package description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="features">Features (one per line)</Label>
              <Textarea
                id="features"
                value={formData.features || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                rows={4}
              />
            </div>

            {activeTab === 'seeker-plans' && (
              <div>
                <Label htmlFor="support">Support Options (one per line)</Label>
                <Textarea
                  id="support"
                  value={formData.support || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, support: e.target.value }))}
                  placeholder="Email Support: Monday – Friday&#10;Phone Support"
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={isUpdating}>
              {isUpdating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {activeTab === 'seeker-plans' ? 'Seeker Plan' : 'Employer Package'}
            </DialogTitle>
            <DialogDescription>
              Update the {activeTab === 'seeker-plans' ? 'subscription plan' : 'package template'} details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-id">ID</Label>
                <Input
                  id="edit-id"
                  value={formData.id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                  placeholder="unique-id"
                />
              </div>
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Plan/Package name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-price">Price ($)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="edit-duration">Duration (days)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                  placeholder="30"
                />
              </div>
            </div>

            {activeTab === 'seeker-plans' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-billing">Billing Period</Label>
                  <Input
                    id="edit-billing"
                    value={formData.billing || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, billing: e.target.value }))}
                    placeholder="month"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-resumeLimit">Resume Limit</Label>
                  <Input
                    id="edit-resumeLimit"
                    value={formData.resumeLimit || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, resumeLimit: e.target.value }))}
                    placeholder="1 Version of your Resume"
                  />
                </div>
              </div>
            )}

            {activeTab === 'employer-packages' && (
              <div>
                <Label htmlFor="edit-jobPostings">Job Postings</Label>
                <Input
                  id="edit-jobPostings"
                  type="number"
                  value={formData.jobPostings || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobPostings: parseInt(e.target.value) || 0 }))}
                  placeholder="1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Plan/Package description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-features">Features (one per line)</Label>
              <Textarea
                id="edit-features"
                value={formData.features || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                rows={4}
              />
            </div>

            {activeTab === 'seeker-plans' && (
              <div>
                <Label htmlFor="edit-support">Support Options (one per line)</Label>
                <Textarea
                  id="edit-support"
                  value={formData.support || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, support: e.target.value }))}
                  placeholder="Email Support: Monday – Friday&#10;Phone Support"
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTemplate} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}