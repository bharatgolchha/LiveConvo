'use client';
import React from 'react';

export function UploadRecordingButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-md text-xs sm:text-sm font-medium transition-all hover:shadow-md"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v-9m-4.5 4.5h9M3.75 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25h12a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 18 4.5H6A2.25 2.25 0 0 0 3.75 6.75Z" />
      </svg>
      <span className="hidden sm:inline">Upload recording</span>
      <span className="sm:hidden">Upload</span>
    </button>
  );
}

export default UploadRecordingButton;




