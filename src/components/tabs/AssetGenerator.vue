<template>
  <div class="asset-generator">
    <div class="generator-header">
      <h3>🎨 Asset Generator</h3>
      <p>Create custom AI-generated maps and character sprites for your town.</p>
      
      <!-- Smart Resolution Info -->
      <div class="smart-resolution-info">
        <h4>💡 Smart Resolution System</h4>
        <div class="info-grid">
          <div class="info-item">
            <strong>🗺️ Maps:</strong> Uses DALL-E 3 at 1024x1024, then resizes to your chosen display size for optimal web performance.
          </div>
          <div class="info-item">
            <strong>👤 Sprites:</strong> Uses DALL-E 2 at 512x512, then resizes to your chosen sprite size for efficient storage.
          </div>
          <div class="info-item">
            <strong>📊 Storage Savings:</strong> Reduces file sizes by 70-90% compared to full-resolution outputs while maintaining visual quality.
          </div>
        </div>
      </div>
      
      <!-- Storage Usage Indicator -->
      <div class="storage-indicator">
        <div class="storage-info">
          <span class="storage-label">Browser Storage:</span>
          <span class="storage-usage" :class="storageUsageClass">
            {{ storageUsageText }}
          </span>
        </div>
        <div class="storage-bar">
          <div 
            class="storage-fill" 
            :style="{ width: storagePercentage + '%' }"
            :class="storageUsageClass"
          ></div>
        </div>
      </div>
    </div>

    <!-- Map Generation -->
    <div class="section">
      <h4>🗺️ Town Map</h4>
      
      <!-- Zone Requirements -->
      <div class="subsection">
        <h5>📍 Required Zones</h5>
        <p class="help-text">Specify which zones you want included in the generated map:</p>
        
        <div class="zones-manager">
          <div class="zones-grid">
            <div 
              v-for="(zone, index) in requiredZones" 
              :key="index"
              class="zone-card"
            >
              <div class="zone-header">
                <div class="zone-main-info">
                  <input 
                    v-model="zone.name"
                    class="zone-name-input"
                    placeholder="Zone name..."
                  />
                  <select v-model="zone.type" class="zone-type-select">
                    <option value="shop">🏪 Shop</option>
                    <option value="home">🏠 Home</option>
                    <option value="public">🏛️ Public</option>
                    <option value="park">🌳 Park</option>
                    <option value="street">🛣️ Street</option>
                  </select>
                </div>
                <button @click="removeZone(index)" class="remove-zone-btn" title="Remove zone">
                  ❌
                </button>
              </div>
              
              <div class="zone-description">
                <textarea 
                  v-model="zone.description"
                  class="zone-desc-textarea"
                  placeholder="Optional description (e.g., 'Cozy bakery specializing in herbal remedies')"
                  rows="2"
                ></textarea>
              </div>
            </div>
          </div>
          
          <div class="zone-actions">
            <button @click="addZone" class="add-zone-btn">
              ➕ Add Zone
            </button>
            <button @click="resetToDefaults" class="reset-zones-btn">
              🔄 Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="map-prompt">Map Style Prompt:</label>
        <textarea
          id="map-prompt"
          v-model="mapPrompt"
          class="prompt-textarea"
          rows="3"
          placeholder="Describe the visual style and atmosphere you want for the town map."
        ></textarea>
      </div>
      
      <div class="form-group">
        <label for="map-resolution">Map Display Resolution:</label>
        <select id="map-resolution" v-model="mapDisplaySize" class="char-select">
          <option value="600">600px (Small - Fast Loading, ~200KB)</option>
          <option value="800">800px (Standard - Balanced, ~400KB)</option>
          <option value="1024">1024px (High Quality - Large, ~800KB)</option>
        </select>
        <p class="help-text">💡 Larger resolutions provide better quality but use more storage space.</p>
      </div>
      
      <button @click="generateMap" :disabled="isGeneratingMap" class="generate-btn">
        {{ isGeneratingMap ? '🗺️ Generating Map...' : '🗺️ Generate New Map' }}
      </button>
      <div v-if="generatedMapUrl" class="preview-area">
        <h5>Map Preview</h5>
        <img :src="generatedMapUrl" alt="Generated Map" class="map-preview" />
        <p class="help-text">The new map and its zones are now active in the simulation.</p>
      </div>
    </div>

    <!-- Character Sprite Generation -->
    <div class="section">
      <h4>👤 Character Sprite</h4>
      <div class="form-group">
        <label for="char-select">Select Character:</label>
        <select v-model="selectedCharacterId" class="char-select" :disabled="!characters.isLoaded">
          <option value="">{{ characters.isLoaded ? 'Select a character...' : 'Loading...' }}</option>
          <option v-for="char in characters.charactersList" :key="char.id" :value="char.id">
            {{ char.name }}
          </option>
        </select>
      </div>
       <div v-if="selectedCharacter" class="form-group">
        <label for="sprite-prompt">Sprite Prompt:</label>
        <textarea
          id="sprite-prompt"
          v-model="spritePrompt"
          class="prompt-textarea"
          rows="4"
          placeholder="Describe the character's appearance, clothing, and posture."
        ></textarea>
      </div>
      
      <div v-if="selectedCharacterId" class="form-group">
        <label for="sprite-resolution">Sprite Resolution:</label>
        <select id="sprite-resolution" v-model="spriteTargetSize" class="char-select">
          <option value="96">96x96 (Small - Fast Loading, ~50KB)</option>
          <option value="128">128x128 (Standard - Balanced, ~80KB)</option>
          <option value="192">192x192 (Large - High Detail, ~150KB)</option>
        </select>
        <p class="help-text">💡 Uses DALL-E 2 at 512x512, then resizes for optimal storage. 128x128 is recommended for most games.</p>
      </div>
      
      <button @click="generateSprite" :disabled="!selectedCharacterId || isGeneratingSprite" class="generate-btn">
        {{ isGeneratingSprite ? '👤 Generating Sprite...' : '👤 Generate Sprite' }}
      </button>
       <div v-if="generatedSpriteUrl" class="preview-area">
        <h5>Sprite Preview</h5>
        <img :src="generatedSpriteUrl" alt="Generated Sprite" class="sprite-preview" />
        <p class="help-text">The new sprite for {{ selectedCharacter.name }} is now active.</p>
      </div>
    </div>
    
    <!-- Town Data Management -->
    <div class="section">
      <h4>💾 Town Data</h4>
       <div class="data-actions">
        <button @click="exportTown" class="tool-btn">📤 Export Town Data</button>
        <button @click="triggerImport" class="tool-btn">📥 Import Town Data</button>
        <input type="file" ref="importFile" @change="importTown" style="display: none" accept=".json"/>
        <button @click="clearAssets" class="tool-btn danger">🗑️ Clear All Custom Assets</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAssetStore } from '@/stores/assets'
