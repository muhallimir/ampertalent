"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Star,
  Zap,
  Building,
  Crown,
  Users,
  UserCheck,
  UserCog,
} from "lucide-react";

export interface JobPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  jobPostings: number;
  featuredListings: number;
  duration: number; // days
  features: string[];
  popular?: boolean;
  recommended?: boolean;
}

export const JOB_PACKAGES: JobPackage[] = [
  {
    id: "standard",
    name: "Standard Job Post",
    description: "Perfect for single job postings",
    price: 97,
    jobPostings: 1,
    featuredListings: 0,
    duration: 30,
    features: [
      "1 job posting for 1 month",
      "Edit Job Listing once approved",
      "Email Support: Monday – Friday",
    ],
  },
  {
    id: "featured",
    name: "Featured Job Post",
    description: "Get noticed with featured placement",
    price: 127,
    jobPostings: 1,
    featuredListings: 1,
    duration: 30,
    features: [
      "Job Posting for 30 days",
      "*Featured Job* in our Weekly Email",
      "Get 30 days additional *FREE* if position is not filled",
      "Edit Job Listing once approved",
      "Email & Text Support: Monday – Friday",
    ],
    popular: true,
  },
  {
    id: "email_blast",
    name: "Solo Email Blast",
    description: "Stand out and get noticed FAST!",
    price: 249,
    jobPostings: 1,
    featuredListings: 0,
    duration: 7,
    features: [
      "Want to Stand Out and get your job noticed FAST!?! Send a Solo Email Blast to Candidates specifically for your job post to our database of job seekers. Also includes a free job listing on HireMyMom",
    ],
    recommended: true,
  },
  {
    id: "gold_plus",
    name: "Gold Plus Small Business",
    description: "For roles you are continually hiring for",
    price: 97,
    jobPostings: 1,
    featuredListings: 0,
    duration: 180, // 6 months
    features: [
      "1 Job Posting for 6 months",
      "Renewing and boosted to the top monthly",
      "Edit Job Posting",
      "Email & Text Support: Monday – Friday",
    ],
  },
];

export const CONCIERGE_PACKAGES: JobPackage[] = [
  {
    id: "concierge_level_1",
    name: "Concierge Level I",
    description: "For entry-level roles: Administrative, Support Services and Customer Service",
    price: 1695,
    jobPostings: 1,
    featuredListings: 0,
    duration: 30,
    features: [
      "Discovery Call – We learn your needs and define your ideal hire",
      "Pro Job Post – We write or refine your job listing for max impact",
      "Targeted Posting – We post it on HireMyMom.com to our curated candidates",
      "Expert Screening – We review every resume and cover letter",
      "Custom Interviews – We prep job-specific questions and conduct interviews",
      "Candidate Presentation – You get our top candidate picks complete with summaries and video interviews (when available)",
      "Final Touches – We notify all applicants of job status",
    ],
  },
  {
    id: "concierge_level_2",
    name: "Concierge Level II",
    description: "For mid-level roles: Bookkeepers, Project Coordinators, Account Managers, Social Media/Content Creators, Writers/Editors",
    price: 2695,
    jobPostings: 1,
    featuredListings: 0,
    duration: 30,
    features: [
      "Everything in Level I, plus:",
      "Expanded Candidate Reach",
      "Monitoring and Facilitating any Test Projects or Assessments",
      "Attend Second Interviews and Provide Professional Opinion and Insights",
      "Check References",
    ],
    popular: true,
  },
  {
    id: "concierge_level_3",
    name: "Concierge Level III",
    description: "For mid-to-upper-level roles: Executives, Managers, Marketing/PR, Accounting/CPA, Tech, Sales & Specialty Roles",
    price: 3995,
    jobPostings: 1,
    featuredListings: 0,
    duration: 30,
    features: [
      "Everything in Level I & Level II, plus:",
      "In-depth role requirement and company culture consultation",
      "Expanded candidate reach including social media outreach, LinkedIn and direct email to attract a broader pool of candidates",
      "Onboarding Services",
      "Continuous support throughout hiring and initial onboarding",
    ],
    recommended: true,
  },
];

interface PackageCardProps {
  package: JobPackage & { current?: boolean };
  onPurchase: (packageId: string) => void;
  disabled?: boolean;
}

