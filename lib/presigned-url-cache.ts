/**
 * LRU Cache for Presigned URLs with automatic expiration
 *
 * Features:
 * - Bounded size (max 1000 entries) to prevent memory leaks
 * - LRU eviction when capacity is reached
 * - Automatic expiration checking
 * - Thread-safe operations
 */

interface CacheEntry {
    url: string
    expiresAt: number
    lastAccessed: number
}

class PresignedUrlCache {
    private cache: Map<string, CacheEntry>
    private maxSize: number
    private cleanupInterval: NodeJS.Timeout | null = null

    constructor(maxSize: number = 1000) {
        this.cache = new Map()
        this.maxSize = maxSize

        // Run cleanup every 10 minutes to remove expired entries
        this.cleanupInterval = setInterval(() => {
            this.cleanup()
        }, 10 * 60 * 1000)
    }

    /**
     * Get a cached presigned URL
     * @param key - The S3 key
     * @returns The presigned URL if cached and not expired, null otherwise
     */
    get(key: string): string | null {
        const entry = this.cache.get(key)

        if (!entry) {
            return null
        }

        // Check if expired
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key)
            return null
        }

        // Update last accessed time (for LRU)
        entry.lastAccessed = Date.now()
        this.cache.set(key, entry)

        return entry.url
    }

    /**
     * Set a presigned URL in the cache
     * @param key - The S3 key
     * @param url - The presigned URL
     * @param ttlSeconds - Time to live in seconds (default: 23 hours)
     */
    set(key: string, url: string, ttlSeconds: number = 23 * 60 * 60): void {
        // If at capacity, evict the least recently used entry
        if (this.cache.size >= this.maxSize) {
            this.evictLRU()
        }

        const entry: CacheEntry = {
            url,
            expiresAt: Date.now() + (ttlSeconds * 1000),
            lastAccessed: Date.now()
        }

        this.cache.set(key, entry)
    }

    /**
     * Evict the least recently used entry
     */
    private evictLRU(): void {
        let oldestKey: string | null = null
        let oldestTime = Date.now()

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed
                oldestKey = key
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey)
        }
    }

    /**
     * Remove all expired entries
     */
    private cleanup(): void {
        const now = Date.now()
        const keysToDelete: string[] = []

        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt < now) {
                keysToDelete.push(key)
            }
        }

        for (const key of keysToDelete) {
            this.cache.delete(key)
        }

        if (keysToDelete.length > 0) {
            console.log(`[PresignedUrlCache] Cleaned up ${keysToDelete.length} expired entries`)
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; maxSize: number; utilizationPercent: number } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            utilizationPercent: (this.cache.size / this.maxSize) * 100
        }
    }

    /**
     * Clear all entries
     */
    clear(): void {
        this.cache.clear()
    }

    /**
     * Destroy the cache and stop cleanup interval
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
            this.cleanupInterval = null
        }
        this.cache.clear()
    }
}

// Singleton instance shared across all message API routes
export const presignedUrlCache = new PresignedUrlCache(1000)

// Export the class for testing purposes
export { PresignedUrlCache }
