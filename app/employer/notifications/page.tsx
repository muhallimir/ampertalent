'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApplicantProfilePicture } from '@/components/common/ApplicantProfilePicture'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import {
  Bell,
  Search,
  Filter,
  Check,
  Trash2,
  FileText,
  CreditCard,
  User,
  Briefcase,
  AlertCircle
} from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  timestamp: string
  timeAgo: string
  actionUrl: string
  priority: 'high' | 'normal'
  applicantId?: string
  applicantName?: string
  applicantProfilePictureUrl?: string
}

export default function EmployerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [searchTerm])

  // Load notifications from API
  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      
      // Check for impersonation context only on client side
      const headers: HeadersInit = {}
      
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }
      
      const response = await fetch('/api/employer/notifications', { headers })
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      } else {
        console.error('Failed to load notifications')
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_application': return FileText
      case 'low_credits': return CreditCard
      case 'low_applications': return User
      case 'job_expiring': return Briefcase
      case 'system': return AlertCircle
      default: return Bell
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_application': return 'bg-blue-100 text-blue-600'
      case 'low_credits': return 'bg-green-100 text-green-600'
      case 'low_applications': return 'bg-purple-100 text-purple-600'
      case 'job_expiring': return 'bg-orange-100 text-orange-600'
      case 'system': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getNotificationEmoji = (type: string) => {
    switch (type) {
      case 'new_application': return '👤'
      case 'job_expiring': return '⏰'
      case 'low_applications': return '📊'
      case 'low_credits': return '💳'
      default: return '🔔'
    }
  }

  const markAsRead = async (id: string) => {
    try {
      // Check for impersonation context only on client side
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch('/api/employer/notifications', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ notificationId: id, markAsRead: true })
      })

      if (response.ok) {
        // Update local state only after successful API call
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === id ? { ...notif, isRead: true } : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else {
        console.error('Failed to mark notification as read')
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      // Check for impersonation context only on client side
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch('/api/employer/notifications', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ markAllAsRead: true })
      })

      if (response.ok) {
        // Update local state only after successful API call
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, isRead: true }))
        )
        setUnreadCount(0)
      } else {
        console.error('Failed to mark all notifications as read')
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const deleteNotification = (id: string) => {
    const notification = notifications.find(n => n.id === id)
    if (notification && !notification.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }

  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch = notif.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                         notif.message.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    const matchesType = filterType === 'all' || notif.type === filterType
    const matchesReadStatus = !showUnreadOnly || !notif.isRead
    
    return matchesSearch && matchesType && matchesReadStatus
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">
            Stay updated with your hiring activities and account status
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-sm">
            {unreadCount} unread
          </Badge>
          <Button onClick={markAllAsRead} variant="outline" size="sm">
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="new_application">Applications</SelectItem>
                    <SelectItem value="low_credits">Billing</SelectItem>
                    <SelectItem value="low_applications">Job Performance</SelectItem>
                    <SelectItem value="job_expiring">Job Expiring</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={(e) => setShowUnreadOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>Unread only</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications found</h3>
              <p className="text-gray-600">
                {debouncedSearchTerm || filterType !== 'all' || showUnreadOnly
                  ? 'Try adjusting your search or filters'
                  : 'You\'re all caught up! New notifications will appear here.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type)
            
            return (
              <Card
                key={notification.id}
                className={`hover:shadow-md transition-shadow ${
                  !notification.isRead
                    ? notification.priority === 'high'
                      ? 'border-l-4 border-l-brand-coral bg-brand-coral-light/5'
                      : 'border-l-4 border-l-blue-400 bg-blue-50/50'
                    : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Show profile picture for application notifications, icon for others */}
                      {notification.type === 'new_application' && notification.applicantId ? (
                        <ApplicantProfilePicture
                          applicantId={notification.applicantId}
                          applicantName={notification.applicantName || 'Applicant'}
                          profilePictureUrl={notification.applicantProfilePictureUrl || null}
                          size="md"
                        />
                      ) : (
                        <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className={`text-sm font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <div className={`w-2 h-2 rounded-full ${
                              notification.priority === 'high' ? 'bg-brand-coral' : 'bg-blue-500'
                            }`}></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4">
                          <span className="text-xs text-gray-500">
                            {notification.timeAgo}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {notification.type.replace('_', ' ')}
                          </Badge>
                          {notification.priority === 'high' && (
                            <Badge className="text-xs bg-brand-coral text-white">
                              High Priority
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {notification.actionUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = notification.actionUrl}
                        >
                          View
                        </Button>
                      )}
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
