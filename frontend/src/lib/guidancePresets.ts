export interface GuidanceChip {
  text: string;
  prompt: string;
}

export type ConversationType = 'sales' | 'support' | 'meeting' | 'interview';
export type GuidancePhase = 'preparation' | 'live' | 'analysis';

interface PresetMap {
  [conversationType: string]: {
    [phase in GuidancePhase]: GuidanceChip[];
  };
}

const presets: PresetMap = {
  sales: {
    preparation: [
      { text: '🎯 Set objective', prompt: 'Help me set clear objectives for this sales call' },
      { text: '🔍 Research prospect', prompt: 'What should I research about this prospect before the call?' },
      { text: '💡 Prepare questions', prompt: 'What discovery questions should I prepare?' },
      { text: '📝 Plan agenda', prompt: 'Help me create an agenda for this sales conversation' },
      { text: '💰 Value proposition', prompt: 'How should I structure my value proposition?' },
      { text: '🛡️ Anticipate objections', prompt: 'Which objections should I prepare for and how to handle them?' }
    ],
    live: [
      { text: '💡 Discovery Qs', prompt: 'What discovery question should I ask next?' },
      { text: '🎯 Closing', prompt: 'Which closing technique fits this moment?' },
      { text: '🛡️ Objection', prompt: 'Help me handle the objection that was just raised' }
    ],
    analysis: [
      { text: '🎯 Objective met?', prompt: 'Was the key objective achieved?' },
      { text: '💡 Insights', prompt: 'What insights came from discovery questions?' },
      { text: '🤝 Next steps', prompt: 'What next steps were agreed?' }
    ]
  },
  support: {
    preparation: [
      { text: '📋 Review case', prompt: 'What should I review before this support call?' },
      { text: '🔧 Prepare fix', prompt: 'Which fixes should I have ready for this issue type?' },
      { text: '📝 Plan approach', prompt: 'Help me plan my approach for this support conversation' }
    ],
    live: [
      { text: '🔍 Troubleshoot', prompt: 'What troubleshooting step should I try next?' },
      { text: '😊 Satisfaction', prompt: 'How can I ensure the customer is satisfied?' },
      { text: '🔄 Follow-up', prompt: 'What follow-up actions should I take?' }
    ],
    analysis: [
      { text: '🎯 Issue resolved?', prompt: 'Was the customer issue resolved effectively?' },
      { text: '💡 Root cause', prompt: 'What was the root cause?' },
      { text: '🤝 Follow-up', prompt: 'What follow-up actions are required?' }
    ]
  },
  meeting: {
    preparation: [
      { text: '📋 Agenda', prompt: 'Help me create an effective agenda' },
      { text: '🎯 Objectives', prompt: 'What should be the main objectives?' },
      { text: '💡 Topics', prompt: 'Which topics should we cover?' }
    ],
    live: [
      { text: '⏰ Time check', prompt: 'How should I manage the remaining time?' },
      { text: '🤝 Actions', prompt: 'Which action items need capturing?' },
      { text: '🎯 Decisions', prompt: 'What key decisions should we confirm now?' }
    ],
    analysis: [
      { text: '🎯 Objectives met?', prompt: 'Were the meeting objectives achieved?' },
      { text: '💡 Key decisions', prompt: 'List key decisions made.' },
      { text: '🤝 Actions', prompt: 'Compile action items and owners.' }
    ]
  },
  interview: {
    preparation: [
      { text: '📝 Review CV', prompt: 'What should I review about the candidate?' },
      { text: '❓ Prepare Qs', prompt: 'Which interview questions should I prepare?' },
      { text: '📊 Set criteria', prompt: 'Define evaluation criteria for this role.' }
    ],
    live: [
      { text: '🎯 Assess answer', prompt: 'How should I assess their last response?' },
      { text: '📚 Follow-up', prompt: 'What follow-up question should I ask?' },
      { text: '💡 Culture fit', prompt: 'How do I evaluate culture fit right now?' }
    ],
    analysis: [
      { text: '🎯 Performance', prompt: 'How did the candidate perform against criteria?' },
      { text: '💡 Insights', prompt: 'Key insights about the candidate?' },
      { text: '🛑 Red flags', prompt: 'What red flags emerged?' }
    ]
  }
};

export const getPresetChips = (
  conversationType: ConversationType = 'sales',
  phase: GuidancePhase = 'preparation'
): GuidanceChip[] => {
  return presets[conversationType]?.[phase] ?? presets.sales.preparation;
}; 