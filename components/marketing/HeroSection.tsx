import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1A2D47] via-[#0d1f36] to-[#0A1628] pt-32 pb-20 md:pt-40 md:pb-28">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#0066FF]/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-[#00BB88]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-[#00D9FF]/5 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#0066FF]/15 border border-[#0066FF]/30 text-[#60A5FA] px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00BB88] animate-pulse" />
            Trusted by 50,000+ professionals
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            The Smart Way to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066FF] to-[#00D9FF]">
              Hire Remote Talent
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-4 leading-relaxed">
            A quick and easy way to find vetted remote professionals — without skimming through thousands of spammy applications.
          </p>

          {/* Trust bullets */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-10 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#00BB88]" /> No commission ever</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#00BB88]" /> US-based talent</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#00BB88]" /> Scam-free listings</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#00BB88]" /> Cancel anytime</span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up?sku=2164544"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-blue-700 text-white font-semibold text-base px-8 py-4 rounded-xl transition-all shadow-lg shadow-blue-900/40 hover:shadow-blue-800/60"
            >
              Post a Job
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/sign-up?sku=2231035"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-base px-8 py-4 rounded-xl transition-all backdrop-blur-sm"
            >
              Find a Job
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Social proof note */}
          <p className="mt-6 text-xs text-gray-500">
            No credit card required to browse · Employers post first job in minutes
          </p>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60V30C360 0 720 60 1080 30C1260 15 1380 5 1440 0V60H0Z" fill="white" />
        </svg>
      </div>
    </section>
  )
}
