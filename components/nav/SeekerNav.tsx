'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useSocket } from '@/hooks/useSocket'
import { useNotificationCenter } from '@/components/providers/NotificationCenterProvider'
import { getNotificationPriorityStyle } from '@/lib/notificationStyles'
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
  Briefcase,
  FileText,
  User,
  Settings,
  BookOpen,
  CreditCard,
  LogOut,
  HelpCircle,
  BellRing,
  Bookmark,
  MessageSquare,
  ShoppingBag
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/seeker/dashboard', icon: Briefcase },
  { name: 'Search Jobs', href: '/seeker/jobs', icon: Briefcase },
  { name: 'Saved Jobs', href: '/seeker/saved-jobs', icon: Bookmark },
  { name: 'My Applications', href: '/seeker/applications', icon: FileText },
  { name: 'Messages', href: '/seeker/messages', icon: MessageSquare },
  { name: 'Profile', href: '/seeker/profile', icon: User },
  { name: 'Membership', href: '/seeker/subscription', icon: CreditCard },
]

export function SeekerNav() {
  const user = useUser()
  const { signOut } = useClerk()
  const pathname = usePathname()
  const { isImpersonating, impersonatedUser } = useImpersonationAware()
  const { profile } = useUserProfile()
  const { socket } = useSocket()
  const {
    notifications,
    unreadCount,
    isLoading: isLoadingNotifications,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    refreshNotifications
  } = useNotificationCenter()
  const [messageUnreadCount, setMessageUnreadCount] = useState(0)
  const messageCountLoadedRef = useRef(false)

  // Use impersonated user info if available, otherwise use actual user
  const displayUser = isImpersonating && impersonatedUser ? {
    displayName: impersonatedUser.name,
    primaryEmail: impersonatedUser.email,
    profileImageUrl: profile?.presignedProfilePictureUrl || profile?.profilePictureUrl // Use profile data for impersonated users too
  } : {
    displayName: profile?.name || user?.displayName,
    primaryEmail: user?.primaryEmail,
    profileImageUrl: profile?.presignedProfilePictureUrl || profile?.profilePictureUrl
  }

  const loadMessageUnreadCount = useCallback(async (force = false) => {
    if (!profile?.id) return
    if (!force && messageCountLoadedRef.current) return

    messageCountLoadedRef.current = true

    try {
      const response = await fetch('/api/messages/unread-count')
      if (response.ok) {
        const data = await response.json()
        setMessageUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching unread message count:', error)
      messageCountLoadedRef.current = false
    }
  }, [profile?.id])

  // Load notifications and messages
  useEffect(() => {
    if (user?.user?.id && profile?.role === 'seeker') {
      refreshNotifications()
      loadMessageUnreadCount(true)
    }
  }, [user?.user?.id, profile?.role, refreshNotifications, loadMessageUnreadCount])

  useEffect(() => {
    const interval = setInterval(() => {
      messageCountLoadedRef.current = false
      loadMessageUnreadCount(true)
    }, 120000)
    return () => clearInterval(interval)
  }, [loadMessageUnreadCount])

  useEffect(() => {
    if (!socket) return
    const handleMessageReceived = () => {
      setMessageUnreadCount(prev => prev + 1)
    }
    socket.on('message_received', handleMessageReceived)
    return () => {
      socket.off('message_received', handleMessageReceived)
    }
  }, [socket])

  useEffect(() => {
    if (pathname.startsWith('/seeker/messages')) {
      messageCountLoadedRef.current = false
      loadMessageUnreadCount(true)
    }
  }, [pathname, loadMessageUnreadCount])

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  // Socket.IO listener already added above - no duplicate needed
  // Fallback polling already handled in the main useEffect above

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-24 py-4">
          {/* Logo */}
          <Link href="/seeker/dashboard" className="flex items-center">
            <Image
              src="/hmm_logo.png"
              alt="Hire My Mom"
              width={150}
              height={50}
              className="rounded-lg lg:w-[180px] lg:h-[60px]"
            />
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const isMessagesItem = item.name === 'Messages'

              // console.log({ isMessagesItem, messageUnreadCount })

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative',
                    isActive
                      ? 'bg-brand-coral-light text-brand-coral'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                  title={isMessagesItem && messageUnreadCount > 0 ? `You have ${messageUnreadCount} unread ${messageUnreadCount === 1 ? 'message' : 'messages'}` : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {/* Show generic indicator for unread messages instead of badge */}
                  {isMessagesItem && messageUnreadCount > 0 && (
                    <span className="ml-1 text-xs text-red-500">
                      ({messageUnreadCount})
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Notifications & User Menu */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 w-12 rounded-full">
                  <BellRing className="h-6 w-6" />
                  {/* Notification Badge */}
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
                        {unreadCount} unread
                      </span>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-brand-coral hover:text-brand-coral hover:bg-brand-coral-light/20"
                          onClick={() => markAllNotificationsAsRead()}
                        >
                          Mark All Read
                        </Button>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Notification Items */}
                <div className="max-h-80 overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-coral mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <BellRing className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification, index) => {
                      const priorityStyle = getNotificationPriorityStyle(notification.priority)
                      const isUnread = !notification.read
                      return (
                        <DropdownMenuItem
                          key={notification.id}
                          className={cn(
                            "group flex flex-col items-start p-4 space-y-2 hover:shadow-md border border-l-4 transition-all duration-200 cursor-pointer",
                            index !== notifications.length - 1 && "mb-3",
                            isUnread
                              ? priorityStyle.dropdownAccent
                              : 'border-l-gray-200 bg-white text-gray-600'
                          )}
                          style={{
                            borderColor: isUnread ? priorityStyle.borderColor : '#e5e7eb'
                          }}
                          asChild
                        >
                          <Link
                            href={notification.actionUrl || '/seeker/notifications'}
                            onClick={() => {
                              if (!notification.read) {
                                markNotificationAsRead(notification.id)
                              }
                            }}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center space-x-3">
                                {isUnread ? (
                                  <div className={cn("w-2 h-2 rounded-full", priorityStyle.dot)}></div>
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                )}
                                <span className={cn(
                                  "text-sm font-semibold",
                                  isUnread ? 'text-gray-900 group-hover:text-white' : 'text-gray-600'
                                )}>
                                  {notification.title}
                                </span>
                              </div>
                              <span className={cn(
                                "text-xs font-semibold",
                                isUnread ? priorityStyle.time : 'text-gray-400'
                              )}>
                                {formatTimeAgo(notification.timestamp)}
                              </span>
                            </div>
                            <p className={cn(
                              "text-xs ml-5 leading-relaxed",
                              isUnread ? 'text-gray-600 group-hover:text-white' : 'text-gray-500'
                            )}>
                              {notification.message}
                            </p>
                          </Link>
                        </DropdownMenuItem>
                      )
                    })
                  )}
                </div>

                <div className="border-t p-2">
                  <DropdownMenuItem asChild>
                    <Link href="/seeker/notifications" className="group flex items-center justify-center w-full text-center p-3 hover:bg-gradient-to-r hover:from-brand-coral hover:to-brand-coral-light hover:text-white transition-all duration-200 rounded-md">
                      <span className="text-sm font-semibold text-brand-coral group-hover:text-white">See All Notifications</span>
                    </Link>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={displayUser?.profileImageUrl || ''} alt={displayUser?.displayName || 'User'} />
                    <AvatarFallback className="bg-brand-coral text-white text-xs lg:text-sm">
                      {displayUser?.displayName?.charAt(0)?.toUpperCase() || displayUser?.primaryEmail?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {displayUser?.displayName || 'Job Seeker'}
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
                  <Link href="/seeker/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/seeker/subscription" className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Membership</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/seeker/services" className="flex items-center">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    <span>Premium Services</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/seeker/settings" className="flex items-center">
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
                      ? 'bg-brand-coral-light text-brand-coral'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                  title={isMessagesItem && messageUnreadCount > 0 ? `You have ${messageUnreadCount} unread ${messageUnreadCount === 1 ? 'message' : 'messages'}` : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                  {/* Show generic indicator for unread messages instead of badge - mobile */}
                  {isMessagesItem && messageUnreadCount > 0 && (
                    <span className="ml-1 text-xs text-red-500">
                      ({messageUnreadCount})
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
