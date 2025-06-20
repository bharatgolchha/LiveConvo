'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface Feature {
  title: string
  description: string
  icon: LucideIcon
}

interface FeaturesGridProps {
  features: Feature[]
  accentColor: string
}

export function FeaturesGrid({ features, accentColor }: FeaturesGridProps) {
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
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-gray-400">
            Powerful AI features designed for your specific workflow
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className={`w-12 h-12 mb-4 ${getAccentClasses()}`}>
                  <Icon className="w-full h-full" />
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-gray-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}