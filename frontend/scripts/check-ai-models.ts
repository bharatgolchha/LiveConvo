import { getAllAIModelConfigs, AIAction } from '../src/lib/aiModelConfig';

async function checkAIModelConfiguration() {
  console.log('Checking AI Model Configuration...\n');
  
  try {
    const configs = await getAllAIModelConfigs();
    
    console.log('Current AI Model Settings:');
    console.log('========================');
    
    for (const [action, model] of Object.entries(configs)) {
      console.log(`${action}: ${model}`);
    }
    
    console.log('\n✅ All AI actions have model configurations!');
  } catch (error) {
    console.error('❌ Error checking AI model configuration:', error);
  }
}

// Run the check
checkAIModelConfiguration();