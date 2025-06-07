import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface GuidanceChipsProps {
  sessionId: string;
  conversationType: string;
}

interface Chip {
  id: string;
  label: string;
  action: string;
}

const defaultChips: Record<string, Chip[]> = {
  sales: [
    { id: '1', label: 'Ask about budget', action: 'budget_inquiry' },
    { id: '2', label: 'Handle objection', action: 'objection_handling' },
    { id: '3', label: 'Next steps', action: 'next_steps' },
  ],
  meeting: [
    { id: '1', label: 'Summarize key points', action: 'summarize' },
    { id: '2', label: 'Action items', action: 'action_items' },
    { id: '3', label: 'Follow-up questions', action: 'follow_up' },
  ],
  support: [
    { id: '1', label: 'Clarify issue', action: 'clarify' },
    { id: '2', label: 'Solution steps', action: 'solution' },
    { id: '3', label: 'Check satisfaction', action: 'satisfaction' },
  ],
  interview: [
    { id: '1', label: 'Behavioral question', action: 'behavioral' },
    { id: '2', label: 'Technical assessment', action: 'technical' },
    { id: '3', label: 'Culture fit', action: 'culture' },
  ],
};

export function GuidanceChips({ sessionId, conversationType }: GuidanceChipsProps) {
  const [chips, setChips] = useState<Chip[]>([]);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  useEffect(() => {
    // Set default chips based on conversation type
    const typeChips = defaultChips[conversationType] || defaultChips.meeting;
    setChips(typeChips);
  }, [conversationType]);

  const handleChipClick = async (chip: Chip) => {
    setSelectedChip(chip.id);
    
    try {
      const response = await fetch('https://liveprompt.ai/api/guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: chip.action,
          conversationType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // The parent component will handle displaying the guidance
        console.log('Guidance generated:', data);
      }
    } catch (error) {
      console.error('Failed to generate guidance:', error);
    } finally {
      setSelectedChip(null);
    }
  };

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3 w-3 text-primary-500" />
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Quick Actions
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => handleChipClick(chip)}
            disabled={selectedChip === chip.id}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
              selectedChip === chip.id
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
            }`}
          >
            {selectedChip === chip.id ? (
              <span className="flex items-center gap-1">
                <span className="animate-spin rounded-full h-2 w-2 border-b-2 border-white"></span>
                Generating...
              </span>
            ) : (
              chip.label
            )}
          </button>
        ))}
      </div>
    </div>
  );
}