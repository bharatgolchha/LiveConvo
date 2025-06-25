'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface FAQ {
  question: string
  answer: string
}

interface SolutionFAQProps {
  faqs: FAQ[]
  accentColor: string
}

export function SolutionFAQ({ faqs, accentColor }: SolutionFAQProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

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
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-400">
            Everything you need to know about getting started
          </p>
        </motion.div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-800/70 transition-colors"
              >
                <span className="font-semibold text-lg">
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 transition-transform ${
                    expandedIndex === index ? 'rotate-180' : ''
                  } ${getAccentClasses()}`}
                />
              </button>
              
              <AnimatePresence>
                {expandedIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-4 text-gray-400">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}