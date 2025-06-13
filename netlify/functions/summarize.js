import Anthropic from '@anthropic-ai/sdk';

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

    const prompt = `Please create a concise summary of ${characterName}'s key memories and experiences. Focus on the most emotionally significant events and relationships.

Memories to summarize:
${memories.map(m => `- ${m.content} (impact: ${m.emotional_weight || 0}/100)`).join('\n')}

Provide a 2-3 sentence summary that captures the essence of their experiences.`;

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    });

    const summary = response.content[0].text.trim();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, usage: response.usage }),
    };

  } catch (error) {
    console.error('Error in summarize function:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
}; 