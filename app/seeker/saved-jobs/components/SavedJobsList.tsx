"use client";

import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/seeker/JobCard";
import { JobSearchItem } from "@/lib/search";
import { Search } from "lucide-react";
import Link from "next/link";
import EmptySavedJobs from "./empty-saved-jobs";
import { unsaveJob } from "../actions";

/**
 * SavedJob interface extends JobSearchItem with additional saved job specific fields
 */
interface SavedJob extends JobSearchItem {
  companyLogoUrl?: string;
  employerId?: string;
  savedAt: string;
  isArchived?: boolean;
  archivedAt?: string;
  applicationStatus?: {
    hasApplied: boolean;
    status?: string;
    appliedAt?: string;
  };
}

interface SavedJobsListProps {
  savedJobs: SavedJob[];
}

/**
 * SavedJobsList Component
 *
 * Displays a list of saved jobs for the current user with the ability to unsave jobs.
 * Uses server actions with useOptimistic for instant UI updates.
 *
 * Features:
 * - Server-side rendering with client-side interactivity
 * - Optimistic UI updates for instant feedback
 * - Server actions with automatic revalidation running in background
 * - Impersonation support for admin users
 */
export default function SavedJobsList({ savedJobs }: SavedJobsListProps) {
  // useTransition needed for optimistic updates to work properly
  const [isPending, startTransition] = useTransition();

  // useOptimistic for instant UI updates while server action runs in background
  // optimisticJobs: current state that reflects optimistic updates
  // removeOptimisticJob: function to optimistically remove a job from the list
  const [optimisticJobs, removeOptimisticJob] = useOptimistic(
    savedJobs,
    (currentJobs, jobIdToRemove: string) =>
      currentJobs.filter((job) => job.id !== jobIdToRemove)
  );

  /**
   * Handles unsaving a job using optimistic updates + server action
   *
   * Flow:
   * 1. startTransition wraps the entire operation for proper React handling
   * 2. removeOptimisticJob immediately removes job from UI (instant feedback)
   * 3. unsaveJob server action runs in background (deletes from DB + revalidatePath)
   * 4. Page automatically re-renders with fresh data from server
   * 5. If server action fails, revalidatePath will restore correct state
   *
   * @param jobId - The ID of the job to unsave
   */
  const handleUnsaveJob = async (jobId: string) => {
    startTransition(async () => {
      // Immediately remove job from UI for instant feedback
      removeOptimisticJob(jobId);

      try {
        // Run server action in background - this will update DB and trigger revalidatePath
        await unsaveJob(jobId);
        console.log("✅ Job unsaved successfully");
      } catch (error) {
        console.error("Error unsaving job:", error);
        // Note: revalidatePath will automatically restore correct state if action fails
      }
    });
  };

  /**
   * Formats the savedAt timestamp into a human-readable "time ago" format
   *
   * @param dateString - ISO date string from the savedAt field
   * @returns Formatted string like "Just saved", "Saved 2h ago", "Saved 3d ago", "Saved 1w ago"
   */
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just saved";
    if (diffInHours < 24) return `Saved ${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Saved ${diffInDays}d ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    return `Saved ${diffInWeeks}w ago`;
  };

  // Show empty state if no saved jobs (check optimistic state)
  if (optimisticJobs.length === 0) {
    return <EmptySavedJobs />;
  }

  return (
    <div className="space-y-4">
      {/* Header with job count (uses optimistic state for instant updates) */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">
          {optimisticJobs.length} saved job
          {optimisticJobs.length !== 1 ? "s" : ""}
        </p>
        {/* Link to find more jobs */}
        <Link href="/seeker/jobs">
          <Button variant="outline" className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <span>Find More Jobs</span>
          </Button>
        </Link>
      </div>

      {/* Render each saved job (uses optimistic state for instant updates) */}
      {optimisticJobs.map((job) => (
        <div key={job.id} className="relative">
          {/* JobCard handles the unsave button click */}
          <JobCard job={job} onSave={handleUnsaveJob} isSaved={true} />
          {/* Show when the job was saved - positioned above buttons with higher z-index */}
          <div className="absolute top-4 right-8 text-xs text-gray-500 pointer-events-none z-10">
            {formatTimeAgo(job.savedAt)}
          </div>
        </div>
      ))}
    </div>
  );
}
