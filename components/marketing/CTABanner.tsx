'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, defaultTransition } from './animations'

export default function CTABanner() {
    return (
        <section className="py-20 bg-gradient-to-br from-[#0066FF] to-[#0044CC] relative overflow-hidden">
            {/* Animated decoration blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.12, 0.05] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white blur-2xl"
                />
                <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.05, 0.1, 0.05] }}
                    transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
                    className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-white blur-2xl"
                />
            </div>

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <motion.div
                    variants={staggerContainer(0.12)}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.4 }}
                >
                    <motion.h2
                        variants={fadeUp}
                        transition={defaultTransition}
                        className="text-3xl md:text-4xl font-extrabold text-white mb-4"
                    >
                        Ready to Get Started?
                    </motion.h2>
                    <motion.p
                        variants={fadeUp}
                        transition={defaultTransition}
                        className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto"
                    >
                        Join thousands of employers and job seekers who have found their perfect match on Ampertalent. It only takes a few minutes to get started.
                    </motion.p>
                    <motion.div
                        variants={fadeUp}
                        transition={defaultTransition}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                href="/sign-up?sku=2164544"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#0066FF] font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-xl"
                            >
                                Post a Job — $97
                                <ArrowRight size={16} />
                            </Link>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                href="/sign-up?sku=2231035"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
                            >
                                Start Free Trial
                                <ArrowRight size={16} />
                            </Link>
                        </motion.div>
                    </motion.div>
                    <motion.p
                        variants={fadeUp}
                        transition={defaultTransition}
                        className="mt-6 text-sm text-blue-200"
                    >
                        No credit card required · Cancel anytime · 100% commission-free
                    </motion.p>
                </motion.div>
            </div>
        </section>
    )
}
