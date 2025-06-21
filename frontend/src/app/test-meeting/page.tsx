'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PhoneXMarkIcon, 
  EllipsisVerticalIcon,
  CogIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useEndMeeting } from '@/lib/meeting/hooks/useEndMeeting';
import { EndMeetingStatus } from '@/components/meeting/common/EndMeetingStatus';
import { Button } from '@/components/ui/Button';

// Mock meeting data for testing
const mockMeeting = {
  id: '17d0b9f1-1941-4f43-8d89-721e7dd38bb2',
  title: 'Product Strategy Meeting - End Meeting Flow Test',
  status: 'active' as 'active' | 'completed',
  participant_me: 'Bharat Golchha',
  participant_them: 'Sarah Johnson (Product Manager)',
  platform: 'zoom' as const,
  created_at: new Date().toISOString(),
  recording_duration_seconds: 2700,
  total_words_spoken: 3500
};

const mockBotStatus = {
  status: 'in_call' as const,
  bot_id: 'test-bot-id'
};

// Test version of MeetingActions component
function TestMeetingActions({ meeting, botStatus }: { meeting: typeof mockMeeting; botStatus: typeof mockBotStatus }) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  
  const { 
    endMeeting, 
    isEnding, 
    endingStep, 
    endingSuccess, 
    error 
  } = useEndMeeting();

  const handleEndMeeting = () => {
    if (!meeting) return;
    endMeeting(meeting.id, meeting.title);
  };

  const handleExport = () => {
    alert('Export feature coming soon!');
    setShowMenu(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: meeting?.title,
        text: `Join my LiveConvo meeting: ${meeting?.title}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Meeting link copied to clipboard!');
    }
    setShowMenu(false);
  };

  const isCompleted = meeting?.status === 'completed';

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push(`/report/${meeting?.id}`)}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
          title="View meeting report"
        >
          <CheckCircleIcon className="w-4 h-4" />
          <span className="text-sm">View Report</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* More actions menu */}
      <div className="relative">
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          onClick={() => setShowMenu(!showMenu)}
          title="More actions"
          disabled={isEnding}
        >
          <EllipsisVerticalIcon className="w-5 h-5" />
        </button>
        {showMenu && !isEnding && (
          <>
            <div 
              className="fixed inset-0 z-[900]" 
              onClick={() => setShowMenu(false)}
            />
            <div className="fixed top-14 right-6 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[1200]">
              <div className="py-1">
                <button
                  onClick={handleShare}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ShareIcon className="w-4 h-4" />
                  <span>Share Meeting</span>
                </button>
                <button
                  onClick={handleExport}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Export Transcript</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* End meeting button */}
      <button
        onClick={handleEndMeeting}
        disabled={isEnding}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-medium min-w-[120px] ${
          endingSuccess
            ? 'bg-green-600 text-white'
            : isEnding
            ? 'bg-red-600/70 text-white cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700 text-white hover:scale-105'
        }`}
        title={isEnding ? endingStep : "End meeting and generate final report"}
      >
        {endingSuccess ? (
          <>
            <CheckCircleIcon className="w-4 h-4" />
            <span className="text-sm">Complete!</span>
          </>
        ) : isEnding ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Ending...</span>
          </>
        ) : (
          <>
            <PhoneXMarkIcon className="w-4 h-4" />
            <span className="text-sm">End Meeting</span>
          </>
        )}
      </button>

      {/* Status indicator when ending */}
      <EndMeetingStatus
        isVisible={isEnding && !!endingStep}
        step={endingStep}
        isSuccess={endingSuccess}
        error={error}
      />
    </div>
  );
}

export default function TestMeetingPage() {
  const router = useRouter();
  const [meetingStatus, setMeetingStatus] = useState<'active' | 'completed'>('active');

  // Mock meeting data for testing
  const mockMeeting = {
    id: '17d0b9f1-1941-4f43-8d89-721e7dd38bb2',
    title: 'Product Strategy Meeting - End Meeting Flow Test',
    status: meetingStatus,
    participant_me: 'Bharat Golchha',
    participant_them: 'Sarah Johnson (Product Manager)',
    platform: 'zoom' as const,
    created_at: new Date().toISOString(),
    recording_duration_seconds: 2700,
    total_words_spoken: 3500
  };

  const mockBotStatus = {
    status: 'in_call' as const,
    bot_id: 'test-bot-id'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {mockMeeting.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    {meetingStatus === 'active' ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Recording Active
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        Meeting Completed
                      </>
                    )}
                  </span>
                  <span>{mockMeeting.participant_me} & {mockMeeting.participant_them}</span>
                  <span>{Math.floor(mockMeeting.recording_duration_seconds / 60)} minutes</span>
                </div>
              </div>
              
              {/* Test Meeting Actions Component */}
              <TestMeetingActions 
                meeting={mockMeeting}
                botStatus={mockBotStatus}
              />
            </div>
          </div>

          {/* Meeting Content Preview */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Meeting Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.floor(mockMeeting.recording_duration_seconds / 60)}m
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {mockMeeting.total_words_spoken.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Words Spoken</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  8
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Action Items</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Recent Discussion</h3>
                <div className="space-y-2">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Bharat Golchha</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Perfect! Let's start with the AI-powered analytics dashboard. What are your thoughts on the timeline?
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Sarah Johnson</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Based on our current sprint capacity and the complexity involved, I think we could have a beta version ready by mid-Q2.
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Key Action Items</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-gray-600 dark:text-gray-400">Sarah to coordinate ML model timeline with data science team</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-gray-600 dark:text-gray-400">Bharat to follow up with backend team on API stability</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-gray-600 dark:text-gray-400">Detailed timeline deliverable due by Friday</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              🧪 Test the End Meeting Flow
            </h2>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
              This is a test page to demonstrate the enhanced end meeting flow. Use the toggle below to switch between states and test different scenarios:
            </p>
            
            {/* State Toggle */}
            <div className="flex items-center gap-4 mb-4 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Meeting State:</span>
              <button
                onClick={() => setMeetingStatus(meetingStatus === 'active' ? 'completed' : 'active')}
                className="flex items-center gap-2 px-3 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-md hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors text-sm font-medium"
              >
                <ArrowPathIcon className="w-4 h-4" />
                {meetingStatus === 'active' ? 'Switch to Completed' : 'Switch to Active'}
              </button>
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                Currently: <strong>{meetingStatus === 'active' ? 'Active Meeting' : 'Completed Meeting'}</strong>
              </span>
            </div>

            <ul className="list-disc list-inside space-y-1 text-yellow-700 dark:text-yellow-300 mb-4">
              <li><strong>Active State:</strong> Shows "End Meeting" button with confirmation dialog and loading states</li>
              <li><strong>Completed State:</strong> Shows "View Report" button that navigates to the beautiful report page</li>
              <li>Multi-step loading states with progress indicators</li>
              <li>Bot stopping and session finalization</li>
              <li>Success celebration with automatic redirect</li>
              <li>Comprehensive report generation with analytics</li>
            </ul>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push(`/report/${mockMeeting.id}`)}
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/30"
              >
                Preview Report Page
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/30"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 