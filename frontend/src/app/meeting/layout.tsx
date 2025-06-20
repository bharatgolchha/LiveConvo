import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meeting - LivePrompt',
  description: 'Real-time AI guidance for your video conferences',
};

export default function MeetingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}