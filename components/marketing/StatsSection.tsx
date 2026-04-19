'use client'

import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, defaultTransition } from './animations'

export default function StatsSection() {
    const stats = [
        { value: '50,000+', label: 'Job Seekers' },
        { value: '30,000+', label: 'Jobs Posted' },
        { value: '18', label: 'Years in Business' },
        { value: '5★', label: 'Rated by Employers' },
    ]

    return (
        <section className="bg-white py-12 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
                    variants={staggerContainer(0.12)}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.4 }}
                >
                    {stats.map((stat) => (
                        <motion.div
                            key={stat.label}
                            variants={fadeUp}
                            transition={defaultTransition}
                            whileHover={{ scale: 1.06 }}
                        >
                            <div className="text-3xl md:text-4xl font-extrabold text-[#0066FF] mb-1">{stat.value}</div>
                            <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
