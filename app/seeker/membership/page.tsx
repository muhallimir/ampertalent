'use client';

import React, { useState, useEffect } from 'react';
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
import { SubscriptionUpgrade } from '@/components/seeker/SubscriptionUpgrade';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSeekerSubscription } from '@/hooks/useSeekerSubscription';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SEEKER_SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';
import {
  Crown,
  Star,
  Diamond,
  Trophy,
  Check,
  FileText,
  Mail,
  Phone,
  MessageSquare,
  Users,
  Heart,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function SeekerMembership() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { subscription, isLoading: subscriptionLoading } =
    useSeekerSubscription();
  const searchParams = useSearchParams();
  const [showUpgradeInterface, setShowUpgradeInterface] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    // Check for checkout success parameter
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      setCheckoutSuccess(true);
      // Clear the parameter after showing success message
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const handleUpgradeComplete = () => {
    setCheckoutSuccess(true);
    setShowUpgradeInterface(false);
  };

  // Show loading state
  if (profileLoading || subscriptionLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // Get current membership info
  const currentPlan = subscription?.membershipPlan || 'none';
  const membershipExpiresAt = subscription?.membershipExpiresAt;
  const isOnTrial = subscription?.isOnTrial || false;

  // If user wants to upgrade/change subscription, show the upgrade interface
  if (showUpgradeInterface) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setShowUpgradeInterface(false)}
            className="mb-4"
          >
            ← Back to Membership Overview
          </Button>
        </div>
        <SubscriptionUpgrade
          currentPlan={currentPlan}
          membershipExpiresAt={membershipExpiresAt}
          isOnTrial={isOnTrial}
          onUpgradeComplete={handleUpgradeComplete}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Success Message */}
      {checkoutSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Payment Successful!</p>
                <p className="text-sm">
                  Your subscription has been activated. Welcome to HireMyMom!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Membership Status */}
      {currentPlan !== 'none' && (
        <Card className="border-l-4 border-l-brand-teal">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Your Current Membership</span>
              </div>
              <Button
                onClick={() => setShowUpgradeInterface(true)}
                variant="outline"
                className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
              >
                Upgrade Plan
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {SEEKER_SUBSCRIPTION_PLANS.find(
                    (plan) => plan.id === currentPlan
                  )?.name || 'Current Plan'}
                </h3>
                <p className="text-gray-600">
                  $
                  {SEEKER_SUBSCRIPTION_PLANS.find(
                    (plan) => plan.id === currentPlan
                  )?.price || 0}{' '}
                  per{' '}
                  {SEEKER_SUBSCRIPTION_PLANS.find(
                    (plan) => plan.id === currentPlan
                  )?.billing || 'month'}
                </p>
                {isOnTrial && (
                  <Badge variant="secondary" className="mt-2">
                    Free Trial Active
                  </Badge>
                )}
              </div>
              <div className="text-right">
                {membershipExpiresAt && (
                  <p className="text-sm text-gray-500">
                    {isOnTrial ? 'Trial ends' : 'Renews'}:{' '}
                    {new Date(membershipExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          {currentPlan === 'none'
            ? 'Real Jobs. Real Flexibility.'
            : 'Manage Your Membership'}
        </h1>
        <h2 className="text-2xl font-semibold text-brand-teal">
          {currentPlan === 'none'
            ? 'Your Dream Remote Career Starts Here.'
            : 'Upgrade for More Opportunities'}
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          {currentPlan === 'none'
            ? "Join thousands of moms who've found flexible, legitimate work-from-home jobs—without scams or stress!"
            : 'Upgrade your plan to access more features and increase your job search success.'}
        </p>
        <div className="flex justify-center space-x-4">
          <Button
            asChild
            variant="outline"
            className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
          >
            <Link href="#testimonials">
              <Users className="h-4 w-4 mr-2" />
              Read our job seeker&apos;s testimonials
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-brand-coral text-brand-coral hover:bg-brand-coral hover:text-white"
          >
            <Link href="#why-pay">
              <Heart className="h-4 w-4 mr-2" />
              Why do I have to pay for this service?
            </Link>
          </Button>
        </div>
      </div>

      {/* Membership Plans - Show only if no current plan or user wants to see all plans */}
      {currentPlan === 'none' && (
        <div>
          <div className="text-center mb-6">
            <Button
              onClick={() => setShowUpgradeInterface(true)}
              className="bg-brand-teal hover:bg-brand-teal/90 text-white px-8 py-3"
            >
              Choose Your Membership Plan
            </Button>
          </div>

          {/* Quick Plan Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SEEKER_SUBSCRIPTION_PLANS.map((plan) => {
              const IconComponent = plan.icon;
              return (
                <Card
                  key={plan.id}
                  className={`relative shadow-lg hover:shadow-xl transition-all duration-300 ${
                    plan.popular ? 'ring-2 ring-yellow-500 scale-105' : ''
                  } ${plan.borderColor} border-2`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-yellow-500 text-white px-4 py-1">
                        <Star className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader
                    className={`${plan.bgColor} rounded-t-lg text-center pb-4`}
                  >
                    <div
                      className={`w-16 h-16 ${plan.bgColor} rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${plan.borderColor}`}
                    >
                      <IconComponent className={`h-8 w-8 ${plan.color}`} />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      {plan.name}
                    </CardTitle>
                    <div className="space-y-1">
                      <div className="text-3xl font-bold text-gray-900">
                        ${plan.price}
                      </div>
                      <div className="text-sm text-gray-600">
                        per {plan.billing}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="font-semibold text-gray-900 border-b pb-2">
                        {typeof plan.resumeLimit === 'number' &&
                        plan.resumeLimit === -1
                          ? 'Unlimited Resumes'
                          : plan.resumeLimit}
                      </div>

                      {plan.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => setShowUpgradeInterface(true)}
                      className={`w-full ${
                        plan.popular
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          : 'bg-brand-teal hover:bg-brand-teal/90 text-white'
                      }`}
                    >
                      {plan.trialDays ? 'Start Free Trial' : 'Choose Plan'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Why Pay Section */}
      <Card id="why-pay" className="shadow-sm border border-gray-100">
        <CardHeader className="bg-gradient-to-r from-brand-teal to-brand-teal-light text-white rounded-t-lg">
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5" />
            <span>Why do I have to pay for this service?</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>Quality over Quantity:</strong> We carefully vet every job
              posting to ensure they&apos;re legitimate, remote-friendly
              opportunities from real companies—no scams, no MLMs, no &quot;too
              good to be true&quot; offers.
            </p>
            <p>
              <strong>Dedicated Support:</strong> Our team provides personalized
              support to help you succeed in your job search, from resume
              optimization to interview preparation.
            </p>
            <p>
              <strong>Exclusive Access:</strong> Many of our job postings are
              exclusive to HireMyMom members, giving you access to opportunities
              you won&apos;t find anywhere else.
            </p>
            <p>
              <strong>Community & Resources:</strong> Join a supportive
              community of working moms and access valuable resources, webinars,
              and career development tools.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Testimonials Section */}
      <Card id="testimonials" className="shadow-sm border border-gray-100">
        <CardHeader className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white rounded-t-lg">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Job Seeker Testimonials</span>
          </CardTitle>
          <CardDescription className="text-white/90">
            Hear from moms who found their dream remote jobs through HireMyMom
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 italic mb-2">
                  &quot;I found my perfect work-from-home job within 2 weeks of
                  joining HireMyMom. The quality of jobs here is amazing - no
                  scams, just real opportunities!&quot;
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  - Sarah M., Virtual Assistant
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 italic mb-2">
                  &quot;As a single mom, I needed flexibility. HireMyMom helped
                  me find a remote marketing role that lets me be present for my
                  kids while building my career.&quot;
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  - Jennifer L., Marketing Specialist
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 italic mb-2">
                  &quot;The support team at HireMyMom is incredible. They helped
                  me optimize my resume and I landed three interviews in my
                  first month!&quot;
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  - Maria R., Customer Service Rep
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 italic mb-2">
                  &quot;I was skeptical about paying for a job site, but
                  HireMyMom paid for itself within the first week. The jobs here
                  are legitimate and well-paying.&quot;
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  - Amanda K., Content Writer
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      {currentPlan === 'none' && (
        <div className="text-center space-y-4 bg-gradient-to-r from-brand-teal to-brand-coral rounded-lg p-8 text-white">
          <h3 className="text-2xl font-bold">
            Ready to Start Your Remote Career Journey?
          </h3>
          <p className="text-lg opacity-90">
            Join thousands of moms who have found flexible, legitimate
            work-from-home opportunities.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              onClick={() => setShowUpgradeInterface(true)}
              className="bg-white text-brand-teal hover:bg-gray-100"
            >
              Choose Your Plan
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-brand-teal"
            >
              <Link href="/seeker/jobs">Browse Available Jobs</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
