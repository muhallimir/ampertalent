import { UserCog, Layers, GraduationCap } from 'lucide-react'
import Link from 'next/link'

const services = [
    {
        icon: UserCog,
        title: 'Concierge Hiring Service',
        description:
            'Hiring the wrong person costs you time, money, and productivity. Let our HR specialists handle the entire search — from screening to shortlisting — so you can focus on growing your business.',
        cta: 'Learn More',
        href: '/sign-up?sku=2164534',
        color: 'blue',
    },
    {
        icon: Layers,
        title: 'Job Board Access',
        description:
            'Post unlimited job listings and browse a curated pool of pre-vetted remote professionals. Our platform surfaces the best candidates for your role — no fluff, no spam.',
        cta: 'Post a Job',
        href: '/sign-up?sku=2164544',
        color: 'teal',
    },
    {
        icon: GraduationCap,
        title: 'Career Training & Courses',
        description:
            'Feeling overwhelmed by the remote work transition? Unlock your full potential with expert-led training, resources, and personalized support to fast-track your remote career.',
        cta: 'Explore Courses',
        href: '/sign-up?sku=2231035',
        color: 'cyan',
    },
]

const colorMap: Record<string, { bg: string; icon: string; cta: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-[#0066FF]', cta: 'bg-[#0066FF] hover:bg-blue-700' },
    teal: { bg: 'bg-teal-50', icon: 'text-[#00BB88]', cta: 'bg-[#00BB88] hover:bg-teal-600' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-[#00D9FF]', cta: 'bg-[#00D9FF] hover:bg-cyan-500 text-[#1A2D47]' },
}

export default function ServicesSection() {
    return (
        <section id="how-it-works" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                        Our Services
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A2D47] mb-4">
                        Everything You Need in One Place
                    </h2>
                    <p className="text-lg text-gray-500 max-w-xl mx-auto">
                        Whether you&apos;re hiring or job searching, Ampertalent has the tools, talent, and support to help you succeed.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {services.map((s) => {
                        const c = colorMap[s.color]
                        return (
                            <div key={s.title} className="group rounded-2xl border border-gray-100 p-8 hover:shadow-xl transition-all hover:-translate-y-1 bg-white">
                                <div className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center mb-5`}>
                                    <s.icon size={26} className={c.icon} />
                                </div>
                                <h3 className="text-xl font-bold text-[#1A2D47] mb-3">{s.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-6">{s.description}</p>
                                <Link
                                    href={s.href}
                                    className={`inline-flex items-center gap-1.5 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors ${c.cta}`}
                                >
                                    {s.cta} →
                                </Link>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
