// Remove the circular import
// import { useUIStore } from '@/stores/ui'
import { SYSTEM_PROMPT } from '../../prompts/simulation_system_prompt.js'

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

let apiKey = null;

// Get the effective API key with fallback logic
function getEffectiveApiKey() {
  // This dynamic import is a bit of a workaround for now to break circular deps
  const { useUIStore } = window.stores;
  const ui = useUIStore ? useUIStore() : null;

  // 1. Check explicitly set API key first (from UI store)
  if (ui && ui.claudeApiKey && ui.claudeApiKey.trim()) {
    return ui.claudeApiKey.trim()
  }
  
  // 2. Check environment variables (browser or Node)
  let envKey = undefined
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CLAUDE_API_KEY) {
      envKey = import.meta.env.VITE_CLAUDE_API_KEY
    } else if (typeof process !== 'undefined' && process.env && process.env.VITE_CLAUDE_API_KEY) {
      envKey = process.env.VITE_CLAUDE_API_KEY
    }
  } catch (e) {
    // Ignore
  }
  
  if (envKey && envKey.trim()) {
    return envKey.trim()
  }
  
  // 3. Fallback to module-level key if set by older methods
  if (apiKey && apiKey.trim()) {
    return apiKey.trim();
  }

  // 4. No API key found
  console.warn('⚠️ No Claude API key found in environment variables or explicitly set')
  console.warn('⚠️ Set VITE_CLAUDE_API_KEY in .env file or call setApiKey() method')
  return null
}

export function setApiKey(key) {
  // This now primarily serves as a fallback or for non-UI usage.
  // The main path is through the UI store.
  apiKey = key
}

export { getEffectiveApiKey }

export async function callClaude(prompt, model = 'haiku', enableCaching = false) {
  const effectiveApiKey = getEffectiveApiKey()
  
  if (!effectiveApiKey) {
    throw new Error('Claude API key not configured. Please set your API key in Settings or environment variables.')
  }

  // Model selection
  const modelMap = {
    'haiku': 'claude-3-haiku-20240307',
    'sonnet': 'claude-3-5-sonnet-20241022'
  }
  const selectedModel = modelMap[model] || modelMap['haiku']
  
  const body = {
    model: selectedModel,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  }

  // Add system prompt with caching if enabled and model supports it
  if (enableCaching && model === 'haiku') {
    body.system = [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" }
      }
    ]
  } else {
    body.system = SYSTEM_PROMPT
  }

  const startTime = Date.now()
  
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': effectiveApiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Claude API error:', response.status, errorData)
    throw new Error(`Claude API error: ${response.status} ${errorData.error?.message || response.statusText}`)
  }

  const result = await response.json()
  const endTime = Date.now()
  
  // Log usage stats
  if (result.usage) {
    const { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens } = result.usage
    const duration = endTime - startTime
    
  }

  return result
}

// The new endpoint for our Netlify function
const SIMULATION_API_ENDPOINT = '/.netlify/functions/simulation';

export class ClaudeApiService {
  constructor() {
    // No longer need to manage API keys here
  }

  async getCharacterAction(character, context, useComplexModel = false) {
    try {
      const { useUIStore } = window.stores;
      const ui = useUIStore ? useUIStore() : null;
      const userApiKey = ui ? ui.claudeApiKey : null;
      const model = ui ? ui.memorySettings.model : 'adaptive';
      const enablePromptCaching = ui ? ui.memorySettings.enablePromptCaching : true;

      const plainCharacter = JSON.parse(JSON.stringify(character));
      const fullContext = { ...context, character: plainCharacter, enablePromptCaching };

      const response = await fetch(SIMULATION_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ character: plainCharacter, context: fullContext, apiKey: userApiKey, model, useComplexModel }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ClaudeAPI] Serverless function error response for ${character?.name}:`, {
          status: response.status,
          text: errorText
        });
        const error = new Error(`Serverless function error: ${response.status} - ${errorText || 'Unknown error'}`);
        error.status = response.status;
        throw error;
      }

      const responseText = await response.text();
      try {
        const jsonData = JSON.parse(responseText);
        console.log(`[ClaudeAPI] Parsed JSON response for ${character?.name}:`, JSON.stringify(jsonData, null, 2));
        return jsonData;
      } catch (e) {
        console.error(`[ClaudeAPI] Failed to parse JSON from serverless function for ${character?.name}. Raw response text:`, responseText);
        throw new Error('Failed to parse JSON from serverless function.');
      }
    } catch (error) {
      console.error(`Error calling simulation function for ${character?.name}:`, error);
      throw error;
    }
  }

  // The following methods can be removed or refactored as they are now handled by the backend.
  // For now, we will leave them commented out to avoid breaking dependencies until the full refactor is complete.
  /*
  setApiKey(key) { ... }
  getApiKey() { ... }
  estimateTokens(text) { ... }
  makeApiCall(body, useComplexModel = false) { ... }
  extractJsonFromResponse(responseText) { ... }
  buildStaticCharacterContext(character) { ... }
  buildDynamicContext(context) { ... }
  summarizeMemories(memories, characterName, useComplexModel = true) { ... }
  consolidateMemories(memories, characterName, useComplexModel = true) { ... }
  resetTokenUsage() { ... }
  analyzeMapForZones(imageData, originalPrompt, useComplexModel = true) { ... }
  performComplexAnalysis(prompt, useComplexModel = true) { ... }
  testConnection() { ... }
  */
}

export default new ClaudeApiService();