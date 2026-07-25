'use client'

/**
 * PersistentDemoBanner
 *
 * Sticky top-of-page banner that:
 *  - shows whenever `isDemoActive()` returns true (i.e. a `ampertalent_demo`
 *    marker is in localStorage and not expired)
 *  - displays the demo account's role, email, and a "Copy credentials" button
 *  - has an "Exit demo" button that:
 *      1. POSTs /api/demo/exit to delete the DB + Clerk user
 *      2. signs the visitor out of Clerk
 *      3. clears the localStorage marker
 *      4. redirects to /sign-in
 *
 * Mounted in both the root layout and the auth layout so the banner survives
 * navigation across any page. Mirrors aims-commerce's
 * `PersistentDemoAccountDialog` (polls localStorage every 1s for the marker).
 */

import { useEffect, useState, useCallback } from 'react'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Sparkles, X, Copy, Check, LogOut } from 'lucide-react'
import {
  readDemoAccount,
  clearDemoAccount,
  getDemoDisplayName,
  getDemoRoleColorClasses,
  type DemoAccountInfo,
} from '@/lib/demo-mode'

const POLL_INTERVAL_MS = 1500

export function PersistentDemoBanner() {
  const [info, setInfo] = useState<DemoAccountInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [exiting, setExiting] = useState(false)
  const { signOut } = useClerk()
  const router = useRouter()

  // Poll localStorage so a demo account created in another tab/component
  // shows up here without needing a custom event bus.
  useEffect(() => {
    setInfo(readDemoAccount())
    const id = setInterval(() => setInfo(readDemoAccount()), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const handleCopy = useCallback(async () => {
    if (!info) return
    try {
      await navigator.clipboard.writeText(
        `Email: ${info.email}\nPassword: ${info.password}`,
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }, [info])

  const handleExit = useCallback(async () => {
    if (!info || exiting) return
    setExiting(true)
    try {
      // 1. Clean up DB + Clerk user
      await fetch('/api/demo/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: (info as any).profileId ?? '' }),
      }).catch(() => {
        // non-fatal — the localStorage clear still logs them out of the demo
      })
      // 2. Clear the local marker
      clearDemoAccount()
      // 3. Sign out of Clerk
      try {
        await signOut({ redirectUrl: '/sign-in' })
      } catch {
        window.location.href = '/sign-in'
      }
    } catch (err) {
      console.error('Demo exit failed:', err)
      setExiting(false)
    }
  }, [info, exiting, signOut, router])

  if (!info) return null

  return (
    <div
      data-testid="persistent-demo-banner"
      data-role={info.role}
      className={`sticky top-0 z-50 border-b ${getDemoRoleColorClasses(info.role)}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-3 text-sm">
        <Sparkles className="h-4 w-4 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold">Demo {getDemoDisplayName(info.role)} active</span>
          <span className="hidden sm:inline">
            {' '}
            · <code className="font-mono text-xs">{info.email}</code>
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded hover:bg-white/40 transition-colors"
          aria-label="Copy demo credentials"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy credentials'}
        </button>
        <button
          type="button"
          onClick={handleExit}
          disabled={exiting}
          data-testid="exit-demo"
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-white/60 hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          {exiting ? 'Exiting…' : 'Exit demo'}
        </button>
      </div>
    </div>
  )
}
