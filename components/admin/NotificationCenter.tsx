'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Building2
} from 'lucide-react'

interface NotificationStats {
  totalSent: number
  successRate: number
  byType: Record<string, number>
  recentFailures: Array<{
    type: string
    email: string
    error: string
    timestamp: Date
  }>
}

interface AdminNotification {
  id: string
  type: 'system_alert' | 'user_registration' | 'job_submission' | 'security_alert' | 'backup_complete' | 'new_application'
  title: string
  message: string
  timestamp: Date
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  recipient: string
  status: 'sent' | 'delivered' | 'failed' | 'pending'
  userId?: string
  userName?: string
  userProfilePictureUrl?: string
}

export function NotificationCenter() {
  const router = useRouter()
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentLimit, setCurrentLimit] = useState(20)

  useEffect(() => {
    loadStats()
    loadNotifications()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/notifications?limit=50')
      if (response.ok) {
        const data = await response.json()
        
        // Calculate stats from the real data
        const totalSent = data.notifications.length
        const deliveredCount = data.notifications.filter((n: AdminNotification) => n.status === 'delivered').length
        const successRate = totalSent > 0 ? Math.round((deliveredCount / totalSent) * 100 * 10) / 10 : 0
        
        // Transform byType data to match expected format
        const byType: Record<string, number> = {}
        Object.entries(data.stats.byType).forEach(([key, value]) => {
          byType[key.replace('_', ' ')] = value as number
        })
        
        const realStats: NotificationStats = {
          totalSent,
          successRate,
          byType,
          recentFailures: [] // Could be enhanced to track actual failures
        }
        
        setStats(realStats)
      } else {
        console.error('Failed to fetch notification stats')
      }
    } catch (error) {
      console.error('Error loading notification stats:', error)
    }
  }

  const loadNotifications = async (limit = currentLimit) => {
    try {
      const response = await fetch(`/api/admin/notifications?limit=${limit}`)
      if (response.ok) {
        const data = await response.json()
        const realNotifications = data.notifications.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }))
        setNotifications(realNotifications)
      } else {
        console.error('Failed to fetch notifications')
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const handleMarkRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'markRead', notificationId })
      })
      
      if (response.ok) {
        // Update local state to mark specific notification as read
        setNotifications(prev => prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        ))
        // Reload stats to update unread count
        loadStats()
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    const newLimit = currentLimit + 20
    setCurrentLimit(newLimit)
    await loadNotifications(newLimit)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system_alert': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'user_registration': return <User className="h-4 w-4 text-blue-600" />
      case 'job_submission': return <Building2 className="h-4 w-4 text-green-600" />
      case 'security_alert': return <XCircle className="h-4 w-4 text-orange-600" />
      case 'backup_complete': return <CheckCircle className="h-4 w-4 text-green-600" />
      default: return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleViewDetails = (notification: AdminNotification) => {
    // Navigate based on notification type
    switch (notification.type) {
      case 'job_submission':
        // Navigate to pending jobs or specific job if we have an ID
        if (notification.id.startsWith('job_pending_')) {
          router.push('/admin/jobs?status=pending_vetting')
        } else {
          router.push('/admin/job-posts')
        }
        break
      case 'new_application':
        // Navigate to applications or specific application
        router.push('/admin/seekers')
        break
      case 'user_registration':
        // Navigate to users page or specific user if we have userId
        if (notification.userId) {
          router.push(`/admin/users?search=${notification.userName || notification.userId}`)
        } else {
          router.push('/admin/users')
        }
        break
      case 'system_alert':
      case 'security_alert':
        // Navigate to logs or settings
        router.push('/admin/logs')
        break
      case 'backup_complete':
        // Navigate to settings or logs
        router.push('/admin/settings')
        break
      default:
        // Default to admin dashboard
        router.push('/admin/dashboard')
        break
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Clock className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification Center</h1>
        <p className="text-gray-600">
          Monitor and manage admin notifications and alerts
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <Card className="shadow-sm border border-gray-100">
          <CardHeader className="bg-gradient-to-r from-brand-teal to-brand-teal-light text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Notification Statistics</span>
            </CardTitle>
            <CardDescription className="text-white/90">
              Performance metrics for the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalSent}</div>
                <div className="text-sm text-gray-600">Total Sent</div>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(stats.byType).length}
                </div>
                <div className="text-sm text-gray-600">Notification Types</div>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.recentFailures.length}
                </div>
                <div className="text-sm text-gray-600">Recent Failures</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Notifications by Type</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <span className="text-sm capitalize font-medium">{type.replace('_', ' ')}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications */}
      <Card className="shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Bell className="h-5 w-5" />
            <span>Recent Notifications</span>
          </CardTitle>
          <CardDescription>
            Latest admin notifications and system alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className={`border rounded-lg p-4 hover:shadow-sm transition-shadow ${!notification.read ? 'bg-blue-50/50 border-blue-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getTypeIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                        <Badge className={getPriorityColor(notification.priority)}>
                          {notification.priority.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(notification.status)}>
                          {notification.status}
                        </Badge>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {notification.recipient}
                        </span>
                        <span>{formatTimestamp(notification.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {!notification.read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkRead(notification.id)}
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(notification)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading...' : 'Load More Notifications'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}