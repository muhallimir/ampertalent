"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SubscriptionData } from "@/app/admin/types"

interface RecurringBillingDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    subscription: SubscriptionData
}

export function RecurringBillingDetailsModal({
    isOpen,
    onClose,
    subscription,
}: RecurringBillingDetailsModalProps) {

    const formatDate = (date: Date | string | null) => {
        if (!date) return "N/A"
        try {
            const dateObj = new Date(date)
            // Check if date is valid
            if (isNaN(dateObj.getTime())) return "N/A"
            return dateObj.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            })
        } catch (error) {
            console.error("Date formatting error:", error, "for date:", date)
            return "N/A"
        }
    }

    const formatCurrency = (amount: number | null) => {
        if (amount === null || amount === undefined) return "N/A"
        try {
            return `$${Number(amount).toFixed(2)}`
        } catch (error) {
            console.error("Currency formatting error:", error, "for amount:", amount)
            return "N/A"
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Subscription Details</DialogTitle>
                    <DialogDescription>{subscription.seekerEmail}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 overflow-y-auto pr-4">
                    {/* Seeker Information */}
                    <div>
                        <h3 className="mb-3 font-semibold text-sm text-muted-foreground">SEEKER INFORMATION</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Name</p>
                                <p className="font-medium">{subscription.seekerName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Email</p>
                                <p className="font-medium">{subscription.seekerEmail}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Subscription Information */}
                    <div>
                        <h3 className="mb-3 font-semibold text-sm text-muted-foreground">
                            SUBSCRIPTION INFORMATION
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Plan</p>
                                <p className="font-medium">{subscription.planName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Status</p>
                                <Badge className="mt-1" variant={subscription.status === "active" ? "default" : "secondary"}>
                                    {subscription.status}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Amount</p>
                                <p className="font-medium">{formatCurrency(subscription.amount)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Billing Interval</p>
                                <p className="font-medium">{subscription.billingInterval}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Auto-Renew</p>
                                <Badge className="mt-1" variant={subscription.autoRenew ? "default" : "secondary"}>
                                    {subscription.autoRenew ? "Enabled" : "Disabled"}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Payment Provider</p>
                                <p className="font-medium">{subscription.paymentProvider}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Billing Cycle */}
                    <div>
                        <h3 className="mb-3 font-semibold text-sm text-muted-foreground">BILLING CYCLE</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Start Date</p>
                                <p className="font-medium">{formatDate(subscription.subscriptionStartDate)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Next Renewal Date</p>
                                <p className="font-medium text-blue-600">{formatDate(subscription.nextRenewalDate)}</p>
                            </div>
                            {subscription.currentPeriodStart && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Current Period Start</p>
                                    <p className="font-medium">{formatDate(subscription.currentPeriodStart)}</p>
                                </div>
                            )}
                            {subscription.currentPeriodEnd && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Current Period End</p>
                                    <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Trial Information */}
                    {subscription.isOnTrial && (
                        <>
                            <div>
                                <h3 className="mb-3 font-semibold text-sm text-muted-foreground">TRIAL INFORMATION</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">On Trial</p>
                                        <Badge className="mt-1" variant="default">
                                            Active
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Trial Expiry Date</p>
                                        <p className="font-medium text-orange-600">
                                            {formatDate(subscription.trialExpiryDate)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />
                        </>
                    )}

                    {/* Payment Information */}
                    <div>
                        <h3 className="mb-3 font-semibold text-sm text-muted-foreground">PAYMENT INFORMATION</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Last Payment Date</p>
                                <p className="font-medium">{formatDate(subscription.lastPaymentDate)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Last Payment Amount</p>
                                <p className="font-medium">{formatCurrency(subscription.lastPaymentAmount)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Last Payment Status</p>
                                <Badge
                                    className="mt-1"
                                    variant={
                                        subscription.lastPaymentStatus === "succeeded" ? "default" : "secondary"
                                    }
                                >
                                    {subscription.lastPaymentStatus || "N/A"}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Authnet Subscription ID</p>
                                <p className="font-medium text-xs">{subscription.authnetSubscriptionId}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
