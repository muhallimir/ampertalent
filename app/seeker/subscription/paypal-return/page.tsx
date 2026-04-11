'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { usePayPalReturn } from '@/components/payments/PayPalButton';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function PayPalReturnPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { executePayPalAgreement, isProcessing, error } = usePayPalReturn();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
    // Track if this is a new user onboarding flow
    const [isOnboarding, setIsOnboarding] = useState(false);
    // Track if this is a service purchase (not subscription)
    const [isServicePurchase, setIsServicePurchase] = useState(false);
    const [serviceName, setServiceName] = useState<string>('');

    // Prevent infinite loop - only execute once per page load
    // This is critical because executePayPalAgreement is recreated each render
    const hasExecutedRef = useRef(false);
    const executionTokenRef = useRef<string | null>(null);

    // Memoize the execute function to avoid dependency issues
    const stableExecute = useCallback(executePayPalAgreement, []);

    // Get friendly service name from planId
    const getServiceName = (planId: string): string => {
        const serviceNames: Record<string, string> = {
            'service_resume_refresh': 'Resume Refresh',
            'service_create_new_resume': 'Resume Creation',
            'service_cover_letter_service': 'Cover Letter',
            'service_interview_success_training': 'Interview Coaching',
            'service_the_works': 'The Works Package',
            'service_career_jumpstart': 'Career Jumpstart',
            'service_personal_career_strategist': 'Personal Career Strategist',
        };
        return serviceNames[planId] || 'Premium Service';
    };

    useEffect(() => {
        // Get token from URL params immediately to check for duplicate execution
        const baToken = searchParams.get('ba_token');
        const ecToken = searchParams.get('token');
        const token = baToken || ecToken;

        // Guard: Prevent multiple executions (React StrictMode, re-renders, or user refresh)
        if (hasExecutedRef.current) {
            console.log('🅿️ PayPal return - Already executed, skipping duplicate call');
            return;
        }

        // Guard: Prevent duplicate execution for same token (user refresh scenario)
        if (token && executionTokenRef.current === token) {
            console.log('🅿️ PayPal return - Same token already processed:', token);
            return;
        }

        const handlePayPalReturn = async () => {
            // Mark as executed BEFORE async operations to prevent race conditions
            hasExecutedRef.current = true;
            if (token) executionTokenRef.current = token;

            // PayPal returns both 'token' (EC-xxx) and 'ba_token' (BA-xxx)
            // We need the ba_token (BA-xxx format) for executeBillingAgreement API
            const planId = searchParams.get('planId') || sessionStorage.getItem('paypal_pending_plan');

            console.log('🅿️ PayPal return - ba_token:', baToken, 'ec_token:', ecToken, 'using:', token, 'planId:', planId);

            // Check if this is a SERVICE purchase (one-time, not subscription)
            // Service planIds start with 'service_' (e.g., 'service_resume_refresh')
            const isService = planId?.startsWith('service_') || false;
            if (isService) {
                console.log('🅿️ PayPal return - SERVICE purchase detected:', planId);
                setIsServicePurchase(true);
                setServiceName(getServiceName(planId!));
            }

            // Check if this is an onboarding flow (new user signup)
            // Check both URL params, sessionStorage, AND localStorage (localStorage persists across external redirects)
            const pendingSignupIdFromUrl = searchParams.get('pendingSignupId');
            const pendingSignupIdFromSession = sessionStorage.getItem('paypal_pendingSignupId');
            const pendingSignupIdFromLocal = localStorage.getItem('paypal_pendingSignupId');
            const hasPendingSignup = pendingSignupIdFromUrl || pendingSignupIdFromSession || pendingSignupIdFromLocal;

            if (hasPendingSignup) {
                console.log('🅿️ PayPal return - Onboarding flow detected, pendingSignupId:', hasPendingSignup);
                setIsOnboarding(true);
            }

            if (!token) {
                setStatus('error');
                console.error('No PayPal token found in URL');
                return;
            }

            // Validate we have the correct token format (BA-xxx)
            if (!token.startsWith('BA-')) {
                setStatus('error');
                console.error('Invalid token format. Expected BA-xxx but got:', token);
                return;
            }

            if (!planId) {
                setStatus('error');
                console.error('No plan ID found');
                return;
            }

            // Execute the billing agreement
            const result = await stableExecute(token, planId);

            if (result.success) {
                setStatus('success');
                setSubscriptionId(result.subscriptionId || null);

                // CLEANUP: Remove post-onboarding service redirect localStorage
                // This prevents infinite redirect loop: dashboard -> services -> dashboard
                if (isService) {
                    console.log('🅿️ PayPal return - Cleaning up hmm_post_onboarding_service localStorage');
                    localStorage.removeItem('hmm_post_onboarding_service');
                }

                // Auto-redirect after successful purchase
                setTimeout(() => {
                    if (isService) {
                        // For service purchases, redirect to services page with success tab
                        console.log('🅿️ PayPal return - Redirecting to services history');
                        router.push('/seeker/services?tab=history&success=true');
                    } else if (hasPendingSignup) {
                        // For onboarding, redirect to dashboard
                        console.log('🅿️ PayPal return - Redirecting onboarding user to dashboard');
                        router.push('/seeker/dashboard?welcome=true');
                    }
                }, 2000);
            } else {
                setStatus('error');
            }
        };

        handlePayPalReturn();
    }, [searchParams, stableExecute, router]);

    const handleContinue = () => {
        // For service purchases, redirect to services history
        if (isServicePurchase) {
            router.push('/seeker/services?tab=history');
        } else if (isOnboarding) {
            // For new user onboarding, redirect to dashboard with welcome message
            router.push('/seeker/dashboard?welcome=true');
        } else {
            // For existing users, redirect to subscription page
            router.push('/seeker/subscription');
        }
    };

    const handleRetry = () => {
        // For service purchases, go back to services page
        if (isServicePurchase) {
            router.push('/seeker/services');
        } else if (isOnboarding) {
            // For onboarding, go back to onboarding page
            router.push('/onboarding');
        } else {
            // For existing users, go to subscription page
            router.push('/seeker/subscription');
        }
    };

    return (
        <div className="container mx-auto max-w-lg py-12 px-4">
            <Card>
                <CardHeader className="text-center">
                    {status === 'processing' && (
                        <>
                            <div className="flex justify-center mb-4">
                                <LoadingSpinner size="lg" />
                            </div>
                            <CardTitle>Processing PayPal Setup...</CardTitle>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="flex justify-center mb-4">
                                <CheckCircle className="h-16 w-16 text-green-500" />
                            </div>
                            <CardTitle className="text-green-700">
                                {isServicePurchase
                                    ? 'Service Purchased Successfully!'
                                    : isOnboarding
                                        ? 'Welcome to HireMyMom!'
                                        : 'PayPal Connected Successfully!'}
                            </CardTitle>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="flex justify-center mb-4">
                                <XCircle className="h-16 w-16 text-red-500" />
                            </div>
                            <CardTitle className="text-red-700">PayPal Setup Failed</CardTitle>
                        </>
                    )}
                </CardHeader>

                <CardContent className="text-center space-y-4">
                    {status === 'processing' && (
                        <p className="text-gray-600">
                            Please wait while we complete your PayPal setup...
                        </p>
                    )}

                    {status === 'success' && (
                        <>
                            <p className="text-gray-600">
                                {isServicePurchase
                                    ? `Your ${serviceName} purchase is complete! Our team will contact you within 1-2 business days. Redirecting...`
                                    : isOnboarding
                                        ? 'Your account has been created and PayPal is linked for payments. Redirecting you to your dashboard...'
                                        : 'Your PayPal account has been linked for future subscription payments. You\'re all set!'}
                            </p>
                            {isServicePurchase && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-medium">{serviceName}</span>
                                    </div>
                                    <p className="text-sm text-green-600 mt-1">
                                        Your purchase has been recorded. Check your email for confirmation.
                                    </p>
                                </div>
                            )}
                            {subscriptionId && !isServicePurchase && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <AlertCircle className="h-5 w-5" />
                                        <span className="font-medium">Subscription Active</span>
                                    </div>
                                    <p className="text-sm text-green-600 mt-1">
                                        Your subscription is now active and ready to use.
                                    </p>
                                </div>
                            )}
                            <Button onClick={handleContinue} className="w-full mt-4">
                                {isServicePurchase ? 'View Purchase History' : 'Continue to Dashboard'}
                            </Button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <p className="text-gray-600">
                                {error || 'Something went wrong while setting up PayPal.'}
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-600">
                                    Please try again or contact support if the problem persists.
                                </p>
                            </div>
                            <Button onClick={handleRetry} className="w-full mt-4">
                                Try Again
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
