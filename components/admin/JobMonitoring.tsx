'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Pause, 
  Play, 
  RefreshCw, 
  Server,
  TrendingUp,
  XCircle
} from 'lucide-react'

interface JobStats {
  totalJobs: number
  successfulJobs: number
  failedJobs: number
  successRate: number
  averageDuration: number
  jobsByType: Record<string, {
    started: number
    completed: number
    failed: number
    successRate: number
  }>
  recentFailures: Array<{
    jobType: string
    jobId: string
    error: string
    timestamp: string
  }>
}

interface QueueHealth {
  healthy: boolean
  queues: Record<string, {
    active: number
    waiting: number
    completed: number
    failed: number
    delayed: number
    paused: boolean
  }>
  issues: string[]
}

interface PerformanceMetrics {
  redis: {
    connected: boolean
    memory: string
    keyCount: number
  }
  queues: {
    totalJobs: number
    activeJobs: number
    completedJobs: number
    failedJobs: number
  }
  cron: {
    dailyExecutions: number
    hourlyExecutions: number
    lastDailyRun: string | null
    lastHourlyRun: string | null
  }
}

export default function JobMonitoring() {
  const [jobStats, setJobStats] = useState<JobStats | null>(null)
  const [queueHealth, setQueueHealth] = useState<QueueHealth | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsRes, healthRes, metricsRes] = await Promise.all([
        fetch('/api/admin/jobs/stats'),
        fetch('/api/admin/jobs/health'),
        fetch('/api/admin/jobs/metrics')
      ])

      if (!statsRes.ok || !healthRes.ok || !metricsRes.ok) {
        throw new Error('Failed to fetch job monitoring data')
      }

      const [stats, health, metrics] = await Promise.all([
        statsRes.json(),
        healthRes.json(),
        metricsRes.json()
      ])

      setJobStats(stats)
      setQueueHealth(health)
      setPerformanceMetrics(metrics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleQueueAction = async (action: 'pause' | 'resume' | 'cleanup') => {
    try {
      setActionLoading(action)
      
      const response = await fetch(`/api/admin/jobs/${action}`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} queues`)
      }

      const result = await response.json()
      
      // Refresh data after action
      await fetchData()
      
      // Show success message (you could add a toast notification here)
      console.log(`Queue ${action} successful:`, result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} queues`)
    } finally {
      setActionLoading(null)
    }
  }

  const triggerManualTask = async (taskType: 'daily' | 'hourly') => {
    try {
      setActionLoading(`manual-${taskType}`)
      
      const response = await fetch(`/api/cron/${taskType}-tasks`, {
        method: 'POST',
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || ''
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to trigger ${taskType} tasks`)
      }

      const result = await response.json()
      
      // Refresh data after manual trigger
      await fetchData()
      
      console.log(`Manual ${taskType} tasks successful:`, result)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to trigger ${taskType} tasks`)
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !jobStats) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading job monitoring data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor background jobs, queues, and system performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queues">Queue Health</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Job Statistics Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jobStats?.totalJobs || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Last 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {jobStats?.successRate.toFixed(1) || 0}%
                </div>
                <Progress 
                  value={jobStats?.successRate || 0} 
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jobStats?.failedJobs || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {jobStats?.totalJobs ? 
                    `${((jobStats.failedJobs / jobStats.totalJobs) * 100).toFixed(1)}% of total` 
                    : '0% of total'
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Queue Health</CardTitle>
                {queueHealth?.healthy ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {queueHealth?.healthy ? 'Healthy' : 'Issues'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {queueHealth?.issues.length || 0} issues detected
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Jobs by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Jobs by Type</CardTitle>
              <CardDescription>
                Performance breakdown by job type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobStats?.jobsByType && Object.entries(jobStats.jobsByType).map(([type, stats]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {stats.started} started, {stats.completed} completed, {stats.failed} failed
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={stats.successRate} className="w-20" />
                      <span className="text-sm font-medium w-12">
                        {stats.successRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queues" className="space-y-4">
          {/* Queue Health Status */}
          {queueHealth?.issues && queueHealth.issues.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {queueHealth.issues.map((issue, index) => (
                    <div key={index}>{issue}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Individual Queue Status */}
          <div className="grid gap-4 md:grid-cols-2">
            {queueHealth?.queues && Object.entries(queueHealth.queues).map(([queueName, stats]) => (
              <Card key={queueName}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {queueName}
                    <Badge variant={stats.paused ? "destructive" : "default"}>
                      {stats.paused ? "Paused" : "Active"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Active:</span>
                      <span className="ml-2 font-medium">{stats.active}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Waiting:</span>
                      <span className="ml-2 font-medium">{stats.waiting}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="ml-2 font-medium">{stats.completed}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Failed:</span>
                      <span className="ml-2 font-medium">{stats.failed}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* System Performance Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  Redis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant={performanceMetrics?.redis.connected ? "default" : "destructive"}>
                      {performanceMetrics?.redis.connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Memory:</span>
                    <span className="text-sm font-medium">{performanceMetrics?.redis.memory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Keys:</span>
                    <span className="text-sm font-medium">{performanceMetrics?.redis.keyCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-4 w-4 mr-2" />
                  Queues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Jobs:</span>
                    <span className="text-sm font-medium">{performanceMetrics?.queues.totalJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active:</span>
                    <span className="text-sm font-medium">{performanceMetrics?.queues.activeJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Completed:</span>
                    <span className="text-sm font-medium">{performanceMetrics?.queues.completedJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Failed:</span>
                    <span className="text-sm font-medium">{performanceMetrics?.queues.failedJobs}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Cron Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Daily Runs:</span>
                    <span className="text-sm font-medium">{performanceMetrics?.cron.dailyExecutions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Hourly Runs:</span>
                    <span className="text-sm font-medium">{performanceMetrics?.cron.hourlyExecutions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          {/* Queue Management Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Queue Management</CardTitle>
              <CardDescription>
                Control queue operations and trigger manual tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Queue Controls</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQueueAction('pause')}
                      disabled={actionLoading === 'pause'}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQueueAction('resume')}
                      disabled={actionLoading === 'resume'}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Resume All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQueueAction('cleanup')}
                      disabled={actionLoading === 'cleanup'}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Cleanup
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Manual Tasks</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerManualTask('daily')}
                      disabled={actionLoading === 'manual-daily'}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Run Daily Tasks
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerManualTask('hourly')}
                      disabled={actionLoading === 'manual-hourly'}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Run Hourly Tasks
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}