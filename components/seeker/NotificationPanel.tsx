'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  Mail,
  User,
  Building2,
  CreditCard,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useNotificationCenter } from '@/components/providers/NotificationCenterProvider'
import type { SeekerNotification } from '@/components/providers/NotificationCenterProvider'
import { getNotificationPriorityStyle } from '@/lib/notificationStyles'

type Notification = SeekerNotification

export function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    isLoading,
    hasLoaded,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead
  } = useNotificationCenter()
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const recentNotifications = (notifications || []).slice(0, 5)
  const loading = isLoading || !hasLoaded

  const handleMarkAsRead = async (notificationId: string) => {
    if (markingId === notificationId || isMarkingAll) return
    setMarkingId(notificationId)
    try {
      await markNotificationAsRead(notificationId)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    } finally {
      setMarkingId((current) => (current === notificationId ? null : current))
    }
  }

  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || !recentNotifications.length) return
    setIsMarkingAll(true)
    try {
      await markAllNotificationsAsRead()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    } finally {
      setIsMarkingAll(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'job_approved': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'job_rejected': return <XCircle className="h-4 w-4 text-red-600" />
      case 'job_under_review': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'new_application': return <Users className="h-4 w-4 text-blue-600" />
      case 'job_invitation': return <Mail className="h-4 w-4 text-purple-600" />
      case 'application_status_update': return <TrendingUp className="h-4 w-4 text-indigo-600" />
      case 'seeker_payment_confirmation': return <CreditCard className="h-4 w-4 text-green-600" />
      case 'seeker_welcome': return <User className="h-4 w-4 text-blue-600" />
      case 'system_alert': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default: return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-gray-700" />
            <CardTitle className="text-xl font-bold text-gray-900">Notifications</CardTitle>
          </div>
          <div className="animate-pulse bg-gray-200 rounded h-4 w-16"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                <div className="animate-pulse bg-gray-200 rounded-full h-8 w-8"></div>
                <div className="flex-1 space-y-2">
                  <div className="animate-pulse bg-gray-200 rounded h-4 w-3/4"></div>
                  <div className="animate-pulse bg-gray-200 rounded h-3 w-full"></div>
                  <div className="animate-pulse bg-gray-200 rounded h-3 w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-gray-700" />
          <CardTitle className="text-xl font-bold text-gray-900">Notifications</CardTitle>
          {unreadCount > 0 && (
            <Badge className="bg-brand-coral text-white">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        {recentNotifications.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAll}
          >
            {isMarkingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Marking...
              </>
            ) : (
              'Mark all as read'
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {recentNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
            <p className="font-medium text-gray-700">No notifications yet</p>
            <p className="text-sm text-gray-500 mb-4">We'll notify you when something important happens</p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto pr-2">
            <div className="space-y-3">
              {recentNotifications.map((notification) => {
                const priorityStyle = getNotificationPriorityStyle(notification.priority)
                return (
                <div 
                  key={notification.id} 
                  className={cn(
                    'flex items-start space-x-3 p-3 border rounded-lg transition-colors',
                    notification.read ? 'border-gray-200 bg-white' : priorityStyle.panelAccent
                  )}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={cn('text-xs px-2 py-1 rounded-full', priorityStyle.tag)}>
                            {notification.priority}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-2"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markingId === notification.id || isMarkingAll}
                        >
                          {markingId === notification.id ? (
                            <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                          ) : (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <span className="sr-only">Mark as read</span>
                        </Button>
                      )}
                    </div>
                    {notification.actionUrl && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 mt-2 h-auto"
                        asChild
                      >
                        <Link
                          href={notification.actionUrl}
                          onClick={() => {
                            if (!notification.read) {
                              markNotificationAsRead(notification.id)
                            }
                          }}
                        >
                          View details
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}
        <div className="mt-4 text-center">
          <Button asChild variant="outline" size="sm">
            <Link href="/seeker/notifications">
              View all notifications
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
