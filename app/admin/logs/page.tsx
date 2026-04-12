'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SkipForward,
  Activity,
  Filter,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Timer,
  Zap,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionLog {
  id: string
  executionId: string | null
  actionType: string
  entityType: string | null
  entityId: string | null
  status: string
  message: string | null
  details: string | null
  createdAt: string
}

interface ExecutionLog {
  id: string
  taskName: string
  status: string
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  summary: string | null
  logOutput: string | null
  triggeredBy: string | null
  createdAt: string
  actions: ActionLog[]
}

interface ApiResponse {
  executions: ExecutionLog[]
  total: number
  page: number
  limit: number
  totalPages: number
  taskNames: string[]
  stats: Record<string, number>
  revenue?: {
    total: number
    successfulPayments: number
    canceledByUser: number
    totalProcessed: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TASK_LABELS: Record<string, string> = {
  job_expiration: 'Job Expiration',
  membership_reminders: 'Membership Reminders',
  recurring_billing: 'Recurring Billing',
  employer_recurring_billing: 'Employer Billing',
  cleanup: 'Data Cleanup',
}

function formatTaskName(name: string): string {
  return TASK_LABELS[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function getExecutionStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-800 border border-green-200 font-medium">Completed</Badge>
    case 'completed_with_errors':
      return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200 font-medium">With Errors</Badge>
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 border border-red-200 font-medium">Failed</Badge>
    case 'running':
      return <Badge className="bg-blue-100 text-blue-800 border border-blue-200 font-medium animate-pulse">Running</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getActionStatusIcon(status: string, actionType?: string) {
  // Check for canceled by user actions
  if (actionType && (
    actionType === 'seeker_trial_canceled' || 
    actionType === 'seeker_subscription_canceled' ||
    actionType === 'employer_trial_canceled' ||
    actionType === 'employer_subscription_canceled'
  )) {
    return <XCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
  }
  
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
    case 'skipped':
      return <SkipForward className="h-3.5 w-3.5 text-gray-400 shrink-0" />
    default:
      return <Activity className="h-3.5 w-3.5 text-gray-400 shrink-0" />
  }
}

function getActionStatusBadge(status: string, actionType?: string) {
  // Check for canceled by user actions
  if (actionType && (
    actionType === 'seeker_trial_canceled' || 
    actionType === 'seeker_subscription_canceled' ||
    actionType === 'employer_trial_canceled' ||
    actionType === 'employer_subscription_canceled'
  )) {
    return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs py-0">canceled by user</Badge>
  }
  
  switch (status) {
    case 'success':
      return <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs py-0">success</Badge>
    case 'failed':
      return <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs py-0">failed</Badge>
    case 'skipped':
      return <Badge className="bg-gray-50 text-gray-600 border border-gray-200 text-xs py-0">skipped</Badge>
    default:
      return <Badge variant="outline" className="text-xs py-0">{status}</Badge>
  }
}

function getExecutionStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'completed_with_errors':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'running':
      return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
    default:
      return <Activity className="h-4 w-4 text-gray-400" />
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ExecutionRowSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="h-4 w-4 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-4 w-4 shrink-0" />
      </div>
    </div>
  )
}

function ExecutionListSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ExecutionRowSkeleton key={i} />
      ))}
    </div>
  )
}

// ─── Summary Stats Card ───────────────────────────────────────────────────────

const BILLING_TASKS = new Set(['seeker-recurring-billing', 'employer-recurring-billing'])

