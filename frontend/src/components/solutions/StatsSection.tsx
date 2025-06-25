'use client'

import { motion } from 'framer-motion'

interface Stat {
  value: string
  label: string
}

interface StatsSectionProps {
  stats: Stat[]
  accentColor: string
}

export function StatsSection({ stats, accentColor }: StatsSectionProps) {
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
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Proven Results
          </h2>
          <p className="text-xl text-gray-400">
            Join hundreds of teams already transforming their performance
          </p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className={`text-4xl sm:text-5xl font-bold mb-2 ${getAccentClasses()}`}>
                {stat.value}
              </div>
              <div className="text-gray-400">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}