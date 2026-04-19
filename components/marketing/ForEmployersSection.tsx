'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Users, Search, FileCheck, Briefcase } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeUp, fadeLeft, fadeRight, scaleIn, staggerContainer, defaultTransition } from './animations'

export default function ForEmployersSection() {
    const benefits = [
        'A curated pool of professionals — primarily US-based',
        'Applicants who value flexibility but work with excellence',
        'No spambots or job-hoppers — committed, capable candidates',
        'Talented professionals with admin, marketing, customer service skills',
        'Save time: get the right 5 candidates, not 500 resumes',
        'Concierge HR service available for hands-off hiring',
    ]

    const steps = [
        { icon: Briefcase, title: 'Post Your Job', desc: 'Create your job listing in minutes. Add your requirements, schedule, and budget.' },
        { icon: Search, title: 'Review Top Matches', desc: 'We surface the best-fit candidates. No spam, no bots — real, vetted professionals.' },
        { icon: Users, title: 'Hire with Confidence', desc: 'Interview, hire, and onboard your new team member. We support you every step.' },
    ]

    return (
        <section id="for-employers" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    className="text-center mb-16"
                    variants={staggerContainer(0.1)}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <motion.div variants={fadeUp} transition={defaultTransition} className="inline-flex items-center gap-2 bg-blue-50 text-[#0066FF] px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                        For Employers
                    </motion.div>
                    <motion.h2 variants={fadeUp} transition={defaultTransition} className="text-3xl md:text-4xl font-extrabold text-[#1A2D47] mb-4">
                        Find Your Next Rockstar Hire
                    </motion.h2>
                    <motion.p variants={fadeUp} transition={defaultTransition} className="text-lg text-gray-500 max-w-2xl mx-auto">
                        Get quality applicants without sorting through hundreds of resumes. We've spent 18+ years helping small businesses find the right person — faster, easier, and more affordably.
                    </motion.p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
                    {/* Left: Benefits */}
                    <motion.div
                        variants={fadeLeft}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.3 }}
                        transition={defaultTransition}
                    >
                        <h3 className="text-2xl font-bold text-[#1A2D47] mb-6">Why Ampertalent?</h3>
                        <motion.ul
                            className="space-y-3"
                            variants={staggerContainer(0.07)}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, amount: 0.2 }}
                        >
                            {benefits.map((b) => (
                                <motion.li key={b} variants={fadeUp} transition={defaultTransition} className="flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-[#00BB88] mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-600">{b}</span>
                                </motion.li>
                            ))}
                        </motion.ul>
                        <div className="mt-8">
                            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                                <Link
                                    href="/sign-up?sku=2164544"
                                    className="inline-flex items-center gap-2 bg-[#0066FF] hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-100"
                                >
                                    Post a Job Now
                                    <ArrowRight size={16} />
                                </Link>
                            </motion.div>
                            <p className="mt-3 text-xs text-gray-400">
                                ✓ Est. 2007 &nbsp;·&nbsp; ✓ 50,000+ candidates &nbsp;·&nbsp; ✓ 30,000+ jobs posted
                            </p>
                        </div>
                    </motion.div>

                    {/* Right: What you'll avoid */}
                    <motion.div
                        variants={fadeRight}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.3 }}
                        transition={defaultTransition}
                        className="bg-gradient-to-br from-[#1A2D47] to-[#0d1f36] rounded-2xl p-8 text-white"
                    >
                        <h3 className="text-xl font-bold mb-6">What You'll Avoid</h3>
                        <motion.ul
                            className="space-y-3 mb-8"
                            variants={staggerContainer(0.08)}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true }}
                        >
                            {[
                                'Wasting hours reviewing hundreds of wrong resumes',
                                "Onboarding someone who isn't the right fit",
                                'Paying for job boards with zero support',
                                'Sorting through spammy, unqualified applicants',
                            ].map((item) => (
                                <motion.li key={item} variants={fadeUp} transition={defaultTransition} className="flex items-start gap-3 text-gray-300">
                                    <span className="text-red-400 font-bold mt-0.5">✗</span>
                                    <span>{item}</span>
                                </motion.li>
                            ))}
                        </motion.ul>
                        <div className="border-t border-white/10 pt-6">
                            <p className="text-sm text-gray-400 mb-3">Perfect for:</p>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li>✔ Solo entrepreneurs who need help fast</li>
                                <li>✔ Small business owners needing reliable team members</li>
                                <li>✔ Founders juggling everything who need qualified help now</li>
                            </ul>
                        </div>
                    </motion.div>
                </div>

                {/* How it works */}
                <div className="border-t border-gray-100 pt-16">
                    <motion.h3
                        className="text-2xl font-bold text-[#1A2D47] text-center mb-12"
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        transition={defaultTransition}
                    >
                        How It Works for Employers
                    </motion.h3>
                    <motion.div
                        className="grid md:grid-cols-3 gap-8"
                        variants={staggerContainer(0.15)}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.2 }}
                    >
                        {steps.map((step, i) => (
                            <motion.div
                                key={step.title}
                                variants={fadeUp}
                                transition={defaultTransition}
                                whileHover={{ y: -6 }}
                                className="text-center"
                            >
                                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-4">
                                    <step.icon size={28} className="text-[#0066FF]" />
                                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0066FF] text-white text-xs font-bold flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-[#1A2D47] mb-2">{step.title}</h4>
                                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    )
}