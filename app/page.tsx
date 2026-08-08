import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import LandingPageContent from './landing-page-content'

export default async function RootPage() {
  const user = await currentUser()

  if (user) {
    // Look up user role in the application database
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: user.id },
      select: {
        role: true,
        teamMemberships: {
          where: { status: { in: ['active', 'pending'] } },
          orderBy: { createdAt: 'desc' },
          select: {
            employer: { select: { companyName: true, userId: true } },
            status: true,
            createdAt: true,
          },
        },
      },
    })

    if (userProfile?.role && userProfile.role !== 'team_member') {
      if (userProfile.role === 'super_admin' || userProfile.role === 'admin') {
        redirect('/admin/dashboard')
      } else {
        redirect(`/${userProfile.role}/dashboard`)
      }
    }

    if (userProfile?.role === 'team_member') {
      redirect('/employer/dashboard')
    }

    // Logged in but no role → onboarding
    redirect('/onboarding')
  }

  // Unauthenticated → marketing landing page
  return <LandingPageContent />
}

