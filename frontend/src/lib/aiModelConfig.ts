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
  INITIAL_PROMPTS = 'initial_prompts',
  CUSTOM_REPORT = 'custom_report',
  DASHBOARD_CHAT = 'dashboard_chat'
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
  },
  {
    key: AIAction.CUSTOM_REPORT,
    displayName: 'Custom Report Generation',
    description: 'AI-powered custom report generation from meeting data',
    recommendedModels: ['google/gemini-2.5-flash', 'google/gemini-pro', 'openai/gpt-4o']
  },
  {
    key: AIAction.DASHBOARD_CHAT,
    displayName: 'Dashboard AI Chat',
    description: 'Dashboard assistant for searching meetings and managing tasks',
    recommendedModels: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini']
  }
];

/**
 * Get the AI model configured for a specific action
 * Falls back to default model if action-specific model is not configured
 */
export async function getAIModelForAction(action: AIAction): Promise<string> {
  try {
    // First, try to get the action-specific model
    const actionKey = `ai_model_${action}`;
    const actionModel = await getSystemSetting<string>(actionKey);
    
    if (actionModel && actionModel.trim()) {
      console.log(`Using configured model for ${action}:`, actionModel);
      return actionModel;
    }
    
    // If no action-specific model, get the default model
    const defaultModel = await getSystemSetting<string>('default_ai_model');
    
    if (defaultModel && defaultModel.trim()) {
      console.log(`Using default model for ${action}:`, defaultModel);
      return defaultModel;
    }
    
    // Fall back to environment variable or hard-coded default only if no admin config exists
    const fallbackModel = process.env.NEXT_PUBLIC_OPENROUTER_MODEL || 'google/gemini-2.5-flash';
    console.log(`No admin config found for ${action}, using fallback:`, fallbackModel);
    return fallbackModel;
  } catch (error) {
    console.error('Error getting AI model for action:', action, error);
    // Return safe fallback
    return 'google/gemini-2.5-flash';
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