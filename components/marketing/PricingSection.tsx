'use client'

import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeUp, scaleIn, staggerContainer, defaultTransition } from './animations'

// Real employer job posting packages (from marketing-sku-mapping.ts)
const employerJobPlans = [
    {
        name: 'Standard Job Post',
        sku: '2164544',
        price: '$97',
        period: 'one-time',
        description: 'Post one job and receive qualified applicants.',
        features: [
            'Single job listing',
            'Access to full candidate pool',
            'Applicants apply directly to you',
            'Listing stays active until filled',
        ],
        cta: 'Post a Standard Job',
        highlighted: false,
    },
    {
        name: 'Featured Job Post',
        sku: '2164540',
        price: '$127',
        period: 'one-time',
        description: 'Stand out with a featured placement for more visibility.',
        features: [
            'Everything in Standard',
            'Featured badge & priority placement',
            'More visibility to job seekers',
            'Highlighted in search results',
        ],
        cta: 'Post a Featured Job',
        highlighted: true,
    },
    {
        name: 'Solo Email Blast',
        sku: '2283656',
        price: '$249',
        period: 'one-time',
        description: 'Broadcast your job directly to our entire seeker base.',
        features: [
            'Dedicated email to all job seekers',
            'Your job — no competing listings',
            'High open rates from active candidates',
            'Great for urgent or competitive roles',
        ],
        cta: 'Send an Email Blast',
        highlighted: false,
    },
]

// Real employer concierge packages
const conciergeItems = [
    {
        name: 'Level I Concierge',
        sku: '2164534',
        price: '$1,695',
        description: 'Our HR specialists post, screen, and shortlist candidates for you.',
        features: ['Job posting managed for you', 'Resume screening', 'Candidate shortlist delivered', '1 hire supported'],
    },
    {
        name: 'Level II Concierge',
        sku: '2285877',
        price: '$2,695',
        description: 'Full-service hiring with deeper screening and interview support.',
        features: ['Everything in Level I', 'Phone screening included', 'Interview scheduling', 'More comprehensive shortlist'],
    },
    {
        name: 'Level III Concierge',
        sku: '2488598',
        price: '$3,995',
        description: 'Our most comprehensive white-glove hiring service.',
        features: ['Everything in Level II', 'Background check coordination', 'Offer letter assistance', 'Post-hire follow-up'],
    },
]

// Real seeker subscription plans
const seekerPlans = [
    {
        name: '3-Day Free Trial',
        sku: '2231035',
        price: 'Free',
        period: 'then $34.99/mo',
        description: 'Try the platform risk-free for 3 days.',
        features: ['Full job board access', 'Apply to unlimited jobs', 'Cancel before trial ends', 'No commitment'],
        highlighted: false,
    },
    {
        name: 'Gold Professional',
        sku: '2215562',
        price: '$49.99',
        period: 'every 2 months',
        description: 'Best value for active job seekers.',
        features: ['Full job board access', 'Apply to unlimited jobs', 'Career resources', 'Community access'],
        highlighted: true,
    },
    {
        name: 'Annual Platinum',
        sku: '2307158',
        price: '$299',
        period: 'per year',
        description: 'Maximum savings for dedicated professionals.',
        features: ['Everything in Gold', 'Priority job alerts', 'Best per-month value', 'Full year of access'],
        highlighted: false,
    },
]

