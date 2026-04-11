'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ApplicantProfilePicture } from '@/components/common/ApplicantProfilePicture'
import { useUserProfile } from '@/hooks/useUserProfile'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import { useSocket } from '@/hooks/useSocket'
import { handleUserLogout } from '@/lib/auth-utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useImpersonationAware } from '@/components/admin/ImpersonationContext'
import {
  Building2,
  Briefcase,
  FileText,
  User,
  Settings,
  CreditCard,
  Users,
  Plus,
  LogOut,
  HelpCircle,
  BellRing,
  MessageSquare
} from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  timestamp: string
  timeAgo: string
  isRead: boolean
  actionUrl: string
  priority: 'high' | 'normal'
  applicantId?: string
  applicantName?: string
  applicantProfilePictureUrl?: string
}

const navigation = [
  { name: 'Dashboard', href: '/employer/dashboard', icon: Building2 },
  { name: 'My Jobs', href: '/employer/jobs', icon: Briefcase },
  { name: 'Applications', href: '/employer/applications', icon: FileText },
  { name: 'Browse Talent', href: '/employer/talent', icon: Users },
  { name: 'Messages', href: '/employer/messages', icon: MessageSquare },
  { name: 'Company Profile', href: '/employer/company-profile', icon: User },
]

const ctaNavigation = [
  { name: 'Post Job', href: '/employer/jobs/new', icon: Plus },
]

