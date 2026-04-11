'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { handleUserLogout } from '@/lib/auth-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserImpersonationDropdown } from '@/components/admin/UserImpersonationDropdown';
import {
  Shield,
  Briefcase,
  Users,
  Settings,
  FileText,
  BarChart3,
  LogOut,
  HelpCircle,
  User,
  BellRing,
  HardDrive,
  Clock,
  UserCheck,
  CreditCard,
  Building2,
  Star,
  Mail,
  DollarSign,
  LayoutDashboard,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { UserProfilePicture } from '@/components/common/UserProfilePicture';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Job Vetting', href: '/admin/jobs', icon: Briefcase },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Sales', href: '/admin/sales', icon: DollarSign },
  {
    name: 'Users',
    icon: Users,
    dropdown: [
      { name: 'Employers', href: '/admin/employers', icon: Building2 },
      { name: 'Seekers', href: '/admin/seekers', icon: Users },
    ],
  },
  {
    name: 'Jobs',
    href: '/admin/job-posts',
    icon: Briefcase,
    dropdown: [
      {
        name: 'All Jobs',
        href: '/admin/job-posts',
        icon: Briefcase,
      },
      {
        name: 'Standard Jobs',
        href: '/admin/job-posts/standard',
        icon: Briefcase,
      },
      { name: 'Featured Jobs', href: '/admin/featured-jobs', icon: Star },
      {
        name: 'Solo Email Blasts',
        href: '/admin/solo-email-blasts',
        icon: Mail,
      },
      { name: 'Concierge Services', href: '/admin/concierge', icon: UserCheck },
    ],
  },
  { name: 'Services', href: '/admin/services', icon: ShoppingBag },
  { name: 'Pending Checkouts', href: '/admin/pending-checkouts', icon: Clock },
  { name: 'CRM Sync', href: '/admin/crm-sync', icon: RefreshCw },
];

interface AdminNotification {
  id: string;
  type: 'system_alert' | 'user_registration' | 'job_submission' | 'security_alert' | 'backup_complete' | 'new_application';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  recipient: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  userId?: string;
  userName?: string;
  userProfilePictureUrl?: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}