function StatsCards({
  stats,
  total,
  revenue,
  taskName,
}: {
  stats: Record<string, number>
  total: number
  revenue?: { total: number; successfulPayments: number; canceledByUser: number; totalProcessed: number }
  taskName: string
}) {
  const isBillingTask = BILLING_TASKS.has(taskName) || taskName === 'all'
  const showRevenue = isBillingTask && !!revenue

  const executionCards = [
    {
      label: 'Total Executions',
      value: total,
      icon: <Zap className="h-5 w-5 text-brand-teal" />,
      color: 'border-brand-teal/30 bg-brand-teal/5',
    },
    {
      label: 'Completed',
      value: stats['completed'] ?? 0,
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      color: 'border-green-200 bg-green-50',
    },
    {
      label: 'With Errors',
      value: stats['completed_with_errors'] ?? 0,
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      color: 'border-yellow-200 bg-yellow-50',
    },
    {
      label: 'Failed',
      value: stats['failed'] ?? 0,
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      color: 'border-red-200 bg-red-50',
    },
  ]

  const revenueCards = showRevenue
    ? [
        {
          label: 'Total Revenue',
          value: `$${revenue!.total.toFixed(2)}`,
          icon: <span className="text-2xl">💰</span>,
          color: 'border-emerald-300 bg-emerald-50',
          isRevenue: true,
        },
        {
          label: 'Members Processed',
          value: revenue!.totalProcessed,
          icon: <Activity className="h-5 w-5 text-brand-teal" />,
          color: 'border-brand-teal/30 bg-brand-teal/5',
        },
        {
          label: 'Successful Payments',
          value: revenue!.successfulPayments,
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
          color: 'border-emerald-200 bg-emerald-50',
        },
        {
          label: 'Canceled by User',
          value: revenue!.canceledByUser,
          icon: <XCircle className="h-5 w-5 text-blue-500" />,
          color: 'border-blue-200 bg-blue-50',
        },
      ]
    : []

  return (
    <div className="space-y-4">
      {/* Cron Execution Stats */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          Cron Executions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {executionCards.map((c) => (
            <div key={c.label} className={`border rounded-lg p-4 flex items-center gap-3 ${c.color}`}>
              {c.icon}
              <div>
                <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Billing Revenue Stats */}
      {showRevenue && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <span>💵</span>
            Billing Revenue
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {revenueCards.map((c) => (
              <div key={c.label} className={`border rounded-lg p-4 flex items-center gap-3 ${c.color}`}>
                {c.icon}
                <div>
                  <p
                    className={`${c.isRevenue ? 'text-3xl text-emerald-700' : 'text-2xl text-gray-900'} font-bold`}
                  >
                    {c.value}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{c.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Action Log Row ───────────────────────────────────────────────────────────

function ActionRow({ action }: { action: ActionLog }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = !!action.details

  return (
    <div className="border border-gray-100 rounded-md bg-white">
      <div
        className={`flex items-start gap-3 px-3 py-2 ${hasDetails ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={() => hasDetails && setExpanded((p) => !p)}
      >
        <div className="mt-0.5">{getActionStatusIcon(action.status, action.actionType)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-semibold text-gray-700">{action.actionType}</span>
            {action.entityType && (
              <span className="text-xs text-gray-400">
                {action.entityType}
                {action.entityId && <span className="font-mono"> #{action.entityId.slice(0, 8)}</span>}
              </span>
            )}
            {getActionStatusBadge(action.status, action.actionType)}
            <span className="text-xs text-gray-400 ml-auto">{formatTime(action.createdAt)}</span>
          </div>
          {action.message && (
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{action.message}</p>
          )}
        </div>
        {hasDetails && (
          <div className="shrink-0 mt-0.5 text-gray-400">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </div>
        )}
      </div>
      {expanded && action.details && (
        <div className="px-3 pb-3">
          <pre className="text-xs bg-gray-950 text-gray-100 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed font-mono">
            {action.details}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Execution Row ────────────────────────────────────────────────────────────

function ExecutionRow({ execution, defaultExpanded = false }: { execution: ExecutionLog; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const successCount = execution.actions.filter((a) => a.status === 'success').length
  const failedCount = execution.actions.filter((a) => a.status === 'failed').length
  const skippedCount = execution.actions.filter((a) => a.status === 'skipped').length

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="shrink-0">{getExecutionStatusIcon(execution.status)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">
              {formatTaskName(execution.taskName)}
            </span>
            {getExecutionStatusBadge(execution.status)}
            <Badge variant="outline" className="text-xs">
              {execution.triggeredBy === 'manual' ? '🖐 Manual' : '⏰ Cron'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              {formatDateTime(execution.startedAt)}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Timer className="h-3 w-3" />
              {formatDuration(execution.durationMs)}
            </span>
            {execution.actions.length > 0 && (
              <span className="flex items-center gap-2 text-xs">
                {successCount > 0 && <span className="text-green-600">✓ {successCount}</span>}
                {failedCount > 0 && <span className="text-red-600">✗ {failedCount}</span>}
                {skippedCount > 0 && <span className="text-gray-400">↷ {skippedCount}</span>}
              </span>
            )}
          </div>
          {execution.summary && (
            <p className="text-xs text-gray-500 mt-1 truncate">{execution.summary}</p>
          )}
        </div>

        <div className="shrink-0 text-gray-400">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
          {/* Meta info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
            <div>
              <span className="font-medium text-gray-500 uppercase tracking-wide text-[10px]">Task</span>
              <p className="font-mono mt-0.5">{execution.taskName}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500 uppercase tracking-wide text-[10px]">Started</span>
              <p className="mt-0.5">{formatDateTime(execution.startedAt)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500 uppercase tracking-wide text-[10px]">Completed</span>
              <p className="mt-0.5">{execution.completedAt ? formatDateTime(execution.completedAt) : '—'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500 uppercase tracking-wide text-[10px]">Duration</span>
              <p className="mt-0.5">{formatDuration(execution.durationMs)}</p>
            </div>
          </div>

          {/* Summary */}
          {execution.summary && (
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Summary</p>
              <p className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-3 py-2">
                {execution.summary}
              </p>
            </div>
          )}

          {/* Log output */}
          {execution.logOutput && (
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Log Output</p>
              <pre className="text-xs bg-gray-950 text-gray-100 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed font-mono max-h-60">
                {execution.logOutput}
              </pre>
            </div>
          )}

          {/* Action logs */}
          {execution.actions.length > 0 ? (
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">
                Actions ({execution.actions.length})
              </p>
              <div className="space-y-1.5">
                {execution.actions.map((action) => (
                  <ActionRow key={action.id} action={action} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No action logs recorded for this execution.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CronLogsPage() {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const [date, setDate] = useState(today)
  const [taskName, setTaskName] = useState<string>('all')
  const [emailFilter, setEmailFilter] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const buildParams = useCallback(
    (overridePage?: number) => {
      const hasEmailFilter = emailFilter.trim().length > 0
      return new URLSearchParams({
        page: String(overridePage ?? (hasEmailFilter ? 1 : page)),
        limit: hasEmailFilter ? '9999' : '15',
        ...(date ? { date } : {}),
        // When email filter is active, fetch all tasks for the day and filter client-side
        ...(!hasEmailFilter && taskName && taskName !== 'all' ? { taskName } : {}),
      })
    },
    [date, taskName, page, emailFilter]
  )

  useEffect(() => {
    setPage(1)
  }, [date, taskName, emailFilter])

  // Main fetch effect — runs whenever filters change
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setData(null)

    const doFetch = async () => {
      try {
        const res = await fetch(`/api/admin/cron-logs?${buildParams()}`)
        if (res.ok && !cancelled) {
          const json: ApiResponse = await res.json()
          setData(json)
        }
      } catch (err) {
        if (!cancelled) console.error('Error fetching cron logs:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    doFetch()
    return () => { cancelled = true }
  }, [buildParams])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch(`/api/admin/cron-logs?${buildParams()}`)
      if (res.ok) {
        const json: ApiResponse = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Error fetching cron logs:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [buildParams])

  const filteredExecutions = useMemo(() => {
    if (!data) return []
    const email = emailFilter.trim().toLowerCase()
    if (!email) return data.executions
    return data.executions
      .filter((ex) => taskName === 'all' || ex.taskName === taskName)
      .map((ex) => ({
        ...ex,
        actions: ex.actions.filter(
          (a) =>
            a.details?.toLowerCase().includes(email) ||
            a.message?.toLowerCase().includes(email)
        ),
      }))
      .filter((ex) => ex.actions.length > 0)
  }, [data, emailFilter, taskName])

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-brand-teal" />
            Cron Job Logs
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Consulte execuções e detalhes dos cron jobs por dia e tarefa
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-sm"
                max={today}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
              <Input
                type="email"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                placeholder="Filter by email..."
                className="h-9 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cron Job</label>
              <Select value={taskName} onValueChange={setTaskName}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All jobs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All jobs</SelectItem>
                  {(data?.taskNames ?? []).map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTaskName(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:self-end">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full sm:w-auto text-sm"
                onClick={() => {
                  setDate(today)
                  setTaskName('all')
                  setEmailFilter('')
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {data && !isLoading && (
        <StatsCards stats={data.stats} total={data.total} revenue={data.revenue} taskName={taskName} />
      )}

      {/* Executions list */}
      <div className="space-y-3">
        {isLoading ? (
          <ExecutionListSkeletons />
        ) : !data || filteredExecutions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No executions found</p>
            <p className="text-sm mt-1">Try changing the date or cron job filter</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-700">{filteredExecutions.length}</span> of{' '}
                <span className="font-medium text-gray-700">{data.total}</span> executions
                {date && (
                  <span>
                    {' '}on{' '}
                    <span className="font-medium text-gray-700">
                      {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </span>
                )}
              </p>
            </div>

            {filteredExecutions.map((ex) => (
              <ExecutionRow key={ex.id} execution={ex} defaultExpanded={!!emailFilter.trim()} />
            ))}

            {/* Pagination */}
            {!emailFilter.trim() && data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Page <span className="font-medium">{page}</span> of{' '}
                  <span className="font-medium">{data.totalPages}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.totalPages}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}