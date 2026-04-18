'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CompanyLogo } from '@/components/common/CompanyLogo';
import ConciergeChat from '@/components/common/ConciergeChat';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  MessageSquare,
  Users,
  Building2,
  Calendar,
  Clock,
  Search,
  UserPlus,
  FileText,
  Star
} from '@/components/icons';

interface JobDetails {
  id: string;
  title: string;
  description?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  status: string;
  employerId: string;
  companyName?: string;
  companyLogoUrl?: string;
  conciergeRequested: boolean;
  conciergeStatus: string;
  applicantsVisibleToEmployer: boolean;
  chatEnabled: boolean;
  createdAt: string;
  conciergePackageType?: string;
  applications?: Array<{
    id: string;
    status: string;
    createdAt: string;
    seeker: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
}

interface ChatData {
  id: string;
  jobId: string;
  employerId: string;
  adminId?: string;
  status: 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  jobTitle?: string;
  companyName?: string;
  employerName?: string;
  companyLogoUrl?: string;
}

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderType: 'admin' | 'employer';
  message: string;
  messageType: 'text' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  readAt?: Date;
  createdAt: Date;
  senderName?: string;
  senderAvatar?: string;
}

interface Seeker {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profile?: {
    currentTitle?: string;
    headline?: string;
  };
  skills?: string[];
  profilePictureUrl?: string;
  hasApplied?: boolean;
}

interface SeekerNote {
  id: string;
  seekerId: string;
  note: string;
  createdAt: string;
  adminName: string;
}

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  discovery_call: { color: 'bg-blue-100 text-blue-800', label: 'Discovery Call' },
  job_optimization: { color: 'bg-purple-100 text-purple-800', label: 'Job Optimization' },
  candidate_screening: { color: 'bg-orange-100 text-orange-800', label: 'Screening' },
  interviews: { color: 'bg-indigo-100 text-indigo-800', label: 'Interviews' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' }
};

