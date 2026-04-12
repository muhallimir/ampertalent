'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { getCategoryLabel } from '@/lib/job-constants';
import {
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Building,
  DollarSign,
  Filter,
  Search,
  RotateCcw,
  Users,
  Shield,
} from 'lucide-react';
import { UserProfilePicture } from '@/components/common/UserProfilePicture';
import { CompanyLogo } from '@/components/common/CompanyLogo';

interface FeaturedJobRequest {
  id: string;
  jobId: string;
  employerId: string;
  packageId: string;
  status: 'not_added' | 'added_to_email';
  adminNotes: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  emailSentAt: string | null;
  extensionGranted: boolean;
  extensionExpiresAt: string | null;
  job: {
    id: string;
    title: string;
    category: string;
    payRangeText: string | null;
    locationText: string | null;
    createdAt: string;
    expiresAt: string | null;
    isCompanyPrivate: boolean;
    _count?: {
      applications: number;
    };
    applications?: Array<{
      id: string;
      status: string;
      appliedAt: string;
      seeker: {
        user: {
          name: string;
          email: string;
          profilePictureUrl: string | null;
        };
      };
    }>;
  };
  employer: {
    companyName: string;
    companyLogoUrl: string | null;
    user: {
      name: string;
      email: string;
      profilePictureUrl: string | null;
    };
  };
  package: {
    packageType: string;
    featuredListingsRemaining: number;
  };
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

function FeaturedJobCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="flex-shrink-0 flex items-center space-x-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-10 w-10 rounded" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeaturedJobListSkeletons() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <FeaturedJobCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function AdminFeaturedJobsPage() {
  const [requests, setRequests] = useState<FeaturedJobRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const hasLoadedOnce = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<FeaturedJobRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
  });
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
    currentPage: 1,
    totalPages: 1
  });
  const { addToast } = useToast();

  const loadRequests = useCallback(async (page: number = 1) => {
    try {
      if (hasLoadedOnce.current) {
        setIsSearching(true);
      } else {
        setIsLoading(true);
      }

      const offset = (page - 1) * pagination.limit;
      const queryParams = new URLSearchParams();
      queryParams.append('limit', pagination.limit.toString());
      queryParams.append('offset', offset.toString());
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status && filters.status !== 'all')
        queryParams.append('status', filters.status);

      const response = await fetch(`/api/admin/featured-jobs?${queryParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch featured job requests');
      }

      // Check if response is HTML (session expired)
      const text = await response.text();
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        // Session expired, redirect to sign-in
        window.location.href = '/sign-in';
        return;
      }

      const data = JSON.parse(text);
      setRequests(data.requests || []);

      // Update pagination data
      const totalCount = data.pagination?.total || data.requests?.length || 0;
      const totalPages = Math.ceil(totalCount / pagination.limit);
      setPagination(prev => ({
        ...prev,
        total: totalCount,
        offset: data.pagination?.offset || 0,
        hasMore: data.pagination?.hasMore || false,
        currentPage: page,
        totalPages: totalPages || 1
      }));
    } catch (error) {
      console.error('Error loading featured job requests:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load featured job requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsSearching(false);
      hasLoadedOnce.current = true;
    }
  }, [filters.search, filters.status, addToast, pagination.limit]);

  useEffect(() => {
    loadRequests(pagination.currentPage);
  }, [filters.search, filters.status, pagination.currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page on filter change
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

  const handleRequestClick = async (request: FeaturedJobRequest) => {
    try {
      // Fetch job details with applications
      const response = await fetch(
        `/api/admin/job-posts/${request.jobId}/applications`
      );
      if (response.ok) {
        // Check if response is HTML (session expired)
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          // Session expired, redirect to sign-in
          window.location.href = '/sign-in';
          return;
        }

        const jobWithApplications = JSON.parse(text);
        // Merge the job applications data with the request
        const requestWithApplications = {
          ...request,
          job: {
            ...request.job,
            _count: jobWithApplications._count,
            applications: jobWithApplications.applications,
          },
        };
        setSelectedRequest(requestWithApplications);
      } else {
        // Fallback to basic request data if applications fetch fails
        setSelectedRequest(request);
      }
    } catch (error) {
      console.error('Error fetching job applications:', error);
      // Fallback to basic request data
      setSelectedRequest(request);
    }
    setAdminNotes(request.adminNotes || '');
    setIsDialogOpen(true);
  };

  const handleStatusUpdate = async (
    requestId: string,
    newStatus: 'not_added' | 'added_to_email'
  ) => {
    try {
      setIsUpdating(true);

      const response = await fetch(`/api/admin/featured-jobs/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          adminNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update request status');
      }

      // Refresh the requests list
      loadRequests();

      addToast({
        title: 'Success',
        description: `Request status updated to ${newStatus.replace('_', ' ')}`,
        variant: 'default',
      });

      setIsDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error updating request status:', error);
      addToast({
        title: 'Error',
        description: 'Failed to update request status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGrantExtension = async (requestId: string) => {
    try {
      setIsUpdating(true);

      const response = await fetch(
        `/api/admin/featured-jobs/${requestId}/extension`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            adminNotes,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to grant extension');
      }

      // Refresh the requests list
      loadRequests();

      addToast({
        title: 'Success',
        description: '30-day extension granted successfully',
        variant: 'default',
      });

      setIsDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error granting extension:', error);
      addToast({
        title: 'Error',
        description: 'Failed to grant extension',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkStatusUpdate = async (
    newStatus: 'not_added' | 'added_to_email'
  ) => {
    if (selectedRequestIds.length === 0) {
      addToast({
        title: 'No Selection',
        description: 'Please select jobs to update',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsBulkUpdating(true);

      const response = await fetch('/api/admin/featured-jobs/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestIds: selectedRequestIds,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update requests');
      }

      // Refresh the requests list
      loadRequests();

      addToast({
        title: 'Success',
        description: `${selectedRequestIds.length
          } job(s) updated to ${newStatus.replace('_', ' ')}`,
        variant: 'default',
      });

      setSelectedRequestIds([]);
    } catch (error) {
      console.error('Error updating requests:', error);
      addToast({
        title: 'Error',
        description: 'Failed to update requests',
        variant: 'destructive',
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedRequestIds.length === requests.length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(requests.map((r) => r.id));
    }
  };

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequestIds((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_added':
        return 'bg-gray-100 text-gray-800';
      case 'added_to_email':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get application status color
  const getApplicationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'reviewing':
        return 'text-blue-600 bg-blue-50';
      case 'interview':
        return 'text-purple-600 bg-purple-50';
      case 'hired':
        return 'text-green-600 bg-green-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Helper function to format application status display text
  const formatApplicationStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'rejected':
        return 'Declined';
      case 'pending':
        return 'Pending';
      case 'reviewing':
        return 'Reviewing';
      case 'interview':
        return 'Interview';
      case 'hired':
        return 'Hired';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'not_added':
        return <Clock className="h-3 w-3 mr-1" />;
      case 'added_to_email':
        return <CheckCircle className="h-3 w-3 mr-1" />;
      default:
        return <Clock className="h-3 w-3 mr-1" />;
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Featured Jobs Management
        </h1>
        <p className="text-gray-600">
          Manage featured job requests and track their status
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
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Job title or company..."
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value: string) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="not_added">Not Added</SelectItem>
                  <SelectItem value="added_to_email">
                    Added to Weekly Email
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                  setFilters({ search: '', status: 'all' });
                  const searchInput = document.querySelector<HTMLInputElement>('input#search');
                  if (searchInput) searchInput.value = '';
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedRequestIds.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {selectedRequestIds.length} job(s) selected
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('added_to_email')}
                  disabled={isBulkUpdating}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Add to Weekly Email
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate('not_added')}
                  disabled={isBulkUpdating}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Remove from Weekly Email
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedRequestIds([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      {isSearching ? (
        <FeaturedJobListSkeletons />
      ) : (
      <div className="space-y-4">
        {requests.length > 0 ? (
          <>
            {/* Select All Header */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={
                      selectedRequestIds.length === requests.length &&
                      requests.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">
                    Select All ({requests.length} jobs)
                  </span>
                </div>
              </CardContent>
            </Card>

            {requests.map((request) => (
              <Card
                key={request.id}
                className={`hover:shadow-md transition-shadow ${selectedRequestIds.includes(request.id)
                  ? 'ring-2 ring-blue-500'
                  : ''
                  }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0 flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedRequestIds.includes(request.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRequest(request.id);
                          }}
                          className="rounded border-gray-300"
                        />
                        <div
                          onClick={() => handleRequestClick(request)}
                          className="cursor-pointer"
                        >
                          <CompanyLogo
                            companyName={request.employer.companyName}
                            companyLogoUrl={request.employer.companyLogoUrl}
                            size="md"
                          />
                        </div>
                      </div>
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => handleRequestClick(request)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {request.job.title}
                          </h3>
                          <Badge className={getStatusColor(request.status)}>
                            {getStatusIcon(request.status)}
                            {request.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {request.extensionGranted && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Extended
                            </Badge>
                          )}
                          {request.job.isCompanyPrivate && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <Shield className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Building className="h-4 w-4" />
                            <span>{request.employer.companyName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Requested {formatDate(request.requestedAt)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4" />
                            <span>
                              {request.job.payRangeText ||
                                'Pay range not provided'}
                            </span>
                          </div>
                        </div>
                        {request.job.locationText && (
                          <div className="text-sm text-gray-600 mt-1">
                            📍 {request.job.locationText}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4 text-right">
                      <div className="text-sm text-gray-500">
                        Package: {request.package.packageType}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No featured job requests found
              </h3>
              <p className="text-gray-600">
                {Object.values(filters).some((f) => f && f !== 'all')
                  ? 'Try adjusting your filters to see more results.'
                  : 'No featured job requests have been submitted yet.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
          >
            Previous
          </Button>
          <span className="mx-4">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Request Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Featured Job Request Details</DialogTitle>
            <DialogDescription>
              Manage the featured job request status and notes
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Job Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">
                  {selectedRequest.job.title}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Company:</span>{' '}
                    {selectedRequest.employer.companyName}
                  </div>
                  <div>
                    <span className="font-medium">Contact:</span>{' '}
                    {selectedRequest.employer.user.name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>{' '}
                    <span title={selectedRequest.employer.user.email}>
                      {truncateEmail(selectedRequest.employer.user.email, 30)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Category:</span>{' '}
                    {getCategoryLabel(selectedRequest.job.category)}
                  </div>
                  <div>
                    <span className="font-medium">Pay Range:</span>{' '}
                    {selectedRequest.job.payRangeText ||
                      'Pay range not provided'}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span>{' '}
                    {selectedRequest.job.locationText ||
                      'Location not provided'}
                  </div>
                  {selectedRequest.job._count && (
                    <div>
                      <span className="font-medium">Applications:</span>{' '}
                      {selectedRequest.job._count.applications}
                    </div>
                  )}
                </div>
              </div>

              {/* Applicants Section */}
              {selectedRequest.job.applications &&
                selectedRequest.job.applications.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Applicants ({selectedRequest.job.applications.length})
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                      <div className="space-y-3">
                        {selectedRequest.job.applications.map(
                          (application: any) => (
                            <div
                              key={application.id}
                              className="flex items-center justify-between p-3 bg-white rounded border"
                            >
                              <div className="flex items-center gap-3">
                                <UserProfilePicture
                                  userId={application.seeker.user.email}
                                  userName={application.seeker.user.name}
                                  profilePictureUrl={
                                    application.seeker.user.profilePictureUrl
                                  }
                                  size="sm"
                                />
                                <div>
                                  <p className="font-medium text-sm">
                                    {application.seeker.user.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {application.seeker.user.email}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Applied:{' '}
                                    {new Date(
                                      application.appliedAt
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getApplicationStatusColor(
                                  application.status
                                )}`}
                              >
                                {formatApplicationStatus(application.status)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {selectedRequest.job.applications &&
                selectedRequest.job.applications.length === 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Applicants (0)
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-500 text-sm">
                        No applications yet
                      </p>
                    </div>
                  </div>
                )}

              {/* Request Status */}
              <div>
                <h4 className="font-semibold mb-3">Request Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">Current Status:</span>
                      <Badge
                        className={`ml-2 ${getStatusColor(
                          selectedRequest.status
                        )}`}
                      >
                        {getStatusIcon(selectedRequest.status)}
                        {selectedRequest.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>
                      Requested: {formatDate(selectedRequest.requestedAt)}
                    </div>
                    {selectedRequest.startedAt && (
                      <div>
                        Started: {formatDate(selectedRequest.startedAt)}
                      </div>
                    )}
                    {selectedRequest.completedAt && (
                      <div>
                        Completed: {formatDate(selectedRequest.completedAt)}
                      </div>
                    )}
                    {selectedRequest.extensionGranted &&
                      selectedRequest.extensionExpiresAt && (
                        <div>
                          Extension expires:{' '}
                          {formatDate(selectedRequest.extensionExpiresAt)}
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {selectedRequest.status === 'not_added' && (
                  <Button
                    onClick={() =>
                      handleStatusUpdate(selectedRequest.id, 'added_to_email')
                    }
                    disabled={isUpdating}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Add to Weekly Email
                  </Button>
                )}

                {selectedRequest.status === 'added_to_email' && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleStatusUpdate(selectedRequest.id, 'not_added')
                    }
                    disabled={isUpdating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Remove from Weekly Email
                  </Button>
                )}

                {/* Fallback buttons for any status that doesn't match our expected values */}
                {selectedRequest.status !== 'not_added' &&
                  selectedRequest.status !== 'added_to_email' && (
                    <>
                      <Button
                        onClick={() =>
                          handleStatusUpdate(
                            selectedRequest.id,
                            'added_to_email'
                          )
                        }
                        disabled={isUpdating}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Add to Weekly Email
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          handleStatusUpdate(selectedRequest.id, 'not_added')
                        }
                        disabled={isUpdating}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Remove from Weekly Email
                      </Button>
                    </>
                  )}

                {!selectedRequest.extensionGranted && selectedRequest.status !== 'not_added' && (
                  <Button
                    variant="outline"
                    onClick={() => handleGrantExtension(selectedRequest.id)}
                    disabled={isUpdating}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Grant 30-Day Extension
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}