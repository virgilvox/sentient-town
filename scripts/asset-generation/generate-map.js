#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

async function generateMap() {
  // Check for OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is required')
    process.exit(1)
  }

  console.log('🎨 Generating Stardew Valley-style town map...')

  const prompt = `Top-down pixel art town map (Stardew Valley style).

ZONES: Flower shop (NW), bakery (SW), woodworking workshop (NE), town hall (center), orchard (SE).

PATHS: Horizontal main street connecting zones, cobblestone paths, dirt roads.

DETAILS: Colorful flower displays, outdoor seating, lumber piles, clock tower, fruit tree rows, benches, lamp posts, flower beds.

STYLE: 16-bit pixel art, vibrant harmonious colors, crisp orthographic top-down view.`

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid'
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const imageUrl = data.data[0].url

    console.log('📷 Generated image URL:', imageUrl)
    console.log('⬇️ Downloading image...')

    // Download the image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const mapPath = path.join(__dirname, 'public', 'map', 'map.png')

    // Ensure the directory exists
    const mapDir = path.dirname(mapPath)
    if (!fs.existsSync(mapDir)) {
      fs.mkdirSync(mapDir, { recursive: true })
    }

    // Save the image
    fs.writeFileSync(mapPath, Buffer.from(imageBuffer))

    console.log('✅ Map saved to:', mapPath)
    console.log('🎉 New town map generated successfully!')

    // Update map info
    const infoPath = path.join(__dirname, 'public', 'map', 'map-info.txt')
    const info = `MAP GENERATED: ${new Date().toISOString()}
Generated using DALL-E 3 with Stardew Valley-style prompt
Resolution: 1024x1024 (will be scaled to 800x600 in game)
Style: Pixel art, top-down view
Features: Flower shop (NW), Bakery (SW), Workshop (NE), Town Hall (center), Orchard (SE)
`
    fs.writeFileSync(infoPath, info)

  } catch (error) {
    console.error('❌ Error generating map:', error.message)
    process.exit(1)
  }
}

// Run the script
generateMap() 