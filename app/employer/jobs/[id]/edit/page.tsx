'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SimpleJobPostingForm } from '@/components/employer/SimpleJobPostingForm';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';
import { getWithImpersonation, putWithImpersonation, postWithImpersonation } from '@/lib/api-client';

interface JobData {
  id: string;
  title: string;
  description: string;
  requirements: string;
  salaryMin: number;
  salaryMax: number;
  salaryType: 'hourly' | 'monthly' | 'yearly';
  commissionOnly?: boolean;
  location: string;
  jobType: 'FULL_TIME' | 'PART_TIME' | 'PERMANENT' | 'TEMPORARY' | 'NOT_SPECIFIED';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
  category:
  | 'ACCOUNTING_BOOKKEEPING'
  | 'ADMINISTRATION_VIRTUAL_ASSISTANT'
  | 'ADVERTISING'
  | 'BLOGGER'
  | 'BUSINESS_DEVELOPMENT'
  | 'COMPUTER_IT'
  | 'CONSULTANT'
  | 'CUSTOMER_SERVICE'
  | 'DATABASE_DEVELOPMENT'
  | 'DESIGN'
  | 'FINANCE'
  | 'GRAPHIC_DESIGN_ARTIST'
  | 'HUMAN_RESOURCES'
  | 'INTERNET_MARKETING_SPECIALIST'
  | 'MANAGER'
  | 'MARKETING_PUBLIC_RELATIONS'
  | 'MEDIA_SPECIALIST'
  | 'OTHER'
  | 'PARALEGAL_LEGAL'
  | 'PROGRAMMER'
  | 'RESEARCHER'
  | 'SALES'
  | 'SOCIAL_MEDIA'
  | 'STRATEGIC_PLANNER'
  | 'VIDEO_PRODUCTION_EDITING'
  | 'WEB_DESIGN_DEVELOPMENT'
  | 'WEBSITE_MANAGER'
  | 'WRITING_EDITING';
  skills: string[];
  benefits?: string;
  applicationDeadline?: string;
  website?: string;
  linkedinProfile?: string;
  contactPhone?: string;
  isCompanyPrivate: boolean;
  status?: string;
}

