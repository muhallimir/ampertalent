"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Gift, CheckCircle, XCircle, Clock, DollarSign, Search, Plus } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface ExclusivePlanData {
    userId: string
    companyName: string
    email: string
    name: string
    planType: string | null
    planName: string | null
    amountCents: number | null
    cycles: number | null
    offeredAt: string | null
    dismissedAt: string | null
    activatedAt: string | null
    status: 'pending' | 'activated' | 'dismissed' | 'cancelled'
    // Package billing info
    packageId: string | null
    billingCyclesCompleted: number | null
    billingCyclesTotal: number | null
    nextBillingDate: string | null
    recurringStatus: string | null
    // Extension request info
    extensionRequestStatus: string | null
    extensionRequestedMonths: number | null
    extensionRequestedAt: string | null
}

interface Stats {
    pending: number
    activated: number
    dismissed: number
    cancelled: number
    totalRevenueCents: number
}

interface Employer {
    userId: string
    companyName: string
    email: string
    name: string
}

export function ExclusiveOffersTab() {
    const { addToast } = useToast()
    const [data, setData] = useState<ExclusivePlanData[]>([])
    const [stats, setStats] = useState<Stats>({ pending: 0, activated: 0, dismissed: 0, cancelled: 0, totalRevenueCents: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [status, setStatus] = useState<string>("all")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)

    // Offer dialog state
    const [showOfferDialog, setShowOfferDialog] = useState(false)
    const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null)
    const [selectedPlanType] = useState("gold_plus_recurring_6mo")
    const [isOffering, setIsOffering] = useState(false)

    // Search employers dialog
    const [showSearchDialog, setShowSearchDialog] = useState(false)
    const [employerSearch, setEmployerSearch] = useState("")
    const [searchResults, setSearchResults] = useState<Employer[]>([])
    const [isSearching, setIsSearching] = useState(false)

    // Extend dialog state
    const [showExtendDialog, setShowExtendDialog] = useState(false)
    const [extendEmployer, setExtendEmployer] = useState<ExclusivePlanData | null>(null)
    const [extendMonths, setExtendMonths] = useState<number>(6)
    const [isExtending, setIsExtending] = useState(false)

    // Extension request review dialog state
    const [showExtensionReviewDialog, setShowExtensionReviewDialog] = useState(false)
    const [extensionReviewEmployer, setExtensionReviewEmployer] = useState<ExclusivePlanData | null>(null)
    const [isReviewingExtension, setIsReviewingExtension] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: "20",
                status,
                ...(search && { search }),
            })

            const response = await fetch(`/api/admin/exclusive-offers?${queryParams}`)

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    setError("You do not have permission to access this feature.")
                    throw new Error("Unauthorized")
                }
                throw new Error("Failed to fetch exclusive offers")
            }

            const result = await response.json()
            setData(result.data)
            setStats(result.stats)
            setTotalPages(result.pagination.totalPages)
        } catch (err) {
            const message = err instanceof Error ? err.message : "An error occurred"
            setError(message)
            addToast({
                title: "Error",
                description: message,
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }, [page, status, search, addToast])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleRefresh = () => {
        setPage(1)
        fetchData()
    }

    const handleSearch = (value: string) => {
        setSearch(value)
        setPage(1)
    }

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus)
        setPage(1)
    }

    const searchEmployers = async () => {
        if (!employerSearch.trim()) return

        setIsSearching(true)
        try {
            const response = await fetch(`/api/admin/employers?search=${encodeURIComponent(employerSearch)}&limit=10`)
            if (response.ok) {
                const result = await response.json()
                setSearchResults(result.employers.map((emp: any) => ({
                    userId: emp.userId,
                    companyName: emp.companyName,
                    email: emp.email,
                    name: emp.user?.name || emp.companyName
                })))
            }
        } catch (err) {
            console.error("Error searching employers:", err)
        } finally {
            setIsSearching(false)
        }
    }

    const handleOfferPlan = async () => {
        if (!selectedEmployer) return

        setIsOffering(true)
        try {
            const response = await fetch('/api/admin/exclusive-offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employerId: selectedEmployer.userId,
                    planType: selectedPlanType
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to offer plan")
            }

            addToast({
                title: "Success! 🎉",
                description: `Exclusive plan offered to ${selectedEmployer.name}`,
                variant: "default"
            })

            setShowOfferDialog(false)
            setSelectedEmployer(null)
            fetchData()
        } catch (err) {
            const message = err instanceof Error ? err.message : "An error occurred"
            addToast({
                title: "Error",
                description: message,
                variant: "destructive",
            })
        } finally {
            setIsOffering(false)
        }
    }

    const handleRevokePlan = async (employerId: string, employerName: string) => {
        if (!confirm(`Are you sure you want to revoke the exclusive plan offer for ${employerName}?`)) {
            return
        }

        try {
            const response = await fetch(`/api/admin/exclusive-offers?employerId=${employerId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to revoke plan")
            }

            addToast({
                title: "Plan Revoked",
                description: `Exclusive plan offer revoked for ${employerName}`,
                variant: "default"
            })

            fetchData()
        } catch (err) {
            const message = err instanceof Error ? err.message : "An error occurred"
            addToast({
                title: "Error",
                description: message,
                variant: "destructive",
            })
        }
    }

    const handleExtendPlan = async () => {
        if (!extendEmployer) return

        setIsExtending(true)
        try {
            const response = await fetch('/api/admin/exclusive-offers/extend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employerId: extendEmployer.userId,
                    additionalCycles: extendMonths
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to extend plan")
            }

            const result = await response.json()

            addToast({
                title: "Plan Extended! 🎉",
                description: `${extendEmployer.companyName}'s plan extended by ${extendMonths} months. New total: ${result.extension.newCyclesTotal} months.`,
                variant: "default"
            })

            setShowExtendDialog(false)
            setExtendEmployer(null)
            setExtendMonths(6)
            fetchData()
        } catch (err) {
            const message = err instanceof Error ? err.message : "An error occurred"
            addToast({
                title: "Error",
                description: message,
                variant: "destructive",
            })
        } finally {
            setIsExtending(false)
        }
    }

    const handleExtensionReview = async (action: 'approve' | 'reject') => {
        if (!extensionReviewEmployer || !extensionReviewEmployer.packageId) return

        setIsReviewingExtension(true)
        try {
            const response = await fetch('/api/admin/exclusive-offers/extension-request/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packageId: extensionReviewEmployer.packageId,
                    action
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || `Failed to ${action} extension request`)
            }

            const result = await response.json()

            addToast({
                title: action === 'approve' ? "Extension Approved! ✅" : "Extension Rejected",
                description: result.message,
                variant: action === 'approve' ? "default" : "destructive"
            })

            setShowExtensionReviewDialog(false)
            setExtensionReviewEmployer(null)
            fetchData()
        } catch (err) {
            const message = err instanceof Error ? err.message : "An error occurred"
            addToast({
                title: "Error",
                description: message,
                variant: "destructive",
            })
        } finally {
            setIsReviewingExtension(false)
        }
    }

    const formatCurrency = (cents: number | null) => {
        if (cents === null) return "-"
        return `$${(cents / 100).toFixed(2)}`
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-"
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const getStatusBadge = (item: ExclusivePlanData) => {
        // Show cancelled status first (highest priority for visual feedback)
        if (item.recurringStatus === 'cancelled') {
            return (
                <div className="flex flex-col gap-1">
                    <Badge variant="destructive">Cancelled</Badge>
                    <span className="text-xs text-muted-foreground">
                        {item.billingCyclesCompleted}/{item.billingCyclesTotal} paid
                    </span>
                </div>
            )
        }
        // Show extension request badge if pending
        if (item.extensionRequestStatus === 'pending') {
            return (
                <div className="flex flex-col gap-1">
                    <Badge className="bg-green-500 hover:bg-green-600">Activated</Badge>
                    <Badge className="bg-orange-500 hover:bg-orange-600 animate-pulse">Extension Requested</Badge>
                </div>
            )
        }
        if (item.activatedAt) {
            return <Badge className="bg-green-500 hover:bg-green-600">Activated</Badge>
        } else if (item.dismissedAt) {
            return <Badge variant="secondary">Dismissed</Badge>
        } else {
            return <Badge className="bg-blue-500 hover:bg-blue-600">Pending</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* Header with actions */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600">
                        Offer, track, and manage exclusive recurring plans for employers
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={() => setShowSearchDialog(true)}>
                        <Gift className="h-4 w-4 mr-2" />
                        Offer New Plan
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Offers</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pending}</div>
                        <p className="text-xs text-muted-foreground">Awaiting activation</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Activated</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activated}</div>
                        <p className="text-xs text-muted-foreground">Active subscriptions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.cancelled}</div>
                        <p className="text-xs text-muted-foreground">Can re-offer</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dismissed</CardTitle>
                        <XCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.dismissed}</div>
                        <p className="text-xs text-muted-foreground">Follow-up needed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenueCents)}</div>
                        <p className="text-xs text-muted-foreground">First payments collected</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by company, email, or name..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Tabs value={status} onValueChange={handleStatusChange}>
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="activated">Activated</TabsTrigger>
                        <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                        <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Data Table */}
            {error ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        {error}
                    </CardContent>
                </Card>
            ) : loading ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        Loading...
                    </CardContent>
                </Card>
            ) : data.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center">
                        <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium">No exclusive offers found</p>
                        <p className="text-muted-foreground">
                            Click "Offer New Plan" to offer an exclusive plan to an employer.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employer</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Cycles</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Offered</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item) => (
                                <TableRow key={item.userId}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{item.companyName}</div>
                                            <div className="text-sm text-muted-foreground">{item.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{item.planName || "-"}</TableCell>
                                    <TableCell>{formatCurrency(item.amountCents)}/mo</TableCell>
                                    <TableCell>{item.billingCyclesTotal || item.cycles || "-"} months</TableCell>
                                    <TableCell>{getStatusBadge(item)}</TableCell>
                                    <TableCell>{formatDate(item.offeredAt)}</TableCell>
                                    <TableCell>
                                        {/* Re-offer button - for cancelled subscriptions */}
                                        {item.recurringStatus === 'cancelled' && (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedEmployer({
                                                        userId: item.userId,
                                                        companyName: item.companyName,
                                                        email: item.email,
                                                        name: item.name
                                                    })
                                                    setShowOfferDialog(true)
                                                }}
                                                className="bg-blue-500 hover:bg-blue-600 text-white"
                                            >
                                                <Gift className="h-4 w-4 mr-1" />
                                                Re-offer
                                            </Button>
                                        )}
                                        {/* Review Extension Request button - priority when extension request is pending */}
                                        {item.extensionRequestStatus === 'pending' && (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => {
                                                    setExtensionReviewEmployer(item)
                                                    setShowExtensionReviewDialog(true)
                                                }}
                                                className="bg-orange-500 hover:bg-orange-600 text-white animate-pulse"
                                            >
                                                <Clock className="h-4 w-4 mr-1" />
                                                Review Request
                                            </Button>
                                        )}
                                        {/* Extend button - only for activated plans without pending request and not cancelled */}
                                        {item.activatedAt && item.extensionRequestStatus !== 'pending' && item.recurringStatus !== 'cancelled' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setExtendEmployer(item)
                                                    setShowExtendDialog(true)
                                                }}
                                                className="text-green-600 hover:text-green-700"
                                            >
                                                <Plus className="h-4 w-4 mr-1" />
                                                Extend
                                            </Button>
                                        )}
                                        {/* Revoke button - only for non-activated plans */}
                                        {!item.activatedAt && item.planType && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRevokePlan(item.userId, item.companyName)}
                                            >
                                                Revoke
                                            </Button>
                                        )}
                                        {!item.planType && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedEmployer({
                                                        userId: item.userId,
                                                        companyName: item.companyName,
                                                        email: item.email,
                                                        name: item.name
                                                    })
                                                    setShowOfferDialog(true)
                                                }}
                                            >
                                                Offer Plan
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Search Employer Dialog */}
            <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Find Employer</DialogTitle>
                        <DialogDescription>
                            Search for an employer to offer an exclusive plan
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search by company name or email..."
                                value={employerSearch}
                                onChange={(e) => setEmployerSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchEmployers()}
                            />
                            <Button onClick={searchEmployers} disabled={isSearching}>
                                {isSearching ? "..." : "Search"}
                            </Button>
                        </div>
                        {searchResults.length > 0 && (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {searchResults.map((emp) => (
                                    <div
                                        key={emp.userId}
                                        className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                                        onClick={() => {
                                            setSelectedEmployer(emp)
                                            setShowSearchDialog(false)
                                            setShowOfferDialog(true)
                                            setSearchResults([])
                                            setEmployerSearch("")
                                        }}
                                    >
                                        <div className="font-medium">{emp.companyName}</div>
                                        <div className="text-sm text-muted-foreground">{emp.email}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Offer Plan Dialog */}
            <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Offer Exclusive Plan</DialogTitle>
                        <DialogDescription>
                            Offer an exclusive recurring plan to {selectedEmployer?.companyName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="font-medium">Gold Plus Small Business</div>
                            <div className="text-sm text-muted-foreground">$97/month × 6 months = $582 total</div>
                            <div className="text-sm text-muted-foreground mt-1">• 1 active job posting for 6 months</div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowOfferDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleOfferPlan} disabled={isOffering}>
                            {isOffering ? "Offering..." : "Offer Plan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Extend Plan Dialog */}
            <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Extend Exclusive Plan</DialogTitle>
                        <DialogDescription>
                            Extend {extendEmployer?.companyName}'s subscription for additional months.
                            Their current plan will continue with more billing cycles.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {extendEmployer && (
                            <div className="bg-muted p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Company:</span>
                                    <span className="font-medium">{extendEmployer.companyName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Email:</span>
                                    <span>{extendEmployer.email}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Current Plan:</span>
                                    <span>{extendEmployer.billingCyclesTotal || extendEmployer.cycles} months @ {formatCurrency(extendEmployer.amountCents)}/mo</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Progress:</span>
                                    <span className="font-medium">
                                        {extendEmployer.billingCyclesCompleted || 0}/{extendEmployer.billingCyclesTotal || extendEmployer.cycles} payments completed
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Activated:</span>
                                    <span>{formatDate(extendEmployer.activatedAt)}</span>
                                </div>
                                {extendEmployer.nextBillingDate && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Next Billing:</span>
                                        <span>{formatDate(extendEmployer.nextBillingDate)}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        <div>
                            <Label>Extend By (months)</Label>
                            <Select value={extendMonths.toString()} onValueChange={(v) => setExtendMonths(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="6">6 months</SelectItem>
                                    <SelectItem value="12">12 months</SelectItem>
                                    <SelectItem value="18">18 months</SelectItem>
                                    <SelectItem value="24">24 months</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {extendEmployer && (
                            <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-2">
                                <p className="text-sm text-green-800">
                                    <strong>After extension:</strong> {(extendEmployer.billingCyclesTotal || extendEmployer.cycles || 6) + extendMonths} total months
                                    ({extendMonths} additional payments of {formatCurrency(extendEmployer.amountCents)})
                                </p>
                                {extendEmployer.nextBillingDate && (
                                    <p className="text-xs text-green-600">
                                        Next billing date will remain: {formatDate(extendEmployer.nextBillingDate)} (unchanged)
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowExtendDialog(false)
                            setExtendEmployer(null)
                            setExtendMonths(6)
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleExtendPlan} disabled={isExtending} className="bg-green-600 hover:bg-green-700">
                            {isExtending ? "Extending..." : `Extend by ${extendMonths} Months`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Extension Request Review Dialog */}
            <Dialog open={showExtensionReviewDialog} onOpenChange={setShowExtensionReviewDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            Review Extension Request
                        </DialogTitle>
                        <DialogDescription>
                            {extensionReviewEmployer?.companyName} has requested an extension to their subscription.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {extensionReviewEmployer && (
                            <>
                                <div className="bg-muted p-4 rounded-lg space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Company:</span>
                                        <span className="font-medium">{extensionReviewEmployer.companyName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Email:</span>
                                        <span>{extensionReviewEmployer.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Current Plan:</span>
                                        <span>{extensionReviewEmployer.billingCyclesTotal || extensionReviewEmployer.cycles} months @ {formatCurrency(extensionReviewEmployer.amountCents)}/mo</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Progress:</span>
                                        <span className="font-medium">
                                            {extensionReviewEmployer.billingCyclesCompleted || 0}/{extensionReviewEmployer.billingCyclesTotal || extensionReviewEmployer.cycles} payments completed
                                        </span>
                                    </div>
                                    {extensionReviewEmployer.nextBillingDate && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Next Billing:</span>
                                            <span>{formatDate(extensionReviewEmployer.nextBillingDate)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                    <h4 className="font-medium text-blue-800 mb-2">Extension Request</h4>
                                    <div className="text-sm text-blue-700 space-y-1">
                                        <p><strong>Requested:</strong> {extensionReviewEmployer.extensionRequestedMonths} additional months</p>
                                        <p><strong>New Total:</strong> {(extensionReviewEmployer.billingCyclesTotal || 6) + (extensionReviewEmployer.extensionRequestedMonths || 0)} months</p>
                                        <p><strong>Additional Revenue:</strong> {formatCurrency((extensionReviewEmployer.extensionRequestedMonths || 0) * (extensionReviewEmployer.amountCents || 0))}</p>
                                        {extensionReviewEmployer.extensionRequestedAt && (
                                            <p className="text-xs text-blue-600 mt-2">Requested on: {formatDate(extensionReviewEmployer.extensionRequestedAt)}</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => {
                            setShowExtensionReviewDialog(false)
                            setExtensionReviewEmployer(null)
                        }} disabled={isReviewingExtension}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleExtensionReview('reject')}
                            disabled={isReviewingExtension}
                        >
                            {isReviewingExtension ? "Processing..." : "Reject"}
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleExtensionReview('approve')}
                            disabled={isReviewingExtension}
                        >
                            {isReviewingExtension ? "Processing..." : "Approve Extension"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
