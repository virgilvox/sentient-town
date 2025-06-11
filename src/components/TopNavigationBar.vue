<template>
  <header class="top-nav-bar">
    <div class="logo">
      <span class="logo-icon">🏡</span>
      <h1 class="logo-title">MeadowLoop</h1>
    </div>

    <div class="nav-center">
      <MusicPlayer />
    </div>

    <div class="controls-section">
      <button
        @click="ui.toggleEditMode()"
        :class="['control-button', { active: ui.editMode }]"
      >
        <span class="icon">✏️</span>
        <span>{{ ui.editMode ? 'Finish Editing' : 'Edit Town' }}</span>
      </button>

      <div class="speed-control">
        <label for="tick-speed">Tick Speed</label>
        <div class="speed-slider-container">
          <input 
            type="range" 
            id="tick-speed" 
            v-model="localTickSpeed" 
            @input="onTickSpeedInput"
            @mousedown="isUserInteracting = true"
            @mouseup="isUserInteracting = false"
            @touchstart="isUserInteracting = true"
            @touchend="isUserInteracting = false"
            min="5"
            max="60"
            step="1"
            class="speed-slider"
          />
          <div class="speed-display">
            <span class="speed-value">{{ localTickSpeed }}s</span>
            <div class="speed-labels">
              <span class="speed-label-min">Fast (5s)</span>
              <span class="speed-label-max">Slow (60s)</span>
            </div>
          </div>
        </div>
      </div>

      <button @click="saveAll" class="control-button save-btn" :disabled="isSaving">
        <span class="icon">💾</span>
        <span>{{ isSaving ? 'Saving...' : 'Save All' }}</span>
      </button>

      <button
        @click="toggleSimulation"
        :class="['control-button', 'sim-toggle-btn', { active: simulation.state.isRunning }]"
      >
        <span class="icon">{{ simulation.state.isRunning ? '⏸️' : '▶️' }}</span>
        <span>{{ simulation.state.isRunning ? 'Pause' : 'Start' }}</span>
      </button>
    </div>

    <div class="simulation-status">
      <span :class="['status-dot', { active: simulation.state.isRunning }]"></span>
      <span class="status-text">{{ simulationStatus }}</span>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUIStore, useCharactersStore, useZonesStore, useSimulationStore } from '@/stores'
import { openAIAssets } from '@/services/openAiAssets'
import MusicPlayer from './MusicPlayer.vue'

// Store access
const ui = useUIStore()
const characters = useCharactersStore()
const zones = useZonesStore()
const simulation = useSimulationStore()

// Local state
const tickSpeedInSeconds = ref(ui.timeSpeed || 5)
const isSaving = ref(false)
const isGeneratingImages = ref(false)
const isGeneratingMap = ref(false)
const showInjectionModal = ref(false)
const localTickSpeed = ref(simulation.state.timeSpeed)
const isUserInteracting = ref(false)
const tickSpeedUpdateTimeout = ref(null)

// Initialize API key input from store
onMounted(() => {
  // Force reset loading states to prevent stuck spinners from HMR
  isSaving.value = false
  isGeneratingImages.value = false
  isGeneratingMap.value = false
  
  // Initialize tick speed
  tickSpeedInSeconds.value = ui.timeSpeed || 5
  
  // Sync local tick speed with store when component mounts
  localTickSpeed.value = simulation.state.timeSpeed
})

// Update tick speed when slider changes
function onTickSpeedInput() {
  // Clear existing timeout
  if (tickSpeedUpdateTimeout.value) {
    clearTimeout(tickSpeedUpdateTimeout.value)
  }
  
  // Debounce the update to avoid constant simulation restarts
  tickSpeedUpdateTimeout.value = setTimeout(() => {
    updateTickSpeed()
  }, 300)
}

function updateTickSpeed() {
  const newSpeed = parseInt(localTickSpeed.value)
  console.log('🎚️ Setting tick speed to:', newSpeed, 'seconds')
  simulation.setTimeSpeed(newSpeed)
  
  // Only restart simulation if it's running and user isn't currently interacting
  if (simulation.state.isRunning && !isUserInteracting.value) {
    simulation.stopSimulation()
    setTimeout(() => {
      simulation.startSimulation()
    }, 100)
  }
}

// Save all changes
async function saveAll() {
  isSaving.value = true
  
  try {
    // Save all store changes to localStorage
    characters.saveCharacterChanges()
    zones.saveZoneChanges()
    simulation.saveToLocalStorage()
    ui.saveToLocalStorage()
    
    // Show success feedback (could be a toast notification)
    console.log('All changes saved successfully')
    
    // You could add a toast notification here
    setTimeout(() => {
      isSaving.value = false
    }, 500)
    
  } catch (error) {
    console.error('Error saving changes:', error)
    isSaving.value = false
  }
}

// Toggle simulation
function toggleSimulation() {
  if (simulation.state.isRunning) {
    console.log('🛑 Stopping simulation...')
    simulation.stopSimulation()
    // Import and use the simulation engine directly
    import('@/services/simulationEngine').then(({ simulationEngine }) => {
      simulationEngine.stop()
    })
  } else {
    console.log('▶️ Starting simulation...')
    simulation.startSimulation()
    // Import and use the simulation engine directly
    import('@/services/simulationEngine').then(({ simulationEngine }) => {
      simulationEngine.start()
    })
  }
  
  ui.setSimulationRunning(simulation.state.isRunning)
  console.log('🎮 Simulation state:', simulation.state.isRunning ? 'RUNNING' : 'STOPPED')
}