interface JobFormData {
  title?: string;
  description?: string;
  requirements?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: 'hourly' | 'monthly' | 'yearly';
  commissionOnly?: boolean;
  location?: string;
  jobType?: 'FULL_TIME' | 'PART_TIME' | 'PERMANENT' | 'TEMPORARY' | 'NOT_SPECIFIED';
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead';
  category?:
  | 'ACCOUNTING_BOOKKEEPING'
  | 'ADMINISTRATION_VIRTUAL_ASSISTANT'
  | 'ADVERTISING'
  | 'BLOGGER'
  | 'BUSINESS_DEVELOPMENT'
  | 'COMPUTER_IT'
  | 'CONSULTANT'
  | 'CUSTOMER_SERVICE'
  | 'DATABASE_DEVELOPMENT'
  | 'DESIGN'
  | 'FINANCE'
  | 'GRAPHIC_DESIGN_ARTIST'
  | 'HUMAN_RESOURCES'
  | 'INTERNET_MARKETING_SPECIALIST'
  | 'MANAGER'
  | 'MARKETING_PUBLIC_RELATIONS'
  | 'MEDIA_SPECIALIST'
  | 'OTHER'
  | 'PARALEGAL_LEGAL'
  | 'PROGRAMMER'
  | 'RESEARCHER'
  | 'SALES'
  | 'SOCIAL_MEDIA'
  | 'STRATEGIC_PLANNER'
  | 'VIDEO_PRODUCTION_EDITING'
  | 'WEB_DESIGN_DEVELOPMENT'
  | 'WEBSITE_MANAGER'
  | 'WRITING_EDITING';
  skills?: string[];
  benefits?: string;
  applicationDeadline?: string;
  website?: string;
  linkedinProfile?: string;
  contactPhone?: string;
  isCompanyPrivate?: boolean;
  isDraft?: boolean;
  useCredits?: boolean;
}

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const jobId = params.id as string;

  const loadJobData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getWithImpersonation(`/api/employer/jobs/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        // Transform API data to form format
        const isCommissionOnly = data.job.payRangeText === 'Commission Only'

        setJobData({
          id: data.job.id,
          title: data.job.title,
          description: data.job.description,
          requirements: data.job.requirements || 'Requirements not specified',
          salaryMin: isCommissionOnly ? undefined : (data.job.payRangeMin || undefined),
          salaryMax: isCommissionOnly ? undefined : (data.job.payRangeMax || undefined),
          salaryType: data.job.salaryType || 'hourly',
          commissionOnly: isCommissionOnly,
          location: data.job.locationText,
          jobType:
            data.job.type === 'full_time'
              ? 'FULL_TIME'
              : data.job.type === 'part_time'
                ? 'PART_TIME'
                : data.job.type === 'project'
                  ? 'TEMPORARY'
                  : data.job.type === 'NOT_SPECIFIED'
                    ? 'NOT_SPECIFIED'
                    : data.job.type || 'NOT_SPECIFIED',
          experienceLevel: data.job.experienceLevel || 'mid',
          category: data.job.category || 'OTHER',
          skills: data.job.skillsRequired || [],
          benefits: data.job.benefits,
          applicationDeadline: data.job.applicationDeadline
            ? data.job.applicationDeadline.split('T')[0]
            : '',
          website: data.job.website || '',
          linkedinProfile: data.job.linkedinProfile || '',
          contactPhone: data.job.contactPhone || '',
          isCompanyPrivate: data.job.isCompanyPrivate || false,
          status: data.job.status,
        });
      } else {
        addToast({
          title: 'Error',
          description: 'Failed to load job data',
          variant: 'destructive',
          duration: 5000,
        });
        router.push('/employer/jobs');
      }
    } catch (error) {
      console.error('Error loading job data:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load job data',
        variant: 'destructive',
        duration: 5000,
      });
      router.push('/employer/jobs');
    } finally {
      setIsLoading(false);
    }
  }, [jobId, addToast, router]);

  useEffect(() => {
    loadJobData();
  }, [loadJobData]);

  const handleSubmit = async (data: JobFormData) => {
    setIsSubmitting(true);
    try {
      console.log('Updating job:', data);
      console.log('Job status:', jobData?.status);

      // If job is currently a draft and we're publishing it, check for credits
      if (jobData?.status === 'draft' && !data.isDraft) {
        console.log('Publishing draft job - checking for credits...');

        // First check if employer has credits
        const creditsResponse = await getWithImpersonation('/api/employer/credits');
        const creditsData = await creditsResponse.json();

        if (creditsData.credits.hasCredits) {
          // Use existing credits flow
          console.log('Using existing credits to publish job');
          data.useCredits = true;
        } else {
          // No credits - need to create a pending job post first, then redirect to checkout
          console.log(
            'No credits available, creating pending job post for checkout...'
          );

          // First, create a pending job post
          const pendingJobResponse = await postWithImpersonation('/api/employer/jobs/pending', {
            jobData: data,
          });

          if (!pendingJobResponse.ok) {
            const pendingError = await pendingJobResponse.json();
            addToast({
              title: 'Error',
              description:
                pendingError.error ||
                'Failed to prepare checkout. Please try again.',
              variant: 'destructive',
              duration: 5000,
            });
            return;
          }

          const pendingJobData = await pendingJobResponse.json();
          console.log('Created pending job post:', pendingJobData);

          // Now generate checkout URL with the pending job details
          const checkoutResponse = await postWithImpersonation('/api/employer/jobs/checkout', {
            packageId: 'standard',
            pendingJobId: pendingJobData.pendingJobId,
            sessionToken: pendingJobData.sessionToken,
            returnUrl: `${window.location.origin}/employer/jobs`,
          });

          if (checkoutResponse.ok) {
            const checkoutResult = await checkoutResponse.json();

            // Redirect to checkout
            console.log(
              'Redirecting to checkout URL:',
              checkoutResult.checkoutUrl
            );
            window.location.href = checkoutResult.checkoutUrl;
            return; // Exit early since we're redirecting
          } else {
            const checkoutError = await checkoutResponse.json();
            addToast({
              title: 'Checkout Error',
              description:
                checkoutError.error ||
                'Error generating checkout URL. Please try again.',
              variant: 'destructive',
              duration: 5000,
            });
            return;
          }
        }
      }

      const response = await putWithImpersonation(`/api/employer/jobs/${jobId}`, data);

      if (response.ok) {
        addToast({
          title: 'Success!',
          description: 'Job updated successfully!',
          variant: 'success',
          duration: 3000,
        });

        // Redirect to job management page after a short delay
        setTimeout(() => {
          router.push('/employer/jobs');
        }, 1000);
      } else {
        const error = await response.json();
        addToast({
          title: 'Error',
          description: error.error || 'Error updating job. Please try again.',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error updating job:', error);
      addToast({
        title: 'Error',
        description: 'Error updating job. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    }
    setIsSubmitting(false);
  };

  const handleSaveDraft = async (data: JobFormData) => {
    try {
      console.log('Saving draft:', data);

      const response = await putWithImpersonation(`/api/employer/jobs/${jobId}`, { ...data, isDraft: true });

      if (response.ok) {
        addToast({
          title: 'Draft Saved',
          description: 'Your job posting draft has been saved successfully!',
          variant: 'success',
          duration: 3000,
        });

        router.push('/employer/jobs');
      } else {
        const error = await response.json();
        addToast({
          title: 'Error',
          description: error.error || 'Error saving draft. Please try again.',
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      addToast({
        title: 'Error',
        description: 'Error saving draft. Please try again.',
        variant: 'destructive',
        duration: 5000,
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

  if (!jobData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Job Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            The job you&apos;re looking for doesn&apos;t exist or you don&apos;t
            have permission to edit it.
          </p>
          <Button onClick={() => router.push('/employer/jobs')}>
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="border-gray-300 hover:border-brand-teal hover:text-brand-teal"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Edit Job Posting
          </h1>
          <p className="text-gray-600">Update your job posting details</p>
        </div>

        {/* Job Posting Form */}
        <SimpleJobPostingForm
          initialData={jobData}
          onSubmit={handleSubmit}
          onSaveDraft={jobData.status === 'draft' ? handleSaveDraft : undefined}
          isSubmitting={isSubmitting}
          submitLabel={jobData.status === 'approved' ? 'Save' : 'Continue'}
        />
      </div>
    </div>
  );
}
