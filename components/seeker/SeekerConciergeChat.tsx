'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CompanyLogo } from '@/components/common/CompanyLogo';
import {
  User,
  Shield,
  Clock,
  Check,
  CheckCircle,
  MessageSquare
} from '@/components/icons';

interface SeekerChatData {
  id: string;
  jobId: string;
  seekerId: string;
  adminId?: string;
  conciergeName?: string;
  conciergePicture?: string;
  conciergeTitle?: string;
}

interface SeekerChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderType: 'admin' | 'seeker';
  message: string;
  messageType: 'text' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  readAt?: Date;
  createdAt: Date;
}

interface SeekerConciergeChatProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  currentUserId: string;
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

const SeekerConciergeChat: React.FC<SeekerConciergeChatProps> = ({
  jobId,
  jobTitle,
  companyName,
  currentUserId,
  onSendMessage,
  isLoading = false,
  className = ''
}) => {
  const [chatData, setChatData] = useState<SeekerChatData | null>(null);
  const [messages, setMessages] = useState<SeekerChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatData();
  }, [jobId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatData = async () => {
    try {
      setIsChatLoading(true);
      const response = await fetch(`/api/seeker/jobs/${jobId}/concierge-chat`);

      if (response.ok) {
        const data = await response.json();
        setChatData(data.chat);
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage('');

      // Reload messages to show the new message
      await loadChatData();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    }).format(messageDate);
  };

  const renderMessage = (message: SeekerChatMessage, index: number) => {
    const isOwnMessage = message.senderId === currentUserId;
    const showDateSeparator = index === 0 ||
      formatDate(message.createdAt) !== formatDate(messages[index - 1].createdAt);

    return (
      <div key={message.id}>
        {showDateSeparator && (
          <div className="flex items-center justify-center my-4">
            <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
              {formatDate(message.createdAt)}
            </div>
          </div>
        )}

        <div className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex items-start space-x-2 max-w-[80%] ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
            {!isOwnMessage && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            )}

            <div className={`rounded-lg px-3 py-2 ${
              isOwnMessage
                ? 'bg-blue-500 text-white'
                : 'bg-blue-50 text-blue-900 border border-blue-200'
            }`}>
              {!isOwnMessage && chatData?.conciergeName && (
                <div className="text-xs mb-1 font-medium text-blue-700">
                  {chatData.conciergeName} {chatData.conciergeTitle && `• ${chatData.conciergeTitle}`}
                </div>
              )}

              <div className="text-sm whitespace-pre-wrap">{message.message}</div>

              <div className={`flex items-center justify-between mt-1 text-xs ${
                isOwnMessage ? 'text-blue-100' : 'text-gray-500'
              }`}>
                <span>{formatTime(message.createdAt)}</span>
                {isOwnMessage && (
                  <div className="flex items-center">
                    {message.readAt ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isChatLoading) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <LoadingSpinner size="md" />
          <p className="text-sm text-gray-600 mt-2">Loading concierge chat...</p>
        </CardContent>
      </Card>
    );
  }

  if (!chatData) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Concierge Chat Not Available</h3>
          <p className="text-gray-600">
            This job doesn't have concierge services enabled, or you're not eligible for concierge chat.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`flex flex-col h-[500px] ${className}`}>
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center space-x-3">
          <CompanyLogo
            companyName={chatData.conciergeName || 'Concierge'}
            companyLogoUrl={chatData.conciergePicture}
            size="sm"
          />
          <div className="flex-1">
            <CardTitle className="text-lg">
              {chatData.conciergeName || 'Concierge Specialist'}
            </CardTitle>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{companyName} • {jobTitle}</span>
              {chatData.conciergeTitle && (
                <span>• {chatData.conciergeTitle}</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-2xl mb-2">💬</div>
                <p>Start a conversation with your concierge specialist!</p>
                <p className="text-sm">Get personalized help with your application.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message, index) => renderMessage(message, index))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t p-4">
          <div className="flex items-center space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask your concierge specialist..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isSending}
              className="flex-1"
            />

            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              size="sm"
            >
              {isSending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SeekerConciergeChat;