'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/ui/toast';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle
} from '@/components/icons';
import { ConciergeProfilePicture } from '@/components/common/ConciergeProfilePicture';

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderType: 'admin' | 'seeker';
  message: string;
  messageType: 'text' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  readAt?: string;
  createdAt: string;
}

interface ChatData {
  id: string;
  jobId: string;
  seekerId: string;
  adminId?: string;
  conciergeName?: string;
  conciergePicture?: string;
  conciergeTitle?: string;
}

interface JobDetails {
  id: string;
  title: string;
  companyName: string;
  status: string;
}

export default function SeekerConciergeChatPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();

  const jobId = params.jobId as string;
  const chatRoomId = params.chatRoomId as string;

  // State
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Load chat data and messages
  useEffect(() => {
    loadChatData();
  }, [jobId, chatRoomId]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [chatData]);

  const loadChatData = async () => {
    setIsLoading(true);
    try {
      // Load chat data using the specific chat room ID
      const chatResponse = await fetch(`/api/seeker/concierge-chat/${jobId}/${chatRoomId}`);

      if (chatResponse.ok) {
        const chatResult = await chatResponse.json();
        setChatData(chatResult.chat);
        setMessages(chatResult.messages || []);

        // Load job details
        const jobResponse = await fetch(`/api/jobs/${jobId}/details`);
        if (jobResponse.ok) {
          const jobResult = await jobResponse.json();
          setJobDetails(jobResult.job);
        }
      } else if (chatResponse.status === 404) {
        addToast({
          title: "Chat Not Found",
          description: "This concierge chat is not available or you don't have access to it.",
          variant: "destructive",
          duration: 5000
        });
        router.push('/seeker/dashboard');
      } else {
        throw new Error('Failed to load chat');
      }
    } catch (error) {
      console.error('Error loading chat data:', error);
      addToast({
        title: "Error",
        description: "Failed to load chat data",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!chatData) return;

    try {
      const response = await fetch(`/api/seeker/concierge-chat/${jobId}/${chatRoomId}/messages`);
      if (response.ok) {
        const result = await response.json();
        setMessages(result.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending || !chatData) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/seeker/concierge-chat/${jobId}/${chatRoomId}/messages`, {
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
        setMessages(prev => [...prev, result.message]);
        setNewMessage('');

        addToast({
          title: "Message Sent",
          description: "Your message has been sent to the concierge team.",
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/seeker/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <MessageSquare className="h-6 w-6 mr-2 text-blue-600" />
                Concierge Chat
              </h1>
              {jobDetails && (
                <p className="text-gray-600">
                  {jobDetails.title} at {jobDetails.companyName}
                </p>
              )}
            </div>
          </div>

          {chatData?.conciergeName && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="font-medium text-gray-900">{chatData.conciergeName}</p>
                <p className="text-sm text-gray-500">{chatData.conciergeTitle || 'Concierge Specialist'}</p>
              </div>
              {chatData.adminId && (
                <ConciergeProfilePicture
                  conciergeId={chatData.adminId}
                  conciergeName={chatData.conciergeName}
                  size="md"
                  className="w-10 h-10"
                />
              )}
            </div>
          )}
        </div>

        {/* Chat Interface */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Chat Messages
              </CardTitle>
              <Badge variant="outline" className="text-green-600 border-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active Chat
              </Badge>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Your Conversation</h3>
                <p className="text-gray-600">
                  Send a message to begin chatting with your concierge specialist.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === 'seeker' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.senderType === 'seeker'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                        }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs ${message.senderType === 'seeker' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                          {formatMessageTime(message.createdAt)}
                        </span>
                        {message.senderType === 'seeker' && (
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
          <div className="p-4 border-t">
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
        </Card>

        {/* Chat Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p className="flex items-center justify-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            This chat is monitored by our concierge team during business hours (9 AM - 6 PM EST)
          </p>
        </div>
      </div>
    </div>
  );
}