export default function AdminConciergeJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  // Seeker management state
  const [showSeekerSearch, setShowSeekerSearch] = useState(false);
  const [showSeekerNotes, setShowSeekerNotes] = useState(false);
  const [selectedSeeker, setSelectedSeeker] = useState<Seeker | null>(null);
  const [seekerNotes, setSeekerNotes] = useState('');
  const [seekerSearchQuery, setSeekerSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Seeker[]>([]);
  const [invitedSeekers, setInvitedSeekers] = useState<Seeker[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    if (jobId) {
      loadData();
    }
  }, [jobId]);

  const loadData = async () => {
    try {
      // Load current user first
      await loadCurrentUser();
      // Then load job details
      await loadJobDetails();
      // Load selected seekers from database
      await loadSelectedSeekers();
      // Finally load chat data (which may depend on job details)
      await loadChatData();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.profile.id);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  // Search for seekers when query changes
  useEffect(() => {
    if (seekerSearchQuery.length > 2) {
      searchSeekers(seekerSearchQuery);
    } else {
      setSearchResults([]);
    }
  }, [seekerSearchQuery]);

  const loadJobDetails = async () => {
    try {
      // Use admin concierge API that returns complete job + concierge data
      const response = await fetch(`/api/admin/concierge/${jobId}`);

      if (response.ok) {
        const data = await response.json();

        // The enhanced admin concierge API returns complete job details
        const jobDetails: JobDetails = {
          id: jobId,
          title: data.jobTitle || 'Concierge Job',
          description: data.jobDescription || data.description || 'Job managed through concierge service',
          location: data.location,
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          status: data.jobStatus || 'active',
          employerId: data.employerId,
          companyName: data.companyName || 'Company',
          companyLogoUrl: data.companyLogoUrl,
          conciergeRequested: true,
          conciergeStatus: data.status || 'pending',
          applicantsVisibleToEmployer: data.applicantsVisibleToEmployer || false,
          chatEnabled: data.chatEnabled || true,
          createdAt: data.createdAt,
          conciergePackageType: data.conciergePackageType,
          applications: data.applications || []
        };

        setJobDetails(jobDetails);
      } else if (response.status === 404) {
        console.error('Concierge request not found for job:', jobId);
      }
    } catch (error) {
      console.error('Error loading concierge details:', error);
    }
  };

  const loadSelectedSeekers = async () => {
    try {
      const response = await fetch(`/api/admin/concierge/${jobId}/selected-seekers`);
      if (response.ok) {
        const data = await response.json();
        setInvitedSeekers(data.selectedSeekers || []);
      }
    } catch (error) {
      console.error('Error loading selected seekers:', error);
    }
  };

  const loadChatData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/concierge/${jobId}/chat/messages`);

      if (response.ok) {
        const data = await response.json();
        setChatData(data.chat);
        setMessages(data.messages || []);
      } else if (response.status === 404) {
        // Chat doesn't exist yet, create a placeholder
        setChatData({
          id: 'pending',
          jobId,
          employerId: jobDetails?.employerId || '',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          jobTitle: jobDetails?.title,
          companyName: jobDetails?.companyName
        });
        setMessages([]);
      } else {
        console.error('Failed to load chat data:', response.status, response.statusText);
        // Still create placeholder for error cases so chat UI shows
        setChatData({
          id: 'pending',
          jobId,
          employerId: jobDetails?.employerId || '',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          jobTitle: jobDetails?.title || 'Concierge Job',
          companyName: jobDetails?.companyName || 'Company'
        });
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading chat data:', error);
      // Create fallback placeholder so chat UI still shows
      setChatData({
        id: 'pending',
        jobId,
        employerId: '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        jobTitle: 'Concierge Job',
        companyName: 'Company'
      });
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    console.log('🔍 FRONTEND: Attempting to send message:', { message, jobId, currentUserId });

    try {
      const response = await fetch(`/api/admin/concierge/${jobId}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      console.log('🔍 FRONTEND: API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 FRONTEND: Message sent successfully:', data.message);
        setMessages(prev => [...prev, data.message]);
      } else {
        const errorData = await response.json();
        console.error('🔍 FRONTEND: API error response:', errorData);
        alert(`Failed to send message: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🔍 FRONTEND: Error sending message:', error);
      alert('Network error: Failed to send message');
      throw error;
    }
  };

  const handleToggleApplicantVisibility = async (visible: boolean) => {
    setIsTogglingVisibility(true);
    try {
      const response = await fetch(`/api/admin/concierge/${jobId}/visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ visible })
      });

      if (response.ok) {
        setJobDetails(prev => prev ? {
          ...prev,
          applicantsVisibleToEmployer: visible
        } : null);
      }
    } catch (error) {
      console.error('Error toggling applicant visibility:', error);
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const searchSeekers = async (query: string) => {
    try {
      const response = await fetch(`/api/admin/seekers/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.seekers || []);
      }
    } catch (error) {
      console.error('Error searching seekers:', error);
    }
  };

  const inviteSeeker = async (seeker: Seeker) => {
    try {
      const response = await fetch(`/api/admin/concierge/${jobId}/invite-seeker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ seekerId: seeker.id })
      });

      if (response.ok) {
        setInvitedSeekers(prev => [...prev, seeker]);
        // TODO: Show success message
      }
    } catch (error) {
      console.error('Error inviting seeker:', error);
    }
  };

  const saveSeekerNotes = async () => {
    if (!selectedSeeker || !seekerNotes.trim()) return;

    try {
      const response = await fetch(`/api/admin/concierge/${jobId}/seeker-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          seekerId: selectedSeeker.id,
          note: seekerNotes.trim()
        })
      });

      if (response.ok) {
        setShowSeekerNotes(false);
        setSelectedSeeker(null);
        setSeekerNotes('');
        // TODO: Show success message
      }
    } catch (error) {
      console.error('Error saving seeker notes:', error);
    }
  };

  const handleOpenSeekerChat = async (seeker: Seeker) => {
    try {
      // First check if a chat already exists for this job-seeker combination
      const checkResponse = await fetch(`/api/admin/concierge/seekers/chat-exists?jobId=${jobId}&seekerId=${seeker.id}`);

      if (checkResponse.ok) {
        const existingChat = await checkResponse.json();
        if (existingChat.exists && existingChat.chatRoomId) {
          // Chat exists, redirect to centralized chat with thread opened
          router.push(`/admin/concierge/chat/seekers?threadId=${existingChat.chatRoomId}`);
          return;
        }
      }

      // If no existing chat, create one
      const response = await fetch(`/api/admin/concierge/${jobId}/invite-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seekerId: seeker.id,
          message: `Hello ${seeker.firstName}! Let's discuss this opportunity through our concierge service.`,
          tags: []
        })
      });

      if (response.ok) {
        const chatData = await response.json();
        if (chatData && chatData.chatRoomId) {
          // Redirect to centralized chat with the new thread opened
          router.push(`/admin/concierge/chat/seekers?threadId=${chatData.chatRoomId}`);
        } else {
          // Fallback to centralized chat without specific thread
          router.push('/admin/concierge/chat/seekers');
        }
      } else {
        console.error('Failed to create chat:', response.status);
        // Fallback to centralized chat page
        router.push('/admin/concierge/chat/seekers');
      }
    } catch (error) {
      console.error('Error opening seeker chat:', error);
      // Fallback to centralized chat page
      router.push('/admin/concierge/chat/seekers');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!jobDetails) {
    return (
      <div className="text-center py-8">
        <p>Job not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <a href="/admin/concierge">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Concierge
          </a>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Concierge Job Details</h1>
          <p className="text-gray-600">Manage concierge service for this job</p>
        </div>
      </div>

      {/* Job Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <CompanyLogo
                companyName={jobDetails.companyName || 'Company'}
                companyLogoUrl={jobDetails.companyLogoUrl}
                size="lg"
              />
              <div>
                <CardTitle className="text-xl">{jobDetails.title}</CardTitle>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                  <span className="flex items-center">
                    <Building2 className="h-4 w-4 mr-1" />
                    {jobDetails.companyName}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Created {new Date(jobDetails.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <Badge className={statusConfig[jobDetails.conciergeStatus as keyof typeof statusConfig]?.color}>
              {statusConfig[jobDetails.conciergeStatus as keyof typeof statusConfig]?.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Information</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Location:</span>
                  <p className="text-gray-900 mt-1">{jobDetails.location || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Salary Range:</span>
                  <p className="text-gray-900 mt-1">
                    {jobDetails.salaryMin && jobDetails.salaryMax
                      ? `$${jobDetails.salaryMin?.toLocaleString()} - $${jobDetails.salaryMax?.toLocaleString()}`
                      : 'Not specified'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${jobDetails.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : jobDetails.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                      }`}>
                      {jobDetails.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Description:</span>
                  <div className="mt-1 max-h-32 overflow-y-auto">
                    <p className="text-gray-900 text-sm whitespace-pre-wrap">
                      {jobDetails.description || 'No description available'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seeker Management */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Seeker Management</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.location.href = `/admin/concierge/${jobId}/edit`}
                    className="bg-purple-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    Edit Job Post
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Applied Seekers</h4>
                  {jobDetails?.applications && jobDetails.applications.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {jobDetails.applications.slice(0, 5).map((application: any) => (
                        <div key={application.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {application.seeker?.firstName} {application.seeker?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Applied {new Date(application.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              application.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                                application.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>
                              {application.status}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedSeeker(application.seeker);
                                setShowSeekerNotes(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Notes
                            </button>
                          </div>
                        </div>
                      ))}
                      {jobDetails.applications.length > 5 && (
                        <p className="text-xs text-gray-500 text-center">
                          ...and {jobDetails.applications.length - 5} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No applications yet</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Invited Seekers</h4>
                  {invitedSeekers.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {invitedSeekers.map((seeker: any) => (
                        <div key={seeker.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {seeker.firstName} {seeker.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {seeker.email}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedSeeker(seeker);
                              setShowSeekerNotes(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Notes
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No seekers invited yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applicant Visibility Toggle - Conditionally rendered based on package type */}
        {jobDetails.conciergePackageType !== 'concierge_lite' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Applicant Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show applicants to employer</p>
                  <p className="text-sm text-gray-600">
                    Allow the employer to view and contact applicants directly
                  </p>
                </div>
                <Switch
                  checked={jobDetails.applicantsVisibleToEmployer}
                  onCheckedChange={handleToggleApplicantVisibility}
                  disabled={isTogglingVisibility}
                />
              </div>

              <div className="flex items-center space-x-2 text-sm">
                {jobDetails.applicantsVisibleToEmployer ? (
                  <>
                    <Eye className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Applicants are visible to employer</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-600">Applicants are hidden from employer</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Package Information Card - Show package type info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2" />
              Concierge Package
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="font-medium">Package Type</p>
                <p className="text-sm text-gray-600">
                  {jobDetails.conciergePackageType === 'concierge_lite' && 'ampertalent Concierge LITE ($795) - Legacy'}
                  {jobDetails.conciergePackageType === 'concierge_level_1' && 'Concierge Level I ($1,695)'}
                  {jobDetails.conciergePackageType === 'concierge_level_2' && 'Concierge Level II ($2,695)'}
                  {jobDetails.conciergePackageType === 'concierge_level_3' && 'Concierge Level III ($3,995)'}
                  {!jobDetails.conciergePackageType && 'Package information unavailable'}
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                <p className="text-sm font-medium text-blue-800">Business Rules:</p>
                <div className="text-xs text-blue-700 mt-1">
                  {jobDetails.conciergePackageType === 'concierge_lite' && (
                    <>
                      <p>• Employer always sees all applicants</p>
                      <p>• Functions like normal job posts</p>
                      <p>• No visibility toggle needed</p>
                    </>
                  )}
                  {(jobDetails.conciergePackageType === 'concierge_level_1' || jobDetails.conciergePackageType === 'concierge_level_2' || jobDetails.conciergePackageType === 'concierge_level_3') && (
                    <>
                      <p>• Employer only sees concierge-selected candidates</p>
                      <p>• Toggle above overrides this behavior</p>
                      <p>• Full concierge management required</p>
                    </>
                  )}
                  {!jobDetails.conciergePackageType && (
                    <p>• Unable to determine package rules</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Seekers Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="h-5 w-5 mr-2" />
              Selected Seekers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Manage seekers you've selected for this concierge position
            </div>

            {invitedSeekers.length > 0 ? (
              <div className="space-y-3">
                {invitedSeekers.map((seeker: any) => (
                  <div key={seeker.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {seeker.firstName} {seeker.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{seeker.email}</p>
                      {seeker.profile?.currentTitle && (
                        <p className="text-xs text-gray-500">{seeker.profile.currentTitle}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedSeeker(seeker);
                          setShowSeekerNotes(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 rounded-md border border-blue-300 hover:bg-blue-50"
                      >
                        Notes
                      </button>
                      <button
                        onClick={() => handleOpenSeekerChat(seeker)}
                        className="text-green-600 hover:text-green-800 text-sm px-3 py-1 rounded-md border border-green-300 hover:bg-green-50"
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <UserPlus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No seekers selected yet</p>
                <button
                  onClick={() => window.location.href = `/admin/concierge/find-seekers?jobId=${jobId}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Find & Select Seekers
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface - Always show */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Concierge Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {chatData ? (
            <ConciergeChat
              chatData={chatData}
              messages={messages}
              currentUserType="admin"
              currentUserId={currentUserId}
              onSendMessage={handleSendMessage}
              className="border-0 shadow-none"
            />
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Chat...</h3>
                <p className="text-gray-600">Setting up your concierge chat interface</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seeker Search Modal */}
      {showSeekerSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Search and Invite Seekers</h3>
              <button
                onClick={() => setShowSeekerSearch(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search seekers by name, email, skills..."
                value={seekerSearchQuery}
                onChange={(e) => setSeekerSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((seeker: any) => (
                <div key={seeker.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {seeker.firstName} {seeker.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{seeker.email}</p>
                        {seeker.profile?.currentTitle && (
                          <p className="text-xs text-gray-600">{seeker.profile.currentTitle}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => inviteSeeker(seeker)}
                    disabled={invitedSeekers.some(invited => invited.id === seeker.id)}
                    className={`px-3 py-1 text-sm rounded-md ${invitedSeekers.some(invited => invited.id === seeker.id)
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                  >
                    {invitedSeekers.some(invited => invited.id === seeker.id) ? 'Invited' : 'Invite'}
                  </button>
                </div>
              ))}
              {seekerSearchQuery && searchResults.length === 0 && (
                <p className="text-center text-gray-500 py-8">No seekers found matching your search.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Seeker Notes Modal */}
      {showSeekerNotes && selectedSeeker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Admin Notes - {selectedSeeker.firstName} {selectedSeeker.lastName}
              </h3>
              <button
                onClick={() => {
                  setShowSeekerNotes(false);
                  setSelectedSeeker(null);
                  setSeekerNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Internal Notes (visible only to admins)
              </label>
              <textarea
                value={seekerNotes}
                onChange={(e) => setSeekerNotes(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add notes about this seeker's qualifications, interview feedback, etc..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSeekerNotes(false);
                  setSelectedSeeker(null);
                  setSeekerNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={saveSeekerNotes}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}