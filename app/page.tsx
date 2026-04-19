import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import MarketingNav from '@/components/marketing/MarketingNav'
import HeroSection from '@/components/marketing/HeroSection'
import StatsSection from '@/components/marketing/StatsSection'
import ForEmployersSection from '@/components/marketing/ForEmployersSection'
import ForSeekersSection from '@/components/marketing/ForSeekersSection'
import ServicesSection from '@/components/marketing/ServicesSection'
import TestimonialsSection from '@/components/marketing/TestimonialsSection'
import PricingSection from '@/components/marketing/PricingSection'
import CTABanner from '@/components/marketing/CTABanner'
import MarketingFooter from '@/components/marketing/MarketingFooter'

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
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <main>
        <HeroSection />
        <StatsSection />
        <ForEmployersSection />
        <ForSeekersSection />
        <ServicesSection />
        <TestimonialsSection />
        <PricingSection />
        <CTABanner />
      </main>
      <MarketingFooter />
    </div>
  )
}

