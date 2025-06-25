'use client'

import { motion } from 'framer-motion'

interface Integration {
  name: string
  logo?: string
}

interface IntegrationsSectionProps {
  integrations: Integration[]
  accentColor: string
}

export function IntegrationsSection({ integrations, accentColor }: IntegrationsSectionProps) {
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
            Works With Your Existing Tools
          </h2>
          <p className="text-xl text-gray-400">
            Seamless integration with the platforms you already use
          </p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {integrations.map((integration, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="flex items-center justify-center"
            >
              <div className="bg-gray-800 rounded-lg p-6 w-full h-24 flex items-center justify-center border border-gray-700 hover:border-gray-600 transition-colors">
                <span className="text-gray-400 font-medium text-center">
                  {integration.name}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}