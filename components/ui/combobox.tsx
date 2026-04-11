"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
    options: { value: string; label: string; description?: string }[]
    value?: string
    onValueChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    disabled?: boolean
    className?: string
}

export function Combobox({
    options,
    value,
    onValueChange,
    placeholder = "Select option...",
    searchPlaceholder = "Search...",
    emptyMessage = "No options found.",
    disabled = false,
    className,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [searchValue, setSearchValue] = React.useState("")

    const selectedOption = options.find((option) => option.value === value)

    // Filter options based on search
    const filteredOptions = React.useMemo(() => {
        if (!searchValue) return options

        const search = searchValue.toLowerCase()
        return options.filter(option =>
            option.label.toLowerCase().includes(search) ||
            option.value.toLowerCase().includes(search) ||
            option.description?.toLowerCase().includes(search)
        )
    }, [options, searchValue])

    React.useEffect(() => {
        if (open) {
            console.log('🔍 Combobox opened with', filteredOptions.length, 'options:', filteredOptions.map(o => o.label))
        }
    }, [open, filteredOptions])

    return (
        <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between text-left", className)}
                    disabled={disabled}
                >
                    <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white" align="start" sideOffset={4}>
                <Command shouldFilter={false} disablePointerSelection={false} className="bg-white">
                    <CommandInput
                        placeholder={searchPlaceholder}
                        className="border-none focus:ring-0 bg-white"
                        value={searchValue}
                        onValueChange={setSearchValue}
                    />
                    <CommandList className="max-h-60 overflow-y-auto bg-white">
                        <CommandEmpty className="py-6 text-center text-sm">{emptyMessage}</CommandEmpty>
                        <CommandGroup className="bg-white [&_[cmdk-group-items]]:bg-white">
                            {filteredOptions.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => {
                                        onValueChange(option.value)
                                        setSearchValue("")
                                        setOpen(false)
                                    }}
                                    style={{ pointerEvents: 'auto', backgroundColor: 'white' }}
                                    className="cursor-pointer bg-white hover:bg-slate-100 data-[selected=true]:bg-slate-100 text-gray-900 aria-selected:bg-slate-100 aria-selected:text-gray-900 opacity-100"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 flex-shrink-0 text-gray-900",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="truncate text-gray-900 font-medium">{option.label}</span>
                                        {option.description && (
                                            <span className="text-sm text-gray-500 truncate">
                                                {option.description}
                                            </span>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}