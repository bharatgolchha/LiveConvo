'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronDown, FileText, BookOpen, HelpCircle, Sparkles } from 'lucide-react'
import { UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { UseCasesDropdown } from '@/components/landing/UseCasesModal'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'

interface NavItem {
  label: string
  href?: string
  dropdown?: boolean
  component?: React.ReactNode
}

const primaryNavItems: NavItem[] = [
  // Hidden for now
  // {
  //   label: 'Use Cases',
  //   dropdown: true,
  //   component: <UseCasesDropdown />
  // },
  {
    label: 'Blog',
    href: '/blog'
  },
  {
    label: 'Pricing',
    href: '/pricing'
  },
  {
    label: 'Careers',
    href: 'https://skillspot.ai/job_board/1752571116439x176146420708409340'
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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const { user, signOut } = useAuth()
  const { resolvedTheme } = useTheme()

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

  // Fetch user data when user is logged in
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (data && !error) {
          setUserData(data)
        }
      } else {
        setUserData(null)
      }
    }
    
    fetchUserData()
  }, [user])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-menu-container')) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Logout error:', error)
    }
    router.push('/')
  }

  const handleNavClick = (href: string) => {
    if (href.startsWith('http')) {
      window.open(href, '_blank')
    } else if (href.startsWith('#')) {
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
              src={pathname === '/' ? '/Logos/DarkMode.png' : (resolvedTheme === 'dark' ? '/Logos/DarkMode.png' : '/Logos/LightMode.png')}
              alt="liveprompt.ai - AI-powered conversation intelligence platform"
              width={160}
              height={40}
              className="object-contain transition-transform group-hover:scale-105"
              priority
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
                  ) : item.href?.startsWith('http') ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50`}
                    >
                      {item.label}
                    </a>
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

              {/* Resources Dropdown - Hidden for now */}
              {/* <div className="relative">
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
              </div> */}
            </div>
          </div>

          {/* Secondary Navigation - Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {user && userData ? (
              <>
                <button
                  onClick={() => {
                    console.log('Dashboard button clicked');
                    console.log('Navigating to dashboard...');
                    window.location.href = '/dashboard';
                  }}
                  className="px-4 py-2 text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                >
                  Dashboard
                </button>
                
                {/* User Menu */}
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <UserCircleIcon className="w-8 h-8 text-muted-foreground" />
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border py-1 z-50"
                      >
                        <div className="px-4 py-2 border-b border-border">
                          <p className="text-sm font-medium text-foreground">{userData.full_name || 'User'}</p>
                          <p className="text-xs text-muted-foreground">{userData.email}</p>
                        </div>

                        <button
                          onClick={() => {
                            router.push('/dashboard')
                            setUserMenuOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent flex items-center space-x-2"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                          <span>Settings</span>
                        </button>

                        <div className="border-t border-border mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center space-x-2"
                          >
                            <ArrowRightOnRectangleIcon className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <button
                onClick={() => router.push('/auth/login')}
                className="px-4 py-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
              >
                Sign In
              </button>
            )}
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

              {/* Resources section - Hidden for now */}
              {/* <div className="border-t pt-2 border-border">
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
              </div> */}

              <div className="border-t pt-4 space-y-2 border-border">
                {user && userData ? (
                  <>
                    <button
                      onClick={() => {
                        router.push('/dashboard')
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Dashboard
                    </button>
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{userData.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{userData.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        router.push('/dashboard')
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors text-destructive hover:bg-destructive/10"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}