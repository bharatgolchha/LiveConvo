'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTheme } from '@/contexts/ThemeContext'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { resolvedTheme } = useTheme()
  
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-4 sm:px-6 lg:px-8">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-center mb-8"
      >
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src={resolvedTheme === 'dark' ? '/Logos/DarkMode.png' : '/Logos/LightMode.png'}
            alt="liveprompt.ai"
            width={200}
            height={50}
            className="object-contain"
            priority
          />
        </Link>
      </motion.div>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mx-auto w-full max-w-md"
      >
        <div className="bg-card rounded-2xl border border-border shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              {title}
            </h1>
            <p className="text-muted-foreground text-sm">
              {subtitle}
            </p>
          </div>

          {children}
        </div>
      </motion.div>
    </div>
  )
}