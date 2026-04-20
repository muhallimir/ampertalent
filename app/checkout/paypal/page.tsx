'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { PayPalButton } from '@/components/payments/PayPalButton';
import { StripeCheckoutButton } from '@/components/payments/StripeCheckoutButton';
import { getServiceById } from '@/lib/additional-services';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function PayPalCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [planDetails, setPlanDetails] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  const planId = searchParams.get('planId');
  const serviceId = searchParams.get('serviceId');
  const userType = searchParams.get('userType');
  const pendingSignupId = searchParams.get('pendingSignupId');
  const pendingJobPostId = searchParams.get('pendingJobPostId');
  const sessionToken = searchParams.get('sessionToken');
  const returnUrl = searchParams.get('returnUrl');
  const userInfoParam = searchParams.get('userInfo');
  const totalPriceParam = searchParams.get('totalPrice');
  const addOnIdsParam = searchParams.get('addOnIds');
  const isTrialParam = searchParams.get('isTrial');

  // Parse addOnIds from URL parameter (memoized to prevent dependency array changes)
  const [addOnIds] = useState(() => {
    try {
      return addOnIdsParam ? JSON.parse(addOnIdsParam) : [];
    } catch (e) {
      console.error('Failed to parse addOnIds:', e);
      return [];
    }
  });

  // Parse userInfo from URL parameter as fallback (memoized to prevent dependency array changes)
  const [urlUserInfo] = useState(() => {
    try {
      return userInfoParam ? JSON.parse(userInfoParam) : null;
    } catch (e) {
      console.error('Failed to parse userInfo:', e);
      return null;
    }
  });

  // Fetch user profile info if authenticated
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!isLoaded || !isSignedIn || !user) {
        setIsLoading(false);
        return;
      }

      try {
        // If we have urlUserInfo, use that first
        if (urlUserInfo) {
          setUserInfo(urlUserInfo);
          setIsLoading(false);
          return;
        }

        // Otherwise fetch from API
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const profileData = await response.json();
          setUserInfo({
            firstName: profileData.firstName || user.firstName || '',
            lastName: profileData.lastName || user.lastName || '',
            email: profileData.email || user.emailAddresses[0]?.emailAddress || '',
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          });
        }
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [isLoaded, isSignedIn, user, urlUserInfo]);

  // Determine plan amount
  const amount = totalPriceParam ? parseFloat(totalPriceParam) : 0;
  // For trial, show $0 at checkout (no immediate charge)
  const checkoutAmount = isTrialParam === 'true' ? 0 : amount;

  const planName = planId
    ? planId.charAt(0).toUpperCase() + planId.slice(1).replace(/_/g, ' ')
    : serviceId
      ? `Service: ${getServiceById(serviceId)?.name || 'Unknown'}`
      : 'Purchase';

  const handlePayPalSuccess = (billingAgreementId: string, subscriptionId?: string) => {
    console.log('✅ PayPal payment successful:', billingAgreementId);
    setSuccess(true);

    // Redirect after a brief delay to show success message
    setTimeout(() => {
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        router.push('/dashboard');
      }
    }, 2000);
  };

  const handlePayPalError = (message: string) => {
    console.error('❌ PayPal error:', message);
    setError(message);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Authentication Required</CardTitle>
            <CardDescription>Please sign in to continue with checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => router.push('/sign-in')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sign In
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Secure Checkout
          </CardTitle>
          <CardDescription>Complete your purchase for {planName}</CardDescription>
        </CardHeader>
        <CardContent>
          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Payment successful! Redirecting to your dashboard...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-6" variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {/* Trial Notice */}
            {isTrialParam === 'true' && (
              <Alert className="bg-blue-50 border-blue-300 border-2">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <AlertDescription className="text-blue-900 font-medium">
                  <strong className="block mb-1">3-Day Free Trial</strong>
                  We won't charge you today. We just need your payment information. Regular charges of <strong>${amount.toFixed(2)}</strong> will begin on day 4.
                </AlertDescription>
              </Alert>
            )}

            {/* Order Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{planName}</span>
                  <span className="font-medium">
                    {isTrialParam === 'true' ? (
                      <>
                        <span className="line-through text-gray-500">${amount.toFixed(2)}</span>
                        <span className="ml-2">${checkoutAmount.toFixed(2)}</span>
                      </>
                    ) : (
                      `$${amount.toFixed(2)}`
                    )}
                  </span>
                </div>
                {addOnIds && addOnIds.length > 0 && (
                  <>
                    <div className="border-t border-gray-300 pt-2 mt-2">
                      <p className="text-sm text-gray-600 mb-2">Add-ons:</p>
                      {addOnIds.map((addOnId: string) => (
                        <div key={addOnId} className="flex justify-between text-sm text-gray-600">
                          <span>{addOnId}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${checkoutAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods - Tabs */}
            <Tabs defaultValue="paypal" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paypal">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.27.287 2.177.902 2.65 1.865.38.773.514 1.743.346 2.88-.036.244-.09.487-.153.73-.963 4.893-4.394 6.97-8.537 6.97H12.73l-1.205 7.63a.563.563 0 0 1-.556.47H7.716a.351.351 0 0 1-.346-.404l.316-2.002c.083-.518.527-.9 1.05-.9h1.58c.524 0 .967.382 1.049.9l.188 1.19c.082.518.526.9 1.049.9h.85c3.883 0 6.896-1.577 7.78-6.138.386-1.978.083-3.577-1.01-4.55z" />
                  </svg>
                  PayPal
                </TabsTrigger>
                <TabsTrigger value="stripe">
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.629-3.356-2.676 0-.933.753-1.762 2.247-1.762 1.215 0 2.403.823 3.587 1.956.205-.179.41-.383.61-.606-1.46-1.288-2.738-1.977-4.197-1.977-2.666 0-4.81 1.734-4.81 4.172 0 1.923.995 3.212 2.96 4.042 1.922.822 3.483 1.319 3.483 2.500 0 .652-.361 1.287-1.484 1.287-.779 0-1.58-.231-2.367-.607-.192.529-.385 1.045-.571 1.562 1.364.607 2.296.978 3.938.978 2.786 0 4.59-1.874 4.59-4.272-.005-2.195-1.124-3.212-2.993-4.042z" />
                  </svg>
                  Stripe
                </TabsTrigger>
              </TabsList>

              {/* PayPal Tab */}
              <TabsContent value="paypal" className="mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Pay with PayPal</h3>
                  <p className="text-gray-600 mb-4">
                    Secure payment with buyer protection. Click below to proceed to PayPal.
                  </p>
                  <PayPalButton
                    planId={planId || ''}
                    pendingSignupId={pendingSignupId || undefined}
                    sessionToken={sessionToken || undefined}
                    userType="seeker"
                    onSuccess={handlePayPalSuccess}
                    onError={handlePayPalError}
                    disabled={isLoading || success}
                    className="w-full"
                  />
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mt-4">
                    <Lock className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">Secure payment with PayPal buyer protection</span>
                  </div>
                </div>
              </TabsContent>

              {/* Stripe Tab */}
              <TabsContent value="stripe" className="mt-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Pay with Stripe</h3>
                  <p className="text-gray-600 mb-4">
                    Secure card payment. You will be redirected to Stripe Checkout.
                  </p>
                  <StripeCheckoutButton
                    amount={checkoutAmount}
                    onSuccess={(sessionId) => {
                      console.log('Stripe session created:', sessionId);
                      // The button handles redirect automatically
                    }}
                    onError={(error) => {
                      setError(error);
                    }}
                    disabled={isLoading || success}
                    className="w-full"
                    planId={planId || ''}
                    pendingSignupId={pendingSignupId || ''}
                    sessionToken={sessionToken || ''}
                  />
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mt-4">
                    <Lock className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">Secure payment with Stripe</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Security Info */}
            <div className="text-center text-sm text-gray-600">
              <p>🔒 Your payment information is protected and secure</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PayPalCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <PayPalCheckoutContent />
    </Suspense>
  );
}
