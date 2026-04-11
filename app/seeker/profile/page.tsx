'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProfileForm } from '@/components/seeker/ProfileForm';
import { ResumeUpload } from '@/components/seeker/ResumeUpload';
import { ProfilePictureUpload } from '@/components/common/ProfilePictureUpload';
import { CoverLetterTemplates } from '@/components/seeker/CoverLetterTemplates';
import { ResumeInUseDialog } from '@/components/seeker/ResumeInUseDialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/ui/toast';
import { getImpersonationSession } from '@/lib/admin-impersonation';
import {
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Camera,
  Mail,
} from 'lucide-react';

interface ProfileData {
  firstName?: string;
  lastName?: string;
  headline?: string;
  aboutMe?: string;
  professionalSummary?: string;
  availability?: string;
  salaryExpectations?: string;
  skills?: string[];
  portfolioUrls?: string[];
  timezone?: string;
  resumeUrl?: string;
  resumeLastUploaded?: string;
  name?: string;
  profilePictureUrl?: string;
  workExperience?: string;
  education?: any[];
}

export default function SeekerProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showResumeInUseDialog, setShowResumeInUseDialog] = useState(false);
  const [resumeInUseJobs, setResumeInUseJobs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('picture');
  const { addToast } = useToast();

  // Get search params from URL using Next.js hook
  const searchParams = useSearchParams();

  // Helper function to get impersonation headers
  const getHeaders = () => {
    const headers: HeadersInit = {};

    if (typeof window !== 'undefined') {
      const impersonationSession = getImpersonationSession();
      if (impersonationSession) {
        console.log(
          '🎭 FRONTEND: Adding impersonation headers to seeker profile request',
          {
            impersonatedUserId: impersonationSession.impersonatedUser.id,
            adminId: impersonationSession.adminId,
          }
        );
        headers['x-impersonated-user-id'] =
          impersonationSession.impersonatedUser.id;
        headers['x-admin-user-id'] = impersonationSession.adminId;
      }
    }

    return headers;
  };

  // Set initial tab from URL parameter
  useEffect(() => {
    if (searchParams) {
      const tabParam = searchParams.get('tab');
      console.log('Tab parameter from URL:', tabParam);
      if (tabParam && ['picture', 'profile', 'resume', 'cover-letters'].includes(tabParam)) {
        console.log('Setting active tab to:', tabParam);
        setActiveTab(tabParam);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Fetch seeker profile using the seeker-specific API
        const response = await fetch('/api/seeker/profile', {
          headers: getHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Raw API response:', data);

          // Transform the data to match our ProfileData interface
          const profile = data.profile;
          if (profile) {
            setProfileData({
              firstName: profile.firstName || '',
              lastName: profile.lastName || '',
              headline: profile.headline || '',
              aboutMe: profile.aboutMe || '',
              professionalSummary: profile.professionalSummary || '',
              availability: profile.availability || '',
              salaryExpectations: profile.salaryExpectations || '',
              skills: profile.skills || [],
              portfolioUrls: profile.portfolioUrls || [],
              timezone: profile.timezone || 'America/Chicago',
              resumeUrl: profile.resumeUrl || '',
              resumeLastUploaded: profile.resumeLastUploaded || '',
              name: profile.name || '',
              profilePictureUrl: profile.profilePictureUrl || '',
              workExperience: profile.workExperience || '',
              education: profile.education || [],
            });
          } else {
            // If no profile exists, set empty defaults
            setProfileData({
              firstName: '',
              lastName: '',
              headline: '',
              aboutMe: '',
              professionalSummary: '',
              availability: '',
              salaryExpectations: '',
              skills: [],
              portfolioUrls: [],
              timezone: 'America/Chicago',
              resumeUrl: '',
              workExperience: '',
              education: [],
            });
          }
        } else {
          // If no profile exists, set empty defaults
          setProfileData({
            firstName: '',
            lastName: '',
            headline: '',
            aboutMe: '',
            availability: '',
            salaryExpectations: '',
            skills: [],
            portfolioUrls: [],
            timezone: 'America/Chicago',
            resumeUrl: '',
            workExperience: '',
            education: [],
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Set defaults on error
        setProfileData({
          firstName: '',
          lastName: '',
          headline: '',
          aboutMe: '',
          professionalSummary: '',
          availability: '',
          salaryExpectations: '',
          skills: [],
          portfolioUrls: [],
          timezone: 'America/Chicago',
          resumeUrl: '',
          workExperience: '',
          education: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleProfileSubmit = async (data: ProfileData) => {
    setIsSaving(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...getHeaders(),
      };

      const response = await fetch('/api/seeker/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      const result = await response.json();
      setProfileData(result.profile);

      // Dispatch profile update event if requested by API
      if (result.dispatchEvent === 'userProfileUpdated') {
        window.dispatchEvent(new CustomEvent('userProfileUpdated'));
      }

      // Show success message
      addToast({
        title: 'Success!',
        description: 'Profile saved successfully!',
        variant: 'success',
        duration: 4000,
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      addToast({
        title: 'Error',
        description: 'Error saving profile. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumeUploadComplete = async (resumeUrl: string) => {
    // Update local state first for immediate UI feedback
    setProfileData((prev) => ({
      ...prev,
      resumeUrl,
      resumeLastUploaded: new Date().toISOString(),
    }));

    // Save to database to ensure resumeUrl is persisted
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...getHeaders(), // Include impersonation headers if needed
      };

      const response = await fetch('/api/seeker/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          resumeUrl,
          resumeLastUploaded: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save resume URL');
      }

      const result = await response.json();
      // Update state with server response to ensure consistency
      setProfileData(prev => ({
        ...prev,
        ...result.profile
      }));

      addToast({
        title: 'Success!',
        description: 'Resume uploaded and saved successfully!',
        variant: 'success',
        duration: 4000,
      });
    } catch (error) {
      console.error('Error saving resume URL:', error);
      addToast({
        title: 'Error',
        description: 'Resume was uploaded but failed to save. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  // Add a function to refresh profile data
  const refreshProfile = async () => {
    try {
      const response = await fetch('/api/seeker/profile', {
        headers: getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const profile = data.profile;
        if (profile) {
          setProfileData({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            headline: profile.headline || '',
            aboutMe: profile.aboutMe || '',
            professionalSummary: profile.professionalSummary || '',
            availability: profile.availability || '',
            salaryExpectations: profile.salaryExpectations || '',
            skills: profile.skills || [],
            portfolioUrls: profile.portfolioUrls || [],
            timezone: profile.timezone || 'America/Chicago',
            resumeUrl: profile.resumeUrl || '',
            resumeLastUploaded: profile.resumeLastUploaded || '',
            name: profile.name || '',
            profilePictureUrl: profile.profilePictureUrl || '',
            workExperience: profile.workExperience || '',
            education: profile.education || [],
          });
        }
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  // Poll for profile updates every 10 seconds only when on resume tab
  useEffect(() => {
    if (activeTab === 'resume') {
      const interval = setInterval(refreshProfile, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleResumeDelete = async () => {
    try {
      console.log('Deleting resume');

      const headers = {
        ...getHeaders(),
      };

      const response = await fetch('/api/seeker/resume/delete', {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle resume in use error specially
        if (errorData.error === 'RESUME_IN_USE') {
          const jobsAppliedTo = errorData.jobsAppliedTo || [];
          setResumeInUseJobs(jobsAppliedTo);
          setShowResumeInUseDialog(true);
          return;
        }

        throw new Error(errorData.error || 'Failed to delete resume');
      }

      // Update local state immediately
      setProfileData((prev) => ({
        ...prev,
        resumeUrl: undefined,
        resumeLastUploaded: undefined,
      }));

      // Refresh profile data from server to ensure consistency
      setTimeout(() => {
        refreshProfile();
      }, 1000);

      addToast({
        title: 'Success!',
        description: 'Resume deleted successfully!',
        variant: 'success',
        duration: 4000,
      });
    } catch (error) {
      console.error('Error deleting resume:', error);
      addToast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Error deleting resume. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const handleProfilePictureUpdate = (newUrl: string | null) => {
    setProfileData((prev) => ({
      ...prev,
      profilePictureUrl: newUrl || undefined,
    }));
  };

  const getProfileCompletionPercentage = () => {
    if (!profileData) return 0;

    const fields = [
      profileData.firstName,
      profileData.lastName,
      profileData.headline,
      profileData.aboutMe,
      profileData.availability,
      profileData.salaryExpectations,
      profileData.skills?.length,
      profileData.resumeUrl,
    ];

    const completedFields = fields.filter(
      (field) => field && (typeof field === 'string' ? field.trim() : field > 0)
    ).length;

    return Math.round((completedFields / fields.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const completionPercentage = getProfileCompletionPercentage();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-2">
          Complete your profile to attract the best job opportunities
        </p>
      </div>

      {/* Profile Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {completionPercentage === 100 ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            <span>Profile Completion</span>
          </CardTitle>
          <CardDescription>
            {completionPercentage === 100
              ? "Your profile is complete! You're ready to apply for jobs."
              : `Your profile is ${completionPercentage}% complete. Complete all sections to maximize your visibility.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {completionPercentage}% complete
          </p>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs value={activeTab} defaultValue="picture" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="picture" className="flex items-center space-x-2">
            <Camera className="h-4 w-4" />
            <span>Profile Picture</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile Information</span>
          </TabsTrigger>
          <TabsTrigger value="resume" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Resume</span>
          </TabsTrigger>
          <TabsTrigger
            value="cover-letters"
            className="flex items-center space-x-2"
          >
            <Mail className="h-4 w-4" />
            <span>Cover Letter Templates</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="picture">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>
                Upload a professional photo to help employers recognize you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfilePictureUpload
                currentImageUrl={profileData?.profilePictureUrl}
                onImageUpdate={handleProfilePictureUpdate}
                userName={
                  `${profileData?.firstName || ''} ${profileData?.lastName || ''
                    }`.trim() ||
                  profileData?.name ||
                  'User'
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Tell employers about your skills, experience, and availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                initialData={profileData || undefined}
                onSubmit={handleProfileSubmit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resume">
          <Card>
            <CardHeader>
              <CardTitle>Resume</CardTitle>
              <CardDescription>
                Upload your resume to make it easy for employers to learn about
                your experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResumeUpload onShowToast={addToast} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cover-letters">
          <Card>
            <CardHeader>
              <CardTitle>Cover Letter Templates</CardTitle>
              <CardDescription>
                Create and manage reusable cover letter templates for your job
                applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CoverLetterTemplates />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Profile Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Tips</CardTitle>
          <CardDescription>
            Make your profile stand out to employers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div>
                <p className="font-medium">Write a compelling headline</p>
                <p className="text-sm text-gray-600">
                  Include your role, years of experience, and key skills
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div>
                <p className="font-medium">Highlight remote work experience</p>
                <p className="text-sm text-gray-600">
                  Mention your experience working remotely and your home office
                  setup
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div>
                <p className="font-medium">Be specific about availability</p>
                <p className="text-sm text-gray-600">
                  Clearly state your preferred hours and timezone
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div>
                <p className="font-medium">Keep your resume updated</p>
                <p className="text-sm text-gray-600">
                  Upload a current resume that highlights your remote work
                  skills
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resume In Use Dialog */}
      <ResumeInUseDialog
        isOpen={showResumeInUseDialog}
        onClose={() => setShowResumeInUseDialog(false)}
        jobsAppliedTo={resumeInUseJobs}
      />
    </div>
  );
}
