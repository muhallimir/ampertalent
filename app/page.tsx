import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export default async function RootPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  } else {
    // Look up user role in the application database
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: user?.id },
      select: {
        role: true,
        teamMemberships: {
          where: {
            status: { in: ['active', 'pending'] }
          },
          orderBy: {
            createdAt: 'desc' // Get most recent first
          },
          select: {
            employer: {
              select: {
                companyName: true,
                userId: true
              }
            },
            status: true,
            createdAt: true
          }
        }
      },
    })

    // If there's a user role redirect to dashboard
    if (userProfile?.role && userProfile?.role !== 'team_member') {
      // Super admins and regular admins both go to admin dashboard
      if (userProfile.role === 'super_admin' || userProfile.role === 'admin') {
        redirect('/admin/dashboard')
      } else {
        redirect(`/${userProfile?.role}/dashboard`)
      }
    }

    // If there's a user role but it's a team member
    if (userProfile?.role === 'team_member') {
      // Team members go to employer dashboard (same as employer owner)
      redirect('/employer/dashboard')
    }

    // redirect to onboarding if there's a user but don't have a role
    redirect('/onboarding')
  }
}
