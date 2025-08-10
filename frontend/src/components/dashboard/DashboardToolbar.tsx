"use client";

import React from "react";
import { MagnifyingGlassIcon, FunnelIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { MeetingListTabs } from "./MeetingListTabs";
import { Button } from "@/components/ui/Button";

type MeetingView = "live" | "all";

export interface DashboardToolbarProps {
  view: MeetingView;
  onViewChange: (v: MeetingView) => void;
  counts: { live: number; total: number };
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenFilters: () => void;
  sort: string;
  onSortChange: (v: string) => void;
  resultsCount?: number;
  className?: string;
  timelineEnabled?: boolean;
  onToggleView?: (mode: 'list' | 'timeline') => void;
  viewMode?: 'list' | 'timeline';
  onOpenMobileCalendar?: () => void;
}

export const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
  view,
  onViewChange,
  counts,
  searchQuery,
  onSearchChange,
  onOpenFilters,
  sort,
  onSortChange,
  resultsCount,
  className = "",
  timelineEnabled = true,
  onToggleView,
  viewMode = 'timeline',
  onOpenMobileCalendar,
}) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const [people, setPeople] = React.useState<string[]>([]);
  const [platforms, setPlatforms] = React.useState<string[]>([]);
  // Local, uncommitted query so we only search on Enter/explicit commit
  const [localQuery, setLocalQuery] = React.useState<string>(searchQuery || '');

  // Keep local input in sync when external searchQuery changes (e.g., Clear all)
  React.useEffect(() => {
    setLocalQuery(searchQuery || '')
  }, [searchQuery])

  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dashboard_recent_searches') || '[]');
      if (Array.isArray(stored)) setSuggestions(stored.slice(0, 10));
    } catch (_) {}
  }, []);

  React.useEffect(() => {
    if (!isFocused) return;
    if (localQuery) return; // only prefetch when input empty
    let aborted = false;
    const controller = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams({ limit: '50', offset: '0' });
        const res = await fetch(`/api/dashboard/data?${params.toString()}&cb=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        if (aborted) return;
        const sessions = Array.isArray(json?.sessions) ? json.sessions : [];
        const peopleSet = new Set<string>();
        const platformSet = new Set<string>();
        sessions.forEach((s: any) => {
          if (Array.isArray(s.participants)) {
            s.participants.forEach((p: any) => {
              const name = typeof p === 'string' ? p : (p?.name || p?.email?.split('@')[0]);
              if (name && typeof name === 'string') peopleSet.add(name.trim());
            });
          } else {
            [s.participant_me, s.participant_them].forEach((n: any) => {
              if (n && typeof n === 'string') peopleSet.add(n.trim());
            });
          }
          if (s.meeting_platform) platformSet.add(s.meeting_platform);
        });
        setPeople(Array.from(peopleSet).slice(0, 8));
        setPlatforms(Array.from(platformSet).slice(0, 4));
      } catch (_) {}
    })();
    return () => {
      aborted = true;
      controller.abort();
    };
  }, [isFocused, searchQuery]);

  const persistSearch = (q: string) => {
    try {
      const stored = JSON.parse(localStorage.getItem('dashboard_recent_searches') || '[]');
      const next = [q, ...(Array.isArray(stored) ? stored : [])]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .slice(0, 10);
      localStorage.setItem('dashboard_recent_searches', JSON.stringify(next));
      setSuggestions(next);
    } catch (_) {}
  };

  const commitSearch = (q: string) => {
    const next = (q ?? '').trim();
    onSearchChange(next);
    if (next) persistSearch(next);
    requestAnimationFrame(() => inputRef.current?.blur());
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Escape') {
      setLocalQuery('');
      onSearchChange('');
      setActiveIndex(-1);
      requestAnimationFrame(() => inputRef.current?.blur());
      return;
    }
    if (e.key === 'Enter') {
      const q = activeIndex >= 0 ? suggestions[activeIndex] || localQuery : localQuery;
      commitSearch(q);
      return;
    }
    if (e.key === 'ArrowDown') {
      if (!isFocused) return;
      e.preventDefault();
      setActiveIndex((i) => Math.min((suggestions?.length || 0) - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      if (!isFocused) return;
      e.preventDefault();
      setActiveIndex((i) => Math.max(-1, i - 1));
      return;
    }
  };

  // Keep a CSS var updated with the toolbar height so sticky sections can offset correctly
  React.useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const setVar = () => {
      const h = el.offsetHeight || 64
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--toolbar-offset', `${h}px`)
      }
    }
    setVar()
    const ro = new ResizeObserver(setVar)
    ro.observe(el)
    window.addEventListener('resize', setVar)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', setVar)
    }
  }, [])

  return (
    <div ref={wrapperRef} className={`sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border ${className}`}>
      {/* Row 1 (mobile): Tabs + icon actions */}
      <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center gap-3 sm:hidden">
        <div className="flex-1 min-w-0">
          <MeetingListTabs
            view={view}
            onViewChange={onViewChange}
            counts={counts}
            className="mb-0"
            showStatusIndicator={false}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* List view deprecated; keep control hidden */}
          <Button variant="outline" size="sm" onClick={onOpenFilters} className="h-8 px-2.5 text-xs">
            <FunnelIcon className="w-4 h-4" />
          </Button>
          {onOpenMobileCalendar && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenMobileCalendar}
              className="h-8 px-2.5 text-xs"
              aria-label="Open upcoming meetings"
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Search + actions (desktop single row, mobile separate row) */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4 min-h-[56px] sm:min-h-[64px]">
        {/* Left: Tabs (desktop) */}
        <div className="shrink-0 hidden sm:block">
          <MeetingListTabs
            view={view}
            onViewChange={onViewChange}
            counts={counts}
            className="mb-0"
            showStatusIndicator={false}
          />
        </div>

        {/* Center: Search */}
        <div className="relative flex-1 min-w-[140px]">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search meetings, speakers, topics…"
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 100)}
            className="w-full pl-10 pr-28 sm:pr-32 h-10 border border-input rounded-lg focus:ring-2 focus:ring-app-primary focus:border-transparent bg-background text-foreground text-sm placeholder:text-muted-foreground"
            aria-label="Search meetings"
          />

          {/* Suggestions */}
          {isFocused && (suggestions.length > 0 || localQuery || people.length > 0 || platforms.length > 0) && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-md shadow-sm overflow-hidden z-10">
              {localQuery && (
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                  onMouseDown={() => commitSearch(localQuery)}
                >
                  Search “{localQuery}”
                </button>
              )}
              {suggestions.map((s, idx) => (
                <button
                  key={`${s}-${idx}`}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${idx===activeIndex ? 'bg-accent' : ''}`}
                  onMouseDown={() => commitSearch(s)}
                >
                  {s}
                </button>
              ))}
              {(people.length > 0 || platforms.length > 0) && (
                <div className="border-t border-border">
                  {people.length > 0 && (
                    <div className="px-3 py-2">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">People</div>
                      <div className="flex flex-wrap gap-1.5">
                        {people.map((p) => (
                          <button key={`p-${p}`} className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/70 border border-border" onMouseDown={() => commitSearch(p)}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {platforms.length > 0 && (
                    <div className="px-3 py-2 border-t border-border">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Platforms</div>
                      <div className="flex flex-wrap gap-1.5">
                        {platforms.map((pl) => (
                          <button key={`pl-${pl}`} className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/70 border border-border" onMouseDown={() => commitSearch(pl)}>
                            {pl.replace('_',' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Right inline controls inside input (desktop), stacked below on mobile */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 items-center gap-1.5 hidden sm:flex">
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-8 text-xs bg-background border border-input rounded-md px-2.5 focus:ring-1 focus:ring-app-primary"
              aria-label="Sort"
            >
              <option value="recent">Newest</option>
              <option value="updated">Last updated</option>
              <option value="duration">Duration</option>
              <option value="relevance">Relevance</option>
            </select>
            <Button variant="outline" size="sm" onClick={onOpenFilters} className="h-8 px-2.5 text-xs">
              <FunnelIcon className="w-3.5 h-3.5 mr-1" /> Filters
            </Button>
          </div>
        </div>

        {/* Desktop results count */}
        {typeof resultsCount === "number" && (
          <div className="hidden md:block text-xs text-muted-foreground whitespace-nowrap pl-1">
            {resultsCount} results
          </div>
        )}
        {/* Deprecated view toggle hidden */}
      </div>
    </div>
  );
};

export default DashboardToolbar;


