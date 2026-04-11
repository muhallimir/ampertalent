import { JobSearchItem } from "@/lib/search";
import { headers } from "next/headers";

export interface SavedJob extends JobSearchItem {
  companyLogoUrl?: string;
  employerId?: string;
  savedAt: string;
  applicationStatus?: {
    hasApplied: boolean;
    status?: string;
    appliedAt?: string;
  };
}

export async function getSavedJobs(): Promise<SavedJob[]> {
  try {
    console.log("🔍 SAVED JOBS SSR: Fetching saved jobs via API");

    // Get the current headers to pass cookies and impersonation data to the API
    const headersList = await headers();
    const cookies = headersList.get("cookie") || "";

    // Prepare headers for API call
    const apiHeaders: HeadersInit = {
      cookie: cookies,
    };

    // Add impersonation headers if they exist
    const impersonatedUserId = headersList.get("x-impersonated-user-id");
    const adminUserId = headersList.get("x-admin-user-id");

    if (impersonatedUserId && adminUserId) {
      console.log("🎭 SAVED JOBS SSR: Adding impersonation headers", {
        impersonatedUserId,
        adminUserId,
      });
      apiHeaders["x-impersonated-user-id"] = impersonatedUserId;
      apiHeaders["x-admin-user-id"] = adminUserId;
    }

    // Call our existing API endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    const response = await fetch(`${baseUrl}/api/seeker/saved-jobs`, {
      headers: apiHeaders,
    });

    if (!response.ok) {
      console.error(
        "❌ SAVED JOBS SSR: API call failed:",
        response.status,
        response.statusText
      );
      return [];
    }

    const data = await response.json();
    console.log(
      `📊 SAVED JOBS SSR: Found ${data.savedJobs?.length || 0} saved jobs`
    );

    return data.savedJobs || [];
  } catch (error) {
    console.error("❌ SAVED JOBS SSR: Error fetching saved jobs:", error);
    return [];
  }
}
