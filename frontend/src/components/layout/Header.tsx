'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronDown, FileText, BookOpen, HelpCircle, Sparkles } from 'lucide-react'
import { UseCasesDropdown } from '@/components/landing/UseCasesModal'

interface NavItem {
  label: string
  href?: string
  dropdown?: boolean
  component?: React.ReactNode
}

const primaryNavItems: NavItem[] = [
  {
    label: 'Use Cases',
    dropdown: true,
    component: <UseCasesDropdown />
  },
  {
    label: 'Pricing',
    href: '/pricing'
  }
]

const resourcesItems = [
  {
    label: 'Documentation',
    href: '/docs',
    icon: FileText,
    description: 'Get started with our API and integrations'
  },
  {
    label: 'Blog',
    href: '/blog',
    icon: BookOpen,
    description: 'Latest updates and insights'
  },
  {
    label: 'Support',
    href: '/support',
    icon: HelpCircle,
    description: 'Get help from our team'
  }
]

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isResourcesOpen, setIsResourcesOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleNavClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href)
      element?.scrollIntoView({ behavior: 'smooth' })
    } else {
      router.push(href)
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-border transition-all duration-300 ${
        isScrolled ? 'bg-background/95 shadow-lg' : 'bg-background/80'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image 
              src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//DarkMode2.png"
              alt="liveprompt.ai - AI-powered conversation intelligence platform"
              width={140}
              height={32}
              className="object-contain transition-transform group-hover:scale-105"
            />
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-app-success/10 border border-app-success/30 text-app-success">
              <Sparkles className="w-3 h-3" />
              Beta
            </span>
          </Link>
          
          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {/* Primary Navigation */}
            <div className="flex items-center">
              {primaryNavItems.map((item) => (
                <div key={item.label}>
                  {item.component ? (
                    item.component
                  ) : (
                    <Link
                      href={item.href || '#'}
                      className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                        pathname === item.href
                          ? 'text-foreground bg-muted'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}

              {/* Resources Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsResourcesOpen(!isResourcesOpen)}
                  onBlur={() => setTimeout(() => setIsResourcesOpen(false), 200)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  Resources
                  <ChevronDown className={`w-4 h-4 transition-transform ${isResourcesOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isResourcesOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-2 w-72 rounded-xl shadow-2xl overflow-hidden bg-card border border-border"
                    >
                      {resourcesItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-start gap-3 p-4 transition-colors group hover:bg-muted/50"
                            onClick={() => setIsResourcesOpen(false)}
                          >
                            <div className="p-2 rounded-lg transition-colors bg-muted">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium mb-0.5 text-foreground">
                                {item.label}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                          </Link>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Secondary Navigation - Right Side */}
          <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => router.push('/auth/login')}
                className="px-4 py-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
              >
                Sign In
              </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t bg-card border-border"
          >
            <div className="px-4 py-4 space-y-2">
              {primaryNavItems.map((item) => (
                <div key={item.label}>
                  {item.href ? (
                    <button
                      onClick={() => handleNavClick(item.href!)}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        pathname === item.href
                          ? 'text-foreground bg-muted'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <div className="px-4 py-3 text-sm font-medium text-muted-foreground">
                      {item.label}
                    </div>
                  )}
                </div>
              ))}

              <div className="border-t pt-2 border-border">
                <div className="px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
                  Resources
                </div>
                {resourcesItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleNavClick(item.href)}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2 border-border">
                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Sign In
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}