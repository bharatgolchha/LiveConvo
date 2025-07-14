'use client'

import { useState, useRef, useEffect } from 'react'
import { X, ChevronRight, Users, Briefcase, HeadphonesIcon, GraduationCap, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface UseCase {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ElementType
  href: string
  comingSoon?: boolean
  highlights: string[]
}

const useCases: UseCase[] = [
  {
    id: 'sales',
    title: 'Sales Teams',
    subtitle: 'Close more deals with real-time AI coaching',
    description: 'Get instant guidance on discovery questions, objection handling, and next steps during live sales calls.',
    icon: TrendingUp,
    href: '/how-it-works/sales',
    highlights: ['Real-time objection handling', 'Automated CRM updates', 'Deal intelligence']
  },
  {
    id: 'consulting',
    title: 'Consultants',
    subtitle: 'Bill for expertise, not note-taking',
    description: 'AI captures insights and drafts summaries while you focus on delivering strategic value to clients.',
    icon: Briefcase,
    href: '/how-it-works/consulting',
    highlights: ['Automated meeting summaries', 'Action item tracking', 'Client insights']
  },
  {
    id: 'recruiting',
    title: 'Recruiters',
    subtitle: 'Make better hiring decisions faster',
    description: 'Live interview assistance with follow-up questions and automated candidate scorecards.',
    icon: Users,
    href: '/how-it-works/recruiting',
    highlights: ['Interview question suggestions', 'Candidate scoring', 'Bias reduction']
  },
  {
    id: 'support',
    title: 'Customer Support',
    subtitle: 'Resolve issues faster with AI assistance',
    description: 'Get suggested responses and auto-log tickets during support calls to reduce handle times.',
    icon: HeadphonesIcon,
    href: '/how-it-works/support',
    highlights: ['Suggested responses', 'Auto ticket logging', 'Knowledge base integration']
  },
  {
    id: 'education',
    title: 'Educators',
    subtitle: 'Enhance virtual classroom engagement',
    description: 'AI generates quizzes, recaps, and engagement cues to keep students focused and learning.',
    icon: GraduationCap,
    href: '/how-it-works/education',
    highlights: ['Engagement tracking', 'Automated recaps', 'Quiz generation']
  }
]

export function UseCasesDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedUseCase(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleUseCaseClick = (useCase: UseCase) => {
    if (useCase.comingSoon) return
    setSelectedUseCase(useCase)
  }

  const handleBack = () => {
    setSelectedUseCase(null)
  }

  const handleClose = () => {
    setIsOpen(false)
    setSelectedUseCase(null)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        Solutions
        <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-[800px] max-w-[95vw] bg-card rounded-xl border border-border shadow-2xl z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedUseCase ? selectedUseCase.title : 'Solutions by Industry'}
                </h3>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {selectedUseCase ? selectedUseCase.subtitle : 'Tailored AI assistance for your specific needs'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div>
              <AnimatePresence mode="wait">
                {!selectedUseCase ? (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4"
                  >
                    {useCases.map((useCase, index) => {
                      const Icon = useCase.icon
                      return (
                        <motion.button
                          key={useCase.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleUseCaseClick(useCase)}
                          disabled={useCase.comingSoon}
                          className={`
                            group text-left p-3 rounded-lg border transition-all
                            ${useCase.comingSoon 
                              ? 'bg-muted/50 border-border cursor-not-allowed opacity-60' 
                              : 'bg-muted/30 border-border hover:bg-muted hover:border-muted-foreground/20'
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`
                              p-2 rounded-lg transition-colors
                              ${useCase.comingSoon 
                                ? 'bg-muted text-muted-foreground' 
                                : 'bg-app-success/10 text-app-success group-hover:bg-app-success/20'
                              }
                            `}>
                              <Icon className="w-5 h-5" />
                            </div>
                            
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-foreground mb-0.5 flex items-center gap-2">
                                {useCase.title}
                                {useCase.comingSoon && (
                                  <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                                    Coming Soon
                                  </span>
                                )}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {useCase.description}
                              </p>
                              {!useCase.comingSoon && (
                                <Link 
                                  href={useCase.href}
                                  className="mt-3 flex items-center gap-1 text-app-success text-sm font-medium"
                                  onClick={handleClose}
                                >
                                  Learn more
                                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-4"
                  >
                    <button
                      onClick={handleBack}
                      className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      Back to all solutions
                    </button>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-3 rounded-lg bg-app-success/10 border border-app-success/30">
                          <selectedUseCase.icon className="w-6 h-6 text-app-success" />
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="text-xl font-semibold text-foreground mb-1">
                            {selectedUseCase.title}
                          </h4>
                          <p className="text-foreground/80 text-sm">
                            {selectedUseCase.description}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Key Features
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {selectedUseCase.highlights.map((highlight, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-app-success" />
                              <span className="text-xs text-foreground/80">{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Link
                          href={selectedUseCase.href}
                          className="flex-1 bg-app-success hover:bg-app-success/90 text-white px-4 py-2 rounded-lg font-medium text-sm text-center transition-colors"
                          onClick={handleClose}
                        >
                          Explore {selectedUseCase.title} Solution
                        </Link>
                        <Link
                          href="/auth/signup"
                          className="flex-1 bg-muted hover:bg-muted/80 text-foreground border border-border px-4 py-2 rounded-lg font-medium text-sm text-center transition-colors"
                          onClick={handleClose}
                        >
                          Start Free Trial
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function UseCasesButton() {
  return <UseCasesDropdown />
}