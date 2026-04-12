"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { JobVettingCard } from "@/components/admin/JobVettingCard";
import { useToast } from "@/components/ui/toast";
import { getCategoryLabel } from "@/lib/job-constants";
import {
  Users,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye,
  Filter,
  Search,
  Star,
  Mail,
  UserCheck,
  ArrowRight,
  Pause,
} from "@/components/icons";

interface DashboardStats {
  totalUsers: number;
  totalEmployers: number;
  totalJobSeekers: number;
  pendingJobs: number;
  approvedJobs: number;
  pausedJobs: number;
  rejectedJobs: number;
  totalApplications: number;
  flaggedContent: number;
  pendingFeaturedJobs: number;
  pendingEmailBlasts: number;
  pendingConcierge: number;
  expiringEmailBlasts: number;
}

interface PendingJob {
  id: string;
  title: string;
  companyName: string;
  companyLogoUrl?: string;
  employerId: string;
  employerName: string;
  createdAt: string;
  category: string;
  type: string;
}

interface FeaturedJobRequest {
  id: string;
  jobId: string;
  status: string;
  requestedAt: string;
  job: {
    title: string;
    employer: {
      companyName: string;
    };
  };
}

interface EmailBlastRequest {
  id: string;
  jobId: string;
  status: string;
  requestedAt: string;
  expiresAt: string;
  job: {
    title: string;
    employer: {
      companyName: string;
    };
  };
}

interface ConciergeRequest {
  id: string;
  jobId: string;
  status: string;
  createdAt: string;
  job: {
    title: string;
    employer: {
      companyName: string;
    };
  };
}

interface ApiResponse {
  users: {
    total: number;
    recent: number;
    byRole: Record<string, number>;
  };
  jobs: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    paused?: number;
    recent: number;
    conversionRate: number;
  };
  applications: {
    total: number;
    pending: number;
    averagePerJob: number;
    byStatus: Record<string, number>;
  };
  recentPendingJobs: PendingJob[];
}

