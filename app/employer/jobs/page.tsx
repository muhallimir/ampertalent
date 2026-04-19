"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getImpersonationSession } from "@/lib/admin-impersonation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useToast } from "@/components/ui/toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Users,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  MoreHorizontal,
  Filter,
  Copy,
  Archive,
  Share,
  CheckCircle,
  RotateCcw,
  MessageSquare,
  Loader2,
  Pause,
  AlertTriangle,
} from "lucide-react";
import { getWordpressJobUrl } from "@/app/data-access/jobs";

interface JobPosting {
  id: string;
  title: string;
  location: string;
  jobType: "full-time" | "part-time" | "contract" | "freelance";
  experienceLevel: "entry" | "mid" | "senior" | "lead";
  salaryMin: number;
  salaryMax: number;
  salaryType: "hourly" | "monthly" | "yearly";
  status:
  | "active"
  | "pending_review"
  | "reviewing"
  | "rejected"
  | "expired"
  | "draft"
  | "pending_payment"
  | "filled"
  | "paused";
  rejectionReason?: string;
  applicationsCount: number;
  viewsCount: number;
  createdAt: string;
  expiresAt: string;
  skills: string[];
  selectedPackage?: string;
  packageInfo?: {
    packageType: string;
    listingsRemaining: number;
    expiresAt: string | null;
  };
  featuredInfo?: {
    isFeatured: boolean;
    status: string;
    requestedAt?: string;
    completedAt?: string;
    extensionGranted?: boolean;
    extensionExpiresAt?: string;
    packageType: string;
  };
  emailBlastInfo?: {
    isEmailBlast: boolean;
    status: string;
    requestedAt?: string;
    completedAt?: string;
    expiresAt?: string;
    packageType: string;
    hasContent?: boolean;
  };
  // Concierge information
  conciergeRequested?: boolean;
  conciergeStatus?: string;
  chatEnabled?: boolean;
  unreadMessageCount?: number;
  isPending?: boolean;
  // Archive fields
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  // Pause fields
  isPaused?: boolean;
  pausedAt?: string;
  pausedBy?: string;
  pausedDaysRemaining?: number;
}

