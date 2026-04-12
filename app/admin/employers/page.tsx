'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useImpersonation } from '@/hooks/useImpersonation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CompanyLogo } from '@/components/common/CompanyLogo';
import { useToast } from '@/components/ui/toast';
import { getEmployerDisplayStatus, type EmployerDisplayStatus } from '@/lib/employerStatus';
import {
  Building,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  Search,
  Filter,
  Calendar,
  Mail,
  Globe,
  Shield,
  ShieldCheck,
} from 'lucide-react';

interface EmployerPackage {
  id: string;
  packageType: string;
  listingsRemaining: number;
  featuredListingsRemaining: number;
  purchasedAt: string;
  expiresAt: string | null;
}

interface Employer {
  id: string;
  userId: string;
  companyName: string;
  companyWebsite: string | null;
  companyDescription: string | null;
  billingAddress: string | null;
  taxId: string | null;
  isSuspended: boolean;
  isVetted: boolean;
  vettedAt: string | null;
  vettedBy: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
  companyLogoUrl: string | null;
  packages: EmployerPackage[];
  jobs?: Array<{
    status: string;
    expiresAt: string | null;
  }>;
  _count: {
    jobs: number;
    applications: number;
    hires: number;
  };
}

interface PaginationData {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

const truncateEmail = (email: string, maxLength: number = 25) => {
  if (email.length <= maxLength) return email;
  const [localPart, domain] = email.split('@');
  if (domain.length > maxLength / 2) {
    return `${localPart}@${domain.slice(0, Math.floor(maxLength / 2) - 3)}...`;
  }
  const availableLength = maxLength - domain.length - 1;
  if (localPart.length > availableLength) {
    return `${localPart.slice(0, availableLength - 3)}...@${domain}`;
  }
  return email;
};

function EmployerCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-5 w-20 rounded-full" />
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
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="text-center space-y-1">
                  <Skeleton className="h-6 w-8 mx-auto" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
              <div className="flex flex-col space-y-1">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployerListSkeletons() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <EmployerCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function AdminEmployersPage() {
  const { user } = useUser();
  const router = useRouter();
  const { startImpersonation } = useImpersonation();
  const searchParams = useSearchParams();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
    currentPage: 1,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
  const [updatingVetted, setUpdatingVetted] = useState<Set<string>>(new Set());
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    hasCredits: 'all',
  });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [creditForm, setCreditForm] = useState({
    packageType: 'standard_job_post',
    addonType: 'none',
    expiresAt: '',
    notes: '',
  });
  const { addToast } = useToast();

  const loadEmployers = useCallback(async (page: number) => {
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

      if (filters.status !== 'all') {
        queryParams.append('status', filters.status);
      }

      if (filters.hasCredits && filters.hasCredits !== 'all')
        queryParams.append('hasCredits', filters.hasCredits);

      const response = await fetch(`/api/admin/employers?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch employers');

      const data = await response.json();
      const fetched: Employer[] = data.employers || [];

      // No more client-side status filtering — handled in the API WHERE clause

      setEmployers(fetched);

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
      console.error('Error loading employers:', error);
      addToast({ title: 'Error', description: 'Failed to load employers', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setIsSearching(false);
      hasLoadedOnce.current = true;
    }
  }, [filters.search, filters.status, filters.hasCredits, pagination.limit]);

  useEffect(() => {
    loadEmployers(pagination.currentPage);
  }, [loadEmployers, pagination.currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleFilterChange('search', value);
    }, 300);
  };

  const handleToggleVetted = async (employerId: string, currentVettedStatus: boolean) => {
    setUpdatingVetted((prev) => new Set(prev).add(employerId));
    try {
      const response = await fetch(`/api/admin/employers/${employerId}/vetted`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVetted: !currentVettedStatus }),
      });
      if (!response.ok) throw new Error('Failed to update vetted status');
      loadEmployers(pagination.currentPage);
      addToast({
        title: 'Success',
        description: `Employer ${!currentVettedStatus ? 'marked as vetted' : 'vetted status removed'}`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating vetted status:', error);
      addToast({ title: 'Error', description: 'Failed to update vetted status', variant: 'destructive' });
    } finally {
      setUpdatingVetted((prev) => { const s = new Set(prev); s.delete(employerId); return s; });
    }
  };

  // Open dialog immediately with list data, then lazy-load full detail
  const handleEmployerClick = async (employer: Employer) => {
    setSelectedEmployer(employer);
    setIsDialogOpen(true);

    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/employers/${employer.userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEmployer(data.employer);
      }
    } catch (e) {
      console.error('Failed to load employer detail', e);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Auto-open employer details modal when ?open=<userId> is present (e.g. linked from transactions tab)
  useEffect(() => {
    const openUserId = searchParams?.get('open');
    if (!openUserId) return;
    fetch(`/api/admin/employers/${openUserId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.employer) handleEmployerClick(data.employer); })
      .catch(() => { });
    // Clean URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete('open');
    window.history.replaceState({}, '', url.toString());
  }, [searchParams]);

  const handleSuspendEmployer = async (employerId: string, suspend: boolean) => {
    try {
      setUpdatingUsers((prev) => new Set(prev).add(employerId));
      const response = await fetch('/api/admin/employers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employerId, action: 'suspend', isSuspended: suspend }),
      });
      if (!response.ok) throw new Error('Failed to update employer status');
      setEmployers((prev) =>
        prev.map((emp) => (emp.userId === employerId ? { ...emp, isSuspended: suspend } : emp))
      );
      addToast({
        title: 'Success',
        description: `Employer ${suspend ? 'suspended' : 'reactivated'} successfully`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating employer status:', error);
      addToast({ title: 'Error', description: 'Failed to update employer status', variant: 'destructive' });
    } finally {
      setUpdatingUsers((prev) => { const s = new Set(prev); s.delete(employerId); return s; });
    }
  };

  const handleAddCredits = async () => {
    if (!selectedEmployer) return;
    try {
      setUpdatingUsers((prev) => new Set(prev).add(selectedEmployer.userId));
      const response = await fetch('/api/admin/employers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employerId: selectedEmployer.userId,
          action: 'addCredits',
          packageData: {
            packageType: creditForm.addonType !== 'none' ? creditForm.addonType : creditForm.packageType,
            listingsRemaining: 1,
            expiresAt: creditForm.expiresAt ? new Date(creditForm.expiresAt).toISOString() : null,
          },
          notes: creditForm.notes,
        }),
      });
      if (!response.ok) throw new Error('Failed to add credits');
      loadEmployers(pagination.currentPage);
      addToast({ title: 'Success', description: 'Credits added successfully', variant: 'default' });
      setIsDialogOpen(false);
      setSelectedEmployer(null);
      setCreditForm({ packageType: 'standard_job_post', addonType: 'none', expiresAt: '', notes: '' });
    } catch (error) {
      console.error('Error adding credits:', error);
      addToast({ title: 'Error', description: 'Failed to add credits', variant: 'destructive' });
    } finally {
      if (selectedEmployer) {
        setUpdatingUsers((prev) => { const s = new Set(prev); s.delete(selectedEmployer.userId); return s; });
      }
    }
  };

  const handleImpersonateEmployer = async (employer: Employer) => {
    if (!user?.id) return;
    setIsImpersonating(true);
    try {
      const result = await startImpersonation(user.id, {
        id: employer.user.id,
        clerkUserId: employer.userId,
        name: employer.user.name,
        email: employer.user.email,
        role: 'employer' as const,
        companyName: employer.companyName,
      });
      if (!result.success) {
        addToast({ title: 'Error', description: result.error || 'Failed to start impersonation', variant: 'destructive' });
        return;
      }
      addToast({ title: 'Impersonation Started', description: `Now viewing as ${employer.companyName}`, variant: 'default' });
      setIsDialogOpen(false);
      setSelectedEmployer(null);
      router.push('/employer/dashboard');
    } catch (error) {
      console.error('Impersonation error:', error);
      addToast({ title: 'Error', description: 'Failed to start impersonation', variant: 'destructive' });
    } finally {
      setIsImpersonating(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatPackageName = (packageType: string) => {
    const packageNames: { [key: string]: string } = {
      standard_job_post: 'Standard Job Post',
      featured_job_post: 'Featured Job Post',
      solo_email_blast: 'Solo Email Blast',
      gold_plus_6_month: 'Gold Plus 6 Month',
      concierge_lite: 'Concierge LITE (Legacy)',
      concierge_level_1: 'Concierge Level I',
      concierge_level_2: 'Concierge Level II',
      concierge_level_3: 'Concierge Level III',
      rush_service: 'Rush Service',
      onboarding_service: 'Onboarding Service',
      starter: 'Starter Package',
      professional: 'Professional Package',
      enterprise: 'Enterprise Package',
      unlimited: 'Unlimited Package',
      standard: 'Standard Package',
      featured: 'Featured Package',
      email_blast: 'Email Blast Package',
      gold_plus: 'Gold Plus Package',
    };
    return packageNames[packageType] ?? packageType.charAt(0).toUpperCase() + packageType.slice(1).replace(/_/g, ' ');
  };

  const getLatestPackage = (packages: EmployerPackage[]) => {
    if (packages.length === 0) return null;
    return packages.reduce((latest, current) =>
      new Date(current.purchasedAt) > new Date(latest.purchasedAt) ? current : latest
    );
  };

  const getTotalCredits = (packages: EmployerPackage[]) =>
    packages.reduce((total, pkg) => total + pkg.listingsRemaining, 0);

  const getStatusColor = (status: EmployerDisplayStatus) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-yellow-100 text-yellow-800';
      case 'Suspended': return 'bg-red-100 text-red-800';
    }
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Employer Management</h1>
        <p className="text-gray-600">Manage employer accounts, credits, and suspension status</p>
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
                  placeholder="Company name or email..."
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="hasCredits">Credits</Label>
              <Select value={filters.hasCredits} onValueChange={(v) => handleFilterChange('hasCredits', v)}>
                <SelectTrigger><SelectValue placeholder="All employers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employers</SelectItem>
                  <SelectItem value="true">Has credits</SelectItem>
                  <SelectItem value="false">No credits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                  setFilters({ search: '', status: 'all', hasCredits: 'all' });
                  setPagination((prev) => ({ ...prev, currentPage: 1 }));
                  document.querySelectorAll<HTMLInputElement>('input[placeholder="Company name or email..."]').forEach((i) => { i.value = ''; });
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employers List */}
      {isSearching ? (
        <EmployerListSkeletons />
      ) : (
        <div className="space-y-4">
          {employers.length > 0 ? (
            employers.map((employer) => {
              const totalCredits = getTotalCredits(employer.packages);
              const latestPackage = getLatestPackage(employer.packages);

              return (
                <Card
                  key={employer.userId}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleEmployerClick(employer)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <CompanyLogo
                          companyLogoUrl={employer.companyLogoUrl}
                          companyName={employer.companyName}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {employer.companyName}
                            </h3>
                            {(() => {
                              const displayStatus = getEmployerDisplayStatus(employer.isSuspended, employer.jobs ?? [], employer.packages ?? []);
                              return (
                                <Badge className={getStatusColor(displayStatus)}>
                                  {displayStatus === 'Suspended' && <><XCircle className="h-3 w-3 mr-1" />Suspended</>}
                                  {displayStatus === 'Approved' && <><CheckCircle className="h-3 w-3 mr-1" />Approved</>}
                                  {displayStatus === 'Inactive' && <><AlertTriangle className="h-3 w-3 mr-1" />Inactive</>}
                                </Badge>
                              );
                            })()}
                            {employer.isVetted && (
                              <Badge className="bg-purple-100 text-purple-800">
                                <ShieldCheck className="h-3 w-3 mr-1" />Vetted
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1 min-w-0">
                              <Mail className="h-4 w-4 flex-shrink-0" />
                              <span title={employer.user.email} className="cursor-help truncate">
                                {truncateEmail(employer.user.email, 20)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-4 w-4" />
                              <span>{employer.user.name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Joined {formatDate(employer.createdAt)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Package className="h-4 w-4" />
                              <span>
                                {latestPackage ? (
                                  <>
                                    <span className="font-medium">{formatPackageName(latestPackage.packageType)}</span>
                                    <br />
                                    <span className="text-gray-400">({formatDate(latestPackage.purchasedAt)})</span>
                                  </>
                                ) : 'No packages'}
                              </span>
                            </div>
                          </div>
                          {employer.companyWebsite && (
                            <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
                              <Globe className="h-4 w-4" />
                              <span>{employer.companyWebsite}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4 text-right">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-blue-600">{totalCredits}</div>
                            <div className="text-xs text-gray-500">Credits</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-600">{employer._count.jobs}</div>
                            <div className="text-xs text-gray-500">Jobs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-purple-600">{employer._count.applications}</div>
                            <div className="text-xs text-gray-500">Applications</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-orange-600">{employer._count.hires}</div>
                            <div className="text-xs text-gray-500">Hires</div>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <Button
                              size="sm"
                              variant={employer.isSuspended ? 'default' : 'destructive'}
                              onClick={(e) => { e.stopPropagation(); handleSuspendEmployer(employer.userId, !employer.isSuspended); }}
                              disabled={updatingUsers.has(employer.userId)}
                            >
                              {employer.isSuspended ? 'Reactivate' : 'Suspend'}
                            </Button>
                            <Button
                              size="sm"
                              variant={employer.isVetted ? 'outline' : 'secondary'}
                              onClick={(e) => { e.stopPropagation(); handleToggleVetted(employer.userId, employer.isVetted); }}
                              disabled={updatingVetted.has(employer.userId)}
                            >
                              {updatingVetted.has(employer.userId) ? (
                                <LoadingSpinner size="sm" />
                              ) : employer.isVetted ? (
                                <><Shield className="h-3 w-3 mr-1" />Unvet</>
                              ) : (
                                <><ShieldCheck className="h-3 w-3 mr-1" />Vet</>
                              )}
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
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No employers found</h3>
                <p className="text-gray-600">
                  {Object.values(filters).some((f) => f)
                    ? 'Try adjusting your filters to see more results.'
                    : 'No employers have been registered yet.'}
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
              {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
              {pagination.total.toLocaleString()} employers
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1 || isLoading}>
                Previous
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number = 0;
                  if (pagination.totalPages <= 5) pageNum = i + 1;
                  else if (pagination.currentPage <= 3) pageNum = i + 1;
                  else if (pagination.currentPage >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                  else pageNum = pagination.currentPage - 2 + i;
                  return (
                    <Button key={`page-${pageNum}-${i}`} variant={pageNum === pagination.currentPage ? 'default' : 'outline'} size="sm" onClick={() => handlePageChange(pageNum)} disabled={isLoading} className="w-10">
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination.hasMore || isLoading}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Employer Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Employer Details</DialogTitle>
              {isLoadingDetail && (
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-normal">
                  <LoadingSpinner size="sm" />
                  Loading details...
                </span>
              )}
            </div>
            <DialogDescription>Manage employer account, credits, and settings</DialogDescription>
          </DialogHeader>

          {selectedEmployer && (
            <div className="space-y-6">
              {/* Employer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">{selectedEmployer.companyName}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Contact:</span> {selectedEmployer.user.name}</div>
                  <div>
                    <span className="font-medium">Email:</span>{' '}
                    <span title={selectedEmployer.user.email} className="cursor-help">
                      {truncateEmail(selectedEmployer.user.email, 30)}
                    </span>
                  </div>
                  <div><span className="font-medium">Phone:</span> {selectedEmployer.user.phone || 'Not provided'}</div>
                  <div><span className="font-medium">Website:</span> {selectedEmployer.companyWebsite || 'Not provided'}</div>
                  <div><span className="font-medium">EIN/Tax ID:</span> {selectedEmployer.taxId || 'Not provided'}</div>
                  <div><span className="font-medium">Billing Address:</span> {selectedEmployer.billingAddress || 'Not provided'}</div>
                  <div>
                    <span className="font-medium">Status:</span>
                    {(() => {
                      const displayStatus = getEmployerDisplayStatus(selectedEmployer.isSuspended, selectedEmployer.jobs ?? [], selectedEmployer.packages ?? []);
                      return (
                        <Badge className={`ml-2 ${getStatusColor(displayStatus)}`}>
                          {displayStatus === 'Suspended' && <><XCircle className="h-3 w-3 mr-1" />Suspended</>}
                          {displayStatus === 'Approved' && <><CheckCircle className="h-3 w-3 mr-1" />Approved</>}
                          {displayStatus === 'Inactive' && <><AlertTriangle className="h-3 w-3 mr-1" />Inactive</>}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="font-medium">Vetted:</span>
                    {selectedEmployer.isVetted ? (
                      <Badge className="ml-2 bg-purple-100 text-purple-800"><ShieldCheck className="h-3 w-3 mr-1" />Vetted</Badge>
                    ) : (
                      <Badge className="ml-2 bg-gray-100 text-gray-800"><Shield className="h-3 w-3 mr-1" />Not Vetted</Badge>
                    )}
                  </div>
                  <div><span className="font-medium">Jobs Posted:</span> {selectedEmployer._count.jobs}</div>
                  <div><span className="font-medium">Total Applications:</span> {selectedEmployer._count.applications}</div>
                  <div><span className="font-medium">Total Hires:</span> {selectedEmployer._count.hires}</div>
                  <div><span className="font-medium">Account Created:</span> {formatDate(selectedEmployer.createdAt)}</div>
                  <div><span className="font-medium">Last Updated:</span> {formatDate(selectedEmployer.updatedAt)}</div>
                  {selectedEmployer.isVetted && selectedEmployer.vettedAt && (
                    <div><span className="font-medium">Vetted Date:</span> {formatDate(selectedEmployer.vettedAt)}</div>
                  )}
                </div>
                {selectedEmployer.companyDescription && (
                  <div className="mt-3">
                    <span className="font-medium">Description:</span>
                    <p className="text-gray-600 mt-1">{selectedEmployer.companyDescription}</p>
                  </div>
                )}
                <div className="mt-4 pt-3 border-t">
                  <Button onClick={() => handleImpersonateEmployer(selectedEmployer)} disabled={isImpersonating} variant="outline" className="w-full">
                    {isImpersonating ? (
                      <><LoadingSpinner size="sm" className="mr-2" />Starting Impersonation...</>
                    ) : (
                      <><Eye className="h-4 w-4 mr-2" />Impersonate Employer</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Current Packages */}
              <div>
                <h4 className="font-semibold mb-3">Current Packages</h4>
                {isLoadingDetail ? (
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-3 w-52" />
                        </div>
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))}
                  </div>
                ) : selectedEmployer.packages.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEmployer.packages.map((pkg) => (
                      <div key={pkg.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium capitalize">{formatPackageName(pkg.packageType)}</span>
                          <div className="text-sm text-gray-600">
                            Purchased: {formatDate(pkg.purchasedAt)}
                            {pkg.expiresAt && ` • Expires: ${formatDate(pkg.expiresAt)}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{pkg.listingsRemaining} credits</div>
                          {pkg.featuredListingsRemaining > 0 && (
                            <div className="text-sm text-purple-600">{pkg.featuredListingsRemaining} featured</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No active packages</p>
                )}
              </div>

              {/* Add Package Form */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Add Package (1 Credit Each)</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="packageType">Main Package</Label>
                      <Select value={creditForm.packageType} onValueChange={(v) => setCreditForm((prev) => ({ ...prev, packageType: v, addonType: 'none' }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard_job_post">Standard Job Post</SelectItem>
                          <SelectItem value="featured_job_post">Featured Job Post</SelectItem>
                          <SelectItem value="solo_email_blast">Solo Email Blast</SelectItem>
                          <SelectItem value="gold_plus_6_month">Gold Plus 6 Month</SelectItem>
                          <SelectItem value="concierge_lite">Concierge LITE (Legacy)</SelectItem>
                          <SelectItem value="concierge_level_1">Concierge Level I</SelectItem>
                          <SelectItem value="concierge_level_2">Concierge Level II</SelectItem>
                          <SelectItem value="concierge_level_3">Concierge Level III</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="addonType">Add-on Package (Optional)</Label>
                      <Select value={creditForm.addonType} onValueChange={(v) => setCreditForm((prev) => ({ ...prev, addonType: v, packageType: v === 'none' ? 'standard_job_post' : '' }))}>
                        <SelectTrigger><SelectValue placeholder="Select add-on..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No add-on</SelectItem>
                          <SelectItem value="rush_service">Rush Service</SelectItem>
                          <SelectItem value="onboarding_service">Onboarding Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">Each package provides exactly 1 credit. Select either a main package or an add-on package.</p>
                  <div>
                    <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                    <Input id="expiresAt" type="date" value={creditForm.expiresAt} onChange={(e) => setCreditForm((prev) => ({ ...prev, expiresAt: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="notes">Admin Notes</Label>
                    <Textarea id="notes" value={creditForm.notes} onChange={(e) => setCreditForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Reason for adding credits..." rows={3} />
                  </div>
                  <Button
                    onClick={handleAddCredits}
                    disabled={(selectedEmployer ? updatingUsers.has(selectedEmployer.userId) : false) || (!creditForm.packageType && creditForm.addonType === 'none')}
                    className="w-full"
                  >
                    {selectedEmployer && updatingUsers.has(selectedEmployer.userId) ? (
                      <><LoadingSpinner size="sm" className="mr-2" />Adding Package...</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" />Add {creditForm.addonType !== 'none' ? 'Add-on' : 'Package'}</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
