'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Mail
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
      quote: "Invaluable feedback during alpha testing. This will change how we do discovery.",
      name: "Sarah Chen",
      role: "Beta Tester",
      company: "TechCorp",
      badge: "Alpha Tester"
    },
    {
      quote: "Direct line to founders made this feel like a true partnership.",
      name: "Mike Rodriguez", 
      role: "Early Access",
      company: "CloudSoft",
      badge: "Beta Tester"
    },
    {
      quote: "Excited to help shape the future of AI-powered conversations.",
      name: "Lisa Wang",
      role: "Product Advisor", 
      company: "Strategic Partners",
      badge: "Founding User"
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

  const perks = [
    {
      icon: <Star className="w-6 h-6" />,
      title: 'Free Beta Access',
      description: 'Full platform access during testing period'
    },
    {
      icon: <UserCheck className="w-6 h-6" />,
      title: 'Direct Founder Access',
      description: 'Weekly feedback sessions and feature requests'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Priority Features',
      description: 'Your use cases drive our development roadmap'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Grandfather Pricing',
      description: 'Lock in special rates before public launch'
    }
  ];

  return (
    <div className="dark min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">LiveConvo</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/auth/login')}
                className="hidden sm:flex px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                Beta Login
              </button>
              <button
                onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Request Access
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 1. Above-the-Fold Hero */}
      <section className="relative pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6"
          >
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-300 text-sm font-medium">Limited Beta • Invitation Only</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-6"
          >
            Never wing another important conversation again
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-300 mb-8"
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
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 text-lg rounded-lg font-medium inline-flex items-center justify-center transition-colors"
            >
              Request Early Access
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/demo')}
              className="border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white px-8 py-4 text-lg rounded-lg font-medium inline-flex items-center justify-center transition-colors"
            >
              <Play className="mr-2 w-5 h-5" />
              Watch 90-sec Demo
            </button>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-gray-400 text-sm"
          >
            🔥 <span className="text-orange-400 font-medium">47 spots filled</span> of 100 beta testers
          </motion.p>
        </div>
      </section>

      {/* Screenshot Placeholder */}
      <section className="py-16 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 text-center"
          >
            <div className="aspect-video bg-gray-900/50 rounded-lg flex items-center justify-center mb-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Mic className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-400 text-lg font-medium">LiveConvo Beta Dashboard</p>
                <p className="text-gray-500 text-sm">Real-time cues as you speak</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Beta Tester Credibility */}
      <section className="py-8 bg-gray-900/50 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-4">Trusted by beta testers from</p>
            <div className="flex justify-center items-center gap-8 opacity-60">
              {['TechCorp', 'CloudSoft', 'DataFlow', 'ScaleUp'].map((company) => (
                <div key={company} className="text-gray-500 font-medium">
                  {company}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Value Trio */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Real-Time Cues',
                description: 'Objection handling & next-best-question prompts under 2s.',
                icon: <Zap className="w-8 h-8" />
              },
              {
                title: 'Smart Summaries', 
                description: 'Action items & CRM-ready bullet points in your inbox 30 sec after hang-up.',
                icon: <FileText className="w-8 h-8" />
              },
              {
                title: 'Plug-&-Play',
                description: 'Works in any browser tab; no Zoom plug-in hell.',
                icon: <CheckCircle2 className="w-8 h-8" />
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center"
              >
                <div className="text-blue-400 mb-4">{item.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-300 text-sm">{item.description}</p>
                <button className="text-blue-400 text-sm mt-3 hover:text-blue-300">
                  Learn how →
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Demo Stripe */}
      <section className="py-16 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
            <div className="relative">
              {/* Demo Video Placeholder */}
              <div className="bg-gray-900/50 rounded-lg aspect-video flex items-center justify-center mb-4">
                <div className="text-center">
                  <Play className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <p className="text-gray-300">Live Demo: Cue appears while prospect talks</p>
                </div>
              </div>
              
              {/* Copy Summary Demo */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-green-900/30 border border-green-500/50 rounded-lg px-4 py-2"
              >
                <Copy className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300">Summary copied to clipboard</span>
                <Check className="w-4 h-4 text-green-400" />
              </motion.div>
            </div>
            <p className="text-gray-400 mt-4">
              Nothing to install. Just hit 'Start' before your call.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Use-Case Blocks */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  <div className="text-blue-400 mb-4">{useCase.icon}</div>
                  <h3 className="text-3xl font-bold text-white mb-2">{useCase.title}</h3>
                  <p className="text-blue-400 font-medium mb-4">{useCase.subtitle}</p>
                  <p className="text-gray-300 text-lg">{useCase.description}</p>
                </div>
                <div className={`bg-gray-800/50 rounded-xl p-8 border border-gray-700 ${useCase.reverse ? 'lg:col-start-1' : ''}`}>
                  <div className="h-48 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">Demo Screenshot</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Social Proof */}
      <section className="py-20 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 relative"
              >
                <div className="absolute top-4 right-4">
                  <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
                    {testimonial.badge}
                  </span>
                </div>
                <p className="text-white font-medium mb-4 pr-20">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full" />
                  <div>
                    <p className="text-white text-sm font-medium">{testimonial.name}</p>
                    <p className="text-gray-400 text-xs">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* 8. FAQ Accordion */}
      <section className="py-20 bg-gray-900/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">FAQ</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between"
                >
                  <span className="font-medium text-white">{faq.question}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-400 transition-transform ${
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
                      <p className="text-gray-300">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Early Access Program */}
      <section id="waitlist" className="py-20 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Join the Early Access Program</h2>
            <p className="text-xl text-gray-300">Limited spots available for beta testers who will shape our product</p>
          </div>

          {!isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12"
            >
              {/* Beta Perks */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">What You Get</h3>
                <div className="space-y-4">
                  {perks.map((perk, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                    >
                      <div className="text-blue-400 mt-1">{perk.icon}</div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">{perk.title}</h4>
                        <p className="text-gray-300 text-sm">{perk.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Application Form */}
              <div>
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        placeholder="Your name"
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
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors"
                    >
                      Request Early Access
                    </button>
                  </form>
                  
                  <p className="text-gray-400 text-xs mt-4 text-center">
                    We review applications weekly. Selected testers get immediate access.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center bg-green-900/20 border border-green-500/50 rounded-2xl p-12"
            >
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Application Submitted!</h3>
              <p className="text-gray-300 mb-6">
                Thanks for your interest! We'll review your application and get back to you within 3-5 business days.
              </p>
              <div className="inline-flex items-center gap-2 text-green-400 text-sm">
                <Mail className="w-4 h-4" />
                <span>Keep an eye on {formData.email}</span>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-purple-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to transform your conversations?
          </h2>
          <p className="text-xl text-blue-200 mb-8">
            Join the exclusive group shaping the future of AI-powered conversations.
          </p>
          <button
            onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-white text-blue-900 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-lg inline-flex items-center transition-colors"
          >
            Apply for Early Access
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
          <p className="mt-4 text-blue-200">
            Limited spots • Rolling invitations • Free during beta
          </p>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">LiveConvo</span>
              </div>
              <p className="text-sm text-gray-400">Your AI conversation co-pilot for better outcomes</p>
            </div>
            
            <div className="flex items-center gap-8">
              <Link href="/privacy" className="text-sm hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="text-sm hover:text-white transition-colors">Terms</Link>
              <Link href="/security" className="text-sm hover:text-white transition-colors">Security</Link>
              <Link href="/status" className="text-sm hover:text-white transition-colors">Status</Link>
            </div>
            
            <div className="flex items-center gap-4">
              <Shield className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-500">SOC 2 Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}