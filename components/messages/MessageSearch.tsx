'use client'

import { useState, useCallback } from 'react'
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface SearchResult {
    id: string
    subject: string
    content: string
    isRead: boolean
    createdAt: string
    sender: {
        id: string
        name: string
        firstName?: string
        lastName?: string
        profilePictureUrl?: string
        employer?: {
            companyName: string
        }
    }
    highlights: {
        content: boolean
        sender: boolean
    }
}

interface MessageSearchProps {
    threadId: string
    onResultClick: (messageId: string) => void
    className?: string
}

export function MessageSearch({ threadId, onResultClick, className }: MessageSearchProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isExpanded, setIsExpanded] = useState(false)

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setResults([])
            return
        }

        setIsSearching(true)
        try {
            const response = await fetch(
                `/api/messages/thread/${threadId}/search?q=${encodeURIComponent(searchQuery)}`
            )

            if (response.ok) {
                const data = await response.json()
                setResults(data.results || [])
                setCurrentIndex(0)
            } else {
                setResults([])
            }
        } catch (error) {
            console.error('Search error:', error)
            setResults([])
        } finally {
            setIsSearching(false)
        }
    }, [threadId])

    const handleSearch = useCallback((value: string) => {
        setQuery(value)
        // Debounce search
        const timeoutId = setTimeout(() => {
            performSearch(value)
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [performSearch])

    const clearSearch = () => {
        setQuery('')
        setResults([])
        setCurrentIndex(0)
        setIsExpanded(false)
    }

    const navigateResults = (direction: 'up' | 'down') => {
        if (results.length === 0) return

        let newIndex
        if (direction === 'up') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1
        } else {
            newIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0
        }

        setCurrentIndex(newIndex)
        onResultClick(results[newIndex].id)
    }

    const highlightText = (text: string, query: string) => {
        if (!query) return text

        const regex = new RegExp(`(${query})`, 'gi')
        const parts = text.split(regex)

        return parts.map((part, index) =>
            regex.test(part) ? (
                <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
                    {part}
                </mark>
            ) : (
                part
            )
        )
    }

    return (
        <div className={`border rounded-lg bg-background ${className}`}>
            <div className="p-3 border-b">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search messages..."
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-9 pr-9"
                        />
                        {query && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearSearch}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    {results.length > 0 && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateResults('up')}
                                disabled={results.length <= 1}
                            >
                                <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateResults('down')}
                                disabled={results.length <= 1}
                            >
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                            <Badge variant="secondary" className="text-xs">
                                {currentIndex + 1} / {results.length}
                            </Badge>
                        </div>
                    )}
                    {results.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? 'Collapse' : 'Expand'}
                        </Button>
                    )}
                </div>
            </div>

            {isSearching && (
                <div className="p-3 text-center text-sm text-muted-foreground">
                    Searching...
                </div>
            )}

            {!isSearching && results.length > 0 && (
                <div className={`max-h-60 overflow-y-auto ${isExpanded ? 'block' : 'hidden'}`}>
                    {results.map((result, index) => (
                        <div
                            key={result.id}
                            className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${index === currentIndex ? 'bg-muted' : ''
                                }`}
                            onClick={() => {
                                setCurrentIndex(index)
                                onResultClick(result.id)
                            }}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">
                                    {result.highlights.sender ? (
                                        highlightText(result.sender.name, query)
                                    ) : (
                                        result.sender.name
                                    )}
                                </span>
                                {result.sender.employer && (
                                    <Badge variant="outline" className="text-xs">
                                        {result.sender.employer.companyName}
                                    </Badge>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                    {new Date(result.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                                {result.highlights.content ? (
                                    highlightText(result.content, query)
                                ) : (
                                    result.content
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isSearching && query && results.length === 0 && query.length >= 2 && (
                <div className="p-3 text-center text-sm text-muted-foreground">
                    No messages found matching &quot;{query}&quot;
                </div>
            )}
        </div>
    )
}