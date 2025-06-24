'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight,
  Check,
  CheckCircle2,
  Shield,
  Mail,
  MessageCircle,
  FileText,
  ChevronDown,
  Clock,
  Users
} from 'lucide-react';
import SeoJsonLd from '@/components/SeoJsonLd';
import { Header } from '@/components/layout/Header';

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
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);

  // Force dark theme for landing page
  useEffect(() => {
    const htmlElement = document.documentElement;
    const originalClasses = htmlElement.className;
    
    // Force dark theme
    htmlElement.classList.remove('light');
    htmlElement.classList.add('dark');
    
    // Cleanup: restore original theme when component unmounts
    return () => {
      htmlElement.className = originalClasses;
    };
  }, []);

  // Show floating CTA after scrolling
  React.useEffect(() => {
    const handleScroll = () => {
      setShowFloatingCTA(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const faqs = [
    {
      question: 'How does liveprompt.ai work during my calls?',
      answer: 'liveprompt.ai runs silently in your browser alongside any video platform. It provides real-time AI suggestions visible only to you, helping you navigate conversations with confidence.'
    },
    {
      question: 'What makes this different from note-taking tools?',
      answer: 'Unlike passive note-takers, liveprompt.ai actively coaches you during conversations with real-time guidance, objection handling, and next-best-question suggestions.'
    },
    {
      question: 'Is my conversation data secure?',
      answer: 'Yes. We use bank-level encryption, are SOC 2 compliant, and process data in real-time with zero retention after your session ends.'
    },
    {
      question: 'Which platforms does it support?',
      answer: 'Works with Zoom, Google Meet, Teams, and any browser-based video platform. No plugins or downloads required.'
    }
  ];

  return (
    <>
      <SeoJsonLd />
      <style jsx>{`
        input::placeholder,
        textarea::placeholder,
        select::placeholder {
          color: #9ca3af !important;
        }
        input:focus::placeholder,
        textarea:focus::placeholder,
        select:focus::placeholder {
          color: #6b7280 !important;
        }
        * {
          color-scheme: dark !important;
        }
      `}</style>
      <div className="min-h-screen dark-theme-locked" style={{ background: 'linear-gradient(to bottom, #030712, #111827)' }}>
        <Header />

        {/* Hero Section - Simplified */}
        <section 
          className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8"
                      style={{
              backgroundImage: 'url(https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//BG1.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
        >
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(3, 7, 18, 0.7)' }} />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', border: '1px solid rgba(22, 163, 74, 0.3)' }}>
              <span className="text-sm font-medium" style={{ color: '#16a34a' }}>Beta Access Available</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight" style={{ color: '#ffffff' }}>
              AI That Whispers
              <br />
              <span style={{ color: '#16a34a' }}>Winning Moves</span> During Live Calls
            </h1>
            
            <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: '#d1d5db' }}>
              Get real-time suggestions, objection handling, and next questions in <span className="font-semibold" style={{ color: '#ffffff' }}>&lt;2 seconds</span>. 
              Never miss a critical moment again.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 text-lg rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
              >
                Start Free - No Card Required
                <ArrowRight className="inline-block ml-2 w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/auth/login')}
                className="px-8 py-4 text-lg rounded-xl font-semibold transition-colors"
                style={{ backgroundColor: '#0ea5e9', color: '#ffffff' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0ea5e9'}
              >
                Watch 2-Min Demo
              </button>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm" style={{ color: '#9ca3af' }}>
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                SOC 2 Compliant
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                &lt;2s Response Time
              </span>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Join 500+ sales leaders closing 35% more deals
              </span>
            </div>
          </div>
        </section>

        {/* Product Screenshot */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative rounded-xl overflow-hidden shadow-2xl"
              style={{ border: '1px solid #374151' }}
            >
              <Image 
                src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//Screenshot%202025-06-23%20at%2012.54.37%20PM.png"
                alt="liveprompt.ai dashboard showing real-time AI conversation coaching interface"
                width={1200}
                height={800}
                className="w-full h-auto"
                priority
              />
              <div className="absolute bottom-0 left-0 right-0 p-8" style={{ background: 'linear-gradient(to top, rgba(31, 41, 55, 1), transparent)' }}>
                <p className="text-sm text-center" style={{ color: '#9ca3af' }}>
                  Works seamlessly with Zoom, Google Meet, Teams, and any video platform
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Platform Integration Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <p className="text-sm font-medium mb-8 uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                Works seamlessly with your favorite platforms
              </p>
              <div className="flex justify-center items-center gap-12 md:gap-16">
                <div className="group cursor-pointer">
                  <Image
                    src="/platform-logos/zoom.png"
                    alt="Zoom"
                    width={120}
                    height={40}
                    className="object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300 filter grayscale group-hover:grayscale-0"
                  />
                </div>
                <div className="group cursor-pointer">
                  <Image
                    src="/platform-logos/meet.png"
                    alt="Google Meet"
                    width={120}
                    height={40}
                    className="object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300 filter grayscale group-hover:grayscale-0"
                  />
                </div>
                <div className="group cursor-pointer">
                  <Image
                    src="/platform-logos/teams.png"
                    alt="Microsoft Teams"
                    width={120}
                    height={40}
                    className="object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300 filter grayscale group-hover:grayscale-0"
                  />
                </div>
              </div>
              <p className="text-sm mt-6" style={{ color: '#6b7280' }}>
                No downloads required • Works in your browser • Zero setup time
              </p>
            </motion.div>
          </div>
        </section>

        {/* The Moment That Changes Everything */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#ffffff' }}>
                Every Call Has That <span style={{ color: '#16a34a' }}>Make-or-Break Moment</span>
              </h2>
              <p className="text-xl max-w-3xl mx-auto" style={{ color: '#d1d5db' }}>
                When they say "We're happy with our current solution" or "Send me more info" — 
                what you say next determines if you close the deal or lose it forever.
              </p>
            </motion.div>

            {/* Real Scenarios */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="rounded-2xl p-8"
                style={{ background: 'linear-gradient(to right, rgba(31, 41, 55, 0.5), rgba(75, 85, 99, 0.3))', border: '1px solid #374151' }}
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(22, 163, 74, 0.2)' }}>
                      <MessageCircle className="w-6 h-6" style={{ color: '#16a34a' }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="mb-3" style={{ color: '#9ca3af' }}>Prospect says:</p>
                    <p className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>"This sounds expensive. What's the ROI?"</p>
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', border: '1px solid rgba(22, 163, 74, 0.3)' }}>
                      <p className="text-sm mb-2" style={{ color: '#16a34a' }}>liveprompt.ai whispers:</p>
                      <p style={{ color: '#ffffff' }}>
                        "Great question! Our average customer sees ROI in 6 weeks. 
                        Can I share how [similar company] saved $40k in their first quarter?"
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-400 mb-3">Candidate says:</p>
                    <p className="text-xl font-semibold text-white mb-4">"I led the project to successful completion"</p>
                    <div className="bg-green-950/30 border border-green-900/50 rounded-lg p-4">
                      <p className="text-sm text-green-300 mb-2">liveprompt.ai suggests:</p>
                      <p className="text-white">
                        "Impressive! Walk me through a specific challenge you faced. 
                        How did you handle stakeholder pushback?"
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-400 mb-3">While you're deep in conversation:</p>
                    <p className="text-xl font-semibold text-white mb-4">AI captures every detail, commitment, and next step</p>
                    <div className="bg-purple-950/30 border border-purple-900/50 rounded-lg p-4">
                      <p className="text-sm text-purple-300 mb-2">30 seconds after your call:</p>
                      <p className="text-white">
                        Complete summary with action items, key decisions, and follow-up 
                        timeline ready to paste into your CRM
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <p className="text-lg mb-6" style={{ color: '#d1d5db' }}>
                Stop losing deals to better-prepared competitors. 
                <span className="font-semibold" style={{ color: '#ffffff' }}> Level the playing field with AI.</span>
              </p>
              <button
                onClick={() => router.push('/auth/signup')}
                className="px-8 py-4 text-lg rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 inline-flex items-center gap-2"
                style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
              >
                Start Using It Free
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'rgba(17, 24, 39, 0.3)' }}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4" style={{ color: '#ffffff' }}>
              How It Works
            </h2>
            <p className="text-xl text-center mb-12 max-w-2xl mx-auto" style={{ color: '#d1d5db' }}>
              Three simple steps to transform your conversations
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center font-bold text-2xl" style={{ background: 'linear-gradient(to bottom right, #16a34a, rgba(22, 163, 74, 0.8))', color: '#ffffff' }}>
                    1
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Connect</h3>
                  <p style={{ color: '#d1d5db' }}>
                    Works instantly with Zoom, Meet, Teams - no downloads or plugins required
                  </p>
                </div>
                <div className="hidden md:block absolute top-10 -right-4 w-8 h-8">
                  <ArrowRight className="w-full h-full" style={{ color: '#9ca3af' }} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center font-bold text-2xl" style={{ background: 'linear-gradient(to bottom right, #0ea5e9, rgba(14, 165, 233, 0.8))', color: '#ffffff' }}>
                    2
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Converse</h3>
                  <p style={{ color: '#d1d5db' }}>
                    AI listens and provides real-time coaching only you can see
                  </p>
                </div>
                <div className="hidden md:block absolute top-10 -right-4 w-8 h-8">
                  <ArrowRight className="w-full h-full" style={{ color: '#9ca3af' }} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center font-bold text-2xl" style={{ background: 'linear-gradient(to bottom right, #16a34a, rgba(22, 163, 74, 0.8))', color: '#ffffff' }}>
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Close</h3>
                <p style={{ color: '#d1d5db' }}>
                  Get action items and CRM-ready summaries automatically
                </p>
              </motion.div>
            </div>

            {/* Visual Demo CTA */}
            <div className="mt-12 text-center">
              <button 
                onClick={() => router.push('/auth/login')}
                className="inline-flex items-center gap-2 transition-colors"
                style={{ color: '#16a34a' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#15803d'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#16a34a'}
              >
                <span>See it in action</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Use Cases - Streamlined */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#ffffff' }}>
              Built for High-Stakes Conversations
            </h2>
            
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-6 rounded-xl"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(22, 163, 74, 0.2)' }}>
                  <MessageCircle className="w-5 h-5" style={{ color: '#16a34a' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Sales & Discovery Calls</h3>
                  <p className="mb-3" style={{ color: '#d1d5db' }}>
                    Never miss BANT criteria again. AI tracks what you've covered and suggests what to ask next.
                  </p>
                  <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', border: '1px solid rgba(22, 163, 74, 0.3)' }}>
                    <p className="text-sm italic" style={{ color: '#ffffff' }}>
                      "We're happy with our current solution" → 
                      <span style={{ color: '#ffffff' }}> AI suggests: "What specific challenges are you facing that your current solution doesn't address?"</span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>
                    📈 Users report 35% higher close rates
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-6 rounded-xl"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(14, 165, 233, 0.2)' }}>
                  <Users className="w-5 h-5" style={{ color: '#0ea5e9' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Recruiting & Interviews</h3>
                  <p className="mb-3" style={{ color: '#d1d5db' }}>
                    AI suggests behavioral follow-ups and helps spot inconsistencies in real-time.
                  </p>
                  <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
                    <p className="text-sm italic" style={{ color: '#ffffff' }}>
                      Candidate mentions "led a team" → 
                      <span style={{ color: '#ffffff' }}> AI suggests: "How many people? What was your biggest challenge as their leader?"</span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#0ea5e9' }}>
                    🎯 Reduce bad hires by 40%
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-6 rounded-xl"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(22, 163, 74, 0.2)' }}>
                  <FileText className="w-5 h-5" style={{ color: '#16a34a' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Consulting & Client Success</h3>
                  <p className="mb-3" style={{ color: '#d1d5db' }}>
                    Bill for expertise, not note-taking. AI captures every requirement and commitment.
                  </p>
                  <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', border: '1px solid rgba(22, 163, 74, 0.3)' }}>
                    <p className="text-sm italic" style={{ color: '#ffffff' }}>
                      Client mentions new requirement → 
                      <span style={{ color: '#ffffff' }}> AI flags: "New scope item detected. Clarify timeline and budget impact."</span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>
                    ⏰ Save 2+ hours per client per week
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Product Features Showcase */}
        <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'rgba(17, 24, 39, 0.3)' }}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4" style={{ color: '#ffffff' }}>
              Powerful Features That Work Together
            </h2>
            <p className="text-xl text-center mb-12 max-w-2xl mx-auto" style={{ color: '#d1d5db' }}>
              Everything you need for successful conversations, all in one place
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Live Transcript */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 transition-colors"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(22, 163, 74, 0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#374151'}
              >
                <div className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)' }}>
                  <MessageCircle className="w-6 h-6" style={{ color: '#16a34a' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#ffffff' }}>Live Transcript</h3>
                <p className="text-sm" style={{ color: '#d1d5db' }}>
                  Real-time speech-to-text with speaker identification. Never miss a word.
                </p>
              </motion.div>

              {/* AI Chat */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 transition-colors"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#374151'}
              >
                <div className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                  <MessageCircle className="w-6 h-6" style={{ color: '#0ea5e9' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#ffffff' }}>AI Advisor Chat</h3>
                <p className="text-sm" style={{ color: '#d1d5db' }}>
                  Ask questions and get suggestions about the conversation as it happens.
                </p>
              </motion.div>

              {/* Smart Notes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 transition-colors"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(22, 163, 74, 0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#374151'}
              >
                <div className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)' }}>
                  <CheckCircle2 className="w-6 h-6" style={{ color: '#16a34a' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#ffffff' }}>Smart Notes</h3>
                <p className="text-sm" style={{ color: '#d1d5db' }}>
                  AI-generated checklist and action items updated in real-time.
                </p>
              </motion.div>

              {/* Meeting Bot */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 transition-colors"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(22, 163, 74, 0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#374151'}
              >
                <div className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)' }}>
                  <Users className="w-6 h-6" style={{ color: '#16a34a' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#ffffff' }}>Meeting Bot</h3>
                <p className="text-sm" style={{ color: '#d1d5db' }}>
                  Join any Zoom, Meet, or Teams call with our AI recorder. No downloads needed.
                </p>
              </motion.div>

              {/* Previous Context */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 transition-colors"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#374151'}
              >
                <div className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                  <Clock className="w-6 h-6" style={{ color: '#0ea5e9' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#ffffff' }}>Previous Context</h3>
                <p className="text-sm" style={{ color: '#d1d5db' }}>
                  Reference past conversations automatically for continuity and follow-ups.
                </p>
              </motion.div>

              {/* Instant Summaries */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 transition-colors"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(22, 163, 74, 0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#374151'}
              >
                <div className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)' }}>
                  <FileText className="w-6 h-6" style={{ color: '#16a34a' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#ffffff' }}>Instant Summaries</h3>
                <p className="text-sm" style={{ color: '#d1d5db' }}>
                  Get professional meeting summaries with action items within seconds.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Trust & Security */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#ffffff' }}>Your Conversations Are Secure</h2>
              <p className="text-xl" style={{ color: '#d1d5db' }}>
                Enterprise-grade security you can trust
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)' }}>
                  <Shield className="w-8 h-8" style={{ color: '#16a34a' }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: '#ffffff' }}>SOC 2 Type II</h3>
                <p className="text-sm" style={{ color: '#9ca3af' }}>Certified security compliance</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)' }}>
                  <Shield className="w-8 h-8" style={{ color: '#0ea5e9' }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: '#ffffff' }}>End-to-End Encryption</h3>
                <p className="text-sm" style={{ color: '#9ca3af' }}>Your data is always protected</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)' }}>
                  <Clock className="w-8 h-8" style={{ color: '#16a34a' }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: '#ffffff' }}>Zero Data Retention</h3>
                <p className="text-sm" style={{ color: '#9ca3af' }}>Deleted after each session</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)' }}>
                  <Shield className="w-8 h-8" style={{ color: '#16a34a' }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: '#ffffff' }}>GDPR Compliant</h3>
                <p className="text-sm" style={{ color: '#9ca3af' }}>Full data privacy protection</p>
              </motion.div>
            </div>

            <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)' }}>
              <p className="mb-4" style={{ color: '#9ca3af' }}>
                Trusted by leading companies in finance, healthcare, and technology
              </p>
              <div className="flex items-center justify-center gap-2 text-sm" style={{ color: '#9ca3af' }}>
                <CheckCircle2 className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                <span>No data training on your conversations</span>
                <span className="mx-2">•</span>
                <CheckCircle2 className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                <span>Regular security audits</span>
                <span className="mx-2">•</span>
                <CheckCircle2 className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                <span>99.9% uptime SLA</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Preview - Based on Database */}
        <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'rgba(17, 24, 39, 0.3)' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#ffffff' }}>Start Free, Scale As You Grow</h2>
              <p className="text-xl" style={{ color: '#d1d5db' }}>
                Freemium pricing that grows with your success
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Free Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="rounded-2xl p-8"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
              >
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Free Forever</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold" style={{ color: '#ffffff' }}>$0</span>
                  <span style={{ color: '#9ca3af' }}>/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>60 minutes/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>Real-time AI guidance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>Basic transcription</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>Up to 40 sessions/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>10 documents per session</span>
                  </li>
                </ul>
                <button 
                  onClick={() => router.push('/auth/signup')}
                  className="w-full py-3 rounded-lg font-semibold transition-colors"
                  style={{ backgroundColor: '#0ea5e9', color: '#ffffff' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0ea5e9'}
                >
                  Start Free
                </button>
              </motion.div>

              {/* Pro */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="rounded-2xl p-8 relative"
                style={{ 
                  background: 'linear-gradient(to bottom, rgba(22, 163, 74, 0.2), rgba(31, 41, 55, 0.5))', 
                  border: '1px solid rgba(22, 163, 74, 0.5)' 
                }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ backgroundColor: '#16a34a', color: '#ffffff' }}>
                    MOST POPULAR
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Pro</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold" style={{ color: '#ffffff' }}>$29</span>
                  <span style={{ color: '#9ca3af' }}>/month</span>
                  <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>or $290/year (save 17%)</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>100 hours/month (6000 minutes)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>Advanced AI summaries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>Export & email summaries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>Analytics dashboard</span>
                  </li>
                </ul>
                <button 
                  onClick={() => router.push('/auth/signup')}
                  className="w-full py-3 rounded-lg font-semibold transition-colors"
                  style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                >
                  Upgrade to Pro
                </button>
              </motion.div>

              {/* Team/Enterprise */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="rounded-2xl p-8"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
              >
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Team & Enterprise</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold" style={{ color: '#ffffff' }}>Custom</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>Everything in Pro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>Multiple team members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>Admin controls</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>SSO/SAML</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>Custom AI training</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                    <span className="text-sm" style={{ color: '#d1d5db' }}>SLA & dedicated support</span>
                  </li>
                </ul>
                <button 
                  onClick={() => window.location.href = 'mailto:sales@liveprompt.ai'}
                  className="w-full py-3 rounded-lg font-semibold transition-colors"
                  style={{ backgroundColor: '#0ea5e9', color: '#ffffff' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0ea5e9'}
                >
                  Contact Sales
                </button>
              </motion.div>
            </div>

            <p className="text-center mt-8 text-sm" style={{ color: '#9ca3af' }}>
              All prices in USD. No credit card required for free plan. See <Link href="/pricing" className="hover:underline" style={{ color: '#16a34a' }}>full pricing details</Link>
            </p>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#ffffff' }}>
              What Our Users Say
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="rounded-2xl p-6"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20" style={{ color: '#16a34a' }}>
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="mb-4" style={{ color: '#d1d5db' }}>
                  "Onboarding new reps now takes days, not months. They can see exactly how top performers handle objections in real-time."
                </p>
                <div>
                  <p className="font-semibold" style={{ color: '#ffffff' }}>Sarah Chen</p>
                  <p className="text-sm" style={{ color: '#9ca3af' }}>VP Sales, TechCorp</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="rounded-2xl p-6"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20" style={{ color: '#16a34a' }}>
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="mb-4" style={{ color: '#d1d5db' }}>
                  "I catch inconsistencies I would have missed before. The AI suggestions for behavioral questions are game-changing."
                </p>
                <div>
                  <p className="font-semibold" style={{ color: '#ffffff' }}>Marcus Johnson</p>
                  <p className="text-sm" style={{ color: '#9ca3af' }}>Senior Recruiter, FinanceHub</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="rounded-2xl p-6"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.5)', border: '1px solid #374151' }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20" style={{ color: '#16a34a' }}>
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="mb-4" style={{ color: '#d1d5db' }}>
                  "Clients love the detailed summaries I send immediately after our calls. It shows professionalism and attention."
                </p>
                <div>
                  <p className="font-semibold" style={{ color: '#ffffff' }}>Emily Rodriguez</p>
                  <p className="text-sm" style={{ color: '#9ca3af' }}>Management Consultant</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FAQ Section - Simplified */}
        <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'rgba(17, 24, 39, 0.3)' }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#ffffff' }}>
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid #374151' }}
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between transition-colors"
                    style={{ color: '#ffffff' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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

        {/* Final CTA - Early Access Form */}
        <section id="waitlist" className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(to bottom right, rgba(22, 163, 74, 0.2), rgba(3, 7, 18, 1), rgba(22, 163, 74, 0.2))' }}>
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #16a34a, rgba(22, 163, 74, 0.7))' }}>
                  Ready to Close More Deals?
                </h2>
                <p className="text-xl mb-2" style={{ color: '#d1d5db' }}>
                  Join 500+ professionals already using AI to win more conversations
                </p>
                <p className="text-sm" style={{ color: '#9ca3af' }}>
                  ⏱️ Setup takes less than 2 minutes • No credit card required
                </p>
              </motion.div>
            </div>

            {!isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-xl p-8"
                style={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #374151' }}
              >
                <form onSubmit={handleWaitlistSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#9ca3af' }}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg transition-colors focus:outline-none"
                        style={{ 
                          backgroundColor: 'rgba(55, 65, 81, 0.5)', 
                          border: '1px solid #374151', 
                          color: '#ffffff' 
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#16a34a'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#374151'}
                        placeholder="John Smith"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#9ca3af' }}>
                        Work Email
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg transition-colors focus:outline-none"
                        style={{ 
                          backgroundColor: 'rgba(55, 65, 81, 0.5)', 
                          border: '1px solid #374151', 
                          color: '#ffffff' 
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#16a34a'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#374151'}
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#9ca3af' }}>
                      Company
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg transition-colors focus:outline-none"
                      style={{ 
                        backgroundColor: 'rgba(55, 65, 81, 0.5)', 
                        border: '1px solid #374151', 
                        color: '#ffffff' 
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#16a34a'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#374151'}
                      placeholder="Acme Inc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#9ca3af' }}>
                      Primary Use Case
                    </label>
                    <select
                      value={formData.useCase}
                      onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg transition-colors focus:outline-none"
                      style={{ 
                        backgroundColor: 'rgba(55, 65, 81, 0.5)', 
                        border: '1px solid #374151', 
                        color: '#ffffff' 
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#16a34a'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#374151'}
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
                    className="w-full py-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(to right, #16a34a, rgba(22, 163, 74, 0.8))', color: '#ffffff' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, rgba(22, 163, 74, 0.9), rgba(22, 163, 74, 0.7))'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #16a34a, rgba(22, 163, 74, 0.8))'
                    }}
                  >
                    Get Started Free →
                  </button>
                </form>
                
                <div className="mt-8 pt-8 border-t" style={{ borderColor: '#374151' }}>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: '#16a34a' }}>35%</p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>Higher close rate</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: '#0ea5e9' }}>&lt;2s</p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>Response time</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: '#16a34a' }}>2hrs</p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>Saved per week</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-center mt-6" style={{ color: '#9ca3af' }}>
                  By submitting, you agree to our Terms of Service and Privacy Policy
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center rounded-xl p-12"
                style={{ backgroundColor: 'rgba(14, 165, 233, 0.2)', border: '1px solid rgba(14, 165, 233, 0.3)' }}
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#0ea5e9' }}>
                  <Check className="w-8 h-8" style={{ color: '#ffffff' }} />
                </div>
                <h3 className="text-2xl font-bold mb-4" style={{ color: '#ffffff' }}>You're on the list!</h3>
                <p className="mb-6" style={{ color: '#d1d5db' }}>
                  We'll review your application and send an invite to {formData.email} within 3-5 business days.
                </p>
                <div className="inline-flex items-center gap-2 text-sm" style={{ color: '#0ea5e9' }}>
                  <Mail className="w-4 h-4" />
                  <span>Check your inbox for next steps</span>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t" style={{ borderColor: '#374151' }}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Image 
                    src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//DarkMode2.png"
                    alt="liveprompt.ai"
                    width={150}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <p className="mb-4" style={{ color: '#9ca3af' }}>
                  AI-powered conversation intelligence for sales, recruiting, and consulting professionals.
                </p>
                <div className="flex items-center gap-4 text-sm" style={{ color: '#9ca3af' }}>
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    SOC 2 Compliant
                  </span>
                  <span>© {new Date().getFullYear()} NexGenAI LLC</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4" style={{ color: '#ffffff' }}>Product</h4>
                <ul className="space-y-2">
                  <li><Link href="/pricing" className="transition-colors" style={{ color: '#9ca3af' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}>Pricing</Link></li>
                  <li><Link href="/auth/login" className="transition-colors" style={{ color: '#9ca3af' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}>Sign In</Link></li>
                  <li><a href="#waitlist" className="transition-colors" style={{ color: '#9ca3af' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}>Get Access</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4" style={{ color: '#ffffff' }}>Company</h4>
                <ul className="space-y-2">
                  <li><Link href="/terms" className="transition-colors" style={{ color: '#9ca3af' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}>Terms</Link></li>
                  <li><Link href="/privacy" className="transition-colors" style={{ color: '#9ca3af' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}>Privacy</Link></li>
                  <li><a href="mailto:hello@liveprompt.ai" className="transition-colors" style={{ color: '#9ca3af' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}>Contact</a></li>
                </ul>
              </div>
            </div>
          </div>
        </footer>

        {/* Floating CTA */}
        {showFloatingCTA && (
          <div className="fixed bottom-8 right-8 z-50 transition-all duration-300">
            <button
              onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 py-3 rounded-full shadow-lg font-semibold text-sm"
              style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
            >
              Request Access
            </button>
          </div>
        )}
      </div>
    </>
  );
}