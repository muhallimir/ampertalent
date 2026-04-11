'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function PayPalCancelPage() {
    const router = useRouter();

    const handleGoBack = () => {
        // Clear any stored PayPal data
        sessionStorage.removeItem('paypal_pending_plan');
        sessionStorage.removeItem('paypal_token');

        router.push('/seeker/subscription');
    };

    return (
        <div className="container mx-auto max-w-lg py-12 px-4">
            <Card>
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <XCircle className="h-16 w-16 text-amber-500" />
                    </div>
                    <CardTitle className="text-amber-700">PayPal Setup Cancelled</CardTitle>
                </CardHeader>

                <CardContent className="text-center space-y-4">
                    <p className="text-gray-600">
                        You cancelled the PayPal setup process. No changes have been made to your account.
                    </p>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-700">
                            You can try again at any time by selecting PayPal as your payment method.
                        </p>
                    </div>

                    <Button onClick={handleGoBack} className="w-full mt-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Return to Subscription
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
