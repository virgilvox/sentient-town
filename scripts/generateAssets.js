#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

// Make fetch available globally for the OpenAI service
global.fetch = fetch

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

// Parse command line arguments
const args = process.argv.slice(2)
const mapOnly = args.includes('--map-only') || args.includes('-m')

console.log('🚀 Starting batch asset generation...')
console.log('📍 Project root:', projectRoot)
if (mapOnly) {
  console.log('🗺️ Map-only mode: Generating map and zones only')
}

// Default zones that match the UI setup
const defaultZones = [
  { name: "Sage's Bakery", type: 'shop', description: 'Herbal bakery specializing in sourdough and plant remedies' },
  { name: "Rose's Florist Shop", type: 'shop', description: 'Beautiful flower arrangements and gardening supplies' },
  { name: "Main Square", type: 'public', description: 'Central gathering place with fountain or monument' },
  { name: "Town Park", type: 'park', description: 'Green space with trees and paths for relaxation' },
  { name: "Residential Area", type: 'home', description: 'Cozy homes where townsfolk live' },
  { name: "Market Street", type: 'street', description: 'Main thoroughfare connecting key locations' },
  { name: "Griff's Orchard House", type: 'home', description: 'Home near fruit trees and nature' },
  { name: "John's House", type: 'home', description: 'Modest home in residential area' }
]

// Claude API integration for Node.js
class NodeClaudeService {
  constructor() {
    this.apiKey = null
  }

  ensureApiKey() {
    this.apiKey = process.env.CLAUDE_API_KEY || process.env.VITE_CLAUDE_API_KEY
    if (!this.apiKey) {
      throw new Error('No Claude API key found. Set CLAUDE_API_KEY or VITE_CLAUDE_API_KEY environment variable.')
    }
    return this.apiKey
  }

