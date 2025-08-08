'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { UploadCloud, Mic, CheckCircle2 } from 'lucide-react';

interface UploadRecordingTeaserProps {
  className?: string;
}

export const UploadRecordingTeaser: React.FC<UploadRecordingTeaserProps> = ({ className = '' }) => {
  return (
    <section className={`py-16 px-4 sm:px-6 lg:px-8 bg-muted/20 ${className}`} aria-labelledby="upload-recording-heading">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10">
          {/* Icon & Copy */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3 text-app-info">
              <UploadCloud className="w-5 h-5" />
              <span className="text-xs font-medium uppercase tracking-wide">Offline transcription</span>
            </div>

            <h2 id="upload-recording-heading" className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Upload your recording
            </h2>
            <p className="text-base text-muted-foreground mb-5">
              Get a diarized transcript and summary from any audio or video file.
            </p>

            {/* Mini steps */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-5">
              <span className="inline-flex items-center gap-2">
                <Mic className="w-4 h-4 text-app-success" /> Upload
              </span>
              <span>→</span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-app-info" /> Transcribe & diarize
              </span>
              <span>→</span>
              <span>Review session</span>
            </div>

            <p className="text-xs text-muted-foreground">MP3, WAV, M4A, MP4 • Up to 200MB</p>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="shrink-0"
          >
            <Link href="/upload" aria-label="Upload a recording">
              <Button className="px-6 bg-app-success hover:bg-app-success-light text-black font-semibold">
                Upload a recording
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default UploadRecordingTeaser;