export default function PricingSection() {
    return (
        <section id="pricing" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <motion.div
                    className="text-center mb-14"
                    variants={staggerContainer(0.12)}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.4 }}
                >
                    <motion.div variants={fadeUp} transition={defaultTransition}
                        className="inline-flex items-center gap-2 bg-blue-50 text-[#0066FF] px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                        Pricing
                    </motion.div>
                    <motion.h2 variants={fadeUp} transition={defaultTransition}
                        className="text-3xl md:text-4xl font-extrabold text-[#1A2D47] mb-4">
                        Simple, Transparent Pricing
                    </motion.h2>
                    <motion.p variants={fadeUp} transition={defaultTransition}
                        className="text-lg text-gray-500 max-w-xl mx-auto">
                        No hidden fees. No commissions. Cancel anytime.
                    </motion.p>
                </motion.div>

                {/* === EMPLOYER: Job Posting Plans === */}
                <div className="mb-16">
                    <motion.h3
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        transition={defaultTransition}
                        className="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-8"
                    >
                        Employer — Job Postings
                    </motion.h3>
                    <motion.div
                        className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
                        variants={staggerContainer(0.12)}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.2 }}
                    >
                        {employerJobPlans.map((plan) => (
                            <motion.div
                                key={plan.name}
                                variants={scaleIn}
                                transition={defaultTransition}
                                whileHover={{ y: -6, boxShadow: plan.highlighted ? '0 20px 40px -8px rgba(0,102,255,0.2)' : '0 12px 30px -8px rgba(0,0,0,0.1)' }}
                                className={`rounded-2xl p-8 border ${plan.highlighted
                                    ? 'border-[#0066FF] bg-gradient-to-b from-blue-50 to-white shadow-xl shadow-blue-100 relative'
                                    : 'border-gray-200 bg-white'
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
                                            <CheckCircle2 size={15} className="text-[#00C5A5] mt-0.5 flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                    <Link
                                        href={`/sign-up?sku=${plan.sku}`}
                                        className={`w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-colors ${plan.highlighted
                                            ? 'bg-[#0066FF] hover:bg-blue-700 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200 text-[#1A2D47]'
                                            }`}
                                    >
                                        {plan.cta} <ArrowRight size={14} />
                                    </Link>
                                </motion.div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                {/* === EMPLOYER: Concierge Plans === */}
                <motion.div
                    className="mb-16 bg-gradient-to-br from-[#1A2D47] to-[#0d1f36] rounded-3xl p-8 md:p-12"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={defaultTransition}
                >
                    <motion.div
                        className="text-center mb-10"
                        variants={staggerContainer(0.1)}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                    >
                        <motion.span variants={fadeUp} transition={defaultTransition}
                            className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                            White-Glove Service
                        </motion.span>
                        <motion.h3 variants={fadeUp} transition={defaultTransition}
                            className="text-2xl font-bold text-white mb-3">Concierge Hiring Plans</motion.h3>
                        <motion.p variants={fadeUp} transition={defaultTransition}
                            className="text-gray-400 max-w-xl mx-auto text-sm">
                            Let our HR specialists handle the entire search — screening, shortlisting, and delivering the right candidates to you.
                        </motion.p>
                    </motion.div>
                    <motion.div
                        className="grid md:grid-cols-3 gap-6"
                        variants={staggerContainer(0.12)}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.2 }}
                    >
                        {conciergeItems.map((plan) => (
                            <motion.div
                                key={plan.name}
                                variants={scaleIn}
                                transition={defaultTransition}
                                whileHover={{ y: -6, backgroundColor: 'rgba(255,255,255,0.12)' }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-6 transition-colors"
                            >
                                <h4 className="text-white font-bold mb-1">{plan.name}</h4>
                                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                                <div className="text-3xl font-extrabold text-[#00D9FF] mb-5">{plan.price}</div>
                                <ul className="space-y-2 mb-6">
                                    {plan.features.map((f) => (
                                        <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                                            <CheckCircle2 size={14} className="text-[#00C5A5] mt-0.5 flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                    <Link
                                        href={`/sign-up?sku=${plan.sku}`}
                                        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    >
                                        Get Started <ArrowRight size={14} />
                                    </Link>
                                </motion.div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>

                {/* === SEEKER: Subscription Plans === */}
                <div>
                    <motion.h3
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        transition={defaultTransition}
                        className="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-8"
                    >
                        Job Seekers — Subscription Plans
                    </motion.h3>
                    <motion.div
                        className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
                        variants={staggerContainer(0.12)}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.2 }}
                    >
                        {seekerPlans.map((plan) => (
                            <motion.div
                                key={plan.name}
                                variants={scaleIn}
                                transition={defaultTransition}
                                whileHover={{ y: -6, boxShadow: plan.highlighted ? '0 20px 40px -8px rgba(0,187,136,0.2)' : '0 12px 30px -8px rgba(0,0,0,0.1)' }}
                                className={`rounded-2xl p-8 border ${plan.highlighted
                                    ? 'border-[#00C5A5] bg-gradient-to-b from-teal-50 to-white shadow-xl shadow-teal-100 relative'
                                    : 'border-gray-200 bg-white'
                                    }`}
                            >
                                {plan.highlighted && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00C5A5] text-white text-xs font-bold px-4 py-1 rounded-full">
                                        BEST VALUE
                                    </div>
                                )}
                                <h4 className="text-lg font-bold text-[#1A2D47] mb-1">{plan.name}</h4>
                                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className={`text-4xl font-extrabold ${plan.highlighted ? 'text-[#00C5A5]' : 'text-[#1A2D47]'}`}>
                                        {plan.price}
                                    </span>
                                    <span className="text-gray-400 text-sm">{plan.period}</span>
                                </div>
                                <ul className="space-y-2.5 mb-8">
                                    {plan.features.map((f) => (
                                        <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                                            <CheckCircle2 size={15} className="text-[#00C5A5] mt-0.5 flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                    <Link
                                        href={`/sign-up?sku=${plan.sku}`}
                                        className={`w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-colors ${plan.highlighted
                                            ? 'bg-[#00C5A5] hover:bg-teal-600 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200 text-[#1A2D47]'
                                            }`}
                                    >
                                        Get Started <ArrowRight size={14} />
                                    </Link>
                                </motion.div>
                            </motion.div>
                        ))}
                    </motion.div>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="text-center text-xs text-gray-400 mt-6"
                    >
                        VIP Platinum ($79.99/3 months) also available · All plans include full job board access · Cancel anytime
                    </motion.p>
                </div>
            </div>
        </section>
    )
}
