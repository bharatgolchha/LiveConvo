'use client';

import React from 'react';

export default function DemoTranscriptPage() {
  return (
    <div className="h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Demo Unavailable</h1>
        <p className="text-gray-600 mb-6">
          This demo page is temporarily unavailable due to recent updates. 
          Please use the main application instead.
        </p>
        <a 
          href="/dashboard" 
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}