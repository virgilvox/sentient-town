import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAssetStore } from './assets'

export const useZonesStore = defineStore('zones', () => {
  // State
  const zones = ref([])
  const originalZones = ref([])
  const mapData = ref({
    width: 800,
    height: 600,
    tileSize: 16,
    backgroundImage: '/map/map.png'
  })
  const isLoaded = ref(false)

  // Getters
  const getZone = computed(() => (id) => 
    zones.value.find(zone => zone.id === id)
  )
  
  const getZoneAt = computed(() => (x, y) => 
    zones.value.find(zone => 
      zone.tiles.some(tile => tile.x === x && tile.y === y)
    )
  )
  
  const getZonesByType = computed(() => (type) =>
    zones.value.filter(zone => zone.type === type)
  )
  
  const getZonesByOwner = computed(() => (ownerId) =>
    zones.value.filter(zone => zone.owner === ownerId)
  )

  // Computed properties for zone editor
  const zonesList = computed(() => zones.value)

  // Actions
  async function loadZones() {
    // Debug and potentially clear problematic localStorage
    try {
      const savedChanges = localStorage.getItem('meadowloop-zones')
      if (savedChanges) {
        console.log('🗺️ Found saved zone changes:', savedChanges.substring(0, 100) + '...')
        const parsed = JSON.parse(savedChanges)
        console.log('🗺️ Parsed saved changes:', parsed)
        
        // Validate the structure of saved changes
        if (parsed && typeof parsed === 'object') {
          // Check if the saved changes have the expected structure
          const hasValidStructure = (
            (!parsed.added || Array.isArray(parsed.added)) &&
            (!parsed.modified || Array.isArray(parsed.modified)) &&
            (!parsed.deleted || Array.isArray(parsed.deleted))
          )
          
          if (!hasValidStructure) {
            console.warn('🗺️ Invalid localStorage structure detected, clearing...')
            localStorage.removeItem('meadowloop-zones')
          }
        }
      }
    } catch (storageError) {
      console.warn('🗺️ Corrupted localStorage detected, clearing:', storageError)
      localStorage.removeItem('meadowloop-zones')
    }
    
    const assetStore = useAssetStore()
    if (assetStore.customZones && assetStore.customZones.length > 0) {
      console.log('🗺️ Loading custom zones from asset store...')
      zones.value = assetStore.customZones
      isLoaded.value = true
      return
    }

    try {
      console.log('🗺️ Attempting to load zones from /map/zones.json...')
      const response = await fetch('/map/zones.json')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('🗺️ Loaded zones data:', data)
      console.log('🗺️ Data type:', typeof data)
      console.log('🗺️ Data.zones exists:', 'zones' in data)
      console.log('🗺️ Data.zones type:', typeof data.zones)
      console.log('🗺️ Data.zones is array:', Array.isArray(data.zones))
      
      // Validate the data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid zones data: not an object')
      }
      
      // Handle different possible data structures
      let zonesArray = []
      if (Array.isArray(data)) {
        // Data is directly an array of zones
        zonesArray = data
        console.log('🗺️ Zones data is a direct array')
      } else if (data.zones && Array.isArray(data.zones)) {
        // Data has a zones property with array
        zonesArray = data.zones
        console.log('🗺️ Zones data has zones property')
      } else {
        throw new Error('Invalid zones data: no zones array found')
      }
      
      console.log('🗺️ About to assign zonesArray:', zonesArray)
      console.log('🗺️ ZonesArray length:', zonesArray.length)
      console.log('🗺️ ZonesArray is array:', Array.isArray(zonesArray))
      
      try {
        originalZones.value = zonesArray
        console.log('🗺️ Successfully assigned to originalZones')
      } catch (assignError) {
        console.error('🗺️ Error assigning to originalZones:', assignError)
        throw assignError
      }
      
      // Load any modifications from localStorage
      const savedChanges = localStorage.getItem('meadowloop-zones')
      if (savedChanges) {
        try {
          const changes = JSON.parse(savedChanges)
          zones.value = mergeZoneChanges(zonesArray, changes)
          console.log('🗺️ Applied saved zone changes')
        } catch (parseError) {
          console.warn('🗺️ Failed to parse saved zone changes, using original zones:', parseError)
          zones.value = [...zonesArray]
        }
      } else {
        zones.value = [...zonesArray]
      }
      
      console.log(`🗺️ Successfully loaded ${zones.value.length} zones`)
      isLoaded.value = true
      
    } catch (error) {
      console.warn('🗺️ Failed to load zones from file:', error.message)
      console.log('🗺️ Creating default zones as fallback...')
      
      // Create default zones as fallback
      const defaultZones = [
        {
          id: 'town-center',
          name: 'Town Center',
          type: 'public',
          tiles: [
            { x: 24, y: 18 }, { x: 25, y: 18 }, { x: 26, y: 18 },
            { x: 24, y: 19 }, { x: 25, y: 19 }, { x: 26, y: 19 },
            { x: 24, y: 20 }, { x: 25, y: 20 }, { x: 26, y: 20 }
          ],
          description: 'Central gathering place of the town'
        },
        {
          id: 'residential-area',
          name: 'Residential Area',
          type: 'home',
          tiles: [
            { x: 8, y: 25 }, { x: 9, y: 25 }, { x: 10, y: 25 }, { x: 11, y: 25 },
            { x: 8, y: 26 }, { x: 9, y: 26 }, { x: 10, y: 26 }, { x: 11, y: 26 },
            { x: 8, y: 27 }, { x: 9, y: 27 }, { x: 10, y: 27 }, { x: 11, y: 27 }
          ],
          description: 'Cozy homes where townsfolk live'
        },
        {
          id: 'market-street',
          name: 'Market Street',
          type: 'street',
          tiles: [
            { x: 15, y: 18 }, { x: 16, y: 18 }, { x: 17, y: 18 }, { x: 18, y: 18 },
            { x: 19, y: 18 }, { x: 20, y: 18 }, { x: 21, y: 18 }, { x: 22, y: 18 }
          ],
          description: 'Main thoroughfare connecting key locations'
        },
        {
          id: 'town-park',
          name: 'Town Park',
          type: 'park',
          tiles: [
            { x: 30, y: 15 }, { x: 31, y: 15 }, { x: 32, y: 15 }, { x: 33, y: 15 },
            { x: 30, y: 16 }, { x: 31, y: 16 }, { x: 32, y: 16 }, { x: 33, y: 16 },
            { x: 30, y: 17 }, { x: 31, y: 17 }, { x: 32, y: 17 }, { x: 33, y: 17 }
          ],
          description: 'Green space with trees and paths for relaxation'
        }
      ]
      
      originalZones.value = defaultZones
      zones.value = [...defaultZones]
      
      console.log(`🗺️ Created ${defaultZones.length} default zones`)
      isLoaded.value = true
    }
  }

  function addZone(zone) {
    zones.value.push(zone)
    saveZoneChanges()
  }

  function updateZone(zoneId, updates) {
    const index = zones.value.findIndex(z => z.id === zoneId)
    if (index === -1) {
      console.error(`Zone with id ${zoneId} not found`)
      return
    }

    // Update zone while preserving its ID
    zones.value[index] = {
      ...zones.value[index],
      ...updates,
      id: zoneId // Ensure ID is preserved
    }
    
    saveZoneChanges()
  }

  function deleteZone(zoneName) {
    zones.value = zones.value.filter(z => z.name !== zoneName)
    saveZoneChanges()
  }

  function addTilesToZone(zoneId, tiles) {
    const zone = zones.value.find(z => z.id === zoneId)
    if (zone) {
      // Remove duplicates and add new tiles
      const existingTiles = new Set(zone.tiles.map(t => `${t.x},${t.y}`))
      const newTiles = tiles.filter(t => !existingTiles.has(`${t.x},${t.y}`))
      zone.tiles.push(...newTiles)
      saveZoneChanges()
    }
  }

  function removeTilesFromZone(zoneId, tiles) {
    const zone = zones.value.find(z => z.id === zoneId)
    if (zone) {
      const tilesToRemove = new Set(tiles.map(t => `${t.x},${t.y}`))
      zone.tiles = zone.tiles.filter(t => !tilesToRemove.has(`${t.x},${t.y}`))
      saveZoneChanges()
    }
  }

  function isPositionInZone(x, y, zoneId) {
    const zone = getZone(zoneId)
    return zone?.tiles.some(tile => tile.x === x && tile.y === y) || false
  }

  function getZoneBounds(zoneId) {
    const zone = getZone(zoneId)
    if (!zone || zone.tiles.length === 0) return null

    const xs = zone.tiles.map(t => t.x)
    const ys = zone.tiles.map(t => t.y)
    
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    }
  }

  function saveZoneChanges() {
    // Calculate diff from original data
    const changes = {
      added: zones.value.filter(zone => 
        !originalZones.value.some(orig => orig.id === zone.id)
      ),
      modified: zones.value.filter(zone => {
        const original = originalZones.value.find(orig => orig.id === zone.id)
        return original && JSON.stringify(original) !== JSON.stringify(zone)
      }),
      deleted: originalZones.value.filter(orig => 
        !zones.value.some(zone => zone.id === orig.id)
      ).map(zone => zone.id)
    }
    
    localStorage.setItem('meadowloop-zones', JSON.stringify(changes))
  }

  function resetZones() {
    zones.value = [...originalZones.value]
    localStorage.removeItem('meadowloop-zones')
  }

  // Zone editor specific methods
  function removeZone(zoneName) {
    const zoneIndex = zones.value.findIndex(zone => zone.name === zoneName)
    if (zoneIndex !== -1) {
      zones.value.splice(zoneIndex, 1)
      saveZoneChanges()
    }
  }

  function clearAllZones() {
    zones.value = []
    saveZoneChanges()
  }

  function importZones(importedZones) {
    // Validate and convert imported zones
    const validZones = importedZones.map(zone => ({
      id: zone.id || `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: zone.name || 'Unnamed Zone',
      type: zone.type || 'public',
      tiles: zone.tiles || [],
      description: zone.description || '',
      owner: zone.owner
    }))
    
    zones.value = validZones
    saveZoneChanges()
  }

  // Helper functions
  function mergeZoneChanges(original, changes) {
    let result = [...original]
    
    // Apply modifications
    if (changes.modified) {
      changes.modified.forEach((modifiedZone) => {
        const index = result.findIndex(z => z.id === modifiedZone.id)
        if (index !== -1) {
          result[index] = modifiedZone
        }
      })
    }
    
    // Remove deleted zones
    if (changes.deleted) {
      result = result.filter(zone => !changes.deleted.includes(zone.id))
    }
    
    // Add new zones
    if (changes.added) {
      result.push(...changes.added)
    }
    
    return result
  }

  async function initializeStore() {
    await loadZones()
  }

  return {
    // State
    zones,
    mapData,
    isLoaded,
    
    // Getters
    getZone,
    getZoneAt,
    getZonesByType,
    getZonesByOwner,
    
    // Computed properties for zone editor
    zonesList,
    
    // Actions
    initializeStore,
    loadZones,
    addZone,
    updateZone,
    deleteZone,
    addTilesToZone,
    removeTilesFromZone,
    isPositionInZone,
    getZoneBounds,
    saveZoneChanges,
    resetZones,
    removeZone,
    clearAllZones,
    importZones
  }
}) 