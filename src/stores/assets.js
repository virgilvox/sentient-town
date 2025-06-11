import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAssetStore = defineStore('assets', () => {
  // State
  const customMap = ref(null) // Base64 data URL
  const customZones = ref([]) // Array of zone objects
  const customCharacterSprites = ref({}) // Map of characterId -> base64 data URL
  
  // **UPDATED: Music tracks for the music player using real files in public/audio**
  const musicTracks = ref([])

  // Actions
  async function loadAssets() {
    // Load custom assets from localStorage first
    const savedAssets = localStorage.getItem('meadowloop-assets')
    if (savedAssets) {
      try {
        const parsed = JSON.parse(savedAssets)
        customMap.value = parsed.customMap || null
        customZones.value = parsed.customZones || []
        customCharacterSprites.value = parsed.customCharacterSprites || {}
      } catch (error) {
        console.error('❌ Failed to load custom assets:', error)
      }
    }

    // Then, load music tracks from the manifest
    try {
      const response = await fetch('/audio/manifest.json');
      if (response.ok) {
        const manifest = await response.json();
        musicTracks.value = manifest;
      } else {
        console.warn('⚠️ Could not load audio manifest, music player will be empty.');
      }
    } catch (error) {
      console.error('❌ Failed to load audio manifest:', error);
    }
  }

  function saveAssets() {
    const assets = {
      customMap: customMap.value,
      customZones: customZones.value,
      customCharacterSprites: customCharacterSprites.value
    }
    localStorage.setItem('meadowloop-assets', JSON.stringify(assets))
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
    }
  }

  // Load assets on store initialization
  loadAssets()

  return {
    customMap,
    customZones,
    customCharacterSprites,
    musicTracks,
    loadAssets,
    setCustomMap,
    setCustomSprite,
    clearCustomAssets,
    getTownExportData,
    importTownData,
  }
}) 