"use client";

import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmailTagInput } from "@/components/ui/EmailTagInput";
import { CalendarIcon, ClockIcon, UsersIcon, DeviceTabletIcon, CheckIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface AdvancedFilters {
  speakers: string[];
  status?: string[];
  platform?: string[];
  dateFrom?: string; // ISO yyyy-mm-dd
  dateTo?: string;   // ISO yyyy-mm-dd
  durationMin?: number;
  durationMax?: number;
  ownerId?: string;
  teamId?: string;
  hasTranscript?: boolean;
  hasAiNotes?: boolean;
  hasActionItems?: boolean;
  minSpeakers?: number;
  tags?: string[];
}

export interface AdvancedFiltersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: AdvancedFilters;
  onChange: (value: AdvancedFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

export const AdvancedFiltersDrawer: React.FC<AdvancedFiltersDrawerProps> = ({ open, onOpenChange, value, onChange, onApply, onReset }) => {
  const [local, setLocal] = useState<AdvancedFilters>(value);

  React.useEffect(() => setLocal(value), [value]);

  const update = <K extends keyof AdvancedFilters>(key: K, v: AdvancedFilters[K]) => {
    setLocal((prev) => ({ ...prev, [key]: v }));
  };

  const apply = () => {
    onChange(local);
    onApply();
    onOpenChange(false);
  };

  const reset = () => {
    onReset();
    onOpenChange(false);
  };

  const activeCount = useMemo(() => {
    let n = 0;
    if (local.speakers?.length) n += 1;
    if (local.status?.length) n += 1;
    if (local.platform?.length) n += 1;
    if (local.dateFrom || local.dateTo) n += 1;
    if (local.durationMin || local.durationMax) n += 1;
    if (local.hasTranscript || local.hasAiNotes || local.hasActionItems) n += 1;
    if (local.tags?.length) n += 1;
    return n;
  }, [local]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FunnelIcon className="w-4 h-4 text-primary" />
            </div>
            Filter Meetings
            {activeCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto"
              >
                <Badge variant="default" className="text-xs font-medium">
                  {activeCount} filter{activeCount !== 1 ? 's' : ''} active
                </Badge>
              </motion.div>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Quickly find meetings by refining your search criteria below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-2">
          {/* Quick Time Presets */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Quick Time Filters</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All time", icon: "🌐" },
                { key: "7d", label: "Last 7 days", icon: "📅" },
                { key: "30d", label: "Last 30 days", icon: "📆" },
                { key: "quarter", label: "This quarter", icon: "🗓️" },
              ].map((p) => {
                const isActive = (() => {
                  if (p.key === "all") return !local.dateFrom && !local.dateTo;
                  const now = new Date();
                  const toISO = (d: Date) => d.toISOString().slice(0, 10);
                  if (p.key === "7d") {
                    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return local.dateFrom === toISO(start) && local.dateTo === toISO(now);
                  }
                  return false;
                })();
                
                return (
                  <motion.button
                    key={p.key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const now = new Date();
                      const toISO = (d: Date) => d.toISOString().slice(0, 10);
                      if (p.key === "all") {
                        update("dateFrom", undefined as any);
                        update("dateTo", undefined as any);
                      } else if (p.key === "7d") {
                        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        update("dateFrom", toISO(start) as any);
                        update("dateTo", toISO(now) as any);
                      } else if (p.key === "30d") {
                        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        update("dateFrom", toISO(start) as any);
                        update("dateTo", toISO(now) as any);
                      } else if (p.key === "quarter") {
                        const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                        update("dateFrom", toISO(qStart) as any);
                        update("dateTo", toISO(now) as any);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium",
                      isActive 
                        ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                        : "bg-background hover:bg-muted/50 border-border"
                    )}
                  >
                    <span>{p.icon}</span>
                    {p.label}
                    {isActive && <CheckIcon className="w-3 h-3 ml-1" />}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Main Filters Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Speakers */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium">Speakers</label>
              </div>
              <EmailTagInput
                value={local.speakers || []}
                onChange={(vals) => update("speakers", vals)}
                placeholder="Type a name or email and press Enter"
                className=""
              />
              <p className="text-xs text-muted-foreground">
                Filter meetings by participants. Add names or email addresses.
              </p>
            </div>

            {/* Platform */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DeviceTabletIcon className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium">Platform</label>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "zoom", label: "Zoom", icon: "🎥", color: "bg-blue-500" },
                  { key: "google_meet", label: "Meet", icon: "📹", color: "bg-green-500" },
                  { key: "microsoft_teams", label: "Teams", icon: "👥", color: "bg-purple-500" },
                  { key: "offline", label: "Offline", icon: "📼", color: "bg-gray-500" },
                ].map((p) => {
                  const selected = (local.platform || []).includes(p.key);
                  return (
                    <motion.button
                      key={p.key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const set = new Set(local.platform || []);
                        selected ? set.delete(p.key) : set.add(p.key);
                        update("platform", Array.from(set));
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium",
                        selected 
                          ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                          : "bg-background hover:bg-muted/50 border-border"
                      )}
                    >
                      <span>{p.icon}</span>
                      {p.label}
                      {selected && <CheckIcon className="w-3 h-3 ml-1" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
                <label className="text-sm font-medium">Status</label>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "active", label: "Live", icon: "🔴", color: "bg-red-500" },
                  { key: "completed", label: "Completed", icon: "✅", color: "bg-green-500" },
                  { key: "draft", label: "Draft", icon: "📝", color: "bg-yellow-500" },
                  { key: "archived", label: "Archived", icon: "📦", color: "bg-gray-500" },
                ].map((s) => {
                  const selected = (local.status || []).includes(s.key);
                  return (
                    <motion.button
                      key={s.key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const set = new Set(local.status || []);
                        selected ? set.delete(s.key) : set.add(s.key);
                        update("status", Array.from(set));
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium",
                        selected 
                          ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                          : "bg-background hover:bg-muted/50 border-border"
                      )}
                    >
                      <span>{s.icon}</span>
                      {s.label}
                      {selected && <CheckIcon className="w-3 h-3 ml-1" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium">Duration</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input 
                    type="number" 
                    min={0} 
                    placeholder="Min (minutes)" 
                    value={local.durationMin ?? ""} 
                    onChange={(e) => update("durationMin", e.target.value === "" ? undefined : Number(e.target.value))} 
                    className="text-sm"
                  />
                </div>
                <div>
                  <Input 
                    type="number" 
                    min={0} 
                    placeholder="Max (minutes)" 
                    value={local.durationMax ?? ""} 
                    onChange={(e) => update("durationMax", e.target.value === "" ? undefined : Number(e.target.value))} 
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Custom Date Range */}
          <AnimatePresence>
            {(local.dateFrom || local.dateTo) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-muted/30 rounded-xl p-4 border border-border/50"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Custom Date Range</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">From</label>
                    <Input 
                      type="date" 
                      value={local.dateFrom || ""} 
                      onChange={(e) => update("dateFrom", e.target.value)} 
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">To</label>
                    <Input 
                      type="date" 
                      value={local.dateTo || ""} 
                      onChange={(e) => update("dateTo", e.target.value)} 
                      className="text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content Filters */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <CheckIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Content Requirements</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Only show meetings that include:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: "hasTranscript", label: "Transcript", icon: "📝", desc: "Has recording transcript" },
                { key: "hasAiNotes", label: "AI Summary", icon: "🤖", desc: "AI-generated notes" },
                { key: "hasActionItems", label: "Action Items", icon: "✅", desc: "Tracked action items" },
              ].map((f) => {
                const selected = !!(local as any)[f.key];
                return (
                  <motion.button
                    key={f.key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => update(f.key as any, !selected as any)}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 rounded-lg border transition-all text-left",
                      selected 
                        ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                        : "bg-background hover:bg-muted/50 border-border"
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>{f.icon}</span>
                      {f.label}
                      {selected && <CheckIcon className="w-3 h-3 ml-auto" />}
                    </div>
                    <p className={cn(
                      "text-xs",
                      selected ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {f.desc}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 mt-4 flex items-center justify-between bg-background">
          <div className="flex items-center gap-4">
            <button 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              onClick={reset}
            >
              <span>↺</span>
              Reset all filters
            </button>
            {activeCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {activeCount} active
              </Badge>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="min-w-[80px]">
              Cancel
            </Button>
            <Button onClick={apply} className="min-w-[120px] bg-primary hover:bg-primary/90">
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedFiltersDrawer;


