'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SimpleJobPostingForm } from '@/components/employer/SimpleJobPostingForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ArrowLeft, Shield } from 'lucide-react';

type JobCategory =
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
  category: JobCategory;
  skills: string[];
  benefits?: string;
  applicationDeadline?: string;
  website?: string;
  linkedinProfile?: string;
  contactPhone?: string;
  isCompanyPrivate: boolean;
  status?: string;
  expiresAt?: string;
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
  category?: string;
  skills?: string[];
  benefits?: string;
  applicationDeadline?: string;
  website?: string;
  linkedinProfile?: string;
  contactPhone?: string;
  isCompanyPrivate?: boolean;
}

export default function AdminEditJobPage() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminStatus, setAdminStatus] = useState<string>('');
  const [adminExpiresAt, setAdminExpiresAt] = useState<string>('');

  const jobId = params.id as string;

  const loadJobData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/job-posts/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        const job = data.job;

        setAdminStatus(job.status || 'draft');
        setAdminExpiresAt(
          job.expiresAt ? job.expiresAt.split('T')[0] : ''
        );

        const isCommissionOnly = job.payRangeText === 'Commission Only'

        setJobData({
          id: job.id,
          title: job.title,
          description: job.description,
          requirements: job.requirements || 'Requirements not specified',
          salaryMin: isCommissionOnly ? undefined : (job.payRangeMin || undefined),
          salaryMax: isCommissionOnly ? undefined : (job.payRangeMax || undefined),
          salaryType: job.salaryType || 'hourly',
          commissionOnly: isCommissionOnly,
          location: job.locationText,
          jobType:
            job.type === 'full_time'
              ? 'FULL_TIME'
              : job.type === 'part_time'
                ? 'PART_TIME'
                : job.type === 'project'
                  ? 'TEMPORARY'
                  : job.type === 'NOT_SPECIFIED'
                    ? 'NOT_SPECIFIED'
                    : job.type || 'NOT_SPECIFIED',
          experienceLevel: job.experienceLevel || 'mid',
          category: (job.category || 'OTHER') as JobCategory,
          skills: job.skillsRequired || [],
          benefits: job.benefits,
          applicationDeadline: job.applicationDeadline
            ? job.applicationDeadline.split('T')[0]
            : '',
          website: job.website || '',
          linkedinProfile: job.linkedinProfile || '',
          contactPhone: job.contactPhone || '',
          isCompanyPrivate: job.isCompanyPrivate || false,
          status: job.status,
          expiresAt: job.expiresAt,
        });
      } else {
        addToast({
          title: 'Error',
          description: 'Failed to load job data',
          variant: 'destructive',
          duration: 5000,
        });
        router.push('/admin/job-posts');
      }
    } catch (error) {
      console.error('Error loading job data:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load job data',
        variant: 'destructive',
        duration: 5000,
      });
      router.push('/admin/job-posts');
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
      // Merge admin-only fields with form data
      const payload = {
        ...data,
        status: adminStatus,
        expiresAt: adminExpiresAt
          ? new Date(adminExpiresAt).toISOString()
          : null,
      };

      const response = await fetch(`/api/admin/job-posts/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        addToast({
          title: 'Success!',
          description: 'Job updated successfully!',
          variant: 'success',
          duration: 3000,
        });

        setTimeout(() => {
          router.push('/admin/job-posts');
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
            The job you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button onClick={() => router.push('/admin/job-posts')}>
            Back to Job Posts
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
            onClick={() => router.push('/admin/job-posts')}
            className="border-gray-300 hover:border-brand-teal hover:text-brand-teal"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job Posts
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Edit Job Posting (Admin)
          </h1>
          <p className="text-gray-600">Editing: {jobData.title}</p>
        </div>

        {/* Admin Controls */}
        <Card className="mb-8 border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Shield className="h-5 w-5 text-amber-500" />
              <span>Admin Controls</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="admin-status">Job Status</Label>
                <Select value={adminStatus} onValueChange={setAdminStatus}>
                  <SelectTrigger id="admin-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_vetting">
                      Pending Vetting
                    </SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-expires-at">Expiration Date</Label>
                <Input
                  id="admin-expires-at"
                  type="date"
                  value={adminExpiresAt}
                  onChange={(e) => setAdminExpiresAt(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Posting Form */}
        <SimpleJobPostingForm
          initialData={jobData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save"
          strictValidation={false}
        />
      </div>
    </div>
  );
}