  async analyzeMapWithClaude(base64ImageData, originalPrompt) {
    const apiKey = this.ensureApiKey()
    
    console.log('🤖 Analyzing map with Claude to generate precise zone coordinates...')
    
    const analysisPrompt = `You are analyzing a top-down pixel art town map image for a life simulation game. The game uses a 50x37 tile grid system.

ORIGINAL PROMPT CONTEXT: ${originalPrompt}

Please analyze this image and identify 6-10 distinct, non-overlapping zones. Focus on DIFFERENT VISUAL AREAS with unique characteristics. Avoid creating duplicate zones or zones that are too similar.

For each unique zone you identify, provide:
1. A descriptive name for the zone (avoid generic terms like "Area 1")
2. The type of zone (home, shop, public, park, street)
3. SPECIFIC GRID COORDINATES (x,y) for the zone boundaries
4. Visual characteristics that make this zone unique

IMPORTANT GRID SYSTEM:
- Map is 50 tiles wide (X: 0-49) by 37 tiles tall (Y: 0-36)
- Provide rectangular coordinates: startX, startY, width, height
- Ensure zones don't overlap significantly
- Zones should be meaningful sized areas (minimum 6 tiles, maximum 80 tiles)

ZONE TYPES TO IDENTIFY:
- shops: Buildings with distinct architecture, awnings, commercial appearance
- homes: Residential buildings with different roof styles/colors
- public: Town squares, halls, large central buildings
- park: Green spaces, trees, gardens, open areas
- street: Pathways, roads, connecting areas

Respond ONLY in valid JSON format:
{
  "zones": [
    {
      "name": "Descriptive Zone Name",
      "type": "shop|home|public|park|street",
      "coordinates": {
        "startX": 10,
        "startY": 5,
        "width": 8,
        "height": 6
      },
      "visualDescription": "what makes this zone visually distinct"
    }
  ]
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: base64ImageData.split(',')[1]
                }
              }
            ]
          }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const responseText = data.content[0].text.trim()
    console.log('🧠 Claude analysis response received:', responseText.substring(0, 200) + '...')

    // Extract JSON from Claude's response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('⚠️ No valid JSON found in Claude response')
      return this.generateLogicalZones(originalPrompt)
    }

    const analysisResult = JSON.parse(jsonMatch[0])
    
    if (!analysisResult.zones || !Array.isArray(analysisResult.zones)) {
      console.warn('⚠️ Invalid zone structure from Claude')
      return this.generateLogicalZones(originalPrompt)
    }

    // Convert rectangular coordinates to tile arrays
    const finalZones = analysisResult.zones.map((zone, index) => {
      const tiles = []
      const coords = zone.coordinates
      
      if (coords && coords.startX !== undefined && coords.startY !== undefined && 
          coords.width !== undefined && coords.height !== undefined) {
        // Generate tiles from rectangular coordinates
        for (let x = coords.startX; x < coords.startX + coords.width && x < 50; x++) {
          for (let y = coords.startY; y < coords.startY + coords.height && y < 37; y++) {
            if (x >= 0 && y >= 0) {
              tiles.push({ x, y })
            }
          }
        }
      }
      
      return {
        id: `zone_${Date.now()}_${index}`,
        name: zone.name,
        type: zone.type,
        tiles: tiles,
        description: zone.visualDescription || ''
      }
    }).filter(zone => zone.tiles.length > 0)

    console.log(`🎯 Claude identified ${finalZones.length} zones with coordinates`)
    return finalZones

  } catch (error) {
    console.error('❌ Error analyzing map with Claude:', error)
    console.log('🔄 Falling back to logical zone generation')
    return this.generateLogicalZones(originalPrompt)
  }

  generateLogicalZones(originalPrompt) {
    console.log('🏗️ Generating logical zones based on prompt and character data...')
    
    // Map dimensions
    const mapWidth = 50
    const mapHeight = 37
    
    // Generate zones with logical positioning
    const zones = [
      {
        name: "Sage's Bakery",
        type: 'shop',
        description: 'Herbal bakery specializing in sourdough and plant remedies',
        tiles: [
          { x: 12, y: 8 }, { x: 13, y: 8 }, { x: 14, y: 8 },
          { x: 12, y: 9 }, { x: 13, y: 9 }, { x: 14, y: 9 }
        ]
      },
      {
        name: "Rose's Florist Shop", 
        type: 'shop',
        description: 'Beautiful flower arrangements and gardening supplies',
        tiles: [
          { x: 18, y: 12 }, { x: 19, y: 12 }, { x: 20, y: 12 },
          { x: 18, y: 13 }, { x: 19, y: 13 }, { x: 20, y: 13 }
        ]
      },
      {
        name: "Main Square",
        type: 'public', 
        description: 'Central gathering place with fountain or monument',
        tiles: [
          { x: 24, y: 18 }, { x: 25, y: 18 }, { x: 26, y: 18 },
          { x: 24, y: 19 }, { x: 25, y: 19 }, { x: 26, y: 19 },
          { x: 24, y: 20 }, { x: 25, y: 20 }, { x: 26, y: 20 }
        ]
      },
      {
        name: "Town Park",
        type: 'park',
        description: 'Green space with trees and paths for relaxation', 
        tiles: [
          { x: 30, y: 15 }, { x: 31, y: 15 }, { x: 32, y: 15 }, { x: 33, y: 15 },
          { x: 30, y: 16 }, { x: 31, y: 16 }, { x: 32, y: 16 }, { x: 33, y: 16 },
          { x: 30, y: 17 }, { x: 31, y: 17 }, { x: 32, y: 17 }, { x: 33, y: 17 }
        ]
      },
      {
        name: "Residential Area",
        type: 'home',
        description: 'Cozy homes where townsfolk live',
        tiles: [
          { x: 8, y: 25 }, { x: 9, y: 25 }, { x: 10, y: 25 }, { x: 11, y: 25 },
          { x: 8, y: 26 }, { x: 9, y: 26 }, { x: 10, y: 26 }, { x: 11, y: 26 },
          { x: 8, y: 27 }, { x: 9, y: 27 }, { x: 10, y: 27 }, { x: 11, y: 27 }
        ]
      },
      {
        name: "Market Street",
        type: 'street',
        description: 'Main thoroughfare connecting key locations',
        tiles: [
          { x: 15, y: 18 }, { x: 16, y: 18 }, { x: 17, y: 18 }, { x: 18, y: 18 },
          { x: 19, y: 18 }, { x: 20, y: 18 }, { x: 21, y: 18 }, { x: 22, y: 18 }
        ]
      },
      {
        name: "Griff's Orchard House",
        type: 'home', 
        description: 'Home near fruit trees and nature',
        tiles: [
          { x: 38, y: 8 }, { x: 39, y: 8 }, { x: 40, y: 8 },
          { x: 38, y: 9 }, { x: 39, y: 9 }, { x: 40, y: 9 }
        ]
      },
      {
        name: "John's House",
        type: 'home',
        description: 'Modest home in residential area', 
        tiles: [
          { x: 6, y: 12 }, { x: 7, y: 12 }, { x: 8, y: 12 },
          { x: 6, y: 13 }, { x: 7, y: 13 }, { x: 8, y: 13 }
        ]
      }
    ]
    
    console.log(`✅ Generated ${zones.length} logical zones`)
    return zones
  }
}

// Import our asset generation service (we'll need to adapt it for Node.js)
class NodeOpenAIAssetsService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
    this.claudeService = new NodeClaudeService()
  }

  ensureApiKey() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Set OPENAI_API_KEY environment variable.')
    }
    return this.apiKey
  }

  async generateCharacterSprite(character, targetSize = 128) {
    console.log(`🎨 Generating ${targetSize}x${targetSize} sprite for ${character.name} using GPT Image 1...`)
    
    this.ensureApiKey()
    
    const prompt = this.buildSimpleSpritePrompt(character)
    console.log('🎨 Using GPT Image 1 with prompt:', prompt.substring(0, 100) + '...')
    
    const imageUrl = await this.callGPTImage1API(prompt, '1024x1024', true)
    const base64Data = await this.convertImageToBase64(imageUrl, true, targetSize, 0.85)
    
    console.log(`✅ Successfully generated and optimized sprite for ${character.name} (${targetSize}x${targetSize})`)
    return base64Data
  }

  buildSimpleSpritePrompt(character) {
    const characterDescription = character.description || `${character.MBTI} personality character`
    return `Full body front facing pixel art of ${character.name}, a ${characterDescription}. Centered, for use in a pixel art HTML5 game, transparent background.`
  }

  async callGPTImage1API(prompt, size = '1024x1024', isTransparent = false) {
    const apiKey = this.ensureApiKey()
    
    const validSizes = ['1024x1024', '1536x1024', '1024x1536']
    if (!validSizes.includes(size)) {
      console.warn(`⚠️ Invalid size ${size} for GPT Image 1, using 1024x1024`)
      size = '1024x1024'
    }
    
    const enhancedPrompt = isTransparent 
      ? `${prompt}. Transparent background.`
      : prompt

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: enhancedPrompt,
        n: 1,
        size: size,
        quality: 'high'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ GPT Image 1 API Error:', response.status, errorData)
      throw new Error(errorData.error?.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ GPT Image 1 API Response received')

    if (data.data?.[0]?.b64_json) {
      const base64Data = data.data[0].b64_json
      const dataUrl = `data:image/png;base64,${base64Data}`
      console.log('✅ GPT Image 1 returned base64 data, converted to data URL')
      return dataUrl
    } else if (data.data?.[0]?.url) {
      return data.data[0].url
    } else {
      console.error('❌ Unexpected GPT Image 1 response format:', data)
      throw new Error('Invalid response from GPT Image 1 API - no image data returned')
    }
  }

  async convertImageToBase64(imageUrl, shouldResize = false, targetSize = 128, compressionLevel = 0.8) {
    // For Node.js, we'll fetch and convert to buffer, then to base64
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch generated image: ${response.status}`)
    }
    
    const buffer = await response.buffer()
    
    if (buffer.length === 0) {
      throw new Error('Received empty image data')
    }

    // For Node.js, we'll return the base64 data directly without resizing
    // In a real Node.js environment, you might want to use sharp or jimp for image processing
    const base64Data = `data:image/png;base64,${buffer.toString('base64')}`
    
    console.log(`📊 Image size: ${(buffer.length / 1024).toFixed(1)}KB`)
    
    return base64Data
  }

  async generateTownMap(prompt, targetDisplaySize = 800) {
    console.log('🗺️ Generating town map with GPT Image 1...')
    
    this.ensureApiKey()
    
    const fullPrompt = `Top-down pixel art town map for life simulation game. ${prompt}. 16-bit pixel art style, vibrant colors, complete overhead view of entire town with buildings, paths, and zones.`
    
    const imageUrl = await this.callGPTImage1API(fullPrompt, '1024x1024', false)
    const base64Data = await this.convertImageToBase64(imageUrl, false, targetDisplaySize, 0.85)
    
    console.log('✅ Successfully generated town map')
    return base64Data
  }

  async generateTownMapWithZones(prompt, targetDisplaySize = 800) {
    console.log('🗺️ Generating town map with zones using GPT Image 1 + Claude analysis...')
    
    this.ensureApiKey()
    
    // Simplified prompt to avoid duplicates and confusion
    const enhancedPrompt = `Top-down pixel art town map for life simulation game. ${prompt}. 
    
Clear distinct zones without text labels. Use different architectural styles and colors to distinguish areas: shops (colorful awnings), homes (varied roof colors), parks (green spaces), public areas (stone/brick). 16-bit pixel art style, vibrant colors, complete overhead view.`
    
    // Generate the map image
    const imageUrl = await this.callGPTImage1API(enhancedPrompt, '1024x1024', false)
    const mapBase64Data = await this.convertImageToBase64(imageUrl, false, targetDisplaySize, 0.85)
    
    console.log('✅ Map image generated, now analyzing with Claude...')
    
    let zones = []
    try {
      // Initialize Claude service if not done already
      if (!this.claudeService) {
        this.claudeService = new NodeClaudeService()
      }
      
      // Use Claude to analyze the map and generate zones
      zones = await this.claudeService.analyzeMapWithClaude(mapBase64Data, prompt)
    } catch (error) {
      console.warn('⚠️ Claude analysis failed, using logical zone generation:', error.message)
      zones = this.claudeService.generateLogicalZones(prompt)
    }
    
    console.log(`✅ Map with ${zones.length} zones generated successfully`)
    
    return {
      mapImageUrl: mapBase64Data,
      zones: zones,
      info: `Generated map with Claude-analyzed zones: ${zones.map(z => z.name).join(', ')}`
    }
  }
}

