'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

export default function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-xl font-bold text-[#1A2D47]">Ampertalent</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-[#0066FF] transition-colors">
              How It Works
            </Link>
            <Link href="#for-employers" className="text-sm font-medium text-gray-600 hover:text-[#0066FF] transition-colors">
              For Employers
            </Link>
            <Link href="#for-seekers" className="text-sm font-medium text-gray-600 hover:text-[#0066FF] transition-colors">
              For Job Seekers
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-[#0066FF] transition-colors">
              Pricing
            </Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-gray-700 hover:text-[#0066FF] transition-colors px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Log In
            </Link>
            <Link
              href="/sign-up?sku=2164544"
              className="text-sm font-semibold text-white bg-[#0066FF] hover:bg-blue-700 transition-colors px-5 py-2 rounded-lg"
            >
              Post a Job
            </Link>
            <Link
              href="/sign-up?sku=2231035"
              className="text-sm font-semibold text-[#00BB88] border border-[#00BB88] hover:bg-teal-50 transition-colors px-5 py-2 rounded-lg"
            >
              Find a Job
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
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
            <Link href="/sign-up?sku=2231035" className="w-full text-center py-2.5 text-sm font-semibold text-[#00BB88] border border-[#00BB88] rounded-lg">
              Find a Job
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
