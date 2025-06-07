'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  Clock,
  ChevronDown,
  Check,
  Users,
  Shield,
  Briefcase,
  PhoneCall,
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
      quote: "As a hiring manager, this catches things I miss. It suggested follow-up questions that revealed a candidate wasn't a good fit. Saved us months of pain.",
      name: "David Park",
      role: "VP of Engineering", 
      company: "TechFlow",
      badge: "Founding User",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    }
  ];

  const faqs = [
    {
      question: 'How do I get selected for early access?',
      answer: 'We review applications weekly and prioritize users who can provide detailed feedback. Sales professionals, consultants, and hiring managers get priority.'
    },
    {
      question: 'Will my prospect hear anything?',
      answer: 'Completely silent to others. Only you see the cues on your screen.'
    },
    {
      question: 'What languages do you support?',
      answer: 'English, Spanish, French, German, and Portuguese with 95%+ accuracy.'
    },
    {
      question: 'How secure is my data?',
      answer: 'Bank-level encryption, SOC 2 compliant, zero data retention after processing.'
    },
    {
      question: 'What happens after the beta period?',
      answer: 'Beta testers get grandfather pricing and continued priority support when we launch publicly.'
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #030712, #111827)' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" style={{ backgroundColor: 'rgba(3, 7, 18, 0.8)', borderColor: '#374151' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//dark.png"
                alt="liveprompt.ai logo"
                width={32}
                height={32}
                className="object-contain"
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

      {/* Use-Case Blocks */}
      <section className="py-20 pt-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-white">
              Real-time AI guidance for better conversations
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Get instant coaching, automatic summaries, and professional insights during your most important calls.
            </p>
          </div>
          
          <div className="space-y-20">
            {[
              {
                title: 'Stop winging discovery calls.',
                subtitle: 'SaaS Sales',
                description: 'Get real-time prompts for qualifying questions, objection handling, and next steps.',
                icon: <Briefcase className="w-12 h-12" />,
                reverse: false
              },
              {
                title: 'Bill for insights, not note-taking.',
                subtitle: 'Consulting & Coaching', 
                description: 'Focus on your client while AI captures action items and key decisions.',
                icon: <Users className="w-12 h-12" />,
                reverse: true
              },
              {
                title: 'Spot red flags live—not after.',
                subtitle: 'Interviews & Hiring',
                description: 'Get prompted for follow-up questions when candidates give incomplete answers.',
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
                          &ldquo;Ask about their budget range&rdquo;
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
                          &ldquo;What specific challenges did you face?&rdquo;
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

      {/* Social Proof */}
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
                <p className="font-medium mb-4 pr-20" style={{ color: '#ffffff' }}>&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <Image 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                    style={{ border: '2px solid #4b5563' }}
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

      {/* FAQ Accordion */}
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

      {/* Final CTA */}
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

      {/* Footer */}
      <footer className="py-12" style={{ backgroundColor: '#030712', color: '#9ca3af' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Image 
                  src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//dark.png"
                  alt="liveprompt.ai logo"
                  width={32}
                  height={32}
                  className="object-contain"
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