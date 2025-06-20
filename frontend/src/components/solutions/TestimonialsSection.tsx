'use client'

import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'

interface Testimonial {
  quote: string
  author: string
  role: string
  company: string
  avatar?: string
}

interface TestimonialsSectionProps {
  testimonials: Testimonial[]
  accentColor: string
}

export function TestimonialsSection({ testimonials, accentColor }: TestimonialsSectionProps) {
  const getAccentClasses = () => {
    switch (accentColor) {
      case 'blue': return 'text-blue-400'
      case 'purple': return 'text-purple-400'
      case 'green': return 'text-green-400'
      case 'orange': return 'text-orange-400'
      case 'teal': return 'text-teal-400'
      default: return 'text-blue-400'
    }
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Trusted by Industry Leaders
          </h2>
          <p className="text-xl text-gray-400">
            See what our customers have to say
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-gray-800/50 rounded-xl p-6 border border-gray-700"
            >
              <Quote className={`w-8 h-8 mb-4 ${getAccentClasses()}`} />
              <p className="text-gray-300 mb-6 italic">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-700" />
                <div>
                  <div className="font-semibold text-white">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-gray-400">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}