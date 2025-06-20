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
    href: '/solutions/sales',
    highlights: ['Real-time objection handling', 'Automated CRM updates', 'Deal intelligence']
  },
  {
    id: 'consulting',
    title: 'Consultants',
    subtitle: 'Bill for expertise, not note-taking',
    description: 'AI captures insights and drafts summaries while you focus on delivering strategic value to clients.',
    icon: Briefcase,
    href: '/solutions/consulting',
    highlights: ['Automated meeting summaries', 'Action item tracking', 'Client insights']
  },
  {
    id: 'recruiting',
    title: 'Recruiters',
    subtitle: 'Make better hiring decisions faster',
    description: 'Live interview assistance with follow-up questions and automated candidate scorecards.',
    icon: Users,
    href: '/solutions/recruiting',
    highlights: ['Interview question suggestions', 'Candidate scoring', 'Bias reduction']
  },
  {
    id: 'support',
    title: 'Customer Support',
    subtitle: 'Resolve issues faster with AI assistance',
    description: 'Get suggested responses and auto-log tickets during support calls to reduce handle times.',
    icon: HeadphonesIcon,
    href: '/solutions/support',
    highlights: ['Suggested responses', 'Auto ticket logging', 'Knowledge base integration']
  },
  {
    id: 'education',
    title: 'Educators',
    subtitle: 'Enhance virtual classroom engagement',
    description: 'AI generates quizzes, recaps, and engagement cues to keep students focused and learning.',
    icon: GraduationCap,
    href: '/solutions/education',
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
        className="text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1"
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
            className="absolute top-full left-0 mt-2 w-[800px] max-w-[95vw] bg-gray-900 rounded-xl border border-gray-800 shadow-2xl z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {selectedUseCase ? selectedUseCase.title : 'Solutions by Industry'}
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  {selectedUseCase ? selectedUseCase.subtitle : 'Tailored AI assistance for your specific needs'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-300 transition-colors p-1.5 rounded-lg hover:bg-gray-800"
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
                              ? 'bg-gray-900/50 border-gray-800 cursor-not-allowed opacity-60' 
                              : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`
                              p-2 rounded-lg transition-colors
                              ${useCase.comingSoon 
                                ? 'bg-gray-800 text-gray-600' 
                                : 'bg-blue-950/50 text-blue-400 group-hover:bg-blue-900/50'
                              }
                            `}>
                              <Icon className="w-5 h-5" />
                            </div>
                            
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-white mb-0.5 flex items-center gap-2">
                                {useCase.title}
                                {useCase.comingSoon && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-500 rounded-full">
                                    Coming Soon
                                  </span>
                                )}
                              </h4>
                              <p className="text-xs text-gray-400 line-clamp-2">
                                {useCase.description}
                              </p>
                              {!useCase.comingSoon && (
                                <Link 
                                  href={useCase.href}
                                  className="mt-3 flex items-center gap-1 text-blue-400 text-sm font-medium"
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
                      className="text-sm text-gray-400 hover:text-gray-300 mb-4 flex items-center gap-1 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      Back to all solutions
                    </button>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900/50">
                          <selectedUseCase.icon className="w-6 h-6 text-blue-400" />
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="text-xl font-semibold text-white mb-1">
                            {selectedUseCase.title}
                          </h4>
                          <p className="text-gray-300 text-sm">
                            {selectedUseCase.description}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                          Key Features
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {selectedUseCase.highlights.map((highlight, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 border border-gray-700"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              <span className="text-xs text-gray-300">{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Link
                          href={selectedUseCase.href}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm text-center transition-colors"
                          onClick={handleClose}
                        >
                          Explore {selectedUseCase.title} Solution
                        </Link>
                        <Link
                          href="/auth/signup"
                          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-4 py-2 rounded-lg font-medium text-sm text-center transition-colors"
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