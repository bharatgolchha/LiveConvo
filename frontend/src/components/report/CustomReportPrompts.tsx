import React from 'react';
import { Wand2 } from 'lucide-react';

interface CustomReportPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  className?: string;
}

interface PromptSuggestion {
  category: string;
  prompts: string[];
}

const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    category: 'Analysis & Insights',
    prompts: [
      'Analyze the key themes and patterns discussed in this meeting',
      'What were the most important insights and breakthroughs from this conversation?',
      'Identify areas of agreement and disagreement between participants',
      'Extract all data points, metrics, and KPIs mentioned in the meeting'
    ]
  },
  {
    category: 'Action & Follow-up',
    prompts: [
      'Create a detailed action plan with clear next steps and deadlines',
      'What follow-up emails need to be sent and to whom?',
      'Generate a checklist of all commitments made during the meeting',
      'What resources or approvals are needed to move forward?'
    ]
  },
  {
    category: 'Communication',
    prompts: [
      'Draft a follow-up email to all participants summarizing key outcomes',
      'Create talking points for presenting this meeting\'s outcomes to stakeholders',
      'Write a brief update for team members who couldn\'t attend',
      'Prepare a script for the next conversation based on today\'s discussion'
    ]
  },
  {
    category: 'Strategic Planning',
    prompts: [
      'What strategic decisions were made and what are their implications?',
      'Identify risks and opportunities discussed in the meeting',
      'Create a roadmap based on the priorities discussed',
      'What competitive advantages or challenges were identified?'
    ]
  },
  {
    category: 'Learning & Development',
    prompts: [
      'What lessons learned should be documented from this meeting?',
      'Identify areas where the team needs additional training or support',
      'What best practices emerged from the discussion?',
      'Create a knowledge base entry from this meeting\'s insights'
    ]
  }
];

export function CustomReportPrompts({ onSelectPrompt, className = '' }: CustomReportPromptsProps) {
  return (
    <div className={`bg-muted/30 border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Wand2 className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-medium text-foreground">Suggested Prompts</h4>
      </div>
      
      <div className="space-y-3">
        {PROMPT_SUGGESTIONS.map((category, idx) => (
          <div key={idx}>
            <p className="text-xs font-medium text-muted-foreground mb-2">{category.category}</p>
            <div className="flex flex-wrap gap-2">
              {category.prompts.map((prompt, promptIdx) => (
                <button
                  key={promptIdx}
                  onClick={() => onSelectPrompt(prompt)}
                  className="text-xs px-3 py-1.5 bg-background hover:bg-primary/10 rounded-md border border-border hover:border-primary/20 transition-colors text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-3">
        Click any prompt to use it, or combine multiple prompts for a comprehensive report.
      </p>
    </div>
  );
}