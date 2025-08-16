'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TranscriptLine {
  id: string;
  text: string;
  language: string;
  flag: string;
  speaker: string;
  timestamp: string;
  isTyping?: boolean;
}

const transcriptData: Omit<TranscriptLine, 'id' | 'timestamp'>[] = [
  { text: "Hello, thank you for joining today's meeting.", language: "English", flag: "🇺🇸", speaker: "Sarah" },
  { text: "Hola, es un placer estar aquí con ustedes.", language: "Spanish", flag: "🇪🇸", speaker: "Carlos" },
  { text: "Bonjour, merci de cette opportunité.", language: "French", flag: "🇫🇷", speaker: "Marie" },
  { text: "Let me share the quarterly results with everyone.", language: "English", flag: "🇬🇧", speaker: "Sarah" },
  { text: "Guten Tag, die Zahlen sehen sehr gut aus.", language: "German", flag: "🇩🇪", speaker: "Klaus" },
  { text: "हमारी टीम ने बहुत अच्छा काम किया है।", language: "Hindi", flag: "🇮🇳", speaker: "Priya" },
  { text: "Отличная работа, команда!", language: "Russian", flag: "🇷🇺", speaker: "Ivan" },
  { text: "Excelente trabalho este trimestre.", language: "Portuguese", flag: "🇧🇷", speaker: "João" },
  { text: "素晴らしい成果ですね。", language: "Japanese", flag: "🇯🇵", speaker: "Yuki" },
  { text: "Ottimi risultati davvero!", language: "Italian", flag: "🇮🇹", speaker: "Marco" },
  { text: "Uitstekend werk, iedereen!", language: "Dutch", flag: "🇳🇱", speaker: "Emma" },
  { text: "Now let's discuss our strategy for next quarter.", language: "English", flag: "🇺🇸", speaker: "Sarah" },
  { text: "J'ai quelques idées innovantes à partager.", language: "French", flag: "🇫🇷", speaker: "Marie" },
  { text: "Me gustaría proponer una nueva iniciativa.", language: "Spanish", flag: "🇪🇸", speaker: "Carlos" },
  { text: "That sounds fantastic! Let's explore that.", language: "English", flag: "🇬🇧", speaker: "Sarah" },
];

export default function LiveTranscriptionAnimation() {
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (currentIndex >= transcriptData.length) {
      // Reset and loop
      setTimeout(() => {
        setLines([]);
        setCurrentIndex(0);
        setCurrentText("");
      }, 2000);
      return;
    }

    const currentTranscript = transcriptData[currentIndex];
    const fullText = currentTranscript.text;
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    setIsTyping(true);
    setCurrentText("");

    // Type out the text character by character
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex <= fullText.length) {
        setCurrentText(fullText.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
        
        // Add the completed line
        const newLine: TranscriptLine = {
          id: `line-${currentIndex}`,
          text: fullText,
          language: currentTranscript.language,
          flag: currentTranscript.flag,
          speaker: currentTranscript.speaker,
          timestamp,
          isTyping: false
        };
        
        setLines(prev => [...prev.slice(-4), newLine]); // Keep only last 5 lines
        setCurrentText("");
        
        // Move to next line after a short delay
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, 1500);
      }
    }, 30);

    return () => clearInterval(typingInterval);
  }, [currentIndex]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-background via-background to-muted/20 rounded-2xl p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500 to-cyan-500 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">LIVE TRANSCRIPTION</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        </div>
      </div>

      {/* Transcript lines */}
      <div className="space-y-3 relative z-10">
        <AnimatePresence mode="popLayout">
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/50"
            >
              <div className="flex items-start gap-3">
                <span className="text-lg">{line.flag}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary">{line.speaker}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{line.language}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{line.timestamp}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{line.text}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Currently typing line */}
        {isTyping && currentText && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm rounded-lg p-3 border border-primary/20"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{transcriptData[currentIndex]?.flag}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-primary">{transcriptData[currentIndex]?.speaker}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{transcriptData[currentIndex]?.language}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date().toLocaleTimeString('en-US', { 
                      hour12: false, 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {currentText}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
                  />
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Language indicators */}
      <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {['🇺🇸', '🇪🇸', '🇫🇷', '🇩🇪', '🇮🇳'].map((flag, i) => (
              <motion.span
                key={flag}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="text-xs bg-background rounded-full p-0.5 border border-border/50"
              >
                {flag}
              </motion.span>
            ))}
            <span className="text-xs bg-muted rounded-full px-2 py-0.5 border border-border/50 text-muted-foreground">
              +5
            </span>
          </div>
          <span className="text-xs text-muted-foreground">10 languages supported</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground">95% accuracy</span>
        </div>
      </div>
    </div>
  );
}