export function PackageCard({
  package: pkg,
  onPurchase,
  disabled = false,
}: PackageCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (disabled || pkg.current) return;

    setIsLoading(true);
    try {
      await onPurchase(pkg.id);
    } finally {
      setIsLoading(false);
    }
  };

  const getPackageIcon = () => {
    switch (pkg.id) {
      case "standard":
        return <Building className="h-6 w-6" />;
      case "featured":
        return <Star className="h-6 w-6" />;
      case "email_blast":
        return <Zap className="h-6 w-6" />;
      case "gold_plus":
        return <Crown className="h-6 w-6" />;
      case "concierge_lite":
        return <Users className="h-6 w-6" />;
      case "concierge_level_1":
        return <UserCheck className="h-6 w-6" />;
      case "concierge_level_2":
        return <UserCog className="h-6 w-6" />;
      case "concierge_level_3":
        return <Crown className="h-6 w-6" />;
      default:
        return <Building className="h-6 w-6" />;
    }
  };

  const getCardClassName = () => {
    let baseClass = "relative transition-all duration-200 hover:shadow-lg";

    if (pkg.current) {
      baseClass += " ring-2 ring-blue-500 shadow-lg";
    } else if (pkg.recommended) {
      baseClass += " ring-2 ring-purple-500 shadow-lg";
    } else if (pkg.popular) {
      baseClass += " ring-2 ring-green-500 shadow-md";
    }

    return baseClass;
  };

  const getButtonVariant = () => {
    if (pkg.current) return "outline";
    if (pkg.recommended) return "default";
    return "outline";
  };

  const getButtonText = () => {
    if (pkg.current) return "Current Package";
    if (isLoading) return "Processing...";
    return "Purchase Package";
  };

  return (
    <Card className={`${getCardClassName()} h-full flex flex-col`}>
      {/* Badge for popular/recommended */}
      {(pkg.popular || pkg.recommended || pkg.current) && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge
            className={
              pkg.current
                ? "bg-blue-500 text-white"
                : pkg.recommended
                  ? "bg-purple-500 text-white"
                  : "bg-green-500 text-white"
            }
          >
            {pkg.current
              ? "Current"
              : pkg.recommended
                ? "Recommended"
                : "Popular"}
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4 flex-shrink-0">
        <div className="flex justify-center mb-4">
          <div
            className={`p-3 rounded-full ${pkg.recommended
              ? "bg-purple-100 text-purple-600"
              : pkg.popular
                ? "bg-green-100 text-green-600"
                : pkg.current
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-600"
              }`}
          >
            {getPackageIcon()}
          </div>
        </div>

        <CardTitle className="text-xl font-extrabold flex items-center justify-center text-center leading-tight px-2">
          {pkg.name}
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 min-h-[80px] flex items-center justify-center text-center px-2 leading-relaxed">
          {pkg.description}
        </CardDescription>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="text-3xl font-bold text-gray-900">${pkg.price}</div>
          <div className="text-sm text-gray-500">
            {pkg.jobPostings === -1
              ? "Unlimited postings"
              : `${pkg.jobPostings} job posting${pkg.jobPostings > 1 ? "s" : ""
              }`}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-grow space-y-4">
        {/* Package highlights - HIDE for Concierge packages */}
        {!pkg.id.startsWith("concierge_level") && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-lg">
                {pkg.jobPostings === -1 ? "∞" : pkg.jobPostings}
              </div>
              <div className="text-gray-600">Job Postings</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">{pkg.featuredListings}</div>
              <div className="text-gray-600">Featured</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">{pkg.duration}</div>
              <div className="text-gray-600">Days Active</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">
                $
                {(
                  pkg.price / (pkg.jobPostings === -1 ? 10 : pkg.jobPostings)
                ).toFixed(0)}
              </div>
              <div className="text-gray-600">Per Posting</div>
            </div>
          </div>
        )}

        {/* Features list - no scroll for concierge, scrollable for others */}
        <div className={`space-y-2 flex-grow ${pkg.id.startsWith("concierge_level") ? "" : "max-h-[400px] overflow-y-auto"}`}>
          <h4 className="font-semibold text-sm text-gray-900">
            What&apos;s included:
          </h4>
          <ul className="space-y-2">
            {pkg.features.map((feature, index) => (
              <li
                key={index}
                className="flex items-start space-x-2 text-sm leading-tight"
              >
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 leading-tight">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom section with button and value proposition - always at bottom */}
        <div className="mt-auto pt-4 space-y-2">
          {/* Value proposition - ABOVE button for alignment */}
          {pkg.recommended && (
            <div className="text-center text-xs text-purple-600 font-medium">
              Best value for growing companies
            </div>
          )}
          {pkg.popular && (
            <div className="text-center text-xs text-green-600 font-medium">
              Most popular choice
            </div>
          )}

          {/* Purchase button - always last */}
          <Button
            onClick={handlePurchase}
            disabled={disabled || isLoading || pkg.current}
            variant={getButtonVariant()}
            className="w-full"
            size="lg"
          >
            {getButtonText()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
