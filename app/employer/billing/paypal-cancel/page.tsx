'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function EmployerPayPalCancelPage() {
    const router = useRouter();

    // Clear any pending PayPal session data
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('paypal_pending_plan');
        sessionStorage.removeItem('paypal_token');
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-lg">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <XCircle className="h-6 w-6 text-yellow-600" />
                        <span>Payment Cancelled</span>
                    </CardTitle>
                    <CardDescription>
                        Your PayPal payment was cancelled.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600 mb-4">
                        No charges have been made to your PayPal account. You can try again
                        or choose a different payment method.
                    </p>

                    <div className="space-y-3">
                        <Button
                            onClick={() => router.push('/employer/billing')}
                            className="w-full"
                        >
                            Return to Billing
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                            className="w-full"
                        >
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
