'use client'

import Link from 'next/link'
import {
  Heart,
  Mail,
  Phone,
  MapPin,
  HelpCircle,
  Users,
  Briefcase
} from 'lucide-react'

export function AppFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        {/* Main Footer Content - COMMENTED OUT */}
        {/*
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
        {/*
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-brand-teal rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">HMM</span>
              </div>
              <span className="font-semibold text-gray-900">AmperTalent</span>
            </div>
            <p className="text-sm text-gray-600">
              The trusted platform connecting talented remote professionals with family-friendly employers.
            </p>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-brand-coral fill-current" />
              <span>for working parents</span>
            </div>
          </div>

          {/* For Job Seekers */}
        {/*
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Users className="h-4 w-4 mr-2 text-brand-teal" />
              For Job Seekers
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/seeker/jobs" className="text-gray-600 hover:text-brand-teal transition-colors">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link href="/seeker/profile" className="text-gray-600 hover:text-brand-teal transition-colors">
                  Build Profile
                </Link>
              </li>
              <li>
                <Link href="/seeker/resume-critique" className="text-gray-600 hover:text-brand-teal transition-colors">
                  Resume Critique
                </Link>
              </li>
              <li>
                <Link href="/seeker/subscription" className="text-gray-600 hover:text-brand-teal transition-colors">
                  Premium Features
                </Link>
              </li>
            </ul>
          </div>

          {/* For Employers */}
        {/*
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Briefcase className="h-4 w-4 mr-2 text-brand-teal" />
              For Employers
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/employer/jobs/new" className="text-gray-600 hover:text-brand-teal transition-colors">
                  Post a Job
                </Link>
              </li>
              <li>
                <Link href="/employer/applications" className="text-gray-600 hover:text-brand-teal transition-colors">
                  View Applications
                </Link>
              </li>
              <li>
                <Link href="/employer/profile" className="text-gray-600 hover:text-brand-teal transition-colors">
                  Company Profile
                </Link>
              </li>
              <li>
                <Link href="/employer/billing" className="text-gray-600 hover:text-brand-teal transition-colors">
                  Billing & Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
        {/*
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <HelpCircle className="h-4 w-4 mr-2 text-brand-teal" />
              Support & Legal
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="text-gray-600 hover:text-brand-teal transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-brand-teal transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-brand-teal transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-brand-teal transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        */}

        {/* Contact Information */}
        <div className="border-t border-gray-200 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                <a href="mailto:contact@ampertalent.com" className="hover:text-brand-teal transition-colors">
                  contact@ampertalent.com
                </a>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                <a href="tel:+12814071651" className="hover:text-brand-teal transition-colors">
                  281-407-1651
                </a>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              <span>Remote-First Company</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-6 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <p className="text-sm text-gray-600">
              © {currentYear} AmperTalent. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Empowering remote work since 2007</span>
              <span>•</span>
              <span className="text-brand-teal font-medium">
                1269+ families supported
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}