'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CompanyLogo } from '@/components/common/CompanyLogo';
import CurrentUserProfilePicture from '@/components/common/CurrentUserProfilePicture';
import { UserProfilePicture } from '@/components/common/UserProfilePicture';
import {
  Check,
  CheckCircle,
  Building2
} from '@/components/icons';

export interface ChatMessage {
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

export interface ChatData {
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
  employerProfilePicture?: string;
  companyLogoUrl?: string;
  // Concierge information
  conciergeName?: string;
  conciergePicture?: string;
  conciergeTitle?: string;
}

interface ConciergeChatProps {
  chatData: ChatData;
  messages: ChatMessage[];
  currentUserType: 'admin' | 'employer';
  currentUserId: string;
  onSendMessage: (message: string, fileData?: { url: string; name: string; size: number }) => Promise<void>;
  onMarkAsRead?: (messageIds: string[]) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

const ConciergeChat: React.FC<ConciergeChatProps> = ({
  chatData,
  messages,
  currentUserType,
  currentUserId,
  onSendMessage,
  onMarkAsRead,
  isLoading = false,
  className = ''
}) => {
  // Debug chat data - commented out to reduce console noise
  // console.log('🔍 CONCIERGE CHAT DATA DEBUG:', {
  //   companyLogoUrl: chatData.companyLogoUrl,
  //   conciergePicture: chatData.conciergePicture,
  //   conciergeName: chatData.conciergeName,
  //   adminId: chatData.adminId,
  //   companyName: chatData.companyName
  // });

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Debug logging for layout issues
    console.log('🔍 LAYOUT DEBUG:', {
      messagesCount: messages.length,
      chatContainerHeight: chatContainerRef.current?.clientHeight,
      chatContainerScrollHeight: chatContainerRef.current?.scrollHeight,
      inputVisible: document.querySelector('.flex-shrink-0.border-t.p-4') !== null
    });

    // Only scroll to bottom on initial load or when user sends a message
    // Don't auto-scroll on background updates to prevent page jumping
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const isFromCurrentUser = lastMessage.senderId === currentUserId;

      // Only scroll if it's the user's own message or if it's the first load
      if (isFromCurrentUser) {
        scrollToBottom();
      }
    }
  }, [messages, currentUserId]);

  useEffect(() => {
    // Mark unread messages as read
    const unreadMessageIds = messages
      .filter(msg =>
        msg.senderType !== currentUserType &&
        !msg.readAt
      )
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0 && onMarkAsRead) {
      onMarkAsRead(unreadMessageIds);
    }
  }, [messages, currentUserType, onMarkAsRead]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Here you would typically upload the file to your storage service
    // For now, we'll just show an alert
    alert('File upload functionality would be implemented here');

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const renderMessage = (message: ChatMessage, index: number) => {
    // Clear logic: messages from current user type appear on the right
    const isOwnMessage = (currentUserType === 'admin' && message.senderType === 'admin') ||
      (currentUserType === 'employer' && message.senderType === 'employer');

    const showDateSeparator = index === 0 ||
      formatDate(message.createdAt) !== formatDate(messages[index - 1].createdAt);

    console.log('🔍 MESSAGE DEBUG:', {
      messageId: message.id,
      senderId: message.senderId,
      senderType: message.senderType,
      currentUserId,
      currentUserType,
      isOwnMessage
    });

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
            {/* Show avatar on both sides now */}
            <div className="flex-shrink-0">
              {message.senderType === 'admin' ? (
                <UserProfilePicture
                  userId={message.senderId}
                  userName={message.senderName || 'Admin'}
                  profilePictureUrl={message.senderAvatar || null}
                  size="sm"
                />
              ) : (
                <CurrentUserProfilePicture
                  name={chatData.employerName || 'Employer'}
                  size="sm"
                  className="w-8 h-8"
                />
              )}
            </div>

            <div className={`rounded-lg px-3 py-2 ${isOwnMessage
              ? 'bg-gradient-to-br from-brand-teal to-brand-teal-light text-white'
              : message.senderType === 'admin'
                ? 'bg-brand-teal/5 text-brand-teal border border-brand-teal/20'
                : 'bg-gray-100 text-gray-900'
              }`}>
              {!isOwnMessage && (
                <div className={`text-xs mb-1 font-medium ${message.senderType === 'admin' ? 'text-brand-teal' : 'text-gray-600'
                  }`}>
                  {message.senderType === 'admin'
                    ? (message.senderName || 'SAAS Admin')
                    : (chatData.employerName || 'Employer')
                  }
                </div>
              )}

              <div className="text-sm whitespace-pre-wrap">{message.message}</div>

              {message.messageType === 'file' && message.fileName && (
                <div className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate">{message.fileName}</span>
                    {message.fileSize && (
                      <span className="text-gray-500">
                        ({(message.fileSize / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                  {message.fileUrl && (
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Download
                    </a>
                  )}
                </div>
              )}

              <div className={`flex items-center justify-between mt-1 text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'
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

  return (
    <Card ref={chatContainerRef} className={`flex flex-col h-[600px] ${className}`}>
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center space-x-3">
          <CompanyLogo
            companyName={chatData.companyName || 'Company'}
            companyLogoUrl={chatData.companyLogoUrl}
            size="sm"
          />
          <div className="flex-1">
            <CardTitle className="text-lg">
              {chatData.jobTitle && chatData.jobTitle !== 'Chat0' && !chatData.jobTitle.match(/^Chat\d+$/)
                ? chatData.jobTitle
                : 'Concierge Chat'}
            </CardTitle>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{chatData.companyName}</span>
              <Badge variant="outline" className="text-xs">
                {currentUserType === 'admin' ? 'Admin Chat' : 'Employer Chat'}
              </Badge>
              {chatData.status === 'active' && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Active
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 p-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 120px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner size="md" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-2xl mb-2">💬</div>
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message, index) => renderMessage(message, index))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t p-4" style={{ minHeight: '60px', position: 'sticky', bottom: '0', backgroundColor: 'white' }}>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
            >
              <Building2 className="h-4 w-4" />
            </Button>

            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
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

export default ConciergeChat;