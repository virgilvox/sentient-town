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
    const assetStore = useAssetStore()
    if (assetStore.customZones && assetStore.customZones.length > 0) {
      console.log('🗺️ Loading custom zones from asset store...')
      zones.value = assetStore.customZones
      isLoaded.value = true
      return
    }

    try {
      const response = await fetch('/map/zones.json')
      const data = await response.json()
      
      originalZones.value = data.zones
      
      // Load any modifications from localStorage
      const savedChanges = localStorage.getItem('sentient-town-zones')
      if (savedChanges) {
        const changes = JSON.parse(savedChanges)
        zones.value = mergeZoneChanges(data.zones, changes)
      } else {
        zones.value = [...data.zones]
      }
      
      isLoaded.value = true
    } catch (error) {
      console.error('Failed to load zones:', error)
      throw error
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
    
    localStorage.setItem('sentient-town-zones', JSON.stringify(changes))
  }

  function resetZones() {
    zones.value = [...originalZones.value]
    localStorage.removeItem('sentient-town-zones')
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