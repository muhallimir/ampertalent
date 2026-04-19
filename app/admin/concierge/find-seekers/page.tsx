'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { UserProfilePicture } from '@/components/common/UserProfilePicture';
import { useToast } from '@/components/ui/toast';
import {
  Search,
  Filter,
  Users,
  UserPlus,
  FileText,
  Mail,
  Phone,
  MapPin,
  Star,
  MessageSquare,
  Eye,
  X,
  Tag,
  Send,
  Edit,
  Trash2,
  Check
} from '@/components/icons';

interface Seeker {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePictureUrl?: string;
  headline?: string;
  skills: string[];
  membershipPlan: string;
  experience?: string;
  availability?: string;
  location?: string;
  resumeUrl?: string;
  applicationCount?: number;
  hasApplied?: boolean;
  tags?: string[];
  lastInvited?: string;
  conciergeJobCount?: number;
  conciergeJobs?: any[];
}

interface SeekerNote {
  id: string;
  seekerId: string;
  note: string;
  createdAt: string;
  adminName: string;
}

const MEMBERSHIP_LEVELS = [
  { value: 'all', label: 'All Memberships' },
  { value: 'annual_platinum', label: 'Annual Platinum' },
  { value: 'vip_quarterly', label: 'VIP Quarterly' },
  { value: 'gold_bimonthly', label: 'Gold Bimonthly' },
  { value: 'trial_monthly', label: 'Trial Monthly' },
  { value: 'none', label: 'No Membership' }
];

const EXPERIENCE_LEVELS = [
  { value: 'all', label: 'All Experience' },
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
  { value: 'lead', label: 'Lead/Executive' }
];

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

interface ConciergeJob {
  id: string;
  title: string;
  companyName: string;
  status: string;
  createdAt: string;
}

