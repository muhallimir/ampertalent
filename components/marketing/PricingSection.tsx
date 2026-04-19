import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'

const employerPlans = [
  {
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: 'Perfect for occasional hiring needs.',
    features: ['1 active job posting', 'Access to full candidate pool', 'Email support'],
    cta: 'Get Started',
    href: '/sign-up?role=employer',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$99',
    period: '/month',
    description: 'Best for growing teams hiring regularly.',
    features: ['5 active job postings', 'Priority candidate matching', 'Dedicated support', 'Featured listings'],
    cta: 'Most Popular',
    href: '/sign-up?role=employer',
    highlighted: true,
  },
  {
    name: 'Concierge',
    price: 'Custom',
    period: '',
    description: 'Full-service hiring with HR specialists.',
    features: ['Unlimited postings', 'HR specialist support', 'Full candidate screening', 'Dedicated account manager'],
    cta: 'Contact Us',
    href: '/sign-up?role=employer',
    highlighted: false,
  },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-[#0066FF] px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            Pricing
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A2D47] mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            No hidden fees. No commissions. Cancel anytime. Choose the plan that fits your hiring needs.
          </p>
        </div>

        {/* Employer Plans */}
        <div className="mb-6">
          <h3 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-8">For Employers</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {employerPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border ${plan.highlighted
                  ? 'border-[#0066FF] bg-gradient-to-b from-blue-50 to-white shadow-xl shadow-blue-100 relative'
                  : 'border-gray-200 bg-white hover:shadow-md transition-shadow'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0066FF] text-white text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h4 className="text-lg font-bold text-[#1A2D47] mb-1">{plan.name}</h4>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-extrabold ${plan.highlighted ? 'text-[#0066FF]' : 'text-[#1A2D47]'}`}>
                    {plan.price}
                  </span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle2 size={15} className="text-[#00BB88] mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-colors ${plan.highlighted
                    ? 'bg-[#0066FF] hover:bg-blue-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-[#1A2D47]'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Seeker CTA */}
        <div className="mt-14 bg-gradient-to-br from-[#00BB88]/10 to-teal-50 rounded-2xl p-8 md:p-12 text-center border border-teal-100">
          <h3 className="text-2xl font-bold text-[#1A2D47] mb-3">Looking for a Job Instead?</h3>
          <p className="text-gray-500 mb-6 max-w-lg mx-auto">
            Job seekers get affordable subscription plans with access to all verified remote listings, career tools, and community support.
          </p>
          <Link
            href="/sign-up?role=seeker"
            className="inline-flex items-center gap-2 bg-[#00BB88] hover:bg-teal-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-all"
          >
            View Seeker Plans
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
