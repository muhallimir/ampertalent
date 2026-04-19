'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useImpersonation } from '@/hooks/useImpersonation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Skeleton } from '@/components/ui/skeleton';
import { UserProfilePicture } from '@/components/common/UserProfilePicture';
import { useToast } from '@/components/ui/toast';
import {
  User,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  Search,
  Filter,
  Calendar,
  Mail,
  Phone,
  FileText,
  Award,
  Clock,
  MessageSquare,
  ExternalLink,
  CreditCard,
  Receipt,
  ShoppingCart,
} from 'lucide-react';
import { SEEKER_SUBSCRIPTION_PLANS, getPlanByMembershipPlan } from '@/lib/subscription-plans';

interface JobSeekerSubscription {
  id: string;
  plan: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  legacyId: string | null;
}

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  authnetPaymentProfileId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SeekerTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  date: string;
  paymentMethod: { type: string; last4?: string; brand?: string };
  ghlTransactionId?: string | null;
  source: string;
}

interface JobSeeker {
  userId: string;
  headline: string | null;
  aboutMe: string | null;
  availability: string | null;
  skills: string[];
  resumeUrl: string | null;
  resumeLastUploaded: string | null;
  salaryExpectations: string | null;
  membershipPlan: string;
  membershipExpiresAt: string | null;
  resumeLimit: number;
  resumesUsed: number;
  resumeCredits: number;
  isOnTrial: boolean;
  isSuspended: boolean;
  cancelledSeeker: boolean;
  cancelledAt: string | null;
  pendingSignup: { createdAt: string; selectedPlan: string } | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    profilePictureUrl: string | null;
    resolvedProfilePictureUrl: string | null;
    legacyId: string | null;
  };
  subscriptions: JobSeekerSubscription[];
  paymentMethods: PaymentMethod[];
  resumes: Array<{
    id: string;
    filename: string;
    uploadedAt: string;
  }>;
  _count: {
    applications: number;
  };
  hireCount: number;
  lastActiveDate: string | null;
  transactions?: SeekerTransaction[];
}

