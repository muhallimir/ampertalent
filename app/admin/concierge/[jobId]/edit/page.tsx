'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/ui/toast';
import { ArrowLeft, Save, Eye } from '@/components/icons';
import { JOB_CATEGORIES_ARRAY, EXPERIENCE_LEVELS, JOB_TYPES_ADMIN, SALARY_TYPES } from '@/lib/job-constants';

interface JobData {
  id: string;
  title: string;
  description: string;
  requirements: string;
  salaryMin: number;
  salaryMax: number;
  salaryType: 'hourly' | 'monthly' | 'yearly';
  location: string;
  jobType: 'FULL_TIME' | 'PART_TIME' | 'PERMANENT' | 'TEMPORARY';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
  category: string;
  skills: string[];
  benefits?: string;
  applicationDeadline?: string;
  website?: string;
  linkedinProfile?: string;
  contactPhone?: string;
  isCompanyPrivate: boolean;
  status: string;
  conciergeStatus: string;
  packageType?: string;
}

const JOB_CATEGORIES = JOB_CATEGORIES_ARRAY;
const JOB_TYPES = JOB_TYPES_ADMIN;

export default function AdminEditConciergeJobPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const jobId = params.jobId as string;

  const [jobData, setJobData] = useState<JobData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [skillsInput, setSkillsInput] = useState('');

  const loadJobData = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/concierge/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setJobData({
          id: data.jobId || jobId,
          title: data.jobTitle || '',
          description: data.jobDescription || data.description || '',
          requirements: data.requirements || '',
          salaryMin: data.salaryMin || 0,
          salaryMax: data.salaryMax || 0,
          salaryType: data.salaryType || 'yearly',
          location: data.location || '',
          jobType: data.jobType || 'FULL_TIME',
          experienceLevel: data.experienceLevel || 'mid',
          category: data.category || 'OTHER',
          skills: data.skills || [],
          benefits: data.benefits || '',
          applicationDeadline: data.applicationDeadline ? data.applicationDeadline.split('T')[0] : '',
          website: data.website || '',
          linkedinProfile: data.linkedinProfile || '',
          contactPhone: data.contactPhone || '',
          isCompanyPrivate: data.isCompanyPrivate || false,
          status: data.jobStatus || 'draft',
          conciergeStatus: data.status || 'pending',
          packageType: data.packageType
        });
        setSkillsInput((data.skills || []).join(', '));
      } else {
        addToast({
          title: "Error",
          description: "Failed to load job data",
          variant: "destructive",
          duration: 5000
        });
        router.push('/admin/concierge');
      }
    } catch (error) {
      console.error('Error loading job data:', error);
      addToast({
        title: "Error",
        description: "Failed to load job data",
        variant: "destructive",
        duration: 5000
      });
      router.push('/admin/concierge');
    } finally {
      setIsLoading(false);
    }
  }, [jobId, addToast, router]);

  useEffect(() => {
    loadJobData();
  }, [loadJobData]);

  const handleSkillsChange = (value: string) => {
    setSkillsInput(value);
    const skillsArray = value.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
    setJobData(prev => prev ? { ...prev, skills: skillsArray } : null);
  };

  const handleSaveDraft = async () => {
    if (!jobData) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/concierge/${jobId}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...jobData, isDraft: true }),
      });

      if (response.ok) {
        addToast({
          title: "Success",
          description: "Job draft saved successfully",
          variant: "success",
          duration: 3000
        });
      } else {
        const error = await response.json();
        addToast({
          title: "Error",
          description: error.error || "Failed to save job draft",
          variant: "destructive",
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error saving job draft:', error);
      addToast({
        title: "Error",
        description: "Failed to save job draft",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostLive = async () => {
    if (!jobData) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/concierge/${jobId}/post-live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (response.ok) {
        addToast({
          title: "Success",
          description: "Job posted live successfully and added to featured section!",
          variant: "success",
          duration: 3000
        });
        setTimeout(() => router.push('/admin/concierge'), 1000);
      } else {
        const error = await response.json();
        addToast({
          title: "Error",
          description: error.error || "Failed to post job live",
          variant: "destructive",
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error posting job live:', error);
      addToast({
        title: "Error",
        description: "Failed to post job live",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsSaving(false);
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
          <p className="text-gray-600 mb-4">The job you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/admin/concierge')}>
            Back to Concierge
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/concierge/${jobId}`)}
              className="border-gray-300 hover:border-teal-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Job Details
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Concierge Job</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Status: {jobData.status}</span>
                <span>Concierge: {jobData.conciergeStatus}</span>
                {jobData.packageType && <span>Package: {jobData.packageType.replace('_', ' ')}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="border-gray-300 hover:border-blue-500"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={handlePostLive}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Post Live
            </Button>
          </div>
        </div>

        {/* Main Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Job Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={jobData.title}
                    onChange={(e) => setJobData(prev => prev ? { ...prev, title: e.target.value } : null)}
                    placeholder="Enter job title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea
                    id="description"
                    value={jobData.description}
                    onChange={(e) => setJobData(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Describe the job role, responsibilities, and what you're looking for"
                    rows={6}
                  />
                </div>
                
                <div>
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea
                    id="requirements"
                    value={jobData.requirements}
                    onChange={(e) => setJobData(prev => prev ? { ...prev, requirements: e.target.value } : null)}
                    placeholder="List required qualifications, skills, and experience"
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="skills">Skills (comma-separated)</Label>
                  <Input
                    id="skills"
                    value={skillsInput}
                    onChange={(e) => handleSkillsChange(e.target.value)}
                    placeholder="e.g., Administrative, Customer Service, Data Entry"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={jobData.category} onValueChange={(value) => setJobData(prev => prev ? { ...prev, category: value } : null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="jobType">Job Type *</Label>
                    <Select value={jobData.jobType} onValueChange={(value: any) => setJobData(prev => prev ? { ...prev, jobType: value } : null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select job type" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    <Select value={jobData.experienceLevel} onValueChange={(value: any) => setJobData(prev => prev ? { ...prev, experienceLevel: value } : null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPERIENCE_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={jobData.location}
                      onChange={(e) => setJobData(prev => prev ? { ...prev, location: e.target.value } : null)}
                      placeholder="Remote, City, State, etc."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compensation */}
            <Card>
              <CardHeader>
                <CardTitle>Compensation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="salaryType">Salary Type</Label>
                  <Select value={jobData.salaryType} onValueChange={(value: any) => setJobData(prev => prev ? { ...prev, salaryType: value } : null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select salary type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SALARY_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salaryMin">Minimum Salary</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      value={jobData.salaryMin}
                      onChange={(e) => setJobData(prev => prev ? { ...prev, salaryMin: parseInt(e.target.value) || 0 } : null)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salaryMax">Maximum Salary</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      value={jobData.salaryMax}
                      onChange={(e) => setJobData(prev => prev ? { ...prev, salaryMax: parseInt(e.target.value) || 0 } : null)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="benefits">Benefits</Label>
                  <Textarea
                    id="benefits"
                    value={jobData.benefits}
                    onChange={(e) => setJobData(prev => prev ? { ...prev, benefits: e.target.value } : null)}
                    placeholder="List any benefits, perks, or additional compensation"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="applicationDeadline">Application Deadline</Label>
                  <Input
                    id="applicationDeadline"
                    type="date"
                    value={jobData.applicationDeadline}
                    onChange={(e) => setJobData(prev => prev ? { ...prev, applicationDeadline: e.target.value } : null)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="website">Company Website</Label>
                  <Input
                    id="website"
                    value={jobData.website}
                    onChange={(e) => setJobData(prev => prev ? { ...prev, website: e.target.value } : null)}
                    placeholder="https://company.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={jobData.contactPhone}
                    onChange={(e) => setJobData(prev => prev ? { ...prev, contactPhone: e.target.value } : null)}
                    placeholder="Phone number for inquiries"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="isCompanyPrivate">Private Company</Label>
                    <p className="text-sm text-gray-600">Hide company name from job seekers</p>
                  </div>
                  <Switch
                    id="isCompanyPrivate"
                    checked={jobData.isCompanyPrivate}
                    onCheckedChange={(checked) => setJobData(prev => prev ? { ...prev, isCompanyPrivate: checked } : null)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Job Status */}
            <Card>
              <CardHeader>
                <CardTitle>Job Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Status</Label>
                  <div className="mt-2 space-y-2">
                    <div className={`p-2 rounded text-sm ${
                      jobData.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      jobData.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Job Status: {jobData.status}
                    </div>
                    <div className={`p-2 rounded text-sm ${
                      jobData.conciergeStatus === 'pending' ? 'bg-blue-100 text-blue-800' :
                      jobData.conciergeStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Concierge: {jobData.conciergeStatus.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push(`/admin/concierge/${jobId}`)}
                >
                  View Job Details
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push(`/admin/concierge/find-seekers?jobId=${jobId}`)}
                >
                  Find Seekers
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}