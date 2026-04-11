'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SkillsSelector } from '@/components/common/SkillsSelector';
import { JOB_CATEGORIES } from '@/lib/job-constants';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { htmlToMarkdown } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Briefcase,
  DollarSign,
  MapPin,
  Clock,
  FileText,
  Save,
  Shield,
  Info,
} from 'lucide-react';

// Dynamically import the markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

// Relaxed schema (admin) - requirements and salary are optional
const jobPostingSchemaRelaxed = z.object({
  title: z
    .string()
    .min(1, 'Job title is required')
    .max(100, 'Title must be less than 100 characters'),
  description: z
    .string()
    .min(100, 'Job description must be at least 100 characters')
    .max(7000, 'Description must be less than 7000 characters'),
  requirements: z
    .string()
    .max(4000, 'Qualifications must be less than 4000 characters')
    .optional()
    .or(z.literal('')),
  salaryMin: z.coerce
    .number()
    .min(1, 'Minimum salary must be at least 1')
    .max(1000000, 'Salary must be reasonable')
    .optional()
    .or(z.nan().transform(() => undefined)),
  salaryMax: z.coerce
    .number()
    .min(1, 'Maximum salary must be at least 1')
    .max(1000000, 'Salary must be reasonable')
    .optional()
    .or(z.nan().transform(() => undefined)),
  salaryType: z.enum(['hourly', 'monthly', 'yearly']),
  commissionOnly: z.boolean().optional(),
  location: z.string().min(1, 'Location is required'),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'PERMANENT', 'TEMPORARY', 'NOT_SPECIFIED']),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'lead']),
  category: z.enum(
    [
      'ACCOUNTING_BOOKKEEPING',
      'ADMINISTRATION_VIRTUAL_ASSISTANT',
      'ADVERTISING',
      'BLOGGER',
      'BUSINESS_DEVELOPMENT',
      'COMPUTER_IT',
      'CONSULTANT',
      'CUSTOMER_SERVICE',
      'DATABASE_DEVELOPMENT',
      'DESIGN',
      'FINANCE',
      'GRAPHIC_DESIGN_ARTIST',
      'HUMAN_RESOURCES',
      'INTERNET_MARKETING_SPECIALIST',
      'MANAGER',
      'MARKETING_PUBLIC_RELATIONS',
      'MEDIA_SPECIALIST',
      'OTHER',
      'PARALEGAL_LEGAL',
      'PROGRAMMER',
      'RESEARCHER',
      'SALES',
      'SOCIAL_MEDIA',
      'STRATEGIC_PLANNER',
      'VIDEO_PRODUCTION_EDITING',
      'WEB_DESIGN_DEVELOPMENT',
      'WEBSITE_MANAGER',
      'WRITING_EDITING',
    ],
    { required_error: 'Please select a job category' }
  ),
  skills: z.array(z.string()).max(10, 'Maximum 10 skills allowed').optional(),
  benefits: z.string().optional(),
  applicationDeadline: z.string().optional(),
  website: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  linkedinProfile: z
    .string()
    .url('Please enter a valid LinkedIn URL')
    .optional()
    .or(z.literal('')),
  contactPhone: z.string().optional(),
  isCompanyPrivate: z.boolean().optional(),
});

// Strict schema (employer) - requirements and salary are required
const jobPostingSchemaStrict = jobPostingSchemaRelaxed.extend({
  requirements: z
    .string()
    .min(50, 'Qualifications must be at least 50 characters')
    .max(4000, 'Qualifications must be less than 4000 characters'),
  salaryMin: z.coerce
    .number({ invalid_type_error: 'Minimum salary is required' })
    .min(1, 'Minimum salary is required')
    .max(1000000, 'Salary must be reasonable')
    .optional()
    .or(z.nan().transform(() => undefined)),
  salaryMax: z.coerce
    .number({ invalid_type_error: 'Maximum salary is required' })
    .min(1, 'Maximum salary is required')
    .max(1000000, 'Salary must be reasonable')
    .optional()
    .or(z.nan().transform(() => undefined)),
}).superRefine((data, ctx) => {
  // Salary fields are only required when commissionOnly is not checked
  if (!data.commissionOnly) {
    if (!data.salaryMin) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Minimum salary is required', path: ['salaryMin'] })
    }
    if (!data.salaryMax) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Maximum salary is required', path: ['salaryMax'] })
    }
  }
});

const jobPostingSchema = jobPostingSchemaRelaxed;

type JobPostingFormData = z.infer<typeof jobPostingSchema>;

interface SimpleJobPostingFormProps {
  initialData?: Partial<JobPostingFormData>;
  onSubmit: (data: JobPostingFormData) => Promise<void>;
  onSaveDraft?: (data: Partial<JobPostingFormData>) => Promise<void>;
  isSubmitting: boolean;
  isLoading?: boolean;
  submitLabel?: string;
  strictValidation?: boolean;
}