export function AdminNav() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const { profile } = useUserProfile();
  const effectiveRole = useEffectiveRole();

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({ total: 0, unread: 0, byType: {} });
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Use profile picture from database if available
  const profileImageUrl = profile?.presignedProfilePictureUrl || profile?.profilePictureUrl || user?.imageUrl;

  // Filter navigation based on user role
  const filteredNavigation = navigation
    .map((item) => {
      if (item.name === 'Users' && item.dropdown) {
        // Add Admins at the top for super admins
        const usersDropdown = [
          ...(effectiveRole === 'super_admin' ? [{ name: 'Admins', href: '/admin/admins', icon: Shield }] : []),
          ...item.dropdown,
        ];
        return { ...item, dropdown: usersDropdown };
      }
      return item;
    })
    .filter((item) => {
      // Hide Sales tab for regular admins (only show for super_admin)
      if (item.name === 'Sales' && effectiveRole !== 'super_admin') {
        return false;
      }
      // Hide CRM Sync tab for regular admins (only show for super_admin)
      if (item.name === 'CRM Sync' && effectiveRole !== 'super_admin') {
        return false;
      }
      return true;
    });

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;

      setIsLoadingNotifications(true);
      try {
        const response = await fetch('/api/admin/notifications?limit=5');
        if (response.ok) {
          const data = await response.json();
          setNotifications(
            data.notifications.map((n: any) => ({
              ...n,
              timestamp: new Date(n.timestamp),
            })),
          );
          setNotificationStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    fetchNotifications();

    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle null pathname
  if (!pathname) return null;

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'markAllRead' }),
      });

      if (response.ok) {
        // Update local state to mark all as read
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setNotificationStats((prev) => ({ ...prev, unread: 0 }));
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'markRead', notificationId }),
      });

      if (response.ok) {
        // Update local state to mark specific notification as read
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
        setNotificationStats((prev) => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
        }));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'critical') return 'red';

    switch (type) {
      case 'system_alert':
        return 'red';
      case 'job_submission':
        return 'orange';
      case 'user_registration':
        return 'blue';
      case 'new_application':
        return 'green';
      case 'security_alert':
        return 'yellow';
      case 'backup_complete':
        return 'green';
      default:
        return 'gray';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="px-4">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center h-24 py-4">
          {/* Logo */}
          <Link href="/admin/dashboard" className="flex items-center space-x-2 shrink-0">
            <Image src="/logo/ampertalent.png" alt="AmperTalent" width={180} height={60} className="rounded-lg" />
            <span className="text-sm text-white bg-gray-800 px-2 py-1 rounded flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>{effectiveRole === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex flex-1 items-center justify-center space-x-1">
            {filteredNavigation.map((item) => {
              // Skip items without icons
              if (!item?.icon) {
                console.warn('[AdminNav] Skipping navigation item without icon:', item?.name);
                return null;
              }

              const Icon = item.icon;

              // Handle dropdown items
              if (item.dropdown) {
                const isActive = item.dropdown.some((subItem) => pathname.startsWith(subItem.href));

                return (
                  <DropdownMenu key={item.name}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          isActive ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {item.dropdown.map((subItem) => {
                        // Skip subitems without icons
                        if (!subItem?.icon) {
                          console.warn('[AdminNav] Skipping dropdown item without icon:', subItem?.name);
                          return null;
                        }

                        const SubIcon = subItem.icon;
                        const isSubActive = pathname.startsWith(subItem.href);

                        return (
                          <DropdownMenuItem key={subItem.name} asChild>
                            <Link
                              href={subItem.href}
                              className={cn('flex items-center space-x-2 w-full', isSubActive && 'bg-gray-100 text-gray-800')}
                            >
                              <SubIcon className="h-4 w-4" />
                              <span>{subItem.name}</span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              // Handle regular items
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Notifications & User Menu */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* User Impersonation Dropdown */}
            <UserImpersonationDropdown />

            {/* Admin Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 w-12 rounded-full">
                  <BellRing className="h-6 w-6" />
                  {/* Notification Badge */}
                  {notificationStats.unread > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notificationStats.unread > 99 ? '99+' : notificationStats.unread}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-96 max-w-[90vw]" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-4 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-gray-900">Admin Notifications</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500">{notificationStats.unread} unread</span>
                      {notificationStats.unread > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-brand-teal hover:text-brand-teal hover:bg-brand-teal-light/20"
                          onClick={handleMarkAllRead}
                        >
                          Mark All Read
                        </Button>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Admin Notification Items */}
                <div className="max-h-80 overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-teal"></div>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                      <BellRing className="h-8 w-8 mb-2 opacity-50" />
                      <span className="text-sm">No notifications</span>
                    </div>
                  ) : (
                    notifications.map((notification) => {
                      const color = getNotificationColor(notification.type, notification.priority);
                      const isUnread = !notification.read;

                      return (
                        <DropdownMenuItem
                          key={notification.id}
                          className={cn(
                            'group flex flex-col items-start p-4 space-y-2 hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-brand-teal hover:text-white',
                            `border-l-4 border-l-${color}-500`,
                            isUnread ? `bg-${color}-50/50` : 'bg-gray-50/30',
                          )}
                          onClick={() => {
                            if (isUnread) {
                              handleMarkRead(notification.id);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between w-full min-w-0">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              {/* Show user profile picture for user-related notifications */}
                              {notification.userId ? (
                                <UserProfilePicture
                                  userId={notification.userId}
                                  userName={notification.userName || 'User'}
                                  profilePictureUrl={notification.userProfilePictureUrl || null}
                                  size="sm"
                                />
                              ) : (
                                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', `bg-${color}-500`, !isUnread && 'opacity-50')}></div>
                              )}
                              <span className={cn('text-sm truncate group-hover:text-white', isUnread ? 'font-semibold' : 'font-medium')}>
                                {notification.title}
                              </span>
                            </div>
                            <span className={cn('text-xs font-semibold flex-shrink-0 ml-2 group-hover:text-white', `text-${color}-600`)}>
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                          </div>
                          <p className={cn('text-xs leading-relaxed break-words group-hover:text-white', notification.userId ? 'ml-12' : 'ml-5')}>
                            {notification.message}
                          </p>
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </div>

                <div className="border-t p-2">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/admin/notifications"
                      className="group flex items-center justify-center w-full text-center p-3 hover:bg-brand-teal hover:text-white transition-all duration-200 rounded-md"
                    >
                      <span className="text-sm font-semibold text-brand-teal group-hover:text-white">See All Notifications</span>
                    </Link>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profileImageUrl || undefined} alt={user?.fullName || user?.firstName || 'User'} />
                    <AvatarFallback className="bg-gray-800 text-white">
                      {user?.firstName?.charAt(0)?.toUpperCase() || user?.emailAddresses?.[0]?.emailAddress?.charAt(0)?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.fullName || user?.firstName || 'Administrator'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.emailAddresses?.[0]?.emailAddress}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Shield className="h-3 w-3 text-gray-600" />
                      <span className="text-xs text-gray-600">{effectiveRole === 'super_admin' ? 'Super Admin Access' : 'Admin Access'}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/dashboard" className="flex items-center">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/storage" className="flex items-center">
                    <HardDrive className="mr-2 h-4 w-4" />
                    <span>Storage</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/users" className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    <span>User Management</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/pending-checkouts" className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Pending Checkouts</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/subscription-management" className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Subscriptions</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/logs" className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Logs</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Admin Settings</span>
                  </Link>
                </DropdownMenuItem>
                {effectiveRole === 'super_admin' && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/reports" className="flex items-center">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      <span>System Reports</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/help" className="flex items-center">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Help & Support</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleUserLogout(signOut)}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden pb-4">
          <div className="grid grid-cols-2 gap-2">
            {filteredNavigation.flatMap((item) => {
              // Handle dropdown items for mobile - flatten them
              if (item.dropdown) {
                return item.dropdown.map((subItem) => {
                  // Skip subitems without icons
                  if (!subItem?.icon) {
                    console.warn('[AdminNav Mobile] Skipping dropdown item without icon:', subItem?.name);
                    return null;
                  }

                  const SubIcon = subItem.icon;
                  const isActive = pathname.startsWith(subItem.href);

                  return (
                    <Link
                      key={subItem.name}
                      href={subItem.href}
                      className={cn(
                        'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                      )}
                    >
                      <SubIcon className="h-4 w-4" />
                      <span>{subItem.name}</span>
                    </Link>
                  );
                });
              }

              // Skip items without icons
              if (!item?.icon) {
                console.warn('[AdminNav Mobile] Skipping navigation item without icon:', item?.name);
                return null;
              }

              // Handle regular items
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            }).filter(Boolean)}
          </div>
        </div>
      </div>
    </nav>
  );
}
