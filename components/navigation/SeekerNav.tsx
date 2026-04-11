'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { handleUserLogout } from '@/lib/auth-utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  User,
  FileText,
  MessageSquare,
  Settings,
  Crown,
  Bell,
  Briefcase
} from 'lucide-react'

const navigation = [
  {
    name: 'Browse Jobs',
    href: '/seeker/jobs',
    icon: Search,
  },
  {
    name: 'My Profile',
    href: '/seeker/profile',
    icon: User,
  },
  {
    name: 'Applications',
    href: '/seeker/applications',
    icon: FileText,
  },
  {
    name: 'Messages',
    href: '/seeker/messages',
    icon: MessageSquare,
  },
  {
    name: 'Additional Services',
    href: '/seeker/services',
    icon: Briefcase,
  },
  {
    name: 'Subscription',
    href: '/seeker/subscription',
    icon: Crown,
  },
  {
    name: 'Settings',
    href: '/seeker/settings',
    icon: Settings,
  },
]

export function SeekerNav() {
  const pathname = usePathname()
  const { signOut } = useClerk()

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/seeker" className="text-xl font-bold text-blue-600">
                AmperTalent
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Bell className="h-5 w-5" />
                  {/* Notification Badge */}
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    2
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-4 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-gray-900">Notifications</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500">2 unread</span>
                      <Button variant="ghost" size="sm" className="text-xs text-brand-teal hover:text-brand-teal hover:bg-brand-teal-light/20">
                        Mark All Read
                      </Button>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Notification Items */}
                <div className="max-h-64 overflow-y-auto">
                  <DropdownMenuItem className="flex flex-col items-start p-4 space-y-2 hover:shadow-md hover:scale-[1.01] border-l-4 border-l-brand-teal bg-brand-teal-light/5 transition-all duration-200 cursor-pointer">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-brand-teal rounded-full"></div>
                        <span className="text-sm font-semibold text-gray-900">Application Status Update</span>
                      </div>
                      <span className="text-xs text-brand-teal font-semibold">1h ago</span>
                    </div>
                    <p className="text-xs text-gray-600 ml-5 leading-relaxed">
                      Your application for Marketing Manager at TechCorp has been reviewed
                    </p>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="flex flex-col items-start p-4 space-y-2 hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-pointer">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-brand-coral rounded-full"></div>
                        <span className="text-sm font-medium text-gray-900">New Job Match</span>
                      </div>
                      <span className="text-xs text-brand-coral font-medium">2h ago</span>
                    </div>
                    <p className="text-xs text-gray-600 ml-5 leading-relaxed">
                      We found 3 new jobs that match your skills and preferences
                    </p>
                  </DropdownMenuItem>
                </div>

                <div className="border-t p-2">
                  <DropdownMenuItem asChild>
                    <Link href="/seeker/notifications" className="flex items-center justify-center w-full text-center p-3 hover:bg-gradient-to-r hover:from-brand-teal hover:to-brand-teal-light hover:text-white transition-all duration-200 rounded-md">
                      <span className="text-sm font-semibold text-brand-teal hover:text-white">See All Notifications</span>
                    </Link>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-shrink-0">
              <button
                onClick={() => handleUserLogout(signOut)}
                className="relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
                  isActive
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                <div className="flex items-center">
                  <item.icon className="h-4 w-4 mr-3" />
                  {item.name}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}