// Phone number formatting function
const formatPhoneNumber = (value: string) => {
  const phoneNumber = value.replace(/\D/g, '');
  if (phoneNumber.length === 0) return '';
  if (phoneNumber.length <= 3) return `(${phoneNumber}`;
  if (phoneNumber.length <= 6)
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
    3,
    6
  )}-${phoneNumber.slice(6, 10)}`;
};

export function SimpleJobPostingForm({
  initialData,
  onSubmit,
  onSaveDraft,
  isSubmitting,
  isLoading = false,
  submitLabel = 'Continue',
  strictValidation = true,
}: SimpleJobPostingFormProps) {
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [showTitleAlert, setShowTitleAlert] = useState(false);

  const activeSchema = strictValidation ? jobPostingSchemaStrict : jobPostingSchemaRelaxed;

  const form = useForm<JobPostingFormData>({
    resolver: zodResolver(activeSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      title: initialData?.title || '',
      description: htmlToMarkdown(initialData?.description || ''),
      requirements: htmlToMarkdown(initialData?.requirements || ''),
      salaryMin: initialData?.salaryMin,
      salaryMax: initialData?.salaryMax,
      salaryType: initialData?.salaryType || 'hourly',
      commissionOnly: initialData?.commissionOnly || false,
      location: initialData?.location || '',
      jobType: initialData?.jobType || 'NOT_SPECIFIED',
      experienceLevel: initialData?.experienceLevel || 'mid',
      category: initialData?.category,
      skills: initialData?.skills || [],
      benefits: initialData?.benefits || '',
      applicationDeadline: initialData?.applicationDeadline || '',
      website: initialData?.website || '',
      linkedinProfile: initialData?.linkedinProfile || '',
      contactPhone: initialData?.contactPhone || '',
      isCompanyPrivate: initialData?.isCompanyPrivate || false,
    },
  });

  const watchedData = form.watch();

  // Handle initialData - only load once on mount to avoid overwriting user changes
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      form.reset({
        title: initialData?.title || '',
        description: htmlToMarkdown(initialData?.description || ''),
        requirements: htmlToMarkdown(initialData?.requirements || ''),
        salaryMin: initialData?.salaryMin,
        salaryMax: initialData?.salaryMax,
        salaryType: initialData?.salaryType || 'hourly',
        commissionOnly: initialData?.commissionOnly || false,
        location: initialData?.location || '',
        jobType: initialData?.jobType || 'NOT_SPECIFIED',
        experienceLevel: initialData?.experienceLevel || 'mid',
        category: initialData?.category,
        skills: initialData?.skills || [],
        benefits: initialData?.benefits || '',
        applicationDeadline: initialData?.applicationDeadline || '',
        website: initialData?.website || '',
        linkedinProfile: initialData?.linkedinProfile || '',
        contactPhone: initialData?.contactPhone || '',
        isCompanyPrivate: initialData?.isCompanyPrivate || false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleSaveDraft = useCallback(async () => {
    if (!onSaveDraft) return;

    // Only validate title for drafts
    if (!watchedData.title || watchedData.title.trim() === '') {
      setShowTitleAlert(true);
      form.setError('title', {
        type: 'manual',
        message: 'Job title is required even for drafts'
      });
      // Scroll to top to show the alert, then focus title field
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          document.getElementById('title')?.focus();
        }, 300);
      }, 100);
      return;
    }

    setShowTitleAlert(false);
    setIsDraftSaving(true);
    try {
      await onSaveDraft(watchedData);
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsDraftSaving(false);
    }
  }, [onSaveDraft, watchedData, form]);

  const formatSalary = (min: number, max: number, type: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    });
    const period =
      type === 'hourly' ? '/hour' : type === 'monthly' ? '/month' : '/year';
    return `${formatter.format(min)} - ${formatter.format(max)} ${period}`;
  };

  const handleFormSubmit = useCallback(
    async (data: JobPostingFormData) => {
      try {
        await onSubmit(data);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    },
    [onSubmit]
  );

  /**
   * ===== Focus Management (Exact Order) =====
   * 1. title
   * 2. location
   * 3. category
   * 4. description
   * 5. requirements
   * 6. salaryMin
   * 7. salaryMax
   */
  const FOCUS_ORDER: (keyof JobPostingFormData)[] = [
    'title',
    'location',
    'category',
    'description',
    'requirements',
    'salaryMin',
    'salaryMax',
  ];

  const focusField = (field: keyof JobPostingFormData) => {
    const { setFocus } = form;

    switch (field) {
      case 'category': {
        // shadcn SelectTrigger for category has data-field="category"
        const el = document.querySelector<HTMLElement>('[data-field="category"]');
        el?.focus();
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      case 'description': {
        // MDEditor textarea has id="description-input"
        const el = document.getElementById('description-input') as HTMLTextAreaElement | null;
        el?.focus();
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      default: {
        // RHF-registered inputs (title, location, requirements, salaryMin, salaryMax)
        try {
          setFocus(field as any, { shouldSelect: true });
        } catch {
          const el = document.querySelector<HTMLElement>(`[name="${field}"]`);
          el?.focus();
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  const focusFirstInvalidInOrder = (errors: Record<string, unknown>) => {
    const first = FOCUS_ORDER.find((key) => Boolean((errors as any)[key]));
    if (first) {
      setTimeout(() => focusField(first), 80); // allow error message to render
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          handleFormSubmit,
          (errors) => focusFirstInvalidInOrder(errors)
        )}
        className="space-y-8"
      >
        {/* Alert for missing required field (title) */}
        {showTitleAlert && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>
              <strong>Required Field Missing:</strong> Job title is required to save this draft.
            </AlertDescription>
          </Alert>
        )}

        {/* Basic Information */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-brand-teal" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title of the job you are hiring for *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Ecommerce Marketing Copywriter"
                      className="border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="e.g., Remote (US), Remote (Global), New York, NY"
                        className="pl-10 border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="jobType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select job type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full-Time</SelectItem>
                        <SelectItem value="PART_TIME">Part-Time</SelectItem>
                        <SelectItem value="PERMANENT">Permanent</SelectItem>
                        <SelectItem value="TEMPORARY">Temporary</SelectItem>
                        <SelectItem value="NOT_SPECIFIED">Not Specified</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="experienceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience level *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                        <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                        <SelectItem value="senior">Senior Level (5+ years)</SelectItem>
                        <SelectItem value="lead">Lead/Principal (8+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-field="category">
                        <SelectValue placeholder="Please Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(JOB_CATEGORIES).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://www.yourcompany.com"
                      className="border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linkedinProfile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    LinkedIn profile link (This will be used in our verification process and not
                    included in your job post)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://www.linkedin.com/in/yourprofile"
                      className="border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>For internal use only</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      className="border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        field.onChange(formatted);
                      }}
                    />
                  </FormControl>
                  <FormDescription>For internal use only</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isCompanyPrivate"
              render={({ field }) => (
                <FormItem>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <FormLabel className="font-medium text-blue-900">
                              Company Privacy
                            </FormLabel>
                            <FormDescription className="text-sm text-blue-700 mt-1">
                              Hide your company information from job seekers while keeping it visible
                              to admins
                            </FormDescription>
                          </div>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                              <span className="text-sm font-medium text-blue-900">
                                {field.value ? 'Private' : 'Public'}
                              </span>
                            </div>
                          </FormControl>
                        </div>
                        <div className="mt-3 text-xs text-blue-600">
                          <p>
                            <strong>When enabled:</strong> Job seekers will see "Private Company"
                            instead of your company name and details. Admins can still see your full
                            company information for verification purposes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-brand-teal" />
              <span>Job Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Description *</FormLabel>
                  <FormControl>
                    <div data-color-mode="light">
                      <MDEditor
                        value={field.value}
                        onChange={(val) => field.onChange(val || '')}
                        preview="edit"
                        hideToolbar={false}
                        visibleDragbar={false}
                        textareaProps={{
                          id: 'description-input', // stable handle for focusing
                          placeholder:
                            'Describe the role, responsibilities, and what makes this position exciting...',
                          style: { fontSize: 14, lineHeight: 1.5 },
                        }}
                        height={300}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/7000 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualifications / Skills Needed{strictValidation ? ' *' : ''}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="List the required skills, experience, and qualifications..."
                      rows={6}
                      className="border-gray-300 focus:border-brand-teal focus:ring-brand-teal resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/4000 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Skills</FormLabel>
                  <FormControl>
                    <SkillsSelector
                      selectedSkills={field.value || []}
                      onSkillsChange={field.onChange}
                      maxSkills={10}
                    />
                  </FormControl>
                  <FormDescription>Optional - Select up to 10 skills</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="benefits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Benefits & Perks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Health insurance, flexible hours, professional development, etc..."
                      rows={4}
                      className="border-gray-300 focus:border-brand-teal focus:ring-brand-teal resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Compensation */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-brand-teal" />
              <span>Compensation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="salaryType"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-6 mb-2">
                    <FormLabel className="mb-0">Salary Type *</FormLabel>
                    <FormField
                      control={form.control}
                      name="commissionOnly"
                      render={({ field: commField }) => (
                        <FormItem className="mb-0">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="commissionOnly"
                              checked={!!commField.value}
                              onChange={(e) => {
                                commField.onChange(e.target.checked)
                                if (e.target.checked) {
                                  form.clearErrors(['salaryMin', 'salaryMax'])
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-brand-teal accent-brand-teal cursor-pointer"
                            />
                            <label htmlFor="commissionOnly" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                              Commission Only
                            </label>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select salary type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly Rate</SelectItem>
                      <SelectItem value="monthly">Monthly Salary</SelectItem>
                      <SelectItem value="yearly">Annual Salary</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="salaryMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Minimum Salary{strictValidation && !watchedData.commissionOnly ? ' *' : ''}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="number"
                          placeholder="20"
                          disabled={!!watchedData.commissionOnly}
                          className="pl-10 border-gray-300 focus:border-brand-teal focus:ring-brand-teal disabled:opacity-50 disabled:cursor-not-allowed"
                          {...field}
                          value={watchedData.commissionOnly ? '' : (field.value || '')}
                          onChange={(e) => {
                            const inputValue = e.target.value.trim();

                            if (inputValue === '') {
                              field.onChange(undefined);
                              form.clearErrors('salaryMin');
                            } else {
                              const numericValue = Number(inputValue);
                              if (!isNaN(numericValue) && numericValue > 0) {
                                field.onChange(numericValue);
                                form.clearErrors('salaryMin');
                              } else {
                                field.onChange(undefined);
                              }
                            }

                            // Manual cross-field validation
                            const maxSalary = form.getValues('salaryMax');
                            const currentMin = inputValue === '' ? undefined : Number(inputValue);
                            if (currentMin && maxSalary && !isNaN(currentMin) && currentMin > maxSalary) {
                              form.setError('salaryMin', {
                                type: 'manual',
                                message: 'Minimum salary cannot exceed maximum salary',
                              });
                              form.setError('salaryMax', {
                                type: 'manual',
                                message: 'Maximum salary must be at least the minimum salary',
                              });
                            } else {
                              form.clearErrors(['salaryMin', 'salaryMax']);
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salaryMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Maximum Salary{strictValidation && !watchedData.commissionOnly ? ' *' : ''}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="number"
                          placeholder="30"
                          disabled={!!watchedData.commissionOnly}
                          className="pl-10 border-gray-300 focus:border-brand-teal focus:ring-brand-teal disabled:opacity-50 disabled:cursor-not-allowed"
                          {...field}
                          value={watchedData.commissionOnly ? '' : (field.value || '')}
                          onChange={(e) => {
                            const inputValue = e.target.value.trim();

                            if (inputValue === '') {
                              field.onChange(undefined);
                              form.clearErrors('salaryMax');
                            } else {
                              const numericValue = Number(inputValue);
                              if (!isNaN(numericValue) && numericValue > 0) {
                                field.onChange(numericValue);
                                form.clearErrors('salaryMax');
                              } else {
                                field.onChange(undefined);
                              }
                            }

                            // Manual cross-field validation
                            const minSalary = form.getValues('salaryMin');
                            const currentMax = inputValue === '' ? undefined : Number(inputValue);
                            if (currentMax && minSalary && !isNaN(currentMax) && minSalary > currentMax) {
                              form.setError('salaryMin', {
                                type: 'manual',
                                message: 'Minimum salary cannot exceed maximum salary',
                              });
                              form.setError('salaryMax', {
                                type: 'manual',
                                message: 'Maximum salary must be at least the minimum salary',
                              });
                            } else {
                              form.clearErrors(['salaryMin', 'salaryMax']);
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {watchedData.commissionOnly ? (
              <div className="bg-brand-teal/10 p-4 rounded-lg border border-brand-teal/20">
                <p className="text-sm text-brand-teal">
                  <strong>Salary Range Preview:</strong> Commission Only
                </p>
              </div>
            ) : watchedData.salaryMin && watchedData.salaryMax && typeof watchedData.salaryMin === 'number' && typeof watchedData.salaryMax === 'number' ? (
              <div className="bg-brand-teal/10 p-4 rounded-lg border border-brand-teal/20">
                <p className="text-sm text-brand-teal">
                  <strong>Salary Range Preview:</strong>{' '}
                  {formatSalary(
                    watchedData.salaryMin,
                    watchedData.salaryMax,
                    watchedData.salaryType
                  )}
                </p>
              </div>
            ) : null}

            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <p className="font-semibold mb-1">Application Deadline Information</p>
                <p className="text-sm text-blue-800">
                  Job listings expire after 30 days. Upon successful payment, the application deadline will automatically be set to 30 days from the payment date.
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6">
          <div>
            {onSaveDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isDraftSaving || isLoading}
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                {isDraftSaving ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </>
                )}
              </Button>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting === true}
            className="bg-brand-teal hover:bg-brand-teal/90 text-white"
          >
            {isSubmitting === true ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Processing...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