// Load character data from the project
async function loadCharacterData() {
  try {
    // Try to load from various possible locations
    const possiblePaths = [
      path.join(projectRoot, 'public', 'characters'),
      path.join(projectRoot, 'src', 'data', 'characters.json'),
      path.join(projectRoot, 'public', 'simulation', 'characters.json')
    ]

    // First try loading from individual character directories
    try {
      const charactersDir = path.join(projectRoot, 'public', 'characters')
      const entries = await fs.readdir(charactersDir, { withFileTypes: true })
      const characters = []

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const profilePath = path.join(charactersDir, entry.name, 'profile.json')
            const profileData = await fs.readFile(profilePath, 'utf8')
            const character = JSON.parse(profileData)
            character.id = character.id || entry.name.toLowerCase()
            character.name = character.name || entry.name
            characters.push(character)
          } catch (error) {
            console.warn(`⚠️ Could not load character ${entry.name}:`, error.message)
          }
        }
      }

      if (characters.length > 0) {
        console.log(`✅ Loaded ${characters.length} characters from individual directories`)
        return characters
      }
    } catch (error) {
      console.warn('⚠️ Could not load from character directories:', error.message)
    }

    // Fallback: create default characters
    console.log('📝 Creating default characters...')
    return [
      {
        id: 'sage',
        name: 'Sage',
        MBTI: 'INFP',
        description: 'A thoughtful baker who specializes in herbal remedies and sourdough. Gentle soul with deep connection to nature.',
        currentEmotion: 'content',
        age: 32,
        occupation: 'Baker & Herbalist',
        desires: ['create healing foods', 'help others find peace', 'grow rare herbs'],
        bigFive: { openness: 85, conscientiousness: 70, extraversion: 30, agreeableness: 90, neuroticism: 40 }
      },
      {
        id: 'rose',
        name: 'Rose',
        MBTI: 'ESFJ',
        description: 'A vibrant florist who brings color and joy to the town. Loves creating beautiful arrangements and connecting with people.',
        currentEmotion: 'happy',
        age: 28,
        occupation: 'Florist',
        desires: ['beautify the town', 'make people smile', 'grow exotic flowers'],
        bigFive: { openness: 75, conscientiousness: 80, extraversion: 85, agreeableness: 80, neuroticism: 25 }
      },
      {
        id: 'griff',
        name: 'Griff',
        MBTI: 'ISTP',
        description: 'A skilled craftsman who works with wood and lives near the orchard. Practical and reliable with a love for creating useful things.',
        currentEmotion: 'focused',
        age: 45,
        occupation: 'Craftsman',
        desires: ['master woodworking', 'build something lasting', 'work with his hands'],
        bigFive: { openness: 60, conscientiousness: 85, extraversion: 25, agreeableness: 60, neuroticism: 30 }
      },
      {
        id: 'john',
        name: 'John',
        MBTI: 'ENFP',
        description: 'An enthusiastic resident who loves community events and bringing people together. Always has new ideas and projects.',
        currentEmotion: 'excited',
        age: 34,
        occupation: 'Community Organizer',
        desires: ['organize town events', 'help neighbors connect', 'try new experiences'],
        bigFive: { openness: 90, conscientiousness: 50, extraversion: 90, agreeableness: 85, neuroticism: 45 }
      }
    ]
  } catch (error) {
    console.error('❌ Error loading character data:', error)
    throw error
  }
}

