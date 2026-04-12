'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { UserProfilePicture } from '@/components/common/UserProfilePicture';
import { useToast } from '@/components/ui/toast';
import { CompanyLogo } from '@/components/common/CompanyLogo';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  User,
  Users,
  Clock,
  CheckCircle,
  Search,
  AlertCircle,
  Briefcase,
  MapPin,
  FileText,
  Edit,
  Trash2,
  Plus,
  X,
  Save
} from '@/components/icons';

interface SeekerChatThread {
  id: string;
  jobId: string;
  seekerId: string;
  jobTitle: string;
  companyName: string;
  companyLogoUrl?: string;
  seekerName: string;
  seekerProfilePictureUrl?: string;
  seekerLocation?: string;
  seekerExperience?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  status: string;
}

interface SeekerNote {
  id: string;
  seekerId: string;
  note: string;
  createdAt: string;
  adminName: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'admin' | 'seeker';
  message: string;
  messageType: 'text' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  readAt?: string;
  createdAt: string;
}

interface ActiveChatData {
  thread: SeekerChatThread;
  messages: ChatMessage[];
}

export default function AdminSeekerChatPage() {
  const { addToast } = useToast();

  // State
  const [threads, setThreads] = useState<SeekerChatThread[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChatData | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Notes state
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState<SeekerNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState<SeekerNote | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Load all seeker chat threads
  useEffect(() => {
    loadSeekerThreads();
  }, []);

  // Check for URL parameter to auto-open a specific thread
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const threadId = urlParams.get('threadId');

    if (threadId && threads.length > 0) {
      const thread = threads.find(t => t.id === threadId);
      if (thread && (!activeChat || activeChat.thread.id !== threadId)) {
        openChat(thread);
        // Clean up URL parameter
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('threadId');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [threads]);

  // Auto-refresh active chat messages every 5 seconds
  useEffect(() => {
    if (activeChat) {
      const interval = setInterval(() => {
        loadChatMessages(activeChat.thread.id);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [activeChat]);

  const loadSeekerThreads = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/concierge/chat/seekers');

      if (response.ok) {
        const result = await response.json();
        setThreads(result.threads || []);
      } else {
        throw new Error('Failed to load seeker threads');
      }
    } catch (error) {
      console.error('Error loading seeker threads:', error);
      addToast({
        title: "Error",
        description: "Failed to load seeker conversations",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatMessages = async (threadId: string) => {
    try {
      const response = await fetch(`/api/admin/concierge/chat/seekers/${threadId}/messages`);

      if (response.ok) {
        const result = await response.json();
        if (activeChat && activeChat.thread.id === threadId) {
          setActiveChat(prev => prev ? {
            ...prev,
            messages: result.messages || []
          } : null);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const openChat = async (thread: SeekerChatThread) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/concierge/chat/seekers/${thread.id}/messages`);

      if (response.ok) {
        const result = await response.json();
        setActiveChat({
          thread,
          messages: result.messages || []
        });

        // Mark thread as read
        setThreads(prev => prev.map(t =>
          t.id === thread.id ? { ...t, unreadCount: 0 } : t
        ));
      } else {
        throw new Error('Failed to load chat');
      }
    } catch (error) {
      console.error('Error opening chat:', error);
      addToast({
        title: "Error",
        description: "Failed to load chat messages",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending || !activeChat) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/admin/concierge/chat/seekers/${activeChat.thread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        setActiveChat(prev => prev ? {
          ...prev,
          messages: [...prev.messages, result.message]
        } : null);
        setNewMessage('');

        // Update thread list with new last message
        setThreads(prev => prev.map(t =>
          t.id === activeChat.thread.id ? {
            ...t,
            lastMessage: newMessage.trim(),
            lastMessageAt: new Date().toISOString()
          } : t
        ));

        addToast({
          title: "Message Sent",
          description: "Your message has been sent to the seeker.",
          variant: "success",
          duration: 3000
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addToast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Notes functions
  const loadNotes = async (seekerId: string) => {
    if (!seekerId) return;

    setIsLoadingNotes(true);
    try {
      const response = await fetch(`/api/admin/concierge/seekers/${seekerId}/notes`);
      if (response.ok) {
        const result = await response.json();
        setNotes(result.notes || []);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const saveNote = async () => {
    if (!newNote.trim() || !activeChat) return;

    setIsSavingNote(true);
    try {
      const response = await fetch(`/api/admin/concierge/seekers/${activeChat.thread.seekerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: newNote.trim(),
          jobId: activeChat.thread.jobId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setNotes(prev => [result.note, ...prev]);
        setNewNote('');
        addToast({
          title: "Success",
          description: "Note added successfully",
          variant: "success",
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error saving note:', error);
      addToast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const updateNote = async (noteId: string, updatedText: string) => {
    if (!updatedText.trim()) return;

    try {
      const response = await fetch(`/api/admin/concierge/seekers/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: updatedText.trim() })
      });

      if (response.ok) {
        const result = await response.json();
        setNotes(prev => prev.map(note =>
          note.id === noteId ? result.note : note
        ));
        setEditingNote(null);
        setEditingNoteText('');
        addToast({
          title: "Success",
          description: "Note updated successfully",
          variant: "success",
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error updating note:', error);
      addToast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/admin/concierge/seekers/notes/${noteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId));
        addToast({
          title: "Success",
          description: "Note deleted successfully",
          variant: "success",
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      addToast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  // Load notes when active chat changes
  useEffect(() => {
    if (activeChat && showNotes) {
      loadNotes(activeChat.thread.seekerId);
    }
  }, [activeChat, showNotes]);

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Filter threads based on search
  const filteredThreads = threads.filter(thread =>
    thread.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.seekerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.seekerLocation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-50 h-full flex flex-col">
      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Users className="h-6 w-6 mr-2 text-green-600" />
                Chat with Seekers
              </h1>
              <p className="text-gray-600">
                Manage conversations with job seekers about concierge opportunities
              </p>
            </div>
          </div>
        </div>

        {/* Main Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
          {/* Left Sidebar - Thread List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-lg">Seeker Conversations</CardTitle>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search seekers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">
                    {threads.length === 0 ? 'No seeker conversations yet' : 'No matching conversations'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => openChat(thread)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${activeChat?.thread.id === thread.id ? 'bg-green-50 border-r-2 border-green-500' : ''
                        }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserProfilePicture
                            userId={thread.seekerId}
                            userName={thread.seekerName}
                            profilePictureUrl={thread.seekerProfilePictureUrl || 'placeholder'}
                            size="md"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {thread.seekerName}
                            </p>
                            {thread.unreadCount > 0 && (
                              <div className="bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                              </div>
                            )}
                          </div>
                          {thread.seekerLocation && (
                            <p className="text-xs text-gray-500 truncate mb-1 flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {thread.seekerLocation}
                            </p>
                          )}
                          <p className="text-xs font-medium text-gray-700 truncate mb-1 flex items-center">
                            <Briefcase className="h-3 w-3 mr-1" />
                            {thread.jobTitle}
                          </p>
                          <p className="text-xs text-gray-500 truncate mb-1">
                            {thread.companyName}
                          </p>
                          {thread.lastMessage && (
                            <p className="text-xs text-gray-500 truncate">
                              {thread.lastMessage}
                            </p>
                          )}
                          {thread.lastMessageAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              {formatMessageTime(thread.lastMessageAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Side - Chat Area */}
          <Card className="lg:col-span-3 flex flex-col">
            {activeChat ? (
              <>
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <UserProfilePicture
                          userId={activeChat.thread.seekerId}
                          userName={activeChat.thread.seekerName}
                          profilePictureUrl={activeChat.thread.seekerProfilePictureUrl || 'placeholder'}
                          size="md"
                        />
                      </div>
                      <div>
                        <button
                          onClick={() => window.open(`/admin/seekers/${activeChat.thread.seekerId}`, '_blank')}
                          className="text-left hover:text-blue-600 transition-colors"
                        >
                          <h3 className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                            {activeChat.thread.seekerName}
                            <span className="ml-2 text-xs text-blue-500">↗</span>
                          </h3>
                        </button>
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          {activeChat.thread.seekerLocation && (
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {activeChat.thread.seekerLocation}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Briefcase className="h-3 w-3 mr-1" />
                            {activeChat.thread.jobTitle}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {activeChat.thread.companyName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNotes(!showNotes)}
                        className={showNotes ? 'bg-blue-50 border-blue-300' : ''}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Notes
                      </Button>
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active Chat
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {/* Notes Section */}
                {showNotes && (
                  <div className="border-t bg-gray-50 flex-shrink-0">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Seeker Notes
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowNotes(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Add New Note */}
                      <div className="mb-4">
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Add a note about this seeker..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && saveNote()}
                            className="flex-1 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={saveNote}
                            disabled={!newNote.trim() || isSavingNote}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isSavingNote ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Notes List */}
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {isLoadingNotes ? (
                          <div className="flex items-center justify-center py-4">
                            <LoadingSpinner size="sm" />
                          </div>
                        ) : notes.length === 0 ? (
                          <div className="text-center py-4 text-sm text-gray-500">
                            No notes yet. Add the first note above.
                          </div>
                        ) : (
                          notes.map((note) => (
                            <div key={note.id} className="bg-white rounded p-3 shadow-sm">
                              {editingNote?.id === note.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editingNoteText}
                                    onChange={(e) => setEditingNoteText(e.target.value)}
                                    className="text-sm"
                                  />
                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      onClick={() => updateNote(note.id, editingNoteText)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingNote(null);
                                        setEditingNoteText('');
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-start justify-between">
                                    <p className="text-sm text-gray-700 flex-1">{note.note}</p>
                                    <div className="flex items-center space-x-1 ml-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingNote(note);
                                          setEditingNoteText(note.note);
                                        }}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteNote(note.id)}
                                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                                    <span>By {note.adminName}</span>
                                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4">
                  {activeChat.messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Your Conversation</h3>
                      <p className="text-gray-600">
                        Send a message to begin chatting with this seeker.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeChat.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.senderType === 'admin'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                              }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className={`text-xs ${message.senderType === 'admin' ? 'text-green-100' : 'text-gray-500'
                                }`}>
                                {formatMessageTime(message.createdAt)}
                              </span>
                              {message.senderType === 'admin' && (
                                <div className="ml-2">
                                  {message.readAt ? (
                                    <CheckCircle className="h-3 w-3 text-green-200" />
                                  ) : (
                                    <Clock className="h-3 w-3 text-green-200" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isSending}
                      className="flex-1"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select a Conversation
                  </h3>
                  <p className="text-gray-600">
                    Choose a seeker from the list to start chatting.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Chat Info */}
        <div className="mt-6 text-center text-sm text-gray-500 flex-shrink-0">
          <p className="flex items-center justify-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            All seeker conversations are monitored and logged for quality assurance.
          </p>
        </div>
      </div>
    </div>
  );
}