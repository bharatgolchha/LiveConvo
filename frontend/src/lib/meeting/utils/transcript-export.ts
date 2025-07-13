import { format } from 'date-fns';

export interface TranscriptLine {
  id: string;
  content: string;
  speaker?: string;
  start_time_seconds: number;
  end_time_seconds?: number;
  created_at: string;
}

export interface TranscriptMessage {
  id: string;
  sessionId: string;
  speaker: string;
  text: string;
  timestamp: string;
  timeSeconds: number;
  isFinal: boolean;
  isPartial?: boolean;
  confidence?: number;
  displayName?: string;
  isOwner?: boolean;
}

export interface ExportOptions {
  format: 'markdown' | 'text' | 'json';
  includeTimestamps?: boolean;
  includeSpeakers?: boolean;
  includeMetadata?: boolean;
}

export interface MeetingMetadata {
  title: string;
  date: Date;
  duration?: number;
  platform?: string;
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Convert TranscriptMessage to TranscriptLine format
function convertTranscriptMessage(message: TranscriptMessage): TranscriptLine {
  return {
    id: message.id,
    content: message.text,
    speaker: message.displayName || message.speaker,
    start_time_seconds: message.timeSeconds,
    created_at: message.timestamp,
  };
}

export function exportTranscriptAsMarkdown(
  transcripts: TranscriptLine[] | TranscriptMessage[],
  metadata: MeetingMetadata,
  options: Omit<ExportOptions, 'format'>
): string {
  // Convert if needed
  const transcriptLines = transcripts.map(t => 
    'text' in t ? convertTranscriptMessage(t as TranscriptMessage) : t as TranscriptLine
  );
  const lines: string[] = [];
  
  // Header
  lines.push(`# ${metadata.title}`);
  lines.push('');
  
  // Metadata
  if (options.includeMetadata) {
    lines.push('## Meeting Details');
    lines.push(`- **Date:** ${format(metadata.date, 'MMMM d, yyyy h:mm a')}`);
    if (metadata.duration) {
      lines.push(`- **Duration:** ${formatTimestamp(metadata.duration)}`);
    }
    if (metadata.platform) {
      lines.push(`- **Platform:** ${metadata.platform}`);
    }
    lines.push('');
  }
  
  // Transcript
  lines.push('## Transcript');
  lines.push('');
  
  let currentSpeaker = '';
  transcriptLines.forEach((line) => {
    const speaker = line.speaker || 'Unknown';
    
    // Add speaker header if changed
    if (options.includeSpeakers && speaker !== currentSpeaker) {
      lines.push(`### ${speaker}`);
      lines.push('');
      currentSpeaker = speaker;
    }
    
    // Add timestamp if requested
    if (options.includeTimestamps) {
      lines.push(`**[${formatTimestamp(line.start_time_seconds)}]** ${line.content}`);
    } else {
      lines.push(line.content);
    }
    lines.push('');
  });
  
  return lines.join('\n');
}

export function exportTranscriptAsText(
  transcripts: TranscriptLine[] | TranscriptMessage[],
  metadata: MeetingMetadata,
  options: Omit<ExportOptions, 'format'>
): string {
  // Convert if needed
  const transcriptLines = transcripts.map(t => 
    'text' in t ? convertTranscriptMessage(t as TranscriptMessage) : t as TranscriptLine
  );
  const lines: string[] = [];
  
  // Header
  lines.push(metadata.title);
  lines.push('='.repeat(metadata.title.length));
  lines.push('');
  
  // Metadata
  if (options.includeMetadata) {
    lines.push(`Date: ${format(metadata.date, 'MMMM d, yyyy h:mm a')}`);
    if (metadata.duration) {
      lines.push(`Duration: ${formatTimestamp(metadata.duration)}`);
    }
    if (metadata.platform) {
      lines.push(`Platform: ${metadata.platform}`);
    }
    lines.push('');
    lines.push('-'.repeat(40));
    lines.push('');
  }
  
  // Transcript
  let currentSpeaker = '';
  transcriptLines.forEach((line) => {
    const speaker = line.speaker || 'Unknown';
    
    // Add speaker if changed
    if (options.includeSpeakers && speaker !== currentSpeaker) {
      lines.push(`[${speaker}]`);
      currentSpeaker = speaker;
    }
    
    // Add timestamp if requested
    if (options.includeTimestamps) {
      lines.push(`[${formatTimestamp(line.start_time_seconds)}] ${line.content}`);
    } else {
      lines.push(line.content);
    }
    lines.push('');
  });
  
  return lines.join('\n');
}

export function exportTranscriptAsJSON(
  transcripts: TranscriptLine[] | TranscriptMessage[],
  metadata: MeetingMetadata,
  options: Omit<ExportOptions, 'format'>
): string {
  // Convert if needed
  const transcriptLines = transcripts.map(t => 
    'text' in t ? convertTranscriptMessage(t as TranscriptMessage) : t as TranscriptLine
  );
  const data: any = {
    metadata: {
      title: metadata.title,
      date: metadata.date.toISOString(),
      exportedAt: new Date().toISOString(),
    },
    transcript: transcriptLines.map((line) => {
      const item: any = {
        content: line.content,
        timestamp: line.start_time_seconds,
      };
      
      if (options.includeSpeakers) {
        item.speaker = line.speaker || 'Unknown';
      }
      
      if (options.includeTimestamps && line.end_time_seconds) {
        item.endTimestamp = line.end_time_seconds;
        item.duration = line.end_time_seconds - line.start_time_seconds;
      }
      
      return item;
    }),
  };
  
  if (options.includeMetadata) {
    if (metadata.duration) {
      data.metadata.duration = metadata.duration;
    }
    if (metadata.platform) {
      data.metadata.platform = metadata.platform;
    }
  }
  
  return JSON.stringify(data, null, 2);
}

export function exportTranscript(
  transcripts: TranscriptLine[] | TranscriptMessage[],
  metadata: MeetingMetadata,
  options: ExportOptions
): { content: string; filename: string; mimeType: string } {
  const date = format(metadata.date, 'yyyy-MM-dd');
  const baseFilename = `${metadata.title.replace(/[^a-z0-9]/gi, '_')}_${date}`;
  
  let content: string;
  let extension: string;
  let mimeType: string;
  
  switch (options.format) {
    case 'markdown':
      content = exportTranscriptAsMarkdown(transcripts, metadata, options);
      extension = 'md';
      mimeType = 'text/markdown';
      break;
    case 'text':
      content = exportTranscriptAsText(transcripts, metadata, options);
      extension = 'txt';
      mimeType = 'text/plain';
      break;
    case 'json':
      content = exportTranscriptAsJSON(transcripts, metadata, options);
      extension = 'json';
      mimeType = 'application/json';
      break;
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
  
  return {
    content,
    filename: `${baseFilename}.${extension}`,
    mimeType,
  };
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}