export default function FindSeekersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [jobId, setJobId] = useState<string | null>(searchParams.get('jobId'));

  // Job selection state
  const [conciergeJobs, setConciergeJobs] = useState<ConciergeJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ConciergeJob | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Seekers data
  const [seekers, setSeekers] = useState<Seeker[]>([]);
  const [filteredSeekers, setFilteredSeekers] = useState<Seeker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSeekers, setSelectedSeekers] = useState<Set<string>>(new Set());

  // Notes and tags state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedSeeker, setSelectedSeeker] = useState<Seeker | null>(null);
  const [seekerNotes, setSeekerNotes] = useState('');
  const [existingNotes, setExistingNotes] = useState<SeekerNote[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingNote, setEditingNote] = useState<SeekerNote | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Chat state
  const [showChatModal, setShowChatModal] = useState(false);
  const [activeChatSeeker, setActiveChatSeeker] = useState<Seeker | null>(null);
  const [chatRoomId, setChatRoomId] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Job selection modal for chat
  const [showJobSelectionModal, setShowJobSelectionModal] = useState(false);
  const [selectedSeekerForChat, setSelectedSeekerForChat] = useState<Seeker | null>(null);
  const [preSelectedJobId, setPreSelectedJobId] = useState<string | null>(null);

  // Invitation state
  const [invitedSeekers, setInvitedSeekers] = useState<Set<string>>(new Set());
  const [isInviting, setIsInviting] = useState(false);

  // Load concierge jobs and seekers
  useEffect(() => {
    loadConciergeJobs();
    searchSeekers(); // Load seekers immediately without requiring job selection
  }, []);

  useEffect(() => {
    searchSeekers();
  }, [searchQuery, membershipFilter, experienceFilter, skillsFilter, locationFilter]);

  // Filter seekers locally based on search criteria
  useEffect(() => {
    const filtered = seekers.filter(seeker => {
      const matchesSearch = !searchQuery ||
        seeker.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seeker.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seeker.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seeker.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seeker.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMembership = membershipFilter === 'all' || seeker.membershipPlan === membershipFilter;
      const matchesExperience = experienceFilter === 'all' || seeker.experience === experienceFilter;
      const matchesSkills = !skillsFilter ||
        seeker.skills.some(skill => skill.toLowerCase().includes(skillsFilter.toLowerCase()));
      const matchesLocation = !locationFilter ||
        seeker.location?.toLowerCase().includes(locationFilter.toLowerCase());

      return matchesSearch && matchesMembership && matchesExperience && matchesSkills && matchesLocation;
    });

    // Sort by membership level (premium first) and then by recent activity
    filtered.sort((a, b) => {
      const membershipOrder = { 'annual_platinum': 0, 'vip_quarterly': 1, 'gold_bimonthly': 2, 'trial_monthly': 3, 'none': 4 };
      const aOrder = membershipOrder[a.membershipPlan as keyof typeof membershipOrder] ?? 5;
      const bOrder = membershipOrder[b.membershipPlan as keyof typeof membershipOrder] ?? 5;

      if (aOrder !== bOrder) return aOrder - bOrder;

      // Secondary sort by application count (more active seekers first)
      return (b.applicationCount || 0) - (a.applicationCount || 0);
    });

    setFilteredSeekers(filtered);
  }, [seekers, searchQuery, membershipFilter, experienceFilter, skillsFilter, locationFilter]);

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

        // If jobId from URL, find and set the selected job
        if (jobId) {
          const job = jobs.find((j: ConciergeJob) => j.id === jobId);
          if (job) {
            setSelectedJob(job);
          }
        }
      }
    } catch (error) {
      console.error('Error loading concierge jobs:', error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleJobSelect = (job: ConciergeJob) => {
    setSelectedJob(job);
    setJobId(job.id);
    // Update URL with jobId
    const url = new URL(window.location.href);
    url.searchParams.set('jobId', job.id);
    window.history.pushState({}, '', url.toString());
  };

  const searchSeekers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (membershipFilter !== 'all') params.append('membership', membershipFilter);
      if (experienceFilter !== 'all') params.append('experience', experienceFilter);
      if (skillsFilter) params.append('skills', skillsFilter);
      if (locationFilter) params.append('location', locationFilter);

      const response = await fetch(`/api/admin/concierge/seekers/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSeekers(data.seekers || []);
      } else {
        addToast({
          title: "Error",
          description: "Failed to search seekers",
          variant: "destructive",
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error searching seekers:', error);
      addToast({
        title: "Error",
        description: "Failed to search seekers",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeekerSelect = (seekerId: string, selected: boolean) => {
    const newSelected = new Set(selectedSeekers);
    if (selected) {
      newSelected.add(seekerId);
    } else {
      newSelected.delete(seekerId);
    }
    setSelectedSeekers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSeekers.size === filteredSeekers.length) {
      setSelectedSeekers(new Set());
    } else {
      setSelectedSeekers(new Set(filteredSeekers.map(s => s.id)));
    }
  };

  const handleInviteSelected = async () => {
    if (selectedSeekers.size === 0) return;

    // Load jobs and show selection modal
    loadConciergeJobs();
    setShowJobSelectionModal(true);
  };

  const handleBulkJobSelection = async (selectedJobId: string) => {
    if (selectedSeekers.size === 0) return;

    setIsInviting(true);
    try {
      const response = await fetch('/api/admin/concierge/seekers/bulk-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJobId,
          seekerIds: Array.from(selectedSeekers),
          tags: selectedTags
        })
      });

      if (response.ok) {
        const data = await response.json();
        setInvitedSeekers(prev => new Set([...prev, ...selectedSeekers]));
        setSelectedSeekers(new Set());
        setShowJobSelectionModal(false);
        addToast({
          title: "Success",
          description: `Invited ${selectedSeekers.size} seekers successfully`,
          variant: "success",
          duration: 3000
        });

        // Redirect to the selected job page
        router.push(`/admin/concierge/${selectedJobId}`);
      } else {
        const error = await response.json();
        addToast({
          title: "Error",
          description: error.error || "Failed to invite seekers",
          variant: "destructive",
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error inviting seekers:', error);
      addToast({
        title: "Error",
        description: "Failed to invite seekers",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleStartChat = async (seekerId: string, seekerName: string) => {
    // Find the seeker in our current list
    const seeker = seekers.find(s => s.id === seekerId);
    if (seeker) {
      setSelectedSeekerForChat(seeker);

      // Check if this seeker already has existing chats to pre-select job
      try {
        const checkResponse = await fetch(`/api/admin/concierge/seekers/chat-exists?seekerId=${seekerId}`);
        if (checkResponse.ok) {
          const existingChat = await checkResponse.json();
          if (existingChat.exists && existingChat.jobId) {
            setPreSelectedJobId(existingChat.jobId);
          } else {
            setPreSelectedJobId(null);
          }
        }
      } catch (error) {
        console.error('Error checking existing chats:', error);
        setPreSelectedJobId(null);
      }

      setShowJobSelectionModal(true);
    }
  };

  const handleJobSelectionForChat = async (selectedJobId: string) => {
    if (!selectedSeekerForChat) return;

    try {
      console.log('Starting chat for:', {
        seekerId: selectedSeekerForChat.id,
        seekerName: `${selectedSeekerForChat.firstName} ${selectedSeekerForChat.lastName}`,
        jobId: selectedJobId
      });

      // First check if a chat already exists for this job-seeker combination
      const checkResponse = await fetch(`/api/admin/concierge/seekers/chat-exists?jobId=${selectedJobId}&seekerId=${selectedSeekerForChat.id}`);

      let chatData;
      let shouldSendWelcomeMessage = true;

      if (checkResponse.ok) {
        const existingChat = await checkResponse.json();
        if (existingChat.exists) {
          chatData = existingChat;
          shouldSendWelcomeMessage = false; // Chat already exists, don't send welcome message
          console.log('Chat already exists:', chatData);
        }
      }

      // If no existing chat, create a new one
      if (shouldSendWelcomeMessage) {
        const response = await fetch(`/api/admin/concierge/${selectedJobId}/invite-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seekerId: selectedSeekerForChat.id,
            message: `Hello ${selectedSeekerForChat.firstName}! I'd like to discuss this exciting opportunity with you through our concierge service.`,
            tags: selectedTags || []
          })
        });

        console.log('Chat invitation response:', response.status);

        if (response.ok) {
          chatData = await response.json();
          console.log('Chat started successfully:', chatData);
        } else {
          const errorText = await response.text();
          console.error('Chat invitation failed:', response.status, errorText);

          let errorMessage = "Failed to start chat";
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error('Could not parse error response:', errorText);
          }

          addToast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
            duration: 5000
          });
          return;
        }
      }

      // Close modal and redirect to centralized seeker chat with thread ID
      setShowJobSelectionModal(false);
      setSelectedSeekerForChat(null);
      setPreSelectedJobId(null);

      if (chatData && chatData.chatRoomId) {
        router.push(`/admin/concierge/chat/seekers?threadId=${chatData.chatRoomId}`);
      } else {
        router.push('/admin/concierge/chat/seekers');
      }

    } catch (error) {
      console.error('Error starting chat:', error);
      addToast({
        title: "Error",
        description: "Network error - Failed to start chat",
        variant: "destructive",
        duration: 5000
      });
    }
  };

  const handleOpenChat = (seeker: Seeker) => {
    // Redirect to centralized seeker chat
    router.push('/admin/concierge/chat/seekers');
  };

  const loadChatMessages = async (roomId: string) => {
    try {
      // Load messages from the admin perspective
      const messagesResponse = await fetch(`/api/admin/concierge/seeker-chat/${roomId}/messages`);
      if (messagesResponse.ok) {
        const data = await messagesResponse.json();
        setChatMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatRoomId || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      const response = await fetch(`/api/admin/concierge/seeker-chat/${chatRoomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, data.message]);
        setNewMessage('');
      } else {
        addToast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addToast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const handleViewProfile = (seeker: Seeker) => {
    // Open seeker profile in a new tab
    window.open(`/admin/seekers/${seeker.id}`, '_blank');
  };

  const handleViewResume = async (seeker: Seeker) => {
    if (!seeker.resumeUrl) return;

    try {
      // Use the seeker resume download API to get a presigned URL
      const response = await fetch(`/api/seeker/resume/download?seekerId=${seeker.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.downloadUrl) {
          window.open(data.downloadUrl, '_blank');
        } else {
          // Fallback to direct URL if no presigned URL available
          window.open(seeker.resumeUrl, '_blank');
        }
      } else {
        // Fallback to direct URL
        window.open(seeker.resumeUrl, '_blank');
      }
    } catch (error) {
      console.error('Error accessing resume:', error);
      // Fallback to direct URL
      window.open(seeker.resumeUrl, '_blank');
    }
  };

  const handleViewNotes = async (seeker: Seeker) => {
    setSelectedSeeker(seeker);
    setShowNotesModal(true);
    setSeekerNotes('');
    setSelectedTags(seeker.tags || []);

    // Load existing notes
    setIsLoadingNotes(true);
    try {
      const response = await fetch(`/api/admin/concierge/seekers/${seeker.id}/notes`);
      if (response.ok) {
        const data = await response.json();
        setExistingNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedSeeker || (!seekerNotes.trim() && selectedTags.length === 0)) return;

    setIsSavingNote(true);
    try {
      const response = await fetch(`/api/admin/concierge/seekers/${selectedSeeker.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: seekerNotes.trim(),
          tags: selectedTags,
          jobId
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Add new note to existing notes list
        if (seekerNotes.trim()) {
          setExistingNotes(prev => [data.note, ...prev]);
        }
        setSeekerNotes(''); // Clear the input after saving
        addToast({
          title: "Success",
          description: "Notes and tags saved successfully",
          variant: "success",
          duration: 3000
        });
        // Update seeker tags in local state
        setSeekers(prev => prev.map(s =>
          s.id === selectedSeeker.id ? { ...s, tags: selectedTags } : s
        ));
      } else {
        const error = await response.json();
        addToast({
          title: "Error",
          description: error.error || "Failed to save notes",
          variant: "destructive",
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      addToast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleEditNote = (note: SeekerNote) => {
    setEditingNote(note);
    setEditingNoteText(note.note);
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditingNoteText('');
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editingNoteText.trim()) return;

    setIsSavingNote(true);
    try {
      const response = await fetch(`/api/admin/concierge/seekers/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: editingNoteText.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update the note in the existing notes list
        setExistingNotes(prev => prev.map(n =>
          n.id === editingNote.id ? data.note : n
        ));
        setEditingNote(null);
        setEditingNoteText('');
        addToast({
          title: "Success",
          description: "Note updated successfully",
          variant: "success",
          duration: 3000
        });
      } else {
        const error = await response.json();
        addToast({
          title: "Error",
          description: error.error || "Failed to update note",
          variant: "destructive",
          duration: 5000
        });
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
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/admin/concierge/seekers/notes/${noteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove the note from the existing notes list
        setExistingNotes(prev => prev.filter(n => n.id !== noteId));
        addToast({
          title: "Success",
          description: "Note deleted successfully",
          variant: "success",
          duration: 3000
        });
      } else {
        const error = await response.json();
        addToast({
          title: "Error",
          description: error.error || "Failed to delete note",
          variant: "destructive",
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      addToast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
        duration: 5000
      });
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
      'annual_platinum': 'Platinum',
      'vip_quarterly': 'VIP',
      'gold_bimonthly': 'Gold',
      'trial_monthly': 'Trial',
      'none': 'Free'
    };
    return names[plan as keyof typeof names] || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Find Seekers</h1>
            <p className="text-gray-600 mt-2">
              Search and invite qualified candidates for concierge positions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {selectedSeekers.size > 0 && (
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="px-3 py-1">
                  {selectedSeekers.size} selected
                </Badge>
                <Button
                  onClick={handleInviteSelected}
                  disabled={isInviting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isInviting ? 'Inviting...' : 'Invite Selected'}
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-blue-50 border-blue-300' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search by name, email, skills, or headline..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={searchSeekers} disabled={isLoading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Advanced Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Membership Level</Label>
                  <Select value={membershipFilter} onValueChange={setMembershipFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBERSHIP_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Experience Level</Label>
                  <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label>Skills</Label>
                  <Input
                    placeholder="Filter by specific skills..."
                    value={skillsFilter}
                    onChange={(e) => setSkillsFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    placeholder="City, state, or country..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredSeekers.length === 0}
            >
              {selectedSeekers.size === filteredSeekers.length ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-sm text-gray-600">
              {filteredSeekers.length} seekers found
            </span>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSeekers.map((seeker) => (
              <Card
                key={seeker.id}
                className={`relative transition-all hover:shadow-md ${selectedSeekers.has(seeker.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedSeekers.has(seeker.id)}
                        onChange={(e) => handleSeekerSelect(seeker.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
                      />
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <UserProfilePicture
                          userId={seeker.id}
                          userName={`${seeker.firstName} ${seeker.lastName}`}
                          profilePictureUrl={seeker.profilePictureUrl || 'placeholder'}
                          size="md"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {seeker.firstName} {seeker.lastName}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">{seeker.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Badge className={`${getMembershipBadgeColor(seeker.membershipPlan)} text-xs px-2 py-1`}>
                      {formatMembershipName(seeker.membershipPlan)}
                    </Badge>
                  </div>
                  {seeker.headline && (
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{seeker.headline}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Skills */}
                  {(seeker.skills || []).length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-hidden">
                        {(seeker.skills || []).slice(0, 4).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {(seeker.skills || []).length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(seeker.skills || []).length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {seeker.tags && seeker.tags.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-1">
                        {seeker.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} className="text-xs bg-green-100 text-green-800">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {seeker.tags.length > 2 && (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            +{seeker.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Concierge History */}
                  {seeker.conciergeJobCount && seeker.conciergeJobCount > 0 && (
                    <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded-md group cursor-help" title="Click to view concierge history details">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-purple-600 mr-1" />
                          <span className="text-xs font-medium text-purple-900">
                            Concierge History
                          </span>
                        </div>
                        <Badge className="text-xs bg-purple-100 text-purple-800">
                          {seeker.conciergeJobCount} {seeker.conciergeJobCount === 1 ? 'job' : 'jobs'}
                        </Badge>
                      </div>
                      {seeker.lastInvited && (
                        <p className="text-xs text-purple-700 mt-1">
                          Last invited: {new Date(seeker.lastInvited).toLocaleDateString()}
                        </p>
                      )}
                      {seeker.conciergeJobs && seeker.conciergeJobs.length > 0 && (
                        <div className="mt-2 text-xs text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="font-medium mb-1">Recent positions:</p>
                          {seeker.conciergeJobs.slice(0, 2).map((job: any, index: number) => (
                            <div key={index} className="text-xs text-purple-700 truncate">
                              • {job.jobTitle} at {job.companyName}
                            </div>
                          ))}
                          {seeker.conciergeJobs.length > 2 && (
                            <p className="text-xs text-purple-600 font-medium">
                              +{seeker.conciergeJobs.length - 2} more positions
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    {seeker.applicationCount !== undefined && (
                      <span>{seeker.applicationCount} applications</span>
                    )}
                    {seeker.location && (
                      <span className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {seeker.location}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 pt-2 border-t">
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewProfile(seeker)}
                        className="text-xs flex-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewNotes(seeker)}
                        className="text-xs flex-1"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Notes
                      </Button>
                      {seeker.resumeUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewResume(seeker)}
                          className="text-xs flex-1"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Resume
                        </Button>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      {!invitedSeekers.has(seeker.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartChat(seeker.id, `${seeker.firstName} ${seeker.lastName}`)}
                          className="text-xs flex-1 bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Start Chat
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => {
                          if (invitedSeekers.has(seeker.id)) {
                            handleOpenChat(seeker);
                          } else {
                            handleSeekerSelect(seeker.id, !selectedSeekers.has(seeker.id));
                          }
                        }}
                        className={`text-xs flex-1 ${invitedSeekers.has(seeker.id)
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                      >
                        {invitedSeekers.has(seeker.id) ? 'Active Chat' : 'Select'}
                      </Button>
                    </div>

                  </div>

                  {/* Applied Status */}
                  {seeker.hasApplied && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 text-white text-xs">Applied</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredSeekers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No seekers found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search criteria or filters</p>
            <Button onClick={() => {
              setSearchQuery('');
              setMembershipFilter('all');
              setExperienceFilter('all');
              setSkillsFilter('');
              setLocationFilter('');
            }}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Notes and Tags Modal */}
        {showNotesModal && selectedSeeker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Seeker Notes & Tags - {selectedSeeker.firstName} {selectedSeeker.lastName}
                </h3>
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Tags Selection */}
                <div>
                  <Label>Tags</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
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
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${selectedTags.includes(tag)
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        <Tag className="h-3 w-3 mr-1 inline" />
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add New Note */}
                <div>
                  <Label>Add New Note</Label>
                  <Textarea
                    value={seekerNotes}
                    onChange={(e) => setSeekerNotes(e.target.value)}
                    rows={4}
                    placeholder="Add notes about this seeker's qualifications, interview feedback, etc..."
                    className="mt-2"
                  />
                </div>

                {/* Existing Notes */}
                {isLoadingNotes ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="md" />
                  </div>
                ) : existingNotes.length > 0 ? (
                  <div>
                    <Label>Previous Notes ({existingNotes.length})</Label>
                    <div className="mt-2 space-y-3 max-h-48 overflow-y-auto">
                      {existingNotes.map((note) => (
                        <div key={note.id} className="p-3 bg-gray-50 rounded-lg group">
                          {editingNote?.id === note.id ? (
                            <div className="space-y-3">
                              <Textarea
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                rows={3}
                                className="text-sm"
                                placeholder="Edit note..."
                              />
                              <div className="flex justify-end space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  disabled={isSavingNote}
                                  className="text-xs"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={handleUpdateNote}
                                  disabled={!editingNoteText.trim() || isSavingNote}
                                  className="text-xs bg-green-600 hover:bg-green-700"
                                >
                                  {isSavingNote ? <LoadingSpinner size="sm" /> : <Check className="h-3 w-3 mr-1" />}
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start">
                                <p className="text-sm text-gray-700 mb-2 flex-1 pr-2">{note.note}</p>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                  <button
                                    onClick={() => handleEditNote(note)}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                    title="Edit note"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    title="Delete note"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500">
                                By {note.adminName} on {new Date(note.createdAt).toLocaleDateString()}
                              </p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No notes yet</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNotesModal(false);
                    setEditingNote(null);
                    setEditingNoteText('');
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={handleSaveNotes}
                  disabled={isSavingNote || (!seekerNotes.trim() && selectedTags.length === 0)}
                >
                  {isSavingNote ? <LoadingSpinner size="sm" /> : null}
                  {seekerNotes.trim() ? 'Add Note' : 'Save Tags'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Modal */}
        {showChatModal && activeChatSeeker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    <UserProfilePicture
                      userId={activeChatSeeker.id}
                      userName={`${activeChatSeeker.firstName} ${activeChatSeeker.lastName}`}
                      profilePictureUrl={activeChatSeeker.profilePictureUrl || 'placeholder'}
                      size="sm"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Chat with {activeChatSeeker.firstName} {activeChatSeeker.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{activeChatSeeker.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowChatModal(false);
                    setActiveChatSeeker(null);
                    setChatRoomId('');
                    setChatMessages([]);
                    setNewMessage('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto min-h-96 max-h-96">
                {isLoadingChat ? (
                  <div className="flex items-center justify-center h-32">
                    <LoadingSpinner size="md" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    <div className="text-center">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((message, index) => (
                      <div
                        key={message.id || index}
                        className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.senderType === 'admin'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                            }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 ${message.senderType === 'admin' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                            {formatMessageTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={isSendingMessage}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSendingMessage}
                    className="px-4"
                  >
                    {isSendingMessage ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Job Selection Modal for Starting Chat */}
        {showJobSelectionModal && selectedSeekerForChat && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Select Concierge Job to Chat with {selectedSeekerForChat.firstName} {selectedSeekerForChat.lastName}
                </h3>
                <button
                  onClick={() => {
                    setShowJobSelectionModal(false);
                    setSelectedSeekerForChat(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Seeker Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    <UserProfilePicture
                      userId={selectedSeekerForChat.id}
                      userName={`${selectedSeekerForChat.firstName} ${selectedSeekerForChat.lastName}`}
                      profilePictureUrl={selectedSeekerForChat.profilePictureUrl || 'placeholder'}
                      size="md"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {selectedSeekerForChat.firstName} {selectedSeekerForChat.lastName}
                    </h4>
                    <p className="text-sm text-gray-600">{selectedSeekerForChat.email}</p>
                    {selectedSeekerForChat.headline && (
                      <p className="text-sm text-gray-700 mt-1">{selectedSeekerForChat.headline}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Selection */}
              {isLoadingJobs ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : conciergeJobs.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Concierge Jobs Available</h3>
                  <p className="text-gray-600">No active concierge requests found.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <h4 className="text-md font-semibold text-gray-900">Choose a Concierge Job:</h4>
                    {preSelectedJobId && (
                      <p className="text-sm text-blue-600 mt-1">
                        💬 The highlighted job has an existing chat with this seeker
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                    {conciergeJobs.map((job) => {
                      const isPreSelected = preSelectedJobId === job.id;
                      return (
                        <div
                          key={job.id}
                          onClick={() => handleJobSelectionForChat(job.id)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all relative ${isPreSelected
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                            }`}
                        >
                          {isPreSelected && (
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-blue-600 text-white text-xs">
                                Current Chat
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 pr-20">{job.title}</h3>
                            <Badge className={`text-xs ${job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                              }`}>
                              {job.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{job.companyName}</p>
                          <p className="text-xs text-gray-400">
                            Created: {new Date(job.createdAt).toLocaleDateString()}
                          </p>
                          {isPreSelected && (
                            <p className="text-xs text-blue-600 mt-2 font-medium">
                              ↩️ Continue existing conversation
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowJobSelectionModal(false);
                    setSelectedSeekerForChat(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Job Selection Modal */}
        {showJobSelectionModal && selectedSeekers.size > 0 && !selectedSeekerForChat && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add {selectedSeekers.size} Selected Seekers to Concierge Job
                </h3>
                <button
                  onClick={() => setShowJobSelectionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Selected Seekers Summary */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {selectedSeekers.size} seekers selected
                  </span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  These seekers will be added to the selected concierge job
                </p>
              </div>

              {/* Job Selection */}
              {isLoadingJobs ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : conciergeJobs.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Concierge Jobs Available</h3>
                  <p className="text-gray-600">No active concierge requests found.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <h4 className="text-md font-semibold text-gray-900">Choose a Concierge Job:</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                    {conciergeJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => handleBulkJobSelection(job.id)}
                        className="p-4 border rounded-lg cursor-pointer transition-all hover:border-green-500 hover:bg-green-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <Badge className={`text-xs ${job.status === 'completed' ? 'bg-green-100 text-green-800' :
                              job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{job.companyName}</p>
                        <p className="text-xs text-gray-400">
                          Created: {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowJobSelectionModal(false)}
                  disabled={isInviting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}