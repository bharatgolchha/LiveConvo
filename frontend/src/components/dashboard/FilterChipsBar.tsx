"use client";

import React from "react";

export interface ActiveFilterChip {
  key: string;
  label: string;
}

export interface FilterChipsBarProps {
  chips: ActiveFilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

export const FilterChipsBar: React.FC<FilterChipsBarProps> = ({ chips, onRemove, onClearAll, className = "" }) => {
  if (!chips || chips.length === 0) return null;
  return (
    <div className={`px-4 sm:px-6 py-3 border-b border-border bg-background ${className}`}>
      <div className="flex flex-wrap gap-2 items-center">
        {chips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => onRemove(chip.key)}
            className="text-xs rounded-full px-2.5 py-1 bg-muted text-foreground hover:bg-muted/80 border border-border inline-flex items-center gap-1"
            aria-label={`Remove filter ${chip.label}`}
          >
            <span>{chip.label}</span>
            <span aria-hidden>×</span>
          </button>
        ))}
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground ml-auto"
        >
          Clear all
        </button>
      </div>
    </div>
  );
};

export default FilterChipsBar;


