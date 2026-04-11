"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function unsaveJob(jobId: string) {
  try {
    console.log("🗑️ UNSAVE JOB: Server action called for jobId:", jobId);

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
      console.log("🎭 UNSAVE JOB: Adding impersonation headers", {
        impersonatedUserId,
        adminUserId,
        jobId,
      });
      apiHeaders["x-impersonated-user-id"] = impersonatedUserId;
      apiHeaders["x-admin-user-id"] = adminUserId;
    }

    // Call our existing API endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    // for server fetch, we need the base url
    const response = await fetch(
      `${baseUrl}/api/seeker/saved-jobs?jobId=${jobId}`,
      {
        method: "DELETE",
        headers: apiHeaders,
      }
    );

    if (!response.ok) {
      console.error(
        "❌ UNSAVE JOB: API call failed:",
        response.status,
        response.statusText
      );
      throw new Error("Failed to unsave job");
    }

    console.log("✅ UNSAVE JOB: Successfully unsaved job", jobId);

    // Revalidate the saved jobs page to reflect the change
    revalidatePath("/seeker/saved-jobs");

    return { success: true };
  } catch (error) {
    console.error("❌ UNSAVE JOB: Error unsaving job:", error);
    throw new Error("Failed to unsave job");
  }
}
