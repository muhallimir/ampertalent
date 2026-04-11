import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  variant?: 'default' | 'professional'
}

export function LoadingSpinner({ size = 'md', className, variant = 'default' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  if (variant === 'professional') {
    return (
      <div className={cn('relative', className)}>
        {/* Outer ring */}
        <div
          className={cn(
            'animate-spin rounded-full border-4 border-brand-teal/20',
            sizeClasses[size]
          )}
        />
        {/* Inner spinning element */}
        <div
          className={cn(
            'absolute top-0 left-0 animate-spin rounded-full border-4 border-transparent border-t-brand-teal border-r-brand-coral',
            sizeClasses[size]
          )}
          style={{ animationDuration: '1.5s' }}
        />
        {/* Center dot */}
        <div
          className={cn(
            'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-teal',
            size === 'sm' ? 'h-1 w-1' :
            size === 'md' ? 'h-2 w-2' :
            size === 'lg' ? 'h-3 w-3' : 'h-4 w-4'
          )}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
    />
  )
}