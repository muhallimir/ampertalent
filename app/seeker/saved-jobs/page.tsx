"use client";

import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import SavedJobsList from "./components/SavedJobsList";
import { SavedJob } from "@/app/data-access/saved-jobs";
import { getImpersonationSession } from "@/lib/admin-impersonation";

export default function Page() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedJobs = async () => {
      try {
        console.log("🔍 SAVED JOBS CSR: Fetching saved jobs via API");

        const apiHeaders: HeadersInit = {};

        if (typeof window !== 'undefined') {
          const impersonationSession = getImpersonationSession();
          if (impersonationSession) {
            console.log("🎭 SAVED JOBS CSR: Adding impersonation headers", {
              impersonatedUserId: impersonationSession.impersonatedUser.id,
              adminUserId: impersonationSession.adminId,
            });
            apiHeaders["x-impersonated-user-id"] = impersonationSession.impersonatedUser.id;
            apiHeaders["x-admin-user-id"] = impersonationSession.adminId;
          }
        }

        const response = await fetch("/api/seeker/saved-jobs", {
          headers: apiHeaders,
        });

        if (!response.ok) {
          console.error(
            "❌ SAVED JOBS CSR: API call failed:",
            response.status,
            response.statusText
          );
          throw new Error(`Failed to fetch saved jobs: ${response.status}`);
        }

        const data = await response.json();
        console.log(
          `📊 SAVED JOBS CSR: Found ${data.savedJobs?.length || 0} saved jobs`
        );

        setSavedJobs(data.savedJobs || []);
      } catch (error) {
        console.error("❌ SAVED JOBS CSR: Error fetching saved jobs:", error);
        setError(error instanceof Error ? error.message : "Failed to load saved jobs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedJobs();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Bookmark className="h-8 w-8 mr-3 text-brand-teal" />
            Saved Jobs
          </h1>
          <p className="text-gray-600">
            Keep track of jobs you&apos;re interested in applying to
          </p>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-600">Loading saved jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Bookmark className="h-8 w-8 mr-3 text-brand-teal" />
            Saved Jobs
          </h1>
          <p className="text-gray-600">
            Keep track of jobs you&apos;re interested in applying to
          </p>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Bookmark className="h-8 w-8 mr-3 text-brand-teal" />
          Saved Jobs
        </h1>
        <p className="text-gray-600">
          Keep track of jobs you&apos;re interested in applying to
        </p>
      </div>

      <SavedJobsList savedJobs={savedJobs} />
    </div>
  );
}
