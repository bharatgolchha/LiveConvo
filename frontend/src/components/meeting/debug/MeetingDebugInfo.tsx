import React, { useState } from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

export function MeetingDebugInfo() {
  const { meeting, botStatus, transcript } = useMeetingContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [testText, setTestText] = useState('Test transcript message');
  const [testSpeaker, setTestSpeaker] = useState<'ME' | 'THEM'>('ME');
  
  const sendTestTranscript = async () => {
    if (!meeting) return;
    
    try {
      const response = await fetch('/api/test-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: meeting.id,
          text: testText,
          speaker: testSpeaker
        })
      });
      
      const result = await response.json();
      console.log('Test transcript result:', result);
    } catch (error) {
      console.error('Failed to send test transcript:', error);
    }
  };
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-gray-900 text-white p-4 rounded-lg shadow-lg z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium mb-2"
      >
        Debug Info
        {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronUpIcon className="w-4 h-4" />}
      </button>
      
      {isExpanded && (
        <div className="space-y-3 text-xs">
          <div>
            <strong>Meeting ID:</strong> {meeting?.id || 'None'}
          </div>
          <div>
            <strong>Bot ID:</strong> {meeting?.botId || 'None'}
          </div>
          <div>
            <strong>Bot Status:</strong> {botStatus?.status || 'None'}
          </div>
          <div>
            <strong>Transcript Count:</strong> {transcript.length}
          </div>
          <div>
            <strong>Meeting URL:</strong> {meeting?.meeting_url || 'None'}
          </div>
          <div>
            <strong>Webhook URL:</strong> {meeting ? `${window.location.origin}/api/webhooks/recall/${meeting.id}` : 'None'}
          </div>
          
          <div className="border-t pt-3 mt-3">
            <strong className="block mb-2">Test Transcript:</strong>
            <input
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full px-2 py-1 bg-gray-800 rounded mb-2"
              placeholder="Test message"
            />
            <div className="flex gap-2 mb-2">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={testSpeaker === 'ME'}
                  onChange={() => setTestSpeaker('ME')}
                />
                ME
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={testSpeaker === 'THEM'}
                  onChange={() => setTestSpeaker('THEM')}
                />
                THEM
              </label>
            </div>
            <button
              onClick={sendTestTranscript}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
            >
              Send Test Transcript
            </button>
          </div>
          
          <div className="border-t pt-3 mt-3">
            <button
              onClick={async () => {
                const response = await fetch('/api/debug/connections');
                const data = await response.json();
                console.log('Active connections:', data);
                alert(`Active connections: ${JSON.stringify(data.activeConnections, null, 2)}`);
              }}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs mb-2 block w-full"
            >
              Check Active Connections
            </button>
            
            <button
              onClick={() => {
                console.log('Forcing reconnect to SSE...');
                window.location.reload();
              }}
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs block w-full"
            >
              Force Reconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}