export function EmployerNav() {
  const user = useUser()
  const { signOut } = useClerk()
  const pathname = usePathname()
  const router = useRouter()

  // Safe destructuring with fallback values
  let isImpersonating = false
  let impersonatedUser = null
  try {
    const impersonationData = useImpersonationAware()
    isImpersonating = impersonationData?.isImpersonating || false
    impersonatedUser = impersonationData?.impersonatedUser || null
  } catch (error) {
    console.error('Error getting impersonation data:', error)
    isImpersonating = false
    impersonatedUser = null
  }

  const { profile } = useUserProfile()
  const { socket } = useSocket()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [messageUnreadCount, setMessageUnreadCount] = useState(0)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [notificationError, setNotificationError] = useState<string | null>(null)

  // OPTIMIZATION: Use ref to prevent duplicate requests
  const notificationsContentLoadedRef = useRef(false)
  const notificationsCountLoadedRef = useRef(false)
  const messageCountLoadedRef = useRef(false)

  // Use impersonated user info if available, otherwise use actual user
  const displayUser = isImpersonating && impersonatedUser ? {
    displayName: impersonatedUser.name,
    primaryEmail: impersonatedUser.email,
    profileImageUrl: profile?.presignedProfilePictureUrl || profile?.profilePictureUrl
  } : {
    displayName: profile?.name || profile?.companyName,
    primaryEmail: profile?.email,
    profileImageUrl: profile?.presignedProfilePictureUrl || profile?.profilePictureUrl
  }

  // OPTIMIZATION: Load only notification COUNT (lightweight)
  const loadNotificationCount = useCallback(async () => {
    if (notificationsCountLoadedRef.current) return

    notificationsCountLoadedRef.current = true

    try {
      const headers: HeadersInit = {}

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      // Request only count (add query param to API if available, or load minimal data)
      const response = await fetch('/api/employer/notifications?count_only=true', { headers })
      const text = await response.text()

      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        window.location.href = '/sign-in'
        return
      }

      if (response.ok) {
        const data = JSON.parse(text)
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error loading notification count:', error)
      notificationsCountLoadedRef.current = false
    }
  }, [])

  // OPTIMIZATION: Load FULL notifications content only when dropdown opens
  const loadNotificationsContent = useCallback(async () => {
    if (isLoadingNotifications || notificationsContentLoadedRef.current) return

    setIsLoadingNotifications(true)
    setNotificationError(null)
    notificationsContentLoadedRef.current = true

    try {
      console.log('🔔 EmployerNav: Starting notification load')

      const headers: HeadersInit = {}

      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          console.log('🎭 EmployerNav: Adding impersonation headers')
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      console.log('🌐 EmployerNav: Fetching from /api/employer/notifications')
      const response = await fetch('/api/employer/notifications', { headers })
      const text = await response.text()

      console.log('📥 EmployerNav: Response received', {
        status: response.status,
        statusText: response.statusText,
        textLength: text.length,
        isHtml: text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')
      })

      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.error('❌ EmployerNav: HTML response (likely redirect to login)')
        window.location.href = '/sign-in'
        return
      }

      if (response.ok) {
        try {
          const data = JSON.parse(text)
          console.log('✅ EmployerNav: Parsed JSON response', {
            notificationCount: data.notifications?.length || 0,
            unreadCount: data.unreadCount || 0,
            hasNotifications: !!data.notifications
          })

          // Log each notification for debugging
          if (data.notifications && Array.isArray(data.notifications)) {
            data.notifications.forEach((notif: any, index: number) => {
              console.log(`📦 EmployerNav: Notification ${index + 1}/${data.notifications.length}`, {
                id: notif.id,
                type: notif.type,
                title: notif.title,
                message: notif.message?.substring(0, 50) + '...',
                isRead: notif.isRead,
                actionUrl: notif.actionUrl,
                dataKeys: Object.keys(notif.data || {})
              })
            })
          }

          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)
          console.log('✅ EmployerNav: Notification state updated')
        } catch (parseError) {
          console.error('❌ EmployerNav: JSON parse error', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            textPreview: text.substring(0, 200)
          })
          setNotificationError(`Failed to parse notification response: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
          notificationsContentLoadedRef.current = false
        }
      } else {
        console.error('❌ EmployerNav: API returned error status', {
          status: response.status,
          statusText: response.statusText,
          text: text.substring(0, 500)
        })
        setNotificationError(`API error: ${response.status} ${response.statusText}`)
        notificationsContentLoadedRef.current = false
      }
    } catch (error) {
      console.error('💥 EmployerNav: Unexpected error loading notifications', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      setNotificationError(`Error loading notifications: ${error instanceof Error ? error.message : String(error)}`)
      notificationsContentLoadedRef.current = false
    } finally {
      setIsLoadingNotifications(false)
    }
  }, [isLoadingNotifications])

  // OPTIMIZATION: Load message unread count efficiently
  const loadMessageUnreadCount = useCallback(async () => {
    if (messageCountLoadedRef.current) return

    messageCountLoadedRef.current = true

    try {
      const response = await fetch('/api/messages/unread-count')
      if (response.ok) {
        const data = await response.json()
        setMessageUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
      messageCountLoadedRef.current = false
    }
  }, [])

  // OPTIMIZATION: Initial load for notification count and message count
  useEffect(() => {
    if (user?.user?.id && profile?.role === 'employer') {
      loadNotificationCount()
      loadMessageUnreadCount()
    }
  }, [user?.user?.id, profile?.role, loadNotificationCount, loadMessageUnreadCount])

  // OPTIMIZATION: Polling for counts (notifications and messages)
  useEffect(() => {
    const interval = setInterval(() => {
      notificationsCountLoadedRef.current = false
      messageCountLoadedRef.current = false
      loadNotificationCount()
      loadMessageUnreadCount()
    }, 120000) // 2 minutes

    return () => clearInterval(interval)
  }, [loadNotificationCount, loadMessageUnreadCount])

  // Socket.IO for real-time message updates
  useEffect(() => {
    if (!socket) return

    const handleMessageReceived = (data: any) => {
      setMessageUnreadCount(prev => prev + 1)
    }

    socket.on('message_received', handleMessageReceived)

    return () => {
      socket.off('message_received', handleMessageReceived)
    }
  }, [socket])

  const markAllAsRead = async () => {
    try {
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
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
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
        body: JSON.stringify({ notificationId, markAsRead: true })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        ))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_application':
        return '👤'
      case 'job_expiring':
        return '⏰'
      case 'low_applications':
        return '📊'
      case 'low_credits':
        return '💳'
      default:
        return <BellRing className="h-4 w-4 text-gray-600 group-hover:text-white" />
    }
  }

  const getNotificationColor = (priority: string, isRead: boolean) => {
    if (isRead) return 'hover:shadow-md transition-all duration-200 cursor-pointer'

    switch (priority) {
      case 'high':
        return 'hover:shadow-md border-l-4 border-l-brand-coral bg-brand-coral-light/5 transition-all duration-200 cursor-pointer'
      default:
        return 'hover:shadow-md border-l-4 border-l-blue-400 bg-blue-50/50 transition-all duration-200 cursor-pointer'
    }
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-24 py-4">
          {/* Logo */}
          <Link href="/employer/dashboard" className="flex items-center">
            <Image
              src="/hmm_logo.png"
              alt="Hire My Mom"
              width={180}
              height={60}
              className="rounded-lg"
            />
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const isMessagesItem = item.name === 'Messages'

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative',
                    isActive
                      ? 'bg-brand-teal-light text-brand-teal'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                  title={isMessagesItem && messageUnreadCount > 0 ? `You have ${messageUnreadCount} unread ${messageUnreadCount === 1 ? 'message' : 'messages'}` : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {isMessagesItem && messageUnreadCount > 0 && (
                    <span className="ml-1 text-xs text-red-500">
                      ({messageUnreadCount})
                    </span>
                  )}
                </Link>
              )
            })}

            {/* CTA Button */}
            {ctaNavigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ml-4',
                    isActive
                      ? 'bg-brand-coral text-white shadow-md'
                      : 'bg-brand-coral text-white hover:bg-brand-coral/90 shadow-md'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Notifications & User Menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <DropdownMenu onOpenChange={(open) => {
              // OPTIMIZATION: Load full notification content only when dropdown opens
              if (open && !notificationsContentLoadedRef.current) {
                loadNotificationsContent()
              }
            }}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 w-12 rounded-full">
                  <BellRing className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-96" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-4 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-gray-900">Notifications</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
                      </span>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={markAllAsRead}
                          className="text-xs text-brand-teal hover:text-brand-teal hover:bg-brand-teal-light/20"
                        >
                          Mark All Read
                        </Button>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <div className="max-h-80 overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-teal mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
                    </div>
                  ) : notificationError ? (
                    <div className="p-4 bg-red-50 border border-red-200">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <BellRing className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800">Error Loading Notifications</p>
                          <p className="text-xs text-red-700 mt-1">{notificationError}</p>
                          <p className="text-xs text-gray-600 mt-2">Please check the browser console for more details (Press F12 or Cmd+Option+I)</p>
                          <button
                            onClick={() => {
                              setNotificationError(null)
                              notificationsContentLoadedRef.current = false
                              loadNotificationsContent()
                            }}
                            className="mt-2 text-xs text-red-700 hover:text-red-900 font-semibold underline"
                          >
                            Try Again
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <BellRing className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`group flex flex-col items-start p-4 space-y-2 hover:bg-brand-teal hover:text-white cursor-pointer ${getNotificationColor(notification.priority, notification.isRead)}`}
                        onClick={() => {
                          if (!notification.isRead) {
                            markAsRead(notification.id)
                          }
                          router.push(notification.actionUrl || '/employer/dashboard')
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            {notification.type === 'new_application' && notification.applicantId ? (
                              <ApplicantProfilePicture
                                applicantId={notification.applicantId}
                                applicantName={notification.applicantName || 'Applicant'}
                                profilePictureUrl={notification.applicantProfilePictureUrl || null}
                                size="sm"
                              />
                            ) : (
                              <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                            )}
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-brand-coral rounded-full"></div>
                            )}
                            <span className={`text-sm group-hover:text-white ${notification.isRead ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>
                              {notification.title}
                            </span>
                          </div>
                          <span className={`text-xs font-medium group-hover:text-white ${notification.priority === 'high' && !notification.isRead
                            ? 'text-brand-coral'
                            : 'text-gray-500'
                            }`}>
                            {notification.timeAgo}
                          </span>
                        </div>
                        <p className={`text-xs text-gray-600 leading-relaxed group-hover:text-white ${notification.type === 'new_application' && notification.applicantId ? 'ml-11' : 'ml-8'
                          }`}>
                          {notification.message}
                        </p>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>

                <div className="border-t p-2">
                  <DropdownMenuItem asChild>
                    <Link href="/employer/notifications" className="flex items-center justify-center w-full text-center p-3 hover:bg-gradient-to-r hover:from-brand-teal hover:to-brand-teal-light hover:text-white transition-all duration-200 rounded-md">
                      <span className="text-sm font-semibold text-brand-teal hover:text-white">See All Notifications</span>
                    </Link>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9 cursor-pointer">
                    <AvatarImage src={displayUser?.profileImageUrl || ''} alt="Profile" />
                    <AvatarFallback className="bg-brand-teal text-white">
                      {displayUser?.displayName?.charAt(0)?.toUpperCase() || displayUser?.primaryEmail?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {displayUser?.displayName || 'Employer'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {displayUser?.primaryEmail}
                    </p>
                    {isImpersonating && (
                      <p className="text-xs text-orange-600 font-medium">
                        (Admin View)
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/employer/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/employer/team" className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Team</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/employer/billing" className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Billing</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/employer/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help" className="flex items-center">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Help & Support</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => handleUserLogout(signOut)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden pb-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const isMessagesItem = item.name === 'Messages'

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative',
                    isActive
                      ? 'bg-brand-teal-light text-brand-teal'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                  title={isMessagesItem && messageUnreadCount > 0 ? `You have ${messageUnreadCount} unread ${messageUnreadCount === 1 ? 'message' : 'messages'}` : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {isMessagesItem && messageUnreadCount > 0 && (
                    <span className="ml-1 text-xs text-red-500">
                      ({messageUnreadCount})
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Mobile CTA Button */}
          <div className="w-full">
            {ctaNavigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-colors w-full',
                    isActive
                      ? 'bg-brand-coral text-white shadow-md'
                      : 'bg-brand-coral text-white hover:bg-brand-coral/90 shadow-md'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}