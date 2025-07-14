'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Zap, User, CheckCircle } from 'lucide-react'
import { TimelineStep } from '@/types/how-it-works'

interface WorkflowTimelineProps {
  steps: TimelineStep[]
}

export function WorkflowTimeline({ steps }: WorkflowTimelineProps) {
  const [activeStep, setActiveStep] = useState<string | null>(steps[0]?.id || null)
  
  return (
    <div className="relative">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Timeline Navigation */}
        <div className="lg:w-1/3 space-y-2">
          {steps.map((step, index) => (
            <motion.button
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setActiveStep(step.id)}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                activeStep === step.id
                  ? 'bg-app-success/10 border-app-success/30 shadow-lg'
                  : 'bg-card border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  activeStep === step.id
                    ? 'bg-app-success text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    activeStep === step.id ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {step.timeIndicator}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
        
        {/* Active Step Details */}
        <div className="lg:w-2/3">
          <AnimatePresence mode="wait">
            {steps.map((step) => (
              activeStep === step.id && (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-card rounded-xl border border-border p-6 shadow-xl"
                >
                  <h3 className="text-xl font-semibold text-foreground mb-4">
                    {step.title}
                  </h3>
                  
                  {/* Step Flow */}
                  <div className="space-y-4">
                    {/* Trigger */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Trigger
                        </p>
                        <p className="text-sm text-foreground">{step.trigger}</p>
                      </div>
                    </div>
                    
                    {/* AI Action */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-app-success/5 border border-app-success/20">
                      <div className="w-8 h-8 rounded-full bg-app-success/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-app-success" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          AI Instantly Responds
                        </p>
                        <p className="text-sm text-foreground">{step.aiAction}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Response time: {step.timeIndicator}
                        </p>
                      </div>
                    </div>
                    
                    {/* User Action */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Your Action
                        </p>
                        <p className="text-sm text-foreground">{step.userAction}</p>
                      </div>
                    </div>
                    
                    {/* Outcome */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-app-success/10 border border-app-success/30">
                      <div className="w-8 h-8 rounded-full bg-app-success/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-app-success" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Result
                        </p>
                        <p className="text-sm text-foreground font-medium">{step.outcome}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Highlights */}
                  {step.highlights && step.highlights.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Key Benefits
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {step.highlights.map((highlight, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 text-xs rounded-full bg-app-success/10 text-app-success border border-app-success/20"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}