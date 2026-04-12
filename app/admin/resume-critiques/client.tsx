'use client'

import { ResumeCritiqueManagement } from '@/components/admin/ResumeCritiqueManagement'
import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export function AdminResumeCritiqueManagement() {
  const { user } = useUser()
  const [adminId, setAdminId] = useState<string | null>(null)

  useEffect(() => {
    // Since this is an admin page protected by middleware, we can use a default admin ID
    // or derive it from the user if available
    if (user?.id) {
      setAdminId(user.id)
    } else {
      // For admin pages, we can use a placeholder since the API doesn't require auth anymore
      setAdminId('admin_user')
    }
  }, [user])

  // Always render the component - don't wait for authentication since API doesn't require it
  return <ResumeCritiqueManagement adminId={adminId || 'admin_user'} />
}