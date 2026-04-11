import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { ImpersonationProvider } from "@/components/admin/ImpersonationContext"
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner"
import { RoleGuard } from "@/components/auth/RoleGuard"
import { SeekerNav } from "@/components/nav/SeekerNav"
import { NotificationCenterProvider } from "@/components/providers/NotificationCenterProvider"


// Dynamically import heavy components to reduce initial bundle size
// const SeekerNav = dynamic(() => import("@/components/nav/SeekerNav").then(mod => ({ default: mod.SeekerNav })), {
//   loading: () => <div className="h-16 bg-white border-b border-gray-200" />,
//   ssr: true
// })

const AppFooter = dynamic(() => import("@/components/common/AppFooter").then(mod => ({ default: mod.AppFooter })), {
  loading: () => <div className="h-32 bg-gray-100" />,
  ssr: true
})

export const metadata: Metadata = {
  title: "Job Seeker Dashboard - Hire My Mom",
  description: "Find remote job opportunities, manage your applications, and build your professional profile. Access vetted jobs from family-friendly employers.",
}

export default function SeekerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGuard allowedRoles={['seeker', 'admin']}>
      <ImpersonationProvider>
        <NotificationCenterProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <ImpersonationBanner />
            <SeekerNav />
            <main className="flex-1">{children}</main>
            <AppFooter />
          </div>
        </NotificationCenterProvider>
      </ImpersonationProvider>
    </RoleGuard>
  )
}
