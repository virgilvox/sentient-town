import Anthropic from '@anthropic-ai/sdk';
import { extractJsonFromResponse } from './utils.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { memories, characterName, apiKey: userApiKey } = JSON.parse(event.body);
    const apiKey = userApiKey || process.env.VITE_CLAUDE_API_KEY;

    if (!apiKey) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: Missing API Key' }) };
    }

    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are a memory consolidation module for an AI character named ${characterName}. Your task is to process a list of recent, raw memories and distill them into a single, cohesive, and meaningful long-term memory. This new memory should capture the essence of the experiences, identifying key themes, emotional shifts, and significant events.

Recent memories to process:
${memories.map(m => `- [Impact: ${m.emotional_weight || 0}] ${m.content}`).join('\n')}

Based on these events, generate a single, insightful long-term memory summary. Identify the primary emotional tone and up to three relevant tags for the consolidated memory.

Respond in the following JSON format:
{
  "consolidated_memory": "A 2-3 sentence narrative summary of the key events and feelings from this period.",
  "primary_emotion": "The dominant emotion for this consolidated memory (e.g., 'reflective', 'joyful', 'anxious').",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const result = extractJsonFromResponse(response.content[0].text.trim());

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...result, usage: response.usage }),
    };

  } catch (error) {
    console.error('Error in consolidate function:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
}; 