'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSignUp } from '@clerk/nextjs'
import { Eye, EyeOff, AlertCircle, Mail, Building2, User, Shield } from 'lucide-react'
import { LoadingSpinner } from './common/LoadingSpinner'
import { Button } from '@/components/ui/button'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from "@/components/ui/input-otp"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { revokeClerkInvitation } from '@/lib/clerk-invitation-actions'

// Simplified styling that closely matches the regular Clerk SignUp component
const cardClasses = "bg-white rounded-md shadow-md border border-gray-200 py-8 px-6 w-[27rem] mx-auto"
const inputClasses = "block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm max-sm:text-xs"
const buttonClasses = "flex w-full justify-center rounded-md border border-transparent py-2 px-4 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
const primaryButtonClasses = `${buttonClasses} bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500`
const secondaryButtonClasses = `bg-transparent text-gray-700 hover:underline shadow-none font-medium`
const errorClasses = "rounded-md bg-red-50 p-4"
const labelClasses = "block text-xs font-medium text-gray-700 capitalize"
const formFieldClasses = "mb-4"
const formFieldLabelRowClasses = "flex justify-between items-center mb-1"
const footerClasses = "mt-6 text-center text-xs text-gray-500"
const tosClass = "text-xs border-b-[1px] border-b-[#2F3037] text-[#2F3037]"

interface InvitationData {
  success: boolean,
  invitationId: string,
  employerId?: string,
  email: string,
  role: string,
  employerName?: string,
  companyLogo?: string,
  invitedByName: string,
  fullName?: string,
  expiresAt: string,
  acceptedAt: string | null,
  message: string,
  type: 'team_member' | 'platform_user'
}

