'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, Menu, X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MarketingNavProps {
    onDemoModeOpen?: () => void
}

export default function MarketingNav({ onDemoModeOpen }: MarketingNavProps) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [ctaOpen, setCtaOpen] = useState(false)

    return (
        <motion.header
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-sm border-b border-gray-100 shadow-sm"
        >
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                <div className="flex items-center justify-between h-[52px] sm:h-[60px] lg:h-[84px]">
                    {/* Logo */}
                    <Link href="/" className="flex items-center flex-shrink-0">
                        <Image
                            src="/logo/ampertalent_logo.png"
                            alt="Ampertalent"
                            width={200}
                            height={52}
                            className="h-7 sm:h-8 lg:h-20 w-auto"
                            priority
                        />
                    </Link>

                    {/* Tablet Nav (768–1023px) */}
                    <nav className="hidden md:flex lg:hidden items-center gap-6">
                        {['How It Works', 'Employers', 'Seekers', 'Pricing'].map((label, i) => {
                            const href = ['#how-it-works', '#for-employers', '#for-seekers', '#pricing'][i]
                            return (
                                <Link
                                    key={label}
                                    href={href}
                                    className="text-xs sm:text-sm font-medium text-gray-600 hover:text-[#0066FF] transition-colors whitespace-nowrap"
                                >
                                    {label}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Tablet CTAs — single dropdown + one primary button (768–1023px) */}
                    <div className="hidden md:flex lg:hidden items-center gap-2">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setCtaOpen(!ctaOpen)}
                                className="flex items-center gap-1 text-xs sm:text-sm text-gray-700 font-medium hover:text-[#0066FF] transition-colors"
                            >
                                Account
                                <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <AnimatePresence>
                                {ctaOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => { onDemoModeOpen?.(); setCtaOpen(false) }}
                                            className="w-full text-left px-3 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-1.5"
                                        >
                                            <Sparkles className="h-3 w-3" /> Try Demo
                                        </button>
                                        <Link href="/sign-in" className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 block">
                                            Log In
                                        </Link>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Link
                                href="/sign-up?sku=2164544"
                                className="text-xs font-semibold text-white bg-[#0066FF] hover:bg-blue-700 px-3 py-1.5 rounded text-center"
                            >
                                Post a Job
                            </Link>
                            <Link
                                href="/sign-up?sku=2231035"
                                className="text-xs font-semibold text-[#0066FF] border border-[#0066FF] hover:bg-blue-50 px-3 py-1.5 rounded text-center"
                            >
                                Find a Job
                            </Link>
                        </div>
                    </div>

                    {/* Desktop Nav (1024px+) */}
                    <nav className="hidden lg:flex items-center gap-8">
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

                    {/* Desktop CTAs (1024px+) */}
                    <div className="hidden lg:flex items-center gap-3">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.4 }}>
                            <button
                                type="button"
                                data-testid="marketing-try-demo"
                                onClick={() => onDemoModeOpen?.()}
                                className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors px-4 py-2 rounded-lg flex items-center gap-1.5"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                Try Demo
                            </button>
                        </motion.div>
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

                    {/* Mobile + Tablet Hamburger (< 1024px) */}
                    <button
                        type="button"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="lg:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
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

            {/* Mobile + Tablet Menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        key="mobile-menu"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                        className="lg:hidden overflow-hidden bg-white border-t border-gray-100"
                        style={{ maxHeight: 'calc(100dvh - 52px)' }}
                    >
                        <div className="px-3 py-3 space-y-2">
                            <Link href="#how-it-works" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700">How It Works</Link>
                            <Link href="#for-employers" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700">For Employers</Link>
                            <Link href="#for-seekers" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700">For Job Seekers</Link>
                            <Link href="#pricing" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700">Pricing</Link>
                            <div className="pt-2 space-y-2">
                                <button
                                    type="button"
                                    onClick={() => { onDemoModeOpen?.(); setMobileOpen(false) }}
                                    className="w-full text-center py-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center gap-1.5"
                                >
                                    <Sparkles className="h-3.5 w-3.5" /> Try Demo
                                </button>
                                <Link href="/sign-in" className="block w-full text-center py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">
                                    Log In
                                </Link>
                                <div className="grid grid-cols-2 gap-2">
                                    <Link
                                        href="/sign-up?sku=2164544"
                                        className="text-center py-2 text-sm font-semibold text-white bg-[#0066FF] rounded-lg"
                                    >
                                        Post a Job
                                    </Link>
                                    <Link
                                        href="/sign-up?sku=2231035"
                                        className="text-center py-2 text-sm font-semibold text-[#0066FF] border border-[#0066FF] rounded-lg"
                                    >
                                        Find a Job
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    )
}
