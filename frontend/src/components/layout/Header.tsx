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
    label: 'Solutions',
    dropdown: true,
    component: <UseCasesDropdown />
  },
  {
    label: 'Features',
    href: '/features'
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
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b transition-all duration-300"
      style={{ 
        backgroundColor: isScrolled ? 'rgba(3, 7, 18, 0.95)' : 'rgba(3, 7, 18, 0.8)', 
        borderColor: '#374151',
        boxShadow: isScrolled ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none'
      }}
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
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', border: '1px solid rgba(22, 163, 74, 0.3)', color: '#16a34a' }}>
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
                      className="px-4 py-2 text-sm font-medium transition-colors rounded-lg"
                      style={{
                        color: pathname === item.href ? '#ffffff' : '#d1d5db',
                        backgroundColor: pathname === item.href ? '#374151' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (pathname !== item.href) {
                          e.currentTarget.style.color = '#ffffff'
                          e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (pathname !== item.href) {
                          e.currentTarget.style.color = '#d1d5db'
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
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
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                  style={{ color: '#d1d5db' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffffff'
                    e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#d1d5db'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
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
                      className="absolute top-full left-0 mt-2 w-72 rounded-xl shadow-2xl overflow-hidden"
                      style={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    >
                      {resourcesItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-start gap-3 p-4 transition-colors group"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={() => setIsResourcesOpen(false)}
                          >
                            <div className="p-2 rounded-lg transition-colors" style={{ backgroundColor: '#374151' }}>
                              <Icon className="w-4 h-4" style={{ color: '#9ca3af' }} />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium mb-0.5" style={{ color: '#ffffff' }}>
                                {item.label}
                              </h4>
                              <p className="text-xs" style={{ color: '#9ca3af' }}>
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
                className="px-4 py-2 text-sm font-medium transition-colors"
                style={{ color: '#d1d5db' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  const waitlistElement = document.getElementById('waitlist')
                  if (waitlistElement) {
                    waitlistElement.scrollIntoView({ behavior: 'smooth' })
                  } else {
                    router.push('/auth/signup')
                  }
                }}
                className="px-5 py-2 rounded-lg font-medium text-sm transition-all"
                style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#15803d'
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(22, 163, 74, 0.25), 0 4px 6px -2px rgba(22, 163, 74, 0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#16a34a'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                Get Early Access
              </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: '#9ca3af' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff'
              e.currentTarget.style.backgroundColor = '#374151'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
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
            className="md:hidden border-t"
            style={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
          >
            <div className="px-4 py-4 space-y-2">
              {primaryNavItems.map((item) => (
                <div key={item.label}>
                  {item.href ? (
                    <button
                      onClick={() => handleNavClick(item.href!)}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        color: pathname === item.href ? '#ffffff' : '#d1d5db',
                        backgroundColor: pathname === item.href ? '#374151' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (pathname !== item.href) {
                          e.currentTarget.style.color = '#ffffff'
                          e.currentTarget.style.backgroundColor = '#374151'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (pathname !== item.href) {
                          e.currentTarget.style.color = '#d1d5db'
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <div className="px-4 py-3 text-sm font-medium" style={{ color: '#9ca3af' }}>
                      {item.label}
                    </div>
                  )}
                </div>
              ))}

              <div className="border-t pt-2" style={{ borderColor: '#374151' }}>
                <div className="px-4 py-2 text-xs font-medium uppercase" style={{ color: '#9ca3af' }}>
                  Resources
                </div>
                {resourcesItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleNavClick(item.href)}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: '#d1d5db' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ffffff'
                      e.currentTarget.style.backgroundColor = '#374151'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#d1d5db'
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2" style={{ borderColor: '#374151' }}>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: '#d1d5db' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffffff'
                    e.currentTarget.style.backgroundColor = '#374151'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#d1d5db'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    const waitlistElement = document.getElementById('waitlist')
                    if (waitlistElement) {
                      waitlistElement.scrollIntoView({ behavior: 'smooth' })
                    } else {
                      router.push('/auth/signup')
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg font-medium text-sm transition-colors"
                  style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                >
                  Get Early Access
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}