export default function UserInviteSignupForm({ invitationToken }: { invitationToken: string }) {
  const router = useRouter()
  const { isLoaded, signUp, setActive } = useSignUp()
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [signupStep, setSignupStep] = useState<'initial' | 'verifying' | 'code'>('initial')
  const [code, setCode] = useState('')
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [resending, setResending] = useState(false)
  const [captchaVerified, setCaptchaVerified] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [legalAccepted] = useState(true)

  // Get role icon based on role
  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'employer':
        return <Building2 className="h-4 w-4" />
      case 'admin':
        return <Shield className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  // Get role description
  const getRoleDescription = (role: string) => {
    switch (role.toLowerCase()) {
      case 'seeker':
        return 'Job Seeker'
      case 'employer':
        return 'Employer'
      case 'admin':
        return 'Administrator'
      default:
        return role
    }
  }

  useEffect(() => {
    const validateInvitationToken = async () => {
      try {
        // First try to validate as team member invitation
        let validationResp = await fetch('/api/team-invitation/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitationToken })
        })

        let validationData;
        if (validationResp.ok) {
          validationData = await validationResp.json()
          // Add type to identify as team member invitation
          validationData.type = 'team_member'
        } else {
          // If team member validation fails, try user invitation validation
          validationResp = await fetch('/api/user/invitation/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invitationToken })
          })

          if (!validationResp.ok) {
            const errorData = await validationResp.json()
            throw new Error(errorData.error || 'Invalid invitation')
          }

          validationData = await validationResp.json()
          // Add type to identify as platform user invitation
          validationData.type = 'platform_user'
        }

        setEmail(validationData.email)
        setInvitationData(validationData)
      } catch (err) {
        console.error('❌ Error handling authenticated user by token:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setValidationError(errorMessage)
        if (!errorMessage?.includes('already been accepted')) {
          setErrors([`Failed to complete invitation: ${errorMessage}`])
        }
      }
      setLoading(false)
    }
    validateInvitationToken()
  }, [invitationToken])

  // Initialize CAPTCHA
  useEffect(() => {
    if (isLoaded && (window as any).Clerk) {
      // Check if CAPTCHA is already initialized
      const captchaElement = document.getElementById('clerk-captcha');
      if (captchaElement && captchaElement.children.length === 0) {
        // Try to render CAPTCHA
        try {
          if (typeof (window as any).Clerk.renderCaptcha === 'function') {
            (window as any).Clerk.renderCaptcha({
              elementId: 'clerk-captcha',
              onVerified: (token: string) => {
                setCaptchaVerified(true);
                setCaptchaToken(token);
              },
              onExpired: () => {
                setCaptchaVerified(false);
                setCaptchaToken(null);
              },
              onError: (error: any) => {
                console.error('CAPTCHA error:', error);
                setErrors(['CAPTCHA verification failed. Please try again.']);
              }
            });
          }
        } catch (error) {
          console.warn('CAPTCHA initialization failed:', error);
        }
      }
    }
  }, [isLoaded]);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setLoading(true)

    if (!isLoaded || !email) {
      setErrors(['System not ready. Please try again.'])
      setLoading(false)
      return
    }

    if (!firstName || !lastName || !password) {
      setErrors(['All fields are required'])
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setErrors(['Password must be at least 8 characters'])
      setLoading(false)
      return
    }

    if (!legalAccepted) {
      setErrors(['You must agree to the Terms of Service and Privacy Policy'])
      setLoading(false)
      return
    }

    // Check if CAPTCHA is required but not verified
    const captchaElement = document.getElementById('clerk-captcha')
    if (captchaElement && captchaElement.children.length > 0 && !captchaVerified) {
      setErrors(['Please complete the CAPTCHA verification'])
      setLoading(false)
      return
    }

    try {
      console.log('🚀 Attempting initial signup with params:', {
        emailAddress: email,
        firstName,
        lastName
      })

      const signUpParams: any = {
        emailAddress: email,
        password,
        firstName,
        lastName,
        legal_accepted: legalAccepted,
      }

      // Add CAPTCHA token if available
      if (captchaToken) {
        signUpParams.captchaToken = captchaToken
      }

      const signUpAttempt = await signUp.create(signUpParams)

      console.log('✅ Initial signup attempt completed. Response:', signUpAttempt)

      if (signUpAttempt) {
        console.log('🔍 Status:', signUpAttempt.status)
        console.log('🔍 ID:', signUpAttempt.id)
        console.log('🔍 Missing fields:', signUpAttempt.missingFields || 'none')

        if ('verifications' in signUpAttempt) {
          console.log('🔍 Verifications:', signUpAttempt.verifications)
        }
      }

      if (signUpAttempt && signUpAttempt.status === 'complete') {
        console.log('🔐 Setting active session with ID:', signUpAttempt.createdSessionId)
        await setActive({ session: signUpAttempt.createdSessionId })

        // Revoke any pending Clerk invitations for this email after successful signup
        try {
          console.log(`🔄 Revoking pending Clerk invitations for ${email} after successful signup`);
          const revokeResult = await revokeClerkInvitation(email);
          if (revokeResult?.success) {
            console.log(`✅ Revoked ${revokeResult.count} pending Clerk invitations for ${email}`);
          } else {
            console.warn(`⚠️ Failed to revoke pending Clerk invitations for ${email}:`, revokeResult?.error);
          }
        } catch (revokeError) {
          console.warn(`⚠️ Error while revoking pending Clerk invitations for ${email}:`, revokeError);
        }

        // Redirect based on invitation type and role
        if (invitationData?.type === 'team_member') {
          console.log('✅ Session set. Redirecting to team accept page...')
          // Use window.location.href for API routes that return redirects
          // router.push doesn't handle server-side redirects properly
          window.location.href = `/api/team/accept/${invitationToken}`
          return
        } else if (invitationData?.role?.toLowerCase() === 'admin' || invitationData?.role?.toLowerCase() === 'super_admin') {
          // Admin users don't need onboarding - create profile and redirect to admin dashboard
          console.log('✅ Session set. Processing admin invitation to create profile...')
          try {
            const adminResponse = await fetch('/api/user/invitation/validate/admin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invitationId: invitationData.invitationId })
            })
            if (adminResponse.ok) {
              console.log('✅ Admin profile created. Redirecting to admin dashboard...')
            } else {
              console.warn('⚠️ Admin profile creation failed, but continuing to redirect...')
            }
          } catch (adminError) {
            console.warn('⚠️ Error creating admin profile:', adminError)
          }
          router.push('/admin/dashboard')
        } else {
          console.log('✅ Session set. Redirecting to appropriate page for platform user...')
          // For platform users (seeker/employer), redirect to onboarding
          router.push('/onboarding')
        }

      } else if (signUpAttempt && signUpAttempt.status === 'missing_requirements') {
        console.log('⚠️ Missing requirements detected. Preparing email verification...')

        try {
          const prepareVerification = await signUp.prepareEmailAddressVerification({
            strategy: 'email_code'
          })

          console.log('📧 Email verification prepared:', prepareVerification)
          setSignupStep('code')
        } catch (prepareError: any) {
          console.error('💥 Error preparing email verification:', prepareError)
          setErrors(['Failed to send verification email. Please try again.'])
        }

      } else if (signUpAttempt && signUpAttempt.status) {
        setErrors([`Signup requires additional steps. Current status: ${signUpAttempt.status}`])
      } else {
        setErrors(['Signup encountered an unexpected state. Please try again.'])
      }

    } catch (err: any) {
      console.error('💥 Initial signup error occurred:', err)

      let errorMessage = 'An unexpected error occurred during signup.'

      if (err) {
        if (err.message) {
          errorMessage = err.message
        } else if (err.errors && Array.isArray(err.errors)) {
          errorMessage = err.errors.map((e: any) =>
            e.message || e.longMessage || e.code || 'Unknown error'
          ).join(', ')
        } else {
          errorMessage = `Error: ${JSON.stringify(err, null, 2)}`
        }
      }

      console.error('📝 Error message to display:', errorMessage)
      setErrors([errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setLoading(true)

    if (!isLoaded) {
      setErrors(['System not ready. Please try again.'])
      setLoading(false)
      return
    }

    if (!code || code.length !== 6) {
      setErrors(['Please enter a valid 6-digit verification code'])
      setLoading(false)
      return
    }

    try {
      console.log('🚀 Attempting email verification with code:', code)

      const verifyAttempt = await signUp.attemptEmailAddressVerification({
        code
      })

      console.log('✅ Email verification attempt completed. Response:', verifyAttempt)

      if (verifyAttempt && verifyAttempt.status === 'complete') {
        console.log('🔐 Setting active session with ID:', verifyAttempt.createdSessionId)
        await setActive({ session: verifyAttempt.createdSessionId })

        // Revoke any pending Clerk invitations for this email after successful signup
        try {
          console.log(`🔄 Revoking pending Clerk invitations for ${email} after successful signup`);
          const revokeResult = await revokeClerkInvitation(email);
          if (revokeResult?.success) {
            console.log(`✅ Revoked ${revokeResult.count} pending Clerk invitations for ${email}`);
          } else {
            console.warn(`⚠️ Failed to revoke pending Clerk invitations for ${email}:`, revokeResult?.error);
          }
        } catch (revokeError) {
          console.warn(`⚠️ Error while revoking pending Clerk invitations for ${email}:`, revokeError);
        }

        // Redirect based on invitation type and role
        if (invitationData?.type === 'team_member') {
          console.log('✅ Session set. Redirecting to team accept page...')
          // Use window.location.href for API routes that return redirects
          // router.push doesn't handle server-side redirects properly
          window.location.href = `/api/team/accept/${invitationToken}`
          return
        } else if (invitationData?.role?.toLowerCase() === 'admin' || invitationData?.role?.toLowerCase() === 'super_admin') {
          // Admin users don't need onboarding - create profile and redirect to admin dashboard
          console.log('✅ Session set. Processing admin invitation to create profile...')
          try {
            const adminResponse = await fetch('/api/user/invitation/validate/admin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invitationId: invitationData.invitationId })
            })
            if (adminResponse.ok) {
              console.log('✅ Admin profile created. Redirecting to admin dashboard...')
            } else {
              console.warn('⚠️ Admin profile creation failed, but continuing to redirect...')
            }
          } catch (adminError) {
            console.warn('⚠️ Error creating admin profile:', adminError)
          }
          router.push('/admin/dashboard')
        } else {
          console.log('✅ Session set. Redirecting to appropriate page for platform user...')
          // For platform users (seeker/employer), redirect to onboarding
          router.push('/onboarding')
        }
      } else if (verifyAttempt && verifyAttempt.status) {
        setErrors([`Verification requires additional steps. Current status: ${verifyAttempt.status}`])
      } else {
        setErrors(['Verification encountered an unexpected state. Please try again.'])
      }

    } catch (err: any) {
      console.error('💥 Email verification error occurred:', err)

      let errorMessage = 'An unexpected error occurred during email verification.'

      if (err) {
        if (err.message) {
          errorMessage = err.message
        } else if (err.errors && Array.isArray(err.errors)) {
          errorMessage = err.errors.map((e: any) =>
            e.message || e.longMessage || e.code || 'Unknown error'
          ).join(', ')
        } else {
          errorMessage = `Error: ${JSON.stringify(err, null, 2)}`
        }
      }

      console.error('📝 Error message to display:', errorMessage)
      setErrors([errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resending) return
    setResending(true)
    setErrors([])

    try {
      await signUp?.prepareEmailAddressVerification({
        strategy: 'email_code'
      })
      setErrors(['Verification code resent successfully. Please check your email.'])
    } catch (err: any) {
      console.error('💥 Error resending verification code:', err)
      setErrors(['Failed to resend verification code. Please try again.'])
    } finally {
      setResending(false)
    }
  }

  if (validationError) {
    if (validationError.includes('expired') || validationError.includes('accepted')) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="w-full max-w-md">
            <div className={cardClasses + " text-center"}>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation not valid</h1>
              <p className="text-gray-600 mb-6">{validationError}</p>
              <button
                onClick={() => router.push('/sign-in')}
                className={primaryButtonClasses}
              >
                Go to sign in
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className={cardClasses + " text-center"}>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid invitation</h1>
            <p className="text-gray-600">{validationError}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!email || !invitationData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const isExpired = invitationData.expiresAt && new Date(invitationData.expiresAt) < new Date()
  const isAccepted = invitationData.acceptedAt !== null

  if (isExpired || isAccepted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className={cardClasses + " text-center"}>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation not valid</h1>
            <p className="text-gray-600 mb-6">
              {isExpired
                ? 'This invitation has expired.'
                : 'This invitation has already been accepted.'}
            </p>
            <button
              onClick={() => router.push('/sign-in')}
              className={primaryButtonClasses}
            >
              Go to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (signupStep === 'code') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-4">
          {/* Verification Form */}
          <div className={cardClasses}>
            <div className="text-center mb-3">
              <h1 className="text-lg font-bold text-gray-900 font-[Inter, 'Inter Fallback']">Verify your email</h1>
              <p className="text-gray-600 mt-2 text-xs font-light">
                We've sent a verification code to <span className="font-medium">{email}</span>
              </p>
            </div>

            {errors.length > 0 && (
              <div className="flex justify-center">
                <div className="mb-3">
                  <div className="mt-2 text-xs text-red-700 flex gap-2"><span className="font-medium">Error:</span>
                    {errors.map((error, index) => (
                      <p key={index} className="whitespace-pre-wrap">{error}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleCodeSubmit}>
              <div className={formFieldClasses}>
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => setCode(value)}
                  autoFocus
                  pattern={REGEXP_ONLY_DIGITS}
                  containerClassName="flex justify-center"
                >
                  <InputOTPGroup className="gap-1">
                    <InputOTPSlot className="ring-slate-300" index={0} />
                    <InputOTPSlot className="ring-slate-300" index={1} />
                    <InputOTPSlot className="ring-slate-300" index={2} />
                    <InputOTPSlot className="ring-slate-300" index={3} />
                    <InputOTPSlot className="ring-slate-300" index={4} />
                    <InputOTPSlot className="ring-slate-300" index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Enter the 6-digit code sent to your email address
                </p>
              </div>

              <div className="mt-4">
                <Button
                  disabled={loading || !isLoaded || code.length !== 6}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white">
                        <div className="h-full w-full rounded-full border-2 border-white border-t-transparent"></div>
                      </div>
                      Verifying...
                    </>
                  ) : (
                    'Verify email'
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">Didn't receive the code?</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resending}
                  className={secondaryButtonClasses + " w-full text-xs"}
                >
                  {resending ? 'Sending...' : 'Resend verification code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 max-sm:p-6">
      <div className="w-full max-w-4xl flex flex-col md:flex-row">
        {/* Information Panel */}
        <div className="max-lg:w-1/3 max-lg:px-0 max-sm:w-2/3 p-6 w-[27rem] mx-auto flex flex-col justify-center">
          <div className="flex items-center mb-6 w-2/3 mx-auto">
            <img src="/hmm_logo.png" alt="Hire My Mom Logo" className="h-20" />
          </div>
          <div className="space-y-4 flex flex-col w-2/3 mx-auto gap-1">
            <h2 className="text-md font-semibold text-gray-800">
              {invitationData.type === 'team_member' ? 'Team Invitation' : 'Platform Invitation'}
            </h2>
            {invitationData.type === 'team_member' && invitationData.employerName && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Company</h3>
                <p className="text-base font-medium text-gray-900 mt-1">{invitationData.employerName}</p>
              </div>
            )}
            {invitationData.invitedByName && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Invited by</h3>
                <p className="text-base text-gray-900 mt-1 break-words">{invitationData.invitedByName}</p>
              </div>
            )}
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {invitationData.type === 'team_member' ? 'Your role' : 'Account type'}
              </h3>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1 capitalize">
                <span className="flex items-center">
                  {getRoleIcon(invitationData.role)}
                  <span className="ml-1">{getRoleDescription(invitationData.role)}</span>
                </span>
              </div>
            </div>
            {invitationData.message && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Message From {invitationData.employerName ? invitationData.employerName : invitationData.invitedByName}</h3>
                <div className="text-base text-gray-700 mt-1 bg-gray-50">
                  {invitationData.message}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</h3>
              <p className="text-base text-gray-900 mt-1">
                {invitationData.expiresAt
                  ? new Date(invitationData.expiresAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                  : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Signup Form */}
        <div className={`${cardClasses} max-sm:w-fit`}>
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900">Complete your account</h1>
            <p className="text-gray-600 text-xs">
              {invitationData.type === 'team_member'
                ? `You've been invited to join ${invitationData.employerName || 'a team'}`
                : 'You\'ve been invited to join the platform'}
            </p>
          </div>

          {errors.length > 0 && (
            <div className={errorClasses}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-xs font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-xs text-red-700">
                    {errors.map((error, index) => (
                      <p key={index} className="whitespace-pre-wrap">{error}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleInitialSubmit}>
            {/* Email field - read-only */}
            <div className={formFieldClasses}>
              <div className={formFieldLabelRowClasses}>
                <label htmlFor="email" className={labelClasses}>
                  Email address
                </label>
              </div>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className={`${inputClasses} bg-gray-50 cursor-not-allowed`}
                  title="This email is provided by your invitation and cannot be changed"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                This email is provided by your invitation and cannot be changed
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div className={formFieldClasses}>
                <div className={formFieldLabelRowClasses}>
                  <label htmlFor="firstName" className={labelClasses}>
                    First name
                  </label>
                </div>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClasses}
                  placeholder="First name"
                />
              </div>

              {/* Last Name */}
              <div className={formFieldClasses}>
                <div className={formFieldLabelRowClasses}>
                  <label htmlFor="lastName" className={labelClasses}>
                    Last name
                  </label>
                </div>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClasses}
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Password */}
            <div className={formFieldClasses}>
              <div className={formFieldLabelRowClasses}>
                <label htmlFor="password" className={labelClasses}>
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClasses}
                  placeholder="Create a password"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Password must be at least 8 characters long
              </p>
            </div>

            {/* CAPTCHA Container - Required for sign-up flows */}
            <div id="clerk-captcha" className="my-4"></div>

            {/* Legal Acceptance */}
            <input
              id="legalAccepted"
              name="legalAccepted"
              type="hidden"
              required
              checked={legalAccepted}
              readOnly={true}
            />

            {/* Submit Button */}
            <div className="mt-4">
              <Button
                disabled={loading || !isLoaded}
                className="w-full"
              >
                {loading ? (
                  <>
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white">
                      <div className="h-full w-full rounded-full border-2 border-white border-t-transparent"></div>
                    </div>
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </div>
          </form>

          <div className={footerClasses}>
            <p className="text-xs">
              By creating an account, you agree to our <a className={tosClass} href="https://www.hiremymom.com/tos/" target="_blank">Terms of Service</a> and <a className={tosClass} href="https://www.hiremymom.com/privacypolicy/" target="_blank">Privacy Policy.</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
