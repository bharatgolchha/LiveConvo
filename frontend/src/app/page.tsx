'use client';

import React, { useState } from 'react';
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
  Users,
  X,
  Mic,
  Brain,
  ListChecks,
  History,
  BarChart3
} from 'lucide-react';
import SeoJsonLd from '@/components/SeoJsonLd';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { LandingAuthSection } from '@/components/landing/LandingAuthSection';

export default function LandingPage() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Tab data for the product showcase
  const productTabs = [
    {
      id: 0,
      name: 'Live Transcription',
      icon: Mic,
      description: 'Real-time speech-to-text with speaker identification',
      image: 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/Screenshots/1.png'
    },
    {
      id: 1,
      name: 'AI Guidance',
      icon: Brain,
      description: 'Smart suggestions and perfect responses in real-time',
      image: 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/Screenshots/2.png'
    },
    {
      id: 2,
      name: 'Smart Notes',
      icon: ListChecks,
      description: 'Automated action items and meeting summaries',
      image: 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/Screenshots/4.png'
    },
    {
      id: 3,
      name: 'Context Memory',
      icon: History,
      description: 'Access previous conversations and maintain continuity',
      image: 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/Screenshots/3.png'
    },
    {
      id: 4,
      name: 'Analytics',
      icon: BarChart3,
      description: 'Meeting insights and performance metrics',
      image: 'https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/Screenshots/5.png'
    }
  ];

  // Check if this is an auth callback
  React.useEffect(() => {
    const hash = window.location.hash;
    const isAuthCallback = hash && (
      hash.includes('access_token') || 
      hash.includes('error') ||
      hash.includes('type=recovery')
    );
    
    if (isAuthCallback) {
      // Redirect to callback handler without logging sensitive data
      router.replace(`/auth/callback${hash}`);
    }
  }, [router]);

  // Show floating CTA after scrolling
  React.useEffect(() => {
    const handleScroll = () => {
      setShowFloatingCTA(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


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
      <div className="min-h-screen bg-background dark">
        <Header />

        {/* Hero Section - Simplified */}
        <section 
          className="relative min-h-screen bg-cover bg-center bg-no-repeat pt-32"
          style={{
            backgroundImage: 'url(https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//ChatGPT%20Image%20Jul%207,%202025,%2008_58_51%20AM.png)'
          }}
        >
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-background/40" />
          <div className="relative z-10">
            <div className="max-w-4xl mx-auto text-center px-6 sm:px-8 lg:px-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 bg-app-success/10 border border-app-success/30">
              <span className="text-sm font-medium text-app-success">#1 AI Teammate</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-8 leading-[1.1] tracking-[-0.02em] px-4">
              <span 
                className="block mb-2"
                style={{
                  fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                  fontWeight: '700',
                  background: 'linear-gradient(180deg, #ffffff 0%, #e4e4e7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 2px 20px rgba(255, 255, 255, 0.1)',
                  letterSpacing: '-0.02em',
                  paddingBottom: '0.1em'
                }}
              >
                AI That Elevates
              </span>
              <span 
                className="relative inline-block text-5xl sm:text-6xl lg:text-7xl"
                style={{
                  fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #22d3ee 0%, #16a34a 25%, #22d3ee 50%, #16a34a 75%, #22d3ee 100%)',
                  backgroundSize: '200% 200%',
                  animation: 'gradient-shift 8s ease infinite',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 4px 24px rgba(34, 211, 238, 0.3))',
                  letterSpacing: '-0.03em',
                  lineHeight: '0.95',
                  paddingBottom: '0.1em',
                  display: 'inline-block'
                }}
              >
                Every Conversation
              </span>
            </h1>
            
            <style jsx>{`
              @keyframes gradient-shift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
            `}</style>
            
            <p className="text-lg sm:text-xl lg:text-xl mb-8 max-w-2xl mx-auto font-medium"
               style={{
                 fontFamily: "'Inter', -apple-system, sans-serif",
                 color: 'rgba(255, 255, 255, 0.8)',
                 letterSpacing: '0.01em',
                 lineHeight: '1.5'
               }}
            >
              <span className="text-app-success">Joins every call</span>
              <span className="mx-3 text-muted-foreground/60">•</span>
              <span className="text-app-info">Captures every word</span>
              <span className="mx-3 text-muted-foreground/60">•</span>
              <span className="text-app-success-light">Delivers instant insight</span>
            </p>
            
            <div className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => setShowScheduleModal(true)}
                size="lg"
                className="text-base px-8 py-4 bg-app-success hover:bg-app-success-light text-black font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Schedule Demo
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              
              <span className="text-sm text-muted-foreground hidden sm:block">or</span>
              
              <LandingAuthSection variant="hero" />
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-16">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                SOC 2 Compliant
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                &lt;2s Response Time
              </span>
            </div>
            </div>
            
            {/* Hero Screenshot - Below Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative mt-8 px-4 sm:px-6 lg:px-8 pb-12"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl max-w-6xl mx-auto">
                <Image
                  src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//scr111.png"
                  alt="liveprompt.ai platform interface showing real-time AI conversation assistance"
                  width={1200}
                  height={800}
                  className="w-full h-auto"
                  priority
                />
                {/* Gradient overlay at bottom */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to top, rgba(9, 9, 11, 1) 0%, rgba(9, 9, 11, 0.8) 20%, rgba(9, 9, 11, 0) 100%)'
                  }}
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* What is liveprompt - Poetic Introduction */}
        <section 
          className="py-24 px-4 sm:px-6 lg:px-8"
          style={{
            background: 'linear-gradient(to bottom, #243a32 0%, rgb(9 9 11) 100%)'
          }}
        >
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <p className="text-2xl sm:text-3xl lg:text-4xl leading-relaxed font-light text-foreground/90">
                Meet your{' '}
                <span 
                  style={{
                    fontFamily: "'Raleway', 'Montserrat', 'Helvetica Neue', sans-serif",
                    fontWeight: '200',
                    background: 'linear-gradient(135deg, #16a34a 0%, #22d3ee 50%, #16a34a 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '0.04em'
                  }}
                >
                  AI teammate
                </span>{' '}
                that automatically joins every meeting, remembers past conversations, and delivers{' '}
                <span 
                  style={{
                    fontFamily: "'Raleway', 'Montserrat', 'Helvetica Neue', sans-serif",
                    fontWeight: '200',
                    background: 'linear-gradient(135deg, #16a34a 0%, #22d3ee 50%, #16a34a 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '0.04em'
                  }}
                >
                  perfect responses
                </span>{' '}
                in real-time. While you focus on the human connection, liveprompt handles the{' '}
                <span 
                  style={{
                    fontFamily: "'Raleway', 'Montserrat', 'Helvetica Neue', sans-serif",
                    fontWeight: '200',
                    background: 'linear-gradient(135deg, #16a34a 0%, #22d3ee 50%, #16a34a 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '0.04em'
                  }}
                >
                  heavy lifting
                </span>—surfacing 
                relevant context, suggesting winning responses, and ensuring nothing falls through 
                the cracks. Your{' '}
                <span 
                  style={{
                    fontFamily: "'Raleway', 'Montserrat', 'Helvetica Neue', sans-serif",
                    fontWeight: '200',
                    background: 'linear-gradient(135deg, #16a34a 0%, #22d3ee 50%, #16a34a 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '0.04em'
                  }}
                >
                  unfair advantage
                </span>{' '}
                in every call.
              </p>
            </motion.div>
            
            {/* Schedule Demo Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="mt-12 text-center"
            >
              <Button
                onClick={() => setShowScheduleModal(true)}
                size="lg"
                className="text-base px-8 py-4 bg-app-success hover:bg-app-success-light text-black font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Schedule Demo
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Platform Integration Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h2 className="text-2xl font-semibold mb-8 text-foreground">
                Works seamlessly with your favorite platforms
              </h2>
              <div className="flex justify-center items-center gap-8 md:gap-12 flex-wrap">
                <div className="group cursor-pointer transition-transform hover:scale-110">
                  <Image
                    src="/platform-logos/zoom.png"
                    alt="Zoom integration - liveprompt.ai works seamlessly with Zoom meetings"
                    width={100}
                    height={35}
                    className="object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-300 filter grayscale group-hover:grayscale-0"
                  />
                </div>
                <div className="group cursor-pointer transition-transform hover:scale-110">
                  <Image
                    src="/platform-logos/meet.png"
                    alt="Google Meet integration - Real-time AI coaching for Google Meet calls"
                    width={100}
                    height={35}
                    className="object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-300 filter grayscale group-hover:grayscale-0"
                  />
                </div>
                <div className="group cursor-pointer transition-transform hover:scale-110">
                  <Image
                    src="/platform-logos/teams.png"
                    alt="Microsoft Teams integration - AI-powered conversation assistant for Teams meetings"
                    width={100}
                    height={35}
                    className="object-contain opacity-60 group-hover:opacity-100 transition-opacity duration-300 filter grayscale group-hover:grayscale-0"
                  />
                </div>
              </div>
              <p className="text-sm mt-6 text-muted-foreground">
                No downloads required • Works in your browser • Zero setup time
              </p>
            </motion.div>
          </div>
        </section>

        {/* Product Screenshot with Tabs */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Tab Navigation */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
                {productTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        group relative px-5 sm:px-7 py-3.5 rounded-2xl font-medium text-sm sm:text-base
                        transition-all duration-300
                        ${isActive 
                          ? 'bg-gradient-to-r from-app-success via-app-success-light to-app-info text-white shadow-xl shadow-app-success/25 scale-105' 
                          : 'bg-card/80 backdrop-blur-sm hover:bg-card text-foreground border border-border hover:border-app-success/30 hover:shadow-lg'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                          isActive 
                            ? 'text-white' 
                            : 'text-muted-foreground group-hover:text-app-success'
                        }`} />
                        <span className={isActive ? 'font-semibold' : ''}>{tab.name}</span>
                      </div>
                      
                      {/* Glow effect for active tab */}
                      {isActive && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-app-success/20 to-app-info/20 blur-xl -z-10" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
              
              {/* Tab Description */}
              <motion.p 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center mt-4 text-muted-foreground"
              >
                {productTabs[activeTab].description}
              </motion.p>
            </motion.div>

            {/* Tab Content - Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="relative rounded-xl overflow-hidden shadow-2xl border border-border"
                >
                  <Image 
                    src={productTabs[activeTab].image}
                    alt={`liveprompt.ai ${productTabs[activeTab].name} feature - ${productTabs[activeTab].description}`}
                    width={1000}
                    height={643}
                    className="w-full h-auto max-w-[1000px] mx-auto"
                    priority
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-card/90 to-transparent">
                    <p className="text-sm text-center text-muted-foreground">
                      Works seamlessly with Zoom, Google Meet, Teams, and any video platform
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
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
              <h2 className="text-3xl font-bold mb-4 text-foreground">
                Every Call Has That <span className="text-app-success">Make-or-Break Moment</span>
              </h2>
              <p className="text-xl max-w-3xl mx-auto text-muted-foreground">
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
                className="rounded-2xl p-8 bg-gradient-to-r from-card/50 to-muted/30 border border-border"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-app-success/20">
                      <MessageCircle className="w-6 h-6 text-app-success" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="mb-3 text-muted-foreground">Prospect says:</p>
                    <p className="text-xl font-semibold mb-4 text-foreground">"This sounds expensive. What's the ROI?"</p>
                    <div className="rounded-lg p-4 bg-app-success/10 border border-app-success/30">
                      <p className="text-sm mb-2 text-app-success">liveprompt.ai whispers:</p>
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
                className="rounded-2xl p-8 bg-gradient-to-r from-card to-muted border border-border"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-app-primary/20 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-app-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-muted-foreground mb-3">Candidate says:</p>
                    <p className="text-xl font-semibold text-foreground mb-4">"I led the project to successful completion"</p>
                    <div className="bg-app-primary/10 border border-app-primary/30 rounded-lg p-4">
                      <p className="text-sm text-app-primary mb-2">liveprompt.ai suggests:</p>
                      <p className="text-foreground">
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
                className="rounded-2xl p-8 bg-gradient-to-r from-card to-muted border border-border"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-muted-foreground mb-3">While you're deep in conversation:</p>
                    <p className="text-xl font-semibold text-foreground mb-4">AI captures every detail, commitment, and next step</p>
                    <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                      <p className="text-sm text-accent mb-2">30 seconds after your call:</p>
                      <p className="text-foreground">
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
              <p className="text-lg mb-6 text-muted-foreground">
                Stop losing deals to better-prepared competitors. 
                <span className="font-semibold text-foreground"> Level the playing field with AI.</span>
              </p>
              <Button
                onClick={() => router.push('/auth/signup')}
                size="lg"
                className="text-lg px-8 py-6 bg-app-success hover:bg-app-success-light transform hover:scale-105 transition-all duration-200"
              >
                Start Using It Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
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
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center font-bold text-2xl" style={{ background: 'linear-gradient(to bottom right, #0ea5e9, rgba(14, 165, 233, 0.8))', color: '#ffffff' }}>
                    2
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#ffffff' }}>Converse</h3>
                  <p style={{ color: '#d1d5db' }}>
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
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
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
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-app-success/20">
                  <MessageCircle className="w-5 h-5 text-app-success" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Sales & Discovery Calls</h3>
                  <p className="mb-3 text-muted-foreground">
                    Never miss BANT criteria again. AI tracks what you've covered and suggests what to ask next.
                  </p>
                  <div className="rounded-lg p-3 mb-3 bg-app-success/10 border border-app-success/30">
                    <p className="text-sm italic text-foreground">
                      "We're happy with our current solution" → 
                      <span className="text-foreground"> AI suggests: "What specific challenges are you facing that your current solution doesn't address?"</span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-app-success">
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
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-app-info/20">
                  <Users className="w-5 h-5 text-app-info" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Recruiting & Interviews</h3>
                  <p className="mb-3 text-muted-foreground">
                    AI suggests behavioral follow-ups and helps spot inconsistencies in real-time.
                  </p>
                  <div className="rounded-lg p-3 mb-3 bg-app-info/10 border border-app-info/30">
                    <p className="text-sm italic text-foreground">
                      Candidate mentions "led a team" → 
                      <span className="text-foreground"> AI suggests: "How many people? What was your biggest challenge as their leader?"</span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-app-info">
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
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-app-success/20">
                  <FileText className="w-5 h-5 text-app-success" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Consulting & Client Success</h3>
                  <p className="mb-3 text-muted-foreground">
                    Bill for expertise, not note-taking. AI captures every requirement and commitment.
                  </p>
                  <div className="rounded-lg p-3 mb-3 bg-app-success/10 border border-app-success/30">
                    <p className="text-sm italic text-foreground">
                      Client mentions new requirement → 
                      <span className="text-foreground"> AI flags: "New scope item detected. Clarify timeline and budget impact."</span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-app-success">
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
            <h2 className="text-3xl font-bold text-center mb-4 text-foreground">
              Powerful Features That Work Together
            </h2>
            <p className="text-xl text-center mb-12 max-w-2xl mx-auto text-muted-foreground">
              Everything you need for successful conversations, all in one place
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Live Transcript */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 bg-card/50 border border-border hover:border-app-success/50 transition-colors"
              >
                <div className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center bg-app-success/10">
                  <MessageCircle className="w-6 h-6 text-app-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Live Transcript</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time speech-to-text with speaker identification. Never miss a word.
                </p>
              </motion.div>

              {/* AI Chat */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 bg-card/50 border border-border hover:border-app-info/50 transition-colors"
              >
                <div className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center bg-app-info/10">
                  <MessageCircle className="w-6 h-6 text-app-info" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">AI Advisor Chat</h3>
                <p className="text-sm text-muted-foreground">
                  Ask questions and get suggestions about the conversation as it happens.
                </p>
              </motion.div>

              {/* Smart Notes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 bg-card/50 border border-border hover:border-app-success/50 transition-colors"
              >
                <div className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center bg-app-success/10">
                  <CheckCircle2 className="w-6 h-6 text-app-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Smart Notes</h3>
                <p className="text-sm text-muted-foreground">
                  AI-generated checklist and action items updated in real-time.
                </p>
              </motion.div>

              {/* Meeting Bot */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 bg-card/50 border border-border hover:border-app-success/50 transition-colors"
              >
                <div className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center bg-app-success/10">
                  <Users className="w-6 h-6 text-app-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Meeting Bot</h3>
                <p className="text-sm text-muted-foreground">
                  Join any Zoom, Meet, or Teams call with our AI recorder. No downloads needed.
                </p>
              </motion.div>

              {/* Previous Context */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 bg-card/50 border border-border hover:border-app-info/50 transition-colors"
              >
                <div className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center bg-app-info/10">
                  <Clock className="w-6 h-6 text-app-info" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Previous Context</h3>
                <p className="text-sm text-muted-foreground">
                  Reference past conversations automatically for continuity and follow-ups.
                </p>
              </motion.div>

              {/* Instant Summaries */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                viewport={{ once: true }}
                className="rounded-xl p-6 bg-card/50 border border-border hover:border-app-success/50 transition-colors"
              >
                <div className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center bg-app-success/10">
                  <FileText className="w-6 h-6 text-app-success" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Instant Summaries</h3>
                <p className="text-sm text-muted-foreground">
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
              <h2 className="text-3xl font-bold mb-4 text-foreground">Your Conversations Are Secure</h2>
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
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-app-success/10">
                  <Shield className="w-8 h-8 text-app-success" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">SOC 2 Type II</h3>
                <p className="text-sm text-muted-foreground">Certified security compliance</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-app-info/10">
                  <Shield className="w-8 h-8 text-app-info" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">End-to-End Encryption</h3>
                <p className="text-sm text-muted-foreground">Your data is always protected</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-app-success/10">
                  <Clock className="w-8 h-8 text-app-success" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Zero Data Retention</h3>
                <p className="text-sm text-muted-foreground">Deleted after each session</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-app-success/10">
                  <Shield className="w-8 h-8 text-app-success" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">GDPR Compliant</h3>
                <p className="text-sm text-muted-foreground">Full data privacy protection</p>
              </motion.div>
            </div>

            <div className="rounded-2xl p-8 text-center bg-card/50">
              <p className="mb-4 text-muted-foreground">
                Trusted by leading companies in finance, healthcare, and technology
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-app-info" />
                <span>No data training on your conversations</span>
                <span className="mx-2">•</span>
                <CheckCircle2 className="w-4 h-4 text-app-info" />
                <span>Regular security audits</span>
                <span className="mx-2">•</span>
                <CheckCircle2 className="w-4 h-4 text-app-info" />
                <span>99.9% uptime SLA</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Preview - Based on Database */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-foreground">Start Free, Scale As You Grow</h2>
              <p className="text-xl text-muted-foreground">
                Freemium pricing that grows with your success
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Starter Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="rounded-2xl p-8 bg-card/50 border border-border"
              >
                <h3 className="text-xl font-semibold mb-2 text-foreground">Starter</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-foreground">$10</span>
                  <span className="text-muted-foreground">/month</span>
                  <p className="text-xs mt-1 text-muted-foreground">or $100/year (save 17%)</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">8 hours of AI transcription/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">80 conversation sessions/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">Real-time AI coaching & suggestions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">Basic conversation summaries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">Export transcripts & reports (PDF/CSV)</span>
                  </li>
                </ul>
                <Button
                  onClick={() => router.push('/auth/signup?plan=starter')}
                  variant="secondary"
                  className="w-full bg-app-info hover:bg-app-info-light"
                >
                  Get Started
                </Button>
              </motion.div>

              {/* Pro */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="rounded-2xl p-8 relative bg-gradient-to-b from-app-success/20 to-card/50 border border-app-success/50"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xs px-3 py-1 rounded-full font-semibold bg-app-success text-white">
                    MOST POPULAR
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Pro</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-foreground">$29</span>
                  <span className="text-muted-foreground">/month</span>
                  <p className="text-xs mt-1 text-muted-foreground">or $290/year (save 17%)</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">20 hours of AI transcription/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">200 conversation sessions/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">Real-time AI coaching & suggestions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">Advanced AI summaries with insights</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">Priority support</span>
                  </li>
                </ul>
                <Button
                  onClick={() => router.push('/auth/signup?plan=pro')}
                  className="w-full bg-app-success hover:bg-app-success-light"
                >
                  Upgrade to Pro
                </Button>
              </motion.div>

              {/* Max Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="rounded-2xl p-8 bg-card/50 border border-border"
              >
                <h3 className="text-xl font-semibold mb-2 text-foreground">Max</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-foreground">$99</span>
                  <span className="text-muted-foreground">/month</span>
                  <p className="text-xs mt-1 text-muted-foreground">or $990/year (save 17%)</p>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">Unlimited AI transcription hours</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">Unlimited conversation sessions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">Advanced AI summaries with insights</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">Automated email summaries after calls</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">Export transcripts & reports (PDF/CSV)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-app-info" />
                    <span className="text-sm text-muted-foreground">Priority 24/7 customer support</span>
                  </li>
                </ul>
                <Button
                  onClick={() => router.push('/auth/signup?plan=max')}
                  variant="secondary"
                  className="w-full bg-app-info hover:bg-app-info-light"
                >
                  Go Unlimited
                </Button>
              </motion.div>
            </div>

            <p className="text-center mt-8 text-sm text-muted-foreground">
              All prices in USD. 14-day money-back guarantee. See <Link href="/pricing" className="text-app-success hover:underline">all plans including free option</Link>
            </p>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
              What Our Users Say
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="rounded-2xl p-6 bg-card/50 border border-border"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current text-app-success" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="mb-4 text-muted-foreground">
                  "Onboarding new reps now takes days, not months. They can see exactly how top performers handle objections in real-time."
                </p>
                <div>
                  <p className="font-semibold text-foreground">Sarah Chen</p>
                  <p className="text-sm text-muted-foreground">VP Sales, TechCorp</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="rounded-2xl p-6 bg-card/50 border border-border"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current text-app-success" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="mb-4 text-muted-foreground">
                  "I catch inconsistencies I would have missed before. The AI suggestions for behavioral questions are game-changing."
                </p>
                <div>
                  <p className="font-semibold text-foreground">Marcus Johnson</p>
                  <p className="text-sm text-muted-foreground">Senior Recruiter, FinanceHub</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="rounded-2xl p-6 bg-card/50 border border-border"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current text-app-success" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  ))}
                </div>
                <p className="mb-4 text-muted-foreground">
                  "Clients love the detailed summaries I send immediately after our calls. It shows professionalism and attention."
                </p>
                <div>
                  <p className="font-semibold text-foreground">Emily Rodriguez</p>
                  <p className="text-sm text-muted-foreground">Management Consultant</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FAQ Section - Simplified */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
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
                  className="rounded-lg overflow-hidden border border-border"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium text-foreground">{faq.question}</span>
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

        {/* Final CTA - Sign Up Section */}
        <section id="signup" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-app-success/20 via-background to-app-success/20">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-app-success to-app-success/70 bg-clip-text text-transparent">
                  Ready to Close More Deals?
                </h2>
                <p className="text-xl mb-2 text-muted-foreground">
                  Join 500+ professionals already using AI to win more conversations
                </p>
              </motion.div>
            </div>

            <LandingAuthSection variant="cta" />
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
                    alt="liveprompt.ai logo - AI-powered real-time conversation intelligence platform"
                    width={150}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <p className="mb-4 text-muted-foreground">
                  AI-powered conversation intelligence for sales, recruiting, and consulting professionals.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    SOC 2 Compliant
                  </span>
                  <span>© {new Date().getFullYear()} InnoventuresAI Inc.</span>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4 text-foreground">Product</h3>
                <ul className="space-y-2">
                  <li><Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
                  <li><Link href="/auth/login" className="text-muted-foreground hover:text-foreground transition-colors">Sign In</Link></li>
                  <li><a href="#waitlist" className="text-muted-foreground hover:text-foreground transition-colors">Get Access</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4 text-foreground">Company</h3>
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
        {showFloatingCTA && (
          <div className="fixed bottom-8 right-8 z-50 transition-all duration-300">
            <Button
              onClick={() => router.push('/auth/signup')}
              className="px-6 py-3 rounded-full shadow-lg bg-app-success hover:bg-app-success-light"
            >
              Start Free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Schedule Demo Modal */}
        <AnimatePresence>
          {showScheduleModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowScheduleModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-4xl h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Google Calendar iframe */}
                <iframe 
                  src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ2H0MGzewCsHK-o0A1Z4j5h-DS23T6U-030Wyx_LAY15of4hUEpz84VR0s4okY1JrFSrYtSpUTu?gv=true" 
                  style={{ border: 0 }} 
                  width="100%" 
                  height="100%" 
                  frameBorder="0"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}