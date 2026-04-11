"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useClerk } from "@clerk/nextjs";

// Auto-verification handler for links like /auth/email-verification?code=...
// This intercepts the URL that previously showed a confirmation prompt and verifies immediately.
function EmailVerificationAuto() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Try to extract a user-friendly message from various result/error shapes
  const getReadableError = (value: unknown): string => {
    try {
      const v: any = value;
      if (!v) return "Email verification failed. Please try again.";
      if (typeof v.humanReadableMessage === "string")
        return v.humanReadableMessage;
      if (typeof v.message === "string") return v.message;
      if (v.error) {
        if (typeof v.error.humanReadableMessage === "string")
          return v.error.humanReadableMessage;
        if (typeof v.error.message === "string") return v.error.message;
      }
      if (typeof v.status === "string" && v.status !== "ok")
        return `Verification failed: ${v.status}`;
      if (typeof v.name === "string") return v.name;
      return JSON.stringify(v);
    } catch (_e) {
      return "Email verification failed. Please try again.";
    }
  };

  useEffect(() => {
    const code = searchParams?.get("code");
    const afterAuthReturnTo = searchParams?.get("after_auth_return_to");

    if (!code) {
      setErrorMessage("No verification code found in the URL.");
      return;
    }

    (async () => {
      try {
        // With Clerk, email verification is handled via magic link or verification code
        // This page is reached after the user clicks the verification link
        // Clerk automatically handles the verification, so we just need to check status

        if (!user?.id) {
          setErrorMessage("Please sign in to verify your email.");
          return;
        }

        // Reload user to get latest verification status
        await user.reload();

        console.log("🔍 EMAIL-VERIFICATION: Checking verification status");

        // Check if email is now verified
        if (user.primaryEmailAddress?.verification.status === "verified") {
          console.log("✅ EMAIL-VERIFICATION: Email verified successfully");

          // Prefer provided return URL; default to onboarding
          const redirectUrl = afterAuthReturnTo
            ? decodeURIComponent(afterAuthReturnTo)
            : "/onboarding";

          console.log("🔍 EMAIL-VERIFICATION: Redirecting to:", redirectUrl);

          // Small delay to avoid abrupt transition
          redirectTimeoutRef.current = setTimeout(() => {
            router.push(redirectUrl);
          }, 1200);
        } else {
          setErrorMessage("Email verification is still pending. Please check your email and click the verification link.");
        }
      } catch (err) {
        console.error("❌ EMAIL-VERIFICATION (auth/email-verification):", err);
        setErrorMessage(getReadableError(err));
      }
    })();

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [searchParams, user, router]);

  // Lightweight UI: minimal while verifying; error state if something went wrong
  return (
    <div className="flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 text-center">
        <h2 className="mt-2 text-2xl font-semibold text-gray-900">
          Email Verification
        </h2>
        {!errorMessage ? (
          <p className="text-gray-600">Verifying your email…</p>
        ) : (
          <div className="space-y-4">
            <p className="text-red-600">{errorMessage}</p>
            <button
              onClick={() => router.push("/onboarding")}
              className="inline-flex items-center px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmailVerificationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmailVerificationAuto />
    </Suspense>
  );
}
