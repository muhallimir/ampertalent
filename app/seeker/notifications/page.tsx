'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import Link from 'next/link'
import { useNotificationCenter } from '@/components/providers/NotificationCenterProvider'
import type { SeekerNotification } from '@/components/providers/NotificationCenterProvider'
import { cn } from '@/lib/utils'
import { getNotificationPriorityStyle } from '@/lib/notificationStyles'
import {
  Bell,
  Check,
  Trash2,
  Search,
  Calendar,
  Briefcase,
  MessageSquare,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

type Notification = SeekerNotification

export default function SeekerNotifications() {
  const {
    notifications,
    unreadCount,
    isLoading: notificationsLoading,
    hasLoaded,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    refreshNotifications,
    updateNotifications
  } = useNotificationCenter()
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set())
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const effectiveLoading = notificationsLoading || !hasLoaded

  useEffect(() => {
    refreshNotifications({ showSpinner: true })
  }, [refreshNotifications])

  useEffect(() => {
    const handleFocus = () => {
      refreshNotifications({ showSpinner: false })
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshNotifications])

  const markAsRead = async (notificationId: string) => {
    if (markingIds.has(notificationId) || isMarkingAll) return
    setMarkingIds((prev) => {
      const next = new Set(prev)
      next.add(notificationId)
      return next
    })

    try {
      await markNotificationAsRead(notificationId)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev)
        next.delete(notificationId)
        return next
      })
    }
  }

  const markAllAsRead = async () => {
    if (isMarkingAll || notifications.length === 0) return
    setIsMarkingAll(true)
    try {
      await markAllNotificationsAsRead()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    } finally {
      setIsMarkingAll(false)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    // For now, just hide the notification locally
    // In a full implementation, you'd have a DELETE endpoint
    updateNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    )
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application_update':
        return <Briefcase className="h-5 w-5 text-brand-teal" />
      case 'job_match':
        return <Search className="h-5 w-5 text-brand-coral" />
      case 'job_invitation':
        return <Briefcase className="h-5 w-5 text-purple-500" />
      case 'message':
        return <MessageSquare className="h-5 w-5 text-blue-500" />
      case 'system':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read
    if (filter === 'read') return notif.read
    return true
  })

  const readCount = notifications.length - unreadCount

  if (effectiveLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-2">
            Stay updated on your job applications and new opportunities.
          </p>
        </div>
        <div className="flex space-x-3">
          {unreadCount > 0 && (
            <Button 
              onClick={markAllAsRead}
              variant="outline" 
              className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
              disabled={isMarkingAll}
            >
              {isMarkingAll ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Marking...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark All Read
                </>
              )}
            </Button>
          )}
          <Button asChild className="bg-brand-teal hover:bg-brand-teal/90">
            <Link href="/seeker/jobs">
              <Search className="h-4 w-4 mr-2" />
              Browse Jobs
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'all', label: 'All', count: notifications.length },
          { key: 'unread', label: 'Unread', count: unreadCount },
          { key: 'read', label: 'Read', count: readCount }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as "all" | "unread" | "read")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-brand-teal shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card className="shadow-sm border border-gray-100">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-teal-light rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="h-10 w-10 text-brand-teal" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {filter === 'unread' 
                  ? 'You\'re all caught up! No new notifications to review.'
                  : 'You don\'t have any notifications yet. Start applying to jobs to receive updates.'
                }
              </p>
              <Button asChild className="bg-brand-teal hover:bg-brand-teal/90">
                <Link href="/seeker/jobs">Browse Jobs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {filteredNotifications.map((notification) => {
            const priorityStyle = getNotificationPriorityStyle(notification.priority)
            return (
              <Card 
                key={notification.id} 
                className={cn(
                  'shadow-sm hover:shadow-md transition-all duration-200 border-l-4',
                  notification.read ? 'bg-white border-l-gray-200' : priorityStyle.panelAccent
                )}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex space-x-4 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className={`text-lg font-semibold ${
                            notification.read ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className={cn('w-2 h-2 rounded-full', priorityStyle.dot)}></div>
                          )}
                        </div>
                        <p className={`text-sm ${
                          notification.read ? 'text-gray-500' : 'text-gray-700'
                        } mb-3`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                            {new Date(notification.createdAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          <Badge variant="outline" className={cn('text-xs capitalize', priorityStyle.tag)}>
                            {notification.priority || 'default'} priority
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {notification.actionUrl && (
                        <Button asChild size="sm" variant="outline" className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white">
                          <Link
                            href={notification.actionUrl}
                            onClick={() => {
                              if (!notification.read) {
                                markNotificationAsRead(notification.id)
                              }
                            }}
                          >
                            View
                          </Link>
                        </Button>
                      )}
                      {!notification.read && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                          className="text-brand-teal hover:bg-brand-teal-light"
                          disabled={markingIds.has(notification.id) || isMarkingAll}
                        >
                          {markingIds.has(notification.id) ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteNotification(notification.id)}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
