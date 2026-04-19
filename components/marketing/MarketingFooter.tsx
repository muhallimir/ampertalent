import Link from 'next/link'
import { Mail, Phone, MapPin } from 'lucide-react'

const quickLinks = [
  { label: 'Post a Job', href: '/sign-up?role=employer' },
  { label: 'Find a Job', href: '/sign-up?role=seeker' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'For Employers', href: '#for-employers' },
  { label: 'For Job Seekers', href: '#for-seekers' },
]

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
]

export default function MarketingFooter() {
  return (
    <footer className="bg-[#0d1f36] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0066FF] flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-bold text-white">Ampertalent</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              The trusted platform connecting talented remote professionals with flexible employers. Where flexible talent meets opportunity.
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {[
                { label: 'LinkedIn', href: '#', icon: 'in' },
                { label: 'Twitter', href: '#', icon: 'X' },
                { label: 'Facebook', href: '#', icon: 'f' },
                { label: 'Instagram', href: '#', icon: '◎' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#0066FF] flex items-center justify-center text-xs text-white transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail size={16} className="text-[#0066FF] mt-0.5 flex-shrink-0" />
                <a href="mailto:hello@ampertalent.com" className="text-sm text-gray-400 hover:text-white transition-colors">
                  hello@ampertalent.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={16} className="text-[#0066FF] mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-400">
                  <div>Mon–Fri 9:00 AM – 5:00 PM CST</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-[#0066FF] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-400">United States</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} Ampertalent™ — All Rights Reserved.</span>
          <div className="flex gap-4">
            {legalLinks.map((l) => (
              <Link key={l.label} href={l.href} className="hover:text-gray-300 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
