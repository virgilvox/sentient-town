// A simple, one-off script to generate assets using OpenAI's DALL-E API.
// Usage: node generate-assets.js [map|sprites]

import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations';
const API_KEY = process.env.VITE_OPENAI_API_KEY;

if (!API_KEY) {
  console.error('❌ OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file.');
  process.exit(1);
}

async function downloadImage(url, filepath) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filepath, buffer);
    console.log(`✅ Image successfully saved to ${filepath}`);
  } catch (error) {
    console.error(`❌ Error downloading or saving image from ${url}:`, error);
  }
}

async function generate(prompt, size = '1024x1024') {
  console.log(`🎨 Sending prompt to DALL-E...`);
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: size,
      quality: 'hd',
      style: 'vivid'
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return data.data[0].url;
}

async function generateTownMap() {
  const prompt = `Top-down pixel art town map for cozy magical JRPG.

STYLE: 16-bit (Stardew Valley/FF VI style), 3/4 view, vibrant colors.

ZONES: Flower shop, bakery, woodworking shop, town hall, ancient orchard.

DETAILS: Cobblestone paths, sparkling pond, benches, lanterns, lush greenery. Organic, explorable layout.`;

  const imageUrl = await generate(prompt, '1792x1024');
  console.log('🔗 Map Image URL:', imageUrl);
  await downloadImage(imageUrl, path.join('public', 'map', 'map.png'));
}

async function generateCharacterSprites() {
  const characters = [
    { name: 'Rose', description: 'A cheerful gardener with dirt-stained overalls and a bright smile. Always has flowers in her hair.' },
    { name: 'Sage', description: 'A whimsical and shy baker, often lost in thought. Wears flour-dusted aprons.' },
    { name: 'Griff', description: 'A stern but kind blacksmith with calloused hands and a leather apron. Usually covered in soot.' },
    { name: 'John', description: 'A reliable carpenter with a tool belt and friendly demeanor. Always ready to help.' },
    // Add more character descriptions here to generate a larger sprite library
    { name: 'Elara', description: 'A mysterious librarian who deals in forgotten lore. Wears dark, flowing robes.' },
    { name: 'Finn', description: 'A cheerful and energetic fisherman who loves tall tales. Wears waterproof gear.' },
    { name: 'Seraphina', description: 'An ethereal artist who paints with moonlight. Her clothes are splattered with glowing paint.' },
    { name: 'Kael', description: 'A stoic blacksmith with a heart of gold. Strong arms and a leather apron.' },
  ];

  for (const char of characters) {
    console.log(`\n--- Generating sprite for ${char.name} ---`);
    const prompt = `32x32 pixel art sprite: ${char.name}. ${char.description}

STYLE: 16-bit (Stardew Valley/Chrono Trigger), top-down 3/4 view, dark outlines, no anti-aliasing.

TECHNICAL: Full body, transparent background.`;
    
    const imageUrl = await generate(prompt);
    console.log(`🔗 ${char.name} Sprite URL:`, imageUrl);

    const dirPath = path.join('public', 'characters', char.name);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    await downloadImage(imageUrl, path.join(dirPath, 'sprite.png'));
  }
}

async function main() {
  const command = process.argv[2];

  if (command === 'map') {
    await generateTownMap();
  } else if (command === 'sprites') {
    await generateCharacterSprites();
  } else {
    console.log('Usage: node generate-assets.js [map|sprites]');
    console.log('Please specify whether to generate the "map" or "sprites".');
  }

  console.log('\n🎉 Asset generation complete!');
}

main().catch(console.error); 