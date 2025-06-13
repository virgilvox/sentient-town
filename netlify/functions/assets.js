import { buildSpritePrompt } from '../../prompts/sprite_prompt.js';
import { buildMapAnalysisPrompt } from '../../prompts/map_analysis_prompt.js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import fetch from 'node-fetch';
import { extractJsonFromResponse } from './utils.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { type, payload, openaiApiKey: userOpenAIKey, anthropicApiKey: userAnthropicKey } = JSON.parse(event.body);
    
    if (type === 'sprite') {
      const openAIKey = userOpenAIKey || process.env.VITE_OPENAI_API_KEY;
      if (!openAIKey) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: Missing OpenAI API Key' }) };
      }
      const openai = new OpenAI({ apiKey: openAIKey });

      const { character, targetSize } = payload;
      const imageUrl = await generateSprite(character, openai);
      const base64Data = await convertImageToBase64(imageUrl, true, targetSize);
      return {
        statusCode: 200,
        body: JSON.stringify({ base64Data }),
      };
    }

    if (type === 'map') {
      const openAIKey = userOpenAIKey || process.env.VITE_OPENAI_API_KEY;
      const anthropicKey = userAnthropicKey || process.env.VITE_ANTHROPIC_API_KEY;
      if (!openAIKey) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: Missing OpenAI API Key' }) };
      }
      if (!anthropicKey) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: Missing Anthropic API Key' }) };
      }
      const openai = new OpenAI({ apiKey: openAIKey });
      const anthropic = new Anthropic({ apiKey: anthropicKey });

      const { prompt, targetDisplaySize } = payload;
      const imageUrl = await generateMapImage(prompt, openai);
      const base64Data = await convertImageToBase64(imageUrl, true, targetDisplaySize);
      const zones = await analyzeMap(base64Data, prompt, anthropic);
      return {
        statusCode: 200,
        body: JSON.stringify({ mapImageUrl: base64Data, zones }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid asset type' }),
    };

  } catch (error) {
    console.error('Error in assets function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

async function generateSprite(character, openai) {
  const prompt = buildSpritePrompt(character);
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    response_format: "url",
  });
  return response.data[0].url;
}

async function generateMapImage(prompt, openai) {
    const fullPrompt = `Top-down pixel art town map for life simulation game. ${prompt}. 16-bit pixel art style, vibrant colors, complete overhead view of entire town with buildings, paths, and zones.`;
    const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: fullPrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
    });
    return response.data[0].url;
}

async function analyzeMap(base64ImageData, originalPrompt, anthropic) {
  const prompt = buildMapAnalysisPrompt(originalPrompt);
  const msg = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { 
          type: 'image', 
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: base64ImageData,
          },
        },
      ],
    }],
  });
  const responseText = msg.content[0].text.trim();
  const zones = extractJsonFromResponse(responseText);
  return zones;
}

async function convertImageToBase64(imageUrl, shouldResize = false, targetSize = 128) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.buffer();

    let image = sharp(buffer);

    if (shouldResize) {
        image = image.resize(targetSize, targetSize);
    }

    // Convert to webp for better compression, which supports transparency
    const finalBuffer = await image.webp({ quality: 80 }).toBuffer();
    
    return finalBuffer.toString('base64');
}