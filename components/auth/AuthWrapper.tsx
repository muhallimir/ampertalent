'use client'

import { ReactNode } from 'react'
import { ClerkProvider } from '@clerk/nextjs'

interface AuthWrapperProps {
  children: ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  )
}