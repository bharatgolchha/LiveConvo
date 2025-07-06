'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'
import { Mail, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface EmailAuthToggleProps {
  isEmailMode: boolean
  onToggle: () => void
  toggleText?: string
}

export function EmailAuthToggle({ 
  isEmailMode, 
  onToggle, 
  toggleText = 'Continue with email' 
}: EmailAuthToggleProps) {
  return (
    <>
      <AnimatePresence>
        {!isEmailMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              type="button"
              variant="ghost"
              className="w-full h-12 text-muted-foreground hover:text-foreground font-normal flex items-center justify-center gap-2 transition-colors"
              onClick={onToggle}
            >
              <Mail className="w-4 h-4" />
              {toggleText}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEmailMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="mt-6"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">or continue with email</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export function EmailFormDivider() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="relative my-6"
    >
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-4 bg-card text-muted-foreground">or</span>
      </div>
    </motion.div>
  )
}

export function BackToGoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full h-10 text-muted-foreground hover:text-foreground font-normal flex items-center justify-center gap-2 transition-colors mt-4"
      onClick={onClick}
    >
      <ChevronUp className="w-4 h-4" />
      Back to sign in options
    </Button>
  )
}