'use client'

import { useState } from 'react'
import { DemoModeModal } from '@/components/demo/DemoModeModal'
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

export default function LandingPageContent() {
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav onDemoModeOpen={() => setDemoOpen(true)} />
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
      <DemoModeModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  )
}
