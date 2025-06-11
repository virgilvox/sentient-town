import { useUIStore } from '@/stores/ui'

const OPENAI_API_URL = '/api/openai/v1/images/generations'

// Get effective OpenAI API key - prioritize user key, fallback to environment
function getEffectiveOpenAIApiKey() {
  const ui = useUIStore()
  // Check if user has set a key in UI and it's not empty
  if (ui.openaiApiKey && ui.openaiApiKey.trim() !== '') {
    return ui.openaiApiKey.trim()
  }
  
  // Fall back to environment variable
  const envKey = import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (envKey && envKey.trim() !== '') {
    console.log('🔑 Using OpenAI API key from environment variables')
    return envKey.trim()
  }
  
  // No key available
  console.warn('⚠️ No OpenAI API key found in UI settings or environment variables')
  return null
}

export class OpenAIAssetsService {
  constructor() {
    this.apiKey = null
    this.lastKeyUpdate = 0
    // Don't access stores during construction - defer until actually needed
  }

  // Update API key with rate limiting
  updateApiKey() {
    const now = Date.now()
    // Rate limit key updates to every 5 seconds
    if (now - this.lastKeyUpdate < 5000 && this.apiKey) {
      return
    }
    
    this.lastKeyUpdate = now
    this.apiKey = getEffectiveOpenAIApiKey()
  }

  // Ensure we have a valid API key before making requests
  ensureApiKey() {
    if (!this.apiKey) {
      this.updateApiKey()
    }
    
    if (!this.apiKey) {
      throw new Error('No OpenAI API key available. Please configure it in Settings.')
    }
    
    return this.apiKey
  }

  validateApiKey() {
    try {
      this.ensureApiKey()
      return { valid: true, message: 'Valid API key format' }
    } catch (error) {
      return { valid: false, message: error.message }
    }
  }

  async generateCharacterSprite(character, targetSize = 128) {
    console.log(`🎨 Generating ${targetSize}x${targetSize} sprite for ${character.name} using GPT Image 1...`)
    
    // Ensure we have a valid API key
    this.ensureApiKey()
    
    // Check if we have a custom prompt
    const isCustomPrompt = character.description && (
      character.description.includes('VISUAL REQUIREMENTS') || 
      character.description.includes('Create a character sprite')
    )
    
    let prompt
    if (isCustomPrompt) {
      // Use custom prompt with minimal technical append
      prompt = `${character.description}

TECHNICAL: Full body front facing pixel art character, centered, transparent background, for use in pixel art game.`
    } else {
      // Use much simpler prompt that works well with GPT Image 1
      prompt = this.buildSimpleSpritePrompt(character)
    }
    
    console.log('🎨 Using GPT Image 1 with prompt:', prompt.substring(0, 100) + '...')
    
    // Use GPT Image 1 at 1024x1024, then downscale for optimal sprite storage
    const imageUrl = await this.callGPTImage1API(prompt, '1024x1024', true) // true = transparent background
    
    // Convert URL to base64 with aggressive compression for sprites
    let compressionLevel = 0.85 // High quality for sprites
    if (targetSize <= 96) compressionLevel = 0.8 // More compression for tiny sprites
    
    const base64Data = await this.convertImageToBase64(imageUrl, true, targetSize, compressionLevel)
    
    console.log(`✅ Successfully generated and optimized sprite for ${character.name} (${targetSize}x${targetSize})`)
    return base64Data
  }

  buildSimpleSpritePrompt(character) {
    // Much simpler prompt based on successful example - GPT Image 1 works better with concise prompts
    const characterDescription = character.description || `${character.MBTI} personality character`
    
    return `Full body front facing pixel art of ${character.name}, a ${characterDescription}. Centered, for use in a pixel art HTML5 game, transparent background.`
  }

