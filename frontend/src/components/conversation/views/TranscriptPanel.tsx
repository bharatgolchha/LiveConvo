import React, { useState } from 'react';
import { TranscriptView } from './TranscriptView';
import { TranscriptCard } from './TranscriptCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { 
  Download, 
  Search, 
  X, 
  FileText,
  Copy,
  Check
} from 'lucide-react';
import { TranscriptLine, TalkStats } from '@/types/conversation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TranscriptPanelProps {
  transcript: TranscriptLine[];
  talkStats: TalkStats;
  sessionDuration: number;
  isRecording?: boolean;
  showStats?: boolean;
  className?: string;
  onExport?: () => void;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  transcript,
  talkStats,
  sessionDuration,
  isRecording = false,
  showStats = true,
  className,
  onExport
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter transcript based on search
  const filteredTranscript = searchQuery
    ? transcript.filter(line => 
        line.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transcript;

  // Copy transcript to clipboard
  const copyToClipboard = async () => {
    const text = transcript
      .map(line => `[${line.speaker}]: ${line.text}`)
      .join('\n\n');
    
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Transcript copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy transcript');
    }
  };

  // Copy individual message
  const copyMessage = async (line: TranscriptLine) => {
    try {
      await navigator.clipboard.writeText(line.text);
      setCopiedId(line.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  // Export transcript as text file
  const exportAsText = () => {
    const text = transcript
      .map(line => `[${new Date(line.timestamp).toLocaleTimeString()}] ${line.speaker}: ${line.text}`)
      .join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Transcript exported');
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Transcript
          {transcript.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({transcript.length} messages)
            </span>
          )}
        </h3>

        <div className="flex items-center gap-2">
          {/* Search */}
          {showSearch ? (
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Search transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(true)}
              disabled={transcript.length === 0}
            >
              <Search className="w-4 h-4" />
            </Button>
          )}

          {/* Copy */}
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            disabled={transcript.length === 0}
          >
            <Copy className="w-4 h-4" />
          </Button>

          {/* Export */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport || exportAsText}
            disabled={transcript.length === 0}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript view */}
        <div className="flex-1 overflow-hidden">
          <TranscriptView
            transcript={filteredTranscript}
            isRecording={isRecording}
            className="h-full"
          />
          
          {/* Search results info */}
          {searchQuery && (
            <div className="px-4 py-2 bg-muted/50 text-sm text-muted-foreground">
              Found {filteredTranscript.length} of {transcript.length} messages
            </div>
          )}
        </div>

        {/* Stats sidebar */}
        {showStats && transcript.length > 0 && (
          <div className="w-80 border-l p-4 overflow-y-auto">
            <TranscriptCard
              transcript={transcript}
              talkStats={talkStats}
              sessionDuration={sessionDuration}
            />
          </div>
        )}
      </div>
    </div>
  );
};