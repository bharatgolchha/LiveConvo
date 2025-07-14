'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, Sparkles } from 'lucide-react'

interface FeatureHighlightProps {
  children: React.ReactNode
  tooltip: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function FeatureHighlight({ 
  children, 
  tooltip, 
  position = 'top' 
}: FeatureHighlightProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const getTooltipPosition = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2'
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2'
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2'
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    }
  }
  
  const getArrowPosition = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 -mt-1'
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 -mb-1 rotate-180'
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 -ml-1 -rotate-90'
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 -mr-1 rotate-90'
      default:
        return 'top-full left-1/2 -translate-x-1/2 -mt-1'
    }
  }
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        {children}
        <div className="absolute -top-1 -right-1">
          <div className="relative">
            <Sparkles className="w-3 h-3 text-app-success" />
            <div className="absolute inset-0 animate-ping">
              <Sparkles className="w-3 h-3 text-app-success opacity-75" />
            </div>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 ${getTooltipPosition()}`}
          >
            <div className="bg-app-success/10 border border-app-success/30 rounded-lg p-3 shadow-xl backdrop-blur-sm max-w-xs">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-app-success flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">{tooltip}</p>
              </div>
            </div>
            <div className={`absolute w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-app-success/30 ${getArrowPosition()}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}