  async callGPTImage1API(prompt, size = '1024x1024', isTransparent = false) {
    try {
      console.log('🎨 Calling GPT Image 1 API...', { prompt: prompt.substring(0, 50) + '...', size, isTransparent })
      
      // Ensure we have a valid API key
      const apiKey = this.ensureApiKey()
      
      // GPT Image 1 supports these sizes
      const validSizes = ['1024x1024', '1536x1024', '1024x1536']
      if (!validSizes.includes(size)) {
        console.warn(`⚠️ Invalid size ${size} for GPT Image 1, using 1024x1024`)
        size = '1024x1024'
      }
      
      // Add transparency request to prompt if needed
      const enhancedPrompt = isTransparent 
        ? `${prompt}. Transparent background.`
        : prompt

      const response = await fetch('/api/openai/v1/images/generations', {
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
          // Note: GPT Image 1 doesn't use response_format parameter
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ GPT Image 1 API Error:', response.status, errorData)
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ GPT Image 1 API Response received')

      // Handle base64 response format (GPT Image 1 returns b64_json, not url)
      if (data.data?.[0]?.b64_json) {
        // Convert base64 to data URL
        const base64Data = data.data[0].b64_json
        const dataUrl = `data:image/png;base64,${base64Data}`
        console.log('✅ GPT Image 1 returned base64 data, converted to data URL')
        return dataUrl
      } else if (data.data?.[0]?.url) {
        // Fallback for URL format (just in case)
        return data.data[0].url
      } else {
        console.error('❌ Unexpected GPT Image 1 response format:', data)
        throw new Error('Invalid response from GPT Image 1 API - no image data returned')
      }
    } catch (error) {
      console.error('❌ GPT Image 1 API call failed:', error)
      throw error
    }
  }

  async callDallE3API(prompt, size = '1024x1024', isTransparent = false) {
    try {
      console.log('🎨 Calling DALL-E 3 API...', { prompt: prompt.substring(0, 50) + '...', size, isTransparent })
      
      // Ensure we have a valid API key
      const apiKey = this.ensureApiKey()
      
      // DALL-E 3 only supports these sizes
      const validSizes = ['1024x1024', '1024x1792', '1792x1024']
      if (!validSizes.includes(size)) {
        console.warn(`⚠️ Invalid size ${size} for DALL-E 3, using 1024x1024`)
        size = '1024x1024'
      }
      
      // Add transparency request to prompt if needed
      const enhancedPrompt = isTransparent 
        ? `${prompt}. The image should have a transparent background.`
        : prompt

      const response = await fetch('/api/openai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: size,
          quality: 'standard',
          style: 'natural',
          response_format: 'url'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ DALL-E 3 API Error:', response.status, errorData)
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ DALL-E 3 API Response received')

      // Handle URL response format (dall-e-3 default)
      if (data.data?.[0]?.url) {
        return data.data[0].url
      } else {
        throw new Error('Invalid response from DALL-E 3 API - no image URL returned')
      }
    } catch (error) {
      console.error('❌ DALL-E 3 API call failed:', error)
      throw error
    }
  }

  async callDallE2API(prompt, size = '512x512', isTransparent = false) {
    try {
      console.log('🎨 Calling DALL-E 2 API...', { prompt: prompt.substring(0, 50) + '...', size, isTransparent })
      
      // Ensure we have a valid API key
      const apiKey = this.ensureApiKey()
      
      // DALL-E 2 supports these sizes
      const validSizes = ['256x256', '512x512', '1024x1024']
      if (!validSizes.includes(size)) {
        console.warn(`⚠️ Invalid size ${size} for DALL-E 2, using 512x512`)
        size = '512x512'
      }
      
      // Add transparency request to prompt if needed
      const enhancedPrompt = isTransparent 
        ? `${prompt}. The image should have a transparent background.`
        : prompt

      const response = await fetch('/api/openai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-2',
          prompt: enhancedPrompt,
          n: 1,
          size: size,
          response_format: 'url'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ DALL-E 2 API Error:', response.status, errorData)
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ DALL-E 2 API Response received')

      // Handle URL response format
      if (data.data?.[0]?.url) {
        return data.data[0].url
      } else {
        throw new Error('Invalid response from DALL-E 2 API - no image URL returned')
      }
    } catch (error) {
      console.error('❌ DALL-E 2 API call failed:', error)
      throw error
    }
  }

  async convertImageToBase64(imageUrl, shouldResize = false, targetSize = 128, compressionLevel = 0.8) {
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch generated image: ${response.status}`)
    }
    
    const blob = await response.blob()
    
    if (blob.size === 0) {
      throw new Error('Received empty image data')
    }

    // Convert blob to data URL first
    const originalDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('FileReader error'))
      reader.readAsDataURL(blob)
    })

    // If resizing is requested, resize and compress the image
    if (shouldResize) {
      console.log(`🔄 Resizing and compressing image to ${targetSize}x${targetSize} with ${compressionLevel} quality`)
      const compressedDataUrl = await this.resizeAndCompressImage(originalDataUrl, targetSize, compressionLevel)
      
      // Log size comparison
      const originalSize = (originalDataUrl.length * 0.75) / 1024 // KB
      const compressedSize = (compressedDataUrl.length * 0.75) / 1024 // KB
      console.log(`📊 Size optimization: ${originalSize.toFixed(1)}KB → ${compressedSize.toFixed(1)}KB (${((1 - compressedSize/originalSize) * 100).toFixed(1)}% smaller)`)
      
      return compressedDataUrl
    }

    // For images without resizing, still compress if they're large
    const maxSize = 2 * 1024 * 1024 // 2MB limit for unresized images
    if (blob.size > maxSize) {
      console.warn(`⚠️ Large image detected (${(blob.size / 1024 / 1024).toFixed(2)}MB), applying compression`)
      return this.compressImage(originalDataUrl, 0.8) // 80% quality
    }
    
    return originalDataUrl
  }

  async resizeAndCompressImage(imageDataUrl, targetSize = 128, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        canvas.width = targetSize
        canvas.height = targetSize
        
        // Use smooth scaling for better quality at smaller sizes
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Draw the resized image
        ctx.drawImage(img, 0, 0, targetSize, targetSize)
        
        // Apply progressive compression based on target size
        let finalQuality = quality
        if (targetSize <= 96) {
          finalQuality = Math.max(0.6, quality - 0.1) // More compression for tiny sprites
        } else if (targetSize <= 128) {
          finalQuality = Math.max(0.7, quality - 0.05) // Slight compression for small sprites
        }
        
        // Convert with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', finalQuality)
        
        // Try WebP if browser supports it and it results in smaller size
        try {
          const webpDataUrl = canvas.toDataURL('image/webp', finalQuality)
          if (webpDataUrl.length < compressedDataUrl.length && webpDataUrl !== 'data:,') {
            console.log('📦 Using WebP format for better compression')
            resolve(webpDataUrl)
            return
          }
        } catch (error) {
          console.log('📦 WebP not supported, using JPEG')
        }
        
        resolve(compressedDataUrl)
      }
      
      img.onerror = () => reject(new Error('Failed to load image for resizing'))
      img.src = imageDataUrl
    })
  }

  async compressImage(imageDataUrl, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        canvas.width = img.width
        canvas.height = img.height
        
        ctx.drawImage(img, 0, 0)
        
        // Try WebP first for better compression
        try {
          const webpDataUrl = canvas.toDataURL('image/webp', quality)
          if (webpDataUrl !== 'data:,') {
            resolve(webpDataUrl)
            return
          }
        } catch (error) {
          // WebP not supported
        }
        
        // Fallback to JPEG
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(jpegDataUrl)
      }
      
      img.onerror = () => reject(new Error('Failed to load image for compression'))
      img.src = imageDataUrl
    })
  }

  async generateTownMapWithZones(prompt, targetDisplaySize = 800) {
    console.log('🗺️ Generating town map with GPT Image 1...')
    
    this.ensureApiKey()
    
    // Much simpler prompt based on success with sprite generation
    const fullPrompt = `Top-down pixel art town map for life simulation game. ${prompt}. 16-bit pixel art style, vibrant colors, complete overhead view of entire town with buildings, paths, and zones.`
    
    try {
      // Use GPT Image 1 for high quality maps
      const imageUrl = await this.callGPTImage1API(fullPrompt, '1024x1024', false) // false for opaque background
      
      // Use progressive compression for maps based on target size
      let compressionLevel = 0.85 // Good quality for maps
      if (targetDisplaySize <= 600) compressionLevel = 0.8
      if (targetDisplaySize >= 1024) compressionLevel = 0.9 // Higher quality for large maps
      
      // Resize map to reasonable display size with optimized compression
      const base64Data = await this.convertImageToBase64(imageUrl, true, targetDisplaySize, compressionLevel)
      
      console.log('🤖 Using Claude to analyze the generated map and determine zones...')
      
      // Use Claude to analyze the image and determine zones
      const generatedZones = await this.analyzeMapWithClaude(base64Data, prompt)
      
      console.log('✅ Successfully generated and optimized town map with Claude-analyzed zones')
      return {
        mapImageUrl: base64Data,
        zones: generatedZones
      }
    } catch (error) {
      // If it's a storage quota error, provide helpful guidance
      if (error.message.includes('quota') || error.message.includes('Storage')) {
        throw new Error('Image too large for browser storage. Try generating a smaller map or clear custom assets first.')
      }
      throw error
    }
  }

  async analyzeMapWithClaude(base64ImageData, originalPrompt) {
    console.log('🔍 Starting Claude map analysis for zone generation...')
    
    try {
      // Import Claude service
      const { default: claudeApi } = await import('./claudeApi.js')
      
      // Use the new method that automatically uses Sonnet for complex map analysis
      const zones = await claudeApi.analyzeMapForZones(base64ImageData, originalPrompt)
      
      console.log('✅ Claude map analysis completed successfully')
      console.log('📊 Generated zones:', zones)
      
      return zones
      
    } catch (error) {
      console.error('❌ Claude map analysis failed:', error)
      
      // Fallback to logical zone generation if Claude analysis fails
      console.log('🔄 Falling back to logical zone generation...')
      return this.generateLogicalZones(originalPrompt)
    }
  }

  convertClaudeCoordinatesToTiles(claudeZones) {
    const finalZones = []
    const usedAreas = new Set()

    claudeZones.forEach((zone, index) => {
      const zoneId = `zone_${Date.now()}_${index}`
      let tiles = []
      
      try {
        if (zone.coordinates) {
          if (zone.coordinates.method === 'rectangle') {
            // Convert rectangle coordinates to tiles
            const { startX, startY, width, height } = zone.coordinates
            for (let x = startX; x < startX + width && x < 50; x++) {
              for (let y = startY; y < startY + height && y < 37; y++) {
                if (x >= 0 && y >= 0) {
                  tiles.push({ x, y })
                }
              }
            }
          } else if (zone.coordinates.method === 'tiles' && zone.coordinates.tiles) {
            // Use specific tile coordinates
            tiles = zone.coordinates.tiles.filter(tile => 
              tile.x >= 0 && tile.x < 50 && tile.y >= 0 && tile.y < 37
            )
          }
        }
        
        // Fallback if no valid coordinates
        if (tiles.length === 0) {
          console.warn(`⚠️ No valid coordinates for zone ${zone.name}, using fallback positioning`)
          // Use the old method as fallback
          const location = this.parseLocationDescription(zone.visualDescription || zone.name, 50, 37)
          tiles = this.generateTilesForLocation(location, zone.type, usedAreas)
        }

        if (tiles.length > 0) {
          finalZones.push({
            id: zoneId,
            name: zone.name,
            type: zone.type,
            tiles: tiles,
            description: zone.visualDescription || ''
          })
        }
      } catch (error) {
        console.warn(`⚠️ Error processing zone ${zone.name}:`, error)
      }
    })

    return finalZones
  }

  parseLocationDescription(locationDesc, mapWidth, mapHeight) {
    const desc = locationDesc.toLowerCase()
    
    // Define approximate areas based on description
    let centerX = Math.floor(mapWidth / 2)
    let centerY = Math.floor(mapHeight / 2)
    let width = Math.floor(mapWidth / 4)
    let height = Math.floor(mapHeight / 4)
    
    // Adjust based on cardinal directions
    if (desc.includes('north')) {
      centerY = Math.floor(mapHeight / 4)
    }
    if (desc.includes('south')) {
      centerY = Math.floor(mapHeight * 3 / 4)
    }
    if (desc.includes('west')) {
      centerX = Math.floor(mapWidth / 4)
    }
    if (desc.includes('east')) {
      centerX = Math.floor(mapWidth * 3 / 4)
    }
    if (desc.includes('center')) {
      centerX = Math.floor(mapWidth / 2)
      centerY = Math.floor(mapHeight / 2)
    }
    
    // Adjust size based on description
    if (desc.includes('corner')) {
      width = Math.floor(mapWidth / 5)
      height = Math.floor(mapHeight / 5)
    }
    if (desc.includes('large') || desc.includes('main')) {
      width = Math.floor(mapWidth / 3)
      height = Math.floor(mapHeight / 3)
    }
    
    return {
      startX: Math.max(0, centerX - width / 2),
      startY: Math.max(0, centerY - height / 2),
      width: Math.min(width, mapWidth - centerX + width / 2),
      height: Math.min(height, mapHeight - centerY + height / 2)
    }
  }

  generateTilesForLocation(area, zoneType, usedAreas) {
    // Use existing tile generation logic but with Claude-determined areas
    const areaKey = `${area.startX},${area.startY},${area.width},${area.height}`
    if (usedAreas.has(areaKey)) {
      // Find nearby alternative area
      area.startX += Math.floor(area.width / 2)
      area.startY += Math.floor(area.height / 2)
      area.width = Math.floor(area.width * 0.8)
      area.height = Math.floor(area.height * 0.8)
    }
    usedAreas.add(areaKey)
    
    const config = {
      'public': { minSize: 8, maxSize: 25 },
      'shop': { minSize: 4, maxSize: 12 },
      'home': { minSize: 12, maxSize: 35 },
      'park': { minSize: 6, maxSize: 20 },
      'street': { minSize: 15, maxSize: 45 }
    }[zoneType] || { minSize: 4, maxSize: 12 }
    
    return this.generateTilesInArea(area, config, zoneType)
  }

  generateLogicalZones(originalPrompt) {
    // Enhanced zone patterns with more realistic positioning and sizes
    const zonePatterns = [
      { keywords: ['florist', 'flower', 'rose'], name: "Rose's Florist", type: 'shop', priority: 8 },
      { keywords: ['bakery', 'moonrise', 'bread', 'baking'], name: "Moonrise Bakery", type: 'shop', priority: 8 },
      { keywords: ['workshop', 'griff', 'wood', 'craft'], name: "Griff's Workshop", type: 'shop', priority: 8 },
      { keywords: ['town hall', 'hall', 'civic', 'government'], name: "Town Hall", type: 'public', priority: 9 },
      { keywords: ['orchard', 'trees', 'fruit', 'apple'], name: "Old Orchard", type: 'park', priority: 7 },
      { keywords: ['house', 'home', 'residence', 'cottage'], name: "Residential District", type: 'home', priority: 6 },
      { keywords: ['park', 'garden', 'green', 'commons'], name: "Town Park", type: 'park', priority: 7 },
      { keywords: ['market', 'square', 'center', 'plaza'], name: "Market Square", type: 'public', priority: 9 },
      { keywords: ['inn', 'tavern', 'lodge'], name: "Cozy Inn", type: 'shop', priority: 6 },
      { keywords: ['library', 'books', 'reading'], name: "Village Library", type: 'public', priority: 5 },
      { keywords: ['church', 'temple', 'chapel'], name: "Village Chapel", type: 'public', priority: 5 },
      { keywords: ['fountain', 'well', 'water'], name: "Village Fountain", type: 'public', priority: 4 },
      { keywords: ['blacksmith', 'forge', 'smith'], name: "Village Forge", type: 'shop', priority: 6 },
      { keywords: ['stable', 'horse', 'barn'], name: "Village Stables", type: 'shop', priority: 4 }
    ]

    const detectedZones = []
    const promptLower = originalPrompt.toLowerCase()

    // Detect zones mentioned in prompt with priority scoring
    zonePatterns.forEach((pattern, index) => {
      const matchCount = pattern.keywords.reduce((count, keyword) => {
        return count + (promptLower.includes(keyword) ? 1 : 0)
      }, 0)
      
      if (matchCount > 0) {
        detectedZones.push({
          ...pattern,
          matchScore: matchCount * pattern.priority,
          originalIndex: index
        })
      }
    })

    // Sort by match score and priority
    detectedZones.sort((a, b) => b.matchScore - a.matchScore)

    // Always ensure we have essential zones
    const essentialZones = [
      { name: "Town Center", type: 'public', priority: 10 },
      { name: "Main Street", type: 'street', priority: 8 },
      { name: "Residential Area", type: 'home', priority: 7 },
      { name: "Village Green", type: 'park', priority: 6 }
    ]

    essentialZones.forEach(essential => {
      if (!detectedZones.some(z => z.type === essential.type || z.name.toLowerCase().includes(essential.name.toLowerCase()))) {
        detectedZones.push({
          ...essential,
          matchScore: essential.priority,
          keywords: [],
          originalIndex: 999
        })
      }
    })

    // Generate final zones with better positioning
    const finalZones = []
    const usedAreas = new Set()
    
    // Take top 8-12 zones
    const selectedZones = detectedZones.slice(0, Math.min(12, detectedZones.length))
    
    selectedZones.forEach((zoneData, index) => {
      const zoneId = `zone_${Date.now()}_${index}`
      const tiles = this.generateRealisticZoneTiles(zoneData, index, selectedZones.length, usedAreas)
      
      if (tiles.length > 0) {
        finalZones.push({
          id: zoneId,
          name: zoneData.name,
          type: zoneData.type,
          tiles: tiles
        })
      }
    })

    console.log(`🏘️ Generated ${finalZones.length} logical zones with realistic placement`)
    return finalZones
  }

  generateRealisticZoneTiles(zoneData, index, totalZones, usedAreas) {
    const mapWidth = 50
    const mapHeight = 37
    
    // Define realistic zone areas based on type and importance
    const zoneConfigs = {
      'public': { minSize: 8, maxSize: 25, preferCenter: true },
      'shop': { minSize: 4, maxSize: 12, preferStreet: true },
      'home': { minSize: 12, maxSize: 35, preferQuiet: true },
      'park': { minSize: 6, maxSize: 20, preferOpen: true },
      'street': { minSize: 15, maxSize: 45, preferLinear: true }
    }
    
    const config = zoneConfigs[zoneData.type] || { minSize: 4, maxSize: 12, preferCenter: false }
    
    // Strategic placement based on zone type and priority
    let candidateAreas = []
    
    if (zoneData.name.toLowerCase().includes('center') || zoneData.name.toLowerCase().includes('hall')) {
      // Central important buildings
      candidateAreas = [
        { startX: 20, startY: 15, width: 12, height: 8, weight: 10 },
        { startX: 18, startY: 12, width: 14, height: 12, weight: 9 }
      ]
    } else if (zoneData.type === 'street' || zoneData.name.toLowerCase().includes('street')) {
      // Streets - linear and connecting
      candidateAreas = [
        { startX: 0, startY: 18, width: 50, height: 3, weight: 10 }, // Horizontal main street
        { startX: 24, startY: 0, width: 3, height: 37, weight: 9 },  // Vertical main street
        { startX: 10, startY: 8, width: 30, height: 2, weight: 7 },  // North connector
        { startX: 12, startY: 28, width: 26, height: 2, weight: 7 }  // South connector
      ]
    } else if (zoneData.type === 'home') {
      // Residential - quieter areas away from center
      candidateAreas = [
        { startX: 2, startY: 2, width: 15, height: 12, weight: 8 },   // NW residential
        { startX: 33, startY: 2, width: 15, height: 12, weight: 8 },  // NE residential
        { startX: 2, startY: 23, width: 15, height: 12, weight: 8 },  // SW residential
        { startX: 33, startY: 23, width: 15, height: 12, weight: 8 }, // SE residential
        { startX: 5, startY: 30, width: 40, height: 6, weight: 6 }    // South residential
      ]
    } else if (zoneData.type === 'shop') {
      // Shops - near center and streets
      candidateAreas = [
        { startX: 15, startY: 20, width: 8, height: 6, weight: 9 },   // Near center
        { startX: 27, startY: 20, width: 8, height: 6, weight: 9 },   // Near center
        { startX: 15, startY: 10, width: 8, height: 6, weight: 8 },   // North shops
        { startX: 27, startY: 10, width: 8, height: 6, weight: 8 },   // North shops
        { startX: 8, startY: 15, width: 6, height: 8, weight: 7 },    // West shops
        { startX: 36, startY: 15, width: 6, height: 8, weight: 7 }    // East shops
      ]
    } else if (zoneData.type === 'park') {
      // Parks - open areas with organic shapes
      candidateAreas = [
        { startX: 5, startY: 5, width: 12, height: 10, weight: 8 },   // NW park
        { startX: 33, startY: 5, width: 12, height: 10, weight: 8 },  // NE park
        { startX: 38, startY: 20, width: 10, height: 15, weight: 7 }, // East park
        { startX: 2, startY: 20, width: 10, height: 15, weight: 7 },  // West park
        { startX: 18, startY: 25, width: 14, height: 10, weight: 6 }  // South park
      ]
    } else {
      // Default placement
      candidateAreas = [
        { startX: 10, startY: 10, width: 10, height: 8, weight: 5 },
        { startX: 30, startY: 10, width: 10, height: 8, weight: 5 },
        { startX: 20, startY: 20, width: 10, height: 8, weight: 5 }
      ]
    }
    
    // Find best available area
    candidateAreas.sort((a, b) => b.weight - a.weight)
    
    for (const area of candidateAreas) {
      const areaKey = `${area.startX},${area.startY},${area.width},${area.height}`
      if (!usedAreas.has(areaKey)) {
        usedAreas.add(areaKey)
        return this.generateTilesInArea(area, config, zoneData.type)
      }
    }
    
    // Fallback: find any available space
    for (let attempts = 0; attempts < 20; attempts++) {
      const area = {
        startX: Math.floor(Math.random() * (mapWidth - 15)) + 2,
        startY: Math.floor(Math.random() * (mapHeight - 10)) + 2,
        width: Math.min(15, config.maxSize),
        height: Math.min(10, config.maxSize)
      }
      
      const areaKey = `${area.startX},${area.startY},${area.width},${area.height}`
      if (!usedAreas.has(areaKey)) {
        usedAreas.add(areaKey)
        return this.generateTilesInArea(area, config, zoneData.type)
      }
    }
    
    return [] // No space available
  }

  generateTilesInArea(area, config, zoneType) {
    const tiles = []
    const targetSize = Math.max(config.minSize, Math.min(config.maxSize, 
      Math.floor(Math.random() * (config.maxSize - config.minSize + 1)) + config.minSize))
    
    const centerX = area.startX + area.width / 2
    const centerY = area.startY + area.height / 2
    
    if (zoneType === 'street') {
      // Generate linear street tiles
      if (area.width > area.height) {
        // Horizontal street
        const y = Math.floor(centerY)
        for (let x = area.startX; x < area.startX + area.width && tiles.length < targetSize; x++) {
          if (x >= 0 && x < 50 && y >= 0 && y < 37) {
            tiles.push({ x, y })
            // Add width to street
            if (area.height >= 2 && y + 1 < 37) {
              tiles.push({ x, y: y + 1 })
            }
          }
        }
      } else {
        // Vertical street
        const x = Math.floor(centerX)
        for (let y = area.startY; y < area.startY + area.height && tiles.length < targetSize; y++) {
          if (x >= 0 && x < 50 && y >= 0 && y < 37) {
            tiles.push({ x, y })
            // Add width to street
            if (area.width >= 2 && x + 1 < 50) {
              tiles.push({ x: x + 1, y })
            }
          }
        }
      }
    } else if (zoneType === 'park') {
      // Generate organic park shape
      const radius = Math.min(area.width, area.height) / 2.5
      for (let x = area.startX; x < area.startX + area.width && tiles.length < targetSize; x++) {
        for (let y = area.startY; y < area.startY + area.height && tiles.length < targetSize; y++) {
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
          const threshold = radius * (0.6 + Math.random() * 0.4) // Organic irregular edges
          
          if (distance <= threshold && x >= 0 && x < 50 && y >= 0 && y < 37) {
            tiles.push({ x, y })
          }
        }
      }
    } else {
      // Generate rectangular zones with slight irregularities
      const effectiveWidth = Math.min(area.width, Math.ceil(Math.sqrt(targetSize * 1.5)))
      const effectiveHeight = Math.min(area.height, Math.ceil(targetSize / effectiveWidth))
      
      for (let x = area.startX; x < area.startX + effectiveWidth && tiles.length < targetSize; x++) {
        for (let y = area.startY; y < area.startY + effectiveHeight && tiles.length < targetSize; y++) {
          // Add some irregularity to edges (10% chance to skip edge tiles)
          const isEdge = x === area.startX || x === area.startX + effectiveWidth - 1 || 
                        y === area.startY || y === area.startY + effectiveHeight - 1
          
          if (!isEdge || Math.random() > 0.1) {
            if (x >= 0 && x < 50 && y >= 0 && y < 37) {
              tiles.push({ x, y })
            }
          }
        }
      }
    }
    
    return tiles.slice(0, targetSize) // Ensure we don't exceed target size
  }

  // Helper method to convert blob to data URL
  async blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // NEW: Batch generate default assets for the project
  async generateDefaultAssets(characters, existingZones = []) {
    console.log('🏭 Starting batch generation of default assets...')
    const results = {
      sprites: {},
      map: null,
      zones: [],
      totalSizeKB: 0,
      errors: []
    }

    try {
      // Generate optimized sprites for all characters
      console.log(`👥 Generating sprites for ${characters.length} characters...`)
      for (const character of characters) {
        try {
          console.log(`🎨 Generating default sprite for ${character.name}...`)
          const spriteData = await this.generateCharacterSprite(character, 128) // Standard size
          results.sprites[character.name] = spriteData
          
          // Calculate size
          const sizeKB = (spriteData.length * 0.75) / 1024
          results.totalSizeKB += sizeKB
          console.log(`✅ Generated sprite for ${character.name}: ${sizeKB.toFixed(1)}KB`)
        } catch (error) {
          console.error(`❌ Failed to generate sprite for ${character.name}:`, error)
          results.errors.push(`Sprite for ${character.name}: ${error.message}`)
        }
      }

      // Generate optimized town map
      console.log('🗺️ Generating default town map...')
      try {
        const mapPrompt = this.buildDefaultMapPrompt(characters, existingZones)
        const mapResult = await this.generateTownMapWithZones(mapPrompt, 800) // Good balance of quality and size
        
        results.map = mapResult.mapImageUrl
        results.zones = mapResult.zones
        
        const mapSizeKB = (mapResult.mapImageUrl.length * 0.75) / 1024
        results.totalSizeKB += mapSizeKB
        console.log(`✅ Generated town map: ${mapSizeKB.toFixed(1)}KB with ${mapResult.zones.length} zones`)
      } catch (error) {
        console.error(`❌ Failed to generate town map:`, error)
        results.errors.push(`Town map: ${error.message}`)
      }

      console.log(`🏭 Batch generation complete. Total size: ${results.totalSizeKB.toFixed(1)}KB`)
      if (results.errors.length > 0) {
        console.warn(`⚠️ ${results.errors.length} errors occurred during generation`)
      }

      return results
    } catch (error) {
      console.error('❌ Batch asset generation failed:', error)
      throw error
    }
  }

  buildDefaultMapPrompt(characters, existingZones) {
    // Build a comprehensive prompt based on character needs and existing zones
    const characterNames = characters.map(c => c.name).join(', ')
    const zoneTypes = ['bakery', 'florist', 'workshop', 'town square', 'park', 'residential area']
    
    const characterSpecificPlaces = characters.map(char => {
      if (char.name.toLowerCase().includes('sage')) return "herbal bakery"
      if (char.name.toLowerCase().includes('rose')) return "flower shop"
      if (char.name.toLowerCase().includes('griff')) return "workshop or craft area"
      return "cozy home area"
    }).filter((place, index, self) => self.indexOf(place) === index)

    return `A charming pixel art town designed for ${characterNames}. Include these essential areas: ${[...zoneTypes, ...characterSpecificPlaces].join(', ')}. The town should have cobblestone paths connecting all areas, green spaces, and a central gathering point. Make it feel cozy and lived-in with vibrant colors and clear distinct zones.`
  }

  // NEW: Save generated assets as default files (returns download objects for manual saving)
  async generateDefaultAssetsForDownload(characters, existingZones = []) {
    const results = await this.generateDefaultAssets(characters, existingZones)
    const downloadableFiles = []

    // Prepare character sprites for download
    for (const [characterName, spriteData] of Object.entries(results.sprites)) {
      // Convert data URL to blob for download
      const response = await fetch(spriteData)
      const blob = await response.blob()
      
      downloadableFiles.push({
        filename: `${characterName.toLowerCase()}_sprite.png`,
        blob: blob,
        path: `public/characters/${characterName}/sprite.png`,
        type: 'character_sprite',
        character: characterName
      })
    }

    // Prepare map for download
    if (results.map) {
      const response = await fetch(results.map)
      const blob = await response.blob()
      
      downloadableFiles.push({
        filename: 'town_map.png',
        blob: blob,
        path: 'public/map/map.png',
        type: 'town_map'
      })
    }

    // Prepare zones data for download
    if (results.zones.length > 0) {
      const zonesJson = JSON.stringify(results.zones, null, 2)
      const zonesBlob = new Blob([zonesJson], { type: 'application/json' })
      
      downloadableFiles.push({
        filename: 'zones.json',
        blob: zonesBlob,
        path: 'public/map/zones.json',
        type: 'zones_data'
      })
    }

    return {
      files: downloadableFiles,
      summary: {
        totalFiles: downloadableFiles.length,
        totalSizeKB: results.totalSizeKB,
        errors: results.errors,
        sprites: Object.keys(results.sprites).length,
        hasMap: !!results.map,
        zoneCount: results.zones.length
      }
    }
  }

  // NEW: Utility to trigger downloads of all generated assets
  downloadGeneratedAssets(downloadableFiles) {
    console.log(`📥 Starting download of ${downloadableFiles.length} generated assets...`)
    
    downloadableFiles.forEach((file, index) => {
      setTimeout(() => {
        const url = URL.createObjectURL(file.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.filename
        a.style.display = 'none'
        
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        URL.revokeObjectURL(url)
        console.log(`📥 Downloaded: ${file.filename} (${file.type})`)
      }, index * 500) // Stagger downloads by 500ms to avoid browser blocking
    })
    
    console.log(`✅ All ${downloadableFiles.length} assets queued for download`)
  }
}

export const openAIAssets = new OpenAIAssetsService() 