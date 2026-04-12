'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────
interface LookupResult {
  query: string
  timestamp: string
  database: any | null
  authnet: any | null
  paypal: any | null
  relatedSubscriptions: any[]
  relatedInvoices: any[]
  paymentMethods: any[]
  adminActions: any[]
  retryEligible: boolean
  retryInfo: any | null
  authnetCandidates: any[] | null
  error?: string
}

// ── Helpers ────────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  refunded: 'bg-purple-100 text-purple-800 border-purple-300',
  declined: 'bg-red-100 text-red-800 border-red-300',
  settledSuccessfully: 'bg-green-100 text-green-800 border-green-300',
  voided: 'bg-gray-100 text-gray-800 border-gray-300',
}

const Badge = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
    {children}
  </span>
)

const Section = ({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left font-semibold text-sm text-gray-700 transition"
      >
        {title}
        <span className="text-gray-400">{open ? '▼' : '▶'}</span>
      </button>
      {open && <div className="p-4 bg-white">{children}</div>}
    </div>
  )
}

const KV = ({ label, value, mono }: { label: string; value: any; mono?: boolean }) => (
  <div className="flex justify-between items-start py-1.5 border-b border-gray-100 last:border-0">
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide min-w-[140px]">{label}</span>
    <span className={`text-sm text-right ${mono ? 'font-mono' : ''} text-gray-900 break-all max-w-[60%]`}>
      {value === null || value === undefined ? <span className="text-gray-300 italic">null</span> : String(value)}
    </span>
  </div>
)

const formatDate = (d: string | null | undefined) => {
  if (!d) return null
  try {
    return new Date(d).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return d }
}

