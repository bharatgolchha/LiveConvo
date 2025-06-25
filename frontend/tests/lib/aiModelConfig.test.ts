import { getAIModelForAction, AIAction } from '@/lib/aiModelConfig';
import { getSystemSetting } from '@/lib/systemSettingsServer';

jest.mock('@/lib/systemSettingsServer', () => ({
  getSystemSetting: jest.fn()
}));

describe('aiModelConfig', () => {
  const mockGetSystemSetting = getSystemSetting as jest.MockedFunction<typeof getSystemSetting>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_OPENROUTER_MODEL = 'env-model';
  });

  describe('getAIModelForAction', () => {
    it('should return action-specific model when configured', async () => {
      mockGetSystemSetting.mockResolvedValueOnce('google/gemini-pro');
      
      const model = await getAIModelForAction(AIAction.SUMMARY);
      
      expect(mockGetSystemSetting).toHaveBeenCalledWith('ai_model_summary');
      expect(model).toBe('google/gemini-pro');
    });

    it('should fall back to default model when action-specific model is not configured', async () => {
      mockGetSystemSetting
        .mockResolvedValueOnce(null) // No action-specific model
        .mockResolvedValueOnce('google/gemini-2.5-flash'); // Default model
      
      const model = await getAIModelForAction(AIAction.GUIDANCE);
      
      expect(mockGetSystemSetting).toHaveBeenCalledWith('ai_model_guidance');
      expect(mockGetSystemSetting).toHaveBeenCalledWith('default_ai_model');
      expect(model).toBe('google/gemini-2.5-flash');
    });

    it('should fall back to env var when no settings are configured', async () => {
      mockGetSystemSetting.mockResolvedValue(null);
      
      const model = await getAIModelForAction(AIAction.CHECKLIST);
      
      expect(model).toBe('env-model');
    });

    it('should fall back to hardcoded default when nothing is configured', async () => {
      delete process.env.NEXT_PUBLIC_OPENROUTER_MODEL;
      mockGetSystemSetting.mockResolvedValue(null);
      
      const model = await getAIModelForAction(AIAction.SMART_NOTES);
      
      expect(model).toBe('google/gemini-2.5-flash');
    });
  });
});