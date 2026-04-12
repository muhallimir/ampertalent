import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

interface AdminSettings {
  notifications: {
    systemAlerts: boolean
    userRegistrations: boolean
    jobSubmissions: boolean
    securityAlerts: boolean
    dailyReports: boolean
  }
  security: {
    requireTwoFactor: boolean
    sessionTimeout: number
    allowMultipleSessions: boolean
    auditLogging: boolean
  }
  platform: {
    maintenanceMode: boolean
    userRegistrationEnabled: boolean
    jobPostingEnabled: boolean
    autoApproveJobs: boolean
    maxJobsPerEmployer: number
  }
  system: {
    backupFrequency: 'daily' | 'weekly' | 'monthly'
    logRetentionDays: number
    enableDebugMode: boolean
  }
}

const DEFAULT_SETTINGS: AdminSettings = {
  notifications: {
    systemAlerts: true,
    userRegistrations: true,
    jobSubmissions: true,
    securityAlerts: true,
    dailyReports: false
  },
  security: {
    requireTwoFactor: false,
    sessionTimeout: 480, // 8 hours in minutes
    allowMultipleSessions: true,
    auditLogging: true
  },
  platform: {
    maintenanceMode: false,
    userRegistrationEnabled: true,
    jobPostingEnabled: true,
    autoApproveJobs: false,
    maxJobsPerEmployer: 10
  },
  system: {
    backupFrequency: 'daily',
    logRetentionDays: 90,
    enableDebugMode: false
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For now, return default settings since we haven't implemented the AdminSettings table yet
    // TODO: Implement AdminSettings table and fetch from database
    const settings = DEFAULT_SETTINGS

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching admin settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const settings: AdminSettings = await request.json()

    // Validate settings
    const validation = validateSettings(settings)
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Invalid settings',
        details: validation.errors
      }, { status: 400 })
    }

    // TODO: Save settings to AdminSettings table when implemented
    // For now, just log the action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'settings_update',
        targetEntity: 'admin_settings',
        targetId: 'global',
        details: {
          updatedSettings: JSON.parse(JSON.stringify(settings)),
          timestamp: new Date().toISOString()
        }
      }
    })

    console.log('Admin settings updated:', settings)

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    })
  } catch (error) {
    console.error('Error updating admin settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function validateSettings(settings: AdminSettings): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate security settings
  if (settings.security.sessionTimeout < 30 || settings.security.sessionTimeout > 1440) {
    errors.push('Session timeout must be between 30 and 1440 minutes')
  }

  // Validate platform settings
  if (settings.platform.maxJobsPerEmployer < 1 || settings.platform.maxJobsPerEmployer > 100) {
    errors.push('Max jobs per employer must be between 1 and 100')
  }

  // Validate system settings
  if (settings.system.logRetentionDays < 7 || settings.system.logRetentionDays > 365) {
    errors.push('Log retention days must be between 7 and 365')
  }

  if (!['daily', 'weekly', 'monthly'].includes(settings.system.backupFrequency)) {
    errors.push('Backup frequency must be daily, weekly, or monthly')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}