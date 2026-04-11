'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/ui/toast';
import { postWithImpersonation } from '@/lib/api-client';
import { CheckCircle, XCircle, CreditCard, Gift } from 'lucide-react';

export default function PayPalSetupReturnPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { addToast } = useToast();
    const [status, setStatus] = useState<'loading' | 'activating' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [isExclusiveActivation, setIsExclusiveActivation] = useState(false);

    // Prevent infinite loop - only execute once per page load
    const hasExecutedRef = useRef(false);
    const executionTokenRef = useRef<string | null>(null);

    useEffect(() => {
        // Get token from URL params immediately to check for duplicate execution
        const baToken = searchParams.get('ba_token');
        const ecToken = searchParams.get('token');
        const token = baToken || ecToken;
        const redirectParam = searchParams.get('redirect');

        // Guard: Prevent multiple executions (React StrictMode, re-renders, or user refresh)
        if (hasExecutedRef.current) {
            console.log('🅿️ PayPal setup return - Already executed, skipping duplicate call');
            return;
        }

        // Guard: Prevent duplicate execution for same token (user refresh scenario)
        if (token && executionTokenRef.current === token) {
            console.log('🅿️ PayPal setup return - Same token already processed:', token);
            return;
        }

        const executePayPalSetup = async () => {
            // Mark as executed BEFORE async operations to prevent race conditions
            hasExecutedRef.current = true;
            if (token) executionTokenRef.current = token;

            console.log('🅿️ PayPal setup return - ba_token:', baToken, 'ec_token:', ecToken, 'using:', token, 'redirect:', redirectParam);

            if (!token) {
                setStatus('error');
                setMessage('Missing PayPal token. Please try again.');
                return;
            }

            // Validate we have the correct token format (BA-xxx)
            if (!token.startsWith('BA-')) {
                setStatus('error');
                setMessage('Invalid token format. Expected BA-xxx token from PayPal. Please try again.');
                console.error('Invalid token format. Expected BA-xxx but got:', token);
                return;
            }

            try {
                // Step 1: Save PayPal as payment method
                const response = await postWithImpersonation(
                    '/api/employer/billing/paypal/execute-setup',
                    { token }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'Failed to save PayPal payment method');
                }

                const savedPaymentMethodId = result.paymentMethodId;
                console.log('🅿️ PayPal saved successfully, paymentMethodId:', savedPaymentMethodId);

                // Step 2: Check if this was from exclusive plan activation flow
                // Priority order:
                // 1. API response tells us employer has pending exclusive plan (most reliable)
                // 2. sessionStorage flag (may not survive PayPal redirect)
                // 3. URL redirect param (PayPal may strip it)
                const apiFlag = result.hasPendingExclusivePlan === true;
                const sessionFlag = typeof window !== 'undefined' && sessionStorage.getItem('exclusive_plan_pending_activation') === 'true';
                const urlFlag = redirectParam === 'dashboard';

                console.log('🎁 Exclusive plan check - apiFlag:', apiFlag, 'sessionFlag:', sessionFlag, 'urlFlag:', urlFlag, 'redirectParam:', redirectParam);

                // Use API flag as primary source since it's server-side and reliable
                const pendingExclusiveActivation = apiFlag || sessionFlag || urlFlag;

                if (pendingExclusiveActivation && savedPaymentMethodId) {
                    setIsExclusiveActivation(true);
                    setStatus('activating');
                    setMessage('PayPal saved! Now activating your exclusive plan...');

                    // Clear the session flag
                    if (typeof window !== 'undefined') {
                        sessionStorage.removeItem('exclusive_plan_pending_activation');
                    }

                    console.log('🎁 Auto-activating exclusive plan with PayPal payment method:', savedPaymentMethodId);

                    // Step 3: Automatically activate the exclusive plan
                    const activateResponse = await fetch('/api/employer/exclusive-plan/activate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ paymentMethodId: savedPaymentMethodId })
                    });

                    const activateResult = await activateResponse.json();

                    if (activateResponse.ok && activateResult.success) {
                        setStatus('success');
                        setMessage('Your exclusive plan is now active!');

                        addToast({
                            title: '🎉 Exclusive Plan Activated!',
                            description: `Your ${activateResult.package?.name || 'exclusive plan'} is now active.`,
                            variant: 'success',
                            duration: 5000,
                        });

                        // Redirect to dashboard after short delay
                        setTimeout(() => {
                            router.push('/employer/dashboard');
                        }, 2000);
                    } else {
                        // PayPal saved but activation failed
                        setStatus('error');
                        setMessage(`PayPal saved, but plan activation failed: ${activateResult.error || 'Unknown error'}. Please try activating from the billing page.`);

                        addToast({
                            title: 'Activation Failed',
                            description: 'PayPal was saved but plan activation failed. Please try again from billing.',
                            variant: 'destructive',
                            duration: 5000,
                        });
                    }
                } else {
                    // Normal PayPal setup (not exclusive plan flow)
                    setStatus('success');
                    setMessage('PayPal has been added as a payment method.');

                    addToast({
                        title: 'PayPal Added',
                        description: 'PayPal has been saved as a payment method.',
                        variant: 'success',
                        duration: 5000,
                    });

                    // Redirect to billing page after short delay
                    setTimeout(() => {
                        router.push('/employer/billing?tab=payment-methods');
                    }, 2000);
                }
            } catch (error) {
                console.error('PayPal setup execution error:', error);
                setStatus('error');
                setMessage(error instanceof Error ? error.message : 'Failed to save PayPal payment method');

                addToast({
                    title: 'PayPal Setup Failed',
                    description: error instanceof Error ? error.message : 'Failed to save PayPal payment method',
                    variant: 'destructive',
                    duration: 5000,
                });
            }
        };

        executePayPalSetup();
    }, [searchParams, router, addToast]);

    return (
        <div className="container mx-auto px-4 py-8 max-w-xl">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                        {(status === 'loading' || status === 'activating') && <LoadingSpinner className="h-6 w-6" />}
                        {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
                        {status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
                        {status === 'loading' && 'Adding PayPal...'}
                        {status === 'activating' && 'Activating Exclusive Plan...'}
                        {status === 'success' && (isExclusiveActivation ? '🎉 Plan Activated!' : 'PayPal Added!')}
                        {status === 'error' && 'Setup Failed'}
                    </CardTitle>
                    <CardDescription>
                        {status === 'loading' && 'Please wait while we save your PayPal payment method...'}
                        {status === 'activating' && 'PayPal saved! Now activating your exclusive plan...'}
                        {status === 'success' && (isExclusiveActivation ? 'Redirecting you to your dashboard...' : 'Redirecting you to your billing page...')}
                        {status === 'error' && 'There was a problem.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    {(status === 'loading' || status === 'activating') && (
                        <div className="flex flex-col items-center justify-center py-8 gap-4">
                            <LoadingSpinner className="h-12 w-12" />
                            {status === 'activating' && (
                                <div className="flex items-center gap-2 text-amber-600">
                                    <Gift className="h-5 w-5" />
                                    <span className="font-medium">Processing your exclusive offer...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center justify-center gap-2 text-green-600">
                                {isExclusiveActivation ? <Gift className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                                <span className="font-medium">{message}</span>
                            </div>
                            <p className="text-gray-600">
                                {isExclusiveActivation
                                    ? 'Your exclusive plan is now active. You can start posting jobs!'
                                    : 'You can now use PayPal for exclusive plan activation and future purchases.'}
                            </p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-4 py-4">
                            <p className="text-red-600">{message}</p>
                            <Button onClick={() => router.push('/employer/billing?tab=payment-methods')}>
                                Return to Billing
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