// Test image generation
async function testImageGeneration() {
  isGeneratingImages.value = true
  
  try {
    // Check if API key is available
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    if (!apiKey) {
      alert('⚠️ OpenAI API key not configured.\n\nTo enable AI image generation:\n1. Add VITE_OPENAI_API_KEY to your .env file\n2. Restart the development server\n\nFor now, the app uses placeholder images.')
      return
    }
    
    console.log('🎨 Testing OpenAI image generation...')
    
    // Generate a character sprite for the first character
    if (characters.charactersList.length > 0) {
      const firstChar = characters.charactersList[0]
      console.log(`👤 Generating test sprite for ${firstChar.name}...`)
      const spriteUrl = await openAIAssets.generateCharacterSprite({
        name: firstChar.name,
        MBTI: firstChar.MBTI,
        description: firstChar.desires.join(', '),
        mentalHealth: firstChar.mentalHealth,
        desires: firstChar.desires
      })
      console.log('✅ Test sprite generated:', spriteUrl)
      
      alert(`🎉 AI image generation working!\n\nGenerated a test sprite for ${firstChar.name}.\nCheck the browser console for the image URL.\n\nYou can now use the "🎨 Generate AI Sprite" button in the Character Editor to create custom sprites for your characters!`)
    }
    
  } catch (error) {
    console.error('❌ Error testing image generation:', error)
    alert(`❌ Image generation test failed.\n\nThis could be due to:\n• Invalid or expired API key\n• OpenAI API rate limits\n• Network connectivity issues\n\nCheck the browser console for details.`)
  } finally {
    isGeneratingImages.value = false
  }
}

// Generate map
async function generateMap() {
  isGeneratingMap.value = true
  
  try {
    console.log('🗺️ Generating town map...')
    const mapUrl = await openAIAssets.generateTownMap()
    console.log('✅ Map generated:', mapUrl)
    
    alert('🗺️ Map generated successfully! Check the console for URL.')
    
  } catch (error) {
    console.error('❌ Error generating map:', error)
    alert('❌ Failed to generate map. Check console for details.')
  } finally {
    isGeneratingMap.value = false
  }
}

// Status indicators
const isApiKeyValid = computed(() => {
  // Check user-provided key first
  if (ui.claudeApiKey && ui.claudeApiKey.length > 10) {
    return true
  }
  
  // Check environment variables
  const envKey = import.meta.env.VITE_CLAUDE_API_KEY
  if (envKey && envKey.trim().length > 10) {
    return true
  }
  
  return false
})

const simulationStatus = computed(() => {
  // Check user-provided key first
  if (ui.claudeApiKey && ui.claudeApiKey.length > 10) {
    return simulation.state.isRunning ? 'Running' : 'Stopped'
  }
  
  // Check environment variables
  const envKey = import.meta.env.VITE_CLAUDE_API_KEY
  if (envKey && envKey.trim().length > 10) {
    return simulation.state.isRunning ? 'Running' : 'API keys loaded from env'
  }
  
  return 'API key required'
})

watch(
  () => simulation.state.timeSpeed,
  (newValue) => {
    if (!isUserInteracting.value) {
      localTickSpeed.value = newValue
    }
  }
)
</script>

<style scoped>
.top-nav-bar {
  display: flex;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 24px;
}

.logo-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a202c;
}

.nav-center {
  margin-left: auto;
  margin-right: 20px;
}

.controls-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #cbd5e0;
  background-color: white;
  color: #2d3748;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.control-button:hover {
  background-color: #f7fafc;
  border-color: #a0aec0;
}

.control-button.active {
  background-color: #4299e1;
  border-color: #4299e1;
  color: white;
}

.control-button .icon {
  font-size: 16px;
}

.speed-control {
  margin: 0 15px;
}

.speed-control label {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
}

.speed-slider-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 120px;
}

.speed-slider {
  width: 100%;
  height: 4px;
  background: #e9ecef;
  outline: none;
  border-radius: 2px;
  appearance: none;
  cursor: pointer;
}

.speed-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.speed-slider::-webkit-slider-thumb:hover {
  background: #0056b3;
}

.speed-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #007bff;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.speed-slider::-moz-range-thumb:hover {
  background: #0056b3;
}

.speed-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.speed-value {
  font-size: 11px;
  font-weight: 600;
  color: #495057;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
  min-width: 30px;
  text-align: center;
}

.speed-labels {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 9px;
  color: #adb5bd;
}

.speed-label-min,
.speed-label-max {
  font-weight: 500;
}

.simulation-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 24px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #e53e3e;
  transition: background-color 0.3s;
}

.status-dot.active {
  background-color: #48bb78;
  box-shadow: 0 0 8px rgba(72, 187, 120, 0.7);
}

.status-text {
  font-size: 14px;
  color: #4a5568;
  font-weight: 500;
}
</style> 