import { getSystemSetting } from './systemSettingsServer';

export enum AIAction {
  GUIDANCE = 'guidance',
  CHAT_GUIDANCE = 'chat_guidance',
  SUMMARY = 'summary',
  REALTIME_SUMMARY = 'realtime_summary',
  TOPIC_SUMMARY = 'topic_summary',
  CHECKLIST = 'checklist',
  SMART_NOTES = 'smart_notes',
  SMART_SUGGESTIONS = 'smart_suggestions',
  INITIAL_PROMPTS = 'initial_prompts'
}

export interface AIActionInfo {
  key: AIAction;
  displayName: string;
  description: string;
  recommendedModels: string[];
}

export const AI_ACTIONS: AIActionInfo[] = [
  {
    key: AIAction.GUIDANCE,
    displayName: 'Real-time Guidance',
    description: 'Live conversation coaching and suggestions',
    recommendedModels: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini']
  },
  {
    key: AIAction.CHAT_GUIDANCE,
    displayName: 'Chat Guidance',
    description: 'Interactive AI chat assistance during conversations',
    recommendedModels: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini']
  },
  {
    key: AIAction.SUMMARY,
    displayName: 'Summary Generation',
    description: 'Post-conversation summaries and insights',
    recommendedModels: ['google/gemini-2.5-flash', 'google/gemini-pro']
  },
  {
    key: AIAction.REALTIME_SUMMARY,
    displayName: 'Realtime Summary',
    description: 'Live summary updates during conversations',
    recommendedModels: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini']
  },
  {
    key: AIAction.TOPIC_SUMMARY,
    displayName: 'Topic Summary',
    description: 'Focused summaries on specific topics',
    recommendedModels: ['google/gemini-2.5-flash', 'google/gemini-pro']
  },
  {
    key: AIAction.CHECKLIST,
    displayName: 'Checklist Generation',
    description: 'Automated task list creation from conversations',
    recommendedModels: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini']
  },
  {
    key: AIAction.SMART_NOTES,
    displayName: 'Smart Notes',
    description: 'Intelligent note suggestions and organization',
    recommendedModels: ['google/gemini-2.5-flash', 'google/gemini-pro']
  },
  {
    key: AIAction.SMART_SUGGESTIONS,
    displayName: 'Smart Suggestions',
    description: 'Context-aware meeting and action suggestions',
    recommendedModels: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini']
  },
  {
    key: AIAction.INITIAL_PROMPTS,
    displayName: 'Initial Prompts',
    description: 'Conversation starter suggestions',
    recommendedModels: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini']
  }
];

/**
 * Get the AI model configured for a specific action
 * Falls back to default model if action-specific model is not configured
 */
export async function getAIModelForAction(action: AIAction): Promise<string> {
  try {
    // Get the ai_model_config JSON object from system_settings
    const aiConfig = await getSystemSetting<{
      default_model?: string;
      models?: Record<string, string>;
    }>('ai_model_config');
    
    if (aiConfig) {
      // First check if there's a specific model for this action
      if (aiConfig.models && aiConfig.models[action]) {
        return aiConfig.models[action];
      }
      
      // Fall back to default_model from the config
      if (aiConfig.default_model) {
        return aiConfig.default_model;
      }
    }
    
    // Fall back to environment variable or hard-coded default
    return (
      process.env.NEXT_PUBLIC_OPENROUTER_MODEL ||
      'openai/gpt-4o-mini'
    );
  } catch (error) {
    console.error('Error getting AI model for action:', action, error);
    // Return safe fallback
    return 'openai/gpt-4o-mini';
  }
}

/**
 * Get all AI model configurations
 */
export async function getAllAIModelConfigs(): Promise<Record<AIAction, string>> {
  const configs: Record<AIAction, string> = {} as Record<AIAction, string>;
  
  for (const action of Object.values(AIAction)) {
    configs[action] = await getAIModelForAction(action);
  }
  
  return configs;
}