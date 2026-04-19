'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MarketingNav() {
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <motion.header
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-[72px]">
                    {/* Logo */}
                    <Link href="/" className="flex items-center flex-shrink-0">
                        <Image
                            src="/logo/ampertalent_logo_flat.png"
                            alt="Ampertalent"
                            width={200}
                            height={52}
                            className="h-12 w-auto"
                            priority
                        />
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {['How It Works', 'For Employers', 'For Job Seekers', 'Pricing'].map((label, i) => {
                            const href = ['#how-it-works', '#for-employers', '#for-seekers', '#pricing'][i]
                            return (
                                <motion.div key={label} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}>
                                    <Link href={href} className="text-sm font-medium text-gray-600 hover:text-[#0066FF] transition-colors">
                                        {label}
                                    </Link>
                                </motion.div>
                            )
                        })}
                    </nav>

                    {/* Desktop CTAs */}
                    <div className="hidden md:flex items-center gap-3">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.4 }}>
                            <Link
                                href="/sign-in"
                                className="text-sm font-medium text-gray-700 hover:text-[#0066FF] transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
                            >
                                Log In
                            </Link>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.52, duration: 0.4 }}
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                href="/sign-up?sku=2164544"
                                className="text-sm font-semibold text-white bg-[#0066FF] hover:bg-blue-700 transition-colors px-5 py-2 rounded-lg"
                            >
                                Post a Job
                            </Link>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.58, duration: 0.4 }}
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                href="/sign-up?sku=2231035"
                                className="text-sm font-semibold text-[#00C5A5] border border-[#00C5A5] hover:bg-teal-50 transition-colors px-5 py-2 rounded-lg"
                            >
                                Find a Job
                            </Link>
                        </motion.div>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={mobileOpen ? 'close' : 'open'}
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                            </motion.div>
                        </AnimatePresence>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        key="mobile-menu"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                        className="md:hidden overflow-hidden bg-white border-t border-gray-100"
                    >
                        <div className="px-4 py-4 space-y-3">
                            <Link href="#how-it-works" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-gray-700">How It Works</Link>
                            <Link href="#for-employers" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-gray-700">For Employers</Link>
                            <Link href="#for-seekers" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-gray-700">For Job Seekers</Link>
                            <Link href="#pricing" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-gray-700">Pricing</Link>
                            <div className="pt-2 flex flex-col gap-2">
                                <Link href="/sign-in" className="w-full text-center py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">
                                    Log In
                                </Link>
                                <Link href="/sign-up?sku=2164544" className="w-full text-center py-2.5 text-sm font-semibold text-white bg-[#0066FF] rounded-lg">
                                    Post a Job
                                </Link>
                                <Link href="/sign-up?sku=2231035" className="w-full text-center py-2.5 text-sm font-semibold text-[#00C5A5] border border-[#00C5A5] rounded-lg">
                                    Find a Job
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    )
}
