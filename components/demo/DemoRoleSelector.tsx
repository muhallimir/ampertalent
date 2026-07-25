'use client'

/**
 * DemoRoleSelector
 *
 * The "Try demo" entry point on the sign-in / sign-up pages. Renders four
 * role cards (seeker / employer / admin / super_admin) and, on click, calls
 * `/api/demo/create` to provision a real Clerk user + DB profile. Once the
 * server returns, the parent `DemoCredentialsDialog` shows the credentials
 * and the user is signed in to the new account.
 *
 * Behaviour mirrors aims-commerce's `DemoBanner` (auto-creates an account,
 * shows credentials) but adds explicit role selection so a visitor can
 * experience the app from any of the four roles.
 */

import { useState } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import {
  Users,
  Building2,
  Shield,
  ShieldCheck,
  Sparkles,
  Loader2,
  Info,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { isDemoRole, type DemoRole } from '@/lib/demo-mode'
import { getDemoDisplayName } from '@/lib/demo-mode'

export interface DemoAccountPayload {
  profileId: string
  clerkUserId: string
  role: DemoRole
  name: string
  email: string
  password: string
}

interface DemoRoleSelectorProps {
  onAccountCreated: (account: DemoAccountPayload) => void
}

interface RoleCard {
  role: DemoRole
  title: string
  description: string
  bullets: string[]
  icon: React.ComponentType<{ className?: string }>
  classes: string
  iconClasses: string
}

const ROLE_CARDS: RoleCard[] = [
  {
    role: 'seeker',
    title: "I'm Looking for Work",
    description: 'Apply to demo jobs, see the seeker dashboard, and explore the full job-seeker flow.',
    bullets: ['Sample applications on the dashboard', 'Profile & resume flow', 'Job search & filters'],
    icon: Users,
    classes: 'border-teal-200 hover:border-teal-400 hover:bg-teal-50/50',
    iconClasses: 'bg-teal-100 text-teal-600',
  },
  {
    role: 'employer',
    title: "I'm Hiring",
    description: 'Post demo jobs, review applicants, and run the full employer flow end-to-end.',
    bullets: ['3 sample job posts on the dashboard', 'Application inbox & shortlist', 'Company profile & billing'],
    icon: Building2,
    classes: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50',
    iconClasses: 'bg-blue-100 text-blue-600',
  },
  {
    role: 'admin',
    title: 'Try as Admin',
    description: 'Step into the admin dashboard and use the operational tools.',
    bullets: ['Admin dashboard & analytics', 'User & content management', 'Operational queues'],
    icon: Shield,
    classes: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50/50',
    iconClasses: 'bg-violet-100 text-violet-600',
  },
  {
    role: 'super_admin',
    title: 'Try as Super Admin',
    description: 'Full super-admin access including billing, plans, and platform settings.',
    bullets: ['Everything an admin can do', 'Billing & subscription plans', 'Platform-wide settings'],
    icon: ShieldCheck,
    classes: 'border-rose-200 hover:border-rose-400 hover:bg-rose-50/50',
    iconClasses: 'bg-rose-100 text-rose-600',
  },
]

export function DemoRoleSelector({ onAccountCreated }: DemoRoleSelectorProps) {
  const [busyRole, setBusyRole] = useState<DemoRole | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn()
  const router = useRouter()

  const handlePickRole = async (role: DemoRole) => {
    if (busyRole) return
    setBusyRole(role)
    setError(null)
    try {
      // 1. Create the demo user on the server (Clerk + DB)
      const res = await fetch('/api/demo/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to create demo account')
      }
      if (!isDemoRole(data.role)) {
        throw new Error('Server returned an invalid role')
      }

      // 2. Hand the credentials to the parent so it can show the dialog
      onAccountCreated({
        profileId: data.profileId,
        clerkUserId: data.clerkUserId,
        role: data.role,
        name: data.name,
        email: data.email,
        password: data.password,
      })

      // 3. Sign the new user in with Clerk so they're authenticated immediately
      if (signInLoaded && signIn) {
        try {
          const signInAttempt = await signIn.create({
            identifier: data.email,
            password: data.password,
          })
          if (signInAttempt.status === 'complete' && signInAttempt.createdSessionId) {
            await setActive({ session: signInAttempt.createdSessionId })
          } else if (signInAttempt.status === 'needs_first_factor') {
            // Email not pre-verified — fall through to manual flow
            console.warn('Demo account needs first-factor verification')
          }
        } catch (signInErr: any) {
          const msg = signInErr?.errors?.[0]?.message || signInErr?.message
          console.warn('Auto sign-in failed (will fall back to manual):', msg)
        }
      }
    } catch (err: any) {
      console.error('Demo create failed:', err)
      setError(err?.message || 'Something went wrong creating the demo account.')
      setBusyRole(null)
    }
  }

  return (
    <div
      data-testid="demo-role-selector"
      className="mt-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-amber-600" />
        <h3 className="text-base font-semibold text-amber-900">Try AmperTalent — Demo Mode</h3>
      </div>
      <p className="text-xs text-amber-800/80 mb-4 flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <span>
          No sign-up needed. Pick a role and we&apos;ll spin up a real account in seconds. Seeker and employer
          demos run the full onboarding so you can experience every step. Admin roles skip onboarding.
        </span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="demo-role-grid">
        {ROLE_CARDS.map((card) => {
          const Icon = card.icon
          const isBusy = busyRole === card.role
          const isAnyBusy = busyRole !== null
          return (
            <Card
              key={card.role}
              data-testid={`demo-role-card-${card.role}`}
              data-role={card.role}
              className={`border bg-white shadow-none transition-all ${card.classes} ${
                isAnyBusy && !isBusy ? 'opacity-60' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${card.iconClasses}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 leading-tight">{card.title}</h4>
                    <p className="text-xs text-gray-600 mt-0.5">{card.description}</p>
                  </div>
                </div>
                <ul className="text-[11px] text-gray-600 space-y-0.5 mb-3">
                  {card.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8"
                  disabled={isAnyBusy}
                  onClick={() => handlePickRole(card.role)}
                  data-testid={`demo-cta-${card.role}`}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>Try as {getDemoDisplayName(card.role)}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
        >
          {error}
        </p>
      )}
    </div>
  )
}
