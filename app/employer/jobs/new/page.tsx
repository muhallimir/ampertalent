"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SimpleJobPostingForm } from "@/components/employer/SimpleJobPostingForm";
import { JobFormSkeleton } from "@/components/employer/JobFormSkeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { AddOnsSelectionPanel } from "@/components/payments/AddOnsSelectionPanel";
import {
  PackageCard,
  JOB_PACKAGES,
  CONCIERGE_PACKAGES,
} from "@/components/payments/PackageCard";
import { ArrowLeft, CreditCard, Briefcase, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getWithImpersonation, postWithImpersonation, deleteWithImpersonation } from "@/lib/api-client";

interface JobFormData {
  title?: string;
  description?: string;
  requirements?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: "hourly" | "monthly" | "yearly";
  commissionOnly?: boolean;
  location?: string;
  jobType?: "FULL_TIME" | "PART_TIME" | "PERMANENT" | "TEMPORARY" | "NOT_SPECIFIED";
  experienceLevel?: "entry" | "mid" | "senior" | "lead";
  category?:
  | "ACCOUNTING_BOOKKEEPING"
  | "ADMINISTRATION_VIRTUAL_ASSISTANT"
  | "ADVERTISING"
  | "BLOGGER"
  | "BUSINESS_DEVELOPMENT"
  | "COMPUTER_IT"
  | "CONSULTANT"
  | "CUSTOMER_SERVICE"
  | "DATABASE_DEVELOPMENT"
  | "DESIGN"
  | "FINANCE"
  | "GRAPHIC_DESIGN_ARTIST"
  | "HUMAN_RESOURCES"
  | "INTERNET_MARKETING_SPECIALIST"
  | "MANAGER"
  | "MARKETING_PUBLIC_RELATIONS"
  | "MEDIA_SPECIALIST"
  | "OTHER"
  | "PARALEGAL_LEGAL"
  | "PROGRAMMER"
  | "RESEARCHER"
  | "SALES"
  | "SOCIAL_MEDIA"
  | "STRATEGIC_PLANNER"
  | "VIDEO_PRODUCTION_EDITING"
  | "WEB_DESIGN_DEVELOPMENT"
  | "WEBSITE_MANAGER"
  | "WRITING_EDITING";
  skills?: string[];
  benefits?: string;
  applicationDeadline?: string;
  website?: string;
  linkedinProfile?: string;
  contactPhone?: string;
  isCompanyPrivate?: boolean;
  isDraft?: boolean;
}

interface CompanyProfile {
  companyWebsite?: string;
}

// Flow steps
const STEPS = [
  { id: "job-details", title: "Job Details", icon: Briefcase },
  { id: "package-selection", title: "Select Package", icon: CreditCard },
];

