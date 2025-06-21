'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface PainPoint {
  icon: React.ElementType
  title: string
  description: string
}

interface PainPointsSectionProps {
  painPoints: PainPoint[]
  accentColor: string
}

export function PainPointsSection({ painPoints, accentColor }: PainPointsSectionProps) {
  const getAccentClasses = () => {
    switch (accentColor) {
      case 'blue': return 'bg-blue-950/50 border-blue-900/50 text-blue-400'
      case 'purple': return 'bg-purple-950/50 border-purple-900/50 text-purple-400'
      case 'green': return 'bg-green-950/50 border-green-900/50 text-green-400'
      case 'orange': return 'bg-orange-950/50 border-orange-900/50 text-orange-400'
      case 'teal': return 'bg-teal-950/50 border-teal-900/50 text-teal-400'
      default: return 'bg-blue-950/50 border-blue-900/50 text-blue-400'
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
            Sound Familiar?
          </h2>
          <p className="text-xl text-gray-400">
            These challenges cost you time, money, and opportunities every day
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {painPoints.map((point, index) => {
            const Icon = point.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg border ${getAccentClasses()}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {point.title}
                    </h3>
                    <p className="text-gray-400">
                      {point.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}