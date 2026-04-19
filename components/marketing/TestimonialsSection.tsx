import { Star } from 'lucide-react'

const testimonials = [
  {
    quote:
      "I was skeptical at first, but within two weeks I had three qualified candidates. Hired one and she's been amazing. Worth every penny.",
    name: 'Sarah M.',
    role: 'Founder, Small Marketing Agency',
    stars: 5,
    type: 'employer',
  },
  {
    quote:
      "After months on other job boards getting ghosted, I found a part-time remote role through Ampertalent in under a week. The jobs here are actually real.",
    name: 'Jennifer R.',
    role: 'Virtual Assistant & Mom of 2',
    stars: 5,
    type: 'seeker',
  },
  {
    quote:
      "The concierge service is unreal. They pre-screened everyone for me and I only had to interview 4 people before finding my perfect hire. Saved me so much time.",
    name: 'David K.',
    role: 'E-Commerce Business Owner',
    stars: 5,
    type: 'employer',
  },
  {
    quote:
      "I love that Ampertalent never takes a commission. What I earn, I keep. Plus the listings are actually legitimate — I can tell real effort went into curating them.",
    name: 'Lisa T.',
    role: 'Bookkeeper & Remote Professional',
    stars: 5,
    type: 'seeker',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            ★ 5-Star Rated
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1A2D47] mb-4">
            Loved by Employers &amp; Job Seekers Alike
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Don't just take our word for it — here's what real members say about Ampertalent.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-5">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${t.type === 'employer' ? 'bg-[#0066FF]' : 'bg-[#00BB88]'}`}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1A2D47]">{t.name}</div>
                  <div className="text-xs text-gray-400">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
