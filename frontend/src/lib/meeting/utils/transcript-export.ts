import { format } from 'date-fns';

export interface ExportOptions {
  format: 'markdown' | 'text' | 'json';
  includeTimestamps: boolean;
  includeSpeakers: boolean;
  includeMetadata: boolean;
}

export interface TranscriptLine {
  id: string;
  text: string;
  speaker: string;
  timestamp: string;
  confidence?: number;
}

export interface ExportMetadata {
  title: string;
  date: Date;
  duration?: number;
  platform?: string;
}

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

export function exportTranscript(
  transcript: TranscriptLine[],
  metadata: ExportMetadata,
  options: ExportOptions
): ExportResult {
  const { format, includeTimestamps, includeSpeakers, includeMetadata } = options;
  
  let content = '';
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${metadata.title.replace(/[^a-zA-Z0-9]/g, '_')}_transcript_${timestamp}`;

  // Add metadata header if requested
  if (includeMetadata) {
    if (format === 'json') {
      // Metadata will be included in JSON structure
    } else if (format === 'markdown') {
      content += `# ${metadata.title}\n\n`;
      content += `**Date:** ${metadata.date.toLocaleDateString()}\n`;
      if (metadata.duration) {
        content += `**Duration:** ${Math.floor(metadata.duration / 60)}m ${metadata.duration % 60}s\n`;
      }
      if (metadata.platform) {
        content += `**Platform:** ${metadata.platform}\n`;
      }
      content += '\n---\n\n';
    } else {
      content += `${metadata.title}\n`;
      content += `Date: ${metadata.date.toLocaleDateString()}\n`;
      if (metadata.duration) {
        content += `Duration: ${Math.floor(metadata.duration / 60)}m ${metadata.duration % 60}s\n`;
      }
      if (metadata.platform) {
        content += `Platform: ${metadata.platform}\n`;
      }
      content += '\n' + '='.repeat(50) + '\n\n';
    }
  }

  // Process transcript based on format
  if (format === 'json') {
    const jsonData = {
      metadata: includeMetadata ? {
        title: metadata.title,
        date: metadata.date.toISOString(),
        duration: metadata.duration,
        platform: metadata.platform,
      } : undefined,
      transcript: transcript.map(line => ({
        id: line.id,
        text: line.text,
        speaker: includeSpeakers ? line.speaker : undefined,
        timestamp: includeTimestamps ? line.timestamp : undefined,
        confidence: line.confidence,
      }))
    };
    
    content = JSON.stringify(jsonData, null, 2);
    return {
      content,
      filename: `${filename}.json`,
      mimeType: 'application/json'
    };
  }

  // Process text/markdown formats
  transcript.forEach((line, index) => {
    let lineContent = '';
    
    if (format === 'markdown') {
      if (includeSpeakers) {
        lineContent += `**${line.speaker}:** `;
      }
      lineContent += line.text;
      if (includeTimestamps) {
        lineContent += ` _(${line.timestamp})_`;
      }
      lineContent += '\n\n';
    } else {
      // Plain text format
      if (includeTimestamps) {
        lineContent += `[${line.timestamp}] `;
      }
      if (includeSpeakers) {
        lineContent += `${line.speaker}: `;
      }
      lineContent += line.text + '\n\n';
    }
    
    content += lineContent;
  });

  const extension = format === 'markdown' ? 'md' : 'txt';
  const mimeType = format === 'markdown' ? 'text/markdown' : 'text/plain';

  return {
    content,
    filename: `${filename}.${extension}`,
    mimeType
  };
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}