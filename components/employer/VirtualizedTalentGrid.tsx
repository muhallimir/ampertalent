'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { TalentCard } from './TalentCard'
import { Skeleton } from '@/components/ui/skeleton'

interface TalentProfile {
  id: string
  name: string
  firstName: string | null
  lastName: string | null
  headline: string | null
  aboutMe: string | null
  availability: string | null
  salaryExpectations: string | null
  showSalaryExpectations: boolean
  skills: string[]
  profilePictureUrl: string | null
  membershipPlan: string
  portfolioUrls: string[]
  hasResume: boolean
  joinedAt: string
  updatedAt: string
  applicationStatus: string | null
  jobStatus: string | null
  jobTitle: string | null
}

interface VirtualizedTalentGridProps {
  talents: TalentProfile[]
  loading: boolean
  onViewProfile: (talentId: string) => void
  onInvite: (talentId: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
  containerHeight?: number // Deprecated - kept for backward compatibility
  invitedTalentIds?: Set<string>
}

const ITEMS_PER_PAGE = 20
const SKELETON_COUNT = 8

export function VirtualizedTalentGrid({
  talents,
  loading,
  onViewProfile,
  onInvite,
  onLoadMore,
  hasMore = false,
  containerHeight = 600,
  invitedTalentIds
}: VirtualizedTalentGridProps) {
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (onLoadMore) {
            onLoadMore()
          } else {
            // Load more items from current data
            setVisibleItems(prev => Math.min(prev + ITEMS_PER_PAGE, talents.length))
          }
        }
      },
      {
        root: null, // Use viewport as root for page-level scrolling
        threshold: 0.1,
        rootMargin: '200px' // Increased margin for better UX
      }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading, onLoadMore, talents.length])

  // Memoize visible talents to prevent unnecessary re-renders
  const visibleTalents = useMemo(() => {
    return talents.slice(0, visibleItems)
  }, [talents, visibleItems])

  // Compact loading skeletons for 100k+ profiles
  const renderSkeletons = () => {
    return Array.from({ length: SKELETON_COUNT }).map((_, index) => (
      <div key={`skeleton-${index}`} className="animate-pulse border rounded-lg p-3">
        <div className="flex items-center space-x-2 mb-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-3 mb-1" />
            <Skeleton className="h-2 w-2/3" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2" />
          <Skeleton className="h-2 w-3/4" />
          <div className="flex space-x-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    ))
  }

  // Show loading state initially or when explicitly loading
  if (loading && talents.length === 0) {
    return (
      <div className="space-y-6">
        {/* Loading header */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        
        {/* Optimized Loading grid for 100k+ profiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse border rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                <div className="flex space-x-1">
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Compact empty state for 100k+ profiles interface
  if (talents.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No professionals found</h3>
          <p className="text-sm text-gray-600 mb-4">
            Try adjusting your filters to see more results from our 100k+ professionals.
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Remove filters to broaden search</p>
            <p>• Try different keywords</p>
            <p>• Check spelling</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full"
    >
      {/* Optimized Grid for 100k+ profiles - More columns, tighter spacing */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mb-6">
        {visibleTalents.map((talent) => (
          <div key={talent.id} className="talent-card-wrapper">
            <TalentCard
              talent={talent}
              onViewProfile={onViewProfile}
              onInvite={onInvite}
              isInvited={invitedTalentIds?.has(talent.id) ?? false}
            />
          </div>
        ))}
        
        {/* Compact Loading skeletons */}
        {loading && renderSkeletons()}
      </div>

      {/* Compact Load more trigger */}
      {(hasMore || visibleItems < talents.length) && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {loading ? (
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-teal"></div>
              <span className="text-sm">Loading more...</span>
            </div>
          ) : (
            <div className="text-gray-500 text-xs">
              Scroll for more profiles
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Hook for infinite scrolling with cursor-based pagination
export function useInfiniteScroll(
  initialData: TalentProfile[],
  fetchMore: (cursor?: string) => Promise<{
    data: TalentProfile[]
    pagination: {
      hasNext: boolean
      nextCursor?: string
    }
  }>
) {
  const [data, setData] = useState<TalentProfile[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setError(null)
    
    try {
      const result = await fetchMore(cursor)
      
      setData(prev => {
        // Deduplicate based on ID to prevent duplicates
        const existingIds = new Set(prev.map(item => item.id))
        const newItems = result.data.filter(item => !existingIds.has(item.id))
        return [...prev, ...newItems]
      })
      
      setHasMore(result.pagination.hasNext)
      setCursor(result.pagination.nextCursor)
    } catch (err) {
      console.error('Error loading more data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load more data')
    } finally {
      setLoading(false)
    }
  }, [cursor, loading, hasMore, fetchMore])

  const reset = useCallback((newData: TalentProfile[], newHasMore = true) => {
    setData(newData)
    setHasMore(newHasMore)
    setCursor(undefined)
    setLoading(false)
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    setCursor(undefined)
    setData([])
    setHasMore(true)
    setError(null)
    await loadMore()
  }, [loadMore])

  return {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
    refresh
  }
}

// Performance optimization hook for debounced search
export function useDebouncedSearch(
  searchTerm: string,
  delay: number = 300
) {
  const [debouncedValue, setDebouncedValue] = useState(searchTerm)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(searchTerm)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm, delay])

  return debouncedValue
}

// Memory optimization hook for large datasets
export function useMemoryOptimization<T>(
  data: T[],
  maxItems: number = 1000
) {
  return useMemo(() => {
    if (data.length <= maxItems) return data
    
    // Keep only the most recent items to prevent memory issues
    return data.slice(-maxItems)
  }, [data, maxItems])
}
