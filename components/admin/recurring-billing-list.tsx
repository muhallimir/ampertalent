"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Eye } from "lucide-react"
import { SubscriptionData } from "@/app/admin/types"

interface RecurringBillingListProps {
    subscriptions: SubscriptionData[]
    loading: boolean
    onViewDetails: (subscription: SubscriptionData) => void
}

export function RecurringBillingList({
    subscriptions,
    loading,
    onViewDetails,
}: RecurringBillingListProps) {

    if (loading) {
        return (
            <div className="space-y-4 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                        {Array.from({ length: 10 }).map((_, j) => (
                            <Skeleton key={j} className="h-10 flex-1" />
                        ))}
                    </div>
                ))}
            </div>
        )
    }

    if (subscriptions.length === 0) {
        return (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
                <p>No subscriptions found</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Seeker Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Billing Interval</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>Next Renewal</TableHead>
                        <TableHead className="text-center">Auto-Renew</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {subscriptions.map((sub) => (
                        <TableRow key={sub.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{sub.seekerName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{sub.seekerEmail}</TableCell>
                            <TableCell>{sub.planName}</TableCell>
                            <TableCell>
                                <Badge variant={sub.status === "active" ? "default" : "destructive"}>
                                    {sub.status === "active" ? "Active" : "Canceled"}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                ${(sub.amount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm">{sub.billingInterval}</TableCell>
                            <TableCell className="text-sm">
                                {sub.subscriptionStartDate
                                    ? new Date(sub.subscriptionStartDate).toLocaleDateString()
                                    : "N/A"}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                                {sub.nextRenewalDate
                                    ? new Date(sub.nextRenewalDate).toLocaleDateString()
                                    : "N/A"}
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant={sub.autoRenew ? "default" : "secondary"}>
                                    {sub.autoRenew ? "Yes" : "No"}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onViewDetails(sub)}
                                    className="h-8 w-8 p-0"
                                    title="View details"
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
