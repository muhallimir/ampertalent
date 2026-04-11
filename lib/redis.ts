import { Redis } from '@upstash/redis';

// Check if Redis environment variables are available
const isRedisAvailable = () => {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
};

// Initialize Upstash Redis client only if environment variables are available
export const redis = isRedisAvailable() ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
}) : null;

// Redis connection for BullMQ (using ioredis format)
export const redisConnection = isRedisAvailable() ? {
  host: process.env.UPSTASH_REDIS_HOST!,
  port: parseInt(process.env.UPSTASH_REDIS_PORT || '6379'),
  password: process.env.UPSTASH_REDIS_PASSWORD!,
  tls: process.env.NODE_ENV === 'production' ? {} : undefined,
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
} : null;

// Cache utilities
export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    if (!redis) {
      console.warn('Redis not available during build time');
      return null;
    }
    try {
      const value = await redis.get(key);
      return value as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    if (!redis) {
      console.warn('Redis not available during build time');
      return false;
    }
    try {
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
      } else {
        await redis.set(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    if (!redis) {
      console.warn('Redis not available during build time');
      return false;
    }
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    if (!redis) {
      console.warn('Redis not available during build time');
      return false;
    }
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Increment counter with expiration
  static async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (!redis) {
      console.warn('Redis not available during build time');
      return 0;
    }
    try {
      const result = await redis.incr(key);
      if (ttlSeconds && result === 1) {
        await redis.expire(key, ttlSeconds);
      }
      return result;
    } catch (error) {
      console.error('Cache incr error:', error);
      return 0;
    }
  }

  // Rate limiting helper
  static async rateLimit(
    key: string, 
    limit: number, 
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const current = await this.incr(key, windowSeconds);
      const remaining = Math.max(0, limit - current);
      const resetTime = Date.now() + (windowSeconds * 1000);
      
      return {
        allowed: current <= limit,
        remaining,
        resetTime
      };
    } catch (error) {
      console.error('Rate limit error:', error);
      return { allowed: true, remaining: limit, resetTime: Date.now() };
    }
  }

  // Session management
  static async setSession(sessionId: string, data: unknown, ttlSeconds: number = 3600): Promise<boolean> {
    return this.set(`session:${sessionId}`, data, ttlSeconds);
  }

  static async getSession<T>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`);
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    return this.del(`session:${sessionId}`);
  }

  // Job tracking
  static async trackJobExecution(jobId: string, status: 'started' | 'completed' | 'failed', data?: unknown): Promise<void> {
    const key = `job:${jobId}`;
    const jobData = {
      status,
      timestamp: new Date().toISOString(),
      data
    };
    
    await this.set(key, jobData, 86400); // 24 hours TTL
  }

  // Metrics tracking
  static async incrementMetric(metric: string, date?: string): Promise<number> {
    const dateKey = date || new Date().toISOString().split('T')[0];
    const key = `metrics:${metric}:${dateKey}`;
    return this.incr(key, 86400 * 7); // 7 days TTL
  }
}

// Talent-specific cache keys and utilities
export const TALENT_CACHE_KEYS = {
  SEARCH_RESULTS: (params: string) => `talent:search:${params}`,
  PROFILE: (id: string) => `talent:profile:${id}`,
  COUNT: (filters: string) => `talent:count:${filters}`,
  POPULAR_SKILLS: 'talent:popular_skills',
  SEARCH_SUGGESTIONS: (query: string) => `talent:suggestions:${query}`,
  PROFILE_PICTURES: (ids: string) => `talent:pictures:${ids}`,
} as const;

// Talent cache TTL in seconds
export const TALENT_CACHE_TTL = {
  SEARCH_RESULTS: 300, // 5 minutes
  PROFILE: 1800, // 30 minutes
  COUNT: 600, // 10 minutes
  POPULAR_SKILLS: 3600, // 1 hour
  SEARCH_SUGGESTIONS: 1800, // 30 minutes
  PROFILE_PICTURES: 7200, // 2 hours
} as const;

// Talent-specific cache service
export class TalentCacheService {
  // Cache search results with pagination
  static async cacheSearchResults(
    searchParams: Record<string, any>,
    results: any,
    pagination: any
  ): Promise<void> {
    const cacheKey = this.generateSearchKey(searchParams);
    const cacheData = {
      results,
      pagination,
      timestamp: Date.now(),
    };
    
    await CacheService.set(
      TALENT_CACHE_KEYS.SEARCH_RESULTS(cacheKey),
      cacheData,
      TALENT_CACHE_TTL.SEARCH_RESULTS
    );
  }

  // Get cached search results
  static async getCachedSearchResults(
    searchParams: Record<string, any>
  ): Promise<{ results: any; pagination: any } | null> {
    const cacheKey = this.generateSearchKey(searchParams);
    const cached = await CacheService.get<{
      results: any;
      pagination: any;
      timestamp: number;
    }>(TALENT_CACHE_KEYS.SEARCH_RESULTS(cacheKey));

    if (!cached) return null;

    // Check if cache is still fresh (within 5 minutes)
    const isStale = Date.now() - cached.timestamp > TALENT_CACHE_TTL.SEARCH_RESULTS * 1000;
    if (isStale) {
      await CacheService.del(TALENT_CACHE_KEYS.SEARCH_RESULTS(cacheKey));
      return null;
    }

    return {
      results: cached.results,
      pagination: cached.pagination,
    };
  }

  // Cache talent profile
  static async cacheProfile(id: string, profile: any): Promise<void> {
    await CacheService.set(
      TALENT_CACHE_KEYS.PROFILE(id),
      profile,
      TALENT_CACHE_TTL.PROFILE
    );
  }

  // Get cached talent profile
  static async getCachedProfile(id: string): Promise<any | null> {
    return CacheService.get(TALENT_CACHE_KEYS.PROFILE(id));
  }

  // Cache talent count for filters
  static async cacheCount(filters: Record<string, any>, count: number): Promise<void> {
    const filterKey = this.generateFilterKey(filters);
    await CacheService.set(
      TALENT_CACHE_KEYS.COUNT(filterKey),
      count,
      TALENT_CACHE_TTL.COUNT
    );
  }

  // Get cached talent count
  static async getCachedCount(filters: Record<string, any>): Promise<number | null> {
    const filterKey = this.generateFilterKey(filters);
    return CacheService.get<number>(TALENT_CACHE_KEYS.COUNT(filterKey));
  }

  // Cache popular skills
  static async cachePopularSkills(skills: string[]): Promise<void> {
    await CacheService.set(
      TALENT_CACHE_KEYS.POPULAR_SKILLS,
      skills,
      TALENT_CACHE_TTL.POPULAR_SKILLS
    );
  }

  // Get cached popular skills
  static async getCachedPopularSkills(): Promise<string[] | null> {
    return CacheService.get<string[]>(TALENT_CACHE_KEYS.POPULAR_SKILLS);
  }

  // Cache profile pictures batch
  static async cacheProfilePictures(
    pictureMap: Record<string, string>
  ): Promise<void> {
    const keys = Object.keys(pictureMap).sort();
    const cacheKey = keys.join(',');
    
    await CacheService.set(
      TALENT_CACHE_KEYS.PROFILE_PICTURES(cacheKey),
      pictureMap,
      TALENT_CACHE_TTL.PROFILE_PICTURES
    );
  }

  // Get cached profile pictures
  static async getCachedProfilePictures(
    userIds: string[]
  ): Promise<Record<string, string> | null> {
    const cacheKey = userIds.sort().join(',');
    return CacheService.get<Record<string, string>>(
      TALENT_CACHE_KEYS.PROFILE_PICTURES(cacheKey)
    );
  }

  // Invalidate talent-related caches
  static async invalidateTalentCaches(userId?: string): Promise<void> {
    if (userId) {
      // Invalidate specific user caches
      await CacheService.del(TALENT_CACHE_KEYS.PROFILE(userId));
    }
    
    // Invalidate general caches that might be affected
    await CacheService.del(TALENT_CACHE_KEYS.POPULAR_SKILLS);
    
    // Note: Search result caches will expire naturally due to TTL
  }

  // Generate consistent cache key for search parameters
  private static generateSearchKey(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    return Buffer.from(JSON.stringify(sortedParams)).toString('base64');
  }

  // Generate consistent cache key for filters
  private static generateFilterKey(filters: Record<string, any>): string {
    return this.generateSearchKey(filters);
  }
}

// Health check for Redis connection
export async function checkRedisHealth(): Promise<boolean> {
  if (!redis) {
    console.warn('Redis not available during build time');
    return false;
  }
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}