'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
import {
    ShoppingCart,
    TrendingUp,
    RefreshCw,
    ExternalLink,
    AlertCircle,
    Clock,
    Users,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    Info,
    Building2,
    Search
} from 'lucide-react'
import { AbandonedCartService, AbandonedCart, AbandonedCartStats } from '@/lib/abandoned-cart-service'
import { useToast } from '@/hooks/use-toast'

/**
 * Helper Component: Display a single metric box
 * Shows icon, label, value, and optional change indicator
 */
function MetricBox({
    label,
    value,
    icon,
    unit = '',
    isWarning = false,
    isGood = false,
    subtitle = '',
    helpText = '',
    onHelpClick = undefined
}: {
    label: string
    value: string | number
    icon: React.ReactNode
    unit?: string
    isWarning?: boolean
    isGood?: boolean
    subtitle?: string
    helpText?: string
    onHelpClick?: () => void
}) {
    let bgColor = 'bg-gray-50'
    let textColor = 'text-gray-900'
    let borderColor = 'border-gray-200'

    if (isWarning) {
        bgColor = 'bg-amber-50'
        textColor = 'text-amber-900'
        borderColor = 'border-amber-200'
    } else if (isGood) {
        bgColor = 'bg-green-50'
        textColor = 'text-green-900'
        borderColor = 'border-green-200'
    }

    return (
        <div className={`rounded-lg border ${borderColor} ${bgColor} p-4`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600 font-medium">{label}</p>
                        {helpText && onHelpClick && (
                            <button
                                onClick={onHelpClick}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                title="Click for details"
                            >
                                <HelpCircle className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <p className={`text-3xl font-bold mt-1 ${textColor}`}>
                        {value}
                        {unit && <span className="text-lg ml-1">{unit}</span>}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                    )}
                </div>
                <div className={`p-2 rounded-lg ${isWarning ? 'bg-amber-100' : isGood ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {icon}
                </div>
            </div>
        </div>
    )
}

/**
 * Main Abandoned Cart Widget Component
 * 
 * Features:
 * - Real-time metric dashboard (active carts, lost revenue, user split)
 * - Auto-refresh every 5 minutes
 * - Manual refresh button
 * - Expandable detailed view with cart list
 * - Top packages breakdown
 * - Responsive grid layout (2 cols mobile, 4 cols desktop)
 * - Error handling and loading states
 * - Time remaining indicators with urgency colors
 */
export function AbandonedCartWidget() {
    const [stats, setStats] = useState<AbandonedCartStats | null>(null)
    const [carts, setCarts] = useState<AbandonedCart[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all')
    const [emailSearch, setEmailSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [selectedPostTrialCart, setSelectedPostTrialCart] = useState<AbandonedCart | null>(null)
    const [selectedCartDetail, setSelectedCartDetail] = useState<AbandonedCart | null>(null)
    const [selectedMetricHelp, setSelectedMetricHelp] = useState<'lost-revenue' | 'lost-potential' | null>(null)
    const itemsPerPage = 10

    const { toast } = useToast()

    /**
     * Load abandoned carts and calculate statistics
     * Separated as a reusable function for refresh capability
     */
    const loadAbandonedCarts = useCallback(async () => {
        try {
            setError(null)

            // Fetch abandoned carts from service (now includes both active and expired)
            const fetchedCarts = await AbandonedCartService.getAbandonedCarts(100)

            // Calculate statistics
            const calculatedStats = AbandonedCartService.calculateStats(fetchedCarts)

            setCarts(fetchedCarts)
            setStats(calculatedStats)
            setLastRefresh(new Date())

            // Log summary for debugging
            console.log('📊 Abandoned Cart Widget loaded:', {
                totalCarts: fetchedCarts.length,
                activeCarts: fetchedCarts.filter(c => !c.isExpired).length,
                expiredCarts: fetchedCarts.filter(c => c.isExpired).length,
                stats: calculatedStats,
                timestamp: new Date().toISOString()
            })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load abandoned carts'
            setError(errorMessage)
            console.error('❌ Error loading abandoned carts:', error)

            // Show toast notification for errors
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [toast])

    /**
     * Initial load on component mount
     */
    useEffect(() => {
        loadAbandonedCarts()
    }, [loadAbandonedCarts])

    /**
     * Auto-refresh every 5 minutes
     */
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('🔄 Auto-refreshing abandoned carts...')
            setIsRefreshing(true)
            loadAbandonedCarts()
        }, 5 * 60 * 1000) // 5 minutes

        return () => clearInterval(interval)
    }, [loadAbandonedCarts])

    /**
     * Handle manual refresh
     */
    const handleRefresh = async () => {
        setIsRefreshing(true)
        await loadAbandonedCarts()

        toast({
            title: 'Refreshed',
            description: 'Abandoned cart data updated'
        })
    }

    /**
     * Format currency with $ symbol
     */
    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)}`
    }

    /**
     * Get urgency color based on time remaining
     * Used for the time remaining badges in expanded view
     */
    const getTimeUrgencyColor = (cart: AbandonedCart): 'destructive' | 'default' | 'secondary' | 'outline' => {
        if (cart.isExpired) return 'destructive'

        if (cart.timeRemaining === 'Expired') return 'destructive'
        return 'default'
    }

    /**
     * Get display value for a cart
     * For seeker plans, shows the actual value
     * Returns { value: number; isPostTrial: boolean }
     */
    const getCartDisplayValue = (cart: AbandonedCart): { value: number; isPostTrial: boolean } => {
        return { value: cart.estimatedValue, isPostTrial: false }
    }

    /**
     * Filter carts based on current filter status
     */
    const filteredCarts = useMemo(() => {
        if (!carts) return []

        let result = carts
        switch (filterStatus) {
            case 'active':
                result = carts.filter(c => !c.isExpired)
                break
            case 'expired':
                result = carts.filter(c => c.isExpired)
                break
        }

        if (emailSearch.trim()) {
            const term = emailSearch.toLowerCase()
            result = result.filter(c => c.email.toLowerCase().includes(term))
        }

        return result
    }, [carts, filterStatus, emailSearch])

    const handleEmailSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }
        debounceTimerRef.current = setTimeout(() => {
            setEmailSearch(value)
            setCurrentPage(1)
        }, 300)
    }

    /**
     * Calculate statistics for filtered carts
     */
    const filteredStats = useMemo(() => {
        if (!filteredCarts || filteredCarts.length === 0) {
            return {
                totalCarts: 0,
                totalValue: 0,
                averageValue: 0,
                seekers: 0,
                employers: 0,
                planBreakdown: []
            }
        }

        const seekersCount = filteredCarts.filter(c => c.userType === 'seeker').length
        const employersCount = filteredCarts.filter(c => c.userType === 'employer').length
        const totalValue = filteredCarts
            .filter(c => c.planStatus === 'paid')
            .reduce((sum, c) => sum + c.estimatedValue, 0)
        const valuableCount = filteredCarts.filter(c => c.planStatus === 'paid').length
        const averageValue = valuableCount > 0 ? totalValue / valuableCount : 0

        // Plan breakdown for FILTERED carts (respects active/expired/all tabs)
        const planMap = new Map<string, { count: number; totalValue: number; userType: 'seeker' | 'employer' }>()

        filteredCarts.forEach(cart => {
            const plan = cart.selectedPlan || 'none'
            const existing = planMap.get(plan) || { count: 0, totalValue: 0, userType: cart.userType }
            planMap.set(plan, {
                count: existing.count + 1,
                totalValue: existing.totalValue + cart.estimatedValue,
                userType: cart.userType
            })
        })

        const planBreakdown = Array.from(planMap.entries())
            .map(([planName, { count, totalValue, userType }]) => ({
                planName,
                count,
                totalValue: Math.round(totalValue * 100) / 100,
                userType
            }))
            .sort((a, b) => b.count - a.count)

        return {
            totalCarts: filteredCarts.length,
            totalValue: Math.round(totalValue * 100) / 100,
            averageValue: Math.round(averageValue * 100) / 100,
            seekers: seekersCount,
            employers: employersCount,
            planBreakdown
        }
    }, [filteredCarts])

    // Memoize metrics calculations
    const metrics = useMemo(() => {
        if (!stats) return null

        // Dynamic label based on filter status
        let revenueLabel = 'Total Lost Revenue Assumption'
        if (filterStatus === 'active') {
            revenueLabel = 'Recoverable Revenue'
        } else if (filterStatus === 'expired') {
            revenueLabel = 'Lost Revenue'
        }

        return {
            hasData: stats.totalActive > 0 || stats.totalExpired > 0,
            formattedRevenue: formatCurrency(filteredStats.totalValue),
            totalDisplay: `${filteredStats.totalCarts} ${filterStatus === 'expired' ? 'Expired' : filterStatus === 'active' ? 'Active' : 'Total'}`,
            revenueLabel
        }
    }, [stats, filteredStats, filterStatus])

    // Show loading state
    if (isLoading) {
        return (
            <Card className="col-span-1 md:col-span-2 lg:col-span-3">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Abandoned Cart Orders
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
                            <p className="text-gray-600">Loading abandoned carts...</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Show error state
    if (error) {
        return (
            <Card className="col-span-1 md:col-span-2 lg:col-span-3 border-red-200 bg-red-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-900">
                        <AlertCircle className="h-5 w-5" />
                        Abandoned Cart Orders
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-red-800 mb-4">
                        <p className="font-medium">Error loading abandoned carts</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                    <Button
                        onClick={handleRefresh}
                        variant="outline"
                        size="sm"
                        className="border-red-300"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        )
    }

    // Show no data state
    if (!stats || !metrics || !metrics.hasData) {
        return (
            <Card className="col-span-1 md:col-span-2 lg:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Abandoned Cart Orders
                        </CardTitle>
                        <CardDescription>
                            Incomplete checkouts (potential revenue loss)
                        </CardDescription>
                    </div>
                    <Button
                        onClick={handleRefresh}
                        variant="ghost"
                        size="sm"
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">No abandoned carts yet</p>
                        <p className="text-sm text-gray-500 mt-1">
                            When users start checkout but don&apos;t complete it, they&apos;ll appear here
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-amber-600" />
                        Abandoned Cart Orders
                    </CardTitle>
                    <CardDescription>
                        Incomplete checkouts (potential revenue loss)
                        {lastRefresh && (
                            <span className="ml-2 text-xs">
                                • Updated {lastRefresh.toLocaleTimeString()}
                            </span>
                        )}
                    </CardDescription>
                </div>
                <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    disabled={isRefreshing}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Filter Buttons */}
                <div className="flex gap-2 border-b pb-4">
                    <Button
                        onClick={() => { setFilterStatus('all'); setCurrentPage(1) }}
                        variant={filterStatus === 'all' ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                    >
                        All ({carts.length})
                    </Button>
                    <Button
                        onClick={() => { setFilterStatus('active'); setCurrentPage(1) }}
                        variant={filterStatus === 'active' ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                    >
                        Active ({stats.totalActive})
                    </Button>
                    <Button
                        onClick={() => { setFilterStatus('expired'); setCurrentPage(1) }}
                        variant={filterStatus === 'expired' ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                    >
                        Expired ({stats.totalExpired})
                    </Button>
                </div>

                {/* Email Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search by email..."
                        onChange={handleEmailSearchChange}
                        className="pl-10"
                    />
                </div>

                {/* Key Metrics Grid - Balanced 2x2 layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    <MetricBox
                        label="Total Carts"
                        value={filteredStats.totalCarts}
                        icon={<ShoppingCart className="h-5 w-5" />}
                        isWarning={filteredStats.totalCarts > 10}
                        subtitle={`${filterStatus} view`}
                    />
                    <MetricBox
                        label={metrics.revenueLabel}
                        value={metrics.formattedRevenue}
                        icon={<TrendingUp className="h-5 w-5" />}
                        isWarning={filteredStats.totalValue > 500}
                        helpText="How it's calculated"
                        onHelpClick={() => setSelectedMetricHelp('lost-revenue')}
                    />
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="text-sm font-medium text-green-900">Seeker Checkouts</p>
                                    <p className="text-xs text-green-700">{filteredStats.seekers} {filterStatus}</p>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-green-600">{filteredStats.seekers}</div>
                        </div>
                    </div>
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-orange-600" />
                                <div>
                                    <p className="text-sm font-medium text-orange-900">Employer Checkouts</p>
                                    <p className="text-xs text-orange-700">{filteredStats.employers} {filterStatus}</p>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-orange-600">{filteredStats.employers}</div>
                        </div>
                    </div>
                </div>
                {/* Plan Breakdown */}
                {filteredStats.planBreakdown && filteredStats.planBreakdown.length > 0 && (
                    <div className="border rounded-lg p-4">
                        <h3 className="font-semibold text-sm mb-3">Abandoned Checkouts by Plan/Package ({filterStatus})</h3>
                        <div className="space-y-2">
                            {filteredStats.planBreakdown.map((plan: any, index: number) => (
                                <div key={`${plan.planName}-${plan.userType}`} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            #{index + 1}
                                        </Badge>
                                        <span className="font-medium capitalize">{plan.planName}</span>
                                        <Badge variant={plan.userType === 'seeker' ? 'secondary' : 'default'} className="text-xs">
                                            {plan.userType}
                                        </Badge>
                                        <span className="text-gray-500">({plan.count})</span>
                                    </div>
                                    <span className="font-semibold text-amber-600">
                                        {formatCurrency(plan.totalValue)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Expandable Details Section */}
                <div className="border rounded-lg overflow-hidden">
                    <button
                        onClick={() => {
                            setIsExpanded(!isExpanded)
                            setCurrentPage(1) // Reset to first page when expanding
                        }}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                        <h3 className="font-semibold">Cart Details</h3>
                        {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                    </button>

                    {isExpanded && (
                        <div className="border-t">
                            {filteredCarts.length > 0 ? (
                                <>
                                    <div className="max-h-96 overflow-y-auto">
                                        <div className="divide-y">
                                            {filteredCarts
                                                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                                .map((cart) => (
                                                    <div
                                                        key={cart.id}
                                                        className="p-4 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <p className="font-medium text-sm truncate">
                                                                        {cart.email}
                                                                    </p>
                                                                    <Badge
                                                                        variant={cart.userType === 'seeker' ? 'secondary' : 'default'}
                                                                        className="text-xs flex-shrink-0"
                                                                    >
                                                                        {cart.userType === 'seeker' ? '👤 seeker' : '🏢 employer'}
                                                                    </Badge>
                                                                </div>
                                                                {cart.userType === 'employer' && cart.jobTitle && (
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <p className="text-xs text-gray-600 italic">
                                                                            Job: {cart.jobTitle}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <p className="text-xs text-gray-600">
                                                                        <span className="capitalize">{cart.selectedPlan || 'none'}</span>
                                                                        <span className="text-gray-400 ml-2 text-xs">({cart.planStatus})</span>
                                                                    </p>
                                                                    <button
                                                                        onClick={() => setSelectedCartDetail(cart)}
                                                                        className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                                                        title="Click for plan details"
                                                                    >
                                                                        <HelpCircle className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                                <Badge
                                                                    variant={getTimeUrgencyColor(cart)}
                                                                    className="text-xs"
                                                                    title={cart.valueExplanation}
                                                                >
                                                                    <Clock className="h-3 w-3 mr-1" />
                                                                    {cart.isExpired ? 'Expired' : cart.timeRemaining}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                {(() => {
                                                                    const { value, isPostTrial } = getCartDisplayValue(cart)
                                                                    return (
                                                                        <div>
                                                                            <div className="flex items-center justify-end gap-1">
                                                                                <span className={`font-semibold ${isPostTrial ? 'text-purple-600' : 'text-amber-600'}`}>
                                                                                    {formatCurrency(value)}
                                                                                    {isPostTrial && <span className="ml-1 text-xs text-purple-500">*</span>}
                                                                                </span>
                                                                                {isPostTrial && (
                                                                                    <button
                                                                                        onClick={() => setSelectedPostTrialCart(cart)}
                                                                                        className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                                                                                        title="Click for details"
                                                                                    >
                                                                                        <Info className="h-4 w-4" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs text-gray-500 mt-1">
                                                                                {new Date(cart.createdAt).toLocaleDateString()}
                                                                            </p>
                                                                            {isPostTrial && (
                                                                                <p className="text-xs text-purple-500 mt-1">Post-trial</p>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Pagination Controls */}
                                    {filteredCarts.length > itemsPerPage && (
                                        <div className="p-4 border-t flex items-center justify-between bg-gray-50">
                                            <span className="text-sm text-gray-600">
                                                Page {currentPage} of {Math.ceil(filteredCarts.length / itemsPerPage)} • Showing {Math.min(itemsPerPage, filteredCarts.length - (currentPage - 1) * itemsPerPage)} of {filteredCarts.length} carts
                                            </span>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    ← Previous
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredCarts.length / itemsPerPage), prev + 1))}
                                                    disabled={currentPage === Math.ceil(filteredCarts.length / itemsPerPage)}
                                                >
                                                    Next →
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-4 text-center text-gray-500">
                                    No {filterStatus} abandoned carts to display
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Link to Pending Checkouts Page */}
                <div className="text-center pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            window.location.href = '/admin/pending-checkouts'
                        }}
                        className="gap-2"
                    >
                        <ExternalLink className="h-4 w-4" />
                        View All Pending Checkouts
                    </Button>
                </div>

                {/* Cart Details Dialog - Explains Plan Status & Value */}
                <Dialog open={selectedCartDetail !== null} onOpenChange={(open) => {
                    if (!open) setSelectedCartDetail(null)
                }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Cart Details & Status</DialogTitle>
                            <DialogDescription>
                                Understanding plan status and how value is calculated
                            </DialogDescription>
                        </DialogHeader>
                        {selectedCartDetail && (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                                    <p className="text-sm text-gray-600 mb-1">User Email</p>
                                    <p className="font-semibold text-gray-900">{selectedCartDetail.email}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1">Plan Selected</p>
                                        <p className="font-semibold text-gray-900 capitalize">{selectedCartDetail.selectedPlan || 'none'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1">Plan Status</p>
                                        <Badge variant={selectedCartDetail.planStatus === 'trial' ? 'secondary' : selectedCartDetail.planStatus === 'paid' ? 'default' : 'outline'}>
                                            {selectedCartDetail.planStatus}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Status Explanation */}
                                <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-700 mb-2 uppercase">What does this status mean?</p>
                                    {selectedCartDetail.planStatus === 'trial' && (
                                        <div className="space-y-2 text-sm text-gray-700">
                                            <p><strong>Trial Plan:</strong> User started a 3-day free trial</p>
                                            <p>• No payment was collected yet</p>
                                            <p>• User can use the plan for 3 days free</p>
                                            <p>• After 3 days, they would be charged (if they don&apos;t cancel)</p>
                                            <p>• If they cancelled before 3 days expired, no charge</p>
                                        </div>
                                    )}
                                    {selectedCartDetail.planStatus === 'paid' && (
                                        <div className="space-y-2 text-sm text-gray-700">
                                            {selectedCartDetail.userType === 'seeker' ? (
                                                <>
                                                    <p><strong>Paid Plan:</strong> User selected a paid subscription plan</p>
                                                    <p>• This is a premium plan (Gold, VIP, Annual, etc.)</p>
                                                    <p>• Payment method was being entered during checkout</p>
                                                    <p>• Cart was abandoned before payment was processed</p>
                                                    <p>• This represents recoverable revenue</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p><strong>Job Posting Package:</strong> Employer selected a job posting package</p>
                                                    <p>• Package: {selectedCartDetail.selectedPlan || 'Standard'}</p>
                                                    <p>• Payment was being entered during checkout</p>
                                                    <p>• Cart was abandoned before payment was processed</p>
                                                    <p>• This represents a lost job posting opportunity</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {selectedCartDetail.planStatus === 'none' && (
                                        <div className="space-y-2 text-sm text-gray-700">
                                            <p><strong>No Plan:</strong> User never selected a plan</p>
                                            <p>• User started onboarding but didn&apos;t reach plan selection</p>
                                            <p>• They completed basic info and personal details</p>
                                            <p>• No plan = No charge, so value is $0</p>
                                            <p>• May have dropped off early in onboarding</p>
                                        </div>
                                    )}
                                </div>

                                {/* Value Explanation */}
                                <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                                    <p className="text-xs font-semibold text-green-700 mb-2 uppercase">Value: {formatCurrency(selectedCartDetail.estimatedValue)}</p>
                                    <p className="text-sm text-green-800 font-medium">{selectedCartDetail.valueExplanation}</p>
                                    <p className="text-xs text-green-700 mt-2 leading-relaxed">
                                        {selectedCartDetail.planStatus === 'trial' && 'The $0 value means they initiated a trial but no payment has been taken yet. It becomes revenue only if they complete checkout after the trial.'}
                                        {selectedCartDetail.planStatus === 'paid' && selectedCartDetail.userType === 'seeker' && `The $${selectedCartDetail.estimatedValue.toFixed(2)} is the value of the subscription plan they selected, which they would have been charged if they completed checkout.`}
                                        {selectedCartDetail.planStatus === 'paid' && selectedCartDetail.userType === 'employer' && `The $${selectedCartDetail.estimatedValue.toFixed(2)} is the price of the job posting package they selected (${selectedCartDetail.selectedPlan || 'Standard'}), which they would have been charged if they completed checkout.`}
                                        {selectedCartDetail.planStatus === 'none' && 'The $0 value means no plan was selected, so there would be no charge.'}
                                    </p>
                                </div>

                                {/* Cart Timeline */}
                                <div className="rounded-lg bg-gray-100 p-4">
                                    <p className="text-xs font-semibold text-gray-700 mb-3 uppercase">Timeline</p>
                                    <div className="space-y-2 text-xs text-gray-700">
                                        <div className="flex justify-between">
                                            <span>Cart Created:</span>
                                            <span className="font-semibold">{new Date(selectedCartDetail.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Expires At:</span>
                                            <span className="font-semibold">{new Date(selectedCartDetail.expiresAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Status:</span>
                                            <span className={`font-semibold ${selectedCartDetail.isExpired ? 'text-red-600' : 'text-green-600'}`}>
                                                {selectedCartDetail.isExpired ? '❌ Expired (Lost)' : `✓ Active (${selectedCartDetail.timeRemaining} remaining)`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Post-Trial Details Dialog */}
                <Dialog open={selectedPostTrialCart !== null} onOpenChange={(open) => {
                    if (!open) setSelectedPostTrialCart(null)
                }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Post-Trial Conversion Value</DialogTitle>
                            <DialogDescription>
                                How much this trial user would pay after conversion
                            </DialogDescription>
                        </DialogHeader>
                        {selectedPostTrialCart && (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-purple-50 p-4 border border-purple-200">
                                    <p className="text-sm text-gray-600 mb-1">User</p>
                                    <p className="font-semibold text-gray-900">{selectedPostTrialCart.email}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1">Subscription Plan</p>
                                        <p className="font-semibold text-gray-900 capitalize">{selectedPostTrialCart.selectedPlan || 'none'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1">Plan Status</p>
                                        <Badge variant="secondary">
                                            {selectedPostTrialCart.planStatus}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                                    <p className="text-sm text-gray-600 mb-2">How This Value Was Calculated</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {selectedPostTrialCart.valueExplanation}
                                    </p>
                                </div>

                                <div className="rounded-lg bg-gray-50 p-4">
                                    <p className="text-xs text-gray-600 mb-1">Created</p>
                                    <p className="font-semibold text-gray-900">
                                        {new Date(selectedPostTrialCart.createdAt).toLocaleDateString()} {new Date(selectedPostTrialCart.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>

                                <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
                                    <p className="text-xs text-amber-600 mb-1">Status</p>
                                    <p className="font-semibold text-amber-900">
                                        {selectedPostTrialCart.isExpired ? 'Expired - Abandoned' : 'Active - Recoverable'}
                                    </p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        {selectedPostTrialCart.isExpired
                                            ? 'This signup link has expired'
                                            : 'User still has time to complete signup'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Lost Revenue Calculation Dialog */}
                <Dialog open={selectedMetricHelp === 'lost-revenue'} onOpenChange={(open) => {
                    if (!open) setSelectedMetricHelp(null)
                }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {filterStatus === 'active' && 'Recoverable Revenue Calculation'}
                                {filterStatus === 'expired' && 'Lost Revenue Calculation'}
                                {filterStatus === 'all' && 'Total Revenue Calculation'}
                            </DialogTitle>
                            <DialogDescription>
                                {filterStatus === 'active' && 'Sum of all paid plans still active (can be recovered)'}
                                {filterStatus === 'expired' && 'Sum of all paid plans that expired (lost opportunities)'}
                                {filterStatus === 'all' && 'Sum of all paid plans (active + expired)'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className={`rounded-lg p-4 border ${filterStatus === 'active' ? 'bg-green-50 border-green-200' :
                                filterStatus === 'expired' ? 'bg-red-50 border-red-200' :
                                    'bg-blue-50 border-blue-200'
                                }`}>
                                <p className={`text-sm ${filterStatus === 'active' ? 'text-green-700' :
                                    filterStatus === 'expired' ? 'text-red-700' :
                                        'text-blue-700'
                                    }`}>
                                    <strong>What you&apos;re viewing:</strong>
                                    {filterStatus === 'active' && ' Only active abandoned carts with paid plans. These can still be recovered via email reminders.'}
                                    {filterStatus === 'expired' && ' Only expired abandoned carts with paid plans. These are lost opportunities but tracked for analysis.'}
                                    {filterStatus === 'all' && ' All abandoned carts (active + expired) with paid plans. Shows total potential revenue impact.'}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-gray-900">Includes:</p>
                                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                                    <li>✓ Carts with paid plans selected {filterStatus !== 'all' ? `(${filterStatus} only)` : '(active & expired)'} with value &gt; $0</li>
                                    <li>✓ Seeker Plans: Gold ($34.99), VIP ($79.99), Annual ($299.00)</li>
                                    <li>✓ Employer Packages: Standard ($97), Featured ($127), Email Blast ($249), etc.</li>
                                    {filterStatus === 'active' && <li>✓ Active = can still recover via email reminders</li>}
                                    {filterStatus === 'expired' && <li>✓ Expired = lost but tracked for analysis</li>}
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-gray-900">Excludes:</p>
                                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                                    <li>✗ Trial packages ($0 value)</li>
                                    <li>✗ None packages ($0 value)</li>
                                    {filterStatus === 'active' && <li>✗ Expired carts (shown only in Expired tab)</li>}
                                    {filterStatus === 'expired' && <li>✗ Active carts (shown only in Active tab)</li>}
                                </ul>
                            </div>

                            <div className={`rounded-lg p-4 border ${filterStatus === 'active' ? 'bg-amber-50 border-amber-200' :
                                filterStatus === 'expired' ? 'bg-purple-50 border-purple-200' :
                                    'bg-amber-50 border-amber-200'
                                }`}>
                                <p className={`text-xs font-semibold mb-2 ${filterStatus === 'active' ? 'text-amber-700' :
                                    filterStatus === 'expired' ? 'text-purple-700' :
                                        'text-amber-700'
                                    }`}>💡 Current View: {filterStatus === 'all' ? 'All Carts' : filterStatus === 'active' ? 'Active Carts' : 'Expired Carts'}</p>
                                <p className={`text-xs ${filterStatus === 'active' ? 'text-amber-700' :
                                    filterStatus === 'expired' ? 'text-purple-700' :
                                        'text-amber-700'
                                    }`}>
                                    {filterStatus === 'active' && 'You\'re viewing revenue that can still be recovered. Reach out to these users to complete their purchase!'}
                                    {filterStatus === 'expired' && 'You\'re viewing revenue that was lost. Use this data to improve your checkout flow and reduce abandonment.'}
                                    {filterStatus === 'all' && 'You\'re viewing total revenue across all carts. This combines both recoverable (active) and lost (expired) opportunities.'}
                                </p>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Lost Potential (Trials) Calculation Dialog */}
                <Dialog open={selectedMetricHelp === 'lost-potential'} onOpenChange={(open) => {
                    if (!open) setSelectedMetricHelp(null)
                }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Lost Potential (Trials) Calculation</DialogTitle>
                            <DialogDescription>
                                How we measure lost revenue from expired trial users
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="rounded-lg bg-purple-50 p-4 border border-purple-200">
                                <p className="text-sm font-semibold text-purple-900 mb-3">Formula</p>
                                <p className="text-sm text-purple-800 font-mono bg-white p-2 rounded">
                                    Sum of all expired TRIAL/NONE carts using post-trial values
                                </p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-gray-900">Post-Trial Values:</p>
                                <div className="text-sm text-gray-700 space-y-2 ml-4">
                                    <p><strong>Seeker Trials</strong> → Would convert to Gold</p>
                                    <p className="text-amber-600 font-semibold">$34.99/month</p>
                                    <p className="mt-2"><strong>Employer Trials/None</strong> → Would convert to Basic</p>
                                    <p className="text-amber-600 font-semibold">$99.00</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-gray-900">Only Includes:</p>
                                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                                    <li>✓ Expired carts (time-based expiration)</li>
                                    <li>✓ Package type: &apos;trial&apos;, &apos;trial_monthly&apos;, or &apos;none&apos;</li>
                                    <li>✓ Post-trial conversion values (not actual $0)</li>
                                    <li>✓ Potential revenue we could have captured</li>
                                </ul>
                            </div>

                            <div className="rounded-lg bg-red-50 p-4">
                                <p className="text-xs text-red-600 font-semibold">Why expired trials matter?</p>
                                <p className="text-xs text-red-700 mt-1">
                                    Trial users are warm leads who engaged enough to sign up. When their trial expires, we lose potential paying customers. This metric shows the business impact.
                                </p>
                            </div>

                            <div className="rounded-lg bg-green-50 p-4">
                                <p className="text-xs text-green-600 font-semibold">Use This For:</p>
                                <p className="text-xs text-green-700 mt-1">
                                    Justifying trial-to-paid conversion campaigns, evaluating trial period length, and measuring trial engagement effectiveness.
                                </p>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}
