import type { Metadata } from "next"
import { EmployerNav } from "@/components/nav/EmployerNav"
import { AppFooter } from "@/components/common/AppFooter"
import { ImpersonationProvider } from "@/components/admin/ImpersonationContext"
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner"
import { ToastProvider } from "@/components/ui/toast"
import { RoleGuard } from "@/components/auth/RoleGuard"

export const metadata: Metadata = {
  title: "Employer Dashboard - AmperTalent",
  description: "Post remote job opportunities, manage applications, and find qualified remote professionals. Access pre-screened candidates and concierge services.",
}

export default function EmployerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGuard allowedRoles={['employer', 'admin']}>
      <ImpersonationProvider>
        <ToastProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <ImpersonationBanner />
            <EmployerNav />
            <main className="flex-1">{children}</main>
            <AppFooter />
          </div>
        </ToastProvider>
      </ImpersonationProvider>
    </RoleGuard>
  )
}