export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low' | 'default'

interface NotificationPriorityStyle {
  dropdownAccent: string
  dot: string
  time: string
  panelAccent: string
  tag: string
  toastVariant: 'default' | 'destructive' | 'success'
  toastClassName: string
  toastTitleClass: string
  borderColor: string
}

const baseToastClasses = 'cursor-pointer shadow-2xl transition hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.8)] border'

export const notificationPriorityStyles: Record<NotificationPriority, NotificationPriorityStyle> = {
  critical: {
    dropdownAccent: 'border-l-red-600 bg-red-50/80',
    dot: 'bg-red-600',
    time: 'text-red-600',
    panelAccent: 'border-red-200 bg-red-50/80',
    tag: 'border border-red-200 bg-red-50 text-red-800',
    toastVariant: 'destructive',
    toastClassName: `${baseToastClasses} border-l-4 border-l-red-600 bg-white text-gray-900`,
    toastTitleClass: 'text-red-600',
    borderColor: '#dc2626'
  },
  high: {
    dropdownAccent: 'border-l-red-500 bg-red-50/70',
    dot: 'bg-red-500',
    time: 'text-red-500',
    panelAccent: 'border-red-200 bg-red-50/70',
    tag: 'border border-red-200 bg-red-50 text-red-700',
    toastVariant: 'destructive',
    toastClassName: `${baseToastClasses} border-l-4 border-l-brand-coral bg-white text-gray-900`,
    toastTitleClass: 'text-brand-coral',
    borderColor: '#f97316'
  },
  medium: {
    dropdownAccent: 'border-l-yellow-500 bg-yellow-50/80',
    dot: 'bg-yellow-500',
    time: 'text-yellow-600',
    panelAccent: 'border-yellow-200 bg-yellow-50/80',
    tag: 'border border-yellow-200 bg-yellow-50 text-yellow-800',
    toastVariant: 'default',
    toastClassName: `${baseToastClasses} border-l-4 border-l-amber-500 bg-white text-gray-900`,
    toastTitleClass: 'text-amber-600',
    borderColor: '#d97706'
  },
  low: {
    dropdownAccent: 'border-l-gray-500 bg-gray-50/80',
    dot: 'bg-gray-500',
    time: 'text-gray-600',
    panelAccent: 'border-gray-300 bg-gray-50/80',
    tag: 'border border-gray-300 bg-gray-50 text-gray-700',
    toastVariant: 'default',
    toastClassName: `${baseToastClasses} border-l-4 border-l-gray-500 bg-white text-gray-900`,
    toastTitleClass: 'text-gray-700',
    borderColor: '#6b7280'
  },
  default: {
    dropdownAccent: 'border-l-gray-200 bg-gray-50/80',
    dot: 'bg-gray-300',
    time: 'text-gray-500',
    panelAccent: 'border-gray-200 bg-gray-50/80',
    tag: 'border border-gray-200 bg-gray-50 text-gray-700',
    toastVariant: 'default',
    toastClassName: `${baseToastClasses} border-l-4 border-l-gray-300 bg-white text-gray-900`,
    toastTitleClass: 'text-gray-700',
    borderColor: '#d1d5db'
  }
}

export function resolveNotificationPriority(priority?: string): NotificationPriority {
  if (!priority) return 'default'
  const normalized = priority.toLowerCase() as NotificationPriority
  return normalized in notificationPriorityStyles ? normalized : 'default'
}

export function getNotificationPriorityStyle(priority?: string): NotificationPriorityStyle {
  return notificationPriorityStyles[resolveNotificationPriority(priority)]
}