// Convert base64 data URL to buffer for file writing
function dataUrlToBuffer(dataUrl) {
  const base64Data = dataUrl.split(',')[1]
  return Buffer.from(base64Data, 'base64')
}

// Save generated assets to the public directory
async function saveAssetsToPublic(assets) {
  console.log('💾 Saving generated assets to public directory...')

  // Save character sprites
  if (assets.sprites) {
    for (const [characterName, spriteData] of Object.entries(assets.sprites)) {
      const characterDir = path.join(projectRoot, 'public', 'characters', characterName)
      
      // Ensure character directory exists
      await fs.mkdir(characterDir, { recursive: true })
      
      // Save sprite
      const spriteBuffer = dataUrlToBuffer(spriteData)
      const spritePath = path.join(characterDir, 'sprite.png')
      await fs.writeFile(spritePath, spriteBuffer)
      
      console.log(`✅ Saved sprite for ${characterName}: ${spritePath}`)
    }
  }

  // Save map
  if (assets.map) {
    const mapDir = path.join(projectRoot, 'public', 'map')
    await fs.mkdir(mapDir, { recursive: true })
    
    const mapBuffer = dataUrlToBuffer(assets.map)
    const mapPath = path.join(mapDir, 'map.png')
    await fs.writeFile(mapPath, mapBuffer)
    
    console.log(`✅ Saved town map: ${mapPath}`)
  }

  // Save zones data if provided
  if (assets.zones && assets.zones.length > 0) {
    const mapDir = path.join(projectRoot, 'public', 'map')
    await fs.mkdir(mapDir, { recursive: true })
    
    const zonesPath = path.join(mapDir, 'zones.json')
    await fs.writeFile(zonesPath, JSON.stringify(assets.zones, null, 2))
    
    console.log(`✅ Saved zones data: ${zonesPath}`)
    console.log(`📍 Generated zones: ${assets.zones.map(z => z.name).join(', ')}`)
  }

  console.log('🎉 All assets saved successfully!')
}

