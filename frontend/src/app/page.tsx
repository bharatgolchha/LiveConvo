'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Mic, 
  MessageSquare, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  Play,
  Clock,
  Zap,
  ChevronDown,
  Check,
  Copy,
  Users,
  Shield,
  Briefcase,
  PhoneCall,
  Star,
  UserCheck,
  Mail,
  MessageCircle
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    useCase: 'sales'
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        // Show detailed error message if available
        const errorMessage = result.details 
          ? `${result.error}\n\n${result.details}`
          : result.error || 'Failed to join waitlist';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error submitting waitlist:', error);
      alert('Failed to join waitlist. Please try again.');
    }
  };

  const testimonials = [
    {
      quote: "Finally, an AI that actually understands sales conversations. The real-time prompts helped me close 3 deals this week that I would have definitely lost.",
      name: "Marcus Johnson",
      role: "Senior Sales Director",
      company: "DataFlow Solutions",
      badge: "Beta Tester",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    {
      quote: "I used to spend 2 hours after each client call writing notes. Now I get perfect summaries in 30 seconds. This saves me 10+ hours per week.",
      name: "Jessica Martinez", 
      role: "Management Consultant",
      company: "Strategic Partners LLC",
      badge: "Alpha Tester",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b120?w=150&h=150&fit=crop&crop=face"
    },
    {
      quote: "As a hiring manager, this catches things I miss. It suggested follow-up questions that revealed a candidate wasn&apos;t a good fit. Saved us months of pain.",
      name: "David Park",
      role: "VP of Engineering", 
      company: "TechFlow",
      badge: "Founding User",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    }
  ];

  const faqs = [
    {
      question: &apos;How do I get selected for early access?&apos;,
      answer: &apos;We review applications weekly and prioritize users who can provide detailed feedback. Sales professionals, consultants, and hiring managers get priority.&apos;
    },
    {
      question: &apos;Will my prospect hear anything?&apos;,
      answer: &apos;Completely silent to others. Only you see the cues on your screen.&apos;
    },
    {
      question: &apos;What languages do you support?&apos;,
      answer: &apos;English, Spanish, French, German, and Portuguese with 95%+ accuracy.&apos;
    },
    {
      question: &apos;How secure is my data?&apos;,
      answer: &apos;Bank-level encryption, SOC 2 compliant, zero data retention after processing.&apos;
    },
    {
      question: &apos;What happens after the beta period?&apos;,
      answer: &apos;Beta testers get grandfather pricing and continued priority support when we launch publicly.&apos;
    }
  ];

  const perks = [
    {
      icon: <Star className="w-6 h-6" />,
      title: &apos;Free Beta Access&apos;,
      description: &apos;Full platform access during testing period&apos;
    },
    {
      icon: <UserCheck className="w-6 h-6" />,
      title: &apos;Direct Founder Access&apos;,
      description: &apos;Weekly feedback sessions and feature requests&apos;
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: &apos;Priority Features&apos;,
      description: &apos;Your use cases drive our development roadmap&apos;
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: &apos;Grandfather Pricing&apos;,
      description: &apos;Lock in special rates before public launch&apos;
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #030712, #111827)' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" style={{ backgroundColor: 'rgba(3, 7, 18, 0.8)', borderColor: '#374151' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img 
                src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//dark.png"
                alt="liveprompt.ai logo"
                className="w-8 h-8 object-contain"
              />
              <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-poppins)', color: '#ffffff' }}>liveprompt.ai</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link
                href="/pricing"
                className="hidden sm:flex px-4 py-2 rounded-lg transition-colors"
                style={{ color: '#d1d5db' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.backgroundColor = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#d1d5db';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Pricing
              </Link>
              <button
                onClick={() => router.push('/auth/login')}
                className="hidden sm:flex px-4 py-2 rounded-lg transition-colors"
                style={{ color: '#d1d5db' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.backgroundColor = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#d1d5db';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Beta Login
              </button>
              <button
                onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                Request Access
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 1. Above-the-Fold Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Enhanced Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-purple-600/30 to-pink-600/30">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent" />
        </div>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            <div className="w-2 h-2 rounded-full animate-pulse bg-gradient-to-r from-blue-400 to-purple-400" />
            <span className="text-sm font-medium text-white">Limited Beta • Invitation Only</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 text-white"
          >
            Never wing another{' '}
            <span className="text-blue-300 italic">
              important conversation
            </span>{' '}
            again
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl mb-8 text-gray-200 max-w-2xl mx-auto"
          >
            Real-time AI cues, instant summaries—get exclusive early access to the future of conversation intelligence.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 text-lg rounded-xl font-semibold inline-flex items-center justify-center text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              style={{
                background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #2563eb, #7c3aed)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #3b82f6, #8b5cf6)'}
            >
              Request Early Access
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-sm text-gray-300"
          >
            🔥 <span className="font-medium text-orange-400">47 spots filled</span> of 100 beta testers
          </motion.p>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <ChevronDown className="w-8 h-8 text-white/50 animate-bounce" />
        </motion.div>
      </section>

            {/* Optimized Product Demo Section */}
      <section className="py-20 relative min-h-screen flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 mb-4">
              <Zap className="w-4 h-4" style={{ color: '#60a5fa' }} />
              <span className="text-sm font-medium" style={{ color: '#60a5fa' }}>Live Demo</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-blue-400">
              Real-time AI guidance
            </h2>
            
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#d1d5db' }}>
              See how our AI coach provides instant guidance during conversations
            </p>
          </motion.div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column - Demo Browser */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="lg:col-span-8"
            >
              {/* Browser Window */}
              <div className="rounded-xl overflow-hidden border border-gray-600/50 bg-gray-800 shadow-2xl">
                {/* Browser Header */}
                <div className="bg-gray-700 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    
                    <div className="flex-1 max-w-md mx-4">
                      <div className="bg-gray-600 rounded px-3 py-1 flex items-center gap-2">
                        <Shield className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-gray-300 font-mono">
                          app.liveprompt.ai/conversation
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-4 h-4"></div>
                  </div>
                </div>
                
                {/* Screenshot */}
                <div className="relative">
                  <img 
                    src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//Screenshot%202025-06-04%20at%2010.42.34%20PM.png"
                    alt="liveprompt.ai Beta Dashboard - Real-time cues as you speak"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
              </div>
              
              {/* Caption */}
              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-gray-800/70 border border-gray-700/50">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <p className="text-white font-medium">liveprompt.ai Beta Dashboard</p>
                  <span className="text-gray-400">•</span>
                  <p className="text-gray-400 text-sm">Silent AI coaching</p>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Feature Highlights */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="lg:col-span-4 space-y-6"
            >
              
              {/* Real-time Guidance Card */}
              <div className="bg-gray-900/50 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-green-400 font-semibold">Live Guidance</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300">
                    &lt;2s response
                  </span>
                </div>
                <h3 className="text-white font-semibold mb-2">Instant coaching</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Get real-time suggestions for objection handling, next questions, and conversation flow.
                </p>
                <div className="text-xs text-green-300 bg-green-900/20 rounded p-2">
                  💡 &quot;Ask about their workflow challenges&quot;
                </div>
              </div>

              {/* Smart Summaries Card */}
              <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400 font-semibold">Smart Summary</span>
                </div>
                <h3 className="text-white font-semibold mb-2">Auto-generated insights</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Automatic action items, key decisions, and CRM-ready notes delivered instantly.
                </p>
                <div className="text-xs text-purple-300 bg-purple-900/20 rounded p-2">
                  📝 Processing conversation insights...
                </div>
              </div>

              {/* Plug & Play Card */}
              <div className="bg-gray-900/50 border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 font-semibold">Plug & Play</span>
                </div>
                <h3 className="text-white font-semibold mb-2">Works everywhere</h3>
                <p className="text-gray-300 text-sm">
                  No plugins required. Works in any browser tab with Zoom, Teams, or any video platform.
                </p>
              </div>

            </motion.div>
          </div>
        </div>
      </section>



      {/* 3. Core Value Trio */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: &apos;Real-Time Cues&apos;,
                description: &apos;Objection handling & next-best-question prompts under 2s.&apos;,
                icon: <Zap className="w-8 h-8" />
              },
              {
                title: &apos;Smart Summaries&apos;, 
                description: &apos;Action items & CRM-ready bullet points in your inbox 30 sec after hang-up.&apos;,
                icon: <FileText className="w-8 h-8" />
              },
              {
                title: &apos;Plug-&-Play&apos;,
                description: &apos;Works in any browser tab; no Zoom plug-in hell.&apos;,
                icon: <CheckCircle2 className="w-8 h-8" />
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 text-center"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
              >
                <div className="mb-4" style={{ color: '#60a5fa' }}>{item.icon}</div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#ffffff' }}>{item.title}</h3>
                <p className="text-sm" style={{ color: '#d1d5db' }}>{item.description}</p>
                <button 
                  className="text-sm mt-3 transition-colors"
                  style={{ color: '#60a5fa' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#93c5fd'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#60a5fa'}
                >
                  Learn how →
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is this for? Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#ffffff' }}>Who is liveprompt.ai for?</h2>
            <p className="text-lg" style={{ color: '#d1d5db' }}>Built for professionals who lead high-stakes conversations</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sales Professionals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-xl p-6"
              style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                  <Briefcase className="w-6 h-6" style={{ color: '#60a5fa' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Sales Professionals</h3>
                  <p className="text-sm mb-3" style={{ color: '#9ca3af' }}>SaaS sales, enterprise deals, discovery calls</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-sm" style={{ color: '#d1d5db' }}>Real-time objection handling prompts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-sm" style={{ color: '#d1d5db' }}>Next-best-question suggestions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-sm" style={{ color: '#d1d5db' }}>CRM-ready call summaries</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Consultants & Coaches */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="rounded-xl p-6"
              style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
                  <Users className="w-6 h-6" style={{ color: '#a78bfa' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Consultants & Coaches</h3>
                  <p className="text-sm mb-3" style={{ color: '#9ca3af' }}>Strategy sessions, client meetings, workshops</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-sm" style={{ color: '#d1d5db' }}>Focus on insights, not note-taking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-sm" style={{ color: '#d1d5db' }}>Automated action item tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-sm" style={{ color: '#d1d5db' }}>Professional meeting summaries</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Hiring Managers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="rounded-xl p-6"
              style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)' }}>
                  <UserCheck className="w-6 h-6" style={{ color: '#f472b6' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Hiring Managers</h3>
                  <p className="text-sm mb-3" style={{ color: '#9ca3af' }}>Interviews, candidate assessments, team building</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-sm" style={{ color: '#d1d5db' }}>Spot red flags in real-time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-sm" style={{ color: '#d1d5db' }}>Follow-up question prompts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-sm" style={{ color: '#d1d5db' }}>Objective candidate comparisons</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Customer Success */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              className="rounded-xl p-6"
              style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                  <PhoneCall className="w-6 h-6" style={{ color: '#4ade80' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Customer Success Teams</h3>
                  <p className="text-sm mb-3" style={{ color: '#9ca3af' }}>Support calls, QBRs, onboarding sessions</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-sm" style={{ color: '#d1d5db' }}>Never miss customer commitments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-sm" style={{ color: '#d1d5db' }}>Proactive issue detection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-sm" style={{ color: '#d1d5db' }}>Detailed follow-up documentation</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg" style={{ color: '#9ca3af' }}>
              If you lead conversations where every word matters, liveprompt.ai is built for you.
            </p>
          </div>
        </div>
      </section>

      {/* Platform Compatibility */}
      <section className="py-20" style={{ backgroundColor: 'rgba(17, 24, 39, 0.5)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#ffffff' }}>
              Works seamlessly with your favorite platforms
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#d1d5db' }}>
              No plugins or extensions needed. Just start your meeting and we'll handle the rest.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Google Meet */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gray-900/50 border border-blue-500/30 rounded-xl p-8 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#4285f4">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Google Meet</h3>
              <p className="text-gray-300 mb-6">
                Optimized for Google Meet's interface and audio system
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Fully Compatible</span>
              </div>
            </motion.div>

            {/* Zoom */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-gray-900/50 border border-blue-500/30 rounded-xl p-8 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-6 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#2D8CFF">
                  <path d="M21.6 12c0-5.3-4.3-9.6-9.6-9.6S2.4 6.7 2.4 12s4.3 9.6 9.6 9.6 9.6-4.3 9.6-9.6zM12 20.4c-4.6 0-8.4-3.8-8.4-8.4S7.4 3.6 12 3.6s8.4 3.8 8.4 8.4-3.8 8.4-8.4 8.4z"/>
                  <path d="M9.6 8.4v7.2l5.76-3.6L9.6 8.4z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Zoom</h3>
              <p className="text-gray-300 mb-6">
                Works perfectly with Zoom meetings and webinars
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Fully Compatible</span>
              </div>
            </motion.div>
          </div>

          {/* Additional platforms note */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <p className="text-gray-400 text-sm mb-4">Also works with:</p>
            <div className="flex justify-center items-center gap-6 flex-wrap">
              <span className="text-gray-500 font-medium">Microsoft Teams</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-500 font-medium">WebEx</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-500 font-medium">GoToMeeting</span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-500 font-medium">Any browser-based platform</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. Use-Case Blocks */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-20">
            {[
              {
                title: &apos;Stop winging discovery calls.&apos;,
                subtitle: &apos;SaaS Sales&apos;,
                description: &apos;Get real-time prompts for qualifying questions, objection handling, and next steps.&apos;,
                icon: <Briefcase className="w-12 h-12" />,
                reverse: false
              },
              {
                title: &apos;Bill for insights, not note-taking.&apos;,
                subtitle: &apos;Consulting & Coaching&apos;, 
                description: &apos;Focus on your client while AI captures action items and key decisions.&apos;,
                icon: <Users className="w-12 h-12" />,
                reverse: true
              },
              {
                title: &apos;Spot red flags live—not after.&apos;,
                subtitle: &apos;Interviews & Hiring&apos;,
                description: &apos;Get prompted for follow-up questions when candidates give incomplete answers.&apos;,
                icon: <PhoneCall className="w-12 h-12" />,
                reverse: false
              }
            ].map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${useCase.reverse ? 'lg:grid-flow-col-dense' : ''}`}
              >
                <div className={useCase.reverse ? 'lg:col-start-2' : ''}>
                  <div className="mb-4" style={{ color: '#60a5fa' }}>{useCase.icon}</div>
                  <h3 className="text-3xl font-bold mb-2" style={{ color: '#ffffff' }}>{useCase.title}</h3>
                  <p className="font-medium mb-4" style={{ color: '#60a5fa' }}>{useCase.subtitle}</p>
                  <p className="text-lg" style={{ color: '#d1d5db' }}>{useCase.description}</p>
                </div>
                <div className={`rounded-xl p-8 ${useCase.reverse ? 'lg:col-start-1' : ''}`} style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}>
                                    {/* Clean, Minimal Demo UI */}
                  {index === 0 && (
                    // SaaS Sales Demo - Focus on AI Coaching
                    <div className="h-48 rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 flex items-center justify-center relative overflow-hidden">
                      {/* Subtle background pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-8 left-8 w-16 h-16 border border-blue-500 rounded rotate-12"></div>
                        <div className="absolute bottom-12 right-12 w-12 h-12 border border-green-500 rounded-full"></div>
                      </div>
                      
                      {/* Single AI coaching notification */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                        className="bg-green-500/90 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-green-400/30 max-w-xs text-center"
                      >
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></div>
                          <span className="text-green-100 text-sm font-semibold">AI Coach</span>
                        </div>
                        <p className="text-green-50 text-sm">
                          &quot;Ask about their budget range&quot;
                        </p>
                      </motion.div>
                    </div>
                  )}
                  
                  {index === 1 && (
                    // Consulting Demo - Focus on Auto Notes
                    <div className="h-48 rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 flex items-center justify-center relative overflow-hidden">
                      {/* Subtle background pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-6 right-8 w-14 h-14 border border-purple-500 rounded rotate-45"></div>
                        <div className="absolute bottom-8 left-10 w-10 h-10 border border-orange-500 rounded"></div>
                      </div>
                      
                      {/* Auto note-taking interface */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                        className="bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-gray-600 max-w-xs"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4 text-purple-400" />
                          <span className="text-gray-200 text-sm font-semibold">Smart Notes</span>
                          <div className="ml-auto">
                            <motion.div
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-2 h-2 rounded-full bg-purple-400"
                            />
                          </div>
                        </div>
                        <div className="space-y-2 text-xs text-gray-300">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                            <span>Goal: 40% revenue increase</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-orange-400" />
                            <span>Timeline: Q4 2024</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                  
                  {index === 2 && (
                    // Interview Demo - Focus on Question Suggestions
                    <div className="h-48 rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 flex items-center justify-center relative overflow-hidden">
                      {/* Subtle background pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-10 left-6 w-18 h-18 border border-amber-500 rounded-full"></div>
                        <div className="absolute bottom-6 right-6 w-8 h-8 border border-blue-500 rounded rotate-12"></div>
                      </div>
                      
                      {/* Interview coaching suggestion */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                        className="bg-amber-500/90 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-amber-400/30 max-w-xs text-center"
                      >
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <MessageCircle className="w-4 h-4 text-amber-100" />
                          <span className="text-amber-100 text-sm font-semibold">Next Question</span>
                        </div>
                        <p className="text-amber-50 text-sm">
                          &quot;What specific challenges did you face?&quot;
                        </p>
                      </motion.div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Social Proof */}
      <section className="py-20" style={{ backgroundColor: 'rgba(17, 24, 39, 0.5)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 relative"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
              >
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd' }}>
                    {testimonial.badge}
                  </span>
                </div>
                <p className="font-medium mb-4 pr-20" style={{ color: '#ffffff' }}>&quot;{testimonial.quote}&quot;</p>
                <div className="flex items-center gap-3">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full object-cover"
                    style={{ border: '2px solid #4b5563' }}
                    loading="lazy"
                  />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#ffffff' }}>{testimonial.name}</p>
                    <p className="text-xs" style={{ color: '#9ca3af' }}>{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* 8. FAQ Accordion */}
      <section className="py-20" style={{ backgroundColor: 'rgba(17, 24, 39, 0.5)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" style={{ color: '#ffffff' }}>FAQ</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="rounded-lg"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between"
                >
                  <span className="font-medium" style={{ color: '#ffffff' }}>{faq.question}</span>
                  <ChevronDown 
                    className={`w-5 h-5 transition-transform ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`}
                    style={{ color: '#9ca3af' }}
                  />
                </button>
                <AnimatePresence>
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-4"
                    >
                      <p style={{ color: '#d1d5db' }}>{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Early Access Program */}
      <section id="waitlist" className="py-20" style={{ background: 'linear-gradient(to right, rgba(30, 58, 138, 0.2), rgba(88, 28, 135, 0.2))' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#ffffff' }}>Join the Early Access Program</h2>
            <p className="text-xl" style={{ color: '#d1d5db' }}>Limited spots available for beta testers who will shape our product</p>
          </div>

          {!isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-lg mx-auto"
            >
              {/* Application Form */}
              <div>
                <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}>
                  <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#d1d5db' }}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg focus:outline-none"
                        style={{ 
                          backgroundColor: '#374151', 
                          border: '1px solid #4b5563', 
                          color: '#ffffff'
                        }}
                        placeholder="Your name"
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#4b5563'}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Work Email
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        placeholder="you@company.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        placeholder="Company name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Primary Use Case
                      </label>
                      <select
                        value={formData.useCase}
                        onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="sales">Sales Calls</option>
                        <option value="consulting">Client Consulting</option>
                        <option value="hiring">Interviews & Hiring</option>
                        <option value="support">Customer Support</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <button
                      type="submit"
                      className="w-full py-3 rounded-lg font-medium transition-colors"
                      style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                    >
                      Request Early Access
                    </button>
                  </form>
                  
                  <p className="text-xs mt-4 text-center" style={{ color: '#9ca3af' }}>
                    We review applications weekly. Selected testers get immediate access.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center rounded-2xl p-12"
              style={{ backgroundColor: 'rgba(20, 83, 45, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)' }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#22c55e' }}>
                <Check className="w-8 h-8" style={{ color: '#ffffff' }} />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#ffffff' }}>Application Submitted!</h3>
              <p className="mb-6" style={{ color: '#d1d5db' }}>
                Thanks for your interest! We&apos;ll review your application and get back to you within 3-5 business days.
              </p>
              <div className="inline-flex items-center gap-2 text-sm" style={{ color: '#4ade80' }}>
                <Mail className="w-4 h-4" />
                <span>Keep an eye on {formData.email}</span>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="py-20" style={{ background: 'linear-gradient(to right, #1e3a8a, #581c87)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6" style={{ color: '#ffffff' }}>
            Ready to transform your conversations?
          </h2>
          <p className="text-xl mb-8" style={{ color: '#bfdbfe' }}>
            Join the exclusive group shaping the future of AI-powered conversations.
          </p>
          <button
            onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 text-lg font-semibold rounded-lg inline-flex items-center transition-colors"
            style={{ backgroundColor: '#ffffff', color: '#1e3a8a' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
          >
            Apply for Early Access
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
          <p className="mt-4" style={{ color: '#bfdbfe' }}>
            Limited spots • Rolling invitations • Free during beta
          </p>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="py-12" style={{ backgroundColor: '#030712', color: '#9ca3af' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//dark.png"
                  alt="liveprompt.ai logo"
                  className="w-8 h-8 object-contain"
                />
                <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-poppins)', color: '#ffffff' }}>liveprompt.ai</span>
              </div>
              <p className="text-sm" style={{ color: '#9ca3af' }}>Your AI conversation co-pilot for better outcomes</p>
            </div>
            
            <div className="flex items-center gap-8">
              <Link href="/privacy" className="text-sm transition-colors" style={{ color: '#9ca3af' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}>Privacy</Link>
              <Link href="/terms" className="text-sm transition-colors" style={{ color: '#9ca3af' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}>Terms</Link>
              <Link href="/security" className="text-sm transition-colors" style={{ color: '#9ca3af' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}>Security</Link>
              <Link href="/status" className="text-sm transition-colors" style={{ color: '#9ca3af' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}>Status</Link>
            </div>
            
            <div className="flex items-center gap-4">
              <Shield className="w-5 h-5" style={{ color: '#6b7280' }} />
              <span className="text-sm" style={{ color: '#6b7280' }}>SOC 2 Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}