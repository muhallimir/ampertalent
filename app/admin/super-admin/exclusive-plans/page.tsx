"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * DEPRECATED: This page has been moved to /admin/subscription-management
 * under the "Exclusive Offers" tab.
 * 
 * This page now redirects to the new location.
 * All admin roles (admin and super_admin) can now access exclusive plans
 * via the Subscription Management page.
 */
export default function ExclusivePlansRedirectPage() {
    const router = useRouter()

    useEffect(() => {
        // Redirect to the new Exclusive Offers tab in subscription management
        router.replace('/admin/subscription-management?tab=exclusive-offers')
    }, [router])

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
                <p className="text-muted-foreground">Redirecting to Subscription Management...</p>
            </div>
        </div>
    )
}
