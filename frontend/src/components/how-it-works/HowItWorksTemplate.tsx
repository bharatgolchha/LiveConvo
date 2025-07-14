'use client'

import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle, Play, Sparkles, Clock, Shield, Zap, MessageSquare, Target } from 'lucide-react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { WorkflowTimeline } from './WorkflowTimeline'
import { ConversationDemo } from './ConversationDemo'
import { FeatureHighlight } from './FeatureHighlight'
import { HowItWorksData } from '@/types/how-it-works'
import { Button } from '@/components/ui/Button'

interface HowItWorksTemplateProps {
  data: HowItWorksData
}

export function HowItWorksTemplate({ data }: HowItWorksTemplateProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-app-success/5 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-app-success/10 border border-app-success/30 mb-6"
            >
              <Sparkles className="w-4 h-4 text-app-success" />
              <span className="text-sm font-medium text-app-success">See it in action</span>
            </motion.div>
            
            <h1 className="text-4xl sm:text-6xl font-bold mb-6">
              How {data.title} Use{' '}
              <span className="text-app-success inline-block">liveprompt.ai</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Discover exactly how AI coaching transforms your conversations in real-time
            </p>
            
            {/* Scenario Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-gradient-to-r from-app-success/10 via-app-success/5 to-transparent rounded-2xl border border-app-success/20 p-8 backdrop-blur-sm">
                <div className="grid md:grid-cols-2 gap-6 text-left">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                      </div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Your Scenario
                      </h3>
                    </div>
                    <p className="text-lg text-foreground">
                      {data.scenario}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-app-success/20 flex items-center justify-center">
                        <Target className="w-4 h-4 text-app-success" />
                      </div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Your Goal
                      </h3>
                    </div>
                    <p className="text-lg text-foreground font-medium">
                      {data.objective}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap justify-center gap-8 mt-12"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-app-success" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">&lt; 2s</span> response time
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-app-success" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">100%</span> private
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-app-success" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Real-time</span> coaching
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Interactive Timeline Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-center">
              See It In Action: Step-by-Step
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Click through each step to see exactly how liveprompt.ai helps during your conversation
            </p>
            <WorkflowTimeline steps={data.timelineSteps} />
          </motion.div>
        </div>
      </section>
      
      
      {/* Quick Setup Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2 className="text-3xl font-bold mb-4 text-center">
              Get Started in 3 Simple Steps
            </h2>
            <p className="text-muted-foreground text-center mb-12">
              Be up and running with your AI conversation coach in minutes
            </p>
            
            <div className="space-y-4">
              {data.setupSteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                  className="flex items-start gap-4 p-6 rounded-xl bg-card border border-border"
                >
                  <div className="w-10 h-10 rounded-full bg-app-success/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-app-success font-bold">{step.step}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.8 }}
              className="text-center mt-12"
            >
              <Button
                size="lg"
                className="bg-app-success hover:bg-app-success/90 text-white"
                onClick={() => window.location.href = '/auth/signup'}
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                No credit card required • 14-day free trial
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}