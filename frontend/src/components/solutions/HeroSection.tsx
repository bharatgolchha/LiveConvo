'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowRight, Play } from 'lucide-react'
import Image from 'next/image'

interface HeroSectionProps {
  headline: string
  subheadline: string
  cta: string
  accentColor: string
}

export function HeroSection({ headline, subheadline, cta, accentColor }: HeroSectionProps) {
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

  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              {headline}
            </h1>
            
            <p className="text-xl text-gray-300 mb-8">
              {subheadline}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push('/auth/signup')}
                className={`bg-gradient-to-r ${getAccentClasses()} text-white px-8 py-4 rounded-lg font-medium transition-all hover:shadow-lg flex items-center justify-center gap-2 group`}
              >
                {cta}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
              
              <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-8 py-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                Watch 2-min Demo
              </button>
            </div>
            
            <div className="mt-8 flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-900" />
                  ))}
                </div>
                <span className="text-sm text-gray-400">500+ teams using liveprompt</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//Screenshot%202025-06-04%20at%2010.42.34%20PM.png"
                alt="liveprompt.ai dashboard interface"
                width={800}
                height={600}
                className="w-full h-auto"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-gray-900/20 to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}