interface JobVettingData {
  id: string;
  title: string;
  companyName: string;
  companyLogoUrl?: string;
  companyWebsite?: string;
  location: string;
  jobType: string;
  experienceLevel: string;
  salaryMin: number;
  salaryMax: number;
  salaryType: string;
  description: string;
  requirements: string;
  benefits?: string;
  skills: string[];
  submittedAt: string;
  status: "pending" | "reviewing" | "approved" | "rejected";
  employerEmail: string;
  applicationDeadline?: string;
  flaggedReasons?: string[];
  adminNotes?: string;
  employerId: string;
  isCompanyPrivate: boolean;
  packageInfo?: {
    packageType: string;
    listingsRemaining: number;
    expiresAt: string | null;
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [vettingJobs, setVettingJobs] = useState<JobVettingData[]>([]);
  const [featuredJobRequests, setFeaturedJobRequests] = useState<
    FeaturedJobRequest[]
  >([]);
  const [emailBlastRequests, setEmailBlastRequests] = useState<
    EmailBlastRequest[]
  >([]);
  const [conciergeRequests, setConciergeRequests] = useState<
    ConciergeRequest[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log("Loading admin dashboard data...");

      // Fetch multiple data sources in parallel
      const [
        statsResponse,
        featuredResponse,
        emailBlastResponse,
        conciergeResponse,
        vettingResponse,
      ] = await Promise.all([
        fetch("/api/admin/dashboard/stats"),
        fetch("/api/admin/featured-jobs?status=not_started&limit=5"),
        fetch("/api/admin/solo-email-blasts?status=not_started&limit=5"),
        fetch("/api/admin/concierge?status=pending&limit=5"),
        fetch("/api/admin/jobs/vetting?status=pending&limit=5"),
      ]);

      if (!statsResponse.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const statsText = await statsResponse.text();
      if (
        statsText.trim().startsWith("<!DOCTYPE") ||
        statsText.trim().startsWith("<html")
      ) {
        // Session expired, redirect to sign-in
        window.location.href = "/sign-in";
        return;
      }
      const data: ApiResponse = JSON.parse(statsText);

      // Get vetting jobs data (full data for JobVettingCard)
      if (vettingResponse.ok) {
        const vettingText = await vettingResponse.text();
        if (
          !vettingText.trim().startsWith("<!DOCTYPE") &&
          !vettingText.trim().startsWith("<html")
        ) {
          const vettingData = JSON.parse(vettingText);
          setVettingJobs(vettingData.jobs?.slice(0, 5) || []);
        }
      }

      // Get featured jobs data
      let featuredData = { requests: [] };
      if (featuredResponse.ok) {
        const featuredText = await featuredResponse.text();
        if (
          featuredText.trim().startsWith("<!DOCTYPE") ||
          featuredText.trim().startsWith("<html")
        ) {
          // Session expired, redirect to sign-in
          window.location.href = "/sign-in";
          return;
        }
        featuredData = JSON.parse(featuredText);
        setFeaturedJobRequests(featuredData.requests || []);
      }

      // Get email blast data
      let emailBlastData = { requests: [] };
      if (emailBlastResponse.ok) {
        const emailBlastText = await emailBlastResponse.text();
        if (
          emailBlastText.trim().startsWith("<!DOCTYPE") ||
          emailBlastText.trim().startsWith("<html")
        ) {
          // Session expired, redirect to sign-in
          window.location.href = "/sign-in";
          return;
        }
        emailBlastData = JSON.parse(emailBlastText);
        setEmailBlastRequests(emailBlastData.requests || []);
      }

      // Get concierge data
      let conciergeData = { requests: [] };
      if (conciergeResponse.ok) {
        const conciergeText = await conciergeResponse.text();
        if (
          conciergeText.trim().startsWith("<!DOCTYPE") ||
          conciergeText.trim().startsWith("<html")
        ) {
          // Session expired, redirect to sign-in
          window.location.href = "/sign-in";
          return;
        }
        conciergeData = JSON.parse(conciergeText);
        setConciergeRequests(conciergeData.requests || []);
      }

      // Count expiring email blasts (within 2 days)
      const now = new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const expiringCount = (emailBlastData.requests || []).filter(
        (req: EmailBlastRequest) =>
          new Date(req.expiresAt) <= twoDaysFromNow &&
          new Date(req.expiresAt) > now
      ).length;

      // Transform API response to match component expectations
      const transformedStats: DashboardStats = {
        totalUsers: data.users.total,
        totalEmployers: data.users.byRole.employer || 0,
        totalJobSeekers: data.users.byRole.seeker || 0,
        pendingJobs: data.jobs.pending,
        approvedJobs: data.jobs.approved,
        pausedJobs: data.jobs.paused || 0,
        rejectedJobs: data.jobs.rejected,
        totalApplications: data.applications.total,
        flaggedContent: 0, // This would need to be implemented separately
        pendingFeaturedJobs: (featuredData.requests || []).length,
        pendingEmailBlasts: (emailBlastData.requests || []).length,
        pendingConcierge: (conciergeData.requests || []).length,
        expiringEmailBlasts: expiringCount,
      };

      setStats(transformedStats);
      setPendingJobs(data.recentPendingJobs);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToJobs = () => {
    router.push("/admin/jobs");
  };

  const handleNavigateToFeaturedJobs = () => {
    router.push("/admin/featured-jobs");
  };

  const handleNavigateToEmailBlasts = () => {
    router.push("/admin/solo-email-blasts");
  };

  const handleNavigateToConcierge = () => {
    router.push("/admin/concierge");
  };

  const handleStatusChange = async (
    jobId: string,
    newStatus: string,
    notes?: string,
    isManualApproval?: boolean
  ) => {
    try {
      const response = await fetch("/api/admin/jobs/vetting", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
          status: newStatus,
          adminNotes: notes,
          isManualApproval,
        }),
      });

      if (response.ok) {
        // Update local state
        setVettingJobs((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: newStatus as
                    | "pending"
                    | "reviewing"
                    | "approved"
                    | "rejected",
                  adminNotes: notes || job.adminNotes,
                }
              : job
          )
        );

        addToast({
          title: "Job Status Updated",
          description: `Job status updated to ${
            newStatus === "rejected" ? "Declined" : newStatus
          }`,
          variant: "success",
        });

        // Refresh dashboard data to update stats
        loadDashboardData();
      }
    } catch (error) {
      console.error("Error updating job status:", error);
      addToast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Error Loading Dashboard
          </h1>
          <Button onClick={loadDashboardData}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Monitor platform activity and manage premium services
        </p>
      </div>

      {/* Priority Actions - New Featured Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
          Requires Immediate Attention
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            className={`border-2 ${
              stats?.pendingFeaturedJobs
                ? "border-purple-300 bg-purple-50"
                : "border-gray-200"
            }`}
          >
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-purple-600">
                {stats?.pendingFeaturedJobs || 0}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                Featured Job Requests
              </div>
              <Button
                size="sm"
                variant={stats?.pendingFeaturedJobs ? "default" : "outline"}
                onClick={handleNavigateToFeaturedJobs}
                className="w-full"
              >
                {stats?.pendingFeaturedJobs ? "Process Now" : "View All"}
              </Button>
            </CardContent>
          </Card>

          <Card
            className={`border-2 ${
              stats?.pendingEmailBlasts || stats?.expiringEmailBlasts
                ? "border-blue-300 bg-blue-50"
                : "border-gray-200"
            }`}
          >
            <CardContent className="p-4 text-center">
              <Mail className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">
                {stats?.pendingEmailBlasts || 0}
              </div>
              <div className="text-sm text-gray-600 mb-1">
                Email Blast Requests
              </div>
              {stats?.expiringEmailBlasts ? (
                <div className="text-xs text-orange-600 font-medium mb-2">
                  {stats.expiringEmailBlasts} expiring soon!
                </div>
              ) : (
                <div className="mb-3"></div>
              )}
              <Button
                size="sm"
                variant={
                  stats?.pendingEmailBlasts || stats?.expiringEmailBlasts
                    ? "default"
                    : "outline"
                }
                onClick={handleNavigateToEmailBlasts}
                className="w-full"
              >
                {stats?.pendingEmailBlasts || stats?.expiringEmailBlasts
                  ? "Process Now"
                  : "View All"}
              </Button>
            </CardContent>
          </Card>

          <Card
            className={`border-2 ${
              stats?.pendingConcierge
                ? "border-green-300 bg-green-50"
                : "border-gray-200"
            }`}
          >
            <CardContent className="p-4 text-center">
              <UserCheck className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">
                {stats?.pendingConcierge || 0}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                Concierge Requests
              </div>
              <Button
                size="sm"
                variant={stats?.pendingConcierge ? "default" : "outline"}
                onClick={handleNavigateToConcierge}
                className="w-full"
              >
                {stats?.pendingConcierge ? "Process Now" : "View All"}
              </Button>
            </CardContent>
          </Card>

          <Card
            className={`border-2 ${
              stats?.pendingJobs
                ? "border-yellow-300 bg-yellow-50"
                : "border-gray-200"
            }`}
          >
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.pendingJobs || 0}
              </div>
              <div className="text-sm text-gray-600 mb-3">Job Vetting</div>
              <Button
                size="sm"
                variant={stats?.pendingJobs ? "default" : "outline"}
                onClick={handleNavigateToJobs}
                className="w-full"
              >
                {stats?.pendingJobs ? "Review Now" : "View All"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-brand-teal shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-brand-teal-light rounded-lg">
                <Users className="h-6 w-6 text-brand-teal" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalUsers.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-brand-coral shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-brand-coral-light rounded-lg">
                <Building2 className="h-6 w-6 text-brand-coral" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Employers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalEmployers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Job Seekers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalJobSeekers.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Applications
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalApplications.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Vetting Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingJobs}
            </div>
            <div className="text-sm text-gray-600">Pending Review</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.approvedJobs}
            </div>
            <div className="text-sm text-gray-600">Approved Jobs</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <Pause className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {stats.pausedJobs}
            </div>
            <div className="text-sm text-gray-600">Paused Jobs</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.rejectedJobs}
            </div>
            <div className="text-sm text-gray-600">Declined Jobs</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stats.flaggedContent}
            </div>
            <div className="text-sm text-gray-600">Flagged Content</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Premium Service Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Featured Jobs Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-purple-600" />
                <span>Recent Featured Job Requests</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNavigateToFeaturedJobs}
              >
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {featuredJobRequests.length > 0 ? (
                featuredJobRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {request.job.title}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {request.job.employer.companyName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Requested{" "}
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                      {request.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No pending featured job requests</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Blast Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <span>Recent Email Blast Requests</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNavigateToEmailBlasts}
              >
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {emailBlastRequests.length > 0 ? (
                emailBlastRequests.map((request) => {
                  const isExpiringSoon =
                    new Date(request.expiresAt) <=
                    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {request.job.title}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {request.job.employer.companyName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Expires{" "}
                          {new Date(request.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          {request.status.replace("_", " ")}
                        </Badge>
                        {isExpiringSoon && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No pending email blast requests</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Concierge Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <span>Recent Concierge Requests</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNavigateToConcierge}
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {conciergeRequests.length > 0 ? (
              conciergeRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{request.job.title}</h4>
                    <p className="text-xs text-gray-600">
                      {request.job.employer.companyName}
                    </p>
                    <p className="text-xs text-gray-500">
                      Requested{" "}
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    {request.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending concierge requests</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Job Submissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Job Submissions</CardTitle>
              <CardDescription>
                Latest job postings requiring review
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vettingJobs.map((job) => (
              <JobVettingCard
                key={job.id}
                job={job}
                onStatusChange={handleStatusChange}
                onFlag={() => Promise.resolve()}
                showQuickActions={true}
                reviewButtonLabel="Review"
              />
            ))}

            {vettingJobs.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  All caught up!
                </h3>
                <p className="text-gray-600">
                  No pending job submissions to review.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
