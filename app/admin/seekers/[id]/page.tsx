'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Users,
  FileText,
  Mail,
  Phone,
  MapPin,
  Star,
  MessageSquare,
  Eye,
  Calendar,
  Tag,
  Download,
  DollarSign,
  Briefcase,
  UserPlus,
  X,
  Edit,
  Trash2,
  Save,
  Clock,
  ShoppingCart
} from '@/components/icons';

interface Resume {
  id: string;
  filename: string;
  fileUrl: string;
  isPrimary: boolean;
  uploadedAt: string;
  fileSize?: number;
}

interface CoverLetterTemplate {
  id: string;
  title: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SeekerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePictureUrl?: string;
  headline?: string;
  aboutMe?: string; // Bio field
  skills: string[];
  membershipPlan: string;
  membershipExpiresAt?: string;
  cancelledAt?: string;
  pendingSignup?: { createdAt: string; selectedPlan: string } | null;
  availability?: string;
  salaryExpectations?: string;
  workExperience?: string; // Could be JSON string
  portfolioUrls?: string[];
  resumeUrl?: string; // Legacy field for backward compatibility
  resumes?: Resume[]; // New resumes array
  coverLetterTemplates?: CoverLetterTemplate[]; // Cover letter templates
  createdAt: string;
  applicationCount: number;
  tags?: string[];
  isSuspended?: boolean;
}

interface SeekerNote {
  id: string;
  note: string;
  createdAt: string;
  adminName: string;
  adminId: string;
}

interface Application {
  id: string;
  status: string;
  appliedAt: string;
  job: {
    id: string;
    title: string;
    company: string;
    employerId: string;
  };
}

interface ConciergeJob {
  id: string;
  title: string;
  companyName: string;
  status: string;
  createdAt: string;
}

interface ConciergeInvitation {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: string;
  invitedAt: string;
  lastActivity?: string;
  hasMessages: boolean;
  messageCount: number;
}

const DEFAULT_TAGS = [
  'Concierge Candidate',
  'High Priority',
  'Interview Ready',
  'Top Performer',
  'Previous Client',
  'Highly Recommended',
  'Quick Responder',
  'Remote Expert'
];

// Helper function to truncate email addresses
const truncateEmail = (email: string, maxLength: number = 25) => {
  if (email.length <= maxLength) {
    return email;
  }

  const [localPart, domain] = email.split('@');

  // If domain is too long, truncate it
  if (domain.length > maxLength / 2) {
    const truncatedDomain = domain.slice(0, Math.floor(maxLength / 2) - 3) + '...';
    return `${localPart}@${truncatedDomain}`;
  }

  // If local part is too long, truncate it
  const availableLength = maxLength - domain.length - 1; // -1 for @ symbol
  if (localPart.length > availableLength) {
    const truncatedLocal = localPart.slice(0, availableLength - 3) + '...';
    return `${truncatedLocal}@${domain}`;
  }

  return email;
};

