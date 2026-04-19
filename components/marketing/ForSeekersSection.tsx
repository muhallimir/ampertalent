import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, Shield, DollarSign, Clock } from 'lucide-react'

export default function ForSeekersSection() {
  const perks = [
    { icon: Shield, title: 'Scam-Free Jobs', desc: 'Every listing is manually reviewed. No fake jobs, no bots.' },
    { icon: DollarSign, title: 'Keep 100% of Earnings', desc: 'We never take a commission — ever. What you earn is yours.' },
    { icon: Clock, title: 'Flexible Remote Work', desc: 'Jobs built around your life, your family, your schedule.' },
    { icon: Star, title: 'Career Support', desc: 'Tools, training, and a community that genuinely gets you.' },
  ]

  const steps = [
    { num: '01', title: 'Create Your Profile', desc: 'Sign up, upload your resume, and showcase your skills and experience.' },
    { num: '02', title: 'Browse & Apply', desc: 'Access fresh remote job listings updated daily. Apply to jobs that match your skills.' },
    { num: '03', title: 'Get Hired', desc: 'Connect directly with employers. No middleman, no commission cuts.' },
  ]

  return (
    <section id="for-seekers" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-[#00BB88] px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            For Job Seekers
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A2D47] mb-4">
            Find Legit Remote Work Faster &amp; Easier
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Tired of sorting through scammy listings and wasting hours on job boards? We connect talented professionals with legitimate, flexible remote jobs — handpicked just for you.
          </p>
        </div>

        {/* Perks grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {perks.map((perk) => (
            <div key={perk.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
                <perk.icon size={22} className="text-[#00BB88]" />
              </div>
              <h4 className="font-bold text-[#1A2D47] mb-2">{perk.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{perk.desc}</p>
            </div>
          ))}
        </div>

        {/* How it works for seekers */}
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 shadow-sm">
          <h3 className="text-2xl font-bold text-[#1A2D47] text-center mb-10">Get Started in 3 Simple Steps</h3>
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            {steps.map((step) => (
              <div key={step.num} className="flex gap-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#00D9FF] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{step.num}</span>
                </div>
                <div>
                  <h4 className="font-bold text-[#1A2D47] mb-1">{step.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/sign-up?role=seeker"
              className="inline-flex items-center gap-2 bg-[#00BB88] hover:bg-teal-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-teal-100"
            >
              Find Your Dream Job Today
              <ArrowRight size={16} />
            </Link>
            <p className="mt-3 text-xs text-gray-400">
              Join today &amp; get instant access to new listings updated daily
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