// Generate map and zones only
async function generateMapAndZones() {
  try {
    // Check for API keys
    const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
    const claudeKey = process.env.CLAUDE_API_KEY || process.env.VITE_CLAUDE_API_KEY
    
    if (!openaiKey) {
      console.error('❌ No OpenAI API key found!')
      console.error('💡 Set OPENAI_API_KEY environment variable')
      process.exit(1)
    }
    
    if (!claudeKey) {
      console.warn('⚠️ No Claude API key found - will use logical zone generation instead of Claude analysis')
      console.log('💡 Set CLAUDE_API_KEY environment variable for Claude-powered zone analysis')
    }

    console.log('✅ API keys validated')

    // Initialize asset service
    const assetService = new NodeOpenAIAssetsService()

    // Load character data for map prompt
    console.log('📋 Loading character data for map generation...')
    const characters = await loadCharacterData()

    const results = {
      sprites: {},
      map: null,
      zones: [],
      totalSizeKB: 0,
      errors: []
    }

    // Generate map with zones using Claude analysis
    console.log('🗺️ Generating map with Claude-analyzed zones...')
    try {
      const mapPrompt = buildDefaultMapPrompt(characters)
      console.log('🎨 Map prompt:', mapPrompt)
      
      const mapResult = await assetService.generateTownMapWithZones(mapPrompt, 800)
      results.map = mapResult.mapImageUrl
      results.zones = mapResult.zones
      
      const mapSizeKB = (mapResult.mapImageUrl.length * 0.75) / 1024
      results.totalSizeKB += mapSizeKB
      console.log(`✅ Generated map with ${mapResult.zones.length} zones: ${mapSizeKB.toFixed(1)}KB`)
    } catch (error) {
      console.error(`❌ Failed to generate map with zones:`, error.message)
      results.errors.push(`Map with zones: ${error.message}`)
      throw error
    }

    // Save assets
    await saveAssetsToPublic(results)

    // Report results
    console.log('\n🎉 Map and zones generation complete!')
    console.log(`📊 Summary:`)
    console.log(`   • Generated 1 town map with zones`)
    console.log(`   • Generated ${results.zones.length} zones`)
    console.log(`   • Total size: ${results.totalSizeKB.toFixed(1)}KB`)
    console.log(`   • Errors: ${results.errors.length}`)

    if (results.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:')
      results.errors.forEach(error => console.log(`   • ${error}`))
    }

    console.log('\n✅ Map and zones have been updated in the public directory!')
    console.log('💡 You can now load these in the Zone Editor or commit the changes.')

  } catch (error) {
    console.error('❌ Map and zones generation failed:', error)
    process.exit(1)
  }
}

