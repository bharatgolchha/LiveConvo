'use client';

import React from 'react';
import { supabase } from '@/lib/supabase';
import { authenticatedFetch } from '@/lib/api';

type Segment = { text: string; speaker: string; start: number; end: number; confidence?: number };

export interface UploadRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (sessionId: string) => void;
}

type Step = 'upload' | 'transcribe' | 'speakers' | 'review';

export function UploadRecordingModal({ isOpen, onClose, onCreated }: UploadRecordingModalProps) {
  const [step, setStep] = React.useState<Step>('upload');
  const [file, setFile] = React.useState<File | null>(null);
  const [segments, setSegments] = React.useState<Segment[]>([]);
  const [speakerMap, setSpeakerMap] = React.useState<Record<string, string>>({});
  const [aiTitle, setAiTitle] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [inputMode, setInputMode] = React.useState<'upload' | 'record'>('upload');
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const displayStreamRef = React.useRef<MediaStream | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const recordedChunksRef = React.useRef<Blob[]>([]);
  const [isRecordingAudio, setIsRecordingAudio] = React.useState(false);
  const [recordElapsed, setRecordElapsed] = React.useState(0);
  const recordTimerRef = React.useRef<number | null>(null);
  const [recordedFile, setRecordedFile] = React.useState<File | null>(null);
  const [captureSystemAudio, setCaptureSystemAudio] = React.useState(false);
  const [expandedTranscript, setExpandedTranscript] = React.useState(false);
  const [speakerSearch, setSpeakerSearch] = React.useState('');
  const [youSpeaker, setYouSpeaker] = React.useState<string | null>(null);
  const [precheck, setPrecheck] = React.useState<{
    allowed: boolean;
    requiredMinutes: number;
    remainingMinutes: number | null;
    isUnlimited: boolean;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const [uploadedUrl, setUploadedUrl] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState<boolean>(false);

  const speakerStats = React.useMemo(() => {
    const stats: Record<string, { count: number; duration: number; sample?: string }> = {};
    for (const s of segments) {
      if (!stats[s.speaker]) stats[s.speaker] = { count: 0, duration: 0 };
      stats[s.speaker].count += 1;
      const dur = Math.max(0, (s.end || s.start) - (s.start || 0));
      stats[s.speaker].duration += dur;
      if (!stats[s.speaker].sample && s.text?.trim()) stats[s.speaker].sample = s.text.trim();
    }
    return stats;
  }, [segments]);

  const speakerPalette = ['#22c55e','#3b82f6','#eab308','#f97316','#a855f7','#ef4444','#06b6d4','#84cc16'];
  const getSpeakerColor = (_spk: string, idx: number) => speakerPalette[idx % speakerPalette.length];

  function mergeSpeakers(from: string, to: string) {
    if (!from || !to || from === to) return;
    const next = segments.map(seg => seg.speaker === from ? { ...seg, speaker: to } : seg);
    setSegments(next);
    setSpeakerMap(prev => {
      const { [from]: _, ...rest } = prev;
      return rest;
    });
    if (youSpeaker === from) setYouSpeaker(to);
  }

  React.useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setStep('upload');
      setFile(null);
      setRecordedFile(null);
      setSegments([]);
      setSpeakerMap({});
      setAiTitle('');
      setLoading(false);
      setError(null);
      setUploadedUrl(null);
      setIsUploading(false);
      // cleanup recorder
      try {
        if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
        if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
        if (displayStreamRef.current) { displayStreamRef.current.getTracks().forEach(t => t.stop()); displayStreamRef.current = null; }
        if (audioContextRef.current) { try { audioContextRef.current.close(); } catch {} audioContextRef.current = null; }
        mediaRecorderRef.current = null;
        recordedChunksRef.current = [];
        setIsRecordingAudio(false);
        setRecordElapsed(0);
      } catch {}
    }
  }, [isOpen]);

  const uniqueSpeakers = React.useMemo(() => {
    const set = new Set(segments.map(s => s.speaker).filter(Boolean));
    return Array.from(set);
  }, [segments]);

  React.useEffect(() => {
    // Initialize default speaker names when segments change
    if (uniqueSpeakers.length > 0) {
      setSpeakerMap(prev => {
        const next = { ...prev };
        uniqueSpeakers.forEach((spk, idx) => {
          if (!next[spk]) next[spk] = `Speaker ${idx + 1}`;
        });
        return next;
      });
    }
  }, [uniqueSpeakers]);

  async function handleTranscribe() {
    let sourceFile = recordedFile || file;
    if (!sourceFile) return;
    setError(null);
    setLoading(true);
    setStep('transcribe');
    try {
      // If using recording mode, require explicit upload first
      if (inputMode === 'record' && recordedFile && !uploadedUrl) {
        setError('Please upload the recording first, then click Transcribe & diarize.');
        setLoading(false);
        return;
      }

      // If we already have an uploaded URL (recording path), skip upload and go straight to transcription
      if (inputMode === 'record' && uploadedUrl) {
        const resp = await fetch('/api/transcribe/deepgram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_url: uploadedUrl })
        });
        let data: any = null; let rawText: string | null = null;
        try { data = await resp.json(); } catch { try { rawText = await resp.text(); } catch {}
        }
        if (!resp.ok) {
          const snippet = (rawText || '').slice(0, 500);
          setError(data?.error || `Transcription failed (HTTP ${resp.status})${snippet ? `\n\n${snippet}` : ''}`);
          setLoading(false);
          return;
        }
        const segs: Segment[] = (data?.segments || []).map((s: any) => ({
          text: s.text,
          speaker: s.speaker || 'speaker_1',
          start: typeof s.start === 'number' ? s.start : 0,
          end: typeof s.end === 'number' ? s.end : 0,
          confidence: typeof s.confidence === 'number' ? s.confidence : undefined,
        }));
        // Precheck usage
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const preResp = await authenticatedFetch('/api/usage/precheck-offline', session, {
            method: 'POST',
            body: JSON.stringify({ segments: segs.map(s => ({ start: s.start, end: s.end })) })
          });
          const preData = await preResp.json();
          if (!preResp.ok || preData?.allowed === false) {
            setError(preData?.allowed === false ? `Usage limit exceeded. Required ${preData?.requiredMinutes} min, remaining ${preData?.remainingMinutes ?? 0} min.` : (preData?.error || 'Usage precheck failed'));
            setLoading(false);
            return;
          }
          setPrecheck({
            allowed: !!preData?.allowed,
            requiredMinutes: preData?.requiredMinutes ?? 0,
            remainingMinutes: preData?.remainingMinutes ?? null,
            isUnlimited: !!preData?.isUnlimited,
          });
        } catch (preErr: any) {
          setError(preErr?.message || 'Failed to verify usage limits');
          setLoading(false);
          return;
        }
        setSegments(segs);
        setStep('speakers');
        return;
      }
      // Upload path for user-selected file (upload mode)
      const path = `offline/${Date.now()}-${sourceFile.name}`;
      let fileUrl: string | null = null;
      try {
        const fd = new FormData();
        fd.append('file', sourceFile);
        fd.append('path', path);
        // Only convert when it's a recorded file; preserve original mp3 uploads
        if (inputMode === 'record') fd.append('convert', 'mp3');

        // Use XHR to report client upload progress
        const upData = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/storage/offline-upload');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(pct);
            }
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.onload = () => {
            try {
              const json = JSON.parse(xhr.responseText || '{}');
              if (xhr.status >= 200 && xhr.status < 300) resolve(json);
              else reject(new Error(json?.error || `Upload failed (${xhr.status})`));
            } catch (err) {
              reject(err);
            }
          };
          xhr.send(fd);
        });
        // Support either mp3PublicUrl (when converted) or publicUrl (original upload)
        fileUrl = upData?.mp3PublicUrl || upData?.publicUrl || null;
      } catch (clientUploadErr: any) {
        setError(clientUploadErr?.message || 'Upload failed');
        setLoading(false);
        return;
      } finally {
        setUploadProgress(0);
      }
      if (!fileUrl) {
        setError('Failed to obtain a public URL for the uploaded file');
        setLoading(false);
        return;
      }

      // 2) Call API with JSON body referencing the public URL to avoid 413 limits
      const resp = await fetch('/api/transcribe/deepgram', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: fileUrl })
      });
      let data: any = null;
      let rawText: string | null = null;
      try {
        data = await resp.json();
      } catch (parseErr: any) {
        try {
          rawText = await resp.text();
        } catch {}
      }
      if (!resp.ok) {
        const snippet = (rawText || '').slice(0, 500);
        const details = data?.details || snippet || null;
        const message = data?.error || `Transcription failed (HTTP ${resp.status} ${resp.statusText})`;
        const requestUrl = data?.request_url ? `\nRequest URL: ${data.request_url}` : '';
        const sourceUrl = data?.source_url ? `\nSource URL: ${data.source_url}` : '';
        const modeNote = data?.mode ? `\nMode: ${data.mode}` : '';
        const contentType = data?.content_type_sent ? `\nContent-Type: ${data.content_type_sent}` : '';
        const bodySize = data?.body_size ? `\nBody Size: ${data.body_size} bytes` : '';
        const errorCode = data?.error_code ? `\nError Code: ${data.error_code}` : '';
        const debugInfo = data?.debug_info ? `\nDebug: ${JSON.stringify(data.debug_info, null, 2)}` : '';
        
        setError(`${message}${errorCode}${requestUrl}${sourceUrl}${modeNote}${contentType}${bodySize}${debugInfo}${details ? `\n\nDetails:\n${details}` : ''}`);
        setLoading(false);
        return;
      }
      const segs: Segment[] = (data?.segments || []).map((s: any) => ({
        text: s.text,
        speaker: s.speaker || 'speaker_1',
        start: typeof s.start === 'number' ? s.start : 0,
        end: typeof s.end === 'number' ? s.end : 0,
        confidence: typeof s.confidence === 'number' ? s.confidence : undefined,
      }));
      // Pre-check usage limits before allowing the user to proceed
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const preResp = await authenticatedFetch('/api/usage/precheck-offline', session, {
          method: 'POST',
          body: JSON.stringify({ segments: segs.map(s => ({ start: s.start, end: s.end })) })
        });
        let preData: any = null;
        let preRawText: string | null = null;
        try {
          preData = await preResp.json();
        } catch {
          try { preRawText = await preResp.text(); } catch {}
        }
        if (!preResp.ok || preData?.allowed === false) {
          const need = preData?.requiredMinutes;
          const rem = preData?.remainingMinutes;
          const snippet = (preRawText || '').slice(0, 500);
          const baseMsg = preData?.error || `Usage precheck failed (HTTP ${preResp.status} ${preResp.statusText})`;
          setError(
            preData?.allowed === false
              ? `Usage limit exceeded. Required ${need} min, remaining ${rem ?? 0} min. Please upgrade your plan.`
              : `${baseMsg}${snippet ? `\n\nDetails (first 500 chars):\n${snippet}` : ''}`
          );
          return; // block advance
        }
        setPrecheck({
          allowed: !!preData?.allowed,
          requiredMinutes: preData?.requiredMinutes ?? 0,
          remainingMinutes: preData?.remainingMinutes ?? null,
          isUnlimited: !!preData?.isUnlimited,
        });
      } catch (preErr: any) {
        // If precheck fails unexpectedly, be safe and block creation
        setError(preErr?.message || 'Failed to verify usage limits');
        return;
      }

      setSegments(segs);
      setStep('speakers');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function goToReview() {
    setError(null);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const preResp = await authenticatedFetch('/api/usage/precheck-offline', session, {
        method: 'POST',
        body: JSON.stringify({ segments: segments.map(s => ({ start: s.start, end: s.end })) })
      });
      let preData: any = null;
      let preRawText: string | null = null;
      try { preData = await preResp.json(); } catch { try { preRawText = await preResp.text(); } catch {} }
      if (!preResp.ok || preData?.allowed === false) {
        const need = preData?.requiredMinutes;
        const rem = preData?.remainingMinutes;
        const snippet = (preRawText || '').slice(0, 500);
        const baseMsg = preData?.error || `Usage precheck failed (HTTP ${preResp.status} ${preResp.statusText})`;
        setPrecheck({
          allowed: false,
          requiredMinutes: need ?? 0,
          remainingMinutes: preData?.remainingMinutes ?? null,
          isUnlimited: !!preData?.isUnlimited,
        });
        setError(
          preData?.allowed === false
            ? `Usage limit exceeded. Required ${need} min, remaining ${rem ?? 0} min. Please upgrade your plan.`
            : `${baseMsg}${snippet ? `\n\nDetails (first 500 chars):\n${snippet}` : ''}`
        );
        return;
      }
      setPrecheck({
        allowed: true,
        requiredMinutes: preData?.requiredMinutes ?? 0,
        remainingMinutes: preData?.remainingMinutes ?? null,
        isUnlimited: !!preData?.isUnlimited,
      });
      if (!aiTitle) handleGenerateTitle();
      setStep('review');
    } catch (err: any) {
      setError(err?.message || 'Failed to verify usage limits');
    } finally {
      setLoading(false);
    }
  }

  function handleGenerateTitle() {
    // Manual title generation (no AI):
    // Prefer a counterpart speaker name if present, else derive from early text.
    const names = Object.values(speakerMap).filter(Boolean);
    const you = names[0];
    const them = names[1];

    // Extract first meaningful sentence fragment
    const firstLine = segments.find(s => (s.text || '').trim().length > 0)?.text || '';
    const cleaned = firstLine.replace(/\s+/g, ' ').trim();
    const snippet = cleaned.length > 40 ? cleaned.slice(0, 40).trim() + '…' : cleaned;

    let title = '';
    if (them && them.toLowerCase() !== 'participants' && them.toLowerCase() !== 'speaker 2') {
      title = `Conversation with ${them}`;
    } else if (you && you.toLowerCase() !== 'host' && you.toLowerCase() !== 'speaker 1') {
      title = `${you}'s Conversation`;
    } else if (snippet) {
      title = `Conversation: ${snippet}`;
    } else {
      const d = new Date();
      const ds = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      title = `Recorded Conversation — ${ds}`;
    }

    setAiTitle(title);
  }

  function buildTranscriptRows(sessionId: string) {
    // Map segments to transcript rows for persistence
    return segments.map(seg => ({
      session_id: sessionId,
      content: seg.text,
      speaker: (speakerMap[seg.speaker] || seg.speaker || 'Speaker').toLowerCase(),
      confidence_score: typeof seg.confidence === 'number' ? seg.confidence : 0.9,
      start_time_seconds: typeof seg.start === 'number' ? seg.start : 0,
      end_time_seconds: typeof seg.end === 'number' ? seg.end : undefined,
      is_final: true,
      stt_provider: 'deepgram',
    }));
  }

  async function persistTranscriptInChunks(sessionId: string, rows: any[]) {
    const chunkSize = 250;
    const { data: { session } } = await supabase.auth.getSession();
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const resp = await authenticatedFetch(`/api/sessions/${sessionId}/transcript`, session, {
        method: 'POST',
        body: JSON.stringify(chunk),
      });
      if (!resp.ok) throw new Error(`Failed to save transcript: HTTP ${resp.status}`);
    }
  }

  async function handleCreateSession() {
    setError(null);
    setLoading(true);
    try {
      const participantNames = Object.values(speakerMap);
      const participantMe = participantNames[0] || 'Host';
      const participantThem = participantNames[1] || 'Participants';
      const title = aiTitle && aiTitle.trim().length > 0 ? aiTitle.trim() : 'Conversation';

      const { data: { session } } = await supabase.auth.getSession();
      const createResp = await authenticatedFetch('/api/sessions', session, {
        method: 'POST',
        body: JSON.stringify({
          title,
          conversation_type: 'meeting',
          participant_me: participantMe,
          participant_them: participantThem,
          source: 'offline_upload',
        }),
      });
      const sessionData = await createResp.json();
      if (!createResp.ok) throw new Error(sessionData?.error || 'Failed to create session');
      const sessionId = sessionData?.session?.id || sessionData?.id;
      if (!sessionId) throw new Error('Missing session id');

      // Persist transcript lines
      const rows = buildTranscriptRows(sessionId);
      await persistTranscriptInChunks(sessionId, rows);

      // Auto-finalize and generate reports/summaries by default
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await authenticatedFetch(`/api/sessions/${sessionId}/finalize`, session, {
          method: 'POST',
          body: JSON.stringify({
            conversationType: 'meeting',
            conversationTitle: title,
            participantMe,
            participantThem,
            // send computed duration to avoid early partial durations on server
            durationSeconds: Math.max(0, Math.floor(segments.reduce((max, s) => Math.max(max, s.end || s.start || 0), 0)))
          })
        });
      } catch (finalizeErr) {
        // Non-blocking: navigate even if finalization fails; backend logs capture details
        console.warn('Finalize failed (continuing):', finalizeErr);
      }

      if (onCreated) onCreated(sessionId);
      onClose();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={() => !loading && onClose()} />
      <div className="absolute inset-x-0 top-10 mx-auto w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Processing Overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <svg className="h-8 w-8 text-primary animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <div className="mt-3 text-sm text-muted-foreground">Processing…</div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/80">
          <div className="flex items-center gap-2">
            <div className="text-xs px-2 py-0.5 rounded bg-muted text-foreground/90">{step === 'upload' ? '1' : step === 'transcribe' ? '2' : step === 'speakers' ? '3' : '4'}</div>
            <h3 className="text-sm font-semibold text-foreground">{step === 'upload' && 'Upload recording'}{step === 'transcribe' && 'Transcribe & diarize'}{step === 'speakers' && 'Name speakers'}{step === 'review' && 'Review & create'}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent text-foreground" disabled={loading} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className={`p-5 space-y-4 max-h-[65vh] overflow-auto ${loading ? 'pointer-events-none aria-busy' : ''}`}>
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Mode switch */}
              <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
                <button
                  className={`px-3 py-1.5 text-sm rounded-md ${inputMode === 'upload' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}
                  onClick={() => setInputMode('upload')}
                  disabled={loading || isRecordingAudio}
                >
                  Upload
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-md ${inputMode === 'record' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}
                  onClick={() => setInputMode('record')}
                  disabled={loading || isRecordingAudio}
                >
                  Record
                </button>
              </div>

              {inputMode === 'upload' ? (
              <>
              <div
                className="rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted/40 transition-colors cursor-pointer p-6 flex flex-col items-center justify-center text-center"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) setFile(dropped);
                }}
              >
                <svg className="h-8 w-8 text-muted-foreground mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V7.5m0 0l3 3m-3-3l-3 3M6.75 20.25h10.5a2.25 2.25 0 002.25-2.25V12A2.25 2.25 0 0017.25 9.75h-10.5A2.25 2.25 0 004.5 12v6a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <div className="text-sm text-foreground font-medium">Click to select or drag & drop</div>
                <div className="text-xs text-muted-foreground mt-1">Supports audio/video files</div>
                {(file || recordedFile) && (
                  <div className="mt-3 text-xs text-muted-foreground">Selected: <span className="text-foreground font-medium">{(file || recordedFile)!.name}</span> ({Math.round(((file || recordedFile)!.size) / 1024)} KB)</div>
                )}
              </div>
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept="audio/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                aria-label="upload-recording-input"
              />
              </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  {/* Small stepper for clarity */}
                  <div className="mb-4 text-xs text-muted-foreground flex items-center gap-3">
                    <div className={`px-2 py-0.5 rounded ${!isRecordingAudio && !recordedFile ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>1 · Record</div>
                    <div className={`px-2 py-0.5 rounded ${recordedFile && !uploadedUrl ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>2 · Upload</div>
                    <div className={`px-2 py-0.5 rounded ${uploadedUrl ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>3 · Transcribe</div>
                  </div>

                  {/* Recording visualization */}
                  <div className="relative w-28 h-28">
                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                    <div className="absolute inset-2 rounded-full bg-primary/20" />
                    <div className="absolute inset-4 rounded-full bg-primary/30 flex items-center justify-center">
                      <svg className={`w-8 h-8 ${isRecordingAudio ? 'text-primary' : 'text-muted-foreground'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-3a6 6 0 10-12 0v3a6 6 0 006 6z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 10.5v.75a3.75 3.75 0 107.5 0v-.75M12 18.75v2.25m0 0h-3m3 0h3" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {isRecordingAudio
                      ? `Recording… ${Math.floor(recordElapsed/60).toString().padStart(2,'0')}:${(recordElapsed%60).toString().padStart(2,'0')}`
                      : recordedFile
                        ? (uploadedUrl ? 'Uploaded ✓ — ready to transcribe' : 'Recording complete — please upload')
                        : 'Ready to record'}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    {!isRecordingAudio ? (
                      !recordedFile ? (
                      <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90" onClick={async () => {
                        try {
                          // Always capture microphone
                          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                          mediaStreamRef.current = micStream;

                          let finalStream: MediaStream = micStream;

                          if (captureSystemAudio) {
                            // Capture tab/system audio via display media. User must select a tab and enable "Share tab audio".
                            const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                            // Stop video track to avoid extra data; keep audio track(s)
                            display.getVideoTracks().forEach(t => t.stop());
                            displayStreamRef.current = display;

                            // Mix mic + system audio via Web Audio API
                            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                            audioContextRef.current = ctx;
                            const dest = ctx.createMediaStreamDestination();
                            const micSource = ctx.createMediaStreamSource(micStream);
                            micSource.connect(dest);
                            const sysSource = ctx.createMediaStreamSource(display);
                            sysSource.connect(dest);
                            finalStream = new MediaStream();
                            dest.stream.getAudioTracks().forEach((track: MediaStreamTrack) => finalStream.addTrack(track));
                          }

                          // Try different mime types based on browser support
                          // Prioritize formats that Deepgram handles well
                          let mimeType = '';
                          let audioBitsPerSecond = 128000; // 128 kbps for better quality
                          
                          // Try formats in order of compatibility
                          const formats = [
                            'audio/webm;codecs=opus',
                            'audio/webm',
                            'audio/ogg;codecs=opus',
                            'audio/ogg',
                            'video/webm;codecs=vp8,opus', // Some browsers only support video/webm
                            'audio/mp4',
                          ];
                          
                          for (const format of formats) {
                            if (MediaRecorder.isTypeSupported(format)) {
                              mimeType = format;
                              console.log('Using recording format:', format);
                              break;
                            }
                          }
                          
                          const recorderOptions: MediaRecorderOptions = mimeType 
                            ? { mimeType, audioBitsPerSecond }
                            : { audioBitsPerSecond };
                          
                          if (typeof MediaRecorder === 'undefined') {
                            throw new Error('Recording is not supported in this browser. Please use the latest Chrome or Edge.');
                          }
                          const mr = new MediaRecorder(finalStream, recorderOptions);
                          recordedChunksRef.current = [];
                          mr.ondataavailable = (e) => { 
                            if (e.data && e.data.size > 0) {
                              recordedChunksRef.current.push(e.data);
                            }
                          };
                          mr.onstop = () => {
                            const actualMimeType = mr.mimeType || mimeType || 'audio/webm';
                            console.log('Recording complete, mime type:', actualMimeType, 'chunks:', recordedChunksRef.current.length);
                            
                            const blob = new Blob(recordedChunksRef.current, { type: actualMimeType });
                            
                            // Determine file extension based on mime type
                            let ext = 'webm';
                            if (actualMimeType.includes('mp4')) ext = 'mp4';
                            else if (actualMimeType.includes('ogg')) ext = 'ogg';
                            else if (actualMimeType.includes('wav')) ext = 'wav';
                            else if (actualMimeType.includes('video/webm')) ext = 'webm'; // Handle video/webm
                            
                             const filename = `recording-${Date.now()}.${ext}`;
                             let fileLike: File;
                             try {
                               fileLike = new File([blob], filename, { type: actualMimeType });
                             } catch (_err) {
                               // Safari or older browsers fallback
                               const fallback = new Blob([blob], { type: actualMimeType }) as any;
                               fallback.name = filename;
                               fileLike = fallback as File;
                             }
                             console.log('Created file:', fileLike.name, 'size:', (fileLike as any).size, 'type:', (fileLike as any).type);
                             setRecordedFile(fileLike);
                          };
                          mediaRecorderRef.current = mr;
                          mr.start(250);
                          setIsRecordingAudio(true);
                          setRecordElapsed(0);
                          recordTimerRef.current = window.setInterval(() => setRecordElapsed((s) => s + 1), 1000) as unknown as number;
                        } catch (e: any) {
                          setError(e?.message || 'Failed to start recording');
                        }
                      }} disabled={loading}>Start</button>
                      ) : null
                    ) : (
                      <button className="px-4 py-2 rounded-lg bg-destructive text-white hover:bg-destructive/90" onClick={() => {
                        try {
                          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
                        } finally {
                          if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
                          if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
                          if (displayStreamRef.current) { displayStreamRef.current.getTracks().forEach(t => t.stop()); displayStreamRef.current = null; }
                          if (audioContextRef.current) { try { audioContextRef.current.close(); } catch {} audioContextRef.current = null; }
                          setIsRecordingAudio(false);
                        }
                      }} disabled={loading}>Stop</button>
                    )}
                    {recordedFile && !isRecordingAudio && (
                      <>
                        <button className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground" onClick={() => { setRecordedFile(null); setRecordElapsed(0); setUploadedUrl(null); }}>Reset</button>
                        {!uploadedUrl ? (
                          <button
                            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            onClick={async () => {
                              if (!recordedFile) return;
                              setIsUploading(true);
                              const fd = new FormData();
                              fd.append('file', recordedFile);
                              fd.append('path', `offline/${Date.now()}-${recordedFile.name}`);
                              fd.append('convert', 'mp3');
                              try {
                                const upResp = await fetch('/api/storage/offline-upload', { method: 'POST', body: fd });
                                const upData = await upResp.json();
                                if (!upResp.ok) throw new Error(upData?.error || 'Upload failed');
                                const url = upData?.mp3PublicUrl || upData?.publicUrl || null;
                                if (!url) throw new Error('No public URL returned');
                                setUploadedUrl(url);
                              } catch (e: any) {
                                setError(e?.message || 'Upload failed');
                              } finally {
                                setIsUploading(false);
                                setUploadProgress(0);
                              }
                            }}
                            disabled={isUploading}
                          >
                            {isUploading ? `Uploading… ${uploadProgress}%` : 'Upload recording'}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Uploaded</span>
                        )}
                      </>
                    )}
                  </div>
                   <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={captureSystemAudio} disabled={isRecordingAudio} onChange={(e)=> setCaptureSystemAudio(e.target.checked)} />
                      Capture tab/system audio (share tab audio)
                    </label>
                  </div>
                   {captureSystemAudio && !isRecordingAudio && (
                    <div className="mt-2 text-[11px] text-muted-foreground/80 text-center max-w-md">
                      Tip: When prompted, pick the meeting tab and enable "Share tab audio" so remote participants are included. We mix mic + tab audio locally for diarization.
               </div>
                  )}
                   {recordedFile && !uploadedUrl && !isRecordingAudio && (
                     <div className="mt-3 text-xs text-muted-foreground">Next: click <span className="text-foreground font-medium">Upload recording</span> to continue.</div>
                   )}
                   {uploadedUrl && (
                     <div className="mt-3 text-xs text-primary">Uploaded successfully. Now click <span className="font-medium">Transcribe & diarize</span> below.</div>
                   )}
                </div>
              )}
            </div>
          )}

          {step === 'transcribe' && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <svg className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              {loading ? (
                uploadProgress > 0 ? `Uploading… ${uploadProgress}%` : 
                recordedFile ? 'Converting to MP3 and processing transcription…' : 'Processing transcription…'
              ) : 'Transcription complete.'}
            </div>
          )}

          {step === 'speakers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Detected speakers ({uniqueSpeakers.length})</div>
                {uniqueSpeakers.length === 2 && (
                  <button
                    className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80"
                    onClick={() => {
                      const [a,b] = uniqueSpeakers;
                      setSpeakerMap(prev => ({ ...prev, [a]: prev[b] || `Speaker 2`, [b]: prev[a] || `Speaker 1` }));
                      setSegments(segments.map(seg => seg.speaker === a ? { ...seg, speaker: b } : seg.speaker === b ? { ...seg, speaker: a } : seg));
                      if (youSpeaker === a) setYouSpeaker(b); else if (youSpeaker === b) setYouSpeaker(a);
                    }}
                  >Swap top two</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none"
                  placeholder="Search speakers…"
                  value={speakerSearch}
                  onChange={(e)=>setSpeakerSearch(e.target.value)}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={expandedTranscript} onChange={(e)=>setExpandedTranscript(e.target.checked)} />
                  Show full transcript
                </label>
              </div>

              {/* Speaker list */}
              <div className="space-y-3 max-h-56 overflow-auto pr-1">
                {uniqueSpeakers
                  .filter(spk => (speakerMap[spk] || spk).toLowerCase().includes(speakerSearch.toLowerCase()))
                  .map((spk, idx) => {
                    const stats = speakerStats[spk] || { count: 0, duration: 0 };
                    const color = getSpeakerColor(spk, idx);
                    const display = speakerMap[spk] || `Speaker ${idx+1}`;
                    return (
                      <div key={spk} className="flex items-start gap-3 p-2 rounded-md border border-border bg-muted/20">
                        <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <input
                              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                              value={display}
                              onChange={(e)=> setSpeakerMap(prev => ({ ...prev, [spk]: e.target.value }))}
                            />
                            <select
                              className="text-xs rounded-md border border-border bg-background px-1.5 py-1"
                              onChange={(e)=> mergeSpeakers(spk, e.target.value)}
                              defaultValue="__merge__"
                            >
                              <option value="__merge__" disabled>Merge into…</option>
                              {uniqueSpeakers.filter(o=>o!==spk).map(o => (
                                <option key={o} value={o}>{speakerMap[o] || o}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div>{stats.count} segments • {(stats.duration).toFixed(1)}s</div>
                            <div className="flex items-center gap-3">
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="you-speaker"
                                  checked={youSpeaker === spk}
                                  onChange={()=> setYouSpeaker(spk)}
                                /> You
                              </label>
                              <span className="text-muted-foreground/60">|</span>
                              <span>Participant</span>
                            </div>
                          </div>
                          {stats.sample && (
                            <div className="text-xs text-muted-foreground truncate">“{stats.sample}”</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Transcript preview */}
              <div className="space-y-2">
                {(expandedTranscript ? segments : segments.slice(0, 6)).map((s, i) => (
                  <div key={`${s.start}-${i}`} className="rounded-md border border-border bg-muted/20 p-2">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-mono mr-2">{speakerMap[s.speaker] || s.speaker}</span>
                      {(s.start ?? 0).toFixed(2)}s → {(s.end ?? 0).toFixed(2)}s
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{s.text}</div>
                  </div>
                ))}
                {!expandedTranscript && segments.length > 6 && (
                  <button className="text-xs text-primary underline" onClick={()=> setExpandedTranscript(true)}>Show all {segments.length} lines</button>
                )}
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={aiTitle}
                  onChange={(e) => setAiTitle(e.target.value)}
                  placeholder="Session title"
                />
                <button className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-50" onClick={handleGenerateTitle} disabled={loading}>Regenerate</button>
              </div>
              {precheck && precheck.allowed === false && (
                <div className="text-xs text-destructive">
                  Out of minutes. Required {precheck.requiredMinutes} min, remaining {precheck.remainingMinutes ?? 0} min.
                </div>
              )}
              <div className="text-xs text-muted-foreground">Preview (first few lines)</div>
              <div className="space-y-2">
                {segments.slice(0, 5).map((s, i) => (
                  <div key={`${s.start}-r-${i}`} className="rounded-md border border-border bg-muted/20 p-2">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-mono mr-2">{speakerMap[s.speaker] || s.speaker}</span>
                      {(s.start ?? 0).toFixed(2)}s → {(s.end ?? 0).toFixed(2)}s
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{s.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive whitespace-pre-wrap max-h-48 overflow-auto">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-card/80">
          <button className="text-sm px-3 py-1.5 rounded-md hover:bg-muted disabled:opacity-50" onClick={() => (step === 'upload' ? onClose() : setStep(step === 'review' ? 'speakers' : step === 'speakers' ? 'transcribe' : 'upload'))} disabled={loading}>
            {step === 'upload' ? 'Cancel' : 'Back'}
          </button>
          {step === 'upload' && (
            <button
              className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={
                loading ||
                (!file && !recordedFile) ||
                (inputMode === 'record' && !!recordedFile && !uploadedUrl)
              }
              onClick={handleTranscribe}
              title={
                inputMode === 'record' && recordedFile && !uploadedUrl
                  ? 'Please upload the recording first'
                  : undefined
              }
            >
              Transcribe & diarize
            </button>
          )}
          {step === 'transcribe' && (
            <button className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50" onClick={() => setStep('speakers')} disabled={loading}>Continue</button>
          )}
          {step === 'speakers' && (
            <button className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50" onClick={goToReview} disabled={loading}>Review & create</button>
          )}
          {step === 'review' && (
            <button className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50" onClick={handleCreateSession} disabled={loading || (aiTitle.trim().length === 0) || (precheck?.allowed === false)}>Create session</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadRecordingModal;

