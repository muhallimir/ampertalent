'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useToast } from '@/hooks/use-toast'
import { AbandonedCartWidget } from '@/components/admin/abandoned-cart-widget'
import { AbandonedCartService, AbandonedCart } from '@/lib/abandoned-cart-service'
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  AlertCircle,
  Clock,
  Target,
  UserCheck,
  RotateCcw,
  Search,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts'

interface SalesMetrics {
  totalRevenue: number
  monthlyRecurringRevenue: number
  averageRevenuePerUser: number
  totalTransactions: number
  revenueBySource: {
    seekerSubscriptions: number
    employerPackages: number
    seekerServices?: number // Premium service purchases
    exclusiveOffers?: number // Employer exclusive recurring plans
  }
  exclusiveOffersMetrics?: {
    activeSubscriptions: number
    monthlyMRR: number
    totalExpectedValue: number
  }
  revenueByPaymentMethod?: {
    cardRevenue: number
    paypalRevenue: number
    cardTransactions: number
    paypalTransactions: number
  }
  revenueGrowth: {
    thisMonth: number
    lastMonth: number
    growthPercentage: number
  }
  topPlans: Array<{
    planId: string
    planName: string
    revenue: number
    count: number
  }>
  recentTransactions: Array<{
    id: string
    amount: number
    planId: string
    planName: string
    userType: 'seeker' | 'employer'
    userName: string
    userEmail: string
    userId: string
    createdAt: string
    status: string
    paymentMethod: 'card' | 'paypal'
    ghlTransactionId: string | null
    authnetTransactionId: string | null
    isNew: boolean
  }>
  monthlyTrend: Array<{
    month: string
    revenue: number
    transactions: number
  }>
  churnMetrics: {
    churnRate: number
    retentionRate: number
    canceledSubscriptions: number
    activeSubscriptions: number
  }
  transactionsPagination?: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  trialMetrics: {
    activeTrials: number
    trialConversionRate: number
    trialsCanceledDuringTrial: number
    trialsConvertedToPaid: number
    averageTrialDuration: number
    trialRevenuePotential: number
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AdminSalesPage() {
  const { toast } = useToast()
  const [salesData, setSalesData] = useState<SalesMetrics | null>(null)
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [includeAbandonedCarts, setIncludeAbandonedCarts] = useState(true)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [confirmRefundTransaction, setConfirmRefundTransaction] = useState<SalesMetrics['recentTransactions'][0] | null>(null)

  const enableRefunds = process.env.NEXT_PUBLIC_ENABLE_REFUNDS === 'true'

  // Transaction filters state
  const getDefaultDates = () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    return { start: fmt(yesterday), end: fmt(today) }
  }
  const defaultDates = getDefaultDates()
  const [txStartDate, setTxStartDate] = useState(defaultDates.start)
  const [txEndDate, setTxEndDate] = useState(defaultDates.end)
  const [txEmail, setTxEmail] = useState('')
  const [txStatus, setTxStatus] = useState('')
  const [txPaymentMethod, setTxPaymentMethod] = useState('')
  const [txType, setTxType] = useState('') // '' | 'new' | 'recurring'
  const [txRole, setTxRole] = useState('') // '' | 'seeker' | 'employer'
  const [txPage, setTxPage] = useState(1)
  const [isTxLoading, setIsTxLoading] = useState(false)
  const TX_PAGE_SIZE = 20

  const handleRefund = async (paymentId: string) => {
    try {
      setRefundingId(paymentId)
      setConfirmRefundTransaction(null)

      const response = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Refund failed')
      }

      // Update local state
      if (salesData) {
        setSalesData({
          ...salesData,
          recentTransactions: salesData.recentTransactions.map(t =>
            t.id === paymentId ? { ...t, status: 'refunded' } : t
          ),
        })
      }

      toast({
        title: 'Refund processed',
        description: `Refund completed successfully. Refund ID: ${data.refundId || 'N/A'}`,
      })
    } catch (error) {
      toast({
        title: 'Refund failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setRefundingId(null)
    }
  }

  const loadSalesData = async (txFilters?: { startDate?: string; endDate?: string; email?: string; page?: number }) => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams()
      if (txFilters?.startDate) params.set('startDate', txFilters.startDate)
      if (txFilters?.endDate) params.set('endDate', txFilters.endDate)
      if (txFilters?.email) params.set('email', txFilters.email)
      params.set('page', String(txFilters?.page ?? 1))
      params.set('pageSize', String(TX_PAGE_SIZE))

      // Fetch sales data, trial metrics, AND abandoned carts
      const [salesResponse, trialResponse] = await Promise.all([
        fetch(`/api/admin/sales?${params}`),
        fetch('/api/admin/sales/trial-metrics')
      ])

      // Fetch abandoned carts (non-blocking, continue if fails)
      let carts: AbandonedCart[] = []
      try {
        carts = await AbandonedCartService.getAbandonedCarts(100)
        setAbandonedCarts(carts)
      } catch (error) {
        console.warn('Could not fetch abandoned carts:', error)
      }

      if (salesResponse.ok && trialResponse.ok) {
        // Check if response is HTML (session expired)
        const salesText = await salesResponse.text()
        if (salesText.trim().startsWith('<!DOCTYPE') || salesText.trim().startsWith('<html')) {
          // Session expired, redirect to sign-in
          window.location.href = '/sign-in'
          return
        }

        const trialText = await trialResponse.text()
        if (trialText.trim().startsWith('<!DOCTYPE') || trialText.trim().startsWith('<html')) {
          // Session expired, redirect to sign-in
          window.location.href = '/sign-in'
          return
        }

        const salesResult = JSON.parse(salesText)
        const trialResult = JSON.parse(trialText)

        // Combine the data
        setSalesData({
          ...salesResult.data,
          trialMetrics: trialResult.trialMetrics
        })
        setLastUpdated(new Date())
      } else {
        throw new Error('Failed to load sales data')
      }
    } catch (error) {
      console.error('Error loading sales data:', error)
      toast({
        title: "Error",
        description: "Failed to load sales data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadTransactions = async (filters: { startDate?: string; endDate?: string; email?: string; status?: string; paymentMethod?: string; transactionType?: string; userRole?: string; page?: number }) => {
    try {
      setIsTxLoading(true)
      const params = new URLSearchParams()
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      if (filters.email) params.set('email', filters.email)
      if (filters.status) params.set('status', filters.status)
      if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod)
      if (filters.transactionType) params.set('transactionType', filters.transactionType)
      if (filters.userRole) params.set('userRole', filters.userRole)
      params.set('page', String(filters.page ?? 1))
      params.set('pageSize', String(TX_PAGE_SIZE))

      const response = await fetch(`/api/admin/sales?${params}`)
      if (!response.ok) throw new Error('Failed to load transactions')

      const text = await response.text()
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        window.location.href = '/sign-in'
        return
      }

      const result = JSON.parse(text)
      if (result.success) {
        setSalesData(prev => prev ? {
          ...prev,
          recentTransactions: result.data.recentTransactions,
          transactionsPagination: result.data.transactionsPagination,
        } : prev)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load transactions. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsTxLoading(false)
    }
  }

  const applyTxFilters = () => {
    setTxPage(1)
    loadTransactions({ startDate: txStartDate, endDate: txEndDate, email: txEmail, status: txStatus, paymentMethod: txPaymentMethod, transactionType: txType, userRole: txRole, page: 1 })
  }

  const clearTxFilters = () => {
    const { start, end } = getDefaultDates()
    setTxStartDate(start)
    setTxEndDate(end)
    setTxEmail('')
    setTxStatus('')
    setTxPaymentMethod('')
    setTxType('')
    setTxRole('')
    setTxPage(1)
    loadTransactions({ startDate: start, endDate: end, page: 1 })
  }

  const changeTxPage = (newPage: number) => {
    setTxPage(newPage)
    loadTransactions({ startDate: txStartDate, endDate: txEndDate, email: txEmail, status: txStatus, paymentMethod: txPaymentMethod, transactionType: txType, userRole: txRole, page: newPage })
  }

  useEffect(() => {
    const { start, end } = getDefaultDates()
    loadSalesData({ startDate: start, endDate: end })
  }, [])

  // Helper function to escape CSV values
  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    const stringValue = String(value)
    // If value contains comma, newline, or quote, wrap in quotes and escape inner quotes
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  // Function to convert sales data to CSV format
  const convertToCSV = (data: SalesMetrics, carts: AbandonedCart[], includeAbandoned: boolean = true): string => {
    let csv = ''

    // Add header with export date
    csv += `Sales Data Export${'\n'}`
    csv += `Exported on: ${new Date().toLocaleString()}${'\n'}${'\n'}`

    // Summary metrics
    csv += `Summary Metrics${'\n'}`
    csv += `Metric,Value${'\n'}`
    csv += `Total Revenue,${escapeCsvValue(data.totalRevenue)}${'\n'}`
    csv += `Monthly Recurring Revenue,${escapeCsvValue(data.monthlyRecurringRevenue)}${'\n'}`
    csv += `Average Revenue Per User,${escapeCsvValue(data.averageRevenuePerUser)}${'\n'}`
    csv += `Total Transactions,${escapeCsvValue(data.totalTransactions)}${'\n'}`
    csv += `${'\n'}`

    // Revenue by source
    csv += `Revenue by Source${'\n'}`
    csv += `Source,Revenue${'\n'}`
    csv += `Seeker Subscriptions,${escapeCsvValue(data.revenueBySource.seekerSubscriptions)}${'\n'}`
    csv += `Employer Packages,${escapeCsvValue(data.revenueBySource.employerPackages)}${'\n'}`
    if (data.revenueBySource.seekerServices !== undefined) {
      csv += `Premium Services,${escapeCsvValue(data.revenueBySource.seekerServices)}${'\n'}`
    }
    csv += `${'\n'}`

    // Revenue by payment method
    if (data.revenueByPaymentMethod) {
      csv += `Revenue by Payment Method${'\n'}`
      csv += `Payment Method,Revenue,Transactions${'\n'}`
      csv += `Credit Card,${escapeCsvValue(data.revenueByPaymentMethod.cardRevenue)},${escapeCsvValue(data.revenueByPaymentMethod.cardTransactions)}${'\n'}`
      csv += `PayPal,${escapeCsvValue(data.revenueByPaymentMethod.paypalRevenue)},${escapeCsvValue(data.revenueByPaymentMethod.paypalTransactions)}${'\n'}`
      csv += `${'\n'}`
    }

    // Revenue growth
    csv += `Revenue Growth${'\n'}`
    csv += `Metric,Value${'\n'}`
    csv += `This Month,${escapeCsvValue(data.revenueGrowth.thisMonth)}${'\n'}`
    csv += `Last Month,${escapeCsvValue(data.revenueGrowth.lastMonth)}${'\n'}`
    csv += `Growth Percentage,${escapeCsvValue(data.revenueGrowth.growthPercentage)}%${'\n'}`
    csv += `${'\n'}`

    // Top plans
    csv += `Top Plans${'\n'}`
    csv += `Plan Name,Revenue,Count${'\n'}`
    data.topPlans.forEach(plan => {
      csv += `${escapeCsvValue(plan.planName)},${escapeCsvValue(plan.revenue)},${escapeCsvValue(plan.count)}${'\n'}`
    })
    csv += `${'\n'}`

    // Recent transactions
    csv += `Recent Transactions${'\n'}`
    csv += `ID,Amount,Plan Name,User Type,User Name,User Email,Created At,Status${'\n'}`
    data.recentTransactions.forEach(transaction => {
      csv += `${escapeCsvValue(transaction.id)},${escapeCsvValue(transaction.amount)},${escapeCsvValue(transaction.planName)},${escapeCsvValue(transaction.userType)},${escapeCsvValue(transaction.userName)},${escapeCsvValue(transaction.userEmail)},${escapeCsvValue(transaction.createdAt)},${escapeCsvValue(transaction.status)}${'\n'}`
    })
    csv += `${'\n'}`

    // Monthly trend
    csv += `Monthly Trend${'\n'}`
    csv += `Month,Revenue,Transactions${'\n'}`
    data.monthlyTrend.forEach(trend => {
      csv += `${escapeCsvValue(trend.month)},${escapeCsvValue(trend.revenue)},${escapeCsvValue(trend.transactions)}${'\n'}`
    })
    csv += `${'\n'}`

    // Churn metrics
    csv += `Churn Metrics${'\n'}`
    csv += `Metric,Value${'\n'}`
    csv += `Churn Rate,${escapeCsvValue(data.churnMetrics.churnRate)}%${'\n'}`
    csv += `Retention Rate,${escapeCsvValue(data.churnMetrics.retentionRate)}%${'\n'}`
    csv += `Canceled Subscriptions,${escapeCsvValue(data.churnMetrics.canceledSubscriptions)}${'\n'}`
    csv += `Active Subscriptions,${escapeCsvValue(data.churnMetrics.activeSubscriptions)}${'\n'}`
    csv += `${'\n'}`

    // Trial metrics
    csv += `Trial Metrics${'\n'}`
    csv += `Metric,Value${'\n'}`
    csv += `Active Trials,${escapeCsvValue(data.trialMetrics.activeTrials)}${'\n'}`
    csv += `Trial Conversion Rate,${escapeCsvValue(data.trialMetrics.trialConversionRate)}%${'\n'}`
    csv += `Trials Canceled During Trial,${escapeCsvValue(data.trialMetrics.trialsCanceledDuringTrial)}${'\n'}`
    csv += `Trials Converted To Paid,${escapeCsvValue(data.trialMetrics.trialsConvertedToPaid)}${'\n'}`
    csv += `Average Trial Duration,${escapeCsvValue(data.trialMetrics.averageTrialDuration)} days${'\n'}`
    csv += `Trial Revenue Potential,${escapeCsvValue(data.trialMetrics.trialRevenuePotential)}${'\n'}`
    csv += `${'\n'}`

    // Abandoned Carts (conditional based on toggle)
    if (includeAbandoned && carts && carts.length > 0) {
      csv += `Abandoned Checkouts${'\n'}`
      csv += `Email,User Type,Plan/Package,Status,Job Title,Created At,Expires At,Estimated Value${'\n'}`
      carts.forEach(cart => {
        const status = cart.isExpired ? 'Expired' : 'Active'
        const jobTitle = cart.jobTitle || ''
        csv += `${escapeCsvValue(cart.email)},${escapeCsvValue(cart.userType)},${escapeCsvValue(cart.selectedPlan || 'none')},${escapeCsvValue(status)},${escapeCsvValue(jobTitle)},${escapeCsvValue(cart.createdAt)},${escapeCsvValue(cart.expiresAt)},${escapeCsvValue(cart.estimatedValue)}${'\n'}`
      })
      csv += `${'\n'}`

      // Abandoned Carts Summary
      const activeAbandonedCarts = carts.filter(c => !c.isExpired)
      const expiredAbandonedCarts = carts.filter(c => c.isExpired)
      const totalAbandonedValue = carts.filter(c => c.planStatus === 'paid').reduce((sum, c) => sum + c.estimatedValue, 0)
      const seekerCarts = carts.filter(c => c.userType === 'seeker')
      const employerCarts = carts.filter(c => c.userType === 'employer')

      csv += `Abandoned Checkouts Summary${'\n'}`
      csv += `Metric,Value${'\n'}`
      csv += `Total Abandoned Carts,${carts.length}${'\n'}`
      csv += `Active Carts,${activeAbandonedCarts.length}${'\n'}`
      csv += `Expired Carts,${expiredAbandonedCarts.length}${'\n'}`
      csv += `Total Recoverable Revenue,${escapeCsvValue(totalAbandonedValue.toFixed(2))}${'\n'}`
      csv += `Seeker Abandonments,${seekerCarts.length}${'\n'}`
      csv += `Employer Abandonments,${employerCarts.length}${'\n'}`
      csv += `${'\n'}`
    }

    return csv
  }

  // Function to trigger CSV download
  const handleExportWithOptions = () => {
    if (!salesData) {
      toast({
        title: "No Data",
        description: "No sales data available to export.",
        variant: "destructive"
      })
      return
    }

    try {
      const csvContent = convertToCSV(salesData, abandonedCarts, includeAbandonedCarts)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `sales-data-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Successful",
        description: `Sales data${includeAbandonedCarts ? ' with abandoned checkouts' : ''} has been exported to CSV.`,
      })

      setIsExportDialogOpen(false)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export sales data. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Legacy function for backward compatibility (now opens dialog)
  const downloadCSV = () => {
    setIsExportDialogOpen(true)
  }

  // Transaction-tab specific CSV export (respects current filters)
  const exportTransactionsCsv = async () => {
    if (!salesData) {
      toast({
        title: 'No Transactions',
        description: 'No transactions to export for the current filters.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Fetch ALL filtered transactions (not just current page)
      const params = new URLSearchParams()
      if (txStartDate) params.set('startDate', txStartDate)
      if (txEndDate) params.set('endDate', txEndDate)
      if (txEmail) params.set('email', txEmail)
      if (txStatus) params.set('status', txStatus)
      if (txPaymentMethod) params.set('paymentMethod', txPaymentMethod)
      if (txType) params.set('transactionType', txType)
      if (txRole) params.set('userRole', txRole)
      params.set('page', '1')
      params.set('pageSize', '10000') // fetch all matching records

      const response = await fetch(`/api/admin/sales?${params}`)
      if (!response.ok) throw new Error('Failed to fetch transactions for export')
      const result = await response.json()
      const allTx: typeof salesData.recentTransactions = result.data?.recentTransactions ?? []

      if (allTx.length === 0) {
        toast({
          title: 'No Transactions',
          description: 'No transactions match the current filters.',
          variant: 'destructive',
        })
        return
      }

      const headers = ['Date', 'Time', 'Plan Name', 'Merchant', 'Type', 'User Role', 'User Name', 'User Email', 'Transaction ID', 'Amount', 'Status']
      const rows = allTx.map(tx => {
        const d = new Date(tx.createdAt)
        const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        return [
          dateStr,
          timeStr,
          escapeCsvValue(tx.planName),
          tx.paymentMethod === 'paypal' ? 'PayPal' : 'Authorize.net',
          tx.isNew ? 'New' : 'Recurring',
          tx.userType,
          escapeCsvValue(tx.userName),
          escapeCsvValue(tx.userEmail),
          escapeCsvValue(tx.authnetTransactionId || tx.ghlTransactionId || tx.id),
          tx.amount.toFixed(2),
          tx.status,
        ]
      })

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Export Successful',
        description: `${allTx.length} transaction${allTx.length !== 1 ? 's' : ''} exported to CSV.`,
      })
    } catch (error) {
      console.error('Error exporting transactions CSV:', error)
      toast({
        title: 'Export Failed',
        description: 'Failed to export transactions. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getThisMonthDateRange = () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfMonthStr = startOfMonth.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    const todayStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    return `${startOfMonthStr} - ${todayStr}`
  }

  const getGrowthIcon = (percentage: number) => {
    if (percentage > 0) {
      return <ArrowUpRight className="h-4 w-4 text-green-600" />
    } else if (percentage < 0) {
      return <ArrowDownRight className="h-4 w-4 text-red-600" />
    }
    return null
  }

  const getGrowthColor = (percentage: number) => {
    if (percentage > 0) return 'text-green-600'
    if (percentage < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!salesData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sales Data Available</h3>
          <p className="text-gray-600 mb-4">Unable to load sales metrics at this time.</p>
          <Button onClick={() => loadSalesData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Prepare pie chart data for revenue sources
  const revenueSourceData = [
    {
      name: 'Seeker Subscriptions',
      value: salesData.revenueBySource.seekerSubscriptions,
      color: '#0088FE'
    },
    {
      name: 'Employer Packages',
      value: salesData.revenueBySource.employerPackages,
      color: '#00C49F'
    },
    ...(salesData.revenueBySource.seekerServices && salesData.revenueBySource.seekerServices > 0 ? [{
      name: 'Premium Services',
      value: salesData.revenueBySource.seekerServices,
      color: '#FF8042'
    }] : []),
    ...(salesData.revenueBySource.exclusiveOffers && salesData.revenueBySource.exclusiveOffers > 0 ? [{
      name: 'Exclusive Offers',
      value: salesData.revenueBySource.exclusiveOffers,
      color: '#F59E0B' // Amber color for exclusive offers
    }] : [])
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Dashboard</h1>
          <p className="text-gray-600">
            Comprehensive revenue analytics and business metrics
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => loadSalesData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild variant="outline">
            <a href="/admin/super-admin/recurring-billing">
              <TrendingUp className="h-4 w-4 mr-2" />
              View MRR Data
            </a>
          </Button>
          <Button onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesData.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesData.monthlyRecurringRevenue)}</div>
            <p className="text-xs text-muted-foreground">Active subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesData.revenueGrowth.thisMonth)}</div>
            <div className={`flex items-center text-xs ${getGrowthColor(salesData.revenueGrowth.growthPercentage)}`}>
              {getGrowthIcon(salesData.revenueGrowth.growthPercentage)}
              <span className="ml-1">{formatPercentage(salesData.revenueGrowth.growthPercentage)}</span>
              <span className="text-muted-foreground ml-1">({getThisMonthDateRange()})</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Revenue Per User</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesData.averageRevenuePerUser)}</div>
            <p className="text-xs text-muted-foreground">{salesData.totalTransactions} total transactions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="abandoned">Abandoned Carts</TabsTrigger>
          <TabsTrigger value="trials">Trial Metrics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="plans">Top Plans</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Source</CardTitle>
                <CardDescription>Distribution of revenue streams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueSourceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => {
                          const pct = percent * 100
                          // Show actual decimal if < 1%, otherwise round
                          const displayPct = pct > 0 && pct < 1 ? pct.toFixed(1) : pct.toFixed(0)
                          return `${name} ${displayPct}%`
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {revenueSourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Seeker Subscriptions</span>
                    <span className="text-sm font-bold text-blue-600">
                      {formatCurrency(salesData.revenueBySource.seekerSubscriptions)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Employer Packages</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatCurrency(salesData.revenueBySource.employerPackages)}
                    </span>
                  </div>
                  {salesData.revenueBySource.seekerServices !== undefined && salesData.revenueBySource.seekerServices > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Premium Services</span>
                      <span className="text-sm font-bold text-orange-500">
                        {formatCurrency(salesData.revenueBySource.seekerServices)}
                      </span>
                    </div>
                  )}
                  {/* Exclusive Offers - Simple display like other items */}
                  {salesData.revenueBySource.exclusiveOffers !== undefined && salesData.revenueBySource.exclusiveOffers > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Exclusive Offers</span>
                      <span className="text-sm font-bold text-amber-500">
                        {formatCurrency(salesData.revenueBySource.exclusiveOffers)}
                      </span>
                    </div>
                  )}
                </div>
                {/* Payment Method Breakdown */}
                {salesData.revenueByPaymentMethod && (
                  <div className="mt-6 pt-4 border-t space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">By Payment Method</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-gray-600" />
                        Credit Card
                      </span>
                      <span className="text-sm font-bold text-gray-600">
                        {formatCurrency(salesData.revenueByPaymentMethod.cardRevenue)}
                        <span className="text-xs text-gray-400 ml-1">
                          ({salesData.revenueByPaymentMethod.cardTransactions})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <svg className="h-4 w-4 text-[#00457C]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" />
                        </svg>
                        PayPal
                      </span>
                      <span className="text-sm font-bold text-[#00457C]">
                        {formatCurrency(salesData.revenueByPaymentMethod.paypalRevenue)}
                        <span className="text-xs text-gray-400 ml-1">
                          ({salesData.revenueByPaymentMethod.paypalTransactions})
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Churn Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Health</CardTitle>
                <CardDescription>Retention and churn metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Active Subscriptions</span>
                    <span className="text-2xl font-bold text-green-600">
                      {salesData.churnMetrics.activeSubscriptions}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Canceled Subscriptions</span>
                    <span className="text-2xl font-bold text-red-600">
                      {salesData.churnMetrics.canceledSubscriptions}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Retention Rate</span>
                      <span className="text-lg font-bold text-green-600">
                        {salesData.churnMetrics.retentionRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${salesData.churnMetrics.retentionRate}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Churn Rate</span>
                      <span className="text-lg font-bold text-red-600">
                        {salesData.churnMetrics.churnRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{ width: `${salesData.churnMetrics.churnRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="abandoned" className="space-y-6">
          <AbandonedCartWidget />
        </TabsContent>

        <TabsContent value="trials" className="space-y-6">
          {/* Trial Conversion Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{salesData?.trialMetrics?.activeTrials || 0}</div>
                <p className="text-xs text-muted-foreground">Currently in 3-day trial</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trial Conversion Rate</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {salesData?.trialMetrics?.trialConversionRate?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">Trials converting to paid</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Potential</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(salesData?.trialMetrics?.trialRevenuePotential || 0)}
                </div>
                <p className="text-xs text-muted-foreground">From active trials</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trial Conversion Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Trial Outcomes</CardTitle>
                <CardDescription>How trials are performing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <UserCheck className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium">Converted to Paid</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-green-600">
                        {salesData?.trialMetrics?.trialsConvertedToPaid || 0}
                      </span>
                      <p className="text-xs text-gray-600">
                        {salesData?.trialMetrics?.trialConversionRate?.toFixed(1) || 0}% conversion
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium">Canceled During Trial</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-red-600">
                        {salesData?.trialMetrics?.trialsCanceledDuringTrial || 0}
                      </span>
                      <p className="text-xs text-gray-600">
                        {salesData?.trialMetrics?.trialsCanceledDuringTrial && salesData?.trialMetrics?.trialsConvertedToPaid
                          ? ((salesData.trialMetrics.trialsCanceledDuringTrial / (salesData.trialMetrics.trialsCanceledDuringTrial + salesData.trialMetrics.trialsConvertedToPaid)) * 100).toFixed(1)
                          : 0}% canceled
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Average Trial Duration</span>
                      <span className="text-lg font-bold text-blue-600">
                        {salesData?.trialMetrics?.averageTrialDuration?.toFixed(1) || 0} days
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${((salesData?.trialMetrics?.averageTrialDuration || 0) / 3) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600">Out of 3-day trial period</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trial Performance Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Trial Performance Insights</CardTitle>
                <CardDescription>Key metrics and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">Conversion Rate</span>
                    </div>
                    <p className="text-sm text-green-700">
                      {salesData?.trialMetrics?.trialConversionRate && salesData.trialMetrics.trialConversionRate > 50
                        ? `Excellent conversion rate of ${salesData.trialMetrics.trialConversionRate.toFixed(1)}%! Your trial experience is working well.`
                        : salesData?.trialMetrics?.trialConversionRate && salesData.trialMetrics.trialConversionRate > 25
                          ? `Good conversion rate of ${salesData.trialMetrics.trialConversionRate.toFixed(1)}%. Consider optimizing trial onboarding.`
                          : `Conversion rate of ${salesData?.trialMetrics?.trialConversionRate?.toFixed(1) || 0}% needs improvement. Review trial experience and value proposition.`
                      }
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Trial Duration</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Users spend an average of {salesData?.trialMetrics?.averageTrialDuration?.toFixed(1) || 0} days in trial.
                      {salesData?.trialMetrics?.averageTrialDuration && salesData.trialMetrics.averageTrialDuration < 1.5
                        ? " Consider improving early engagement to keep users active longer."
                        : salesData?.trialMetrics?.averageTrialDuration && salesData.trialMetrics.averageTrialDuration > 2.5
                          ? " Great engagement! Users are exploring the platform thoroughly."
                          : " Users are moderately engaged during the trial period."
                      }
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-purple-800">Revenue Opportunity</span>
                    </div>
                    <p className="text-sm text-purple-900">
                      {formatCurrency(salesData?.trialMetrics?.trialRevenuePotential || 0)} potential revenue from active trials. Focus on converting these users before their trial expires.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend (Last 12 Months)</CardTitle>
              <CardDescription>Monthly revenue and transaction volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'revenue' ? formatCurrency(Number(value)) : value,
                        name === 'revenue' ? 'Revenue' : 'Transactions'
                      ]}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0088FE"
                      strokeWidth={3}
                      name="revenue"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="transactions"
                      stroke="#00C49F"
                      strokeWidth={2}
                      name="transactions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Plans</CardTitle>
              <CardDescription>Revenue breakdown by subscription and package plans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData.topPlans}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="planName" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="revenue" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 space-y-3">
                {salesData.topPlans.slice(0, 5).map((plan, index) => (
                  <div key={plan.planId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{plan.planName}</p>
                        <p className="text-sm text-gray-600">{plan.count} purchases</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(plan.revenue)}</p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(plan.revenue / plan.count)} avg
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle>Transactions</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={exportTransactionsCsv}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                {/* Row 1: 6 equal columns — dates + dropdowns */}
                <div className="grid grid-cols-6 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={txStartDate}
                      onChange={e => setTxStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">End Date</label>
                    <Input
                      type="date"
                      value={txEndDate}
                      onChange={e => setTxEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">Status</label>
                    <Select value={txStatus || 'all'} onValueChange={v => setTxStatus(v === 'all' ? '' : v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">Merchant</label>
                    <Select value={txPaymentMethod || 'all'} onValueChange={v => setTxPaymentMethod(v === 'all' ? '' : v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="authnet">Authorize.net</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">Type</label>
                    <Select value={txType || 'all'} onValueChange={v => setTxType(v === 'all' ? '' : v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">Role</label>
                    <Select value={txRole || 'all'} onValueChange={v => setTxRole(v === 'all' ? '' : v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="seeker">Seeker</SelectItem>
                        <SelectItem value="employer">Employer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Row 2: Email + action buttons */}
                <div className="flex items-end gap-3">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-gray-500 font-medium">Email</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Filter by email..."
                        value={txEmail}
                        onChange={e => setTxEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && applyTxFilters()}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button onClick={applyTxFilters}>
                    <Search className="h-4 w-4 mr-2" />
                    Apply
                  </Button>
                  {(() => { const d = getDefaultDates(); return (txStartDate !== d.start || txEndDate !== d.end || txEmail || txStatus || txPaymentMethod || txType || txRole) })() && (
                    <Button variant="outline" onClick={clearTxFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Transactions list */}
              {salesData.transactionsPagination && (
                <p className="text-sm text-gray-500">
                  {salesData.transactionsPagination.total} transaction{salesData.transactionsPagination.total !== 1 ? 's' : ''} found
                </p>
              )}
              <div className="space-y-4">
                {isTxLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : salesData.recentTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No transactions found for the selected filters.</div>
                ) : (
                  salesData.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        {/* N/R circular badge */}
                        {transaction.isNew ? (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: '#FDDCCC' }}
                            title="New transaction"
                          >
                            <span className="text-sm font-bold" style={{ color: '#C96830' }}>N</span>
                          </div>
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: '#EAE0DA' }}
                            title="Recurring transaction"
                          >
                            <span className="text-sm font-bold" style={{ color: '#8B7060' }}>R</span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{transaction.planName}</p>
                            {transaction.paymentMethod === 'paypal' ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                PayPal
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                                Authorize.net
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            {transaction.userType === 'seeker' ? (
                              <button
                                type="button"
                                onClick={() => window.open(`/admin/seekers?open=${transaction.userId}`, '_blank')}
                                className="font-medium hover:underline cursor-pointer"
                                style={{ color: '#EA8E61' }}
                              >
                                {transaction.userName}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => window.open(`/admin/employers?open=${transaction.userId}`, '_blank')}
                                className="font-medium hover:underline cursor-pointer text-gray-600"
                              >
                                {transaction.userName}
                              </button>
                            )}
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-500">{transaction.userEmail}</span>
                            {transaction.userType === 'seeker' ? (
                              <Badge variant="default" className="text-white" style={{ backgroundColor: '#0D9488' }}>
                                seeker
                              </Badge>
                            ) : (
                              <Badge className="text-white border-0" style={{ backgroundColor: '#EA8E61' }}>
                                employer
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{formatDate(transaction.createdAt)}</p>
                          {(transaction.authnetTransactionId || transaction.ghlTransactionId) && (
                            <p className="text-xs text-gray-400 font-mono mt-0.5">
                              Transaction ID:{' '}
                              <a
                                href={`/admin/tx?q=${encodeURIComponent(transaction.authnetTransactionId || transaction.ghlTransactionId!)}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-amber-700 bg-amber-50 hover:bg-amber-100 px-1 rounded underline-offset-2 hover:underline transition-colors"
                              >
                                {transaction.authnetTransactionId || transaction.ghlTransactionId}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(transaction.amount)}</p>
                          <Badge variant={transaction.status === 'completed' ? 'default' : transaction.status === 'refunded' ? 'destructive' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </div>
                        {enableRefunds && transaction.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            disabled={refundingId === transaction.id}
                            onClick={() => setConfirmRefundTransaction(transaction)}
                          >
                            {refundingId === transaction.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            <span className="ml-1">Refund</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {salesData.transactionsPagination && salesData.transactionsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Page {salesData.transactionsPagination.page} of {salesData.transactionsPagination.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={txPage <= 1}
                      onClick={() => changeTxPage(txPage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={txPage >= salesData.transactionsPagination.totalPages}
                      onClick={() => changeTxPage(txPage + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Confirmation Dialog */}
      <Dialog open={!!confirmRefundTransaction} onOpenChange={(open) => !open && setConfirmRefundTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Full Refund</DialogTitle>
            <DialogDescription>
              Are you sure you want to process a full refund for this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {confirmRefundTransaction && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Customer</span>
                <span className="text-sm font-medium">{confirmRefundTransaction.userName}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Plan</span>
                <span className="text-sm font-medium">{confirmRefundTransaction.planName}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Amount</span>
                <span className="text-sm font-bold text-red-600">{formatCurrency(confirmRefundTransaction.amount)}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Payment Method</span>
                <span className="text-sm font-medium">{confirmRefundTransaction.paymentMethod === 'paypal' ? 'PayPal' : 'Credit Card'}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRefundTransaction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={refundingId !== null}
              onClick={() => confirmRefundTransaction && handleRefund(confirmRefundTransaction.id)}
            >
              {refundingId ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Confirm Refund'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Options Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Sales Data</DialogTitle>
            <DialogDescription>
              Choose what data to include in your CSV export
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Standard Export:</strong> All sales metrics, revenue data, and transaction history
              </p>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => setIncludeAbandonedCarts(!includeAbandonedCarts)}>
              <Checkbox
                checked={includeAbandonedCarts}
                onCheckedChange={(checked) => setIncludeAbandonedCarts(checked === true)}
                id="include-abandoned-carts"
              />
              <label htmlFor="include-abandoned-carts" className="flex-1 cursor-pointer">
                <p className="font-medium text-sm">Include Abandoned Checkouts</p>
                <p className="text-xs text-gray-600">
                  {abandonedCarts.length} abandoned carts ({abandonedCarts.filter(c => !c.isExpired).length} active, {abandonedCarts.filter(c => c.isExpired).length} expired)
                </p>
              </label>
            </div>

            {includeAbandonedCarts && abandonedCarts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-900">
                  💡 <strong>Tip:</strong> The abandoned checkouts section includes {abandonedCarts.length} rows of detailed cart data plus a summary section. This may increase your file size.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportWithOptions}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