// ── Main Page ──────────────────────────────────────────────────────
export default function TransactionLookupPage() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') || '')
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [retryResult, setRetryResult] = useState<any>(null)

  useEffect(() => {
    const initial = searchParams.get('q')
    if (initial) handleSearch(initial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = async (overrideQ?: string) => {
    const q = (overrideQ ?? query).trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setResult(null)
    setRetryResult(null)

    try {
      const res = await fetch(`/api/admin/transaction-lookup?q=${encodeURIComponent(q)}`)
      const data = await res.json()

      if (!res.ok && !data.database && !data.authnet) {
        setError(data.error || `HTTP ${res.status}`)
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async () => {
    if (!result?.retryInfo) return

    setRetrying(true)
    setRetryResult(null)

    try {
      const res = await fetch('/api/admin/retry-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: result.retryInfo.paymentId,
        }),
      })
      const data = await res.json()
      setRetryResult({ ok: res.ok, ...data })

      // Refresh the lookup after retry
      if (res.ok) {
        setTimeout(() => handleSearch(), 1500)
      }
    } catch (err) {
      setRetryResult({ ok: false, error: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setRetrying(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">🔍 Transaction Inspector</h1>
        </div>
        <p className="text-sm text-gray-500">
          Look up any transaction by AuthNet Transaction ID, Payment ID, or GHL Transaction ID
        </p>
      </div>

      <div className="space-y-6">
        {/* Search */}
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter transaction ID, payment ID, or AuthNet ID..."
            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 shadow-sm"
            autoFocus
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-300 disabled:text-gray-500 text-white font-medium rounded-lg transition text-sm shadow-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching...
              </span>
            ) : 'Lookup'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Quick Summary Bar */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              <span className="text-xs text-gray-500">Query:</span>
              <code className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-sm font-mono">{result.query}</code>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-500">DB:</span>
              {result.database ? (
                <Badge color={statusColor[result.database.status] || undefined}>
                  {result.database.status}
                </Badge>
              ) : (
                <span className="text-gray-400 text-xs">not found</span>
              )}
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-500">AuthNet:</span>
              {result.authnet && !result.authnet.error ? (
                <Badge color={statusColor[result.authnet.transactionStatus] || undefined}>
                  {result.authnet.transactionStatus}
                </Badge>
              ) : (
                <span className="text-gray-400 text-xs">{result.authnet?.error || 'not queried'}</span>
              )}
              {result.database && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-900 font-bold text-sm">
                    ${result.database.amount?.toFixed(2)}
                  </span>
                </>
              )}
            </div>

            {/* Retry Banner */}
            {result.retryEligible && result.retryInfo && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-800 font-semibold text-sm">⚡ Retry Eligible</p>
                    <p className="text-amber-700/70 text-xs mt-1">
                      This payment can be retried using card{' '}
                      <span className="font-mono">••••{result.retryInfo.suggestedPaymentMethodLast4}</span>{' '}
                      ({result.retryInfo.suggestedPaymentMethodBrand}) for ${result.retryInfo.amount.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition"
                  >
                    {retrying ? 'Retrying...' : 'Retry Payment'}
                  </button>
                </div>
                {retryResult && (
                  <div className={`mt-3 p-3 rounded text-sm ${retryResult.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {retryResult.ok ? (
                      <p>✅ Payment retried successfully! New Transaction ID: <code className="font-mono bg-green-100 px-1 rounded">{retryResult.transactionId}</code></p>
                    ) : (
                      <p>❌ Retry failed: {retryResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Database Record */}
            {result.database && (
              <Section title="📦 Database Record (external_payments)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Payment Details</h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                      <KV label="Payment ID" value={result.database.id} mono />
                      <KV label="Status" value={result.database.status} />
                      <KV label="Amount" value={`$${result.database.amount?.toFixed(2)}`} />
                      <KV label="Plan ID" value={result.database.planId} mono />
                      <KV label="AuthNet Tx ID" value={result.database.authnetTransactionId} mono />
                      <KV label="GHL Tx ID" value={result.database.ghlTransactionId} mono />
                      <KV label="AuthNet Customer" value={result.database.authnetCustomerId} mono />
                      <KV label="Webhook At" value={formatDate(result.database.webhookProcessedAt)} />
                      <KV label="Created" value={formatDate(result.database.createdAt)} />
                      <KV label="Updated" value={formatDate(result.database.updatedAt)} />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">User</h4>
                    {result.database.user ? (
                      <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                        <KV label="User ID" value={result.database.user.id} mono />
                        <KV label="Name" value={result.database.user.name || `${result.database.user.firstName || ''} ${result.database.user.lastName || ''}`.trim()} />
                        <KV label="Email" value={result.database.user.email} />
                        <KV label="Role" value={result.database.user.role} />
                        <KV label="Type" value={result.database.user.isEmployer ? 'Employer' : result.database.user.isSeeker ? 'Seeker' : 'Unknown'} />
                        {result.database.user.employerInfo && (
                          <>
                            <KV label="Company" value={result.database.user.employerInfo.companyName} />
                            <KV label="Package ID" value={result.database.user.employerInfo.currentPackageId} mono />
                          </>
                        )}
                        {result.database.user.seekerInfo && (
                          <KV label="Membership" value={result.database.user.seekerInfo.membershipPlan} />
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm italic">No user linked</p>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {/* Authorize.net Record */}
            {result.authnet && !result.authnet.error && (
              <Section title="🏦 Authorize.net Transaction Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Transaction</h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                      <KV label="Trans ID" value={result.authnet.transId} mono />
                      <KV label="Status" value={result.authnet.transactionStatus} />
                      <KV label="Type" value={result.authnet.transactionType} />
                      <KV label="Response Code" value={result.authnet.responseCode} />
                      <KV label="Reason Code" value={result.authnet.responseReasonCode} />
                      <KV label="Reason" value={result.authnet.responseReasonDescription} />
                      <KV label="Auth Code" value={result.authnet.authCode} />
                      <KV label="AVS" value={result.authnet.AVSResponse} />
                      <KV label="CVV" value={result.authnet.cardCodeResponse} />
                      <KV label="Submit Time" value={formatDate(result.authnet.submitTimeUTC)} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Amounts</h4>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                        <KV label="Requested" value={result.authnet.requestedAmount ? `$${result.authnet.requestedAmount}` : null} />
                        <KV label="Authorized" value={result.authnet.authAmount ? `$${result.authnet.authAmount}` : null} />
                        <KV label="Settled" value={result.authnet.settleAmount ? `$${result.authnet.settleAmount}` : null} />
                      </div>
                    </div>
                    {result.authnet.payment && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Payment Method</h4>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                          {result.authnet.payment.creditCard && (
                            <>
                              <KV label="Card Number" value={result.authnet.payment.creditCard.cardNumber} mono />
                              <KV label="Card Type" value={result.authnet.payment.creditCard.cardType} />
                              <KV label="Expiry" value={result.authnet.payment.creditCard.expirationDate} />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {result.authnet.order && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Order</h4>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                          <KV label="Invoice" value={result.authnet.order.invoiceNumber} mono />
                          <KV label="Description" value={result.authnet.order.description} />
                        </div>
                      </div>
                    )}
                    {result.authnet.billTo && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Bill To</h4>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                          <KV label="Name" value={`${result.authnet.billTo.firstName || ''} ${result.authnet.billTo.lastName || ''}`.trim()} />
                          {result.authnet.billTo.address && <KV label="Address" value={result.authnet.billTo.address} />}
                          {result.authnet.billTo.city && <KV label="City" value={result.authnet.billTo.city} />}
                          {result.authnet.billTo.state && <KV label="State" value={result.authnet.billTo.state} />}
                          {result.authnet.billTo.zip && <KV label="ZIP" value={result.authnet.billTo.zip} />}
                        </div>
                      </div>
                    )}
                    {result.authnet.customer && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Customer</h4>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                          <KV label="Email" value={result.authnet.customer.email} />
                          {result.authnet.customer.id && <KV label="ID" value={result.authnet.customer.id} mono />}
                        </div>
                      </div>
                    )}
                    {result.authnet.batch && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Batch</h4>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                          <KV label="Batch ID" value={result.authnet.batch.batchId} mono />
                          <KV label="Settlement" value={result.authnet.batch.settlementState} />
                          <KV label="Time" value={formatDate(result.authnet.batch.settlementTimeUTC)} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {/* AuthNet error */}
            {result.authnet?.error && (
              <Section title="🏦 Authorize.net" defaultOpen={false}>
                <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                  <strong>Could not fetch from AuthNet:</strong> {result.authnet.error}
                  {result.authnet.queriedId && (
                    <span className="ml-2 font-mono text-xs">({result.authnet.queriedId})</span>
                  )}
                </div>
              </Section>
            )}

            {/* PayPal Details */}
            {result.paypal && !result.paypal.error && (
              <Section title="🅿️ PayPal Sale Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Transaction</h4>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                      <KV label="Sale ID" value={result.paypal.id} mono />
                      <KV label="State" value={result.paypal.state} />
                      <KV label="Payment Mode" value={result.paypal.payment_mode} />
                      <KV label="Protection" value={result.paypal.protection_eligibility} />
                      <KV label="Create Time" value={formatDate(result.paypal.create_time)} />
                      <KV label="Update Time" value={formatDate(result.paypal.update_time)} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    {result.paypal.amount && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Amounts</h4>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                          <KV label="Total" value={result.paypal.amount.total ? `$${result.paypal.amount.total}` : null} />
                          <KV label="Currency" value={result.paypal.amount.currency} />
                          {result.paypal.amount.details && (
                            <>
                              <KV label="Subtotal" value={result.paypal.amount.details.subtotal ? `$${result.paypal.amount.details.subtotal}` : null} />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {result.paypal.transaction_fee && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Fee</h4>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
                          <KV label="Transaction Fee" value={`$${result.paypal.transaction_fee.value}`} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {/* PayPal error */}
            {result.paypal?.error && (
              <Section title="🅿️ PayPal" defaultOpen={false}>
                <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                  <strong>Could not fetch from PayPal:</strong> {result.paypal.error}
                  {result.paypal.queriedId && (
                    <span className="ml-2 font-mono text-xs">({result.paypal.queriedId})</span>
                  )}
                </div>
              </Section>
            )}

            {/* AuthNet Candidates (amount+date search) */}
            {result.authnetCandidates && result.authnetCandidates.length > 0 && (
              <Section title={`🔎 AuthNet Candidates — matched by amount+date (${result.authnetCandidates.length})`}>
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                  <strong>No transaction ID found in the database.</strong> These are AuthNet transactions matching the same amount and date window. Verify manually and update the DB record with the correct ID.
                </div>
                <div className="space-y-2">
                  {result.authnetCandidates.map((tx: any) => (
                    <div key={tx.transId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center gap-3">
                        <a
                          href={`/admin/tx?q=${encodeURIComponent(tx.transId)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded underline-offset-2 hover:underline transition-colors text-xs"
                        >
                          {tx.transId}
                        </a>
                        <span className="text-gray-900 font-semibold">${tx.settleAmount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color={statusColor[tx.transactionStatus] || undefined}>{tx.transactionStatus}</Badge>
                        <span className="text-xs text-gray-400">{formatDate(tx.submitTimeUTC)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Payment Methods */}
            {result.paymentMethods.length > 0 && (
              <Section title={`💳 User Payment Methods (${result.paymentMethods.length})`} defaultOpen={false}>
                <div className="space-y-2">
                  {result.paymentMethods.map((pm: any) => (
                    <div key={pm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-gray-400">{pm.id.substring(0, 16)}...</span>
                        <span className="font-semibold text-gray-900">
                          {pm.isPayPal ? '🅿️ PayPal' : `${pm.brand || 'Card'} ••••${pm.last4 || '????'}`}
                        </span>
                        {pm.expiryMonth && pm.expiryYear && (
                          <span className="text-gray-400 text-xs">{pm.expiryMonth}/{pm.expiryYear}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {pm.isDefault && <Badge color="bg-blue-100 text-blue-800 border-blue-300">Default</Badge>}
                        {pm.hasValidProfile ? (
                          <Badge color="bg-green-100 text-green-800 border-green-300">Active</Badge>
                        ) : (
                          <Badge color="bg-red-100 text-red-800 border-red-300">No Profile</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Related Subscriptions */}
            {result.relatedSubscriptions.length > 0 && (
              <Section title={`📋 Related Subscriptions (${result.relatedSubscriptions.length})`} defaultOpen={false}>
                <div className="space-y-3">
                  {result.database?.user && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900">
                        {result.database.user.name || `${result.database.user.firstName || ''} ${result.database.user.lastName || ''}`.trim() || '—'}
                      </p>
                      <p className="text-xs text-blue-700">{result.database.user.email}</p>
                    </div>
                  )}
                  {result.relatedSubscriptions.map((sub: any) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <span className="font-mono text-xs text-gray-400 mr-2">{sub.id.substring(0, 16)}...</span>
                        <span className="font-semibold text-gray-900">{sub.plan}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color={statusColor[sub.status] || undefined}>{sub.status}</Badge>
                        <span className="text-xs text-gray-400">{formatDate(sub.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Related Invoices */}
            {result.relatedInvoices.length > 0 && (
              <Section title={`🧾 Related Invoices (${result.relatedInvoices.length})`} defaultOpen={false}>
                <div className="space-y-2">
                  {result.relatedInvoices.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <span className="font-mono text-xs text-gray-400 mr-2">{inv.id.substring(0, 16)}...</span>
                        <span className="text-gray-900">{inv.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">${(inv.amountDue / 100).toFixed(2)}</span>
                        <Badge color={statusColor[inv.status] || undefined}>{inv.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Admin Action Logs */}
            {result.adminActions.length > 0 && (
              <Section title={`📝 Admin Action Logs (${result.adminActions.length})`} defaultOpen={false}>
                <div className="space-y-2">
                  {result.adminActions.map((action: any) => (
                    <div key={action.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Badge>{action.actionType}</Badge>
                        <span className="text-xs text-gray-400">{formatDate(action.createdAt)}</span>
                      </div>
                      {action.details && (
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto text-gray-600">
                          {JSON.stringify(action.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Raw JSON */}
            <Section title="🔧 Raw JSON Response" defaultOpen={false}>
              <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto font-mono">
                {JSON.stringify(result, null, 2)}
              </pre>
            </Section>

            {/* No results at all */}
            {!result.database && !result.authnet && result.error && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No records found</p>
                <p className="text-gray-500 text-sm mt-2">{result.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !error && !loading && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔎</div>
            <h2 className="text-lg font-semibold text-gray-500 mb-2">Transaction Inspector</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Enter an AuthNet Transaction ID (e.g. <code className="text-amber-600 bg-amber-50 px-1 rounded">81472534994</code>),
              a Payment ID from the database, or a GHL Transaction ID to see everything about it.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
