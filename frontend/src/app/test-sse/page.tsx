'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function TestSSEPage() {
  const [progress, setProgress] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const testSSE = async () => {
    addLog('Starting SSE test...');
    setProgress({ step: 'Initializing...', progress: 0, total: 8 });

    try {
      const response = await fetch('/api/sessions/test-session-123/finalize', {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationType: 'meeting',
          conversationTitle: 'Test Meeting',
          participantMe: 'Test User',
          participantThem: 'Other User'
        })
      });

      addLog(`Response received: ${response.status} ${response.headers.get('content-type')}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream available');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              addLog(`SSE data: ${JSON.stringify(data)}`);
              
              if (data.error) {
                throw new Error(data.message || 'Report generation failed');
              }
              
              if (data.complete) {
                addLog('Report generation complete!');
                return;
              }
              
              if (data.step !== undefined) {
                setProgress({
                  step: data.step,
                  progress: data.progress,
                  total: data.total || 8
                });
              }
            } catch (e) {
              addLog(`Error parsing SSE data: ${e}`);
            }
          }
        }
      }
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SSE Test Page</h1>
      
      <Button onClick={testSSE} className="mb-4">
        Test SSE Progress
      </Button>

      {progress && (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <h2 className="font-semibold">Progress:</h2>
          <p>Step: {progress.step}</p>
          <p>Progress: {progress.progress} / {progress.total}</p>
          <div className="w-full bg-gray-200 rounded h-4 mt-2">
            <div 
              className="bg-blue-500 h-4 rounded" 
              style={{ width: `${(progress.progress / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        <h2 className="font-semibold mb-2">Logs:</h2>
        <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}