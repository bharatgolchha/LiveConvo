import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

type TimelineEntry = {
  id: string;
  timeStr: string;
  type: string;
  text: string;
};

interface TranscriptMessageLike {
  speaker?: string;
  displayName?: string;
  text?: string;
  timeSeconds?: number;
  timestamp?: string;
}

export function LiveTimeline({ sessionId, transcript }: { sessionId: string; transcript: TranscriptMessageLike[] }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const cursor = useMemo(() => {
    const last = transcript?.[transcript.length - 1];
    return typeof last?.timeSeconds === 'number' ? last.timeSeconds : undefined;
  }, [transcript]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        setIsStreaming(true);
        setError(null);
        controllerRef.current?.abort();
        const ctrl = new AbortController();
        controllerRef.current = ctrl;

        // Build a small recent chunk for context (server also windows)
        const recent = transcript.slice(-60);

        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const res = await fetch(`/api/sessions/${sessionId}/realtime-summary`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            transcript: recent,
            totalMessageCount: transcript.length,
            timelineMode: true,
            sessionTimeCursor: cursor ?? 0
          }),
          signal: ctrl.signal
        });

        if (!res.ok || !res.body) {
          const t = await res.text().catch(() => '');
          throw new Error(`Stream failed: ${res.status} ${res.statusText} ${t}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n');
          buffer = chunks.pop() || '';
          const newLines = chunks
            .map(l => l.replace(/\r/g, '').trim())
            .filter(Boolean)
            // accept with or without leading dash
            .filter(l => /^(?:-\s*)?\[\d{1,2}:\d{2}\]\s*\|\s*[^:]+:\s+/.test(l));

          if (newLines.length) {
            setEntries(prev => {
              const next = [...prev];
              for (const line of newLines) {
                const m = line.match(/^(?:-\s*)?\[(\d{1,2}):(\d{2})\]\s*\|\s*([^:]+):\s+(.*)$/);
                if (!m) continue;
                const timeStr = `${m[1].padStart(2, '0')}:${m[2]}`;
                const type = m[3].trim();
                const text = m[4].trim();
                const id = `${timeStr}-${type}-${text.slice(0, 24)}`;
                if (!next.find(e => e.id === id)) {
                  next.push({ id, timeStr, type, text });
                }
              }
              return next;
            });
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setIsStreaming(false);
      }
    })();

    return () => {
      cancelled = true;
      controllerRef.current?.abort();
    };
  }, [sessionId, cursor, transcript]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Live Timeline</h3>
        <span className="text-xs text-muted-foreground">{entries.length} items{isStreaming ? ' • streaming' : ''}</span>
      </div>
      <ul className="space-y-2 min-h-[140px] rounded-md border border-border/30 bg-card/40 p-3 overflow-y-auto">
        {entries.map((e, idx) => (
          <motion.li
            key={e.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.01 }}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/40"
          >
            <span className="text-xs font-mono bg-muted/60 border border-border/50 rounded px-1.5 py-0.5 text-foreground/80">
              {e.timeStr}
            </span>
            <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary border border-primary/20 rounded px-1 py-0.5">
              {e.type.replace('_', ' ')}
            </span>
            <span className="text-sm text-foreground/90 leading-snug break-words">
              {e.text}
            </span>
          </motion.li>
        ))}
        {entries.length === 0 && (
          <li className="text-xs text-muted-foreground italic">Waiting for live timeline entries…</li>
        )}
        {error && (
          <li className="text-xs text-destructive">{error}</li>
        )}
      </ul>
    </div>
  );
}

