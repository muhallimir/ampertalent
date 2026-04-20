'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SeekerSubscriptionCard } from '@/components/payments/SeekerSubscriptionCard';
import { SEEKER_SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';
import { useToast } from '@/components/ui/toast';
import { PaymentMethodForm } from '@/components/payments/PaymentMethodForm';
import { SeekerSubscriptionPurchaseModal } from '@/components/payments/SeekerSubscriptionPurchaseModal';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { CancellationSurveyForm } from '@/components/subscription/CancellationSurveyForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { clearMarketingPreselect } from '@/lib/marketing-preselect';
import {
  getWithImpersonation,
  postWithImpersonation,
  putWithImpersonation,
  deleteWithImpersonation,
} from '@/lib/api-client';
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Download,
  Receipt,
  Settings,
  Crown,
  Zap,
  Users,
  Heart,
  RefreshCw,
} from 'lucide-react';

interface CurrentSubscription {
  id: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card';
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  date: string;
  paymentMethod: {
    type: string;
    last4?: string;
    brand?: string;
  };
  metadata?: Record<string, any>;
}

export default function SubscriptionPage() {
  const { addToast } = useToast();
  const [currentSubscription, setCurrentSubscription] =
    useState<CurrentSubscription | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plans');
  const [isManaging, setIsManaging] = useState(false);
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false);
  const [showPaymentMethodChoice, setShowPaymentMethodChoice] = useState(false);
  const [isAddingPayPal, setIsAddingPayPal] = useState(false);
  const [paymentMethodFormMode, setPaymentMethodFormMode] = useState<
    'add' | 'update'
  >('add');
  const [paymentMethodToUpdate, setPaymentMethodToUpdate] = useState<
    string | null
  >(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [returnToPurchaseModal, setReturnToPurchaseModal] = useState(false);
  const [
    showRemovePaymentMethodConfirmation,
    setShowRemovePaymentMethodConfirmation,
  ] = useState(false);
  const [paymentMethodToRemove, setPaymentMethodToRemove] = useState<
    string | null
  >(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveySubscriptionId, setSurveySubscriptionId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationState, setCancellationState] = useState<{
    cancelledSeeker: boolean;
    cancelledAt: string | null;
    hasPreviousSubscription: boolean;
  }>({ cancelledSeeker: false, cancelledAt: null, hasPreviousSubscription: false });
  const searchParams = useSearchParams();

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  // Handle URL params for marketing pre-selection (upgrade flow)
  useEffect(() => {
    const plan = searchParams?.get('plan');
    const upgrade = searchParams?.get('upgrade');

    if (plan && upgrade === 'true') {
      console.log('📦 SUBSCRIPTION: Auto-opening upgrade modal for plan:', plan);

      // Find the plan and open the modal
      const planInfo = SEEKER_SUBSCRIPTION_PLANS.find(p => p.id === plan);
      if (planInfo) {
        setSelectedPlan(planInfo);
        setShowPurchaseModal(true);
        setActiveTab('plans');

        // Clear the marketing preselect cookie
        clearMarketingPreselect();

        // Clear URL params
        const url = new URL(window.location.href);
        url.searchParams.delete('plan');
        url.searchParams.delete('upgrade');
        window.history.replaceState({}, '', url.toString());

        addToast({
          title: 'Upgrade Your Subscription',
          description: `Your selected plan "${planInfo.name}" is ready for checkout.`,
          variant: 'default',
          duration: 5000,
        });
      }
    }
  }, [searchParams, addToast]);

  const loadSubscriptionData = async () => {
    try {
      console.log('Loading subscription data...');

      // Load current subscription
      const subscriptionResponse = await getWithImpersonation(
        '/api/seeker/subscription/current'
      );
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        if (subscriptionData.subscription) {
          setCurrentSubscription({
            id: subscriptionData.subscription.id,
            planId: subscriptionData.subscription.planId,
            status: subscriptionData.subscription.status,
            currentPeriodStart: subscriptionData.subscription.currentPeriodStart || subscriptionData.subscription.createdAt,
            currentPeriodEnd: subscriptionData.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscriptionData.subscription.cancelAtPeriodEnd,
          });
        }
        if (subscriptionData.cancellationState) {
          setCancellationState(subscriptionData.cancellationState);
        }
      }

      // Load payment methods
      const paymentMethodsResponse = await getWithImpersonation(
        '/api/seeker/subscription/payment-methods'
      );
      if (paymentMethodsResponse.ok) {
        const paymentMethodsData = await paymentMethodsResponse.json();
        setPaymentMethods(paymentMethodsData.paymentMethods || []);
      }

      // Load transaction history from GoHighLevel
      const transactionsResponse = await getWithImpersonation(
        '/api/seeker/transactions'
      );
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    // Get plan info and show purchase modal
    const planInfo = SEEKER_SUBSCRIPTION_PLANS.find(
      (plan) => plan.id === planId
    );
    if (planInfo) {
      setSelectedPlan(planInfo);
      setShowPurchaseModal(true);
    } else {
      addToast({
        title: 'Error',
        description: 'Invalid plan selected',
        variant: 'destructive',
      });
    }
  };

  const handleCancelSubscription = async () => {
    // Always show the survey form when canceling
    if (currentSubscription) {
      setIsCancelling(true);
      setSurveySubscriptionId(currentSubscription.id);
      setShowSurvey(true);
    }
  };

  const handleSurveySuccess = async () => {
    // After survey is submitted, proceed with subscription cancellation
    console.log('Survey submitted successfully, proceeding with subscription cancellation...');
    setShowSurvey(false);
    setSurveySubscriptionId(null);

    // Add a small delay to ensure survey is fully closed before showing confirmation
    setTimeout(() => {
      confirmCancelSubscription();
    }, 100);
  };

  const handleSurveyError = () => {
    // Close survey on error, user can try again or cancel
    console.log('Survey submission error');
    setShowSurvey(false);
    setSurveySubscriptionId(null);
    setIsCancelling(false);
  };

  const confirmCancelSubscription = async () => {
    setIsManaging(true);
    try {
      const response = await postWithImpersonation(
        '/api/seeker/subscription/manage',
        {
          action: 'cancel',
        }
      );

      const result = await response.json();

      if (result.success) {
        addToast({
          title: 'Subscription Scheduled for Cancellation',
          description: 'Your subscription will be canceled at the end of the current billing period. You will retain access until then.',
          variant: 'success',
        });
        // Reload subscription data
        loadSubscriptionData();
      } else {
        addToast({
          title: 'Error',
          description: result.error || 'Failed to cancel subscription',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      addToast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setIsManaging(false);
      setIsCancelling(false);
      setShowCancelConfirmation(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setIsManaging(true);
    try {
      const response = await postWithImpersonation(
        '/api/seeker/subscription/manage',
        {
          action: 'reactivate',
        }
      );

      const result = await response.json();

      if (result.success) {
        addToast({
          title: 'Subscription Reactivated',
          description: 'Your subscription has been reactivated. Enjoy your benefits!',
          variant: 'success',
        });
        // Reload subscription data
        loadSubscriptionData();
      } else {
        addToast({
          title: 'Error',
          description: result.error || 'Failed to reactivate subscription',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      addToast({
        title: 'Error',
        description: 'Failed to reactivate subscription',
        variant: 'destructive',
      });
    } finally {
      setIsManaging(false);
    }
  };

  const handleAddPaymentMethod = () => {
    setPaymentMethodFormMode('add');
    setPaymentMethodToUpdate(null);
    // Check if we should return to purchase modal after adding payment method
    if (selectedPlan) {
      setReturnToPurchaseModal(true);
    }
    setShowPaymentMethodChoice(true);
  };

  const handleSeekerAddCard = () => {
    setShowPaymentMethodChoice(false);
    setShowPaymentMethodForm(true);
  };

  const handleSeekerAddPayPal = async () => {
    setIsAddingPayPal(true);
    try {
      const currentUrl = window.location.origin;
      const returnUrl = `${currentUrl}/seeker/subscription/paypal-return`;
      const cancelUrl = `${currentUrl}/seeker/subscription?tab=payment-methods`;

      const response = await postWithImpersonation(
        '/api/payments/create-billing-agreement',
        { userType: 'seeker', returnUrl, cancelUrl, setupOnly: true }
      );

      const result = await response.json();

      if (response.ok && result.success && result.approvalUrl) {
        window.location.href = result.approvalUrl;
      } else {
        throw new Error(result.error || 'Failed to initiate PayPal setup');
      }
    } catch (error) {
      console.error('PayPal setup error:', error);
      addToast({
        title: 'PayPal Setup Failed',
        description: error instanceof Error ? error.message : 'Failed to add PayPal',
        variant: 'destructive',
      });
      setIsAddingPayPal(false);
    }
  };

  const handlePaymentMethodSuccess = () => {
    addToast({
      title: 'Payment Method Added',
      description: 'Your payment method has been added successfully.',
      variant: 'success',
    });
    loadSubscriptionData(); // Reload to show the new payment method
    // Return to purchase modal if needed
    if (returnToPurchaseModal) {
      setShowPaymentMethodForm(false);
      setShowPurchaseModal(true);
    }
  };

  const handlePaymentMethodError = (message: string) => {
    addToast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  };

  const handlePurchaseSuccess = () => {
    addToast({
      title: 'Subscription Activated Successfully!',
      description: 'Your subscription has been activated and is ready to use.',
      variant: 'success',
    });
    loadSubscriptionData(); // Reload to show the new subscription
  };

  const handlePurchaseError = (message: string) => {
    addToast({
      title: 'Purchase Failed',
      description: message,
      variant: 'destructive',
    });
  };

  const handleUpdatePaymentMethod = async (methodId: string) => {
    // Show payment method form for updating
    setPaymentMethodFormMode('update');
    setPaymentMethodToUpdate(methodId);
    setShowPaymentMethodForm(true);

    addToast({
      title: 'Update Payment Method',
      description: 'Please enter your new payment method details.',
      variant: 'success',
    });
  };
  const handleRemovePaymentMethod = (methodId: string) => {
    // Prevent deletion if this is the only payment method
    if (paymentMethods.length <= 1) {
      addToast({
        title: 'Cannot Remove Payment Method',
        description:
          'You must have at least one payment method. Please add another payment method before removing this one.',
        variant: 'destructive',
      });
      return;
    }

    setPaymentMethodToRemove(methodId);
    setShowRemovePaymentMethodConfirmation(true);
  };

  const confirmRemovePaymentMethod = async () => {
    if (!paymentMethodToRemove) return;

    try {
      const response = await deleteWithImpersonation(
        `/api/seeker/subscription/payment-methods?id=${paymentMethodToRemove}`
      );

      const result = await response.json();

      if (result.success) {
        addToast({
          title: 'Payment Method Removed',
          description: result.message,
          variant: 'success',
        });
        loadSubscriptionData(); // Reload to update the list
      } else {
        addToast({
          title: 'Error',
          description: result.error || 'Failed to remove payment method',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error removing payment method:', error);
      addToast({
        title: 'Error',
        description: 'Failed to remove payment method',
        variant: 'destructive',
      });
    } finally {
      setPaymentMethodToRemove(null);
    }
  };

  const handleSetDefaultPaymentMethod = async (methodId: string) => {
    try {
      const response = await putWithImpersonation(
        '/api/seeker/subscription/payment-methods',
        {
          paymentMethodId: methodId,
          action: 'setDefault',
        }
      );

      const result = await response.json();

      if (result.success) {
        addToast({
          title: 'Default Payment Method Updated',
          description: result.message,
          variant: 'success',
        });
        loadSubscriptionData(); // Reload to update the list
      } else {
        addToast({
          title: 'Error',
          description: result.error || 'Failed to set default payment method',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
      addToast({
        title: 'Error',
        description: 'Failed to set default payment method',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await getWithImpersonation(
        `/api/seeker/subscription/invoices/${invoiceId}/download`
      );

      if (response.ok) {
        // Create blob from response
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to download invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      addToast({
        title: 'Failed to download invoice',
        description:
          'Please try again or contact support if the problem persists.',
        variant: 'destructive',
      });
    }
  };

  const getCurrentPlan = () => {
    if (!currentSubscription) return null;
    return SEEKER_SUBSCRIPTION_PLANS.find(
      (plan) => plan.id === currentSubscription.planId
    );
  };

  const getPlansWithCurrentStatus = () => {
    return SEEKER_SUBSCRIPTION_PLANS.map((plan) => ({
      ...plan,
      current: currentSubscription?.planId === plan.id,
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    if (cancellationState.cancelledSeeker) return 'bg-red-100 text-red-800';
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trialing':
        return 'bg-blue-100 text-blue-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    if (cancellationState.cancelledSeeker) return 'Cancelled';
    if (currentSubscription?.cancelAtPeriodEnd) return 'Cancelling';
    if (status === 'past_due') return 'Payment Issue';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const currentPlan = getCurrentPlan();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription</h1>
        <p className="text-gray-600">
          Manage your subscription and billing information
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="current">Current Plan</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="invoices">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Real Jobs. Real Flexibility.
            </h2>
            <h3 className="text-xl font-semibold text-brand-teal mb-4">
              Your Dream Remote Career Starts Here.
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join thousands of moms who've found flexible, legitimate
              work-from-home jobs—without scams or stress!
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getPlansWithCurrentStatus().map((plan) => (
              <SeekerSubscriptionCard
                key={plan.id}
                plan={plan}
                onSubscribe={handleSubscribe}
                onCancel={handleCancelSubscription}
                disabled={isManaging}
                isCancelling={isCancelling}
                hasPreviousSubscription={cancellationState.hasPreviousSubscription}
              />
            ))}
          </div>

          {/* Feature Comparison */}
          <Card className="mt-12">
            <CardHeader>
              <CardTitle>Plan Comparison</CardTitle>
              <CardDescription>
                Compare features across all membership plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Feature</th>
                      <th className="text-center py-3 px-4">Trial</th>
                      <th className="text-center py-3 px-4">Gold</th>
                      <th className="text-center py-3 px-4">VIP Platinum</th>
                      <th className="text-center py-3 px-4">Annual Platinum</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-4">Price</td>
                      <td className="text-center py-3 px-4">$34.99/month</td>
                      <td className="text-center py-3 px-4">$49.99/2 months</td>
                      <td className="text-center py-3 px-4">$79.99/3 months</td>
                      <td className="text-center py-3 px-4">$299/year</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">Free Trial</td>
                      <td className="text-center py-3 px-4">3 days</td>
                      <td className="text-center py-3 px-4">-</td>
                      <td className="text-center py-3 px-4">-</td>
                      <td className="text-center py-3 px-4">-</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">Resume Versions</td>
                      <td className="text-center py-3 px-4">1</td>
                      <td className="text-center py-3 px-4">3</td>
                      <td className="text-center py-3 px-4">Unlimited</td>
                      <td className="text-center py-3 px-4">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">Job Applications</td>
                      <td className="text-center py-3 px-4">Unlimited</td>
                      <td className="text-center py-3 px-4">Unlimited</td>
                      <td className="text-center py-3 px-4">Unlimited</td>
                      <td className="text-center py-3 px-4">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">Support</td>
                      <td className="text-center py-3 px-4">Email</td>
                      <td className="text-center py-3 px-4">Email & Text</td>
                      <td className="text-center py-3 px-4">
                        Email, Text & Phone
                      </td>
                      <td className="text-center py-3 px-4">
                        Email, Text & Phone
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">Free T-shirt</td>
                      <td className="text-center py-3 px-4">-</td>
                      <td className="text-center py-3 px-4">-</td>
                      <td className="text-center py-3 px-4">✓</td>
                      <td className="text-center py-3 px-4">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Why Pay Section */}
          <Card className="shadow-sm border border-gray-100">
            <CardHeader className="bg-gradient-to-r from-brand-teal to-brand-teal-light text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <Heart className="h-5 w-5" />
                <span>Why do I have to pay for this service?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>Quality over Quantity:</strong> We carefully vet every
                  job posting to ensure they&apos;re legitimate, remote-friendly
                  opportunities from real companies—no scams, no MLMs, no
                  &quot;too good to be true&quot; offers.
                </p>
                <p>
                  <strong>Dedicated Support:</strong> Our team provides
                  personalized support to help you succeed in your job search,
                  from resume optimization to interview preparation.
                </p>
                <p>
                  <strong>Exclusive Access:</strong> Many of our job postings
                  are exclusive to AmperTalent members, giving you access to
                  opportunities you won&apos;t find anywhere else.
                </p>
                <p>
                  <strong>Community & Resources:</strong> Join a supportive
                  community of working moms and access valuable resources,
                  webinars, and career development tools.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Testimonials Section */}
          <Card className="shadow-sm border border-gray-100">
            <CardHeader className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Job Seeker Testimonials</span>
              </CardTitle>
              <CardDescription className="text-white/90">
                Hear from moms who found their dream remote jobs through
                AmperTalent
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 italic mb-2">
                      &quot;I found my perfect work-from-home job within 2 weeks
                      of joining AmperTalent. The quality of jobs here is amazing
                      - no scams, just real opportunities!&quot;
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      - Sarah M., Virtual Assistant
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 italic mb-2">
                      &quot;As a single mom, I needed flexibility. AmperTalent
                      helped me find a remote marketing role that lets me be
                      present for my kids while building my career.&quot;
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      - Jennifer L., Marketing Specialist
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 italic mb-2">
                      &quot;The support team at AmperTalent is incredible. They
                      helped me optimize my resume and I landed three interviews
                      in my first month!&quot;
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      - Maria R., Customer Service Rep
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 italic mb-2">
                      &quot;I was skeptical about paying for a job site, but
                      AmperTalent paid for itself within the first week. The jobs
                      here are legitimate and well-paying.&quot;
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      - Amanda K., Content Writer
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="current" className="space-y-6">
          {currentSubscription && currentPlan ? (
            <div className="space-y-6">
              {/* Current Plan Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Crown className="h-5 w-5 text-purple-600" />
                        <span>{currentPlan.name} Plan</span>
                      </CardTitle>
                      <CardDescription>
                        {currentPlan.description}
                      </CardDescription>
                    </div>
                    <Badge
                      className={getStatusColor(currentSubscription.status)}
                    >
                      {getStatusLabel(currentSubscription.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {cancellationState.cancelledSeeker ? (
                    <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <p className="text-red-800 font-medium">
                          Your account has been cancelled.
                        </p>
                      </div>
                      <p className="text-red-700 text-sm mt-1">
                        Please select a plan to reactivate your membership and regain access to all features.
                      </p>
                      <Button
                        className="mt-3"
                        onClick={() => setActiveTab('plans')}
                      >
                        View Plans
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid md:grid-cols-3 gap-6">
                        <div>
                          <h4 className="font-semibold mb-2">Billing Cycle</h4>
                          <p className="text-gray-600">
                            ${currentPlan.price} / {currentPlan.billing}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Current Period</h4>
                          <p className="text-gray-600">
                            {formatDate(currentSubscription.currentPeriodStart)} -{' '}
                            {formatDate(currentSubscription.currentPeriodEnd)}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">
                            {currentSubscription.cancelAtPeriodEnd ? 'Access Ends' : 'Next Billing Date'}
                          </h4>
                          <p className="text-gray-600">
                            {currentSubscription.cancelAtPeriodEnd
                              ? 'Canceled - expires ' +
                              formatDate(currentSubscription.currentPeriodEnd)
                              : formatDate(currentSubscription.currentPeriodEnd)}
                          </p>
                        </div>
                      </div>

                      {currentSubscription.status === 'past_due' && (
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <p className="text-yellow-800 font-medium">
                              Payment failed — we&apos;ll retry automatically
                            </p>
                          </div>
                          <p className="text-yellow-700 text-sm mt-1">
                            There was an issue with your last payment. We&apos;ll attempt to charge your payment method again.
                            Please ensure your payment information is up to date to avoid interruption.
                          </p>
                        </div>
                      )}

                      {currentSubscription.cancelAtPeriodEnd && (
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <p className="text-yellow-800 font-medium">
                              Your subscription will be canceled on{' '}
                              {formatDate(currentSubscription.currentPeriodEnd)}
                            </p>
                          </div>
                          <p className="text-yellow-700 text-sm mt-1">
                            You&apos;ll continue to have access to premium features
                            until then.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Plan Features */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Plan Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {currentPlan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Plan Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Plan Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button
                      onClick={() => setActiveTab('plans')}
                      disabled={isManaging}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                    {currentSubscription.cancelAtPeriodEnd ? (
                      <Button
                        variant="outline"
                        onClick={handleReactivateSubscription}
                        disabled={isManaging}
                        className="text-green-600 hover:text-green-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reactivate Subscription
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleCancelSubscription}
                        disabled={isManaging || isCancelling}
                        className="text-red-600 hover:text-red-700"
                      >
                        {isCancelling ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Cancel Subscription
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Active Subscription
                </h3>
                <p className="text-gray-600 mb-4">
                  You don&apos;t have a plan. Upgrade to unlock
                  premium features.
                </p>
                <Button onClick={() => setActiveTab('plans')}>
                  View Plans
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <span>Payment Methods</span>
              </CardTitle>
              <CardDescription>
                Manage your payment methods for subscription payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethods.length > 0 ? (
                <div className="space-y-4">
                  {paymentMethods.map((method) => {
                    const isPayPal = method.brand.toLowerCase() === 'paypal';
                    return (
                      <div
                        key={method.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {isPayPal ? (
                            <svg className="h-5 w-5 text-[#003087]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.774.774 0 0 1 .763-.648h6.39c2.146 0 3.783.567 4.861 1.684 1.005 1.04 1.48 2.513 1.412 4.384-.017.458-.088.911-.214 1.345a7.29 7.29 0 0 1-.713 1.79c-.333.554-.733 1.048-1.209 1.475a5.557 5.557 0 0 1-1.679 1.075c-.625.258-1.309.43-2.037.515-.39.046-.813.068-1.254.068H9.108a.774.774 0 0 0-.763.648l-.975 5.527a.773.773 0 0 1-.762.648h-.532" />
                            </svg>
                          ) : (
                            <CreditCard className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <p className="font-medium">
                              {isPayPal ? 'PayPal' : method.brand} {isPayPal ? method.last4 : `•••• ${method.last4}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {isPayPal ? 'Linked Account' : `Expires ${method.expiryMonth.toString().padStart(2, '0')}/${method.expiryYear}`}
                              {method.isDefault && (
                                <span className="ml-2 text-blue-600 font-medium">
                                  • Default
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!method.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleSetDefaultPaymentMethod(method.id)
                              }
                            >
                              Set as Default
                            </Button>
                          )}
                          {/* PayPal cannot be updated like cards - only removed and re-added */}
                          {!isPayPal && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdatePaymentMethod(method.id)}
                            >
                              Update
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemovePaymentMethod(method.id)}
                            disabled={paymentMethods.length <= 1}
                            title={
                              paymentMethods.length <= 1
                                ? 'Cannot remove the only payment method'
                                : 'Remove payment method'
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <Button className="w-full" onClick={handleAddPaymentMethod}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add New Payment Method
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Payment Methods
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Add a payment method to manage your subscription payments
                  </p>
                  <Button onClick={handleAddPaymentMethod}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  View your subscription payment history
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await getWithImpersonation(
                        '/api/seeker/transactions/export'
                      );
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `ampertalent-seeker-transactions-${new Date().toISOString().split('T')[0]
                          }.csv`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        addToast({
                          title: 'Export Successful',
                          description:
                            'Your transaction history has been downloaded as CSV.',
                          variant: 'success',
                        });
                      } else {
                        throw new Error('Export failed');
                      }
                    } catch (error) {
                      addToast({
                        title: 'Export Failed',
                        description:
                          'Failed to export transaction history. Please try again.',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">
                            {transaction.description || 'Subscription Payment'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {transaction.date
                              ? formatDate(transaction.date)
                              : 'Unknown date'}
                            {transaction.paymentMethod?.last4 && (
                              <span className="ml-2">
                                • {transaction.paymentMethod.brand || 'Card'}{' '}
                                ••••{transaction.paymentMethod.last4}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium">
                            $
                            {transaction.amount
                              ? typeof transaction.amount === 'number'
                                ? transaction.amount.toFixed(2)
                                : parseFloat(transaction.amount).toFixed(2)
                              : '0.00'}{' '}
                            {transaction.currency || 'USD'}
                          </p>
                          <Badge
                            className={
                              transaction.status === 'succeeded' ||
                                transaction.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : transaction.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }
                          >
                            {transaction.status === 'succeeded'
                              ? 'Paid'
                              : transaction.status
                                ? transaction.status.charAt(0).toUpperCase() +
                                transaction.status.slice(1)
                                : 'Unknown'}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await getWithImpersonation(
                                `/api/seeker/transactions/invoice/${transaction.id}`
                              );
                              if (response.ok) {
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `ampertalent-subscription-${transaction.id
                                  .slice(-8)
                                  .toUpperCase()}.pdf`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                                addToast({
                                  title: 'PDF Downloaded',
                                  description:
                                    'Invoice PDF has been downloaded successfully.',
                                  variant: 'success',
                                });
                              } else {
                                throw new Error('Download failed');
                              }
                            } catch (error) {
                              addToast({
                                title: 'Download Failed',
                                description:
                                  'Failed to download invoice. Please try again.',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          Invoice PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No payment history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PaymentMethodForm
        isOpen={showPaymentMethodForm}
        onClose={() => {
          setShowPaymentMethodForm(false);
          setPaymentMethodToUpdate(null);
          setPaymentMethodFormMode('add');
          // If we were returning to purchase modal, reset that state
          if (returnToPurchaseModal) {
            setReturnToPurchaseModal(false);
          }
        }}
        onSuccess={handlePaymentMethodSuccess}
        onError={handlePaymentMethodError}
        userType="seeker"
        mode={paymentMethodFormMode}
        paymentMethodId={paymentMethodToUpdate || undefined}
      />

      {/* Payment Method Choice Modal */}
      <Dialog open={showPaymentMethodChoice} onOpenChange={setShowPaymentMethodChoice}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Choose how you&apos;d like to pay for your subscription
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="w-full h-16 flex items-center justify-start gap-4 px-6"
              onClick={handleSeekerAddCard}
            >
              <CreditCard className="h-6 w-6 text-blue-600" />
              <div className="text-left">
                <p className="font-medium">Credit or Debit Card</p>
                <p className="text-sm text-gray-500">Visa, Mastercard, Amex, Discover</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full h-16 flex items-center justify-start gap-4 px-6"
              onClick={() => {
                setShowPaymentMethodChoice(false);
                handleSeekerAddPayPal();
              }}
              disabled={isAddingPayPal}
            >
              {isAddingPayPal ? (
                <LoadingSpinner className="h-6 w-6" />
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 3.72a.766.766 0 01.757-.643h6.437c2.12 0 3.754.533 4.858 1.585 1.134 1.08 1.47 2.558 1.001 4.39-.628 2.45-2.087 4.165-4.213 4.96-1.013.38-2.126.57-3.306.57h-1.22a.766.766 0 00-.757.643l-.925 5.37a.641.641 0 01-.633.54l-.867.002z" fill="#003087" />
                  <path d="M19.514 7.612c-.628 2.45-2.087 4.165-4.213 4.96-1.013.38-2.126.57-3.306.57h-1.22a.766.766 0 00-.757.643l-1.355 7.87a.533.533 0 00.526.615h3.377a.638.638 0 00.63-.535l.674-3.923a.766.766 0 01.756-.643h1.22c1.18 0 2.293-.19 3.306-.57 2.126-.795 3.585-2.51 4.213-4.96.422-1.646.152-2.977-.759-3.962a4.85 4.85 0 00-1.092-.865 5.842 5.842 0 01-2 .8z" fill="#0070E0" />
                </svg>
              )}
              <div className="text-left">
                <p className="font-medium">PayPal</p>
                <p className="text-sm text-gray-500">Link your PayPal account</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedPlan && (
        <SeekerSubscriptionPurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          planInfo={selectedPlan}
          onSuccess={handlePurchaseSuccess}
          onError={handlePurchaseError}
          onAddPaymentMethod={() => setShowPaymentMethodForm(true)}
          onAddPaymentMethodWithReturn={() => {
            setShowPurchaseModal(false);
            handleAddPaymentMethod();
          }}
        />
      )}

      <CancellationSurveyForm
        isOpen={showSurvey}
        subscriptionId={surveySubscriptionId || ''}
        onSuccess={handleSurveySuccess}
        onError={handleSurveyError}
        onClose={() => {
          setShowSurvey(false);
          setSurveySubscriptionId(null);
          setIsCancelling(false);
        }}
      />

      <ConfirmationDialog
        isOpen={showCancelConfirmation}
        onClose={() => setShowCancelConfirmation(false)}
        onConfirm={confirmCancelSubscription}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period."
        confirmText="Cancel Subscription"
        cancelText="Keep Subscription"
        variant="destructive"
        isLoading={isManaging}
      />

      <ConfirmationDialog
        isOpen={showRemovePaymentMethodConfirmation}
        onClose={() => {
          setShowRemovePaymentMethodConfirmation(false);
          setPaymentMethodToRemove(null);
        }}
        onConfirm={confirmRemovePaymentMethod}
        title="Remove Payment Method"
        description="Are you sure you want to remove this payment method? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
