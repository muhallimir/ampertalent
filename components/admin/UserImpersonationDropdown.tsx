'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useImpersonation } from '@/hooks/useImpersonation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Search,
  Building2,
  User,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchUser {
  id: string
  clerkUserId: string
  name: string
  email?: string
  role: 'employer' | 'seeker'
  companyName?: string
  headline?: string
  skills?: string[]
  createdAt: string
}

export function UserImpersonationDropdown() {
  const { user } = useUser()
  const router = useRouter()
  const { isImpersonating, impersonatedUser, startImpersonation, stopImpersonation } = useImpersonation()

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      await performSearch(searchQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const performSearch = async (query: string) => {
    if (query.length < 2) return

    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}&limit=10`)

      if (!response.ok) {
        throw new Error('Failed to search users')
      }

      const data = await response.json()
      setSearchResults(data.users || [])
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search users')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleStartImpersonation = async (targetUser: SearchUser) => {
    if (!user?.id) return

    setIsStarting(true)
    setError(null)

    try {
      const result = await startImpersonation(user.id, {
        id: targetUser.id,
        clerkUserId: targetUser.clerkUserId,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        companyName: targetUser.companyName,
        headline: targetUser.headline,
      })

      if (!result.success) {
        setError(result.error || 'Failed to start impersonation')
        return
      }

      setIsOpen(false)
      setSearchQuery('')
      setSearchResults([])

      // Navigate to the appropriate dashboard based on user role
      if (targetUser.role === 'employer') {
        router.push('/employer/dashboard')
      } else if (targetUser.role === 'seeker') {
        router.push('/seeker/dashboard')
      }
    } catch (err) {
      console.error('Impersonation error:', err)
      setError('Failed to start impersonation')
    } finally {
      setIsStarting(false)
    }
  }

  const handleStopImpersonation = async () => {
    setIsStopping(true)
    setError(null)

    try {
      const result = await stopImpersonation()

      if (!result.success) {
        setError(result.error || 'Failed to stop impersonation')
        return
      }

      setIsOpen(false)

      // Navigate back to admin dashboard
      router.push('/admin/dashboard')
    } catch (err) {
      console.error('Stop impersonation error:', err)
      setError('Failed to stop impersonation')
    } finally {
      setIsStopping(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'employer':
        return <Building2 className="h-4 w-4" />
      case 'seeker':
        return <User className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'employer':
        return 'bg-blue-100 text-blue-800'
      case 'seeker':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative h-12 w-12 rounded-full",
            isImpersonating && "ring-2 ring-orange-500 ring-offset-2"
          )}
        >
          {isImpersonating ? (
            <Eye className="h-6 w-6 text-orange-600" />
          ) : (
            <Users className="h-6 w-6" />
          )}
          {isImpersonating && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-96" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-4 border-b">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-gray-900">
              {isImpersonating ? 'User Impersonation Active' : 'Impersonate User'}
            </span>
          </div>
        </DropdownMenuLabel>

        {/* Current Impersonation Status */}
        {isImpersonating && impersonatedUser && (
          <>
            <div className="p-4 bg-orange-50 border-l-4 border-l-orange-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getRoleIcon(impersonatedUser.role)}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {impersonatedUser.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {impersonatedUser.email}
                    </p>
                    <Badge className={cn("text-xs mt-1", getRoleBadgeColor(impersonatedUser.role))}>
                      {impersonatedUser.role}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStopImpersonation}
                  disabled={isStopping}
                  className="text-orange-600 hover:text-orange-700"
                >
                  {isStopping ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Stop
                    </>
                  )}
                </Button>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Search Interface */}
        {!isImpersonating && (
          <>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 pb-2">
                <div className="flex items-center space-x-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Search Results */}
            <div className="max-h-80 overflow-y-auto">
              {isSearching && (
                <div className="flex items-center justify-center p-8">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-gray-600">Searching...</span>
                </div>
              )}

              {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center p-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No users found</p>
                </div>
              )}

              {!isSearching && searchResults.map((searchUser) => (
                <DropdownMenuItem
                  key={searchUser.id}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800 group"
                  onClick={() => handleStartImpersonation(searchUser)}
                  disabled={isStarting}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    {getRoleIcon(searchUser.role)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-white">
                        {searchUser.name}
                      </p>
                      <p className="text-xs text-gray-600 truncate group-hover:text-white">
                        {searchUser.email}
                      </p>
                      {searchUser.companyName && (
                        <p className="text-xs text-gray-500 truncate group-hover:text-white">
                          {searchUser.companyName}
                        </p>
                      )}
                      {searchUser.headline && (
                        <p className="text-xs text-gray-500 truncate group-hover:text-white">
                          {searchUser.headline}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={cn("text-xs", getRoleBadgeColor(searchUser.role))}>
                      {searchUser.role}
                    </Badge>
                    {isStarting ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 group-hover:text-white" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>

            {searchQuery.length < 2 && (
              <div className="text-center p-8 text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Type at least 2 characters to search</p>
              </div>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}