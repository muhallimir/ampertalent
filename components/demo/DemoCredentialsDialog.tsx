'use client'

/**
 * DemoCredentialsDialog
 *
 * Modal that shows the freshly-created demo credentials (name, email, password)
 * the visitor can copy. Also seeds sample data on the server (so employer demo
 * accounts land on a dashboard with 3 jobs and seeker demo accounts land on a
 * dashboard with applications) before redirecting to the right after-onboarding
 * route:
 *   - seeker/employer → /onboarding (full flow, no skipping)
 *   - admin/super_admin → /admin/dashboard (onboarding skipped)
 *
 * Mirrors aims-commerce's `PersistentDemoAccountDialog` (show creds + Enter),
 * adapted to the four-role flow.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Copy, Check, ArrowRight, X, Sparkles, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { writeDemoAccount, type DemoRole, getDemoDisplayName, getDemoRouteAfterOnboarding } from '@/lib/demo-mode'
import type { DemoAccountPayload } from './DemoRoleSelector'

interface DemoCredentialsDialogProps {
  open: boolean
  account: DemoAccountPayload | null
  onOpenChange: (open: boolean) => void
}

export function DemoCredentialsDialog({ open, account, onOpenChange }: DemoCredentialsDialogProps) {
  const router = useRouter()
  const [copied, setCopied] = useState<'name' | 'email' | 'password' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCopy = async (text: string, field: 'name' | 'email' | 'password') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // ignore — older browsers
    }
  }

  const handleEnter = async () => {
    if (!account) return
    setSubmitting(true)
    setError(null)
    try {
      // 1. Persist the demo account marker (used by PersistentDemoBanner + the
      //    middleware exemption check + auto-cleanup on expiry)
      const createdAt = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      writeDemoAccount({
        name: account.name,
        email: account.email,
        password: account.password,
        role: account.role,
        createdAt,
        expiresAt,
      })

      // 2. Store the pending demo role in localStorage so the onboarding
      //    page can pre-select it when the visitor lands on /onboarding
      //    (for seeker/employer — admin/super_admin skip onboarding).
      if (account.role === 'seeker' || account.role === 'employer') {
        try {
          localStorage.setItem('ampertalent_demo_role', account.role)
        } catch {
          // ignore
        }
      }

      // 3. Try to auto sign the user in via the sign-in token. We use the
      //    Clerk Client SDK's `signIn.create({ strategy: 'ticket' })` which
      //    is the proper way to consume a one-time sign-in token — it
      //    doesn't go through Clerk's catchall redirect, it just sets the
      //    session in-place.
      const dest = getDemoRouteAfterOnboarding(account.role)
      const tokenResult = await fetchSignInToken(account.profileId)
      if (tokenResult?.token) {
        const clerk = (window as any).Clerk
        if (clerk?.client?.signIn) {
          try {
            const ticketSignIn = await clerk.client.signIn.create({
              strategy: 'ticket',
              ticket: tokenResult.token,
            })
            if (
              ticketSignIn?.status === 'complete' &&
              ticketSignIn.createdSessionId
            ) {
              await clerk.setActive({ session: ticketSignIn.createdSessionId })
              // For admin / super_admin we need to bypass the
              // "always-go-to-onboarding" middleware rule with the
              // `admin_token` query param. For seeker/employer we route to
              // /onboarding (no skip) so the visitor walks the full flow.
              if (account.role === 'admin' || account.role === 'super_admin') {
                const params = new URLSearchParams({ admin_token: account.name })
                window.location.href = `/admin/dashboard?${params.toString()}`
              } else {
                window.location.href = '/onboarding'
              }
              return
            }
            if (ticketSignIn?.status === 'needs_first_factor') {
              // Try to complete the first factor automatically (dev mode)
              const firstFactor = ticketSignIn.supportedFirstFactors?.find(
                (f: any) => f.strategy === 'email_code',
              )
              if (firstFactor) {
                await clerk.client.signIn.prepareFirstFactor({
                  strategy: 'email_code',
                  emailAddressId: firstFactor.emailAddressId,
                })
                // We can't read the code from outside Clerk, so fall through
                // to the manual sign-in path
              }
            }
          } catch (ticketErr: any) {
            console.warn('Ticket sign-in failed (falling back):', ticketErr?.errors?.[0]?.message)
          }
        }
      }

      // 4. Manual sign-in fallback: navigate to /sign-in with the email
      //    pre-filled (we can NOT pass the password in the URL, so the user
      //    has to type it — but the persistent demo banner keeps the creds
      //    visible so they can copy them).
      if (account.role === 'admin' || account.role === 'super_admin') {
        try {
          localStorage.setItem('ampertalent_demo_token', account.name)
        } catch {
          // ignore
        }
      }
      const params = new URLSearchParams({
        demo_email: account.email,
        demo_role: account.role,
      })
      window.location.href = `/sign-in?${params.toString()}`
    } catch (err: any) {
      console.error('Demo enter failed:', err)
      setError(err?.message || 'Could not start the demo session')
      setSubmitting(false)
    }
  }

  /**
   * Re-fetch the sign-in token for a freshly-created demo account. The token
   * is generated server-side during /api/demo/create and we currently don't
   * pass it through to the client (to keep the credentials dialog light),
   * so we re-request it via a tiny endpoint.
   */
  const fetchSignInToken = async (profileId: string): Promise<{ token: string } | null> => {
    try {
      const res = await fetch('/api/demo/signin-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data?.token ? { token: data.token } : null
    } catch {
      return null
    }
  }

  if (!account) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-xl sm:max-w-2xl" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Your demo account is ready
          </DialogTitle>
          <DialogDescription>
            We created a real <strong>{getDemoDisplayName(account.role)}</strong> account. Save these
            credentials to log back in later. Click <strong>Enter dashboard</strong> to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <CredentialField
            label="Name"
            value={account.name}
            field="name"
            copied={copied}
            onCopy={handleCopy}
          />
          <CredentialField
            label="Email"
            value={account.email}
            field="email"
            copied={copied}
            onCopy={handleCopy}
          />
          <CredentialField
            label="Password"
            value={account.password}
            field="password"
            copied={copied}
            onCopy={handleCopy}
          />
        </div>

        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
          <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            {(account.role === 'seeker' || account.role === 'employer') ? (
              <>
                <strong>Full onboarding:</strong> you&apos;ll go through every step (basic info →
                details → package) so you can see the whole experience. No flow is skipped.
              </>
            ) : (
              <>
                <strong>Admin access:</strong> you&apos;ll land directly on the admin dashboard.
                Onboarding is skipped because there&apos;s no admin onboarding form.
              </>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-gray-500"
          >
            <X className="mr-1 h-3.5 w-3.5" /> Close
          </Button>
          <Button
            type="button"
            onClick={handleEnter}
            disabled={submitting}
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
            data-testid="demo-enter-dashboard"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Starting…
              </>
            ) : (
              <>
                Enter dashboard <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CredentialField({
  label,
  value,
  field,
  copied,
  onCopy,
}: {
  label: string
  value: string
  field: 'name' | 'email' | 'password'
  copied: 'name' | 'email' | 'password' | null
  onCopy: (text: string, field: 'name' | 'email' | 'password') => void
}) {
  const isCopied = copied === field
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2 min-w-0">
        <code
          className="flex-1 min-w-0 text-sm font-mono text-gray-900 break-all"
          data-testid={`demo-credential-${field}`}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={() => onCopy(value, field)}
          className="flex-shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
          aria-label={`Copy ${label}`}
        >
          {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
