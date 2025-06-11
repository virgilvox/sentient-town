#!/usr/bin/env node

const fs = require('fs').promises
const path = require('path')

const MAPS_DIR = path.join(__dirname, '../public/maps')
const ZONES_DIR = path.join(__dirname, '../public/zones')

class ZoneGenerator {
  constructor() {
    this.claudeApiKey = process.env.VITE_CLAUDE_API_KEY
    if (!this.claudeApiKey) {
      console.error('❌ CLAUDE_API_KEY environment variable is required')
      process.exit(1)
    }
  }

  async generateZonesForMap(mapPath) {
    const mapName = path.basename(mapPath, path.extname(mapPath))
    console.log(`🗺️ Generating zones for map: ${mapName}`)

    try {
      const mapBuffer = await fs.readFile(mapPath)
      const mapBase64 = mapBuffer.toString('base64')
      const mimeType = mapPath.endsWith('.png') ? 'image/png' : 'image/jpeg'
      
      const analysisPrompt = `Analyze this top-down town map and identify logical zones for character simulation.

For each zone provide: name, type (home/shop/public/park/street/solid/wall/building/obstacle), coordinates as percentages (x%, y%, width%, height%), description.

Focus on:
- SOLID ZONES: Buildings, trees, water, obstacles (cannot walk through)
- WALKABLE ZONES: Streets, paths, courtyards, parks (can walk through)
- FUNCTIONAL ZONES: Homes, shops, public buildings, gathering areas

Return JSON array format:
[{"name": "Town Hall", "type": "building", "x": "45%", "y": "30%", "width": "15%", "height": "20%", "description": "Central building"}]`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: mapBase64 }}
            ]
          }]
        })
      })

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`)
      }

      const claudeData = await response.json()
      const claudeResponse = claudeData.content[0].text

      let suggestedZones = []
      try {
        const jsonMatch = claudeResponse.match(/\[([\s\S]*?)\]/g)
        if (jsonMatch) {
          suggestedZones = JSON.parse(jsonMatch[0])
          console.log(`✅ Claude identified ${suggestedZones.length} zones`)
        } else {
          throw new Error('No JSON found in response')
        }
      } catch (parseError) {
        console.warn('❌ Failed to parse zones, using fallback')
        suggestedZones = this.generateFallbackZones()
      }

      const zones = this.convertPercentageZonesToTiles(suggestedZones)
      
      const zonesPath = path.join(ZONES_DIR, `${mapName}-zones.json`)
      await fs.mkdir(ZONES_DIR, { recursive: true })
      await fs.writeFile(zonesPath, JSON.stringify({
        mapName: mapName,
        generated: new Date().toISOString(),
        zones: zones
      }, null, 2))

      console.log(`✅ Saved ${zones.length} zones to: ${zonesPath}`)
      return zones

    } catch (error) {
      console.error(`❌ Failed to generate zones for ${mapName}:`, error.message)
      throw error
    }
  }

  convertPercentageZonesToTiles(percentageZones) {
    const mapWidth = 50, mapHeight = 37
    
    return percentageZones.map((zone, index) => {
      const x = parseInt(zone.x?.replace('%', '') || '0') / 100
      const y = parseInt(zone.y?.replace('%', '') || '0') / 100  
      const width = parseInt(zone.width?.replace('%', '') || '10') / 100
      const height = parseInt(zone.height?.replace('%', '') || '10') / 100
      
      const startX = Math.floor(x * mapWidth)
      const startY = Math.floor(y * mapHeight)
      const endX = Math.min(mapWidth - 1, Math.floor((x + width) * mapWidth))
      const endY = Math.min(mapHeight - 1, Math.floor((y + height) * mapHeight))
      
      const tiles = []
      for (let tileX = startX; tileX <= endX; tileX++) {
        for (let tileY = startY; tileY <= endY; tileY++) {
          tiles.push({ x: tileX, y: tileY })
        }
      }
      
      // Determine if zone is walkable based on type
      const unwalkableTypes = ['solid', 'wall', 'building', 'obstacle']
      const isWalkable = !unwalkableTypes.includes(zone.type)
      
      return {
        id: `zone-${Date.now()}-${index}`,
        name: zone.name || `Zone ${index + 1}`,
        type: zone.type || 'public',
        tiles: tiles,
        description: zone.description || 'AI-generated zone',
        walkable: isWalkable
      }
    }).filter(zone => zone.tiles.length > 0)
  }

  generateFallbackZones() {
    return [
      { name: 'Town Center', type: 'public', x: '40%', y: '40%', width: '20%', height: '20%', description: 'Central area', walkable: true },
      { name: 'Residential', type: 'home', x: '10%', y: '10%', width: '30%', height: '25%', description: 'Housing area', walkable: true },
      { name: 'Market', type: 'shop', x: '60%', y: '30%', width: '25%', height: '15%', description: 'Commercial district', walkable: true },
      { name: 'Park', type: 'park', x: '70%', y: '60%', width: '20%', height: '25%', description: 'Green space', walkable: true },
      { name: 'Main Street', type: 'street', x: '0%', y: '45%', width: '100%', height: '10%', description: 'Primary road', walkable: true },
      { name: 'Town Hall Building', type: 'building', x: '45%', y: '35%', width: '10%', height: '15%', description: 'Government building - solid structure', walkable: false },
      { name: 'Boundary Walls', type: 'wall', x: '0%', y: '0%', width: '100%', height: '5%', description: 'Town walls - impassable', walkable: false }
    ]
  }

  async run() {
    const args = process.argv.slice(2)
    
    try {
      await fs.access(MAPS_DIR)
    } catch {
      console.error(`❌ Maps directory not found: ${MAPS_DIR}`)
      process.exit(1)
    }

    if (args.includes('--all')) {
      const files = await fs.readdir(MAPS_DIR)
      const mapFiles = files.filter(f => f.match(/\.(png|jpg|jpeg)$/i))
      
      if (mapFiles.length === 0) {
        console.log('❌ No map images found in public/maps/')
        process.exit(1)
      }

      console.log(`🗺️ Found ${mapFiles.length} maps to process`)
      
      for (const mapFile of mapFiles) {
        await this.generateZonesForMap(path.join(MAPS_DIR, mapFile))
      }
    } else if (args.length > 0) {
      const mapName = args[0]
      const mapExtensions = ['.png', '.jpg', '.jpeg']
      let mapPath = null
      
      for (const ext of mapExtensions) {
        const testPath = path.join(MAPS_DIR, mapName + ext)
        try {
          await fs.access(testPath)
          mapPath = testPath
          break
        } catch {}
      }
      
      if (!mapPath) {
        console.error(`❌ Map not found: ${mapName}`)
        const files = await fs.readdir(MAPS_DIR)
        console.log('Available maps:')
        files.filter(f => f.match(/\.(png|jpg|jpeg)$/i)).forEach(f => console.log(`  - ${f}`))
        process.exit(1)
      }
      
      await this.generateZonesForMap(mapPath)
    } else {
      console.log('Usage:')
      console.log('  node scripts/generate-zones.js [map-name]')
      console.log('  node scripts/generate-zones.js --all')
      console.log('')
      console.log('Examples:')
      console.log('  node scripts/generate-zones.js meadowloop')
      console.log('  node scripts/generate-zones.js --all')
    }
  }
}

if (require.main === module) {
  const generator = new ZoneGenerator()
  generator.run().catch(error => {
    console.error('❌ Script failed:', error.message)
    process.exit(1)
  })
}

module.exports = ZoneGenerator 