'use client'

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Info } from 'lucide-react'

interface AddOn {
    id: string
    name: string
    description: string
    price: number
    icon?: string
    displayOrder: number
}

interface AddOnsSelectionPanelProps {
    packageType: string
    selectedAddOns: string[]
    onAddOnsChange: (addOnIds: string[]) => void
    onTotalPriceChange: (totalPrice: number) => void
    basePrice: number
}

export function AddOnsSelectionPanel({
    packageType,
    selectedAddOns,
    onAddOnsChange,
    onTotalPriceChange,
    basePrice,
}: AddOnsSelectionPanelProps) {
    const [addOns, setAddOns] = useState<AddOn[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            // Only load add-ons for Concierge packages
            if (!packageType || !packageType.startsWith('concierge_')) {
                setAddOns([])
                return
            }

            try {
                setIsLoading(true)
                setError(null)
                const response = await fetch(`/api/add-ons/for-package?packageType=${packageType}`)
                if (!response.ok) {
                    throw new Error('Failed to load add-ons')
                }
                const data = await response.json()
                // Ensure price is always a number
                const formattedAddOns = (data.addOns || []).map((addon: any) => ({
                    ...addon,
                    price: typeof addon.price === 'string' ? parseFloat(addon.price) : addon.price
                }))
                setAddOns(formattedAddOns)
            } catch (err) {
                console.error('Error loading add-ons:', err)
                setError('Failed to load add-ons')
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [packageType])

    useEffect(() => {
        // Calculate and update total price when selected add-ons change
        const addOnsTotalPrice = selectedAddOns.reduce((total, addOnId) => {
            const addOn = addOns.find((a) => a.id === addOnId)
            return total + (addOn?.price || 0)
        }, 0)
        onTotalPriceChange(basePrice + addOnsTotalPrice)
    }, [selectedAddOns, addOns, basePrice, onTotalPriceChange])

    const handleToggleAddOn = (addOnId: string) => {
        if (selectedAddOns.includes(addOnId)) {
            onAddOnsChange(selectedAddOns.filter((id) => id !== addOnId))
        } else {
            onAddOnsChange([...selectedAddOns, addOnId])
        }
    }

    if (isLoading) {
        return (
            <Card className="border-gray-200">
                <CardHeader>
                    <CardTitle className="text-lg">Add-On Services</CardTitle>
                    <CardDescription>Loading available add-ons...</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardHeader>
                    <CardTitle className="text-lg text-red-800">Error Loading Add-Ons</CardTitle>
                    <CardDescription className="text-red-700">{error}</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    if (addOns.length === 0) {
        return (
            <Card className="border-gray-200">
                <CardHeader>
                    <CardTitle className="text-lg">Add-On Services</CardTitle>
                    <CardDescription>No add-ons available for this package</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className="border-amber-100 bg-amber-50">
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <span className="text-lg">Add-On Services</span>
                    <Info className="h-4 w-4 text-gray-500" />
                </CardTitle>
                <CardDescription>
                    Enhance your package with optional services (expires with your package)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {addOns.map((addOn) => {
                        const isSelected = selectedAddOns.includes(addOn.id)
                        return (
                            <div
                                key={addOn.id}
                                className={`flex items-start justify-between p-3 border-2 rounded-lg transition-colors cursor-pointer ${isSelected
                                    ? 'border-amber-400 bg-white'
                                    : 'border-amber-200 hover:border-amber-300 bg-white'
                                    }`}
                                onClick={() => handleToggleAddOn(addOn.id)}
                            >
                                <div className="flex items-start space-x-3 flex-1">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggleAddOn(addOn.id)}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{addOn.name}</p>
                                        <div className="text-xs text-gray-600 mt-2">
                                            <p className="mb-2">{addOn.description}</p>
                                            {addOn.id === 'onboarding_new_hire' && (
                                                <ul className="list-disc list-inside space-y-1">
                                                    {addOn.features?.map((feature, idx) => (
                                                        <li key={idx} className="text-gray-600">
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-4 text-right flex-shrink-0">
                                    <p className="font-semibold text-sm text-orange-600">
                                        ${addOn.price.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Selected Add-Ons Summary */}
                {selectedAddOns.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-amber-200">
                        <p className="text-xs text-gray-600 mb-2">
                            {selectedAddOns.length} add-on{selectedAddOns.length !== 1 ? 's' : ''} selected
                        </p>
                        <div className="space-y-1">
                            {selectedAddOns.map((addOnId) => {
                                const addOn = addOns.find((a) => a.id === addOnId)
                                return (
                                    <div
                                        key={addOnId}
                                        className="flex justify-between items-center text-xs text-gray-700"
                                    >
                                        <span>{addOn?.name}</span>
                                        <span className="text-amber-700 font-medium">
                                            +${addOn?.price.toFixed(2)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
