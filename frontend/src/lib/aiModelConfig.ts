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
  const settingKey = `ai_model_${action}`;
  const actionModel = await getSystemSetting<string>(settingKey);
  
  if (actionModel) {
    return actionModel;
  }
  
  // Fall back to default model
  const defaultModel = await getSystemSetting<string>('default_ai_model');
  return (
    defaultModel ||
    process.env.NEXT_PUBLIC_OPENROUTER_MODEL ||
    'google/gemini-2.5-flash'
  );
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