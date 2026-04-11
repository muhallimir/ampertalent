'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertCircle, CheckCircle, Key } from 'lucide-react'

interface PasswordResetSectionProps {
  userEmail: string
  onPasswordReset: () => Promise<void>
}

export function PasswordResetSection({ userEmail, onPasswordReset }: PasswordResetSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handlePasswordReset = async () => {
    setMessage(null)
    setIsLoading(true)

    try {
      console.log('Initiating password reset for email:', userEmail)
      await onPasswordReset()
      setMessage({ 
        type: 'success', 
        text: 'Password reset email sent. Please check your inbox for instructions.' 
      })
    } catch (error) {
      console.error('Password reset error:', error)
      setMessage({ 
        type: 'error', 
        text: 'Failed to send password reset email. Please try again.' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Key className="h-5 w-5" />
          <span>Password & Security</span>
        </CardTitle>
        <CardDescription>
          Manage your password and account security settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Password Reset Section */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Reset Password</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Send a password reset link to your email address: <strong>{userEmail}</strong>
                </p>
                
                {/* Message Display */}
                {message && (
                  <div className={`flex items-center space-x-2 p-3 rounded-md mt-3 ${
                    message.type === 'success' 
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

                <Button 
                  onClick={handlePasswordReset}
                  disabled={isLoading}
                  variant="outline"
                  className="mt-3"
                >
                  {isLoading ? 'Sending Reset Email...' : 'Send Password Reset Email'}
                </Button>
              </div>
            </div>
          </div>

          {/* Security Tips */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-blue-900 mb-2">Security Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use a strong, unique password for your account</li>
              <li>• Enable two-factor authentication when available</li>
              <li>• Never share your password with others</li>
              <li>• Log out from shared or public computers</li>
            </ul>
          </div>

          {/* Last Password Change */}
          <div className="text-sm text-gray-600">
            <p>For security reasons, we recommend changing your password regularly.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}