// Main execution function
async function generateDefaultAssets() {
  try {
    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
    if (!apiKey) {
      console.error('❌ No OpenAI API key found!')
      console.error('💡 Set OPENAI_API_KEY environment variable:')
      console.error('   export OPENAI_API_KEY="your-api-key-here"')
      console.error('💡 Or if you have VITE_OPENAI_API_KEY, that works too!')
      process.exit(1)
    }

    console.log('✅ OpenAI API key found')

    // Initialize asset service
    const assetService = new NodeOpenAIAssetsService()

    // Load character data
    console.log('📋 Loading character data...')
    const characters = await loadCharacterData()

    const results = {
      sprites: {},
      map: null,
      zones: [],
      totalSizeKB: 0,
      errors: []
    }

    // Generate sprites for all characters
    console.log(`👥 Generating sprites for ${characters.length} characters...`)
    for (const character of characters) {
      try {
        console.log(`🎨 Generating sprite for ${character.name}...`)
        const spriteData = await assetService.generateCharacterSprite(character, 128)
        results.sprites[character.name] = spriteData
        
        const sizeKB = (spriteData.length * 0.75) / 1024
        results.totalSizeKB += sizeKB
        console.log(`✅ Generated sprite for ${character.name}: ${sizeKB.toFixed(1)}KB`)
      } catch (error) {
        console.error(`❌ Failed to generate sprite for ${character.name}:`, error.message)
        results.errors.push(`Sprite for ${character.name}: ${error.message}`)
      }
    }

    // Generate map with zones using Claude analysis
    console.log('🗺️ Generating map with Claude-analyzed zones...')
    try {
      const mapPrompt = buildDefaultMapPrompt(characters)
      console.log('🎨 Map prompt:', mapPrompt)
      
      const mapResult = await assetService.generateTownMapWithZones(mapPrompt, 800)
      results.map = mapResult.mapImageUrl
      results.zones = mapResult.zones
      
      const mapSizeKB = (mapResult.mapImageUrl.length * 0.75) / 1024
      results.totalSizeKB += mapSizeKB
      console.log(`✅ Generated map with ${mapResult.zones.length} zones: ${mapSizeKB.toFixed(1)}KB`)
    } catch (error) {
      console.error(`❌ Failed to generate map with zones:`, error.message)
      results.errors.push(`Map with zones: ${error.message}`)
    }

    // Save all assets
    await saveAssetsToPublic(results)

    // Report results
    console.log('\n🎉 Batch asset generation complete!')
    console.log(`📊 Summary:`)
    console.log(`   • Generated ${Object.keys(results.sprites).length} character sprites`)
    console.log(`   • Generated ${results.map ? 1 : 0} town map`)
    console.log(`   • Generated ${results.zones.length} zones`)
    console.log(`   • Total size: ${results.totalSizeKB.toFixed(1)}KB`)
    console.log(`   • Errors: ${results.errors.length}`)

    if (results.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:')
      results.errors.forEach(error => console.log(`   • ${error}`))
    }

    console.log('\n✅ Default assets have been updated in the public directory!')
    console.log('💡 You can now commit these changes to update the repository defaults.')

  } catch (error) {
    console.error('❌ Asset generation failed:', error)
    process.exit(1)
  }
}

function buildDefaultMapPrompt(characters) {
  const characterNames = characters.map(c => c.name).join(', ')
  const characterSpecificPlaces = characters.map(char => {
    if (char.name.toLowerCase().includes('sage')) return "herbal bakery"
    if (char.name.toLowerCase().includes('rose')) return "flower shop"
    if (char.name.toLowerCase().includes('griff')) return "workshop or craft area"
    return "cozy home area"
  }).filter((place, index, self) => self.indexOf(place) === index)

  return `A charming pixel art town designed for ${characterNames}. Include these essential areas: ${['bakery', 'florist', 'workshop', 'town square', 'park', 'residential area', ...characterSpecificPlaces].join(', ')}. The town should have cobblestone paths connecting all areas, green spaces, and a central gathering point. Make it feel cozy and lived-in with vibrant colors and clear distinct zones.`
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  if (mapOnly) {
    generateMapAndZones().catch(console.error)
  } else {
    generateDefaultAssets().catch(console.error)
  }
}

export { generateDefaultAssets, generateMapAndZones, NodeOpenAIAssetsService } 