import { SYSTEM_PROMPT } from '../../prompts/simulation_system_prompt.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJsonFromResponse, buildStaticCharacterContext, buildDynamicContext } from './utils.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { character, context, apiKey: userApiKey, model: requestedModel, useComplexModel } = JSON.parse(event.body);

    if (!character) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Bad Request: Character object is missing.' }),
      };
    }

    const apiKey = userApiKey || process.env.VITE_CLAUDE_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized: Anthropic API Key is missing.' }),
      };
    }
    
    const anthropic = new Anthropic({ apiKey });

    const modelMap = {
      'haiku': 'claude-3-haiku-20240307',
      'sonnet': 'claude-3-5-sonnet-20240620'
    };
    
    const isComplexSituation = 
      (context.nearbyCharacters && context.nearbyCharacters.length > 1) ||
      context.ongoingConversation ||
      context.injectedScenario;
      
    let modelToUse;
    if (useComplexModel) {
      modelToUse = modelMap.sonnet;
    } else if (requestedModel === 'adaptive') {
      modelToUse = isComplexSituation ? modelMap.sonnet : modelMap.haiku;
    } else {
      modelToUse = modelMap[requestedModel] || modelMap.haiku;
    }

    const staticContext = buildStaticCharacterContext(character);
    const dynamicContext = buildDynamicContext(context, character);
    const fullPrompt = `${staticContext}\n${dynamicContext}`;

    const params = {
      model: modelToUse,
      max_tokens: 4096,
      messages: [{ role: 'user', content: fullPrompt }]
    };

    // Enable caching for Sonnet and Haiku models if the flag is set
    if (context.enablePromptCaching && (modelToUse === modelMap.haiku || modelToUse === modelMap.sonnet)) {
      params.system = [{
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      }];
    } else {
      params.system = SYSTEM_PROMPT;
    }

    const msg = await anthropic.messages.create(params);

    const responseText = msg.content[0].text.trim();
    const action = extractJsonFromResponse(responseText);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, usage: msg.usage }),
    };

  } catch (error) {
    console.error('Error in simulation function:', error);
    if (error.status === 429) {
      return {
        statusCode: 503, // Service Unavailable
        body: JSON.stringify({ error: 'Service Overloaded. Please try again later.' }),
      };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

