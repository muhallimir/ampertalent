'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, Shield, DollarSign, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeUp, scaleIn, staggerContainer, defaultTransition } from './animations'

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
                <motion.div
                    className="text-center mb-16"
                    variants={staggerContainer(0.1)}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <motion.div variants={fadeUp} transition={defaultTransition} className="inline-flex items-center gap-2 bg-teal-50 text-[#00BB88] px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                        For Job Seekers
                    </motion.div>
                    <motion.h2 variants={fadeUp} transition={defaultTransition} className="text-3xl md:text-4xl font-extrabold text-[#1A2D47] mb-4">
                        Find Legit Remote Work Faster &amp; Easier
                    </motion.h2>
                    <motion.p variants={fadeUp} transition={defaultTransition} className="text-lg text-gray-500 max-w-2xl mx-auto">
                        Tired of sorting through scammy listings and wasting hours on job boards? We connect talented professionals with legitimate, flexible remote jobs — handpicked just for you.
                    </motion.p>
                </motion.div>

                {/* Perks grid */}
                <motion.div
                    className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
                    variants={staggerContainer(0.1)}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.2 }}
                >
                    {perks.map((perk) => (
                        <motion.div
                            key={perk.title}
                            variants={scaleIn}
                            transition={defaultTransition}
                            whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                        >
                            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
                                <perk.icon size={22} className="text-[#00BB88]" />
                            </div>
                            <h4 className="font-bold text-[#1A2D47] mb-2">{perk.title}</h4>
                            <p className="text-sm text-gray-500 leading-relaxed">{perk.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* How it works for seekers */}
                <motion.div
                    className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 shadow-sm"
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.2 }}
                    transition={defaultTransition}
                >
                    <h3 className="text-2xl font-bold text-[#1A2D47] text-center mb-10">Get Started in 3 Simple Steps</h3>
                    <motion.div
                        className="grid md:grid-cols-3 gap-8 mb-10"
                        variants={staggerContainer(0.12)}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                    >
                        {steps.map((step) => (
                            <motion.div
                                key={step.num}
                                variants={fadeUp}
                                transition={defaultTransition}
                                className="flex gap-5"
                            >
                                <motion.div
                                    whileHover={{ rotate: 6, scale: 1.1 }}
                                    className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#0066FF] to-[#00D9FF] flex items-center justify-center"
                                >
                                    <span className="text-white font-bold text-sm">{step.num}</span>
                                </motion.div>
                                <div>
                                    <h4 className="font-bold text-[#1A2D47] mb-1">{step.title}</h4>
                                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="text-center">
                        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
                            <Link
                                href="/sign-up?sku=2231035"
                                className="inline-flex items-center gap-2 bg-[#00BB88] hover:bg-teal-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-teal-100"
                            >
                                Find Your Dream Job Today
                                <ArrowRight size={16} />
                            </Link>
                        </motion.div>
                        <p className="mt-3 text-xs text-gray-400">
                            Join today &amp; get instant access to new listings updated daily
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
