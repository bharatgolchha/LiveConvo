'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  FileText, 
  MessageSquare, 
  User, 
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  Mic,
  LogIn,
  UserPlus
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">LiveConvo</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/app-demo">
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Try Demo
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="primary">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              AI-Powered
              <span className="text-blue-600 block">Conversation Intelligence</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Get real-time AI guidance during your conversations. Perfect for sales calls, 
              customer support, meetings, and interviews. Improve your communication with 
              intelligent suggestions and insights.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/auth/signup">
              <Button size="lg" className="px-8 py-4 text-lg">
                <UserPlus className="w-5 h-5 mr-2" />
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/app-demo">
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg">
                <MessageSquare className="w-5 h-5 mr-2" />
                Try Demo
              </Button>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-sm text-gray-500"
          >
            No credit card required • Free trial • 5 minutes to setup
          </motion.p>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-6">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Real-Time Transcription
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Accurate speech-to-text with speaker identification. 
              See what's being said as it happens.
            </p>
          </Card>

          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 text-purple-600 rounded-full mb-6">
              <Brain className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              AI Guidance
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Get intelligent suggestions on what to ask, clarify, or avoid 
              based on conversation context.
            </p>
          </Card>

          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-6">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Smart Summaries
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Get comprehensive summaries with action items, 
              key points, and next steps automatically generated.
            </p>
          </Card>
        </motion.div>

        {/* Use Cases */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perfect for Every Conversation
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              LiveConvo adapts to your conversation type and provides 
              contextually relevant guidance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Sales Calls', icon: '💼', desc: 'Discovery, objection handling, closing' },
              { title: 'Customer Support', icon: '🎧', desc: 'Help customers, solve problems efficiently' },
              { title: 'Team Meetings', icon: '👥', desc: 'Collaborate better, track decisions' },
              { title: 'Interviews', icon: '🎯', desc: 'Structured conversations, better hiring' }
            ].map((useCase, index) => (
              <Card key={index} className="p-6 text-center hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{useCase.icon}</div>
                <h4 className="font-semibold text-gray-900 mb-2">{useCase.title}</h4>
                <p className="text-sm text-gray-600">{useCase.desc}</p>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 bg-gray-50 rounded-2xl p-12"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose LiveConvo?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: Zap, title: 'Real-Time Processing', desc: 'Get guidance as the conversation unfolds' },
              { icon: Shield, title: 'Privacy Focused', desc: 'Your conversations stay secure and private' },
              { icon: Brain, title: 'AI Powered', desc: 'Advanced AI understands context and nuance' },
              { icon: CheckCircle, title: 'Easy to Use', desc: 'Simple interface, powerful features' }
            ].map((benefit, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">{benefit.title}</h4>
                  <p className="text-gray-600">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Social Proof / Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mt-20"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">95%</div>
              <div className="text-gray-600">Conversation Quality Improvement</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">10k+</div>
              <div className="text-gray-600">Conversations Analyzed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">50%</div>
              <div className="text-gray-600">Faster Onboarding</div>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-20 text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white"
        >
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Conversations?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals using AI to improve their communication. 
            Start your free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="px-8 py-4 text-lg">
                <UserPlus className="w-5 h-5 mr-2" />
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/app-demo">
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg border-white text-white hover:bg-white hover:text-blue-600">
                <MessageSquare className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </Link>
          </div>
          <p className="text-sm opacity-80 mt-4">
            No credit card required • Setup in 5 minutes
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-6 h-6 text-blue-400" />
                <span className="text-lg font-bold">LiveConvo</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered conversation intelligence for professionals.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/app-demo" className="hover:text-white">Demo</Link></li>
                <li><Link href="/auth/signup" className="hover:text-white">Get Started</Link></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Features</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2024 LiveConvo. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