export default function SeekerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const seekerId = params.id as string;

  const [seeker, setSeeker] = useState<SeekerProfile | null>(null);
  const [notes, setNotes] = useState<SeekerNote[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [conciergeInvitations, setConciergeInvitations] = useState<ConciergeInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Concierge job selection state
  const [showJobSelectionModal, setShowJobSelectionModal] = useState(false);
  const [conciergeJobs, setConciergeJobs] = useState<ConciergeJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobSelectionMode, setJobSelectionMode] = useState<'add' | 'chat'>('add');

  // Cover letter modal state
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState<CoverLetterTemplate | null>(null);

  useEffect(() => {
    if (seekerId) {
      loadSeekerProfile();
      loadSeekerNotes();
      loadSeekerApplications();
      loadConciergeInvitations();
    }
  }, [seekerId]);

  const loadSeekerProfile = async () => {
    try {
      const response = await fetch(`/api/admin/seekers/${seekerId}`);
      if (response.ok) {
        const data = await response.json();
        const s = data.seeker;
        // Normalize: flatten nested `user` fields and map API shape to SeekerProfile
        const normalized = {
          ...s,
          // Flatten user fields onto the top level
          id: s.user?.id ?? s.userId,
          firstName: s.user?.firstName ?? '',
          lastName: s.user?.lastName ?? '',
          email: s.user?.email ?? '',
          phone: s.user?.phone ?? s.phone,
          profilePictureUrl: s.user?.profilePictureUrl ?? s.profilePictureUrl,
          // Map _count to applicationCount
          applicationCount: s._count?.applications ?? 0,
          // Coerce nullable arrays to safe empty arrays
          skills: Array.isArray(s.skills) ? s.skills : [],
          portfolioUrls: Array.isArray(s.portfolioUrls) ? s.portfolioUrls : [],
          resumes: Array.isArray(s.resumes) ? s.resumes : [],
          coverLetterTemplates: Array.isArray(s.coverLetterTemplates) ? s.coverLetterTemplates : [],
          tags: Array.isArray(s.tags) ? s.tags : [],
        };
        setSeeker(normalized);
        setSelectedTags(normalized.tags);
      } else if (response.status === 404) {
        addToast({
          title: "Error",
          description: "Seeker not found",
          variant: "destructive",
          duration: 5000
        });
        router.push('/admin/seekers');
      } else {
        throw new Error('Failed to load seeker profile');
      }
    } catch (error) {
      console.error('Error loading seeker profile:', error);
      addToast({
        title: "Error",
        description: "Failed to load seeker profile",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSeekerNotes = async () => {
    try {
      const response = await fetch(`/api/admin/concierge/seekers/${seekerId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error loading seeker notes:', error);
    }
  };

  const loadSeekerApplications = async () => {
    try {
      const response = await fetch(`/api/admin/seekers/${seekerId}/applications`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const loadConciergeInvitations = async () => {
    try {
      const response = await fetch(`/api/admin/concierge/seekers/${seekerId}/invitations`);
      if (response.ok) {
        const data = await response.json();
        setConciergeInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error loading concierge invitations:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;

    setIsNotesLoading(true);
    try {
      const response = await fetch(`/api/admin/concierge/seekers/${seekerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: newNote.trim(),
          tags: selectedTags
        })
      });

      if (response.ok) {
        addToast({
          title: "Success",
          description: "Note saved successfully",
          variant: "success",
          duration: 3000
        });
        setNewNote('');
        loadSeekerNotes();

        // Update seeker tags
        if (seeker) {
          setSeeker({ ...seeker, tags: selectedTags });
        }
      } else {
        throw new Error('Failed to save note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      addToast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsNotesLoading(false);
    }
  };

  const handleEditNote = (noteId: string, currentText: string) => {
    setEditingNoteId(noteId);
    setEditingNoteText(currentText);
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingNoteText.trim()) return;

    setIsNotesLoading(true);
    try {
      const response = await fetch(`/api/admin/concierge/seekers/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: editingNoteText.trim()
        })
      });

      if (response.ok) {
        addToast({
          title: "Success",
          description: "Note updated successfully",
          variant: "success",
          duration: 3000
        });
        setEditingNoteId(null);
        setEditingNoteText('');
        loadSeekerNotes();
      } else {
        throw new Error('Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      addToast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsNotesLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    setIsNotesLoading(true);
    try {
      const response = await fetch(`/api/admin/concierge/seekers/notes/${noteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        addToast({
          title: "Success",
          description: "Note deleted successfully",
          variant: "success",
          duration: 3000
        });
        loadSeekerNotes();
      } else {
        throw new Error('Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      addToast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsNotesLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  const loadConciergeJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const response = await fetch('/api/admin/concierge/requests');
      if (response.ok) {
        const data = await response.json();
        const jobs = data.requests.map((request: any) => ({
          id: request.jobId,
          title: request.jobTitle,
          companyName: request.companyName,
          status: request.status,
          createdAt: request.createdAt
        }));
        setConciergeJobs(jobs);
      }
    } catch (error) {
      console.error('Error loading concierge jobs:', error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleAddToConciergeJob = () => {
    setJobSelectionMode('add');
    loadConciergeJobs();
    setShowJobSelectionModal(true);
  };

  const handleStartChat = () => {
    setJobSelectionMode('chat');
    loadConciergeJobs();
    setShowJobSelectionModal(true);
  };

  const handleJobSelection = async (jobId: string) => {
    if (jobSelectionMode === 'chat') {
      // Navigate to centralized chat with auto-open for this seeker and job
      const targetUrl = `/admin/concierge/chat/seekers?seekerId=${seekerId}&jobId=${jobId}&autoOpen=true`;
      router.push(targetUrl);
      return;
    }

    // Original add to concierge job logic
    try {
      const response = await fetch(`/api/admin/concierge/${jobId}/invite-seeker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seekerId,
          tags: selectedTags
        })
      });

      if (response.ok) {
        const selectedJob = conciergeJobs.find(job => job.id === jobId);
        addToast({
          title: "Success",
          description: `${seeker?.firstName} ${seeker?.lastName} added to "${selectedJob?.title}" successfully`,
          variant: "success",
          duration: 5000
        });
        setShowJobSelectionModal(false);
        loadConciergeInvitations(); // Refresh invitations

        // Ask user if they want to view the concierge job
        if (selectedJob && confirm(`Seeker added successfully! Would you like to view the concierge job "${selectedJob.title}"?`)) {
          router.push(`/admin/concierge/${jobId}`);
        }
      } else {
        const error = await response.json();
        addToast({
          title: "Error",
          description: error.error || "Failed to add seeker to concierge job",
          variant: "destructive",
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error adding seeker to concierge job:', error);
      addToast({
        title: "Error",
        description: "Failed to add seeker to concierge job",
        variant: "destructive",
        duration: 5000
      });
    }
  };

  const handleViewResume = async (resume?: Resume) => {
    // If specific resume passed, use it. Otherwise try legacy resumeUrl or first resume
    let resumeToView = resume;
    if (!resumeToView) {
      if (seeker?.resumes && seeker.resumes.length > 0) {
        // Use primary resume or first available
        resumeToView = seeker.resumes.find(r => r.isPrimary) || seeker.resumes[0];
      } else if (seeker?.resumeUrl) {
        // Fallback to legacy resumeUrl
        window.open(seeker.resumeUrl, '_blank');
        return;
      } else {
        return;
      }
    }

    try {
      const response = await fetch(`/api/seeker/resume/download?seekerId=${seekerId}&resumeId=${resumeToView.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.downloadUrl) {
          window.open(data.downloadUrl, '_blank');
        } else {
          window.open(resumeToView.fileUrl, '_blank');
        }
      } else {
        window.open(resumeToView.fileUrl, '_blank');
      }
    } catch (error) {
      console.error('Error accessing resume:', error);
      window.open(resumeToView.fileUrl, '_blank');
    }
  };

  const getMembershipBadgeColor = (plan: string) => {
    const colors = {
      'annual_platinum': 'bg-purple-100 text-purple-800',
      'vip_quarterly': 'bg-yellow-100 text-yellow-800',
      'gold_bimonthly': 'bg-orange-100 text-orange-800',
      'trial_monthly': 'bg-blue-100 text-blue-800',
      'none': 'bg-gray-100 text-gray-600'
    };
    return colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-600';
  };

  const formatMembershipName = (plan: string) => {
    const names = {
      'annual_platinum': 'Annual Platinum',
      'vip_quarterly': 'VIP Quarterly',
      'gold_bimonthly': 'Gold Bimonthly',
      'trial_monthly': 'Trial Monthly',
      'none': 'Free'
    };
    return names[plan as keyof typeof names] || 'Unknown';
  };

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'reviewed': 'bg-blue-100 text-blue-800',
      'interview': 'bg-purple-100 text-purple-800',
      'hired': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!seeker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Seeker not found</h3>
          <p className="text-gray-600 mb-4">The requested seeker profile could not be found.</p>
          <Button onClick={() => router.push('/admin/seekers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Seekers
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
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {seeker.firstName} {seeker.lastName}
              </h1>
              <p className="text-gray-600 mt-1" title={seeker.email}>
                {truncateEmail(seeker.email, 40)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className={getMembershipBadgeColor(seeker.membershipPlan)}>
              {formatMembershipName(seeker.membershipPlan)}
            </Badge>
            {seeker.isSuspended && (
              <Badge className="bg-red-100 text-red-800">
                Suspended
              </Badge>
            )}
            {seeker.pendingSignup && (
              <Badge className="bg-yellow-100 text-yellow-800">
                <ShoppingCart className="h-3 w-3 mr-1" />
                Abandoned Cart
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-6">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {seeker.profilePictureUrl ? (
                      <img
                        src={`/api/seeker/profile-picture/${seeker.id}?t=${Date.now()}`}
                        alt={`${seeker.firstName} ${seeker.lastName}`}
                        className="w-24 h-24 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Users className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Email</Label>
                        <p className="text-gray-900" title={seeker.email}>
                          {truncateEmail(seeker.email, 30)}
                        </p>
                      </div>
                      {seeker.phone && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Phone</Label>
                          <p className="text-gray-900">{seeker.phone}</p>
                        </div>
                      )}
                      {seeker.availability && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Availability</Label>
                          <p className="text-gray-900">{seeker.availability}</p>
                        </div>
                      )}
                    </div>
                    {seeker.headline && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Professional Headline</Label>
                        <p className="text-gray-900">{seeker.headline}</p>
                      </div>
                    )}
                    {seeker.aboutMe && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">About Me</Label>
                        <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                          <p className="text-gray-900 text-sm whitespace-pre-wrap">{seeker.aboutMe}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Work Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Work Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {seeker.availability && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Availability</Label>
                      <p className="text-gray-900">{seeker.availability}</p>
                    </div>
                  )}
                  {seeker.salaryExpectations && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Salary Expectations</Label>
                      <p className="text-gray-900 flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {seeker.salaryExpectations}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Skills & Experience */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Skills & Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {seeker.skills?.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Skills</Label>
                    <div className="flex flex-wrap gap-2">
                      {(seeker.skills || []).map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {seeker.workExperience && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Work Experience</Label>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-gray-900 text-sm whitespace-pre-wrap">{seeker.workExperience}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Portfolio & Links */}
            {seeker.portfolioUrls && seeker.portfolioUrls.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Portfolio & Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {seeker.portfolioUrls.map((url, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-900 truncate flex-1 mr-2">{url}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(url, '_blank')}
                          className="text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resumes */}
            {((seeker.resumes && seeker.resumes.length > 0) || seeker.resumeUrl) && (
              <Card data-section="resumes">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Resumes {seeker.resumes ? `(${seeker.resumes.length})` : '(Legacy)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {seeker.resumes && seeker.resumes.length > 0 ? (
                      seeker.resumes.map((resume) => (
                        <div key={resume.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">{resume.filename}</h4>
                              {resume.isPrimary && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                                  <Star className="h-3 w-3 mr-1 fill-current" />
                                  Primary
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <p className="text-sm text-gray-600">
                                Uploaded: {new Date(resume.uploadedAt).toLocaleDateString()}
                              </p>
                              {resume.fileSize && (
                                <p className="text-sm text-gray-600">
                                  Size: {Math.round(resume.fileSize / 1024)} KB
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewResume(resume)}
                            className="text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      ))
                    ) : seeker.resumeUrl ? (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">Resume (Legacy)</h4>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
                              Legacy Format
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Legacy resume from old system
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewResume()}
                          className="text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cover Letter Templates */}
            {seeker.coverLetterTemplates && seeker.coverLetterTemplates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Cover Letter Templates ({seeker.coverLetterTemplates.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {seeker.coverLetterTemplates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{template.title}</h4>
                            {template.isDefault && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Last updated: {new Date(template.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCoverLetter(template);
                            setShowCoverLetterModal(true);
                          }}
                          className="text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Concierge Invitations */}
            {conciergeInvitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="h-5 w-5 mr-2" />
                    Concierge Job Invitations ({conciergeInvitations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {conciergeInvitations.map((invitation) => (
                      <div key={invitation.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900">{invitation.jobTitle}</h4>
                              <Badge className={
                                invitation.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : invitation.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                              }>
                                {invitation.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{invitation.companyName}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Invited: {new Date(invitation.invitedAt).toLocaleDateString()}
                              </span>
                              {invitation.lastActivity && (
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Last activity: {new Date(invitation.lastActivity).toLocaleDateString()}
                                </span>
                              )}
                              {invitation.hasMessages && (
                                <span className="flex items-center">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  {invitation.messageCount} messages
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/admin/concierge/${invitation.jobId}`)}
                              className="text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Job
                            </Button>
                            {invitation.hasMessages && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/admin/concierge/chat/seekers?seekerId=${seekerId}&jobId=${invitation.jobId}&autoOpen=true`)}
                                className="text-xs"
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Chat
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Application History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Application History ({seeker.applicationCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length > 0 ? (
                  <div className="space-y-3">
                    {applications.map((application) => (
                      <div key={application.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{application.job.title}</h4>
                          <p className="text-sm text-gray-600">{application.job.company}</p>
                          <p className="text-xs text-gray-500">
                            Applied {new Date(application.appliedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getStatusBadgeColor(application.status)}>
                          {application.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No applications yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions & Notes */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => window.open(`mailto:${seeker.email}`, '_blank')}
                  className="w-full"
                  variant="outline"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button
                  onClick={handleStartChat}
                  className="w-full"
                  variant="outline"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Chat
                </Button>
                {/* Quick Resume Access */}
                {((seeker.resumes && seeker.resumes.length > 0) || seeker.resumeUrl) && (
                  <Button
                    onClick={() => {
                      // Scroll to resumes section
                      const resumesSection = document.querySelector('[data-section="resumes"]');
                      if (resumesSection) {
                        resumesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      } else if (seeker.resumes && seeker.resumes.length > 0) {
                        // Fallback: open primary resume or first resume
                        const primaryResume = seeker.resumes.find(r => r.isPrimary) || seeker.resumes[0];
                        handleViewResume(primaryResume);
                      } else if (seeker.resumeUrl) {
                        handleViewResume();
                      }
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {seeker.resumes && seeker.resumes.length > 1
                      ? `View Resumes (${seeker.resumes.length})`
                      : seeker.resumes && seeker.resumes.length === 1
                        ? 'View Resume'
                        : 'View Resume (Legacy)'
                    }
                  </Button>
                )}
                <Button
                  onClick={handleAddToConciergeJob}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add to Concierge Job
                </Button>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Account Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Member Since</Label>
                  <p className="text-gray-900">
                    {new Date(seeker.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {seeker.membershipExpiresAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Membership Expires</Label>
                    <p className="text-gray-900">
                      {new Date(seeker.membershipExpiresAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {seeker.membershipPlan === 'none' && seeker.cancelledAt && (
                  <div>
                    <Label className="text-sm font-medium text-red-600">Cancelled On</Label>
                    <p className="text-red-600">
                      {new Date(seeker.cancelledAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {seeker.pendingSignup && (
                  <div>
                    <Label className="text-sm font-medium text-yellow-700">Abandoned Cart Since</Label>
                    <p className="text-yellow-700">
                      {new Date(seeker.pendingSignup.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(prev => prev.filter(t => t !== tag));
                          } else {
                            setSelectedTags(prev => [...prev, tag]);
                          }
                        }}
                        className={`px-2 py-1 rounded-full text-xs border transition-colors ${selectedTags.includes(tag)
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    placeholder="Add a note about this seeker..."
                  />
                  <Button
                    onClick={handleSaveNote}
                    disabled={!newNote.trim() || isNotesLoading}
                    className="w-full mt-2"
                    size="sm"
                  >
                    {isNotesLoading ? 'Saving...' : 'Save Note'}
                  </Button>
                </div>

                {notes.length > 0 && (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    <Label className="text-sm font-medium text-gray-700">Previous Notes</Label>
                    {notes.map((note) => (
                      <div key={note.id} className="group relative p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              className="min-h-[80px] resize-none"
                              disabled={isNotesLoading}
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdateNote(note.id)}
                                disabled={!editingNoteText.trim() || isNotesLoading}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                {isNotesLoading ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                disabled={isNotesLoading}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditNote(note.id, note.note)}
                                  className="h-6 w-6 p-0 hover:bg-blue-100"
                                  disabled={isNotesLoading}
                                >
                                  <Edit className="h-3 w-3 text-blue-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="h-6 w-6 p-0 hover:bg-red-100"
                                  disabled={isNotesLoading}
                                >
                                  <Trash2 className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 mb-2 pr-16">{note.note}</p>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              By {note.adminName} on {new Date(note.createdAt).toLocaleDateString()}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Job Selection Modal */}
      {showJobSelectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {jobSelectionMode === 'chat' ? 'Select Job for Chat' : 'Select Concierge Job'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {jobSelectionMode === 'chat'
                    ? `Start a chat with ${seeker.firstName} ${seeker.lastName} for a specific job`
                    : `Add ${seeker.firstName} ${seeker.lastName} to a concierge job`
                  }
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowJobSelectionModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6">
              {isLoadingJobs ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-gray-600">Loading concierge jobs...</span>
                </div>
              ) : conciergeJobs.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {conciergeJobs.map((job) => (
                    <div
                      key={job.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group"
                      onClick={() => handleJobSelection(job.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-900 transition-colors">
                            {job.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{job.companyName}</p>
                          <div className="flex items-center mt-2 space-x-4">
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(job.createdAt).toLocaleDateString()}
                            </span>
                            <Badge
                              className={
                                job.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : job.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                              }
                            >
                              {job.status}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Concierge Jobs Found</h3>
                  <p className="text-sm text-gray-500">There are no active concierge jobs available.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowJobSelectionModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cover Letter Modal */}
      {showCoverLetterModal && selectedCoverLetter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cover Letter Template</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-gray-600">{selectedCoverLetter.title}</p>
                  {selectedCoverLetter.isDefault && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCoverLetterModal(false);
                  setSelectedCoverLetter(null);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Created: {new Date(selectedCoverLetter.createdAt).toLocaleDateString()}</span>
                  <span>Last updated: {new Date(selectedCoverLetter.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    {selectedCoverLetter.content}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCoverLetterModal(false);
                  setSelectedCoverLetter(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}