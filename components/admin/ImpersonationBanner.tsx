'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useImpersonation } from '@/hooks/useImpersonation'
import { useRouter } from 'next/navigation'
import { AlertTriangle, EyeOff, Building2, User, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUser, impersonationDuration, stopImpersonation } = useImpersonation()
  const router = useRouter()

  if (!isImpersonating || !impersonatedUser) {
    return null
  }

  const handleStopImpersonation = async () => {
    await stopImpersonation()
    // Navigate back to admin dashboard
    router.push('/admin/dashboard')
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'employer':
        return <Building2 className="h-4 w-4" />
      case 'seeker':
        return <User className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'employer':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'seeker':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          {/* Left side - Warning and user info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-200" />
              <span className="font-semibold text-sm">ADMIN IMPERSONATION ACTIVE</span>
            </div>
            
            <div className="hidden sm:block w-px h-6 bg-white/30" />
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getRoleIcon(impersonatedUser.role)}
                <span className="font-medium">{impersonatedUser.name}</span>
              </div>
              
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs border bg-white/20 text-white border-white/30",
                  "hover:bg-white/30"
                )}
              >
                {impersonatedUser.role}
              </Badge>
              
              {impersonatedUser.companyName && (
                <span className="hidden md:inline text-sm text-white/80">
                  @ {impersonatedUser.companyName}
                </span>
              )}
              
              {impersonatedUser.headline && (
                <span className="hidden lg:inline text-sm text-white/80">
                  {impersonatedUser.headline}
                </span>
              )}
            </div>
          </div>

          {/* Right side - Duration and stop button */}
          <div className="flex items-center space-x-4">
            {impersonationDuration && (
              <div className="hidden sm:flex items-center space-x-1 text-sm text-white/80">
                <Clock className="h-4 w-4" />
                <span>{impersonationDuration}</span>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopImpersonation}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Stop Impersonation</span>
              <span className="sm:hidden">Stop</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}