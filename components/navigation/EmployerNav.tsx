'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { handleUserLogout } from '@/lib/auth-utils'
import {
  Briefcase,
  Building,
  Users,
  MessageSquare,
  Settings,
  Package
} from 'lucide-react'

const navigation = [
  {
    name: 'Job Postings',
    href: '/employer/jobs',
    icon: Briefcase,
  },
  {
    name: 'Company Profile',
    href: '/employer/company-profile',
    icon: Building,
  },
  {
    name: 'Team',
    href: '/employer/team',
    icon: Users,
  },
  {
    name: 'Candidates',
    href: '/employer/candidates',
    icon: Users,
  },
  {
    name: 'Messages',
    href: '/employer/messages',
    icon: MessageSquare,
  },
  {
    name: 'Billing',
    href: '/employer/billing',
    icon: Package,
  },
  {
    name: 'Settings',
    href: '/employer/settings',
    icon: Settings,
  },
]

export function EmployerNav() {
  const pathname = usePathname()
  const { signOut } = useClerk()

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/employer" className="text-xl font-bold text-green-600">
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
                        ? 'border-green-500 text-gray-900'
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
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <button
                onClick={() => handleUserLogout(signOut)}
                className="relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
                    ? 'bg-green-50 border-green-500 text-green-700'
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