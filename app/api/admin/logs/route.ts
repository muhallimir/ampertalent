import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

interface SystemLog {
  id: string
  timestamp: Date
  level: 'info' | 'warning' | 'error' | 'debug'
  service: string
  message: string
  details?: string
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    const service = searchParams.get('service')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause for filtering
    const where: any = {}
    if (level && level !== 'all') {
      where.actionType = level
    }
    if (service && service !== 'all') {
      where.targetEntity = service
    }

    // Fetch admin action logs as system logs
    const adminLogs = await db.adminActionLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
      include: {
        admin: {
          select: {
            name: true
          }
        }
      }
    })

    // Transform admin logs to system log format
    const systemLogs: SystemLog[] = adminLogs.map((log: any) => ({
      id: log.id,
      timestamp: log.createdAt,
      level: getLogLevel(log.actionType),
      service: getServiceName(log.targetEntity),
      message: getLogMessage(log.actionType, log.targetEntity, log.admin.name),
      details: log.details ? JSON.stringify(log.details, null, 2) : undefined
    }))

    // Add some recent application logs (mock for now, but could be real logs)
    const recentAppLogs: SystemLog[] = [
      {
        id: 'app_1',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        level: 'info',
        service: 'Database',
        message: 'Database connection established',
        details: 'Connected to PostgreSQL database successfully'
      },
      {
        id: 'app_2',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        level: 'info',
        service: 'Auth',
        message: 'User authentication successful',
        details: 'Clerk Auth integration working properly'
      },
      {
        id: 'app_3',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        level: 'warning',
        service: 'Email',
        message: 'Email delivery rate below threshold',
        details: 'Current delivery rate: 85%, threshold: 90%'
      }
    ]

    // Combine and sort all logs
    const allLogs = [...systemLogs, ...recentAppLogs]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)

    return NextResponse.json({
      logs: allLogs,
      total: systemLogs.length + recentAppLogs.length,
      hasMore: systemLogs.length === limit
    })
  } catch (error) {
    console.error('Error fetching system logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getLogLevel(actionType: string): 'info' | 'warning' | 'error' | 'debug' {
  switch (actionType) {
    case 'job_status_update':
    case 'user_status_update':
    case 'settings_update':
      return 'info'
    case 'user_suspension':
    case 'job_rejection':
      return 'warning'
    case 'security_violation':
    case 'system_error':
      return 'error'
    default:
      return 'info'
  }
}

function getServiceName(targetEntity: string): string {
  switch (targetEntity) {
    case 'job':
      return 'Jobs'
    case 'user':
    case 'user_profile':
      return 'Users'
    case 'admin_settings':
      return 'Settings'
    case 'application':
      return 'Applications'
    default:
      return 'System'
  }
}

function getLogMessage(actionType: string, targetEntity: string, adminName: string): string {
  switch (actionType) {
    case 'job_status_update':
      return `Job status updated by ${adminName}`
    case 'user_status_update':
      return `User status updated by ${adminName}`
    case 'settings_update':
      return `Admin settings updated by ${adminName}`
    case 'user_suspension':
      return `User suspended by ${adminName}`
    case 'job_rejection':
      return `Job posting rejected by ${adminName}`
    default:
      return `${actionType.replace('_', ' ')} performed by ${adminName}`
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { level, service, message, details } = await request.json()

    if (!level || !service || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create a system log entry via admin action log
    const logEntry = await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: level,
        targetEntity: service.toLowerCase(),
        targetId: 'system',
        details: {
          message,
          details,
          timestamp: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({
      success: true,
      logId: logEntry.id
    })
  } catch (error) {
    console.error('Error creating system log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}