'use client'

/**
 * DemoModeEntry
 *
 * Convenience wrapper that bundles `DemoRoleSelector` + `DemoCredentialsDialog`
 * so consumers (sign-in page, marketing landing) only have to render one
 * component. State is owned here.
 */

import { useState } from 'react'
import { DemoRoleSelector, type DemoAccountPayload } from './DemoRoleSelector'
import { DemoCredentialsDialog } from './DemoCredentialsDialog'

export function DemoModeEntry() {
  const [account, setAccount] = useState<DemoAccountPayload | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <DemoRoleSelector
        onAccountCreated={(acc) => {
          setAccount(acc)
          setDialogOpen(true)
        }}
      />
      <DemoCredentialsDialog
        open={dialogOpen}
        account={account}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
