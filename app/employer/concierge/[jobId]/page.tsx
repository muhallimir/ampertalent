'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import ConciergeChat from '@/components/common/ConciergeChat';
import {
  ArrowLeft,
  MessageSquare,
  Users,
  Building2,
  Calendar,
  User,
  Clock,
  Info
} from '@/components/icons';
import { CompanyLogo } from '@/components/common/CompanyLogo';
import { ConciergeProfilePicture } from '@/components/common/ConciergeProfilePicture';
import { getWithImpersonation, postWithImpersonation } from '@/lib/api-client';

interface JobDetails {
  id: string;
  title: string;
  description: string;
  employerId: string;
  companyName?: string;
  companyLogoUrl?: string;
  conciergeRequested: boolean;
  conciergeStatus: string;
  applicantsVisibleToEmployer: boolean;
  chatEnabled: boolean;
  createdAt: string;
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
  // Concierge information
  conciergeName?: string;
  conciergePicture?: string;
  conciergeTitle?: string;
  conciergeBio?: string;
  conciergeSpecialties?: string[];
  conciergeExperience?: number;
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

export default function EmployerConciergeJobPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBioModal, setShowBioModal] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadCurrentUser();
      loadJobDetails();
      loadChatData();
    }
  }, [jobId]);

  // Real-time chat updates - poll every 5 seconds (silent updates)
  useEffect(() => {
    if (!jobId) return;

    const pollInterval = setInterval(() => {
      loadChatData(true); // Silent update - no loading spinner
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [jobId]);

  const loadCurrentUser = async () => {
    try {
      const response = await getWithImpersonation('/api/user/profile');
      if (response.ok) {
        const userData = await response.json();
        setCurrentUserId(userData.id);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadJobDetails = async () => {
    try {
      const response = await getWithImpersonation(`/api/employer/jobs/${jobId}`);

      if (response.ok) {
        const data = await response.json();

        // Transform API response to match component interface
        const transformedJob: JobDetails = {
          id: data.job.id,
          title: data.job.title,
          description: data.job.description,
          employerId: data.job.employerId || '',
          companyName: data.job.employer?.companyName,
          companyLogoUrl: data.job.employer?.companyLogoUrl,
          conciergeRequested: data.job.conciergeRequested,
          conciergeStatus: data.job.conciergeStatus,
          applicantsVisibleToEmployer: data.job.applicantsVisibleToEmployer || false,
          chatEnabled: data.job.chatEnabled,
          createdAt: data.job.createdAt
        };

        setJobDetails(transformedJob);
      } else {
        console.error('Failed to load job details:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading job details:', error);
    }
  };

  const loadChatData = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      const response = await getWithImpersonation(`/api/employer/jobs/${jobId}/concierge/chat/messages`);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 CHAT DATA DEBUG:', {
          conciergeName: data.chat?.conciergeName,
          conciergePicture: data.chat?.conciergePicture,
          adminId: data.chat?.adminId
        });
        setChatData(data.chat);
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const handleSendMessage = async (message: string) => {
    try {
      const response = await postWithImpersonation(`/api/employer/jobs/${jobId}/concierge/chat/messages`, { message });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        // Immediately refresh to get any other new messages
        setTimeout(() => loadChatData(true), 500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <a href="/employer/jobs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </a>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Concierge Support</h1>
          <p className="text-gray-600">Chat with your concierge team</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
        {/* Left Column - Chat */}
        <div className="lg:col-span-3">
          {chatData ? (
            <div className="relative">
              {/* Floating Concierge Info Header */}
              {chatData.conciergeName && (
                <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-2">
                    {chatData.adminId ? (
                      <ConciergeProfilePicture
                        conciergeId={chatData.adminId}
                        conciergeName={chatData.conciergeName}
                        size="sm"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-xs">
                          {(chatData.conciergeName || 'C').charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-medium text-gray-900">{chatData.conciergeName}</span>
                      {chatData.conciergeTitle && (
                        <p className="text-xs text-gray-500">{chatData.conciergeTitle}</p>
                      )}
                    </div>
                    {chatData.conciergeBio && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBioModal(true)}
                        className="p-1 h-6 w-6"
                      >
                        <Info className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <ConciergeChat
                chatData={chatData}
                messages={messages}
                currentUserType="employer"
                currentUserId={currentUserId || ""}
                onSendMessage={handleSendMessage}
                className="h-[600px]"
              />
            </div>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat Not Available</h3>
                <p className="text-gray-600">
                  Your concierge chat will be available once your service begins.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar - Compact Job Details */}
        <div className="lg:col-span-1 space-y-4">
          {/* Job Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="font-semibold mb-2">{jobDetails.title}</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Building2 className="h-3 w-3 mr-2" />
                    {jobDetails.companyName}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-2" />
                    Posted {new Date(jobDetails.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t">
                <h4 className="font-semibold mb-1 text-sm">Status</h4>
                <p className="text-sm text-gray-700 capitalize">
                  {jobDetails.conciergeStatus.replace('_', ' ')}
                </p>
              </div>

              <div className="pt-3 border-t">
                <h4 className="font-semibold mb-1 text-sm">Support Includes</h4>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  <li>• Job optimization</li>
                  <li>• Candidate screening</li>
                  <li>• Interview coordination</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bio Modal */}
      {showBioModal && chatData?.conciergeBio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {chatData.adminId ? (
                    <ConciergeProfilePicture
                      conciergeId={chatData.adminId}
                      conciergeName={chatData.conciergeName || 'Concierge'}
                      size="lg"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-lg">
                        {(chatData.conciergeName || 'C').charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-semibold">{chatData.conciergeName}</h2>
                    {chatData.conciergeTitle && (
                      <p className="text-gray-600">{chatData.conciergeTitle}</p>
                    )}
                    {chatData.conciergeExperience && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{chatData.conciergeExperience} years in recruiting</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBioModal(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-gray-700 leading-relaxed">{chatData.conciergeBio}</p>
                </div>

                {chatData.conciergeSpecialties && chatData.conciergeSpecialties.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                      {chatData.conciergeSpecialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-teal-100 text-teal-800"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}