import { useCharactersStore, useZonesStore, useSimulationStore } from '@/stores'
import { openAIAssets } from '@/services/openAiAssets'
import claudeApi from '@/services/claudeApi'

const assetStore = useAssetStore()
const characters = useCharactersStore()
const zones = useZonesStore()
const simulation = useSimulationStore()

const mapPrompt = ref('A charming pixel art town with cobblestone paths, cozy buildings, parks, and shops')
const isGeneratingMap = ref(false)
const generatedMapUrl = ref('')
const generatedMapInfo = ref('')

const selectedCharacterId = ref('')
const selectedCharacter = computed(() => characters.getCharacter(selectedCharacterId.value))
const spritePrompt = ref('')
const spriteTargetSize = ref(128) // Default sprite size
const isGeneratingSprite = ref(false)
const generatedSpriteUrl = ref(null)

const mapDisplaySize = ref(800) // Default map display size
const importFile = ref(null)
const storageUsage = ref({ used: 0, total: 5 * 1024 * 1024 }) // 5MB default

const storagePercentage = computed(() => {
  return Math.min(100, (storageUsage.value.used / storageUsage.value.total) * 100)
})

const storageUsageClass = computed(() => {
  const percentage = storagePercentage.value
  if (percentage >= 90) return 'storage-critical'
  if (percentage >= 75) return 'storage-warning'
  if (percentage >= 50) return 'storage-medium'
  return 'storage-good'
})

const storageUsageText = computed(() => {
  const usedMB = (storageUsage.value.used / 1024 / 1024).toFixed(1)
  const totalMB = (storageUsage.value.total / 1024 / 1024).toFixed(0)
  return `${usedMB}MB / ${totalMB}MB (${Math.round(storagePercentage.value)}%)`
})

// Zone management
const requiredZones = ref([])

// Default zones to populate on component mount
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

function updateStorageUsage() {
  try {
    const currentSize = JSON.stringify(localStorage).length
    storageUsage.value.used = currentSize
  } catch (error) {
    console.warn('Could not calculate storage usage:', error)
  }
}

