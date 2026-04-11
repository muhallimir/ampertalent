'use client'

import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications'
import { useUserProfile } from '@/hooks/useUserProfile'

interface RealTimeNotificationProviderProps {
  children: React.ReactNode
}

export function RealTimeNotificationProvider({ children }: RealTimeNotificationProviderProps) {
  const { profile } = useUserProfile()
  const { isConnected, connectionError } = useRealTimeNotifications()

  // Show connection status only in development (for admins and super admins)
  const showDebugInfo = process.env.NODE_ENV === 'development' && (profile?.role === 'admin' || profile?.role === 'super_admin')

  return (
    <>
      {children}

      {/* Debug connection status */}
      {showDebugInfo && profile && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className={`px-3 py-2 rounded-md text-xs font-medium ${isConnected
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
            🔔 Real-time: {isConnected ? 'Connected' : 'Disconnected'}
            {connectionError && (
              <div className="text-xs mt-1 opacity-75">{connectionError}</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}