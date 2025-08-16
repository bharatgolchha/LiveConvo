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
  ChevronDown,
  Clock,
  X,
  History,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Briefcase,
  UserCheck,
  HeartHandshake,
  ChartBar,
} from 'lucide-react';
import SeoJsonLd from '@/components/SeoJsonLd';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { LandingAuthSection } from '@/components/landing/LandingAuthSection';
import { AgendaShowcase } from '@/components/landing/AgendaShowcase';
import LiveTranscriptionAnimation from '@/components/landing/LiveTranscriptionAnimation';
import { useTheme } from '@/contexts/ThemeContext';

export default function LandingPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeScenario, setActiveScenario] = useState('sales');

  // Feature media configuration - easily switch between image and video
  const featureMedia = {
    aiAdvisor: {
      type: 'image', // Change to 'video' when you have the video file
      src: '/feature-images/s1.png',
      videoSrc: '/feature-videos/ai-advisor-demo.mp4', // Add your video path here
      alt: 'Nova Chat Interface - Real-time Q&A during conversations'
    },
    liveSuggestions: {
      type: 'image', // Change to 'video' when you have the video file
      src: '/feature-images/s2.png',
      videoSrc: '/feature-videos/live-suggestions-demo.mp4', // Add your video path here
      alt: 'Live Nova Suggestions - Real-time response recommendations during calls'
    },
    liveTranscription: {
      type: 'video',
      src: '/feature-images/transcription-placeholder.png',
      videoSrc: '/feature-videos/s3.mp4',
      alt: 'Live Transcription - Real-time speech to text with high accuracy'
    },
    reports: {
      type: 'image',
      src: '/feature-images/s4.png',
      videoSrc: '/feature-videos/reports-demo.mp4',
      alt: 'Reports and Summaries - Nova-generated custom reports and meeting summaries'
    }
  };

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
      question: 'Which languages does liveprompt.ai support?',
      answer: 'We provide real-time transcription in 10 major languages: English, Spanish, French, German, Hindi, Russian, Portuguese, Japanese, Italian, and Dutch. You can even switch between languages during your conversation, and our AI will keep up! This makes liveprompt.ai perfect for international teams, global sales calls, and multilingual customer support.'
    },
    {
      question: 'How does Nova join my meetings?',
      answer: 'After connecting your calendar, Nova automatically joins your scheduled meetings on Zoom, Google Meet, or Teams. You can also manually add meeting URLs or record in-person conversations directly from your browser. Nova appears as "Nova by Liveprompt.ai" in your participant list.'
    },
    {
      question: 'What happens during a live conversation?',
      answer: 'You get real-time transcription with 95% accuracy, instant suggestions from Nova tailored to your conversation context, and an interactive chat where you can ask Nova questions and get immediate guidance. Everything updates in under 2 seconds, helping you respond perfectly in the moment.'
    },
    {
      question: 'Is my conversation data secure and private?',
      answer: 'Absolutely. We\'re SOC 2 compliant with bank-level encryption. Your data is processed in real-time and deleted after each session - we don\'t store recordings. Only you can see Nova\'s suggestions during calls. Your conversations are never used to train AI models.'
    },
    {
      question: 'How do the usage limits work?',
      answer: 'Plans include monthly audio hours (transcription time). Free tier offers limited hours, Starter includes 8 hours, Pro includes 20 hours, and Max is unlimited. You can track usage in real-time from your dashboard and receive alerts at 80% usage.'
    },
    {
      question: 'Can I try it before committing to a paid plan?',
      answer: 'Yes! New users get a 7-day free trial with Pro features. You can also start with our free plan to test basic features. No credit card required to get started, and you can upgrade anytime.'
    },
    {
      question: 'What kind of reports and summaries do I get?',
      answer: 'After each meeting, Nova creates comprehensive summaries with key decisions, action items, and follow-up questions. You can ask Nova to generate custom reports focused on specific topics, export transcripts as PDF/CSV, and share professional meeting recaps with attendees.'
    },
    {
      question: 'Does it work for team collaboration?',
      answer: 'Yes! Team plans allow multiple users in your organization to use liveprompt.ai with shared billing and usage limits. Each team member gets their own account with personal settings and meeting history. Perfect for sales teams, recruiting departments, or consulting firms.'
    },
    {
      question: 'What if I need help or have technical issues?',
      answer: 'Pro and Max users get priority support through our in-app messenger (look for the question mark icon in your dashboard header) for instant help. We also offer email support for all users, with typical response times under 24 hours. Our help center includes guides for common issues, and you can always reach us at hello@liveprompt.ai.'
    }
  ];

  return (
    <>
      <SeoJsonLd />
      <div className="min-h-screen bg-background dark">
        <Header />

        {/* Hero Section - Enhanced */}
        <section 
          className="relative min-h-screen bg-cover bg-center bg-no-repeat pt-32 overflow-hidden"
          style={{
            backgroundImage: 'url(https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//ChatGPT%20Image%20Jul%207,%202025,%2008_58_51%20AM.png)'
          }}
        >
          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-app-success/5 via-transparent to-app-info/5" />
          
          {/* Animated gradient orbs */}
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-app-success/20 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-app-info/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
          
          <div className="relative z-10">
            <div className="max-w-4xl mx-auto text-center px-6 sm:px-8 lg:px-12">
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-app-success/10 to-app-info/10 border border-app-success/20"
              >
                <span className="text-sm font-medium bg-gradient-to-r from-app-success to-app-info bg-clip-text text-transparent">🎯 NEW: AI tracks your agenda automatically</span>
              </motion.div>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 leading-[1.1] tracking-[-0.02em] px-4">
              <span 
                className="block mb-3"
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
                Your AI Co-Pilot for
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
              @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
              }
              @keyframes pulse-glow {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
              }
            `}</style>
            
            {/* Beautiful Feature Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8 px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-app-success/10 to-app-success/5 border border-app-success/20 backdrop-blur-sm"
              >
                <span className="w-2 h-2 rounded-full bg-app-success animate-pulse" />
                <span className="text-sm font-medium text-foreground/90">Real-time transcription</span>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-app-info/10 to-app-info/5 border border-app-info/20 backdrop-blur-sm"
              >
                <span className="w-2 h-2 rounded-full bg-app-info animate-pulse" />
                <span className="text-sm font-medium text-foreground/90">Smart suggestions</span>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 backdrop-blur-sm"
              >
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-foreground/90">Automatic summaries</span>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-app-success-light/10 to-app-success-light/5 border border-app-success-light/20 backdrop-blur-sm"
              >
                <span className="w-2 h-2 rounded-full bg-app-success-light animate-pulse" />
                <span className="text-sm font-medium text-foreground/90">10 languages</span>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-violet-500/5 border border-violet-500/20 backdrop-blur-sm"
              >
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-sm font-medium text-foreground/90">Works with Meet, Zoom & Teams</span>
              </motion.div>
            </div>
            
            {/* CTA Buttons with enhanced styling */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button
                onClick={() => setShowScheduleModal(true)}
                size="lg"
                className="relative group text-base px-8 py-4 bg-gradient-to-r from-app-success to-app-success-light hover:from-app-success-light hover:to-app-success text-black font-semibold rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
              >
                <span className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center">
                  Schedule Demo
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              
              <span className="text-sm text-foreground/40 hidden sm:block">or</span>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-app-info/20 to-primary/20 blur-xl" />
                <LandingAuthSection variant="hero" />
              </div>
            </motion.div>

            </div>
            
            {/* Hero Screenshot - Enhanced with glow and animation */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.8, type: "spring", stiffness: 100 }}
              className="relative mt-8 px-4 sm:px-6 lg:px-8 pb-12"
            >
              <div className="relative group">
                {/* Glow effect behind screenshot */}
                <div className="absolute -inset-4 bg-gradient-to-r from-app-success/20 via-app-info/20 to-primary/20 rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
                
                <div className="relative rounded-2xl overflow-hidden shadow-2xl max-w-6xl mx-auto border border-white/10 backdrop-blur-sm">
                  <Image
                    src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//scr111.png"
                    alt="liveprompt.ai platform interface showing real-time AI conversation assistance"
                    width={1200}
                    height={800}
                    className="w-full h-auto transform group-hover:scale-[1.02] transition-transform duration-500"
                    priority
                  />
                  
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  {/* Gradient overlay at bottom */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to top, rgba(9, 9, 11, 1) 0%, rgba(9, 9, 11, 0.8) 20%, rgba(9, 9, 11, 0) 100%)'
                    }}
                  />
                </div>
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
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                Meet{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #22d3ee 0%, #16a34a 50%, #22d3ee 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Nova
                </span>
                {' '}— Your AI Assistant
              </h2>
              
              <div className="space-y-4 max-w-3xl mx-auto">
                <p className="text-lg sm:text-xl text-foreground/80 leading-relaxed">
                  Nova automatically joins your meetings, remembers every detail, and whispers the{' '}
                  <span className="font-semibold text-app-success">perfect response</span> in under two seconds.
                </p>
                
                <p className="text-lg sm:text-xl text-foreground/80 leading-relaxed">
                  While you focus on the human connection, Nova pulls context from past conversations, 
                  flags opportunities, and captures action items on the fly—so deals move{' '}
                  <span className="font-semibold text-app-info">faster</span>, 
                  follow‑ups never fall through, and you always sound{' '}
                  <span className="font-semibold text-primary">one step smarter</span>.
                </p>
              </div>
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

        {/* Platform Compatibility Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-7xl mx-auto text-center"
          >
            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Works Where You Work
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              No downloads, no plugins. liveprompt.ai integrates seamlessly with your existing meeting platforms for instant AI assistance.
            </p>
            <p className="text-base text-app-info font-medium mb-12">
              ✨ Transcribes in 10 languages on every platform
            </p>
            
            {/* Logos Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {/* Google Meet */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:border-app-success/50"
              >
                <div className="relative w-full h-16 mb-4">
                  <Image
                    src="/logos-recorders/meet.png"
                    alt="Google Meet"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Google Meet</h3>
                <p className="text-sm text-muted-foreground">One-click integration with your Google workspace</p>
              </motion.div>
              
              {/* Zoom */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:border-app-info/50"
              >
                <div className="relative w-full h-16 mb-4">
                  <Image
                    src="/logos-recorders/zoom.png"
                    alt="Zoom"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Zoom</h3>
                <p className="text-sm text-muted-foreground">Perfect for client calls and team meetings</p>
              </motion.div>
              
              {/* Teams */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:border-app-success-light/50"
              >
                <div className="relative w-full h-16 mb-4">
                  <Image
                    src="/logos-recorders/teams.png"
                    alt="Microsoft Teams"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Microsoft Teams</h3>
                <p className="text-sm text-muted-foreground">Enterprise-ready for your organization</p>
              </motion.div>
            </div>
            
            {/* Additional info */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
              className="mt-12 text-sm text-muted-foreground"
            >
              More platforms coming soon • Works with any browser-based meeting
            </motion.p>
          </motion.div>
        </section>

        {/* Multilingual Support Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          {/* Background gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-app-info/5 via-background to-app-success/5" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-app-info/10 to-transparent rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tl from-app-success/10 to-transparent rounded-full blur-3xl opacity-50" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-app-info/5 via-app-success/5 to-app-info/5 rounded-full blur-3xl opacity-30" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-7xl mx-auto relative z-10"
          >
            {/* Main Heading */}
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
                Speak Your Language, We'll Understand
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Real-time transcription in 10 major languages. Break language barriers in global meetings with instant, accurate transcription that keeps up with your conversation.
              </p>
            </div>
            
            {/* Language Grid */}
            <div className="max-w-5xl mx-auto mb-12">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {[
                  { lang: 'English', flag: '🇺🇸', code: 'EN' },
                  { lang: 'Spanish', flag: '🇪🇸', code: 'ES' },
                  { lang: 'French', flag: '🇫🇷', code: 'FR' },
                  { lang: 'German', flag: '🇩🇪', code: 'DE' },
                  { lang: 'Hindi', flag: '🇮🇳', code: 'HI' },
                  { lang: 'Russian', flag: '🇷🇺', code: 'RU' },
                  { lang: 'Portuguese', flag: '🇧🇷', code: 'PT' },
                  { lang: 'Japanese', flag: '🇯🇵', code: 'JA' },
                  { lang: 'Italian', flag: '🇮🇹', code: 'IT' },
                  { lang: 'Dutch', flag: '🇳🇱', code: 'NL' },
                ].map((language, index) => (
                  <motion.div
                    key={language.code}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="bg-card border border-border rounded-xl p-4 text-center hover:shadow-lg hover:border-app-info/50 transition-all duration-300"
                  >
                    <div className="text-3xl mb-2">{language.flag}</div>
                    <p className="font-semibold text-foreground">{language.lang}</p>
                    <p className="text-xs text-muted-foreground">{language.code}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Key Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-app-success/10 flex items-center justify-center">
                  <span className="text-2xl">🔄</span>
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Switch Languages Mid-Conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Seamlessly handle multilingual meetings. Our AI adapts instantly when speakers switch languages.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-app-info/10 flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="font-semibold mb-2 text-foreground">95% Accuracy Across All Languages</h3>
                <p className="text-sm text-muted-foreground">
                  Industry-leading accuracy with advanced AI models that understand context and nuance in every language.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-app-success-light/10 flex items-center justify-center">
                  <span className="text-2xl">🌍</span>
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Perfect for Global Teams</h3>
                <p className="text-sm text-muted-foreground">
                  Empower international sales, support multilingual customers, and unite distributed teams.
                </p>
              </motion.div>
            </div>
            
            {/* Call to Action */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <p className="text-lg mb-6 text-muted-foreground">
                Join global companies breaking down language barriers with AI
              </p>
              <Button
                onClick={() => setShowScheduleModal(true)}
                size="lg"
                className="text-base px-8 py-4 bg-app-info hover:bg-app-info-light text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Try Multilingual Transcription
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Key Features Grid - Otter.ai Style */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Section heading - Choose one of these options:
              Option 1: "Everything you need to win conversations"
              Option 2: "Powerful features that work together"
              Option 3: "Your AI-powered conversation toolkit"
              Option 4: "Features designed for real conversations"
              Option 5: "Built for professionals who close deals"
            */}
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
                Your AI-powered conversation toolkit
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                AI-powered conversation intelligence that wins deals and builds relationships
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Questions when you need them */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-white/5 via-muted/30 to-app-success/10 dark:from-white/10 dark:via-muted/40 dark:to-app-success/20 rounded-3xl p-8 relative overflow-hidden border border-border/50 backdrop-blur-sm"
              >
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-4 text-foreground">
                    Ask Nova anything
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Get instant insights and ideas during your call. Nova helps you navigate conversations in real-time.
                  </p>
                  
                  {/* Mobile mockup - video or image */}
                  <div className="relative rounded-2xl aspect-square overflow-hidden bg-black/5">
                    {featureMedia.aiAdvisor.type === 'video' ? (
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      >
                        <source src={featureMedia.aiAdvisor.videoSrc} type="video/mp4" />
                      </video>
                    ) : (
                      <Image
                        src={featureMedia.aiAdvisor.src}
                        alt={featureMedia.aiAdvisor.alt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    )}
                  </div>
                </div>
                
                {/* Decorative gradient */}
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-gradient-to-br from-app-success/20 to-app-info/20 rounded-full blur-3xl opacity-30" />
              </motion.div>

              {/* Live suggestions that win deals */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-app-success/20 to-app-info/20 rounded-3xl p-8 relative overflow-hidden border border-app-success/30"
              >
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-4 text-foreground">
                    Live suggestions that win deals
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Nova listens and provides perfect responses in real-time — only you can see them.
                  </p>
                  
                  {/* Video call with AI suggestions - video or image */}
                  <div className="relative rounded-2xl aspect-square overflow-hidden bg-black/5">
                    {featureMedia.liveSuggestions.type === 'video' ? (
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      >
                        <source src={featureMedia.liveSuggestions.videoSrc} type="video/mp4" />
                      </video>
                    ) : (
                      <Image
                        src={featureMedia.liveSuggestions.src}
                        alt={featureMedia.liveSuggestions.alt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    )}
                  </div>
                </div>
                
                {/* Decorative gradient */}
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br from-app-success/30 to-app-info/30 rounded-full blur-3xl opacity-20" />
              </motion.div>

              {/* Multilingual transcription you can trust */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-muted/30 to-card rounded-3xl p-8 relative overflow-hidden border border-border"
              >
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-4 text-foreground">
                    Multilingual transcription you can trust
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    95% accuracy in 10 languages - English, Spanish, French, German, Hindi, Russian, Portuguese, Japanese, Italian, and Dutch. Switch languages naturally, we'll keep up.
                  </p>
                  
                  {/* Live transcription animation */}
                  <div className="relative rounded-2xl aspect-square overflow-hidden">
                    <LiveTranscriptionAnimation />
                  </div>
                </div>
                
                {/* Decorative gradient */}
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-gradient-to-br from-app-success/20 to-transparent rounded-full blur-2xl" />
              </motion.div>

              {/* Reports that tell the story */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-app-info/10 to-muted/20 rounded-3xl p-8 relative overflow-hidden border border-app-info/30"
              >
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-4 text-foreground">
                    Reports that tell the story
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    No matter how long a meeting is, we'll condense it into a short, easy-to-read summary. Generate custom AI reports tailored to your needs.
                  </p>
                  
                  {/* Report interface - video or image */}
                  <div className="relative rounded-2xl aspect-square overflow-hidden bg-black/5">
                    {featureMedia.reports.type === 'video' ? (
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      >
                        <source src={featureMedia.reports.videoSrc} type="video/mp4" />
                      </video>
                    ) : (
                      <Image
                        src={featureMedia.reports.src}
                        alt={featureMedia.reports.alt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    )}
                  </div>
                </div>
                
                {/* Decorative gradient */}
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-gradient-to-br from-app-info/20 to-transparent rounded-full blur-2xl" />
              </motion.div>

              {/* Take action - items */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-card to-muted/20 rounded-3xl p-8 relative overflow-hidden border border-border"
              >
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-4 text-foreground">
                    Take action — items
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    We automatically capture and assign action items from all your meetings.
                  </p>
                  
                  {/* Action items in report format */}
                  <div className="space-y-3">
                    {/* Action Item 1 */}
                    <div className="p-4 bg-card/50 border border-border/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-app-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-app-success text-xs font-bold">✓</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground mb-2">
                            Follow up with client on pricing proposal and implementation timeline
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30">
                              HIGH
                            </span>
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                              👤 Sarah Chen
                            </span>
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                              📅 Tomorrow
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Item 2 */}
                    <div className="p-4 bg-card/50 border border-border/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-muted/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border-2 border-muted-foreground">
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground mb-2">
                            Prepare competitive analysis report for next week's strategy meeting
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30">
                              MEDIUM
                            </span>
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                              👤 John Davis
                            </span>
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                              📅 Next Monday
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Item 3 */}
                    <div className="p-4 bg-card/50 border border-border/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-muted/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border-2 border-muted-foreground">
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground mb-2">
                            Update project documentation with new API endpoints
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-green-500/30 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30">
                              LOW
                            </span>
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                              👤 Mike Wilson
                            </span>
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                              📅 End of week
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Item 4 */}
                    <div className="p-4 bg-card/50 border border-border/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-app-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-app-success text-xs font-bold">✓</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground mb-2">
                            Schedule quarterly review meeting with stakeholders
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30">
                              HIGH
                            </span>
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                              👤 Emily Rodriguez
                            </span>
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                              📅 This week
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Item 5 */}
                    <div className="p-4 bg-card/50 border border-border/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-muted/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border-2 border-muted-foreground">
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground mb-2">
                            Research competitor pricing models and market positioning
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30">
                              MEDIUM
                            </span>
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                              👤 Alex Thompson
                            </span>
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                              📅 Next Friday
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative gradient */}
                <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-gradient-to-br from-app-success/10 to-app-info/10 rounded-full blur-2xl" />
              </motion.div>

              {/* Your conversation memory */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-muted/20 to-card rounded-3xl p-8 relative overflow-hidden border border-border"
              >
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-4 text-foreground">
                    Your conversation memory
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Our AI automatically retrieves context from past meetings for perfect continuity.
                  </p>
                  
                  {/* Conversation memory timeline */}
                  <div className="space-y-3">
                    {/* Previous meeting 1 */}
                    <div className="p-4 bg-card/50 border border-border/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-app-info/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <History className="w-4 h-4 text-app-info" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-foreground">Product Roadmap Discussion</h4>
                            <span className="text-xs text-muted-foreground">2 days ago</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            "Discussed Q2 priorities: API v2 launch, mobile app beta, and enterprise features. Client requested enhanced reporting capabilities."
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              45 min
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Key context retrieved
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Previous meeting 2 */}
                    <div className="p-4 bg-card/50 border border-border/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-app-success/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <History className="w-4 h-4 text-app-success" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-foreground">Sales Pipeline Review</h4>
                            <span className="text-xs text-muted-foreground">1 week ago</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            "Enterprise deal worth $120K in final stages. Decision maker concerns about integration timeline and support SLA."
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              30 min
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Deal progressed
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Previous meeting 3 */}
                    <div className="p-4 bg-card/50 border border-border/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <History className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-foreground">Technical Architecture Review</h4>
                            <span className="text-xs text-muted-foreground">2 weeks ago</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            "Agreed on microservices approach for scalability. Database migration scheduled for March. Security audit findings addressed."
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              60 min
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              3 decisions made
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative gradient */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-muted/30 to-app-success/10 rounded-full blur-3xl opacity-20" />
              </motion.div>

            </div>
          </div>
        </section>

        {/* Agenda Tracking Feature Showcase */}
        <AgendaShowcase />

        {/* AI Suggestions in Action - Interactive Showcase */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background via-background/95 to-muted/20">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
                See <span className="text-app-success">AI Suggestions</span> in Action
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Watch how liveprompt.ai provides perfect responses in real-time across different professional scenarios
              </p>
            </motion.div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {[
                { id: 'sales', label: 'Sales', icon: Briefcase },
                { id: 'recruiting', label: 'Recruiting', icon: UserCheck },
                { id: 'customer-success', label: 'Customer Success', icon: HeartHandshake },
                { id: 'consulting', label: 'Consulting', icon: ChartBar },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveScenario(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeScenario === tab.id
                      ? 'bg-app-success text-black'
                      : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Conversation Display */}
            <motion.div
              key={activeScenario}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-black/5 dark:bg-black/20 rounded-3xl p-8 border border-border/50"
            >
              {/* Sales Scenario */}
              {activeScenario === 'sales' && (
                <div className="space-y-6">
                  {/* Prospect Message */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold">P</span>
                    </div>
                    <div className="flex-1 max-w-md">
                      <p className="text-sm text-muted-foreground mb-1">Prospect</p>
                      <div className="bg-card rounded-2xl p-4">
                        <p className="text-foreground">This sounds expensive. What's the ROI?</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* AI Suggestion */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="ml-11"
                  >
                    <div className="bg-black/90 dark:bg-black/80 rounded-2xl p-6 border border-app-success/30 relative overflow-hidden">
                      <div className="flex items-start gap-3 mb-4">
                        <Sparkles className="w-5 h-5 text-app-success mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-app-success mb-2 font-medium">AI Suggestion</p>
                          <p className="text-white/90">
                            "Great question! Our average customer sees ROI in 6 weeks. For companies your size, 
                            we typically see a 35% increase in close rates. Can I share how TechCorp saved $40k 
                            in their first quarter by reducing meeting prep time by 2 hours per rep per week?"
                          </p>
                        </div>
                      </div>
                      
                      {/* Suggested Prompts */}
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors flex items-center gap-1.5">
                          <span>📊</span> Show ROI Calculator
                        </button>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors flex items-center gap-1.5">
                          <span>💰</span> Discuss Pricing Tiers
                        </button>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors flex items-center gap-1.5">
                          <span>📈</span> Share Success Stories
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  {/* Impact Badge */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex justify-center"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-app-success/10 border border-app-success/30 rounded-full">
                      <span className="text-app-success text-sm font-medium">📈 35% higher close rates</span>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Recruiting Scenario */}
              {activeScenario === 'recruiting' && (
                <div className="space-y-6">
                  {/* Candidate Message */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold">C</span>
                    </div>
                    <div className="flex-1 max-w-md">
                      <p className="text-sm text-muted-foreground mb-1">Candidate</p>
                      <div className="bg-card rounded-2xl p-4">
                        <p className="text-foreground">I led a team of developers on that project</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* AI Suggestion */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="ml-11"
                  >
                    <div className="bg-black/90 dark:bg-black/80 rounded-2xl p-6 border border-app-info/30 relative overflow-hidden">
                      <div className="flex items-start gap-3 mb-4">
                        <Sparkles className="w-5 h-5 text-app-info mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-app-info mb-2 font-medium">AI Suggestion</p>
                          <p className="text-white/90">
                            "That's great leadership experience! Can you walk me through how you structured the team? 
                            What was your approach to delegation, and how did you handle any performance issues or conflicts 
                            that arose during the project?"
                          </p>
                        </div>
                      </div>
                      
                      {/* Suggested Prompts */}
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors flex items-center gap-1.5">
                          <span>👥</span> Team Size Details
                        </button>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors flex items-center gap-1.5">
                          <span>🎯</span> Leadership Challenges
                        </button>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors flex items-center gap-1.5">
                          <span>📊</span> Measure Success
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  {/* Impact Badge */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex justify-center"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-app-info/10 border border-app-info/30 rounded-full">
                      <span className="text-app-info text-sm font-medium">🎯 40% reduction in bad hires</span>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Customer Success Scenario */}
              {activeScenario === 'customer-success' && (
                <div className="space-y-6">
                  {/* Client Message */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold">C</span>
                    </div>
                    <div className="flex-1 max-w-md">
                      <p className="text-sm text-muted-foreground mb-1">Client</p>
                      <div className="bg-card rounded-2xl p-4">
                        <p className="text-foreground">We're seeing some issues with the API integration</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* AI Suggestion */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="ml-11"
                  >
                    <div className="bg-black/90 dark:bg-black/80 rounded-2xl p-6 border border-app-success-light/30 relative overflow-hidden">
                      <div className="flex items-start gap-3 mb-4">
                        <Sparkles className="w-5 h-5 text-app-success-light mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-app-success-light mb-2 font-medium">AI Suggestion</p>
                          <p className="text-white/90">
                            "I understand that must be frustrating. Let me help you resolve this quickly. 
                            Can you share the specific error messages you're seeing? I'll check our system logs 
                            on my end and we can do a screen share to debug this together right now."
                          </p>
                        </div>
                      </div>
                      
                      {/* Suggested Prompts */}
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors flex items-center gap-1.5">
                          <span>🔧</span> Technical Details
                        </button>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors flex items-center gap-1.5">
                          <span>📱</span> Schedule Debug Session
                        </button>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors flex items-center gap-1.5">
                          <span>📚</span> Share Docs
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  {/* Impact Badge */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex justify-center"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-app-success-light/10 border border-app-success-light/30 rounded-full">
                      <span className="text-app-success-light text-sm font-medium">⏰ 2+ hours saved per week</span>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Consulting Scenario */}
              {activeScenario === 'consulting' && (
                <div className="space-y-6">
                  {/* Client Message */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold">C</span>
                    </div>
                    <div className="flex-1 max-w-md">
                      <p className="text-sm text-muted-foreground mb-1">Client</p>
                      <div className="bg-card rounded-2xl p-4">
                        <p className="text-foreground">We need to add real-time analytics to the dashboard</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* AI Suggestion */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="ml-11"
                  >
                    <div className="bg-black/90 dark:bg-black/80 rounded-2xl p-6 border border-accent/30 relative overflow-hidden">
                      <div className="flex items-start gap-3 mb-4">
                        <Sparkles className="w-5 h-5 text-accent mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-accent mb-2 font-medium">AI Suggestion</p>
                          <p className="text-white/90">
                            "That's a valuable addition. Let me understand your requirements better: What specific 
                            metrics need real-time updates? What's your current data volume and refresh rate expectations? 
                            This will help me estimate the development effort and infrastructure changes needed."
                          </p>
                        </div>
                      </div>
                      
                      {/* Suggested Prompts */}
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors flex items-center gap-1.5">
                          <span>📋</span> Scope Requirements
                        </button>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors flex items-center gap-1.5">
                          <span>💵</span> Estimate Budget
                        </button>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors flex items-center gap-1.5">
                          <span>📅</span> Timeline Impact
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  {/* Impact Badge */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex justify-center"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-full">
                      <span className="text-accent text-sm font-medium">💰 15% higher billable hours</span>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <p className="text-lg mb-6 text-muted-foreground">
                Stop second-guessing your responses. 
                <span className="font-semibold text-foreground"> Let AI guide every conversation to success.</span>
              </p>
              <Button
                onClick={() => setShowScheduleModal(true)}
                size="lg"
                className="text-base px-8 py-4 bg-app-success hover:bg-app-success-light text-black font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Experience It Yourself
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
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
                    <span className="text-sm text-muted-foreground">Real-time coaching from Nova</span>
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
                    <span className="text-sm text-muted-foreground">Real-time coaching from Nova</span>
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
                  "I catch inconsistencies I would have missed before. Nova's suggestions for behavioral questions are game-changing."
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
                    src={resolvedTheme === 'dark' ? '/Logos/DarkMode.png' : '/Logos/LightMode.png'}
                    alt="liveprompt.ai logo - AI-powered real-time conversation intelligence platform"
                    width={180}
                    height={45}
                    className="object-contain"
                    priority
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
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}