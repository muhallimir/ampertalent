'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/ui/toast';
import { CompanyLogo } from '@/components/common/CompanyLogo';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  User,
  Building2,
  Clock,
  CheckCircle,
  Search,
  AlertCircle
} from '@/components/icons';

interface EmployerChatThread {
  id: string;
  jobId: string;
  employerId: string;
  jobTitle: string;
  companyName: string;
  companyLogoUrl?: string;
  employerName: string;
  employerProfilePictureUrl?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  status: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'admin' | 'employer';
  message: string;
  messageType: 'text' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  readAt?: string;
  createdAt: string;
}

interface ActiveChatData {
  thread: EmployerChatThread;
  messages: ChatMessage[];
}

export default function AdminEmployerChatPage() {
  const { addToast } = useToast();

  // State
  const [threads, setThreads] = useState<EmployerChatThread[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChatData | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load all employer chat threads
  useEffect(() => {
    loadEmployerThreads();
  }, []);

  // Auto-refresh active chat messages every 5 seconds
  useEffect(() => {
    if (activeChat) {
      const interval = setInterval(() => {
        loadChatMessages(activeChat.thread.id);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [activeChat]);

  const loadEmployerThreads = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/concierge/chat/employers');

      if (response.ok) {
        const result = await response.json();
        setThreads(result.threads || []);
      } else {
        throw new Error('Failed to load employer threads');
      }
    } catch (error) {
      console.error('Error loading employer threads:', error);
      addToast({
        title: "Error",
        description: "Failed to load employer conversations",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatMessages = async (threadId: string) => {
    try {
      const response = await fetch(`/api/admin/concierge/chat/employers/${threadId}/messages`);

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

  const openChat = async (thread: EmployerChatThread) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/concierge/chat/employers/${thread.id}/messages`);

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
      const response = await fetch(`/api/admin/concierge/chat/employers/${activeChat.thread.id}/messages`, {
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
          description: "Your message has been sent to the employer.",
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
    thread.employerName.toLowerCase().includes(searchQuery.toLowerCase())
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
                <Building2 className="h-6 w-6 mr-2 text-blue-600" />
                Chat with Employers
              </h1>
              <p className="text-gray-600">
                Manage conversations with employers about their concierge requests
              </p>
            </div>
          </div>
        </div>

        {/* Main Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
          {/* Left Sidebar - Thread List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-lg">Employer Conversations</CardTitle>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search employers..."
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
                    {threads.length === 0 ? 'No employer conversations yet' : 'No matching conversations'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => openChat(thread)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${activeChat?.thread.id === thread.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                    >
                      <div className="flex items-start space-x-3">
                        <CompanyLogo
                          companyName={thread.companyName}
                          companyLogoUrl={thread.companyLogoUrl}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {thread.employerName}
                            </p>
                            {thread.unreadCount > 0 && (
                              <div className="bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mb-1">
                            {thread.companyName}
                          </p>
                          <p className="text-xs font-medium text-gray-700 truncate mb-1">
                            {thread.jobTitle}
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
                      <CompanyLogo
                        companyName={activeChat.thread.companyName}
                        companyLogoUrl={activeChat.thread.companyLogoUrl}
                        size="md"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {activeChat.thread.employerName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {activeChat.thread.companyName} • {activeChat.thread.jobTitle}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active Chat
                    </Badge>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4">
                  {activeChat.messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Your Conversation</h3>
                      <p className="text-gray-600">
                        Send a message to begin chatting with this employer.
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
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                              }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className={`text-xs ${message.senderType === 'admin' ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                {formatMessageTime(message.createdAt)}
                              </span>
                              {message.senderType === 'admin' && (
                                <div className="ml-2">
                                  {message.readAt ? (
                                    <CheckCircle className="h-3 w-3 text-blue-200" />
                                  ) : (
                                    <Clock className="h-3 w-3 text-blue-200" />
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
                      className="bg-blue-600 hover:bg-blue-700"
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
                    Choose an employer from the list to start chatting.
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
            All employer conversations are monitored and logged for quality assurance.
          </p>
        </div>
      </div>
    </div>
  );
}