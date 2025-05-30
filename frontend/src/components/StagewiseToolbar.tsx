"use client";

import React from "react";
import dynamic from "next/dynamic";

// Dynamically import Stagewise toolbar only in development
const StagewiseDevToolbar = dynamic(
  () => import("@stagewise/toolbar-next").then(mod => mod.StagewiseToolbar),
  { 
    ssr: false,
    loading: () => null
  }
);

/**
 * Development-only toolbar that provides AI-powered editing capabilities.
 * 
 * Features:
 * - Browser toolbar connects frontend UI to code AI agents in editor
 * - Allows developers to select elements, leave comments, and request AI changes
 * - Only appears in development environment (excluded from production builds)
 * - Clean integration without interfering with main app functionality
 */
export function StagewiseToolbar() {
  // Only render in development environment
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <StagewiseDevToolbar 
      config={{
        plugins: []
      }}
    />
  );
}

export default StagewiseToolbar; 