'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  SeekerSubscriptionPlan,
  SEEKER_SUBSCRIPTION_PLANS,
} from '@/lib/subscription-plans';
import {
  Check,
  Star,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Shield,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

interface SeekerSubscriptionCardProps {
  plan: SeekerSubscriptionPlan;
  onSubscribe: (planId: string) => Promise<void>;
  onCancel?: () => Promise<void>;
  onReactivate?: () => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  isCancelling?: boolean;
  hasPreviousSubscription?: boolean;
  cancelAtPeriodEnd?: boolean;
}

export function SeekerSubscriptionCard({
  plan,
  onSubscribe,
  onCancel,
  onReactivate,
  isLoading = false,
  disabled = false,
  isCancelling = false,
  hasPreviousSubscription = false,
  cancelAtPeriodEnd = false,
}: SeekerSubscriptionCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      await onSubscribe(plan.id);
    } catch (error) {
      console.error('Error subscribing:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;

    setIsProcessing(true);
    try {
      await onCancel();
    } catch (error) {
      console.error('Error canceling subscription:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async () => {
    if (!onReactivate) return;

    setIsProcessing(true);
    try {
      await onReactivate();
    } catch (error) {
      console.error('Error reactivating subscription:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const Icon = plan.icon;

  return (
    <Card
      className={`relative transition-all duration-200 ${plan.popular
        ? 'border-2 border-yellow-500 shadow-lg scale-105'
        : plan.current
          ? 'border-2 border-green-500'
          : `border-2 ${plan.borderColor} hover:shadow-md`
        }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-yellow-500 text-white px-3 py-1">
            <Star className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      {plan.current && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-green-500 text-white px-3 py-1">
            <Check className="h-3 w-3 mr-1" />
            Current Plan
          </Badge>
        </div>
      )}

      <CardHeader className={`${plan.bgColor} rounded-t-lg text-center pb-4`}>
        <div
          className={`w-16 h-16 ${plan.bgColor} rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${plan.borderColor}`}
        >
          <Icon className={`h-8 w-8 ${plan.color}`} />
        </div>
        <CardTitle className="text-xl font-bold text-gray-900">
          {plan.name}
        </CardTitle>
        <div className="space-y-1">
          <div className="text-3xl font-bold text-gray-900">${plan.price}</div>
          <div className="text-sm text-gray-600">
            ${plan.price} / {plan.billing} to post{' '}
            {plan.resumeLimit >= 999 || plan.resumeLimit === -1
              ? 'unlimited resumes'
              : `${plan.resumeLimit} resume${plan.resumeLimit !== 1 ? 's' : ''}`}{' '}
            {plan.trialDays ? 'per period' : `for ${plan.duration} days`}
          </div>
          {plan.trialDays && (
            <div className="text-sm font-medium text-green-600">
              {plan.trialDays}-day free trial
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        <div className="space-y-3">

          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}

          {plan.includes && plan.includes.length > 0 && (
            <div className="border-t pt-3">
              {plan.includes.map((item, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-purple-700 font-medium">
                    Free "Get The Job Done! Hire A Mom" T-shirt
                  </span>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-1">
                (US Residents only for t-shirts. Please put *t-shirt size* in
                the "Notes" on your order)
              </p>
            </div>
          )}

          <div className="border-t pt-3">
            {plan.support.map((support, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="flex space-x-1">
                  {support.includes('Email') && (
                    <Mail className="h-4 w-4 text-blue-500" />
                  )}
                  {support.includes('Text') && (
                    <MessageSquare className="h-4 w-4 text-green-500" />
                  )}
                  {support.includes('Phone') && (
                    <Phone className="h-4 w-4 text-purple-500" />
                  )}
                </div>
                <span className="text-sm text-gray-700">{support}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          {plan.current ? (
            <div className="space-y-3">
              <Button variant="outline" className="w-full" disabled>
                <Check className="h-4 w-4 mr-2" />
                {cancelAtPeriodEnd ? 'Cancelling at Period End' : 'Current Plan'}
              </Button>
              {cancelAtPeriodEnd ? (
                <Button
                  variant="outline"
                  className="w-full text-green-600 hover:text-green-700"
                  onClick={handleReactivate}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reactivate Subscription
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full text-blue-600 hover:text-blue-700"
                  onClick={handleCancel}
                  disabled={isProcessing || isCancelling}
                >
                  {isProcessing || isCancelling ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {isCancelling ? 'Cancelling...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Subscription
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : plan.trialDays && hasPreviousSubscription ? (
            <div className="space-y-2">
              <Button
                className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
                disabled
              >
                Free Trial — New Customers Only
              </Button>
              <p className="text-xs text-center text-gray-500">
                The 3-day free trial is only available for first-time subscribers.
              </p>
            </div>
          ) : (
            <Button
              className={`w-full ${plan.popular
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : 'bg-brand-teal hover:bg-brand-teal/90 text-white'
                }`}
              onClick={handleSubscribe}
              disabled={disabled || isLoading || isProcessing}
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {plan.trialDays ? 'Start Free Trial' : 'Choose Plan'}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center gap-1 w-1/2 justify-center">
              <Shield className="h-4 w-4 mr-1" />
              <span className="w-1/2 text-center">Secure Payment</span>
            </span>
            <span className="flex items-center gap-1 w-1/2 justify-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span className="w-1/2 text-center">Cancel Anytime</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
