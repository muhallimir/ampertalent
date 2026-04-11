'use client'

import React, { ReactNode, useEffect } from 'react'
import Bugsnag from '../lib/bugsnag'

interface BugsnagErrorBoundaryProps {
    children: ReactNode
}

let ErrorBoundary: React.ComponentType<any> | null = null

// Initialize the error boundary only on the client side
if (typeof window !== 'undefined') {
    const BugsnagReact = Bugsnag.getPlugin('react')
    if (BugsnagReact) {
        ErrorBoundary = BugsnagReact.createErrorBoundary(React)
    }
}

export function BugsnagErrorBoundaryWrapper({ children }: BugsnagErrorBoundaryProps) {
    useEffect(() => {
        // Import Bugsnag configuration to ensure it's initialized
        import('../lib/bugsnag')
    }, [])

    // If we're on the server or ErrorBoundary is not available, just render children
    if (!ErrorBoundary) {
        return <>{children}</>
    }

    return (
        <ErrorBoundary
            FallbackComponent={({ clearError }: { clearError: () => void }) => (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center p-8 max-w-md">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            Something went wrong
                        </h1>
                        <p className="text-gray-600 mb-6">
                            We&apos;ve been notified about this error and are working to fix it.
                        </p>
                        <button
                            onClick={clearError}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            )}
        >
            {children}
        </ErrorBoundary>
    )
}