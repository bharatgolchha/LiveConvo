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
  PhoneCall
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const testimonials = [
    {
      quote: "+23% meetings → deals after 2 weeks.",
      name: "Sarah Chen",
      role: "Sales Director",
      company: "TechCorp"
    },
    {
      quote: "Stopped winging discovery calls completely.",
      name: "Mike Rodriguez", 
      role: "Account Executive",
      company: "CloudSoft"
    },
    {
      quote: "Bills for insights, not note-taking now.",
      name: "Lisa Wang",
      role: "Management Consultant", 
      company: "Strategic Partners"
    }
  ];

  const faqs = [
    {
      question: 'Does it record my calls?',
      answer: 'No recordings stored. We process audio in real-time and delete it immediately after generating cues and summaries.'
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
      question: 'Can I cancel anytime?',
      answer: 'Yes, cancel with one click. No contracts, no questions asked.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
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
                Log In
              </button>
              <button
                onClick={() => router.push('/auth/signup')}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Start Free
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 1. Above-the-Fold Hero */}
      <section className="relative pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-6"
          >
            Real-time AI cues that close more deals
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-300 mb-8"
          >
            Live prompts, instant summaries—zero extra effort.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => router.push('/auth/signup')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 text-lg rounded-lg font-medium inline-flex items-center justify-center transition-colors"
            >
              Start Free
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
                <p className="text-gray-400 text-lg font-medium">LiveConvo Dashboard</p>
                <p className="text-gray-500 text-sm">Screenshot placeholder</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Replace with: <code className="bg-gray-800 px-2 py-1 rounded text-blue-400">&lt;img src="/screenshot.png" alt="LiveConvo Dashboard" /&gt;</code>
            </p>
          </motion.div>
        </div>
      </section>

      {/* 2. Fast Credibility Strip */}
      <section className="py-8 bg-gray-900/50 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-4">Trusted by sales teams at</p>
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
                className="bg-gray-800/50 rounded-xl p-6 border border-gray-700"
              >
                <p className="text-white font-medium mb-4">"{testimonial.quote}"</p>
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

      {/* 7. Pricing Snapshot */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Simple pricing</h2>
          </div>
          
          <div className="bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="text-left p-6 text-white font-medium">Plan</th>
                  <th className="text-center p-6 text-white font-medium">Free</th>
                  <th className="text-center p-6 text-white font-medium">Pro</th>
                  <th className="text-center p-6 text-white font-medium">Teams*</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-t border-gray-700">
                  <td className="p-6">Live minutes / month</td>
                  <td className="text-center p-6">120</td>
                  <td className="text-center p-6">2,000</td>
                  <td className="text-center p-6">10,000</td>
                </tr>
                <tr className="border-t border-gray-700">
                  <td className="p-6">Real-time cues</td>
                  <td className="text-center p-6"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center p-6"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center p-6"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-t border-gray-700">
                  <td className="p-6">CRM Push</td>
                  <td className="text-center p-6">—</td>
                  <td className="text-center p-6"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center p-6"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="border-t border-gray-700">
                  <td className="p-6">Seat price</td>
                  <td className="text-center p-6">$0</td>
                  <td className="text-center p-6 font-bold text-white">$39</td>
                  <td className="text-center p-6">Bulk</td>
                </tr>
                <tr className="border-t border-gray-700">
                  <td className="p-6"></td>
                  <td className="text-center p-6">
                    <button 
                      onClick={() => router.push('/auth/signup')}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Start Free
                    </button>
                  </td>
                  <td className="text-center p-6">
                    <button 
                      onClick={() => router.push('/auth/signup')}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Start Trial
                    </button>
                  </td>
                  <td className="text-center p-6">
                    <button 
                      onClick={() => window.location.href = 'mailto:sales@liveconvo.ai'}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Contact Sales
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-center text-gray-400 text-sm mt-4">
            *Teams pricing available on request for volume discounts
          </p>
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

      {/* 9. Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-purple-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pitch smarter on your very next call.
          </h2>
          <button
            onClick={() => router.push('/auth/signup')}
            className="bg-white text-blue-900 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-lg inline-flex items-center transition-colors"
          >
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
          <p className="mt-4 text-blue-200">
            No credit card. 2-minute setup.
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