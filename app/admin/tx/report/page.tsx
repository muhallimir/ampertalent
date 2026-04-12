'use client'

import { useState } from 'react'
import { DateRangePickerPopup } from '@/components/ui/date-range-picker-popup'
import type { NormalizedTransaction, TransactionReportResponse } from './types'

// ── Helpers ────────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  refunded: 'bg-purple-100 text-purple-800 border-purple-300',
  declined: 'bg-red-100 text-red-800 border-red-300',
  settledSuccessfully: 'bg-green-100 text-green-800 border-green-300',
  voided: 'bg-gray-100 text-gray-800 border-gray-300',
  S: 'bg-green-100 text-green-800 border-green-300',
  D: 'bg-red-100 text-red-800 border-red-300',
  P: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  V: 'bg-gray-100 text-gray-800 border-gray-300',
}

const gatewayStyle: Record<string, { label: string; color: string }> = {
  authorize_net: { label: 'AuthNet', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  paypal: { label: 'PayPal', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  unknown: { label: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-300' },
}

const Badge = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
    {children}
  </span>
)

const formatDate = (d: string | null | undefined) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return d }
}

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ── Main Page ──────────────────────────────────────────────────────
export default function TransactionReportPage() {
  // Date range: default last 30 days
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d
  })
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date())

  const [source, setSource] = useState<'database' | 'api'>('database')
  const [gatewayFilter, setGatewayFilter] = useState<'all' | 'authorize_net' | 'paypal'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [data, setData] = useState<TransactionReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 50

  const handleFetch = async () => {
    if (!startDate || !endDate) return

    setLoading(true)
    setError(null)
    setData(null)
    setPage(1)

    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        source,
      })

      const res = await fetch(`/api/admin/tx/report?${params.toString()}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || `HTTP ${res.status}`)
      } else {
        setData(json)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!startDate || !endDate) return
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    })
    window.open(`/api/admin/tx/report/export?${params.toString()}`, '_blank')
  }

  // Apply filters
  const filteredTransactions = data?.transactions.filter((tx) => {
    if (gatewayFilter !== 'all' && tx.gateway !== gatewayFilter) return false
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false
    return true
  }) || []

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / pageSize)
  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * pageSize,
    page * pageSize
  )

  // Unique statuses for filter
  const uniqueStatuses = data
    ? [...new Set(data.transactions.map((tx) => tx.status))].sort()
    : []

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Transaction Report</h1>
          <Badge color="bg-amber-100 text-amber-700 border-amber-300">INTERNAL</Badge>
        </div>
        <p className="text-sm text-gray-500">
          View and export payment transactions from Authorize.net and PayPal
        </p>
      </div>

      {/* Controls */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date Range</label>
            <DateRangePickerPopup
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onApply={() => {}}
              placeholder="Select date range"
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as 'database' | 'api')}
              className="px-3 py-2 h-9 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400"
            >
              <option value="database">Database</option>
              <option value="api">Live APIs</option>
            </select>
          </div>

          {/* Gateway Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Gateway</label>
            <select
              value={gatewayFilter}
              onChange={(e) => { setGatewayFilter(e.target.value as any); setPage(1) }}
              className="px-3 py-2 h-9 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400"
            >
              <option value="all">All Gateways</option>
              <option value="authorize_net">Authorize.net</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 h-9 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400"
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Fetch button */}
          <button
            onClick={handleFetch}
            disabled={loading || !startDate || !endDate}
            className="px-5 py-2 h-9 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-300 disabled:text-gray-500 text-white font-medium rounded-lg transition text-sm shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {source === 'api' ? 'Fetching APIs...' : 'Loading...'}
              </span>
            ) : 'Fetch Report'}
          </button>

          {/* Export CSV */}
          {data && (
            <button
              onClick={handleExport}
              className="px-4 py-2 h-9 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition text-sm shadow-sm"
            >
              Export CSV
            </button>
          )}
        </div>

        {source === 'api' && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Live API mode fetches directly from Authorize.net and PayPal. This may take longer and does not include user info from the database.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.summary.totalCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.summary.totalAmount)}</p>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">AuthNet</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {data.summary.byGateway.authorize_net.count}
              <span className="text-sm font-normal text-gray-500 ml-2">
                {formatCurrency(data.summary.byGateway.authorize_net.amount)}
              </span>
            </p>
          </div>
          <div className="bg-white border border-indigo-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">PayPal</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {data.summary.byGateway.paypal.count}
              <span className="text-sm font-normal text-gray-500 ml-2">
                {formatCurrency(data.summary.byGateway.paypal.amount)}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Transaction Table */}
      {data && filteredTransactions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* Table Header Info */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <span className="text-sm text-gray-600">
              Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, filteredTransactions.length)} of{' '}
              <strong>{filteredTransactions.length}</strong> transactions
              {filteredTransactions.length !== data.transactions.length && (
                <span className="text-gray-400"> (filtered from {data.transactions.length})</span>
              )}
            </span>
            <span className="text-xs text-gray-400">
              Source: {data.source} | Fetched: {formatDate(data.fetchedAt)}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Transaction ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Gateway</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedTransactions.map((tx) => {
                  const gw = gatewayStyle[tx.gateway] || gatewayStyle.unknown
                  return (
                    <tr
                      key={`${tx.id}-${tx.gateway}`}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => window.open(`/admin/tx?q=${encodeURIComponent(tx.gatewayTransactionId)}`, '_blank')}
                      title="Click to inspect in Transaction Inspector"
                    >
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          {tx.gatewayTransactionId.length > 20
                            ? `${tx.gatewayTransactionId.substring(0, 20)}...`
                            : tx.gatewayTransactionId}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={gw.color}>{gw.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={statusColor[tx.status]}>{tx.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {tx.userName || tx.userEmail ? (
                          <div>
                            {tx.userName && <p className="text-gray-900 text-sm">{tx.userName}</p>}
                            {tx.userEmail && <p className="text-gray-400 text-xs">{tx.userEmail}</p>}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {tx.planId || <span className="text-gray-300 italic">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-white transition"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-white transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state after fetch */}
      {data && filteredTransactions.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg shadow-sm">
          <p className="text-gray-400 text-lg">No transactions found</p>
          <p className="text-gray-500 text-sm mt-2">
            {data.transactions.length > 0
              ? 'Try adjusting your filters'
              : `No transactions between ${startDate?.toLocaleDateString()} and ${endDate?.toLocaleDateString()}`}
          </p>
        </div>
      )}

      {/* Initial empty state */}
      {!data && !error && !loading && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-lg font-semibold text-gray-500 mb-2">Transaction Report</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Select a date range and click <strong>Fetch Report</strong> to view transactions from Authorize.net and PayPal.
            Use <strong>Database</strong> mode for fast results or <strong>Live APIs</strong> for real-time gateway data.
          </p>
        </div>
      )}
    </div>
  )
}
