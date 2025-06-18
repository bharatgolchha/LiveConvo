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
      { text: '🎯 Set objective', prompt: 'What objectives should I set for this sales call based on what I know?' },
      { text: '🔍 Research tips', prompt: 'What specific information should I research about this prospect?' },
      { text: '💡 Key questions', prompt: 'What are the most important discovery questions for this situation?' }
    ],
    live: [
      { text: '💡 Next question', prompt: 'Based on what they just said, what should I ask next?' },
      { text: '🎯 Progress check', prompt: 'How am I doing so far and what should I focus on?' },
      { text: '🛡️ Handle response', prompt: 'How should I respond to what they just said?' }
    ],
    analysis: [
      { text: '🎯 Key outcomes', prompt: 'What were the key outcomes from this conversation?' },
      { text: '💡 Missed opportunities', prompt: 'What opportunities did I miss and how could I improve?' },
      { text: '🤝 Follow-up plan', prompt: 'What specific follow-up actions should I take?' }
    ]
  },
  support: {
    preparation: [
      { text: '📋 Context needed', prompt: 'What context should I gather about this customer issue?' },
      { text: '🔧 Solution options', prompt: 'What are the best solution approaches for this type of issue?' },
      { text: '📝 Best approach', prompt: 'What\'s the most effective way to handle this support case?' }
    ],
    live: [
      { text: '🔍 Next step', prompt: 'Based on their response, what troubleshooting step should I try next?' },
      { text: '😊 Customer mood', prompt: 'How is the customer feeling and how should I adjust my approach?' },
      { text: '🔄 Progress check', prompt: 'Are we making progress toward resolution? What should I try differently?' }
    ],
    analysis: [
      { text: '🎯 Resolution quality', prompt: 'How well was the issue resolved and what could improve?' },
      { text: '💡 Learning points', prompt: 'What can I learn from how this support case was handled?' },
      { text: '🤝 Follow-up needed', prompt: 'What follow-up actions would ensure customer satisfaction?' }
    ]
  },
  meeting: {
    preparation: [
      { text: '📋 Agenda focus', prompt: 'What should be the key focus areas for this meeting agenda?' },
      { text: '🎯 Success criteria', prompt: 'What would make this meeting successful?' },
      { text: '💡 Key topics', prompt: 'Which topics are most critical to cover given our constraints?' }
    ],
    live: [
      { text: '⏰ Time management', prompt: 'How should I adjust our pace given the remaining time and topics?' },
      { text: '🤝 Capture actions', prompt: 'What action items should I capture from the discussion so far?' },
      { text: '🎯 Drive decisions', prompt: 'Which decisions need to be made now and how do I facilitate them?' }
    ],
    analysis: [
      { text: '🎯 Meeting effectiveness', prompt: 'How effective was this meeting and what could improve?' },
      { text: '💡 Key takeaways', prompt: 'What were the most important outcomes and decisions?' },
      { text: '🤝 Action clarity', prompt: 'Are all action items clear with owners and deadlines?' }
    ]
  },
  interview: {
    preparation: [
      { text: '📝 Key areas', prompt: 'What are the most important areas to assess for this role?' },
      { text: '❓ Best questions', prompt: 'What interview questions will best reveal candidate fit?' },
      { text: '📊 Evaluation focus', prompt: 'How should I structure my evaluation approach?' }
    ],
    live: [
      { text: '🎯 Dig deeper', prompt: 'Based on their answer, what follow-up will reveal more insight?' },
      { text: '📚 Assess response', prompt: 'How does their response demonstrate the skills we need?' },
      { text: '💡 Explore fit', prompt: 'What questions would better assess cultural and role fit?' }
    ],
    analysis: [
      { text: '🎯 Overall assessment', prompt: 'How well did the candidate match our requirements?' },
      { text: '💡 Key strengths/gaps', prompt: 'What were the candidate\'s main strengths and gaps?' },
      { text: '🛑 Decision factors', prompt: 'What factors should drive the hiring decision?' }
    ]
  }
};

export const getPresetChips = (
  conversationType: ConversationType = 'sales',
  phase: GuidancePhase = 'preparation'
): GuidanceChip[] => {
  return presets[conversationType]?.[phase] ?? presets.sales.preparation;
}; 