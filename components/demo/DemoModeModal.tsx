'use client'

/**
 * DemoModeModal
 *
 * Modal that shows the AmperTalent demo role cards + credentials flow.
 * Can be mounted anywhere (landing page, sign-in, sign-up, etc.).
 *
 * Flow:
 *   1. User selects a role → /api/demo/create → account created → credentials dialog opens
 *   2. User enters dashboard → redirect (demo ends)
 *   3. If credentials dialog is dismissed, user returns to role selection inside this modal
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { DemoRoleSelector, type DemoAccountPayload } from './DemoRoleSelector'
import { DemoCredentialsDialog } from './DemoCredentialsDialog'
import { Sparkles, X } from 'lucide-react'

interface DemoModeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DemoModeModal({ open, onOpenChange }: DemoModeModalProps) {
  const [account, setAccount] = useState<DemoAccountPayload | null>(null)
  const [showCredentials, setShowCredentials] = useState(false)
  const [roleBusy, setRoleBusy] = useState(false)
  const prevOpenRef = useRef(open)

  // Reset state whenever the modal opens
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setAccount(null)
      setShowCredentials(false)
      setRoleBusy(false)
    }
    prevOpenRef.current = open
  }, [open])

  const handleAccountCreated = useCallback((acc: DemoAccountPayload) => {
    setAccount(acc)
    setShowCredentials(true)
  }, [])

  return (
    <>
      {/* ---------- Main modal: role selector or "account created" banner ---------- */}
      <Dialog open={open && !showCredentials} onOpenChange={(v) => {
        if (!v) {
          // Closing: if we have an account, show credentials instead
          if (account) {
            setShowCredentials(true)
          } else {
            onOpenChange(false)
          }
        } else {
          onOpenChange(true)
        }
      }}>
        <DialogContent
          className="w-[95vw] max-w-2xl"
          hideCloseButton
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              if (account) {
                setShowCredentials(true)
              } else {
                onOpenChange(false)
              }
            }}
            className="absolute right-4 top-4 p-1 rounded-md hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <DialogTitle className="text-lg font-semibold text-amber-900">
              Try AmperTalent — Demo Mode
            </DialogTitle>
          </div>

          {/* Role selector */}
          <DemoRoleSelector onAccountCreated={handleAccountCreated} />
        </DialogContent>
      </Dialog>

      {/* ---------- Credentials dialog (separate Dialog layer — stacks via Portal) ---------- */}
      {account && (
        <DemoCredentialsDialog
          open={showCredentials}
          account={account}
          onOpenChange={(v) => {
            setShowCredentials(v)
            if (!v) {
              // Returning to role selection — keep outer modal open
              onOpenChange(true)
            }
          }}
        />
      )}
    </>
  )
}
