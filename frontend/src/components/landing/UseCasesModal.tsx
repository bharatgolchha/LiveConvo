'use client'

import { useState } from 'react'
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

interface UseCasesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UseCasesModal({ isOpen, onClose }: UseCasesModalProps) {
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null)

  const handleUseCaseClick = (useCase: UseCase) => {
    if (useCase.comingSoon) return
    setSelectedUseCase(useCase)
  }

  const handleBack = () => {
    setSelectedUseCase(null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8"
            onClick={onClose}
          >
            <div 
              className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <div>
                  <h2 className="text-2xl font-semibold text-white">
                    {selectedUseCase ? selectedUseCase.title : 'Solutions by Industry'}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {selectedUseCase ? selectedUseCase.subtitle : 'Tailored AI assistance for your specific needs'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(90vh-88px)]">
                <AnimatePresence mode="wait">
                  {!selectedUseCase ? (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6"
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
                              group text-left p-6 rounded-xl border transition-all
                              ${useCase.comingSoon 
                                ? 'bg-gray-900/50 border-gray-800 cursor-not-allowed opacity-60' 
                                : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600 hover:shadow-lg'
                              }
                            `}
                          >
                            <div className="flex items-start gap-4">
                              <div className={`
                                p-3 rounded-lg transition-colors
                                ${useCase.comingSoon 
                                  ? 'bg-gray-800 text-gray-600' 
                                  : 'bg-blue-950/50 text-blue-400 group-hover:bg-blue-900/50'
                                }
                              `}>
                                <Icon className="w-6 h-6" />
                              </div>
                              
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                                  {useCase.title}
                                  {useCase.comingSoon && (
                                    <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-500 rounded-full">
                                      Coming Soon
                                    </span>
                                  )}
                                </h3>
                                <p className="text-sm text-gray-400 line-clamp-2">
                                  {useCase.description}
                                </p>
                                {!useCase.comingSoon && (
                                  <div className="mt-3 flex items-center gap-1 text-blue-400 text-sm font-medium">
                                    Learn more
                                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                  </div>
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
                      className="p-6"
                    >
                      <button
                        onClick={handleBack}
                        className="text-sm text-gray-400 hover:text-gray-300 mb-6 flex items-center gap-1 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Back to all solutions
                      </button>
                      
                      <div className="space-y-6">
                        <div className="flex items-start gap-4">
                          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-900/50">
                            <selectedUseCase.icon className="w-8 h-8 text-blue-400" />
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-2xl font-semibold text-white mb-2">
                              {selectedUseCase.title}
                            </h3>
                            <p className="text-gray-300 text-lg">
                              {selectedUseCase.description}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                            Key Features
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {selectedUseCase.highlights.map((highlight, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                <span className="text-sm text-gray-300">{highlight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                          <Link
                            href={selectedUseCase.href}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium text-center transition-colors"
                            onClick={onClose}
                          >
                            Explore {selectedUseCase.title} Solution
                          </Link>
                          <Link
                            href="/auth/signup"
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-6 py-3 rounded-lg font-medium text-center transition-colors"
                            onClick={onClose}
                          >
                            Start Free Trial
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function UseCasesButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1"
      >
        Solutions
        <ChevronRight className="w-4 h-4" />
      </button>
      
      <UseCasesModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  )
}