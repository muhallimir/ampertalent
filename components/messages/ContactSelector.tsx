'use client'

import { useState, useEffect } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { User, Building } from 'lucide-react'

interface Contact {
    userId: string
    name: string
    firstName?: string
    lastName?: string
    profilePictureUrl?: string
    role: string
    companyName?: string
    context?: {
        type: string
        jobId: string
        jobTitle: string
        applicationId: string
    }
}

interface ContactSelectorProps {
    value?: string
    onChange: (contact: Contact | null) => void
    placeholder?: string
    className?: string
}

export function ContactSelector({
    value,
    onChange,
    placeholder = "Select a recipient",
    className
}: ContactSelectorProps) {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const response = await fetch('/api/messages/contacts')
                if (!response.ok) {
                    throw new Error('Failed to fetch contacts')
                }
                const data = await response.json()
                setContacts(data.contacts)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load contacts')
            } finally {
                setLoading(false)
            }
        }

        fetchContacts()
    }, [])

    const handleValueChange = (userId: string) => {
        const contact = contacts.find(c => c.userId === userId) || null
        onChange(contact)
    }

    if (loading) {
        return (
            <Select disabled>
                <SelectTrigger className={className}>
                    <SelectValue placeholder="Loading contacts..." />
                </SelectTrigger>
            </Select>
        )
    }

    if (error) {
        return (
            <Select disabled>
                <SelectTrigger className={className}>
                    <SelectValue placeholder="Error loading contacts" />
                </SelectTrigger>
            </Select>
        )
    }

    return (
        <Select value={value} onValueChange={handleValueChange}>
            <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {contacts.map((contact) => (
                    <SelectItem key={contact.userId} value={contact.userId}>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                {contact.role === 'employer' ? (
                                    <Building className="h-4 w-4" />
                                ) : (
                                    <User className="h-4 w-4" />
                                )}
                                <span>{contact.name}</span>
                            </div>
                            {contact.companyName && (
                                <span className="text-muted-foreground">
                                    ({contact.companyName})
                                </span>
                            )}
                            {contact.context && (
                                <span className="text-xs text-muted-foreground">
                                    • {contact.context.jobTitle}
                                </span>
                            )}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}