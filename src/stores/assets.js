import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAssetStore = defineStore('assets', () => {
  // State
  const customMap = ref(null) // Base64 data URL
  const customZones = ref([]) // Array of zone objects
  const customCharacterSprites = ref({}) // Map of characterId -> base64 data URL

  // Actions
  function loadAssets() {
    const savedAssets = localStorage.getItem('meadowloop-assets')
    if (savedAssets) {
      try {
        const parsed = JSON.parse(savedAssets)
        customMap.value = parsed.customMap || null
        customZones.value = parsed.customZones || []
        customCharacterSprites.value = parsed.customCharacterSprites || {}
        console.log('✅ Loaded custom assets from localStorage')
      } catch (error) {
        console.error('❌ Failed to load custom assets:', error)
      }
    }
  }

  function saveAssets() {
    const assets = {
      customMap: customMap.value,
      customZones: customZones.value,
      customCharacterSprites: customCharacterSprites.value
    }
    localStorage.setItem('meadowloop-assets', JSON.stringify(assets))
    console.log('💾 Saved custom assets to localStorage')
  }

  function setCustomMap(mapDataUrl, zonesData) {
    customMap.value = mapDataUrl
    customZones.value = zonesData
    saveAssets()
  }

  function setCustomSprite(characterId, spriteDataUrl) {
    customCharacterSprites.value[characterId] = spriteDataUrl
    saveAssets()
  }

  function clearCustomAssets() {
    customMap.value = null
    customZones.value = []
    customCharacterSprites.value = {}
    localStorage.removeItem('meadowloop-assets')
    console.log('🗑️ Cleared all custom assets')
  }

  function getTownExportData() {
    return {
      customMap: customMap.value,
      customZones: customZones.value,
      customCharacterSprites: customCharacterSprites.value,
    }
  }

  function importTownData(data) {
    if (data.assets) {
      customMap.value = data.assets.customMap || null
      customZones.value = data.assets.customZones || []
      customCharacterSprites.value = data.assets.customCharacterSprites || {}
      saveAssets()
      console.log('✅ Imported custom assets')
    }
  }

  // Load assets on store initialization
  loadAssets()

  return {
    customMap,
    customZones,
    customCharacterSprites,
    loadAssets,
    setCustomMap,
    setCustomSprite,
    clearCustomAssets,
    getTownExportData,
    importTownData,
  }
}) 