export default function NewJobPostingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCredits, setHasCredits] = useState(false);
  const [creditsData, setCreditsData] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [useExistingCredits, setUseExistingCredits] = useState(false);
  const [jobFormData, setJobFormData] = useState<JobFormData | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [showConciergePackages, setShowConciergePackages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasEmailBlastCredit, setHasEmailBlastCredit] = useState(false);
  const packageSelectionRef = useRef<HTMLDivElement | null>(null);

  // Add-ons related state
  const [showAddOnsModal, setShowAddOnsModal] = useState(false);
  const [availableAddOns, setAvailableAddOns] = useState<any[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [addOnsTotalPrice, setAddOnsTotalPrice] = useState(0);
  const [isLoadingAddOns, setIsLoadingAddOns] = useState(false);
  const [packageForAddOns, setPackageForAddOns] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isLoadingPendingJob, setIsLoadingPendingJob] = useState(false);

  // Use refs to prevent race conditions with duplicate/pending job loading
  const isLoadingDuplicateRef = useRef(false);
  const isLoadingPendingJobRef = useRef(false);

  useEffect(() => {
    loadCompanyProfile();
    checkCredits();
    handleUrlParameters();
  }, [searchParams]);

  useEffect(() => {
    if (currentStep === 1 && packageSelectionRef.current) {
      packageSelectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [currentStep]);

  const handleUrlParameters = async () => {
    const urlPendingJobId = searchParams.get("pendingJobId");
    const urlStep = searchParams.get("step");
    const duplicateJobId = searchParams.get("duplicate");

    // Handle duplicate job loading with race condition protection
    if (duplicateJobId && !isLoadingDuplicateRef.current) {
      isLoadingDuplicateRef.current = true;
      setIsDuplicating(true);

      try {
        const response = await getWithImpersonation(
          `/api/employer/jobs/${duplicateJobId}/duplicate`
        );

        if (response.ok) {
          const data = await response.json();

          // Set the job data for duplication
          setJobFormData(data.jobData);
          setCurrentStep(0);
          setIsDuplicating(false);

          addToast({
            title: "Job Duplicated",
            description:
              "Job details have been loaded for duplication. Review and modify as needed.",
            variant: "success",
            duration: 3000,
          });
        } else {
          const errorText = await response.text();
          console.error("Failed to load job data for duplication:", errorText);
          setIsDuplicating(false);
          isLoadingDuplicateRef.current = false;
          addToast({
            title: "Error",
            description:
              "Failed to load job data for duplication. Please try again.",
            variant: "destructive",
            duration: 5000,
          });
          router.replace("/employer/jobs/new");
        }
      } catch (error) {
        console.error("Error loading job data for duplication:", error);
        setIsDuplicating(false);
        isLoadingDuplicateRef.current = false;
        addToast({
          title: "Error",
          description:
            "Error loading job data for duplication. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
        router.replace("/employer/jobs/new");
      }
    } else if (urlPendingJobId && (urlStep === "1" || urlStep === "2") && !isLoadingPendingJobRef.current) {
      // Handle pending job loading with race condition protection
      isLoadingPendingJobRef.current = true;
      setIsLoadingPendingJob(true);

      try {
        console.log("Loading pending job data for ID:", urlPendingJobId);

        const response = await getWithImpersonation(
          `/api/employer/jobs/pending/${urlPendingJobId}`
        );
        if (response.ok) {
          const data = await response.json();

          setPendingJobId(urlPendingJobId);
          setSessionToken(data.pendingJob.sessionToken);
          setJobFormData(data.pendingJob.jobData);

          if (urlStep === "2") {
            setCurrentStep(1);
            setIsLoadingPendingJob(false);
            addToast({
              title: "Job Data Loaded",
              description:
                "Your job details have been loaded. Please select a package to continue.",
              variant: "success",
              duration: 3000,
            });
          } else {
            setCurrentStep(0);
            setIsLoadingPendingJob(false);
            addToast({
              title: "Job Data Loaded",
              description: "Your job details have been loaded for editing.",
              variant: "success",
              duration: 3000,
            });
          }
        } else {
          console.error("Failed to load pending job data");
          setIsLoadingPendingJob(false);
          isLoadingPendingJobRef.current = false;
          addToast({
            title: "Error",
            description: "Failed to load job data. Please start over.",
            variant: "destructive",
            duration: 5000,
          });
          router.replace("/employer/jobs/new");
        }
      } catch (error) {
        console.error("Error loading pending job data:", error);
        setIsLoadingPendingJob(false);
        isLoadingPendingJobRef.current = false;
        addToast({
          title: "Error",
          description: "Error loading job data. Please start over.",
          variant: "destructive",
          duration: 5000,
        });
        router.replace("/employer/jobs/new");
      }
    }
  };

  const loadCompanyProfile = async () => {
    try {
      const response = await getWithImpersonation("/api/employer/profile");
      if (response.ok) {
        const data = await response.json();
        setCompanyProfile(data.profile);
      } else {
        console.error("Failed to load company profile");
      }
    } catch (error) {
      console.error("Error loading company profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const checkCredits = async () => {
    try {
      const response = await getWithImpersonation("/api/employer/credits");
      const data = await response.json();

      setHasCredits(data.credits?.hasCredits || false);
      setCreditsData(data.credits);
      const emailBlastPkg = data?.credits?.packages?.find(
        (pkg: any) => pkg.type === "email_blast"
      );
      setHasEmailBlastCredit(!!emailBlastPkg);
      if (!selectedPackage && emailBlastPkg) {
        setSelectedPackage(emailBlastPkg.id);
      }
    } catch (error) {
      console.error("Error checking credits:", error);
      setHasCredits(false);
      setCreditsData(null);
      setHasEmailBlastCredit(false);
    }
  };

  const handleSubmit = async (data: JobFormData) => {
    setIsSubmitting(true);
    try {
      if (useExistingCredits && hasCredits && selectedPackage) {
        // Use existing credits flow - create job immediately with selected package
        const response = await postWithImpersonation("/api/employer/jobs/create", {
          ...data,
          isDraft: false,
          useCredits: true,
          selectedPackage: selectedPackage, // Include selected package
          isDuplicating: isDuplicating // Flag to force vetting on duplicates
        });

        if (response.ok) {
          const result = await response.json();

          addToast({
            title: "Success!",
            description: result.message || "Job posting created successfully!",
            variant: "success",
            duration: 5000,
          });

          // Redirect to job management page after a short delay to show the toast
          setTimeout(() => {
            router.push("/employer/jobs");
          }, 2000);
        } else {
          const error = await response.json();
          addToast({
            title: "Error",
            description:
              error.error || "Error creating job posting. Please try again.",
            variant: "destructive",
            duration: 5000,
          });
        }
      } else {
        // Save job data and proceed to package selection
        // Save job data as pending job post
        const pendingResponse = await postWithImpersonation("/api/employer/jobs/pending", {
          jobData: data,
          selectedPackage: null, // No package selected yet
        });

        if (pendingResponse.ok) {
          const pendingResult = await pendingResponse.json();

          // Store pending job info and proceed to package selection
          setJobFormData(data);
          setPendingJobId(pendingResult.pendingJobId);
          setSessionToken(pendingResult.sessionToken);
          setCurrentStep(1); // Move to package selection step

          addToast({
            title: "Job Details Saved",
            description: "Now select how you want to publish your job posting.",
            variant: "success",
            duration: 3000,
          });
        } else {
          const error = await pendingResponse.json();
          addToast({
            title: "Error",
            description:
              error.error || "Error saving job data. Please try again.",
            variant: "destructive",
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error("Error creating job posting:", error);
      addToast({
        title: "Error",
        description: "Error creating job posting. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
    setIsSubmitting(false);
  };

  const handleSaveDraft = async (data: JobFormData) => {
    try {
      console.log("Saving draft:", data);

      const response = await postWithImpersonation("/api/employer/jobs/create", { ...data, isDraft: true });

      if (response.ok) {
        addToast({
          title: "Draft Saved",
          description: "Your job posting draft has been saved successfully!",
          variant: "success",
          duration: 3000,
        });

        router.push("/employer/jobs");
      } else {
        const error = await response.json();
        addToast({
          title: "Error",
          description: error.error || "Error saving draft. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      addToast({
        title: "Error",
        description: "Error saving draft. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handlePackageSelection = async (packageId: string) => {
    try {
      if (!pendingJobId || !sessionToken) {
        addToast({
          title: "Error",
          description: "Session expired. Please start over.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      // Step 1: Fetch available add-ons for this job package
      setIsLoadingAddOns(true);
      setPackageForAddOns(packageId);

      try {
        const addOnsResponse = await getWithImpersonation(
          `/api/add-ons/for-package?packageType=${packageId}`
        );

        if (addOnsResponse.ok) {
          const addOnsData = await addOnsResponse.json();
          setAvailableAddOns(addOnsData.addOns || []);

          // If add-ons are available, show modal
          if (addOnsData.addOns && addOnsData.addOns.length > 0) {
            setShowAddOnsModal(true);
            setIsLoadingAddOns(false);
            return; // Don't proceed to checkout yet
          }
        }
      } catch (addOnsError) {
        console.error("Error fetching add-ons:", addOnsError);
        // Continue without add-ons if fetch fails
      }

      setIsLoadingAddOns(false);

      // No add-ons available: proceed directly to checkout
      await proceedToCheckout(packageId, []);
    } catch (error) {
      console.error("Error processing package selection:", error);
      addToast({
        title: "Error",
        description: "Error processing package selection. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Helper function to get package price by ID
  const getPackagePriceById = (packageId: string): number => {
    const allPackages = [...JOB_PACKAGES, ...CONCIERGE_PACKAGES];
    const package_obj = allPackages.find((pkg) => pkg.id === packageId);
    return package_obj?.price || 0;
  };

  // Helper function to calculate total price with add-ons
  const calculateTotalPrice = (packageId: string, selectedAddOnIds: string[]): number => {
    const packagePrice = getPackagePriceById(packageId);
    let addOnsTotal = 0;

    selectedAddOnIds.forEach((addOnId) => {
      const addOn = availableAddOns.find((addon) => addon.id === addOnId);
      if (addOn) {
        addOnsTotal += addOn.price || 0;
      }
    });

    return packagePrice + addOnsTotal;
  };

  const proceedToCheckout = async (packageId: string, addOnIds: string[]) => {
    try {
      if (!pendingJobId || !sessionToken) {
        addToast({
          title: "Error",
          description: "Session expired. Please start over.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      // Get user profile for checkout
      const profileResponse = await getWithImpersonation("/api/employer/profile");
      const profileData = await profileResponse.json();

      // Extract user information from API response
      const email = profileData.userEmail || "";
      const firstName = profileData.firstName || "";
      const lastName = profileData.lastName || "";
      const fullName =
        profileData.fullName || `${firstName} ${lastName}`.trim();

      let userInfo;

      // Fallback to extracting name from email if no name is available
      if (!firstName && !lastName && !fullName) {
        const emailName = email.split("@")[0].replace(/[._]/g, " ");
        const nameParts = emailName.split(" ");
        const fallbackFirstName = nameParts[0] || "";
        const fallbackLastName = nameParts.slice(1).join(" ") || "";

        userInfo = {
          name: `${fallbackFirstName} ${fallbackLastName}`.trim() || email,
          email: email,
          firstName: fallbackFirstName,
          lastName: fallbackLastName,
        };
      } else {
        userInfo = {
          name: fullName || `${firstName} ${lastName}`.trim() || email,
          email: email,
          firstName: firstName,
          lastName: lastName,
        };
      }

      // Calculate total price with add-ons
      const totalPrice = calculateTotalPrice(packageId, addOnIds);

      // Generate secure checkout URL with add-ons
      const checkoutResponse = await postWithImpersonation("/api/employer/jobs/checkout", {
        pendingJobId,
        sessionToken,
        packageId,
        totalPrice,
        addOnIds: addOnIds,
        returnUrl: `${window.location.origin}/employer/jobs`,
        userInfo,
      });

      if (checkoutResponse.ok) {
        const checkoutResult = await checkoutResponse.json();

        // Redirect to external Authorize.net checkout
        console.log("Redirecting to checkout URL:", checkoutResult.checkoutUrl);
        window.location.href = checkoutResult.checkoutUrl;
      } else {
        const checkoutError = await checkoutResponse.json();
        addToast({
          title: "Checkout Error",
          description:
            checkoutError.error ||
            "Error generating checkout URL. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error processing package selection:", error);
      addToast({
        title: "Error",
        description: "Error processing package selection. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleAddOnsConfirm = async (selectedAddOnIds: string[]) => {
    setShowAddOnsModal(false);
    setSelectedAddOns(selectedAddOnIds);

    if (!packageForAddOns) {
      addToast({
        title: "Error",
        description: "Package information lost. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // Proceed to checkout with selected add-ons
    await proceedToCheckout(packageForAddOns, selectedAddOnIds);
  };

  const handleUseCredits = async () => {
    // Directly submit the job with the selected package, bypassing state dependencies
    if (jobFormData) {
      setIsSubmitting(true);
      try {
        console.log("Creating job posting with selected package:", selectedPackage);

        // Use existing credits flow - create job immediately with selected package
        const response = await postWithImpersonation("/api/employer/jobs/create", {
          ...jobFormData,
          isDraft: false,
          useCredits: true,
          selectedPackage: selectedPackage // Include selected package directly
        });

        if (response.ok) {
          // If we had a pending job, clean it up since we've now created the actual job
          if (pendingJobId) {
            try {
              // Delete the pending job since we've successfully created the real job
              await deleteWithImpersonation(`/api/employer/jobs/pending/${pendingJobId}`);
            } catch (cleanupError) {
              console.warn("Failed to clean up pending job:", cleanupError);
              // Don't fail the main operation if cleanup fails
            }
          }

          const result = await response.json();

          addToast({
            title: "Success!",
            description: result.message || "Job posting created successfully!",
            variant: "success",
            duration: 5000,
          });

          // Redirect to job management page after a short delay to show the toast
          setTimeout(() => {
            router.push("/employer/jobs");
          }, 2000);
        } else {
          const error = await response.json();
          addToast({
            title: "Error",
            description:
              error.error || "Error creating job posting. Please try again.",
            variant: "destructive",
            duration: 5000,
          });
        }
      } catch (error) {
        console.error("Error creating job posting:", error);
        addToast({
          title: "Error",
          description: "Error creating job posting. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Job Details
        // Show skeleton while loading duplicate data or pending job
        if (isDuplicating || isLoadingPendingJob) {
          return <JobFormSkeleton />;
        }

        const formInitialData = {
          website: companyProfile?.companyWebsite || "",
          ...(jobFormData || {}), // Spread the loaded job data if available
        };

        return (
          <SimpleJobPostingForm
            key={jobFormData ? "duplicate-form" : "new-form"} // Force re-mount when duplicate data is loaded
            initialData={formInitialData}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
            isSubmitting={isSubmitting}
          />
        );

      case 1: // Package Selection
        return (
          <div className="space-y-8" ref={packageSelectionRef}>
            {hasCredits && creditsData && (
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Choose How to Publish
                </h2>
                <p className="text-gray-600">
                  Use existing credits or purchase a new package to publish your
                  job posting
                </p>
              </div>
            )}

            {/* Available Credits Section */}
            {hasCredits && creditsData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-green-900">
                    Available Credits
                  </h3>
                  <span className="text-2xl font-bold text-green-700">
                    {creditsData.total}
                  </span>
                </div>

                {hasEmailBlastCredit && (
                  <div className="flex items-start space-x-3 bg-white border border-orange-200 rounded-md p-4 mb-4">
                    <div className="mt-1 text-orange-500">
                      <Info className="h-5 w-5" />
                    </div>
                    <div className="text-sm text-gray-800">
                      <p className="font-semibold text-orange-700">
                        Solo Email Blast credit available
                      </p>
                      <p>
                        Select the Solo Email Blast credit below and click “Use Selected
                        Credit” to attach this blast to your job, then provide your email
                        content on the next screen.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  {creditsData.packages.map((pkg: any) => (
                    <div
                      key={pkg.id}
                      className="flex items-center justify-between text-sm bg-white p-4 rounded-md border"
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id={`package-${pkg.id}`}
                          name="selectedPackage"
                          value={pkg.id}
                          checked={selectedPackage === pkg.id}
                          onChange={() => setSelectedPackage(pkg.id)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500"
                        />
                        <label htmlFor={`package-${pkg.id}`} className="ml-3 flex flex-col">
                          <span className="font-medium capitalize">
                            {pkg.type.replace("_", " ")}
                          </span>
                          <span className="text-green-600 text-xs">
                            (Purchased{" "}
                            {new Date(pkg.purchasedAt).toLocaleDateString()})
                          </span>
                          {pkg.expiresAt && (
                            <span className="text-green-600 text-xs">
                              Expires{" "}
                              {new Date(pkg.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-green-700">
                          {pkg.creditsRemaining} credits
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleUseCredits}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={!jobFormData || !selectedPackage || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Briefcase className="h-4 w-4 mr-2" />
                      Use Selected Credit
                    </>
                  )}
                </Button>

                <p className="text-sm text-green-800 mt-3 text-center">
                  Select a package and click "Use Selected Credit" to post your job
                </p>
              </div>
            )}

            {/* Or Divider */}
            {hasCredits && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or purchase a new package
                  </span>
                </div>
              </div>
            )}

            {/* New Package Selection */}
            <div>
              <div className="text-center mb-6">
                {hasCredits && creditsData ? (
                  <>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Purchase New Package
                    </h3>
                    <p className="text-gray-600">
                      Choose a package to publish your job posting and start
                      receiving applications
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                      Select a Package
                    </h2>
                    <p className="text-gray-600">
                      Choose a package to publish your job posting and start
                      receiving applications
                    </p>
                  </>
                )}
              </div>

              {/* Package Toggle */}
              <div className="flex justify-center mb-6">
                <div className="bg-gray-100 p-1 rounded-lg">
                  <Button
                    variant={!showConciergePackages ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setShowConciergePackages(false)}
                    className="mr-1"
                  >
                    Job Posting Packages
                  </Button>
                  <Button
                    variant={showConciergePackages ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setShowConciergePackages(true)}
                  >
                    Concierge Services
                  </Button>
                </div>
              </div>

              {/* Package Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(showConciergePackages
                  ? CONCIERGE_PACKAGES
                  : JOB_PACKAGES.filter((pkg) => pkg.id !== "gold_plus")
                ).map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    package={pkg}
                    onPurchase={handlePackageSelection}
                    disabled={false}
                  />
                ))}
              </div>

              {/* Package Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
                <h3 className="font-semibold text-blue-900 mb-4">
                  {showConciergePackages
                    ? "About Concierge Services:"
                    : "About Job Posting Packages:"}
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  {showConciergePackages ? (
                    <>
                      <p>
                        • <strong>Level I ($1,695):</strong> For entry-level roles - Administrative, Support Services and Customer Service
                      </p>
                      <p>
                        • <strong>Level II ($2,695):</strong> For mid-level roles - Bookkeepers, Project Coordinators, Account Managers, Social Media/Content Creators
                      </p>
                      <p>
                        • <strong>Level III ($3,995):</strong> For executive and specialized roles - Managers, Marketing/PR, Accounting/CPA, Tech, Sales
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        • <strong>Standard:</strong> Basic job posting with
                        30-day visibility
                      </p>
                      <p>
                        • <strong>Featured:</strong> Enhanced visibility with
                        weekly email inclusion
                      </p>
                      <p>
                        • <strong>Solo Email Blast:</strong> Direct email to our
                        entire candidate database
                      </p>
                      <p>
                        • <strong>Gold Plus:</strong> 6-month posting with
                        monthly boosting
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-500">
                  You'll be redirected to secure checkout after selecting a
                  package
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <div className="mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={currentStep > 0 ? handlePrevious : () => router.back()}
              className="border-gray-300 hover:border-brand-teal hover:text-brand-teal"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {currentStep > 0 ? "Previous" : "Back"}
            </Button>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentStep === 0
                ? searchParams.get("duplicate")
                  ? "Duplicate Job Posting"
                  : "Create Job Posting"
                : "Select Package"}
            </h1>
            <p className="text-gray-600">
              {currentStep === 0
                ? searchParams.get("duplicate")
                  ? "Review and modify the duplicated job details as needed"
                  : "Connect with talented remote professionals who value work-life balance"
                : "Choose how you want to publish your job posting"}
            </p>
          </div>

          {/* Progress Steps - Always show for multi-step flow */}
          <div className="mb-8">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-center">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;

                  return (
                    <div key={step.id} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${isActive
                            ? "border-brand-teal bg-brand-teal text-white shadow-md"
                            : isCompleted
                              ? "border-brand-coral bg-brand-coral text-white"
                              : "border-gray-300 bg-white text-gray-400"
                            }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <p
                          className={`text-sm font-medium mt-2 text-center ${isActive
                            ? "text-brand-teal"
                            : isCompleted
                              ? "text-brand-coral"
                              : "text-gray-500"
                            }`}
                        >
                          {step.title}
                        </p>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div
                          className={`w-24 h-0.5 mx-4 rounded-full transition-all ${isCompleted ? "bg-brand-coral" : "bg-gray-200"
                            }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {renderStepContent()}
          </div>

          {/* Add-Ons Selection Modal */}
          {showAddOnsModal && availableAddOns.length > 0 && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Add Services to Your Posting</h2>
                    <p className="text-gray-600 mt-2">
                      Enhance your job posting with additional services to attract more qualified candidates
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddOnsModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold"
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </div>

                <div className="p-6">
                  {isLoadingAddOns ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner size="lg" />
                    </div>
                  ) : (
                    <AddOnsSelectionPanel
                      packageType={packageForAddOns || ""}
                      selectedAddOns={selectedAddOns}
                      onAddOnsChange={setSelectedAddOns}
                      onTotalPriceChange={setAddOnsTotalPrice}
                      basePrice={0}
                    />
                  )}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                  <Button
                    className="bg-brand-teal hover:bg-teal-700"
                    onClick={() => handleAddOnsConfirm(selectedAddOns)}
                  >
                    Continue to Payment
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
