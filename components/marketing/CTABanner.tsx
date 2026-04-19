import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function CTABanner() {
  return (
    <section className="py-20 bg-gradient-to-br from-[#0066FF] to-[#0044CC] relative overflow-hidden">
      {/* Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
          Join thousands of employers and job seekers who have found their perfect match on Ampertalent. It only takes a few minutes to get started.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-up?sku=2164544"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#0066FF] font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-xl"
          >
            Post a Job — $97
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/sign-up?sku=2231035"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
          >
            Start Free Trial
            <ArrowRight size={16} />
          </Link>
        </div>
        <p className="mt-6 text-sm text-blue-200">
          No credit card required · Cancel anytime · 100% commission-free
        </p>
      </div>
    </section>
  )
}