export default function EmployerJobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [allJobs, setAllJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [archiveView, setArchiveView] = useState<"active" | "archived" | "draft" | "all">("active");
  const [hasInitializedView, setHasInitializedView] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const [reconsiderDialog, setReconsiderDialog] = useState<{
    isOpen: boolean;
    jobId: string;
    jobTitle: string;
  }>({
    isOpen: false,
    jobId: "",
    jobTitle: "",
  });
  const [isReconsiderLoading, setIsReconsiderLoading] = useState(false);
  const [archivingJobId, setArchivingJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [deletingPendingJobId, setDeletingPendingJobId] = useState<
    string | null
  >(null);
  const [navigatingAction, setNavigatingAction] = useState<{
    jobId: string
    action: 'edit' | 'applications' | 'draftEdit'
  } | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Load jobs function - always fetches all jobs for accurate counts
  const loadJobs = useCallback(async (isAutoRefresh = false, forceLoad = false) => {
    // If not forcing a load and we already have data, skip the API call
    if (!forceLoad && !isAutoRefresh && allJobs.length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      console.log(
        "Loading all employer jobs...",
        isAutoRefresh ? "(auto-refresh)" : forceLoad ? "(forced)" : "(initial)"
      );

      // Check for impersonation context only on client side
      const headers: HeadersInit = {};

      if (typeof window !== "undefined") {
        const impersonationSession = getImpersonationSession();
        if (impersonationSession) {
          console.log(
            "🎭 FRONTEND: Adding impersonation headers to jobs request",
            {
              impersonatedUserId: impersonationSession.impersonatedUser.id,
              adminId: impersonationSession.adminId,
            }
          );
          headers["x-impersonated-user-id"] =
            impersonationSession.impersonatedUser.id;
          headers["x-admin-user-id"] = impersonationSession.adminId;
        }
      }

      // Always fetch all jobs (including archived) for accurate counts
      const apiUrl = "/api/employer/jobs?includeArchived=true";
      const response = await fetch(apiUrl, { headers });

      if (response.ok) {
        const data = await response.json();
        const fetchedJobs = data.jobs || [];

        // Store all jobs for counting
        setAllJobs(fetchedJobs);

        // Smart default tab selection logic (only on first load, not auto-refresh)
        if (!isAutoRefresh && !hasInitializedView) {
          // Count truly active jobs (approved status, not expired, not archived)
          const isJobActive = (job: JobPosting) => {
            const isExpired = job.expiresAt && new Date(job.expiresAt) < new Date();
            return job.status === "active" && !isExpired && !job.isArchived;
          };

          const activeJobsCount = fetchedJobs.filter(isJobActive).length;
          const totalJobsCount = fetchedJobs.length;

          // If no truly active jobs but has other jobs, default to "All Jobs" tab
          // If no jobs at all, stay on "Active Jobs" tab for welcome message
          if (activeJobsCount === 0 && totalJobsCount > 0) {
            setArchiveView("all");
          }
          setHasInitializedView(true);
        }

        // Filter jobs based on current archive view
        let filteredJobs = fetchedJobs;
        if (archiveView === "active") {
          // Show only jobs with active status, not expired, and not archived
          const isExpired = (job: JobPosting) => job.expiresAt && new Date(job.expiresAt) < new Date();
          filteredJobs = fetchedJobs.filter((job: JobPosting) => job.status === "active" && !isExpired && !job.isArchived);
        } else if (archiveView === "archived") {
          filteredJobs = fetchedJobs.filter((job: JobPosting) => job.isArchived);
        } else if (archiveView === "draft") {
          filteredJobs = fetchedJobs.filter((job: JobPosting) => !job.isArchived && job.status === "draft");
        }
        // For "all", no filtering needed

        setJobs(filteredJobs);
        setLastRefresh(new Date());
      } else {
        console.error(
          "Failed to load jobs",
          response.status,
          response.statusText
        );
        // For auto-refresh, don't clear existing jobs on error - just log it
        if (!isAutoRefresh) {
          setJobs([]);
          setAllJobs([]);
        }
      }
    } catch (error) {
      console.error("Error loading jobs:", error);
      // For auto-refresh, don't clear existing jobs on error - just log it
      if (!isAutoRefresh) {
        setJobs([]);
        setAllJobs([]);
      }
    } finally {
      setIsLoading(false)
    }
  }, [archiveView, hasInitializedView, allJobs.length]); // Dependencies for useCallback

  // Initial load effect - separate from loadJobs to avoid dependency issues
  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true);
      try {
        console.log("Loading all employer jobs... (initial)");

        // Check for impersonation context only on client side
        const headers: HeadersInit = {};

        if (typeof window !== "undefined") {
          const impersonationSession = getImpersonationSession();
          if (impersonationSession) {
            console.log(
              "🎭 FRONTEND: Adding impersonation headers to jobs request",
              {
                impersonatedUserId: impersonationSession.impersonatedUser.id,
                adminId: impersonationSession.adminId,
              }
            );
            headers["x-impersonated-user-id"] =
              impersonationSession.impersonatedUser.id;
            headers["x-admin-user-id"] = impersonationSession.adminId;
          }
        }

        // Always fetch all jobs (including archived) for accurate counts
        const apiUrl = "/api/employer/jobs?includeArchived=true";
        const response = await fetch(apiUrl, { headers });

        if (response.ok) {
          const data = await response.json();
          const fetchedJobs = data.jobs || [];

          // Smart default tab selection logic (only on first load)
          // Determine which tab to show based on available jobs
          const isJobActive = (job: JobPosting) => {
            const isExpired = job.expiresAt && new Date(job.expiresAt) < new Date();
            return job.status === "active" && !isExpired && !job.isArchived;
          };

          const activeJobsCount = fetchedJobs.filter(isJobActive).length;
          const totalJobsCount = fetchedJobs.length;

          // Check if we should force "all" tab (e.g., from pending jobs dashboard link)
          const forceAllTab = searchParams.get('pendingJobs') === 'true' || searchParams.get('defaultTab') === 'all';

          // Default to "active" tab, but switch to "all" if no active jobs exist OR if forced by query param
          const defaultView: "active" | "all" =
            forceAllTab || (activeJobsCount === 0 && totalJobsCount > 0) ? "all" : "active";

          // Update all states together to ensure consistency
          setAllJobs(fetchedJobs);
          setArchiveView(defaultView);
          setHasInitializedView(true);
          setLastRefresh(new Date());
        } else {
          console.error(
            "Failed to load jobs",
            response.status,
            response.statusText
          );
          setJobs([]);
          setAllJobs([]);
        }
      } catch (error) {
        console.error("Error loading jobs:", error);
        setJobs([]);
        setAllJobs([]);
      } finally {
        setIsLoading(false);
      }
    };

    initialLoad();

    // Remove aggressive auto-refresh to prevent infinite API calls
    // Jobs will be refreshed on user actions and focus events instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - tab switching is handled by switchArchiveView

  // Effect to filter jobs whenever allJobs or archiveView changes
  useEffect(() => {
    if (allJobs.length === 0) return; // Don't filter if no jobs loaded yet

    let filteredJobs = allJobs;
    if (archiveView === "active") {
      // Show only jobs with active status, not expired, and not archived
      const isExpired = (job: JobPosting) => job.expiresAt && new Date(job.expiresAt) < new Date();
      filteredJobs = allJobs.filter((job: JobPosting) => job.status === "active" && !isExpired(job) && !job.isArchived);
    } else if (archiveView === "archived") {
      filteredJobs = allJobs.filter((job: JobPosting) => job.isArchived);
    } else if (archiveView === "draft") {
      filteredJobs = allJobs.filter((job: JobPosting) => !job.isArchived && job.status === "draft");
    }
    // For "all", no filtering needed

    setJobs(filteredJobs);
  }, [allJobs, archiveView]);

  // Function to switch archive view - filters locally instead of API call
  const switchArchiveView = (newView: "active" | "archived" | "draft" | "all") => {
    if (newView === archiveView) return; // No change needed

    setIsTabSwitching(true);

    setArchiveView(newView);

    // Reset status filter when switching to filtered views (archived/draft/active) since they don't need status filtering
    if (newView === "archived" || newView === "draft" || newView === "active") {
      setStatusFilter("all");
    }

    // Filtering is now handled automatically by the useEffect when archiveView changes

    // Brief delay to show loading state, then hide it
    setTimeout(() => setIsTabSwitching(false), 200);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest(".relative")) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);


  // const handleStatusChange = async (jobId: string, newStatus: string) => {
  //   try {
  //     console.log(`Changing job ${jobId} status to ${newStatus}`);

  //     // Check for impersonation context only on client side
  //     const headers: HeadersInit = {
  //       'Content-Type': 'application/json',
  //     };

  //     if (typeof window !== 'undefined') {
  //       const impersonationSession = getImpersonationSession();
  //       if (impersonationSession) {
  //         headers['x-impersonated-user-id'] =
  //           impersonationSession.impersonatedUser.id;
  //         headers['x-admin-user-id'] = impersonationSession.adminId;
  //       }
  //     }

  //     const response = await fetch(`/api/employer/jobs/${jobId}/status`, {
  //       method: 'PUT',
  //       headers,
  //       body: JSON.stringify({ status: newStatus }),
  //     });

  //     if (response.ok) {
  //       setJobs((prev) =>
  //         prev.map((job) =>
  //           job.id === jobId
  //             ? { ...job, status: newStatus as JobPosting['status'] }
  //             : job
  //         )
  //       );

  //       const statusMessages = {
  //         active: 'Job activated successfully',
  //         filled: 'Job marked as filled',
  //         pending_review: 'Job submitted for review',
  //         rejected: 'Job rejected',
  //         draft: 'Job moved to draft',
  //         expired: 'Job expired',
  //       };

  //       addToast({
  //         title: 'Success!',
  //         description:
  //           statusMessages[newStatus as keyof typeof statusMessages] ||
  //           `Job status updated to ${newStatus}`,
  //         variant: 'success',
  //         duration: 3000,
  //       });
  //     } else {
  //       const error = await response.json();
  //       addToast({
  //         title: 'Error',
  //         description: error.error || 'Failed to update job status',
  //         variant: 'destructive',
  //         duration: 5000,
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Error updating job status:', error);
  //     addToast({
  //       title: 'Error',
  //       description: 'Failed to update job status. Please try again.',
  //       variant: 'destructive',
  //       duration: 5000,
  //     });
  //   }
  // };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;

    setDeletingJobId(jobId);
    try {
      console.log(`Deleting job ${jobId}`);

      // Check for impersonation context only on client side
      const headers: HeadersInit = {};

      if (typeof window !== "undefined") {
        const impersonationSession = getImpersonationSession();
        if (impersonationSession) {
          headers["x-impersonated-user-id"] =
            impersonationSession.impersonatedUser.id;
          headers["x-admin-user-id"] = impersonationSession.adminId;
        }
      }

      const response = await fetch(`/api/employer/jobs/${jobId}`, {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        setJobs((prev) => prev.filter((job) => job.id !== jobId));
        setAllJobs((prev) => prev.filter((job) => job.id !== jobId));
        addToast({
          title: "Success!",
          description: "Job posting deleted successfully",
          variant: "success",
          duration: 3000,
        });
      } else {
        const error = await response.json();
        addToast({
          title: "Error",
          description: error.error || "Failed to delete job posting",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      addToast({
        title: "Error",
        description: "Failed to delete job posting. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setDeletingJobId(null);
    }
  };

  const handleDuplicateJob = async (jobId: string, isPending: boolean) => {
    if (isPending) {
      addToast({
        title: "Error",
        description:
          "Pending jobs cannot be duplicated. Please create a new job posting.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    try {
      // Redirect to new job form with duplication parameter
      router.push(`/employer/jobs/new?duplicate=${jobId}`);
    } catch (error) {
      console.error("Error duplicating job:", error);
      addToast({
        title: "Error",
        description: "Failed to duplicate job. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleReconsiderJob = async (jobId: string, jobTitle: string) => {
    setReconsiderDialog({
      isOpen: true,
      jobId,
      jobTitle,
    });
  };

  const confirmReconsiderJob = async () => {
    try {
      setIsReconsiderLoading(true);

      // Redirect to new job form with duplication parameter
      router.push(`/employer/jobs/new?duplicate=${reconsiderDialog.jobId}`);

      // Close the dialog
      setReconsiderDialog({
        isOpen: false,
        jobId: "",
        jobTitle: "",
      });

      addToast({
        title: "Job Reconsidered",
        description:
          "Creating a new job posting based on the filled position. Review and modify as needed.",
        variant: "success",
        duration: 5000,
      });
    } catch (error) {
      console.error("Error reconsidering job:", error);
      addToast({
        title: "Error",
        description: "Failed to reconsider job. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsReconsiderLoading(false);
    }
  };

  const handleShareJob = async (jobId: string) => {
    try {
      const shareUrl: string = await getWordpressJobUrl(jobId);
      await navigator.clipboard.writeText(shareUrl);
      addToast({
        title: "Success!",
        description: "Job URL copied to clipboard",
        variant: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error sharing job:", error);
      addToast({
        title: "Error",
        description: "Failed to copy job URL",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleArchiveJob = async (jobId: string, isCurrentlyArchived: boolean = false) => {
    const action = isCurrentlyArchived ? "restore" : "archive";
    const confirmMessage = isCurrentlyArchived
      ? "Are you sure you want to restore this job?"
      : "Are you sure you want to archive this job? It will be hidden from active jobs.";

    if (!confirm(confirmMessage)) return;

    setArchivingJobId(jobId);
    try {
      console.log(`${action.charAt(0).toUpperCase() + action.slice(1)}ing job ${jobId}`);

      const response = await fetch(`/api/employer/jobs/${jobId}/archive`, {
        method: isCurrentlyArchived ? "DELETE" : "PUT",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          title: "Success",
          description: data.message,
          variant: "default",
          duration: 3000,
        });

        await loadJobs(true);
      } else {
        addToast({
          title: "Error",
          description: data.error || `Failed to ${action} job`,
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing job:`, error);
      addToast({
        title: "Error",
        description: `Failed to ${action} job. Please try again.`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setArchivingJobId(null);
    }
  };

  const handleDeletePendingJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this pending job posting?"))
      return;

    setDeletingPendingJobId(jobId);
    try {
      console.log(`Deleting pending job ${jobId}`);

      // Extract the actual pending job ID (remove 'pending_' prefix)
      const pendingJobId = jobId.replace("pending_", "");

      // Check for impersonation context only on client side
      const headers: HeadersInit = {};

      if (typeof window !== "undefined") {
        const impersonationSession = getImpersonationSession();
        if (impersonationSession) {
          headers["x-impersonated-user-id"] =
            impersonationSession.impersonatedUser.id;
          headers["x-admin-user-id"] = impersonationSession.adminId;
        }
      }

      const response = await fetch(
        `/api/employer/jobs/pending/${pendingJobId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (response.ok) {
        setJobs((prev) => prev.filter((job) => job.id !== jobId));
        setAllJobs((prev) => prev.filter((job) => job.id !== jobId));
        addToast({
          title: "Success!",
          description: "Pending job posting deleted successfully",
          variant: "success",
          duration: 3000,
        });
      } else {
        const error = await response.json();
        addToast({
          title: "Error",
          description: error.error || "Failed to delete pending job posting",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error deleting pending job:", error);
      addToast({
        title: "Error",
        description: "Failed to delete pending job posting. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setDeletingPendingJobId(null);
    }
  };

  const formatSalary = (min: number, max: number, type: string) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    });

    const period =
      type === "hourly" ? "/hr" : type === "monthly" ? "/mo" : "/yr";
    return `${formatter.format(min)} - ${formatter.format(max)} ${period}`;
  };

  const getStatusColor = (status: string, isPaused?: boolean) => {
    // If job is paused, use yellow color
    if (isPaused) {
      return "bg-yellow-100 text-yellow-800";
    }

    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "filled":
        return "bg-purple-100 text-purple-800";
      case "pending_review":
        return "bg-yellow-100 text-yellow-800";
      case "reviewing":
        return "bg-blue-100 text-blue-800";
      case "pending_payment":
        return "bg-orange-100 text-orange-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "expired":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "filled":
        return "Filled";
      case "pending_review":
        return "Pending Review";
      case "paused":
        return "Paused by admin";
      case "reviewing":
        return "Reviewing";
      case "pending_payment":
        return "Pending Payment";
      case "rejected":
        return "Rejected";
      case "expired":
        return "Expired";
      case "draft":
        return "Draft";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPackageDisplayName = (packageType: string) => {
    switch (packageType) {
      case "starter":
        return "Starter Package";
      case "professional":
        return "Professional Package";
      case "enterprise":
        return "Enterprise Package";
      case "unlimited":
        return "Unlimited Package";
      case "standard":
        return "Standard Package";
      case "featured":
        return "Featured Job";
      case "email_blast":
        return "Email Blast";
      case "gold_plus":
        return "Gold Plus Package";
      // Concierge packages
      case "concierge_lite":
        return "Concierge LITE (Legacy)";
      case "concierge_level_1":
        return "Concierge Level I";
      case "concierge_level_2":
        return "Concierge Level II";
      case "concierge_level_3":
        return "Concierge Level III";
      // Current naming conventions
      case "standard_job_post":
        return "Standard Job Post";
      case "featured_job_post":
        return "Featured Job Post";
      case "solo_email_blast":
        return "Solo Email Blast";
      case "gold_plus_6_month":
        return "Gold Plus 6 Month";
      default:
        return (
          packageType.charAt(0).toUpperCase() +
          packageType.slice(1).replace(/_/g, " ")
        );
    }
  };

  const getPackageBadgeColor = (packageType: string) => {
    switch (packageType) {
      case "starter":
      case "standard":
        return "bg-blue-100 text-blue-800";
      case "professional":
      case "featured":
        return "bg-purple-100 text-purple-800";
      case "enterprise":
      case "gold_plus":
        return "bg-green-100 text-green-800";
      case "unlimited":
        return "bg-yellow-100 text-yellow-800";
      case "email_blast":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Helper function to get job-specific package badges
  const getJobPackageBadges = (job: JobPosting) => {
    const badges = [];

    // Archive status badge (always show if archived, highest priority)
    if (job.isArchived) {
      badges.push({
        type: "archived",
        label: "Archived",
        color: "bg-gray-100 text-gray-800",
      });
    }

    // Check for Concierge Service
    if (job.conciergeRequested) {
      if (job.chatEnabled) {
        badges.push({
          type: "concierge_active",
          label: "Concierge Service",
          color: "bg-teal-100 text-teal-800",
        });
      } else {
        badges.push({
          type: "concierge_pending",
          label: "Concierge Pending",
          color: "bg-teal-100 text-teal-600",
        });
      }
    }

    // Check for Featured Job
    if (
      job.featuredInfo?.isFeatured &&
      job.featuredInfo?.status === "completed"
    ) {
      badges.push({
        type: "featured",
        label: "Featured Job",
        color: "bg-purple-100 text-purple-800",
      });
    }

    // Check for Email Blast
    if (job.emailBlastInfo?.isEmailBlast) {
      if (job.emailBlastInfo?.status === "completed") {
        badges.push({
          type: "email_blast",
          label: "Email Blast",
          color: "bg-orange-100 text-orange-800",
        });
      } else if (job.emailBlastInfo?.status === "pending") {
        badges.push({
          type: "email_blast_in_progress",
          label: "Email Blast In Progress",
          color: "bg-yellow-100 text-yellow-800",
        });
      } else if (
        job.emailBlastInfo?.status === "not_started" &&
        !job.emailBlastInfo?.hasContent
      ) {
        badges.push({
          type: "email_blast_missing",
          label: "Missing Email Content",
          color: "bg-red-100 text-red-800",
        });
      } else if (
        job.emailBlastInfo?.status === "not_started" &&
        job.emailBlastInfo?.hasContent
      ) {
        badges.push({
          type: "email_blast_queued",
          label: "Email Blast Queued",
          color: "bg-blue-100 text-blue-800",
        });
      }
    }

    // Fallback to package info if no specific features
    if (badges.length === 0 && job.packageInfo) {
      badges.push({
        type: job.packageInfo.packageType,
        label: getPackageDisplayName(job.packageInfo.packageType),
        color: getPackageBadgeColor(job.packageInfo.packageType),
      });
    }

    return badges;
  };

  const filteredJobs = jobs
    .filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      let matchesStatus = true;
      if (archiveView === "all") {
        if (statusFilter === "all") {
          matchesStatus = true;
        } else if (statusFilter === "active") {
          // Active means: not archived AND has active status
          matchesStatus = !job.isArchived && job.status === "active";
        } else if (statusFilter === "draft") {
          // Draft means: not archived AND has draft status
          matchesStatus = !job.isArchived && job.status === "draft";
        } else if (statusFilter === "archived") {
          matchesStatus = !!job.isArchived;
        } else {
          // For other statuses, exclude archived jobs
          matchesStatus = !job.isArchived && job.status === statusFilter;
        }
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Priority 1: Jobs requiring payment (pending_payment status)
      const aRequiresPayment = a.status === "pending_payment";
      const bRequiresPayment = b.status === "pending_payment";

      if (aRequiresPayment && !bRequiresPayment) return -1;
      if (!aRequiresPayment && bRequiresPayment) return 1;

      // Priority 2: Jobs with email blast missing content
      const aMissingEmailContent =
        a.emailBlastInfo?.isEmailBlast &&
        a.emailBlastInfo?.status === "not_started" &&
        !a.emailBlastInfo?.hasContent;
      const bMissingEmailContent =
        b.emailBlastInfo?.isEmailBlast &&
        b.emailBlastInfo?.status === "not_started" &&
        !b.emailBlastInfo?.hasContent;

      if (aMissingEmailContent && !bMissingEmailContent) return -1;
      if (!aMissingEmailContent && bMissingEmailContent) return 1;

      // Priority 3: Active jobs come before other statuses
      const aIsActive = a.status === "active" && !a.isArchived;
      const bIsActive = b.status === "active" && !b.isArchived;

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // Default: Sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // An "active" job is one with status "active" (not expired and not archived)
  const isJobActive = (job: JobPosting) => {
    const isExpired = job.expiresAt && new Date(job.expiresAt) < new Date();
    return job.status === "active" && !isExpired && !job.isArchived;
  };

  // Stats should always be calculated from ALL jobs, not just the filtered view
  const jobStats = {
    total: allJobs.length,
    active: allJobs.filter(isJobActive).length,
    filled: allJobs.filter((j) => j.status === "filled").length,
    totalApplications: allJobs.reduce(
      (sum, job) => sum + job.applicationsCount,
      0
    ),
    totalViews: allJobs.reduce((sum, job) => sum + job.viewsCount, 0),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Job Postings
          </h1>
          <div className="flex items-center space-x-4">
            <p className="text-gray-600">
              Manage your job postings and track applications
            </p>
            {lastRefresh && (
              <span className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => {
              setIsLoading(true);
              loadJobs(false); // Pass false to indicate this is a manual refresh
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
          <Button onClick={() => router.push("/employer/jobs/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Post New Job
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobStats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobStats.active}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Filled Jobs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobStats.filled}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Applications
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobStats.totalApplications}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Eye className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobStats.totalViews}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Archive View Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => switchArchiveView("active")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${archiveView === "active"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Active Jobs ({allJobs.filter(isJobActive).length})
            </button>
            <button
              onClick={() => switchArchiveView("draft")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${archiveView === "draft"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Draft Jobs ({allJobs.filter(job => !job.isArchived && job.status === "draft").length})
            </button>
            <button
              onClick={() => switchArchiveView("archived")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${archiveView === "archived"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Archived Jobs ({allJobs.filter(job => job.isArchived).length})
            </button>
            <button
              onClick={() => switchArchiveView("all")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${archiveView === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              All Jobs ({allJobs.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search jobs by title or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              {/* Show status filter dropdown only for "All Jobs" tab */}
              {archiveView === "all" ? (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="pending_payment">Pending Payment</SelectItem>
                    <SelectItem value="rejected">Declined</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="px-3 py-2 text-sm text-gray-600 bg-gray-50 border border-gray-300 rounded-md">
                  {archiveView === "active" && "Showing all active jobs"}
                  {archiveView === "draft" && "Showing all draft jobs"}
                  {archiveView === "archived" && "Showing all archived jobs"}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Listings */}
      <div className="space-y-4">
        {isLoading || isTabSwitching ? (
          // Skeleton loading for tab switching
          <>
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-4" />
                      <div className="flex items-center space-x-4 mb-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              {(() => {
                // Calculate job counts for intelligent empty state messaging
                // Must use the same isJobActive filter as the tab counting and display filtering
                const isExpired = (job: JobPosting) => job.expiresAt && new Date(job.expiresAt) < new Date();
                const activeJobsCount = allJobs.filter(job => job.status === "active" && !isExpired(job) && !job.isArchived).length;
                const draftJobsCount = allJobs.filter(job => !job.isArchived && job.status === "draft").length;
                const archivedJobsCount = allJobs.filter(job => job.isArchived).length;
                const totalJobsCount = allJobs.length;

                // If actively searching/filtering, show search message
                if (debouncedSearchTerm || statusFilter !== "all") {
                  return (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No jobs found
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Try adjusting your search or filters
                      </p>
                    </>
                  );
                }

                // If no jobs at all (completely new user)
                if (totalJobsCount === 0) {
                  return (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Welcome! Ready to post your first job?
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Get started by posting your first job and connect with talented professionals
                      </p>
                      <Button onClick={() => router.push("/employer/jobs/new")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Post Your First Job
                      </Button>
                    </>
                  );
                }

                // Context-aware messaging based on current tab and available jobs
                if (archiveView === "active" && activeJobsCount === 0) {
                  const otherJobs = [];
                  if (draftJobsCount > 0) otherJobs.push(`${draftJobsCount} draft job${draftJobsCount > 1 ? 's' : ''}`);
                  if (archivedJobsCount > 0) otherJobs.push(`${archivedJobsCount} archived job${archivedJobsCount > 1 ? 's' : ''}`);

                  if (otherJobs.length > 0) {
                    return (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No active jobs
                        </h3>
                        <p className="text-gray-600 mb-4">
                          You have {otherJobs.join(' and ')} that you can manage, or create a new job posting
                        </p>
                        <div className="space-y-2">
                          <Button onClick={() => router.push("/employer/jobs/new")}>
                            <Plus className="h-4 w-4 mr-2" />
                            Post New Job
                          </Button>
                          <div className="text-sm text-gray-500">
                            Switch to {draftJobsCount > 0 ? 'Draft Jobs' : 'Archived Jobs'} tab to manage existing jobs
                          </div>
                        </div>
                      </>
                    );
                  }
                }

                if (archiveView === "draft" && draftJobsCount === 0) {
                  return (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No draft jobs
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Draft jobs are saved but not yet published. Create a new job or check your other job categories.
                      </p>
                      <Button onClick={() => router.push("/employer/jobs/new")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Job
                      </Button>
                    </>
                  );
                }

                if (archiveView === "archived" && archivedJobsCount === 0) {
                  return (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No archived jobs
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Archived jobs are hidden from seekers. When you archive a job, it will appear here.
                      </p>
                    </>
                  );
                }

                // Default fallback
                return (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No jobs in this category
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Try switching to a different tab or create a new job posting
                    </p>
                    <Button onClick={() => router.push("/employer/jobs/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Post New Job
                    </Button>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => {
            const isArchivingJob = archivingJobId === job.id;
            const isDeletingJob =
              deletingJobId === job.id || deletingPendingJobId === job.id;

            return (
              <Card
                key={job.id}
                className={`hover:shadow-md transition-shadow ${job.isArchived
                    ? "opacity-75 bg-gray-50 border-gray-200"
                    : job.isPaused
                      ? "bg-amber-50 border-amber-200"
                      : ""
                  }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {job.title}
                        </h3>
                        {/* Only show status badge if job is not archived */}
                        {!job.isArchived && (
                          <Badge className={getStatusColor(job.status, job.isPaused)}>
                            {getStatusLabel(job.status)}
                          </Badge>
                        )}
                        {/* Display job-specific package badges */}
                        {getJobPackageBadges(job).map((badge, index) => (
                          <Badge
                            key={index}
                            className={`${badge.color} ${badge.type === "email_blast_missing"
                              ? "cursor-pointer hover:bg-red-200"
                              : ""
                              }`}
                            onClick={
                              badge.type === "email_blast_missing"
                                ? () =>
                                  router.push(
                                    `/employer/jobs/${job.id}/email-blast`
                                  )
                                : undefined
                            }
                          >
                            {badge.label}
                          </Badge>
                        ))}
                        {job.selectedPackage &&
                          job.status === "pending_payment" && (
                            <Badge className="bg-orange-100 text-orange-800">
                              {getPackageDisplayName(job.selectedPackage)}
                            </Badge>
                          )}
                        {job.status === "active" &&
                          getDaysRemaining(job.expiresAt) <= 7 && (
                            <Badge
                              variant="outline"
                              className="text-orange-600 border-orange-200"
                            >
                              {getDaysRemaining(job.expiresAt)} days left
                            </Badge>
                          )}
                        {/* Show Paused by Admin badge */}
                        {job.isPaused && (
                          <>
                            {/* Show days remaining when paused */}
                            {job.pausedDaysRemaining !== undefined && job.pausedDaysRemaining > 0 && (
                              <Badge
                                variant="outline"
                                className="text-orange-600 border-orange-200"
                              >
                                {job.pausedDaysRemaining} {job.pausedDaysRemaining === 1 ? 'day' : 'days'} until expiration
                              </Badge>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {job.location}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {job.jobType} • {job.experienceLevel}
                        </span>
                        <span className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {formatSalary(
                            job.salaryMin,
                            job.salaryMax,
                            job.salaryType
                          )}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {(job.skills || []).slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                        {(job.skills || []).length > 4 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            +{(job.skills || []).length - 4} more
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {job.applicationsCount} applications
                        </span>
                        <span className="flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          {job.viewsCount} views
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Posted {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                        {job.packageInfo && (
                          <span className="flex items-center text-blue-600">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {job.packageInfo.listingsRemaining} credits remaining
                          </span>
                        )}
                      </div>

                      {job.packageInfo && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-xs text-blue-700">
                            <strong>Package Benefits:</strong> This job is posted
                            using your{" "}
                            {getPackageDisplayName(
                              job.packageInfo.packageType
                            ).toLowerCase()}
                            , which provides extended visibility to job seekers
                            {job.packageInfo.expiresAt &&
                              ` until ${new Date(
                                job.packageInfo.expiresAt
                              ).toLocaleDateString()}`}
                            .
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNavigatingAction({ jobId: job.id, action: 'applications' });
                          router.push(`/employer/jobs/${job.id}/applications`);
                        }}
                        disabled={
                          job.isPaused ||
                          (navigatingAction?.jobId === job.id &&
                            navigatingAction?.action === 'applications')
                        }
                      >
                        {navigatingAction?.jobId === job.id && navigatingAction?.action === 'applications' ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Opening...
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4 mr-2" />
                            Applications
                          </>
                        )}
                      </Button>

                      {/* Chat Button for Concierge Jobs */}
                      {job.conciergeRequested && job.chatEnabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/employer/concierge/${job.id}`)
                          }
                          className="text-teal-600 border-teal-200 hover:bg-teal-50 relative"
                          disabled={job.isPaused || isArchivingJob || isDeletingJob}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Chat
                          {(job.unreadMessageCount ?? 0) > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[1.25rem]">
                              {(job.unreadMessageCount ?? 0) > 99
                                ? "99+"
                                : job.unreadMessageCount}
                            </span>
                          )}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNavigatingAction({ jobId: job.id, action: 'edit' });
                          if (job.status === "pending_payment") {
                            // For pending payment jobs, redirect to the job creation page with the pending job data
                            const pendingJobId = job.id.startsWith("pending_")
                              ? job.id.replace("pending_", "")
                              : job.id;
                            router.push(
                              `/employer/jobs/new?pendingJobId=${pendingJobId}&step=1`
                            );
                          } else {
                            // For regular jobs, use the normal edit flow
                            router.push(`/employer/jobs/${job.id}/edit`);
                          }
                        }}
                        disabled={
                          job.isPaused ||
                          isArchivingJob ||
                          isDeletingJob ||
                          (navigatingAction?.jobId === job.id && navigatingAction?.action === 'edit')
                        }
                      >
                        {navigatingAction?.jobId === job.id && navigatingAction?.action === 'edit' ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Opening...
                          </>
                        ) : (
                          <>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </>
                        )}
                      </Button>

                      <div className="relative">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setOpenDropdown(
                              openDropdown === job.id ? null : job.id
                            )
                          }
                          disabled={job.isPaused || isArchivingJob || isDeletingJob}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>

                        {openDropdown === job.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                            <div className="py-1">
                              {/* Only show Share Job for non-archived jobs */}
                              {!job.isArchived && (
                                <button
                                  disabled={job.status !== "active"}
                                  onClick={() => {
                                    handleShareJob(job.id);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                >
                                  <Share className="h-4 w-4 mr-2" />
                                  Share Job
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  handleDuplicateJob(
                                    job.id,
                                    job.status === "pending_payment"
                                  );
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate Job
                              </button>
                              <button
                                disabled={isArchivingJob || isDeletingJob}
                                onClick={() => {
                                  handleArchiveJob(job.id, job.isArchived);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                              >
                                {isArchivingJob ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {job.isArchived ? "Restoring..." : "Archiving..."}
                                  </>
                                ) : job.isArchived ? (
                                  <>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Restore Job
                                  </>
                                ) : (
                                  <>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive Job
                                  </>
                                )}
                              </button>
                              <div className="border-t border-gray-100"></div>
                              <button
                                disabled={isDeletingJob || isArchivingJob}
                                onClick={() => {
                                  // Use the appropriate delete handler based on job ID format
                                  if (job.id.startsWith("pending_")) {
                                    handleDeletePendingJob(job.id);
                                  } else {
                                    handleDeleteJob(job.id);
                                  }
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:text-red-300 disabled:cursor-not-allowed"
                              >
                                {isDeletingJob ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Job
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {(job.status === "active" || job.status === "paused") && (
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/employer/jobs/${job.id}`)}
                          disabled={isArchivingJob || isDeletingJob}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={job.isPaused || isDeletingJob || isArchivingJob}
                      >
                        {isDeletingJob ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {job.status === "rejected" && (
                    <div className="mt-4 pt-4 border-t">
                      {job.rejectionReason && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                          <h4 className="text-sm font-medium text-red-800 mb-1">
                            Declination Reason:
                          </h4>
                          <p className="text-sm text-red-700">
                            {job.rejectionReason}
                          </p>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/employer/jobs/${job.id}/edit`)
                        }
                      >
                        Edit & Resubmit
                      </Button>
                    </div>
                  )}

                  {job.status === "draft" && (
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        onClick={() => {
                          setNavigatingAction({ jobId: job.id, action: 'draftEdit' });
                          router.push(`/employer/jobs/${job.id}/edit`);
                        }}
                        disabled={
                          navigatingAction?.jobId === job.id &&
                          navigatingAction?.action === 'draftEdit'
                        }
                      >
                        {navigatingAction?.jobId === job.id && navigatingAction?.action === 'draftEdit' ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Opening...
                          </>
                        ) : (
                          'Complete & Publish'
                        )}
                      </Button>
                    </div>
                  )}

                  {job.status === "pending_payment" && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                        <h4 className="text-sm font-medium text-orange-800 mb-1">
                          Payment Required
                        </h4>
                        <p className="text-sm text-orange-700">
                          Complete your payment to publish this job posting.
                          {job.selectedPackage &&
                            ` Selected package: ${job.selectedPackage}`}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            // Extract the actual pending job ID (remove 'pending_' prefix if present)
                            const pendingJobId = job.id.startsWith("pending_")
                              ? job.id.replace("pending_", "")
                              : job.id;
                            router.push(
                              `/employer/jobs/new?pendingJobId=${pendingJobId}&step=2`
                            );
                          }}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          Complete Payment
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePendingJob(job.id)}
                          className="text-red-600 hover:text-red-700"
                          disabled={isDeletingJob || isArchivingJob}
                        >
                          {isDeletingJob ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {job.status === "filled" && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                        <h4 className="text-sm font-medium text-purple-800 mb-1">
                          Position Filled
                        </h4>
                        <p className="text-sm text-purple-700">
                          This job has been successfully filled. You can
                          reconsider this position to create a new job posting
                          with the same details.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReconsiderJob(job.id, job.title)}
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reconsider Position
                      </Button>
                    </div>
                  )}

                  {/* Missing Email Content Banner */}
                  {job.emailBlastInfo?.isEmailBlast &&
                    job.emailBlastInfo?.status === "not_started" &&
                    !job.emailBlastInfo?.hasContent && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                          <h4 className="text-sm font-medium text-red-800 mb-1">
                            Email Content Missing
                          </h4>
                          <p className="text-sm text-red-700">
                            Your solo email blast is ready, but you need to
                            provide the email content, logo, and link details
                            before it can be sent to our candidate database.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() =>
                            router.push(`/employer/jobs/${job.id}/email-blast`)
                          }
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Complete Email Content
                        </Button>
                      </div>
                    )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Reconsider Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={reconsiderDialog.isOpen}
        onClose={() =>
          setReconsiderDialog({ isOpen: false, jobId: "", jobTitle: "" })
        }
        onConfirm={confirmReconsiderJob}
        title="Reconsider Position"
        description={`Are you sure you want to reconsider the position "${reconsiderDialog.jobTitle}"? This will create a new job posting with the same details that you can review and modify before publishing.`}
        confirmText="Yes, Reconsider"
        cancelText="Cancel"
        variant="default"
        isLoading={isReconsiderLoading}
      />
    </div>
  );
}
