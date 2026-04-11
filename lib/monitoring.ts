import React from 'react'
import { CacheService } from './redis'

// Performance monitoring utilities for talent page optimization
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()

  // Track API response times
  static async trackApiCall<T>(
    operation: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await apiCall()
      const duration = performance.now() - startTime
      
      await this.recordMetric(`api.${operation}.duration`, duration)
      await this.recordMetric(`api.${operation}.success`, 1)
      
      // Log slow queries (>1000ms)
      if (duration > 1000) {
        console.warn(`Slow API call detected: ${operation} took ${duration.toFixed(2)}ms`)
        await this.recordMetric(`api.${operation}.slow`, 1)
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      await this.recordMetric(`api.${operation}.duration`, duration)
      await this.recordMetric(`api.${operation}.error`, 1)
      throw error
    }
  }

  // Track database query performance
  static async trackDbQuery<T>(
    queryName: string,
    query: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await query()
      const duration = performance.now() - startTime
      
      await this.recordMetric(`db.${queryName}.duration`, duration)
      await this.recordMetric(`db.${queryName}.success`, 1)
      
      // Log slow queries (>500ms)
      if (duration > 500) {
        console.warn(`Slow DB query detected: ${queryName} took ${duration.toFixed(2)}ms`)
        await this.recordMetric(`db.${queryName}.slow`, 1)
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      await this.recordMetric(`db.${queryName}.duration`, duration)
      await this.recordMetric(`db.${queryName}.error`, 1)
      throw error
    }
  }

  // Track cache performance
  static async trackCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'error',
    cacheKey: string,
    duration?: number
  ): Promise<void> {
    await this.recordMetric(`cache.${operation}`, 1)
    
    if (duration !== undefined) {
      await this.recordMetric(`cache.${operation}.duration`, duration)
    }

    // Track cache hit rate
    if (operation === 'hit' || operation === 'miss') {
      const hitRate = await this.calculateCacheHitRate()
      await this.recordMetric('cache.hit_rate', hitRate)
    }
  }

  // Track frontend performance
  static trackFrontendMetric(metric: string, value: number): void {
    if (typeof window !== 'undefined') {
      // Store in local metrics for batching
      const key = `frontend.${metric}`
      if (!this.metrics.has(key)) {
        this.metrics.set(key, [])
      }
      this.metrics.get(key)!.push(value)

      // Batch send metrics every 30 seconds
      this.batchSendMetrics()
    }
  }

  // Record metric to Redis
  private static async recordMetric(metric: string, value: number): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0]
      const hour = new Date().getHours()
      
      // Store hourly metrics
      const hourlyKey = `metrics:${metric}:${date}:${hour}`
      await CacheService.incr(hourlyKey, 86400) // 24 hour TTL
      
      // Store daily aggregates
      const dailyKey = `metrics:${metric}:${date}`
      await CacheService.incr(dailyKey, 86400 * 7) // 7 day TTL
      
      // Store recent values for percentile calculations
      const recentKey = `metrics:recent:${metric}`
      const recentValues = await CacheService.get<number[]>(recentKey) || []
      recentValues.push(value)
      
      // Keep only last 100 values
      if (recentValues.length > 100) {
        recentValues.splice(0, recentValues.length - 100)
      }
      
      await CacheService.set(recentKey, recentValues, 3600) // 1 hour TTL
    } catch (error) {
      console.error('Error recording metric:', error)
    }
  }

  // Calculate cache hit rate
  private static async calculateCacheHitRate(): Promise<number> {
    try {
      const date = new Date().toISOString().split('T')[0]
      const hits = await CacheService.get<number>(`metrics:cache.hit:${date}`) || 0
      const misses = await CacheService.get<number>(`metrics:cache.miss:${date}`) || 0
      
      const total = hits + misses
      return total > 0 ? (hits / total) * 100 : 0
    } catch (error) {
      console.error('Error calculating cache hit rate:', error)
      return 0
    }
  }

  // Batch send frontend metrics
  private static batchSendMetrics = (() => {
    let timeout: NodeJS.Timeout | null = null
    
    return () => {
      if (timeout) return
      
      timeout = setTimeout(async () => {
        try {
          const metricsToSend = new Map(this.metrics)
          this.metrics.clear()
          
          for (const [metric, values] of metricsToSend) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length
            await this.recordMetric(metric, avg)
          }
        } catch (error) {
          console.error('Error sending batched metrics:', error)
        } finally {
          timeout = null
        }
      }, 30000) // 30 seconds
    }
  })()

  // Get performance summary
  static async getPerformanceSummary(date?: string): Promise<{
    api: Record<string, any>
    db: Record<string, any>
    cache: Record<string, any>
    frontend: Record<string, any>
  }> {
    const targetDate = date || new Date().toISOString().split('T')[0]
    
    try {
      const [apiMetrics, dbMetrics, cacheMetrics, frontendMetrics] = await Promise.all([
        this.getMetricsByPrefix(`api`, targetDate),
        this.getMetricsByPrefix(`db`, targetDate),
        this.getMetricsByPrefix(`cache`, targetDate),
        this.getMetricsByPrefix(`frontend`, targetDate)
      ])

      return {
        api: apiMetrics,
        db: dbMetrics,
        cache: cacheMetrics,
        frontend: frontendMetrics
      }
    } catch (error) {
      console.error('Error getting performance summary:', error)
      return { api: {}, db: {}, cache: {}, frontend: {} }
    }
  }

  // Get metrics by prefix
  private static async getMetricsByPrefix(
    prefix: string,
    date: string
  ): Promise<Record<string, any>> {
    // This would need to be implemented based on your Redis setup
    // For now, return empty object
    return {}
  }

  // Alert on performance issues
  static async checkPerformanceAlerts(): Promise<void> {
    try {
      const summary = await this.getPerformanceSummary()
      
      // Check for high error rates
      const errorRate = this.calculateErrorRate(summary.api)
      if (errorRate > 5) { // 5% error rate threshold
        console.error(`High API error rate detected: ${errorRate.toFixed(2)}%`)
        // Send alert (implement your alerting mechanism)
      }
      
      // Check cache hit rate
      const hitRate = await this.calculateCacheHitRate()
      if (hitRate < 80) { // 80% hit rate threshold
        console.warn(`Low cache hit rate detected: ${hitRate.toFixed(2)}%`)
      }
      
      // Check for slow queries
      // Implementation depends on your specific metrics structure
      
    } catch (error) {
      console.error('Error checking performance alerts:', error)
    }
  }

  // Calculate error rate from API metrics
  private static calculateErrorRate(apiMetrics: Record<string, any>): number {
    let totalRequests = 0
    let totalErrors = 0
    
    for (const [key, value] of Object.entries(apiMetrics)) {
      if (key.endsWith('.success')) {
        totalRequests += value as number
      } else if (key.endsWith('.error')) {
        totalErrors += value as number
        totalRequests += value as number
      }
    }
    
    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
  }
}

