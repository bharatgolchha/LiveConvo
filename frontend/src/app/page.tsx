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
      <div className="min-h-screen bg-background text-foreground">
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
          <div className="absolute inset-0 bg-background/70" />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <span className="text-sm font-medium text-primary">Beta Access Available</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              AI That Whispers
              <br />
              <span className="text-primary">Winning Moves</span> During Live Calls
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get real-time suggestions, objection handling, and next questions in <span className="font-semibold text-foreground">&lt;2 seconds</span>. 
              Never miss a critical moment again.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 text-primary-foreground"
              >
                Start Free - No Card Required
                <ArrowRight className="inline-block ml-2 w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/auth/login')}
                className="bg-secondary hover:bg-secondary/90 px-8 py-4 text-lg rounded-xl font-semibold transition-colors text-secondary-foreground"
              >
                Watch 2-Min Demo
              </button>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
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
              <h2 className="text-3xl font-bold mb-4">
                Every Call Has That <span className="text-primary">Make-or-Break Moment</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
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
                className="bg-gradient-to-r from-card to-muted/50 rounded-2xl p-8 border border-border"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-muted-foreground mb-3">Prospect says:</p>
                    <p className="text-xl font-semibold text-foreground mb-4">"This sounds expensive. What's the ROI?"</p>
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                      <p className="text-sm text-primary mb-2">liveprompt.ai whispers:</p>
                      <p className="text-foreground">
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
              <p className="text-lg text-muted-foreground mb-6">
                Stop losing deals to better-prepared competitors. 
                <span className="text-foreground font-semibold"> Level the playing field with AI.</span>
              </p>
              <button
                onClick={() => router.push('/auth/signup')}
                className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 inline-flex items-center gap-2 text-primary-foreground"
              >
                Start Using It Free
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
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
              className="relative rounded-xl overflow-hidden border border-border shadow-2xl"
            >
              <Image 
                src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//Screenshot%202025-06-23%20at%2012.54.37%20PM.png"
                alt="liveprompt.ai dashboard showing real-time AI conversation coaching interface"
                width={1200}
                height={800}
                className="w-full h-auto"
                priority
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card to-transparent p-8">
                <p className="text-sm text-muted-foreground text-center">
                  Works seamlessly with Zoom, Google Meet, Teams, and any video platform
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
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
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-2xl">
                    1
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Connect</h3>
                  <p className="text-muted-foreground">
                    Works instantly with Zoom, Meet, Teams - no downloads or plugins required
                  </p>
                </div>
                <div className="hidden md:block absolute top-10 -right-4 w-8 h-8">
                  <ArrowRight className="w-full h-full text-muted-foreground" />
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
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl flex items-center justify-center text-secondary-foreground font-bold text-2xl">
                    2
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Converse</h3>
                  <p className="text-muted-foreground">
                    AI listens and provides real-time coaching only you can see
                  </p>
                </div>
                <div className="hidden md:block absolute top-10 -right-4 w-8 h-8">
                  <ArrowRight className="w-full h-full text-muted-foreground" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-2xl">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Close</h3>
                <p className="text-muted-foreground">
                  Get action items and CRM-ready summaries automatically
                </p>
              </motion.div>
            </div>

            {/* Visual Demo CTA */}
            <div className="mt-12 text-center">
              <button 
                onClick={() => router.push('/auth/login')}
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
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
            <h2 className="text-3xl font-bold text-center mb-12">
              Built for High-Stakes Conversations
            </h2>
            
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-6 rounded-xl bg-card/50 border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Sales & Discovery Calls</h3>
                  <p className="text-muted-foreground mb-3">
                    Never miss BANT criteria again. AI tracks what you've covered and suggests what to ask next.
                  </p>
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-3">
                    <p className="text-sm text-primary italic">
                      "We're happy with our current solution" → 
                      <span className="text-foreground"> AI suggests: "What specific challenges are you facing that your current solution doesn't address?"</span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    📈 Users report 35% higher close rates
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-6 rounded-xl bg-card/50 border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Recruiting & Interviews</h3>
                  <p className="text-muted-foreground mb-3">
                    AI suggests behavioral follow-ups and helps spot inconsistencies in real-time.
                  </p>
                  <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-3 mb-3">
                    <p className="text-sm text-secondary italic">
                      Candidate mentions "led a team" → 
                      <span className="text-foreground"> AI suggests: "How many people? What was your biggest challenge as their leader?"</span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-secondary">
                    🎯 Reduce bad hires by 40%
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-6 rounded-xl bg-card/50 border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Consulting & Client Success</h3>
                  <p className="text-muted-foreground mb-3">
                    Bill for expertise, not note-taking. AI captures every requirement and commitment.
                  </p>
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-3">
                    <p className="text-sm text-primary italic">
                      Client mentions new requirement → 
                      <span className="text-foreground"> AI flags: "New scope item detected. Clarify timeline and budget impact."</span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-primary">
                    ⏰ Save 2+ hours per client per week
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Product Features Showcase */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Powerful Features That Work Together
            </h2>
            <p className="text-xl text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Everything you need for successful conversations, all in one place
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Live Transcript */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-card/50 rounded-xl p-6 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Live Transcript</h3>
                <p className="text-muted-foreground text-sm">
                  Real-time speech-to-text with speaker identification. Never miss a word.
                </p>
              </motion.div>

              {/* AI Chat */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-card/50 rounded-xl p-6 border border-border hover:border-secondary/50 transition-colors"
              >
                <div className="w-12 h-12 mb-4 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Advisor Chat</h3>
                <p className="text-muted-foreground text-sm">
                  Ask questions and get suggestions about the conversation as it happens.
                </p>
              </motion.div>

              {/* Smart Notes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-card/50 rounded-xl p-6 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Smart Notes</h3>
                <p className="text-muted-foreground text-sm">
                  AI-generated checklist and action items updated in real-time.
                </p>
              </motion.div>

              {/* Meeting Bot */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="bg-card/50 rounded-xl p-6 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Meeting Bot</h3>
                <p className="text-muted-foreground text-sm">
                  Join any Zoom, Meet, or Teams call with our AI recorder. No downloads needed.
                </p>
              </motion.div>

              {/* Previous Context */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="bg-card/50 rounded-xl p-6 border border-border hover:border-secondary/50 transition-colors"
              >
                <div className="w-12 h-12 mb-4 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Previous Context</h3>
                <p className="text-muted-foreground text-sm">
                  Reference past conversations automatically for continuity and follow-ups.
                </p>
              </motion.div>

              {/* Instant Summaries */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                viewport={{ once: true }}
                className="bg-card/50 rounded-xl p-6 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Instant Summaries</h3>
                <p className="text-muted-foreground text-sm">
                  Get comprehensive summaries with key points, decisions, and action items.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Trust & Security */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Your Conversations Are Secure</h2>
              <p className="text-xl text-muted-foreground">
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
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">SOC 2 Type II</h3>
                <p className="text-sm text-muted-foreground">Certified security compliance</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="font-semibold mb-2">End-to-End Encryption</h3>
                <p className="text-sm text-muted-foreground">Your data is always protected</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Zero Data Retention</h3>
                <p className="text-sm text-muted-foreground">Deleted after each session</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">GDPR Compliant</h3>
                <p className="text-sm text-muted-foreground">Full data privacy protection</p>
              </motion.div>
            </div>

            <div className="bg-muted/50 rounded-2xl p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Trusted by leading companies in finance, healthcare, and technology
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-secondary" />
                <span>No data training on your conversations</span>
                <span className="mx-2">•</span>
                <CheckCircle2 className="w-4 h-4 text-secondary" />
                <span>Regular security audits</span>
                <span className="mx-2">•</span>
                <CheckCircle2 className="w-4 h-4 text-secondary" />
                <span>99.9% uptime SLA</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Preview - Based on Database */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Start Free, Scale As You Grow</h2>
              <p className="text-xl text-muted-foreground">
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
                className="bg-card/50 rounded-2xl p-8 border border-border"
              >
                <h3 className="text-xl font-semibold mb-2">Free Forever</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">60 minutes/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Real-time AI guidance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Basic transcription</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Up to 40 sessions/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">10 documents per session</span>
                  </li>
                </ul>
                <button 
                  onClick={() => router.push('/auth/signup')}
                  className="w-full bg-secondary hover:bg-secondary/90 py-3 rounded-lg font-semibold transition-colors text-secondary-foreground"
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
                className="bg-gradient-to-b from-primary/20 to-card/50 rounded-2xl p-8 border border-primary/50 relative"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-semibold">
                    MOST POPULAR
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Pro</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                  <p className="text-xs text-muted-foreground mt-1">or $290/year (save 17%)</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">100 hours/month (6000 minutes)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Advanced AI summaries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Export & email summaries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Analytics dashboard</span>
                  </li>
                </ul>
                <button 
                  onClick={() => router.push('/auth/signup')}
                  className="w-full bg-primary hover:bg-primary/90 py-3 rounded-lg font-semibold transition-colors text-primary-foreground"
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
                className="bg-card/50 rounded-2xl p-8 border border-border"
              >
                <h3 className="text-xl font-semibold mb-2">Team & Enterprise</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold">Custom</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Everything in Pro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Multiple team members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Admin controls</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">SSO/SAML</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">Custom AI training</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-muted-foreground">SLA & dedicated support</span>
                  </li>
                </ul>
                <button 
                  onClick={() => window.location.href = 'mailto:sales@liveprompt.ai'}
                  className="w-full bg-secondary hover:bg-secondary/90 py-3 rounded-lg font-semibold transition-colors text-secondary-foreground"
                >
                  Contact Sales
                </button>
              </motion.div>
            </div>

            <p className="text-center mt-8 text-sm text-muted-foreground">
              All prices in USD. No credit card required for free plan. See <Link href="/pricing" className="text-primary hover:underline">full pricing details</Link>
            </p>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              What Our Users Say
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-card/50 rounded-2xl p-6 border border-border"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-primary fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "Onboarding new reps now takes days, not months. They can see exactly how top performers handle objections in real-time."
                </p>
                <div>
                  <p className="font-semibold">Sarah Chen</p>
                  <p className="text-sm text-muted-foreground">VP Sales, TechCorp</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-card/50 rounded-2xl p-6 border border-border"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-primary fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "I catch inconsistencies I would have missed before. The AI suggestions for behavioral questions are game-changing."
                </p>
                <div>
                  <p className="font-semibold">Marcus Johnson</p>
                  <p className="text-sm text-muted-foreground">Senior Recruiter, FinanceHub</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-card/50 rounded-2xl p-6 border border-border"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-primary fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "Clients love the detailed summaries I send immediately after our calls. It shows professionalism and attention."
                </p>
                <div>
                  <p className="font-semibold">Emily Rodriguez</p>
                  <p className="text-sm text-muted-foreground">Management Consultant</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FAQ Section - Simplified */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
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
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium">{faq.question}</span>
                    <ChevronDown 
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        expandedFaq === index ? 'rotate-180' : ''
                      }`}
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
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA - Early Access Form */}
        <section id="waitlist" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/20 via-background to-primary/20">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Ready to Close More Deals?
                </h2>
                <p className="text-xl text-muted-foreground mb-2">
                  Join 500+ professionals already using AI to win more conversations
                </p>
                <p className="text-sm text-muted-foreground">
                  ⏱️ Setup takes less than 2 minutes • No credit card required
                </p>
              </motion.div>
            </div>

            {!isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl p-8 border border-border"
              >
                <form onSubmit={handleWaitlistSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-muted-foreground">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                        placeholder="John Smith"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-muted-foreground">
                        Work Email
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-muted-foreground">
                      Company
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                      placeholder="Acme Inc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-muted-foreground">
                      Primary Use Case
                    </label>
                    <select
                      value={formData.useCase}
                      onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground focus:outline-none focus:border-primary transition-colors"
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
                    className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] text-primary-foreground"
                  >
                    Get Started Free →
                  </button>
                </form>
                
                <div className="mt-8 pt-8 border-t border-border">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">35%</p>
                      <p className="text-xs text-muted-foreground">Higher close rate</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-secondary">&lt;2s</p>
                      <p className="text-xs text-muted-foreground">Response time</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">2hrs</p>
                      <p className="text-xs text-muted-foreground">Saved per week</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-center mt-6 text-muted-foreground">
                  By submitting, you agree to our Terms of Service and Privacy Policy
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center bg-secondary/20 border border-secondary/30 rounded-xl p-12"
              >
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-secondary-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-4">You're on the list!</h3>
                <p className="text-muted-foreground mb-6">
                  We'll review your application and send an invite to {formData.email} within 3-5 business days.
                </p>
                <div className="inline-flex items-center gap-2 text-sm text-secondary">
                  <Mail className="w-4 h-4" />
                  <span>Check your inbox for next steps</span>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
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
                <p className="text-muted-foreground mb-4">
                  AI-powered conversation intelligence for sales, recruiting, and consulting professionals.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    SOC 2 Compliant
                  </span>
                  <span>© {new Date().getFullYear()} NexGenAI LLC</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2">
                  <li><Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
                  <li><Link href="/auth/login" className="text-muted-foreground hover:text-foreground transition-colors">Sign In</Link></li>
                  <li><a href="#waitlist" className="text-muted-foreground hover:text-foreground transition-colors">Get Access</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2">
                  <li><Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link></li>
                  <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></li>
                  <li><a href="mailto:hello@liveprompt.ai" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
                </ul>
              </div>
            </div>
          </div>
        </footer>

        {/* Floating CTA */}
        <AnimatePresence>
          {showFloatingCTA && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.3 }}
              className="fixed bottom-8 right-8 z-50"
            >
              <button
                onClick={() => router.push('/auth/signup')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-full font-semibold shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
              >
                Start Free
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}