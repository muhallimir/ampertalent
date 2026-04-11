'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { AddOnsSelectionPanel } from './AddOnsSelectionPanel'
import { Zap } from 'lucide-react'

interface AddOnsSelectionDialogProps {
    isOpen: boolean
    onClose: () => void
    packageType: string
    basePrice: number
    packageName: string
    onConfirm: (addOnIds: string[], totalPrice: number) => void
}

export function AddOnsSelectionDialog({
    isOpen,
    onClose,
    packageType,
    basePrice,
    packageName,
    onConfirm,
}: AddOnsSelectionDialogProps) {
    const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
    const [totalPrice, setTotalPrice] = useState(basePrice)

    const handleConfirm = () => {
        onConfirm(selectedAddOns, totalPrice)
        onClose()
        setSelectedAddOns([])
    }

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSelectedAddOns([])
            setTotalPrice(basePrice)
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        <span>Enhance Your Package</span>
                    </DialogTitle>
                    <DialogDescription>
                        Add optional services to your {packageName} package to maximize your hiring success
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <AddOnsSelectionPanel
                        packageType={packageType}
                        selectedAddOns={selectedAddOns}
                        onAddOnsChange={setSelectedAddOns}
                        onTotalPriceChange={setTotalPrice}
                        basePrice={basePrice}
                    />

                    {/* Price Summary */}
                    <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{packageName} Package</span>
                            <span className="font-medium">${basePrice.toFixed(2)}</span>
                        </div>
                        {selectedAddOns.length > 0 && (
                            <>
                                <div className="border-t border-gray-200 pt-2 mt-2">
                                    {selectedAddOns.length > 0 && (
                                        <div className="flex justify-between text-sm text-gray-700 mb-2">
                                            <span>Add-Ons ({selectedAddOns.length})</span>
                                            <span className="font-medium">
                                                +${(totalPrice - basePrice).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                    <span className="font-semibold text-gray-900">Total</span>
                                    <span className="text-2xl font-bold text-blue-600">
                                        ${totalPrice.toFixed(2)}
                                    </span>
                                </div>
                            </>
                        )}
                        {selectedAddOns.length === 0 && (
                            <div className="text-center py-2 text-sm text-gray-500">
                                No add-ons selected
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="space-x-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
                        Continue to Checkout
                        <span className="ml-2 text-sm">
                            (${totalPrice.toFixed(2)})
                        </span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
