"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

interface LoadingModalProps {
  isOpen: boolean
  title?: string
  description?: string
  isNewSession?: boolean
}

export function LoadingModal({
  isOpen,
  title,
  description,
  isNewSession = false,
}: LoadingModalProps) {
  const [dots, setDots] = React.useState(0)

  React.useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setDots((prev) => (prev + 1) % 4)
      }, 500)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-sm [&>button]:hidden border-0 bg-background/95 backdrop-blur-xl">
        <DialogTitle className="sr-only">
          {title || (isNewSession ? "Starting New Session" : "Loading Session")}
        </DialogTitle>
        <div className="flex flex-col items-center justify-center py-8 px-4 space-y-6">
          {/* Animated Logo/Icon */}
          <div className="relative">
            <motion.div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500"
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <svg 
                className="w-8 h-8 text-white" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={isNewSession 
                    ? "M12 4v16m8-8H4" // Plus icon for new
                    : "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" // Chat icon for loading
                  }
                />
              </svg>
            </motion.div>
          </div>

          {/* Text Content */}
          <div className="text-center space-y-2 max-w-xs">
            {title && (
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-medium text-foreground"
              >
                {title}
              </motion.h3>
            )}
            
            {description && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-sm text-muted-foreground"
              >
                {description}
              </motion.p>
            )}

            {/* Animated dots */}
            <motion.div 
              className="flex justify-center items-center h-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <AnimatePresence mode="wait">
                <motion.div key={`dots-${dots}`} className="flex">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="inline-block w-1.5 h-1.5 mx-0.5 bg-blue-500 rounded-full"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: i < dots ? 1 : 0.3,
                        scale: i < dots ? 1.2 : 1,
                      }}
                      transition={{
                        duration: 0.3,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}