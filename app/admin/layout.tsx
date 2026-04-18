import type { Metadata } from "next"
import { AdminNav } from "@/components/nav/AdminNav"
import { AppFooter } from "@/components/common/AppFooter"
import { RoleGuard } from "@/components/auth/RoleGuard"
import { ImpersonationProvider } from "@/components/admin/ImpersonationContext"
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner"

export const metadata: Metadata = {
  title: "Admin Dashboard - ampertalent",
  description: "Manage platform operations, vet job postings, review users, and monitor platform analytics. Administrative tools for platform management.",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <ImpersonationProvider>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <ImpersonationBanner />
          <AdminNav />
          <main className="flex-1">{children}</main>
          <AppFooter />
        </div>
      </ImpersonationProvider>
    </RoleGuard>
  )
}