interface PaginationData {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

// Helper function to truncate email addresses
const truncateEmail = (email: string, maxLength: number = 25) => {
  if (email.length <= maxLength) {
    return email;
  }

  const [localPart, domain] = email.split('@');

  // If domain is too long, truncate it
  if (domain.length > maxLength / 2) {
    const truncatedDomain = domain.slice(0, Math.floor(maxLength / 2) - 3) + '...';
    return `${localPart}@${truncatedDomain}`;
  }

  // If local part is too long, truncate it
  const availableLength = maxLength - domain.length - 1; // -1 for @ symbol
  if (localPart.length > availableLength) {
    const truncatedLocal = localPart.slice(0, availableLength - 3) + '...';
    return `${truncatedLocal}@${domain}`;
  }

  return email;
};

function getPlanPriceDisplay(membershipPlan: string, subscriptions?: JobSeekerSubscription[]): string {
  let plan = SEEKER_SUBSCRIPTION_PLANS.find(p => p.membershipPlan === membershipPlan);
  // Fallback: if membershipPlan is 'none', use the latest subscription's plan
  if (!plan && subscriptions?.length) {
    plan = SEEKER_SUBSCRIPTION_PLANS.find(p => p.membershipPlan === subscriptions[0].plan);
  }
  return (plan?.price ?? 0).toFixed(2);
}

function SeekerCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-30" />
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            <div className="flex items-center space-x-4">
              <div className="text-center space-y-1">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="text-center space-y-1">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="text-center space-y-1">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SeekerListSkeletons() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <SeekerCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function AdminSeekersPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startImpersonation } = useImpersonation();
  const [seekers, setSeekers] = useState<JobSeeker[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
    currentPage: 1,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeeker, setSelectedSeeker] = useState<JobSeeker | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    membershipPlan: 'all',
    includeNoPlan: false,
  });
  const [isSearching, setIsSearching] = useState(false);
  const hasLoadedOnce = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [membershipForm, setMembershipForm] = useState({
    membershipPlan: 'none',
    membershipExpiresAt: '',
    notes: '',
  });
  const { addToast } = useToast();
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [chargeResult, setChargeResult] = useState<any>(null);
  const [cancellingSubscriptionId, setCancellingSubscriptionId] = useState<string | null>(null);
  const [reactivatingSubscriptionId, setReactivatingSubscriptionId] = useState<string | null>(null);
  const [reactivateConfirm, setReactivateConfirm] = useState<{ subscriptionId: string; currentPeriodEnd: string | null } | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<{ subscriptionId: string; currentPeriodEnd: string | null } | null>(null);
  const [cancelDate, setCancelDate] = useState<string>('');

  // Use a single effect with a stable callback to avoid double-triggers
  const loadSeekersRef = useRef<(page: number) => Promise<void>>();

  const loadSeekers = useCallback(async (page: number) => {
    try {
      if (hasLoadedOnce.current) {
        setIsSearching(true);
      } else {
        setIsLoading(true);
      }

      const offset = (page - 1) * pagination.limit;
      const queryParams = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
      });

      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status && filters.status !== 'all')
        queryParams.append('status', filters.status);
      if (filters.membershipPlan && filters.membershipPlan !== 'all')
        queryParams.append('membershipPlan', filters.membershipPlan);
      if (!filters.includeNoPlan)
        queryParams.append('excludeNoPlan', 'true');

      const response = await fetch(`/api/admin/seekers?${queryParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch seekers');
      }

      const data = await response.json();
      setSeekers(data.seekers || []);

      const totalPages = Math.ceil(data.pagination.total / pagination.limit);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination.total,
        offset: data.pagination.offset,
        hasMore: data.pagination.hasMore,
        currentPage: page,
        totalPages,
      }));
    } catch (error) {
      console.error('Error loading seekers:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load seekers',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsSearching(false);
      hasLoadedOnce.current = true;
    }
  }, [filters.search, filters.status, filters.membershipPlan, filters.includeNoPlan, pagination.limit]);

  useEffect(() => {
    loadSeekers(pagination.currentPage);
  }, [loadSeekers, pagination.currentPage]);

  // Auto-open seeker details modal when ?open=<userId> is present (e.g. linked from transactions tab)
  useEffect(() => {
    const openUserId = searchParams?.get('open');
    if (!openUserId) return;
    // Fetch seeker and open modal
    fetch(`/api/admin/seekers/${openUserId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.seeker) {
          handleSeekerClick(data.seeker);
        }
      })
      .catch(() => {/* silent fail */ });
    // Clean up the URL param without triggering a navigation
    const url = new URL(window.location.href);
    url.searchParams.delete('open');
    window.history.replaceState({}, '', url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    // Reset page and update filter in one go to avoid a double useEffect trigger
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      handleFilterChange('search', value);
    }, 300);
  };

  // Lazy-load full seeker details (subscriptions + paymentMethods) when dialog opens
  const handleSeekerClick = async (seeker: JobSeeker) => {
    setSelectedSeeker(seeker);
    setMembershipForm({
      membershipPlan: seeker.membershipPlan,
      membershipExpiresAt: seeker.membershipExpiresAt
        ? new Date(seeker.membershipExpiresAt).toISOString().split('T')[0]
        : '',
      notes: '',
    });
    setIsDialogOpen(true);
    setChargeResult(null);

    // Fetch full details lazily
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/seekers/${seeker.userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSeeker(data.seeker);
      }
    } catch (e) {
      console.error('Failed to load seeker detail', e);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSuspendSeeker = async (seekerId: string, suspend: boolean) => {
    try {
      // Add user to updating set
      setUpdatingUsers((prev) => new Set(prev).add(seekerId));

      const response = await fetch('/api/admin/seekers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seekerId,
          action: 'suspend',
          isSuspended: suspend,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update seeker status');
      }

      const data = await response.json();

      // Update the seeker in the list
      setSeekers((prev) =>
        prev.map((seeker) =>
          seeker.userId === seekerId
            ? { ...seeker, isSuspended: suspend }
            : seeker
        )
      );

      addToast({
        title: 'Success',
        description: `Seeker ${suspend ? 'suspended' : 'reactivated'
          } successfully`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating seeker status:', error);
      addToast({
        title: 'Error',
        description: 'Failed to update seeker status',
        variant: 'destructive',
      });
    } finally {
      // Remove user from updating set
      setUpdatingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(seekerId);
        return newSet;
      });
    }
  };

  const handleUpdateMembership = async () => {
    if (!selectedSeeker) return;

    try {
      // Add user to updating set
      setUpdatingUsers((prev) => new Set(prev).add(selectedSeeker.userId));

      const response = await fetch('/api/admin/seekers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seekerId: selectedSeeker.userId,
          action: 'updateMembership',
          membershipData: {
            membershipPlan: membershipForm.membershipPlan,
            // membershipExpiresAt omitted — expiry is system-managed, not admin-overridable
            membershipExpiresAt: null,
          },
          notes: membershipForm.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update membership');
      }

      const data = await response.json();

      // Refresh the seeker data
      loadSeekers(pagination.currentPage);

      addToast({
        title: 'Success',
        description: 'Membership updated successfully',
        variant: 'default',
      });

      setIsDialogOpen(false);
      setSelectedSeeker(null);
      setMembershipForm({
        membershipPlan: 'none',
        membershipExpiresAt: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error updating membership:', error);
      addToast({
        title: 'Error',
        description: 'Failed to update membership',
        variant: 'destructive',
      });
    } finally {
      // Remove user from updating set
      if (selectedSeeker) {
        setUpdatingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(selectedSeeker.userId);
          return newSet;
        });
      }
    }
  };

  const handleImpersonateSeeker = async (seeker: JobSeeker) => {
    if (!user?.id) return;

    setIsImpersonating(true);

    try {
      const result = await startImpersonation(user.id, {
        id: seeker.user.id,
        clerkUserId: seeker.userId,
        name: seeker.user.name,
        email: seeker.user.email,
        role: 'seeker' as const,
        headline: seeker.headline || undefined,
      });

      if (!result.success) {
        addToast({
          title: 'Error',
          description: result.error || 'Failed to start impersonation',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Impersonation Started',
        description: `Now viewing as ${seeker.user.name}`,
        variant: 'default',
      });

      setIsDialogOpen(false);
      setSelectedSeeker(null);

      // Navigate to seeker dashboard
      router.push('/seeker/dashboard');
    } catch (error) {
      console.error('Impersonation error:', error);
      addToast({
        title: 'Error',
        description: 'Failed to start impersonation',
        variant: 'destructive',
      });
    } finally {
      setIsImpersonating(false);
    }
  };

  const toLocalDateInputValue = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleCancelSubscription = (subscriptionId: string, currentPeriodEnd: string | null) => {
    const initialDate = currentPeriodEnd
      ? toLocalDateInputValue(new Date(currentPeriodEnd))
      : toLocalDateInputValue(new Date());
    setCancelDate(initialDate);
    setCancelConfirm({ subscriptionId, currentPeriodEnd });
  };

  const confirmCancelSubscription = async () => {
    if (!cancelConfirm) return;
    const { subscriptionId } = cancelConfirm;
    setCancelConfirm(null);
    setCancellingSubscriptionId(subscriptionId);
    try {
      const response = await fetch('/api/admin/subscriptions/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subscriptionId, action: 'schedule_cancel', cancelAt: cancelDate }),
      });

      if (!response.ok) throw new Error('Failed to cancel subscription');

      const cancelAtDate = new Date(cancelDate).toISOString();

      setSelectedSeeker((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subscriptions: prev.subscriptions.map((sub) =>
            sub.id === subscriptionId
              ? { ...sub, cancelAtPeriodEnd: true, currentPeriodEnd: cancelAtDate }
              : sub
          ),
        };
      });

      addToast({
        title: 'Subscription Scheduled for Cancellation',
        description: `The subscription will be canceled on ${formatDate(cancelAtDate)}.`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      addToast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setCancellingSubscriptionId(null);
    }
  };

  const handleReactivateSubscription = async (subscriptionId: string, currentPeriodEnd: string | null) => {
    setReactivateConfirm({ subscriptionId, currentPeriodEnd });
  };

  const confirmReactivateSubscription = async () => {
    if (!reactivateConfirm) return;
    const { subscriptionId } = reactivateConfirm;
    setReactivateConfirm(null);
    setReactivatingSubscriptionId(subscriptionId);
    try {
      const response = await fetch('/api/admin/subscriptions/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subscriptionId, action: 'reactivate' }),
      });

      if (!response.ok) throw new Error('Failed to reactivate subscription');

      setSelectedSeeker((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subscriptions: prev.subscriptions.map((sub) =>
            sub.id === subscriptionId ? { ...sub, cancelAtPeriodEnd: false } : sub
          ),
        };
      });

      addToast({
        title: 'Subscription Reactivated',
        description: 'The scheduled cancellation has been removed.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      addToast({
        title: 'Error',
        description: 'Failed to reactivate subscription',
        variant: 'destructive',
      });
    } finally {
      setReactivatingSubscriptionId(null);
    }
  };

  const handleChargeSeeker = async (seekerId: string) => {
    setIsCharging(true);
    setChargeResult(null);
    try {
      const response = await fetch('/api/admin/seekers/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seekerId }),
      });
      const data = await response.json();
      setChargeResult(data);
    } catch (error) {
      setChargeResult({ success: false, error: String(error) });
    } finally {
      setIsCharging(false);
    }
  };

  const isChargeAllowed = user?.emailAddresses?.some(
    (e) => e.emailAddress === 'mir23wpurposes@gmail.com'
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMembershipPlan = (plan: string, isOnTrial?: boolean) => {
    // If user is on trial but plan is 'none', show as Trial
    if (isOnTrial && plan === 'none') {
      return 'Trial';
    }

    const planNames: { [key: string]: string } = {
      none: 'No Plan',
      trial_monthly: 'Trial Monthly',
      gold_bimonthly: 'Gold Bimonthly',
      vip_quarterly: 'VIP Quarterly',
      annual_platinum: 'Annual Platinum',
    };
    return (
      planNames[plan] ||
      plan.charAt(0).toUpperCase() + plan.slice(1).replace(/_/g, ' ')
    );
  };

  const getMembershipColor = (plan: string, isOnTrial?: boolean) => {
    // If user is on trial but plan is 'none', show trial colors
    if (isOnTrial && plan === 'none') {
      return 'bg-blue-100 text-blue-800';
    }

    switch (plan) {
      case 'none':
        return 'bg-gray-100 text-gray-800';
      case 'trial_monthly':
        return 'bg-blue-100 text-blue-800';
      case 'gold_bimonthly':
        return 'bg-yellow-100 text-yellow-800';
      case 'vip_quarterly':
        return 'bg-purple-100 text-purple-800';
      case 'annual_platinum':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (isSuspended: boolean) => {
    return isSuspended
      ? 'bg-red-100 text-red-800'
      : 'bg-green-100 text-green-800';
  };

  const derivedCycleStart = (plan: string, currentPeriodEnd: string): string | null => {
    const months = getPlanByMembershipPlan(plan)?.billingMonths;
    if (!months) return null;
    const end = new Date(currentPeriodEnd);
    end.setMonth(end.getMonth() - months);
    return end.toISOString();
  };

  const getLatestSubscription = (subscriptions: JobSeekerSubscription[]) => {
    if (subscriptions.length === 0) return null;
    return subscriptions.reduce((latest, current) =>
      new Date(current.createdAt) > new Date(latest.createdAt)
        ? current
        : latest
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Job Seeker Management
        </h1>
        <p className="text-gray-600">
          Manage job seeker accounts, memberships, and suspension status
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Name or email..."
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value: string) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="canceling">Active - Requested to Cancel</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="membershipPlan">Membership Plan</Label>
              <Select
                value={filters.membershipPlan}
                onValueChange={(value: string) =>
                  handleFilterChange('membershipPlan', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  <SelectItem value="trial_monthly">Trial Monthly</SelectItem>
                  <SelectItem value="gold_bimonthly">Gold Bimonthly</SelectItem>
                  <SelectItem value="vip_quarterly">VIP Quarterly</SelectItem>
                  <SelectItem value="annual_platinum">
                    Annual Platinum
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
                <Checkbox
                  checked={filters.includeNoPlan}
                  onCheckedChange={(checked) =>
                    setFilters((prev) => ({ ...prev, includeNoPlan: !!checked }))
                  }
                />
                Include seekers without a plan
              </label>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                  setFilters({
                    search: '',
                    status: 'all',
                    membershipPlan: 'all',
                    includeNoPlan: false,
                  });
                  setPagination((prev) => ({ ...prev, currentPage: 1 }));
                  document.querySelectorAll<HTMLInputElement>('input[placeholder="Name or email..."]').forEach(input => { input.value = '' });
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seekers List */}
      {isSearching ? (
        <SeekerListSkeletons />
      ) : (
        <div className="space-y-4">
          {seekers.length > 0 ? (
            seekers.map((seeker) => {
              const latestSubscription = getLatestSubscription(
                seeker.subscriptions
              );

              return (
                <Card
                  key={seeker.userId}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSeekerClick(seeker)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <UserProfilePicture
                          userId={seeker.user.id}
                          userName={seeker.user.name}
                          profilePictureUrl={seeker.user.profilePictureUrl}
                          resolvedUrl={seeker.user.resolvedProfilePictureUrl}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {seeker.user.name}
                            </h3>
                            <Badge className={getStatusColor(seeker.isSuspended)}>
                              {seeker.isSuspended ? (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Suspended
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </>
                              )}
                            </Badge>
                            <Badge
                              className={getMembershipColor(
                                seeker.membershipPlan,
                                seeker.isOnTrial
                              )}
                            >
                              <Award className="h-3 w-3 mr-1" />
                              {formatMembershipPlan(
                                seeker.membershipPlan,
                                seeker.isOnTrial
                              )}
                            </Badge>
                            {seeker.isOnTrial && (
                              <Badge className="bg-orange-100 text-orange-800">
                                <Clock className="h-3 w-3 mr-1" />
                                Trial
                              </Badge>
                            )}
                            {latestSubscription?.status === 'active' && latestSubscription?.cancelAtPeriodEnd && (
                              <Badge className="bg-red-100 text-red-800">
                                <XCircle className="h-3 w-3 mr-1" />
                                Canceling
                              </Badge>
                            )}
                            {seeker.pendingSignup && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Abandoned Cart
                              </Badge>
                            )}
                          </div>
                          {latestSubscription?.status === 'active' && latestSubscription?.cancelAtPeriodEnd && latestSubscription?.currentPeriodEnd && (
                            <div className="flex items-center gap-1 text-sm text-orange-600 mb-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Active until {formatDate(latestSubscription.currentPeriodEnd)}
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1 min-w-0">
                              <Mail className="h-4 w-4 flex-shrink-0" />
                              <span
                                className="cursor-help truncate"
                                title={seeker.user.email}
                              >
                                {truncateEmail(seeker.user.email, 20)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Phone className="h-4 w-4" />
                              <span>{seeker.user.phone || 'Not provided'}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Joined {formatDate(seeker.createdAt)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <FileText className="h-4 w-4" />
                              <span>
                                {seeker.resumes && seeker.resumes.length > 0 ? (
                                  <>
                                    <span className="font-medium">
                                      {seeker.resumes.length === 1
                                        ? 'Resume uploaded'
                                        : `${seeker.resumes.length} resumes uploaded`}
                                    </span>
                                    <br />
                                    <span className="text-gray-400">
                                      ({formatDate(seeker.resumes[0].uploadedAt)})
                                    </span>
                                  </>
                                ) : (
                                  'No resume'
                                )}
                              </span>
                            </div>
                          </div>
                          {seeker.membershipPlan === 'none' && seeker.cancelledAt && (
                            <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                              <XCircle className="h-3.5 w-3.5" />
                              Cancelled on {formatDate(seeker.cancelledAt)}
                            </div>
                          )}
                          {seeker.pendingSignup && (
                            <div className="flex items-center gap-1 mt-1 text-sm text-yellow-700">
                              <ShoppingCart className="h-3.5 w-3.5" />
                              Abandoned cart since {formatDate(seeker.pendingSignup.createdAt)}
                            </div>
                          )}
                          {seeker.headline && (
                            <div className="mt-2 text-sm text-gray-700">
                              <span className="font-medium">Headline:</span>{' '}
                              {seeker.headline}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4 text-right">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-blue-600">
                              {seeker.resumeLimit === 999
                                ? `∞/∞`
                                : `${seeker.resumeCredits}/${seeker.resumeLimit}`}
                            </div>
                            <div className="text-xs text-gray-500">
                              Resume Credits
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-600">
                              {seeker._count.applications}
                            </div>
                            <div className="text-xs text-gray-500">
                              Applications
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-purple-600">
                              {seeker.hireCount}
                            </div>
                            <div className="text-xs text-gray-500">Hires</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-700">
                              {seeker.lastActiveDate
                                ? formatDate(seeker.lastActiveDate)
                                : 'Never'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Last Active
                            </div>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <Button
                              size="sm"
                              variant={
                                seeker.isSuspended ? 'default' : 'destructive'
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSuspendSeeker(
                                  seeker.userId,
                                  !seeker.isSuspended
                                );
                              }}
                              disabled={updatingUsers.has(seeker.userId)}
                            >
                              {seeker.isSuspended ? 'Reactivate' : 'Suspend'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No seekers found
                </h3>
                <p className="text-gray-600">
                  {Object.values(filters).some((f) => f)
                    ? 'Try adjusting your filters to see more results.'
                    : 'No job seekers have been registered yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {pagination.offset + 1} to{' '}
              {Math.min(pagination.offset + pagination.limit, pagination.total)}{' '}
              of {pagination.total.toLocaleString()} job seekers
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || isLoading}
              >
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {/* Show page numbers */}
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (
                      pagination.currentPage >=
                      pagination.totalPages - 2
                    ) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          pageNum === pagination.currentPage
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        disabled={isLoading}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasMore || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Seeker Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle>Job Seeker Details</DialogTitle>
                  {isLoadingDetail && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-normal">
                      <LoadingSpinner size="sm" />
                      Loading details...
                    </span>
                  )}
                </div>
                <DialogDescription>
                  Manage job seeker account, membership, and settings
                </DialogDescription>
              </div>
              {/* Chat Button next to close button */}
              <div className="relative group">
                <Button
                  disabled
                  variant="outline"
                  size="sm"
                  className="cursor-not-allowed opacity-60"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Chat
                </Button>
                {/* Tooltip */}
                <div className="absolute top-full right-0 mt-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Feature Coming Soon
                  <div className="absolute bottom-full right-4 border-4 border-transparent border-b-gray-900"></div>
                </div>
              </div>
            </div>
          </DialogHeader>

          {selectedSeeker && (
            <div className="space-y-6">
              {/* Seeker Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">
                  {selectedSeeker.user.name}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Email:</span>{' '}
                    <span title={selectedSeeker.user.email} className="cursor-help">
                      {truncateEmail(selectedSeeker.user.email, 30)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span>{' '}
                    {selectedSeeker.user.phone || 'Not provided'}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge
                      className={`ml-2 ${getStatusColor(
                        selectedSeeker.isSuspended
                      )}`}
                    >
                      {selectedSeeker.isSuspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Membership:</span>
                    <Badge
                      className={`ml-2 ${getMembershipColor(
                        selectedSeeker.membershipPlan,
                        selectedSeeker.isOnTrial
                      )}`}
                    >
                      {formatMembershipPlan(
                        selectedSeeker.membershipPlan,
                        selectedSeeker.isOnTrial
                      )}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Resume Credits:</span>{' '}
                    {selectedSeeker.resumeLimit === 999
                      ? `∞/∞`
                      : `${selectedSeeker.resumeCredits}/${selectedSeeker.resumeLimit}`}
                  </div>
                  <div>
                    <span className="font-medium">Applications:</span>{' '}
                    {selectedSeeker._count.applications}
                  </div>
                  <div>
                    <span className="font-medium">Hires:</span>{' '}
                    {selectedSeeker.hireCount}
                  </div>
                  <div>
                    <span className="font-medium">Last Active:</span>{' '}
                    {selectedSeeker.lastActiveDate
                      ? formatDate(selectedSeeker.lastActiveDate)
                      : 'Never'}
                  </div>

                </div>
                {process.env.NEXT_PUBLIC_SHOW_LEGACY_WP_LINKS === 'true' && selectedSeeker.user.legacyId && (
                  <div className="flex items-center justify-between px-3 py-2 mt-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-amber-700" />
                      <span className="text-sm text-amber-800">
                        Legacy WP User #{selectedSeeker.user.legacyId}
                      </span>
                    </div>
                    <a
                      href={`https://archive.ampertalent.com/wp-admin/user-edit.php?user_id=${selectedSeeker.user.legacyId}&wp_http_referer=%2Fwp-admin%2Fusers.php`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline"
                    >
                      View in WP
                    </a>
                  </div>
                )}
                {selectedSeeker.headline && (
                  <div className="mt-3">
                    <span className="font-medium">Headline:</span>
                    <p className="text-gray-600 mt-1">
                      {selectedSeeker.headline}
                    </p>
                  </div>
                )}
                {selectedSeeker.aboutMe && (
                  <div className="mt-3">
                    <span className="font-medium">About:</span>
                    <p className="text-gray-600 mt-1">
                      {selectedSeeker.aboutMe}
                    </p>
                  </div>
                )}
              </div>

              {/* Current Subscriptions */}
              <div>
                <h4 className="font-semibold mb-3">Subscription History</h4>
                {isLoadingDetail ? (
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedSeeker.subscriptions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSeeker.subscriptions.map((subscription) => (
                      <div
                        key={subscription.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-3">
                          <div>
                            <span className="font-medium">
                              {formatMembershipPlan(subscription.plan)}
                            </span>
                            <div className="text-sm text-gray-600">
                              Started: {formatDate(subscription.createdAt)}
                            </div>
                            {subscription.status === 'active' && subscription.currentPeriodEnd && (() => {
                              const cycleStart = derivedCycleStart(subscription.plan, subscription.currentPeriodEnd);
                              return cycleStart ? (
                                <div className="text-sm text-gray-600">
                                  Current cycle: {formatDate(cycleStart)}
                                </div>
                              ) : null;
                            })()}
                            {subscription.status === 'active' && subscription.currentPeriodEnd && (
                              <div className="text-sm text-gray-600">
                                {subscription.cancelAtPeriodEnd ? (
                                  <span className="flex items-center gap-1 text-orange-600">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Active until {formatDate(subscription.currentPeriodEnd)}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Next payment: {formatDate(subscription.currentPeriodEnd)}
                                  </span>
                                )}
                              </div>
                            )}
                            {subscription.status === 'canceled' && subscription.currentPeriodEnd && (
                              <div className="text-sm text-red-600 flex items-center gap-1">
                                <XCircle className="h-3.5 w-3.5" />
                                Cancelled on {formatDate(subscription.currentPeriodEnd)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                subscription.status === 'active' && subscription.cancelAtPeriodEnd
                                  ? 'bg-orange-100 text-orange-800'
                                  : subscription.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {subscription.status === 'active' && subscription.cancelAtPeriodEnd
                                ? 'canceling'
                                : subscription.status}
                            </Badge>
                            {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                              <button
                                onClick={() => handleCancelSubscription(subscription.id, subscription.currentPeriodEnd)}
                                disabled={cancellingSubscriptionId === subscription.id}
                                className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {cancellingSubscriptionId === subscription.id ? 'Canceling...' : 'Cancel'}
                              </button>
                            )}
                            {subscription.status === 'active' && subscription.cancelAtPeriodEnd && (
                              <button
                                onClick={() => handleReactivateSubscription(subscription.id, subscription.currentPeriodEnd)}
                                disabled={reactivatingSubscriptionId === subscription.id}
                                className="text-xs text-green-600 hover:text-green-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {reactivatingSubscriptionId === subscription.id ? 'Reactivating...' : 'Reactivate'}
                              </button>
                            )}
                          </div>
                        </div>
                        {process.env.NEXT_PUBLIC_SHOW_LEGACY_WP_LINKS === 'true' && subscription.legacyId && (
                          <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border-t border-amber-200">
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4 text-amber-700" />
                              <span className="text-sm text-amber-800">
                                Legacy WP Subscription #{subscription.legacyId}
                              </span>
                            </div>
                            <a
                              href={`https://archive.ampertalent.com/wp-admin/post.php?post=${subscription.legacyId}&action=edit`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline"
                            >
                              View in WP
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No subscription history</p>
                )}
              </div>

              {/* Payment Methods */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Methods
                </h4>
                {isLoadingDetail ? (
                  <div className="space-y-2">
                    {Array.from({ length: 1 }).map((_, i) => (
                      <div key={i} className="border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <div className="space-y-1 flex-1">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-56" />
                          </div>
                          <Skeleton className="h-5 w-14 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedSeeker.paymentMethods && selectedSeeker.paymentMethods.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSeeker.paymentMethods.map((paymentMethod) => {
                      const isPayPal = paymentMethod.brand?.toLowerCase() === 'paypal' ||
                        paymentMethod.authnetPaymentProfileId?.startsWith('PAYPAL|');
                      const isMigrated = paymentMethod.authnetPaymentProfileId === 'migrated' ||
                        paymentMethod.authnetPaymentProfileId?.startsWith('migrated');
                      const hasValidProfile = paymentMethod.authnetPaymentProfileId &&
                        !isMigrated &&
                        (paymentMethod.authnetPaymentProfileId.includes('|') ||
                          paymentMethod.authnetPaymentProfileId.startsWith('PAYPAL|'));
                      const processorType = isPayPal ? 'PayPal' : 'AuthNet';

                      return (
                        <div
                          key={paymentMethod.id}
                          className="border rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${isPayPal ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                <CreditCard className={`h-4 w-4 ${isPayPal ? 'text-blue-600' : 'text-gray-600'}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium capitalize">
                                    {paymentMethod.brand || 'Card'}
                                  </span>
                                  {!isPayPal && (
                                    <span className="text-gray-600">
                                      •••• {paymentMethod.last4}
                                    </span>
                                  )}
                                  {isPayPal && paymentMethod.last4 && (
                                    <span className="text-gray-600 text-sm">
                                      {paymentMethod.last4}
                                    </span>
                                  )}
                                  {paymentMethod.isDefault && (
                                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                                      Default
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {!isPayPal && (
                                    <span>
                                      Expires {paymentMethod.expiryMonth.toString().padStart(2, '0')}/{paymentMethod.expiryYear}
                                    </span>
                                  )}
                                  {paymentMethod.createdAt && (
                                    <span className="ml-2">
                                      • Added {formatDate(paymentMethod.createdAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isMigrated && (
                                <Badge className="bg-amber-100 text-amber-800 text-xs">
                                  Migrated
                                </Badge>
                              )}
                              {hasValidProfile && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  Active
                                </Badge>
                              )}
                              {!hasValidProfile && !isMigrated && (
                                <Badge className="bg-red-100 text-red-800 text-xs">
                                  No Profile
                                </Badge>
                              )}
                            </div>
                          </div>
                          {/* Show Processor Type and Profile ID for debugging */}
                          <div className="mt-2 pt-2 border-t text-xs text-gray-400 font-mono truncate flex items-center gap-2">
                            <Badge className={`text-xs ${isPayPal ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                              {processorType}
                            </Badge>
                            <span className="truncate">
                              Profile: {paymentMethod.authnetPaymentProfileId || 'N/A'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 text-center text-gray-500">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No payment methods saved</p>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Payment History
                </h4>
                {isLoadingDetail ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="border rounded-lg p-3 flex items-center justify-between">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : selectedSeeker.transactions && selectedSeeker.transactions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSeeker.transactions.map((tx) => {
                      const isSucceeded = tx.status === 'succeeded' || tx.status === 'paid';
                      const isPending = tx.status === 'pending';
                      const isExternalPayment = tx.source === 'external_payment';
                      const isPayPal = tx.ghlTransactionId?.startsWith('PAYPAL_');
                      return (
                        <div key={tx.id} className="border rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{tx.description}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formatDate(tx.date)}
                              {tx.paymentMethod?.last4 && (
                                <span className="ml-2">• {tx.paymentMethod.brand || 'Card'} ••••{tx.paymentMethod.last4}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-sm font-semibold">
                              ${typeof tx.amount === 'number' ? tx.amount.toFixed(2) : parseFloat(String(tx.amount)).toFixed(2)} {tx.currency}
                            </span>
                            {isExternalPayment && (
                              isPayPal ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">PayPal</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">Authorize.net</Badge>
                              )
                            )}
                            <Badge
                              className={
                                isSucceeded
                                  ? 'bg-green-100 text-green-800'
                                  : isPending
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }
                            >
                              {isSucceeded ? 'Paid' : isPending ? 'Pending' : tx.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 text-center text-gray-500">
                    <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No payment history</p>
                  </div>
                )}
              </div>

              {/* Charge Debug (restricted) */}
              {isChargeAllowed && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-amber-700">
                    <CreditCard className="h-4 w-4" />
                    Charge Debug
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Attempts a real charge using the same logic as the recurring-billing cron.
                    The full AuthNet/PayPal response will be displayed below.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    disabled={isCharging || isLoadingDetail}
                    onClick={() => handleChargeSeeker(selectedSeeker.userId)}
                  >
                    {isCharging ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Charging...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Charge ${getPlanPriceDisplay(selectedSeeker.membershipPlan, selectedSeeker.subscriptions)} Now
                      </>
                    )}
                  </Button>

                  {chargeResult && (
                    <div className={`mt-3 rounded-lg border p-3 text-sm ${chargeResult.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                      }`}>
                      <div className="font-semibold mb-2">
                        {chargeResult.success ? '✅ Charge Successful' : '❌ Charge Failed'}
                      </div>
                      {chargeResult.error && (
                        <div className="text-red-700 mb-2">
                          <span className="font-medium">Error:</span> {chargeResult.error}
                        </div>
                      )}
                      {chargeResult.errors && chargeResult.errors.length > 0 && (
                        <div className="text-red-700 mb-2">
                          {chargeResult.errors.map((e: any, i: number) => (
                            <div key={i}>[{e.errorCode}] {e.errorText}</div>
                          ))}
                        </div>
                      )}
                      {chargeResult.transactionId && (
                        <div><span className="font-medium">Transaction ID:</span> {chargeResult.transactionId}</div>
                      )}
                      {chargeResult.processor && (
                        <div><span className="font-medium">Processor:</span> {chargeResult.processor}</div>
                      )}
                      {chargeResult.responseCode && (
                        <div><span className="font-medium">Response Code:</span> {chargeResult.responseCode}</div>
                      )}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                          Full Debug Response
                        </summary>
                        <pre className="mt-1 text-xs bg-white rounded p-2 overflow-auto max-h-60 border">
                          {JSON.stringify(chargeResult, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}

              {/* Update Membership Form */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Update Membership</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="membershipPlan">Membership Plan</Label>
                      <Select
                        value={membershipForm.membershipPlan}
                        onValueChange={(value: string) =>
                          setMembershipForm((prev) => ({
                            ...prev,
                            membershipPlan: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Plan</SelectItem>
                          <SelectItem value="trial_monthly">
                            Trial Monthly
                          </SelectItem>
                          <SelectItem value="gold_bimonthly">
                            Gold Bimonthly
                          </SelectItem>
                          <SelectItem value="vip_quarterly">
                            VIP Quarterly
                          </SelectItem>
                          <SelectItem value="annual_platinum">
                            Annual Platinum
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="addons">Add-ons</Label>
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Coming Soon..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="placeholder">
                            Additional services coming soon
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Expiration Date field hidden — seekers are cancellable-only, no manual expiry override */}
                  {/* <div>
                    <Label htmlFor="membershipExpiresAt">
                      Expiration Date (Optional)
                    </Label>
                    <Input
                      id="membershipExpiresAt"
                      type="date"
                      value={membershipForm.membershipExpiresAt}
                      onChange={(e) =>
                        setMembershipForm((prev) => ({
                          ...prev,
                          membershipExpiresAt: e.target.value,
                        }))
                      }
                    />
                  </div> */}
                  <div>
                    <Label htmlFor="notes">Admin Notes</Label>
                    <Textarea
                      id="notes"
                      value={membershipForm.notes}
                      onChange={(e) =>
                        setMembershipForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Reason for membership update..."
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        if (selectedSeeker) {
                          router.push(`/admin/seekers/${selectedSeeker.userId}`);
                        }
                      }}
                      variant="outline"
                      className="flex-shrink-0"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Profile
                    </Button>
                    <Button
                      onClick={handleUpdateMembership}
                      disabled={
                        selectedSeeker
                          ? updatingUsers.has(selectedSeeker.userId)
                          : false
                      }
                      className="flex-1"
                    >
                      {selectedSeeker &&
                        updatingUsers.has(selectedSeeker.userId) ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Updating Membership...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Update Membership
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleImpersonateSeeker(selectedSeeker)}
                      disabled={isImpersonating}
                      variant="outline"
                      className="flex-shrink-0"
                    >
                      {isImpersonating ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Impersonate
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelConfirm} onOpenChange={(open) => { if (!open) setCancelConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  The seeker will keep access until the date below. You can adjust it if needed.
                </p>
                <div className="flex items-center gap-3">
                  <Label htmlFor="cancel-date" className="shrink-0">Active until</Label>
                  <Input
                    id="cancel-date"
                    type="date"
                    value={cancelDate}
                    onChange={(e) => setCancelDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelSubscription}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!reactivateConfirm} onOpenChange={(open) => { if (!open) setReactivateConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Subscription</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to reactivate this subscription? The scheduled cancellation will be removed and the subscription will continue automatically.
                </p>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <p className="font-medium mb-1">Billing notice</p>
                  <p>
                    The customer&apos;s card will be charged on the next billing date:{' '}
                    <span className="font-semibold">
                      {reactivateConfirm?.currentPeriodEnd
                        ? formatDate(reactivateConfirm.currentPeriodEnd)
                        : 'Unknown'}
                    </span>
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReactivateSubscription}>
              Yes, reactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