// Update storage usage on mount and periodically
onMounted(() => {
  updateStorageUsage()
  
  // Force reset loading states to prevent stuck spinners from HMR
  isGeneratingMap.value = false
  isGeneratingSprite.value = false
  
  // Update every 10 seconds when component is visible
  const interval = setInterval(updateStorageUsage, 10000)
  onUnmounted(() => clearInterval(interval))

  // Initialize with default zones on component mount
  resetToDefaults()
})

// Update storage usage after generating assets
watch([generatedMapUrl, generatedSpriteUrl], updateStorageUsage)

watch(selectedCharacter, (newChar) => {
  if (newChar) {
    spritePrompt.value = `Create a character sprite for ${newChar.name} in a cozy life simulation game.

PERSONALITY: ${newChar.description}
MBTI TYPE: ${newChar.MBTI}
DESIRES: ${newChar.desires?.join(', ') || 'living peacefully'}
MENTAL STATE: ${newChar.mentalHealth?.join(', ') || 'content'}

VISUAL REQUIREMENTS:
- Cartoonish, anime-inspired style (like Animal Crossing or Stardew Valley)
- Bright, vibrant colors with clear contrast
- Full body character, facing forward
- Friendly, approachable expression
- Simple, clean art style
- Plain background (white or light blue)
- Character should reflect their personality through clothing and posture`
  } else {
    spritePrompt.value = ''
  }
})

// Zone management methods
function addZone() {
  requiredZones.value.push({
    name: '',
    type: 'shop',
    description: ''
  })
}

function removeZone(index) {
  requiredZones.value.splice(index, 1)
}

function resetToDefaults() {
  requiredZones.value = [...defaultZones]
}

// Enhanced map generation with zone requirements
async function generateMap() {
  isGeneratingMap.value = true
  try {
    // Build enhanced prompt that includes zone requirements
    const zoneDescriptions = requiredZones.value
      .filter(zone => zone.name.trim())
      .map(zone => {
        let desc = `${zone.name} (${zone.type})`
        if (zone.description.trim()) {
          desc += `: ${zone.description}`
        }
        return desc
      })
      .join(', ')
    
    const enhancedPrompt = `${mapPrompt.value}. 
    
REQUIRED ZONES TO INCLUDE: ${zoneDescriptions}

Create a coherent town layout that includes all the specified zones in logical positions. Make sure each zone is visually distinct and appropriately sized for its purpose.`

    const result = await openAIAssets.generateTownMapWithZones(enhancedPrompt, mapDisplaySize.value)
    
    generatedMapUrl.value = result.mapImageUrl
    generatedMapInfo.value = result.info || 'Map generated successfully'
    
    // Store the generated map in the asset store so it applies to the simulation
    assetStore.setCustomMap(result.mapImageUrl, result.zones || [])
    console.log('✅ Applied generated map to simulation')

    // If we got zones, update the zones store
    if (result.zones && Array.isArray(result.zones)) {
      console.log('✅ Adding generated zones to store:', result.zones)
      result.zones.forEach(zone => zones.addZone(zone))
    }
    
    console.log('✅ Map generation completed with zone requirements')
  } catch (error) {
    console.error('❌ Map generation failed:', error)
    alert('Failed to generate map. Please check your OpenAI API key and try again.')
  } finally {
    isGeneratingMap.value = false
  }
}

async function generateSprite() {
  if (!selectedCharacter.value) return
  
  isGeneratingSprite.value = true
  generatedSpriteUrl.value = null
  
  try {
    console.log(`🎨 Generating sprite for ${selectedCharacter.value.name}...`)
    
    const spriteBase64 = await openAIAssets.generateCharacterSprite({
      ...selectedCharacter.value,
      description: spritePrompt.value,
    }, spriteTargetSize.value)
    
    // Store the sprite in the asset store
    assetStore.setCustomSprite(selectedCharacter.value.id, spriteBase64)
    generatedSpriteUrl.value = spriteBase64

    console.log(`✅ Sprite generated successfully for ${selectedCharacter.value.name}`)
    alert(`👤 New sprite for ${selectedCharacter.value.name} generated and applied!`)
    
  } catch (error) {
    console.error(`❌ Failed to generate sprite for ${selectedCharacter.value.name}:`, error)
    alert(`❌ Failed to generate sprite: ${error.message}`)
  } finally {
    isGeneratingSprite.value = false
  }
}

