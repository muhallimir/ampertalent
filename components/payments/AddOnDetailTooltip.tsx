'use client'

import { useState } from 'react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Info } from 'lucide-react'

interface AddOnDetailTooltipProps {
    name: string
    description: string
    price: number
    icon?: string
}

export function AddOnDetailTooltip({
    name,
    description,
    price,
    icon,
}: AddOnDetailTooltipProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div className="flex items-center space-x-2 cursor-help hover:opacity-80 transition-opacity">
                    <span className="text-sm font-medium">{name}</span>
                    {icon && <span className="text-lg">{icon}</span>}
                    <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-64">
                <div className="space-y-3">
                    <div>
                        <p className="font-semibold text-sm text-gray-900">{name}</p>
                        {icon && <span className="inline-block text-lg mt-1">{icon}</span>}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                    <div className="pt-2 border-t border-gray-200">
                        <p className="text-lg font-bold text-amber-600">
                            ${price.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Expires with your 30-day package
                        </p>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
