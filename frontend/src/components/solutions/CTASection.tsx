'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle } from 'lucide-react'

interface CTASectionProps {
  title: string
  accentColor: string
}

export function CTASection({ title, accentColor }: CTASectionProps) {
  const router = useRouter()
  
  const getAccentClasses = () => {
    switch (accentColor) {
      case 'blue': return 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-600/25'
      case 'purple': return 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-purple-600/25'
      case 'green': return 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-600/25'
      case 'orange': return 'from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 shadow-orange-600/25'
      case 'teal': return 'from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-teal-600/25'
      default: return 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-600/25'
    }
  }

  const benefits = [
    '14-day free trial',
    'No credit card required',
    'Cancel anytime',
    'Full feature access'
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Transform Your {title}?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join hundreds of teams already seeing incredible results
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={() => router.push('/auth/signup')}
              className={`bg-gradient-to-r ${getAccentClasses()} text-white px-8 py-4 rounded-lg font-medium transition-all hover:shadow-lg flex items-center justify-center gap-2 group`}
            >
              Start Free 14-Day Trial
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            
            <button
              onClick={() => router.push('/pricing')}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-8 py-4 rounded-lg font-medium transition-colors"
            >
              View Pricing
            </button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}