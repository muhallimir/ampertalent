'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/ui/toast';
import { postWithImpersonation } from '@/lib/api-client';
import { CheckCircle, XCircle, Package } from 'lucide-react';

export default function EmployerPayPalReturnPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { addToast } = useToast();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    // Prevent infinite loop - only execute once per page load
    // This is critical because useEffect deps can cause re-renders
    const hasExecutedRef = useRef(false);
    const executionTokenRef = useRef<string | null>(null);

    useEffect(() => {
        // Get token from URL params immediately to check for duplicate execution
        const baToken = searchParams.get('ba_token');
        const ecToken = searchParams.get('token');
        const token = baToken || ecToken;

        // Guard: Prevent multiple executions (React StrictMode, re-renders, or user refresh)
        if (hasExecutedRef.current) {
            console.log('🅿️ Employer PayPal return - Already executed, skipping duplicate call');
            return;
        }

        // Guard: Prevent duplicate execution for same token (user refresh scenario)
        if (token && executionTokenRef.current === token) {
            console.log('🅿️ Employer PayPal return - Same token already processed:', token);
            return;
        }

        const executePayPalAgreement = async () => {
            // Mark as executed BEFORE async operations to prevent race conditions
            hasExecutedRef.current = true;
            if (token) executionTokenRef.current = token;

            // PayPal returns both 'token' (EC-xxx) and 'ba_token' (BA-xxx)
            // We need the ba_token (BA-xxx format) for executeBillingAgreement API
            const planId = sessionStorage.getItem('paypal_pending_plan');

            // Retrieve add-ons from sessionStorage (stored before PayPal redirect)
            let addOnIds: string[] = [];
            let customAmount: number | undefined;

            const storedAddOns = sessionStorage.getItem('paypal_addOnIds');
            if (storedAddOns) {
                try {
                    addOnIds = JSON.parse(storedAddOns);
                    console.log('🅿️ Employer PayPal return - Retrieved add-ons from session:', addOnIds);
                } catch (e) {
                    console.warn('Failed to parse stored addOnIds:', e);
                }
            }

            const storedAmount = sessionStorage.getItem('paypal_customAmount');
            if (storedAmount) {
                customAmount = parseFloat(storedAmount);
                console.log('🅿️ Employer PayPal return - Retrieved custom amount from session:', customAmount);
            }

            console.log('🅿️ Employer PayPal return - ba_token:', baToken, 'ec_token:', ecToken, 'using:', token);

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
                const response = await postWithImpersonation(
                    '/api/payments/paypal/execute-billing-agreement',
                    {
                        token,
                        ...(planId ? { planId } : { setupOnly: true }),
                        userType: 'employer',
                        addOnIds: addOnIds.length > 0 ? addOnIds : undefined,
                        customAmount: customAmount,
                    }
                );

                const result = await response.json();

                if (result.success) {
                    // Clear session storage (including add-ons)
                    sessionStorage.removeItem('paypal_pending_plan');
                    sessionStorage.removeItem('paypal_token');
                    sessionStorage.removeItem('paypal_addOnIds');
                    sessionStorage.removeItem('paypal_customAmount');

                    setStatus('success');
                    setMessage('Your PayPal payment has been processed successfully!');

                    addToast({
                        title: 'Payment Successful!',
                        description: 'Your purchase has been completed via PayPal.',
                        variant: 'success',
                        duration: 5000,
                    });

                    // Redirect to billing page after a short delay
                    setTimeout(() => {
                        router.push('/employer/billing?payment=success');
                    }, 2000);
                } else {
                    throw new Error(result.error || 'Failed to process PayPal payment');
                }
            } catch (error) {
                console.error('PayPal execution error:', error);
                setStatus('error');
                setMessage(error instanceof Error ? error.message : 'Failed to process PayPal payment');

                addToast({
                    title: 'Payment Failed',
                    description: error instanceof Error ? error.message : 'Failed to process PayPal payment',
                    variant: 'destructive',
                    duration: 5000,
                });
            }
        };

        executePayPalAgreement();
    }, [searchParams, router, addToast]);
    // Note: router and addToast are stable refs from Next.js/our hook,
    // and the ref guards above prevent duplicate executions

    return (
        <div className="container mx-auto px-4 py-8 max-w-lg">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {status === 'loading' && <LoadingSpinner size="sm" />}
                        {status === 'success' && <CheckCircle className="h-6 w-6 text-green-600" />}
                        {status === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
                        <span>
                            {status === 'loading' && 'Processing PayPal Payment...'}
                            {status === 'success' && 'Payment Successful!'}
                            {status === 'error' && 'Payment Failed'}
                        </span>
                    </CardTitle>
                    <CardDescription>
                        {status === 'loading' && 'Please wait while we complete your payment...'}
                        {status === 'success' && 'Your payment has been processed.'}
                        {status === 'error' && 'There was an issue with your payment.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600 mb-4">{message}</p>

                    {status === 'success' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2 text-green-700">
                                <Package className="h-5 w-5" />
                                <span className="font-medium">Redirecting to your billing page...</span>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-3">
                            <Button
                                onClick={() => router.push('/employer/billing')}
                                className="w-full"
                            >
                                Return to Billing
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/employer/billing')}
                                className="w-full"
                            >
                                Try Again
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
