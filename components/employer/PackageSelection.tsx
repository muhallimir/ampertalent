"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Check, Star, Mail, Repeat } from "lucide-react";

export interface JobPackage {
  id: string;
  name: string;
  price: number;
  isMonthly?: boolean;
  isDefault?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  description: string;
  popular?: boolean;
}

const JOB_PACKAGES: JobPackage[] = [
  {
    id: "standard",
    name: "Standard Job Post",
    price: 97,
    isDefault: true,
    icon: Check,
    description: "Perfect for single job postings",
    features: [
      "1 job posting for 1 month",
      "Edit Job Listing once approved",
      "Email Support: Monday – Friday",
    ],
  },
  {
    id: "featured",
    name: "Featured Job Post",
    price: 127,
    icon: Star,
    description: "Get noticed with featured placement",
    popular: true,
    features: [
      "Job Posting for 30 days",
      "*Featured Job* in our Weekly Email",
      "Get 30 days additional *FREE* if position is not filled",
      "Edit Job Listing once approved",
      "Email & Text Support: Monday – Friday",
    ],
  },
  {
    id: "email_blast",
    name: "Solo Email Blast",
    price: 249,
    icon: Mail,
    description: "Stand out and get noticed FAST!",
    features: [
      "Solo Email Blast to our database of job seekers",
      "Free job listing on AmperTalent included",
      "You provide copy (100 words or less)",
      "Optional logo image included",
      "We handle the rest!",
    ],
  },
  {
    id: "gold_plus",
    name: "Gold Plus Small Business",
    price: 97,
    isMonthly: true,
    icon: Repeat,
    description: "For roles you are continually hiring for",
    features: [
      "1 Job Posting for 6 months",
      "Renewing and boosted to the top monthly",
      "Edit Job Posting",
      "Email & Text Support: Monday – Friday",
    ],
  },
];

interface PackageSelectionProps {
  selectedPackage: string;
  onPackageSelect: (packageId: string) => void;
  jobTitle?: string;
}

export function PackageSelection({
  selectedPackage,
  onPackageSelect,
  jobTitle,
}: PackageSelectionProps) {
  const formatPrice = (price: number, isMonthly?: boolean) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    });

    return `${formatter.format(price)}${isMonthly ? "/month" : ""}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Job Posting Package
        </h2>
        <p className="text-gray-600">
          {jobTitle
            ? `Select the best package for "${jobTitle}"`
            : "Select the package that best fits your hiring needs"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {JOB_PACKAGES.map((pkg) => {
          const Icon = pkg.icon;
          const isSelected = selectedPackage === pkg.id;

          return (
            <Card
              key={pkg.id}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected
                  ? "ring-2 ring-brand-teal border-brand-teal shadow-lg"
                  : "border-gray-200 hover:border-gray-300"
                }`}
              onClick={() => onPackageSelect(pkg.id)}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-brand-coral text-white px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              {pkg.isDefault && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-brand-teal text-white px-3 py-1">
                    Recommended
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${isSelected
                          ? "bg-brand-teal text-white"
                          : "bg-gray-100 text-gray-600"
                        }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <input
                        type="radio"
                        name="package"
                        value={pkg.id}
                        checked={isSelected}
                        onChange={() => onPackageSelect(pkg.id)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected
                            ? "border-brand-teal bg-brand-teal"
                            : "border-gray-300"
                          }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <CardTitle className="text-lg font-semibold text-gray-900 mt-2">
                  {pkg.name}
                </CardTitle>

                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(pkg.price, pkg.isMonthly)}
                  </span>
                  {pkg.isMonthly && (
                    <span className="text-sm text-gray-500">recurring</span>
                  )}
                </div>

                <CardDescription className="text-gray-600 mt-2">
                  {pkg.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2">
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-brand-teal flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Need help choosing?
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Our Standard Job Post is perfect for most positions. For higher
              visibility, try Featured Job Post. Need full recruitment support?
              Consider our Concierge services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { JOB_PACKAGES };