// Middleware for automatic API monitoring
export function withPerformanceMonitoring<T extends any[], R>(
  operationName: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    return PerformanceMonitor.trackApiCall(operationName, () => fn(...args))
  }
}

// React hook for frontend performance monitoring
export function usePerformanceMonitoring() {
  const trackMetric = (metric: string, value: number) => {
    PerformanceMonitor.trackFrontendMetric(metric, value)
  }

  const trackPageLoad = (pageName: string, loadTime: number) => {
    trackMetric(`page_load.${pageName}`, loadTime)
  }

  const trackUserInteraction = (action: string, duration: number) => {
    trackMetric(`user_interaction.${action}`, duration)
  }

  const trackSearchPerformance = (searchTerm: string, resultCount: number, duration: number) => {
    trackMetric('search.duration', duration)
    trackMetric('search.result_count', resultCount)
    trackMetric('search.queries', 1)
  }

  return {
    trackMetric,
    trackPageLoad,
    trackUserInteraction,
    trackSearchPerformance
  }
}

// Performance monitoring for React components
export function withComponentMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function MonitoredComponent(props: P) {
    const startTime = performance.now()
    
    React.useEffect(() => {
      const renderTime = performance.now() - startTime
      PerformanceMonitor.trackFrontendMetric(`component.${componentName}.render_time`, renderTime)
    }, [])

    return React.createElement(Component, props)
  }
}