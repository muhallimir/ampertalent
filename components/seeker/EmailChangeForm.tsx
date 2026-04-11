'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, AlertCircle, CheckCircle } from 'lucide-react'

interface EmailChangeFormProps {
  currentEmail: string
  onEmailChange?: (newEmail: string) => Promise<void> // Keep for backward compatibility but not used
}

export function EmailChangeForm({ currentEmail }: EmailChangeFormProps) {
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isReloading, setIsReloading] = useState(false)
  const [reloadCountdown, setReloadCountdown] = useState(0)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    // Validation
    if (!newEmail || !confirmEmail) {
      setMessage({ type: 'error', text: 'Please fill in all fields' })
      return
    }

    if (!validateEmail(newEmail)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    if (newEmail !== confirmEmail) {
      setMessage({ type: 'error', text: 'Email addresses do not match' })
      return
    }

    if (newEmail === currentEmail) {
      setMessage({ type: 'error', text: 'New email must be different from current email' })
      return
    }

    setIsLoading(true)

    try {
      console.log('Attempting to change email from', currentEmail, 'to', newEmail)

      // Check for impersonation context only on client side
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (typeof window !== 'undefined') {
        // This would be for admin impersonation, but email changes should be done by the user themselves
        // So we'll skip impersonation headers for now
      }

      // Call backend API to change email using Clerk backend SDK
      console.log('Calling backend email change API...')
      const response = await fetch('/api/seeker/account/email-change', {
        method: 'POST',
        headers,
        body: JSON.stringify({ newEmail })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to change email')
      }

      const result = await response.json()
      console.log('Backend email change result:', result)

      // Success - the email has been changed and is now primary
      setMessage({
        type: 'success',
        text: 'Email address updated successfully! You can now sign in with your new email address.'
      })
      setNewEmail('')
      setConfirmEmail('')

      // Start countdown and reload
      setIsReloading(true)
      setReloadCountdown(3)

      const countdownInterval = setInterval(() => {
        setReloadCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            window.location.reload()
            return 0
          }
          return prev - 1
        })
      }, 1000)

    } catch (error: any) {
      console.error('Email change error:', error)

      // Handle specific errors
      if (error?.message?.includes('email already exists')) {
        setMessage({ type: 'error', text: 'This email address is already in use by another account' })
      } else if (error?.message?.includes('rate limit')) {
        setMessage({ type: 'error', text: 'Too many email change attempts. Please wait before trying again.' })
      } else if (error?.message?.includes('Reverification required')) {
        setMessage({
          type: 'error',
          text: 'For security reasons, you need to re-authenticate. Please sign out and sign back in before changing your email address.'
        })
      } else {
        // Try to get more detailed error message
        const errorMessage = error instanceof Error ? error.message : 'Failed to change email. Please try again.';
        const detailedMessage = typeof error === 'object' && error !== null && 'message' in error
          ? (error as any).message
          : errorMessage;
        setMessage({ type: 'error', text: detailedMessage || 'Failed to change email. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <span>Change Email Address</span>
        </CardTitle>
        <CardDescription>
          Update your email address. You&apos;ll need to verify the new email before the change takes effect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Email Display */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Current Email</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md border">
              <span className="text-gray-900">{currentEmail}</span>
            </div>
          </div>

          {/* Email Change Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="newEmail">New Email Address</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmEmail">Confirm New Email Address</Label>
              <Input
                id="confirmEmail"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="Confirm new email address"
                disabled={isLoading}
                required
              />
            </div>

            {/* Message Display */}
            {message && (
              <div className={`flex items-center space-x-2 p-3 rounded-md ${message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            {/* Page Reload Notice */}
            {isReloading && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-center space-x-2 text-blue-800">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium">
                    Refreshing page to update your email address... ({reloadCountdown}s)
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Your email has been successfully updated. The page will reload automatically to reflect the changes.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !newEmail || !confirmEmail}
              className="w-full"
            >
              {isLoading ? 'Sending Request...' : 'Change Email Address'}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}