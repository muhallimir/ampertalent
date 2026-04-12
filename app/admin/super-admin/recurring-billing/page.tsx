"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Download, AlertCircle, Users, DollarSign, TrendingUp, RotateCcw } from "lucide-react"
import { RecurringBillingList } from "@/components/admin/recurring-billing-list"
import { RecurringBillingDetailsModal } from "@/components/admin/recurring-billing-details-modal"
import { useToast } from "@/hooks/use-toast"
import { SubscriptionData } from "@/app/admin/types"

// Employer Exclusive Package type
interface EmployerExclusivePackage {
    id: string
    employerId: string
    employerName: string
    employerEmail: string
    companyName: string
    packageType: string
    packageName: string
    recurringAmountCents: number
    billingCyclesTotal: number
    billingCyclesCompleted: number
    nextBillingDate: string | null
    recurringStatus: string
    createdAt: string
    expiresAt: string | null
}

export default function RecurringBillingPage() {
    const { toast } = useToast()
    const [activeMainTab, setActiveMainTab] = useState<string>("seekers")
    const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
    const [allSubscriptions, setAllSubscriptions] = useState<SubscriptionData[]>([])
    const [employerPackages, setEmployerPackages] = useState<EmployerExclusivePackage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [status, setStatus] = useState<string>("active")
    const [planFilter, setPlanFilter] = useState<string>("")
    const [page, setPage] = useState(1)
    const [pageSize] = useState(20)
    const [totalPages, setTotalPages] = useState(0)
    const [totalCount, setTotalCount] = useState(0)
    const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionData | null>(null)
    const [showDetailsModal, setShowDetailsModal] = useState(false)

    // Employer packages pagination state
    const [employerPage, setEmployerPage] = useState(1)
    const [employerPageSize] = useState(20)
    const [employerTotalPages, setEmployerTotalPages] = useState(0)
    const [employerTotalCount, setEmployerTotalCount] = useState(0)

    // Fetch subscriptions (paginated for display)
    const fetchSubscriptions = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                ...(search && { search }),
            })

            const response = await fetch(`/api/admin/super-admin/recurring-billing?${queryParams}`)

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    setError("You do not have permission to access this page.")
                    throw new Error("Unauthorized")
                }
                throw new Error("Failed to fetch subscriptions")
            }

            const data = await response.json()
            setSubscriptions(data.data)
            setTotalPages(data.pagination.totalPages)
            setTotalCount(data.pagination.total)

            // Also fetch all subscriptions without pagination for export purposes
            const allQueryParams = new URLSearchParams({
                page: "1",
                pageSize: "99999", // Large number to get all at once
                ...(search && { search }),
            })
            const allResponse = await fetch(`/api/admin/super-admin/recurring-billing?${allQueryParams}`)
            if (allResponse.ok) {
                const allData = await allResponse.json()
                setAllSubscriptions(allData.data)
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "An error occurred"
            setError(message)
            toast({
                title: "Error",
                description: message,
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, search, toast])

    // Fetch employer exclusive packages (paginated)
    const fetchEmployerPackages = useCallback(async () => {
        try {
            const queryParams = new URLSearchParams({
                page: employerPage.toString(),
                pageSize: employerPageSize.toString(),
            })
            const response = await fetch(`/api/admin/super-admin/employer-recurring-packages?${queryParams}`)
            if (response.ok) {
                const data = await response.json()
                setEmployerPackages(data.data || [])
                if (data.pagination) {
                    setEmployerTotalPages(data.pagination.totalPages)
                    setEmployerTotalCount(data.pagination.totalCount)
                }
            }
        } catch (err) {
            console.error('Error fetching employer packages:', err)
        }
    }, [employerPage, employerPageSize])

    // Fetch on component mount and when filters change
    useEffect(() => {
        fetchSubscriptions()
        fetchEmployerPackages()
    }, [fetchSubscriptions, fetchEmployerPackages])

    // Handle refresh
    const handleRefresh = () => {
        setPage(1)
        fetchSubscriptions()
        fetchEmployerPackages()
    }

    // Handle search
    const handleSearch = (value: string) => {
        setSearch(value)
        setPage(1)
    }

    // Handle status filter change
    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus)
        setPage(1)
    }

    // Handle CSV export
    const handleExportCSV = () => {
        // Filter subscriptions based on current filters (status + planFilter)
        // Use allSubscriptions if available (contains all matching data), otherwise use current page
        const sourceData = allSubscriptions.length > 0 ? allSubscriptions : subscriptions
        const dataToExport = sourceData.filter((s) => {
            const matchesStatus = status ? s.status === status : true
            const matchesPlan = planFilter === "" || s.plan === planFilter
            return matchesStatus && matchesPlan
        })

        if (dataToExport.length === 0) {
            toast({
                title: "No Data",
                description: "No subscriptions to export",
            })
            return
        }

        // Create CSV header
        const headers = [
            "Seeker Name",
            "Email",
            "Plan",
            "Status",
            "Amount",
            "Billing Interval",
            "Start Date",
            "Next Renewal",
            "Auto-Renew",
            "Trial?",
            "Trial Expiry",
            "Last Payment Date",
            "Last Payment Amount",
            "Payment Provider",
            "Authnet Subscription ID",
        ]

        // Create CSV rows - use filtered subscriptions to respect current filters
        const rows = dataToExport.map((sub) => [
            sub.seekerName || "",
            sub.seekerEmail || "",
            sub.planName || "",
            sub.status || "",
            sub.amount ? Number(sub.amount).toFixed(2) : "0.00",
            sub.billingInterval || "",
            sub.subscriptionStartDate ? new Date(sub.subscriptionStartDate).toLocaleDateString() : "N/A",
            sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toLocaleDateString() : "N/A",
            sub.autoRenew ? "Yes" : "No",
            sub.isOnTrial ? "Yes" : "No",
            sub.trialExpiryDate ? new Date(sub.trialExpiryDate).toLocaleDateString() : "N/A",
            sub.lastPaymentDate ? new Date(sub.lastPaymentDate).toLocaleDateString() : "N/A",
            sub.lastPaymentAmount && typeof sub.lastPaymentAmount === 'number' ? Number(sub.lastPaymentAmount).toFixed(2) : "N/A",
            sub.paymentProvider || "",
            sub.authnetSubscriptionId || "",
        ])

        // Create CSV content
        const csvContent = [
            headers.join(","),
            ...rows.map((row) =>
                row
                    .map((cell) => {
                        const cellStr = String(cell || "")
                        return cellStr.includes(",") || cellStr.includes('"') ? `"${cellStr.replace(/"/g, '""')}"` : cellStr
                    })
                    .join(",")
            ),
        ].join("\n")

        // Generate filename with timestamp
        const now = new Date()
        const timestamp = now
            .toISOString()
            .replace(/[-:]/g, "")
            .slice(0, 15)
            .replace("T", "_")
        const filename = `recurring_subscriptions_${timestamp}.csv`

        // Download CSV
        const element = document.createElement("a")
        element.setAttribute("href", `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`)
        element.setAttribute("download", filename)
        element.style.display = "none"
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)

        toast({
            title: "Success",
            description: `Exported ${dataToExport.length} subscriptions to ${filename}`,
        })
    }

    if (error && error.includes("permission")) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-md border-destructive">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Access Denied
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            You do not have permission to access the recurring billing dashboard. Only super-admin users can view this page.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Calculate counts respecting the current plan filter - use all subscriptions data if available
    const dataForCounts = allSubscriptions.length > 0 ? allSubscriptions : subscriptions
    const activeCount = dataForCounts.filter((s) =>
        s.status === "active" && (planFilter === "" || s.plan === planFilter)
    ).length
    const canceledCount = dataForCounts.filter((s) =>
        s.status === "canceled" && (planFilter === "" || s.plan === planFilter)
    ).length

    // Calculate employer exclusive package counts and metrics
    const activeEmployerPackages = employerPackages.filter(p => p.recurringStatus === 'active')
    const canceledEmployerPackages = employerPackages.filter(p => p.recurringStatus === 'cancelled' || p.recurringStatus === 'completed')
    const employerMRR = activeEmployerPackages.reduce((sum, p) => sum + (p.recurringAmountCents || 0) / 100, 0)
    const employerExpectedValue = activeEmployerPackages.reduce((sum, p) => {
        const remaining = (p.billingCyclesTotal || 0) - (p.billingCyclesCompleted || 0)
        return sum + (remaining * (p.recurringAmountCents || 0) / 100)
    }, 0)

    // Format currency helper
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Recurring Billing Dashboard</h1>
                <p className="text-muted-foreground">
                    Manage and monitor all recurring subscriptions and billing information
                </p>
            </div>

            {/* Main Tabs: Seekers vs Employers */}
            <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="seekers" className="gap-2">
                        <Users className="h-4 w-4" />
                        Seeker Subscriptions
                    </TabsTrigger>
                    <TabsTrigger value="employers" className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Exclusive Plans
                    </TabsTrigger>
                </TabsList>

                {/* Seeker Subscriptions Tab */}
                <TabsContent value="seekers" className="space-y-6">
                    {/* Controls & Filters */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="space-y-4">
                                {/* Search Row */}
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex-1">
                                        <Input
                                            placeholder="Search by seeker name or email..."
                                            value={search}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="max-w-sm"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleRefresh}
                                            disabled={loading}
                                            className="gap-2"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                            Refresh
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleExportCSV}
                                            disabled={loading || subscriptions.length === 0}
                                            className="gap-2"
                                        >
                                            <Download className="h-4 w-4" />
                                            Export CSV
                                        </Button>
                                    </div>
                                </div>

                                {/* Quick Filters */}
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className="text-xs text-muted-foreground font-semibold">FILTERS:</span>
                                    <Button
                                        size="sm"
                                        variant={planFilter === "" ? "default" : "outline"}
                                        onClick={() => {
                                            setPlanFilter("")
                                            setPage(1)
                                        }}
                                    >
                                        All Plans
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={planFilter === "trial_monthly" ? "default" : "outline"}
                                        onClick={() => {
                                            setPlanFilter("trial_monthly")
                                            setPage(1)
                                        }}
                                    >
                                        Trial
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={planFilter === "gold_bimonthly" ? "default" : "outline"}
                                        onClick={() => {
                                            setPlanFilter("gold_bimonthly")
                                            setPage(1)
                                        }}
                                    >
                                        Gold
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={planFilter === "vip_quarterly" ? "default" : "outline"}
                                        onClick={() => {
                                            setPlanFilter("vip_quarterly")
                                            setPage(1)
                                        }}
                                    >
                                        VIP
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={planFilter === "annual_platinum" ? "default" : "outline"}
                                        onClick={() => {
                                            setPlanFilter("annual_platinum")
                                            setPage(1)
                                        }}
                                    >
                                        Annual
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Status Tabs */}
                    <Card>
                        <CardHeader className="pb-0">
                            <Tabs value={status} onValueChange={handleStatusChange}>
                                <TabsList className="w-full justify-start border-b bg-transparent p-0">
                                    <TabsTrigger
                                        value="active"
                                        className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                                    >
                                        Active ({activeCount})
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="canceled"
                                        className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                                    >
                                        Canceled ({canceledCount})
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="active" className="mt-0 border-t">
                                    <RecurringBillingList
                                        subscriptions={subscriptions.filter((s) =>
                                            s.status === "active" &&
                                            (planFilter === "" || s.plan === planFilter)
                                        ) as SubscriptionData[]}
                                        loading={loading}
                                        onViewDetails={(sub: SubscriptionData) => {
                                            setSelectedSubscription(sub)
                                            setShowDetailsModal(true)
                                        }}
                                    />
                                </TabsContent>

                                <TabsContent value="canceled" className="mt-0 border-t">
                                    <RecurringBillingList
                                        subscriptions={subscriptions.filter((s) =>
                                            s.status === "canceled" &&
                                            (planFilter === "" || s.plan === planFilter)
                                        ) as SubscriptionData[]}
                                        loading={loading}
                                        onViewDetails={(sub: SubscriptionData) => {
                                            setSelectedSubscription(sub)
                                            setShowDetailsModal(true)
                                        }}
                                    />
                                </TabsContent>
                            </Tabs>
                        </CardHeader>
                    </Card>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1 || loading}
                            >
                                Previous
                            </Button>
                            <Button variant="outline" disabled>
                                Page {page} of {totalPages}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages || loading}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </TabsContent>

                {/* Employer Exclusive Plans Tab */}
                <TabsContent value="employers" className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                                <RotateCcw className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-amber-600">{activeEmployerPackages.length}</div>
                                <p className="text-xs text-muted-foreground">Exclusive employer plans</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Monthly MRR</CardTitle>
                                <DollarSign className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(employerMRR)}</div>
                                <p className="text-xs text-muted-foreground">Monthly recurring revenue</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Expected Value</CardTitle>
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{formatCurrency(employerExpectedValue)}</div>
                                <p className="text-xs text-muted-foreground">Remaining billing cycles</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Completed/Cancelled</CardTitle>
                                <AlertCircle className="h-4 w-4 text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-600">{canceledEmployerPackages.length}</div>
                                <p className="text-xs text-muted-foreground">Ended subscriptions</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Employer Packages List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Employer Exclusive Recurring Plans</CardTitle>
                            <CardDescription>
                                Employers with active exclusive recurring billing plans (Gold Plus 6-Month, etc.)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {activeEmployerPackages.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No active employer exclusive plans found.</p>
                                    <p className="text-sm mt-2">Exclusive plans are offered to select employers via admin invitation.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeEmployerPackages.map((pkg) => (
                                        <div key={pkg.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                                    <RotateCcw className="h-5 w-5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{pkg.companyName || pkg.employerName}</p>
                                                    <p className="text-sm text-gray-500">{pkg.employerEmail}</p>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium">{pkg.packageName || pkg.packageType}</p>
                                                <Badge variant="outline" className="text-amber-600 border-amber-200">
                                                    {pkg.billingCyclesCompleted}/{pkg.billingCyclesTotal} paid
                                                </Badge>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-green-600">{formatCurrency((pkg.recurringAmountCents || 0) / 100)}/mo</p>
                                                <p className="text-xs text-gray-500">
                                                    Next: {pkg.nextBillingDate ? new Date(pkg.nextBillingDate).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                            <Badge
                                                variant={pkg.recurringStatus === 'active' ? 'default' : 'secondary'}
                                                className={pkg.recurringStatus === 'active' ? 'bg-green-100 text-green-700' : ''}
                                            >
                                                {pkg.recurringStatus}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Completed/Cancelled Packages Section */}
                            {canceledEmployerPackages.length > 0 && (
                                <div className="mt-8 pt-6 border-t">
                                    <h4 className="text-sm font-semibold text-gray-500 mb-4">Completed / Cancelled Plans</h4>
                                    <div className="space-y-3">
                                        {canceledEmployerPackages.map((pkg) => (
                                            <div key={pkg.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 opacity-75">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <RotateCcw className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{pkg.companyName || pkg.employerName}</p>
                                                        <p className="text-xs text-gray-400">{pkg.employerEmail}</p>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {pkg.billingCyclesCompleted}/{pkg.billingCyclesTotal} paid
                                                </div>
                                                <Badge variant="secondary">{pkg.recurringStatus}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {employerTotalPages > 1 && (
                                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                    <div className="text-sm text-muted-foreground">
                                        Showing page {employerPage} of {employerTotalPages} ({employerTotalCount} total)
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEmployerPage(prev => Math.max(1, prev - 1))}
                                            disabled={employerPage <= 1}
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-sm font-medium px-2">
                                            {employerPage} / {employerTotalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEmployerPage(prev => Math.min(employerTotalPages, prev + 1))}
                                            disabled={employerPage >= employerTotalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Details Modal */}
            {selectedSubscription && (
                <RecurringBillingDetailsModal
                    isOpen={showDetailsModal}
                    onClose={() => {
                        setShowDetailsModal(false)
                        setSelectedSubscription(null)
                    }}
                    subscription={selectedSubscription}
                />
            )}
        </div>
    )
}