function exportTown() {
  const townData = {
    characters: characters.characters,
    zones: zones.zones,
    simulation: simulation.$state,
    assets: assetStore.getTownExportData()
  }
  
  const dataStr = JSON.stringify(townData, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sentient-town-export.json'
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  importFile.value.click()
}

function importTown(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      
      // Import into each store
      characters.characters.value = data.characters
      zones.zones.value = data.zones
      Object.assign(simulation.$state, data.simulation)
      assetStore.importTownData(data)

      characters.saveCharacterChanges()
      zones.saveZoneChanges()
      simulation.saveToLocalStorage()

      alert('✅ Town data imported successfully! The application will now reload.')
      window.location.reload()

    } catch (error) {
      console.error('Failed to import town data:', error)
      alert('❌ Invalid town data file.')
    }
  }
  reader.readAsText(file)
}

function clearAssets() {
  if (confirm('Are you sure you want to clear all custom assets and revert to defaults?')) {
    assetStore.clearCustomAssets()
    alert('🗑️ Custom assets cleared. The application will now reload.')
    window.location.reload()
  }
}
</script>

<style scoped>
.asset-generator {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}
.generator-header {
  margin-bottom: 20px;
}
.generator-header h3 {
  margin: 0 0 8px 0;
}
.generator-header p {
  margin: 0;
  color: #6c757d;
}
.section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid #e3e3e3;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
}
.section h4 {
  margin: 0 0 15px 0;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 5px;
}
.prompt-textarea, .char-select {
  width: 100%;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ced4da;
}
.generate-btn {
  padding: 10px 15px;
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.generate-btn:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}
.preview-area {
  margin-top: 15px;
}
.map-preview {
  max-width: 100%;
  height: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.sprite-preview {
  width: 64px;
  height: 64px;
  border: 1px solid #ddd;
  image-rendering: pixelated;
}
.help-text {
  font-size: 12px;
  color: #6c757d;
  margin-top: 5px;
}
.data-actions {
  display: flex;
  gap: 10px;
}
.tool-btn {
  padding: 10px 15px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.tool-btn.danger {
  background-color: #e53e3e;
}
.storage-indicator {
  margin-top: 10px;
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}
.storage-info {
  margin-bottom: 10px;
}
.storage-label {
  font-weight: 500;
}
.storage-usage {
  font-size: 14px;
  font-weight: 500;
}
.storage-usage.storage-good {
  color: #48bb78;
}
.storage-usage.storage-medium {
  color: #ed8936;
}
.storage-usage.storage-warning {
  color: #f6ad55;
}
.storage-usage.storage-critical {
  color: #e53e3e;
}
.storage-bar {
  height: 20px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}
.storage-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}
.storage-fill.storage-good {
  background-color: #48bb78;
}
.storage-fill.storage-medium {
  background-color: #f6e05e;
}
.storage-fill.storage-warning {
  background-color: #f6ad55;
}
.storage-fill.storage-critical {
  background-color: #e53e3e;
}
.subsection {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.7);
}
.zones-manager {
  width: 100%;
  max-width: 100%;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  background: white;
  overflow: hidden;
}
.zones-grid {
  margin-bottom: 1rem;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
}
.zone-card {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}
.zone-card:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
}
.zone-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}
.zone-main-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.zone-name-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  background: white;
}
.zone-name-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}
.zone-type-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}
.zone-type-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}
.remove-zone-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 12px;
  flex-shrink: 0;
  height: fit-content;
}
.remove-zone-btn:hover {
  background: #c82333;
}
.zone-description {
  width: 100%;
}
.zone-desc-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}
.zone-desc-textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}
.zone-desc-textarea::placeholder {
  color: #6c757d;
  font-style: italic;
}
.zone-actions {
  display: flex;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid #e9ecef;
  margin-top: 8px;
}
.add-zone-btn {
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.add-zone-btn:hover {
  background: #218838;
  transform: translateY(-1px);
}
.reset-zones-btn {
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.reset-zones-btn:hover {
  background: #5a6268;
  transform: translateY(-1px);
}
.smart-resolution-info {
  margin: 15px 0;
  padding: 15px;
  background: linear-gradient(135deg, #e8f4fd 0%, #f0f8f0 100%);
  border-radius: 8px;
  border: 1px solid #a8d8ea;
}
.smart-resolution-info h4 {
  margin: 0 0 12px 0;
  color: #2c5282;
  font-size: 16px;
}
.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
@media (min-width: 768px) {
  .info-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}
.info-item {
  padding: 10px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  border-left: 4px solid #48bb78;
  font-size: 14px;
  line-height: 1.4;
}
.info-item strong {
  display: block;
  margin-bottom: 4px;
  color: #2d3748;
}
</style> 