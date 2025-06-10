<template>
  <div class="settings-panel">
    <div class="settings-header">
      <h3>⚙️ Settings & Data Management</h3>
      <p>Manage simulation data, reset options, and system preferences</p>
    </div>

    <div class="settings-content">
      <!-- API Keys Configuration -->
      <div class="section">
        <h4>🔑 API Keys</h4>
        <p class="help-text">Enter your own API keys or leave blank to use environment variables (if configured)</p>
        
        <div class="api-keys-grid">
          <div class="api-key-group">
            <label for="claude-key">Claude API Key:</label>
            <div class="key-input-wrapper">
              <input 
                id="claude-key"
                v-model="claudeApiKey" 
                type="password"
                placeholder="sk-ant-... (optional)"
                class="api-key-input"
                @blur="updateClaudeApiKey"
              />
              <div class="key-status">
                <span v-if="claudeKeyStatus === 'user'" class="status-badge user">👤 User Key</span>
                <span v-else-if="claudeKeyStatus === 'env'" class="status-badge env">🔧 Environment</span>
                <span v-else class="status-badge none">❌ Not Set</span>
              </div>
            </div>
          </div>

          <div class="api-key-group">
            <label for="openai-key">OpenAI API Key:</label>
            <div class="key-input-wrapper">
              <input 
                id="openai-key"
                v-model="openaiApiKey" 
                type="password"
                placeholder="sk-... (optional)"
                class="api-key-input"
                @blur="updateOpenAIApiKey"
              />
              <div class="key-status">
                <span v-if="openaiKeyStatus === 'user'" class="status-badge user">👤 User Key</span>
                <span v-else-if="openaiKeyStatus === 'env'" class="status-badge env">🔧 Environment</span>
                <span v-else class="status-badge none">❌ Not Set</span>
              </div>
            </div>
          </div>
        </div>

        <div class="api-key-actions">
          <button @click="testClaudeConnection" :disabled="isTestingClaude" class="test-btn">
            {{ isTestingClaude ? '🔍 Testing Claude...' : '🔍 Test Claude' }}
          </button>
          <button @click="clearApiKeys" class="clear-btn">
            🗑️ Clear User Keys
          </button>
        </div>
      </div>

      <!-- Quick Reset Actions -->
      <div class="section danger-section">
        <h4>🔄 Quick Reset Actions</h4>
        <div class="quick-actions">
          <button @click="resetEverything" class="reset-btn danger-btn">
            🗑️ Reset Everything
          </button>
          <button @click="resetSimulationData" class="reset-btn warning-btn">
            🔄 Reset Simulation Only
          </button>
          <button @click="resetToDefaults" class="reset-btn info-btn">
            🏠 Reset to Factory Defaults
          </button>
        </div>
        <p class="warning-text">
          ⚠️ These actions cannot be undone. Use with caution!
        </p>
      </div>

      <!-- Granular Data Management -->
      <div class="section">
        <h4>🎯 Granular Data Management</h4>
        <div class="data-categories">
          
          <!-- Characters & Memories -->
          <div class="category-card">
            <div class="category-header">
              <h5>👤 Characters & Memories</h5>
              <span class="data-count">{{ characterDataCount }}</span>
            </div>
            <div class="category-actions">
              <button @click="clearMemories" class="action-btn">
                🧠 Clear All Memories
              </button>
              <button @click="resetCharacters" class="action-btn">
                🔄 Reset Characters
              </button>
              <button @click="clearRelationships" class="action-btn">
                💔 Clear Relationships
              </button>
            </div>
          </div>

          <!-- Conversations -->
          <div class="category-card">
            <div class="category-header">
              <h5>💬 Conversations</h5>
              <span class="data-count">{{ conversationDataCount }}</span>
            </div>
            <div class="category-actions">
              <button @click="clearConversations" class="action-btn">
                🗑️ Clear All Conversations
              </button>
              <button @click="clearActiveConversations" class="action-btn">
                ⏹️ End Active Conversations
              </button>
            </div>
          </div>

          <!-- Events & History -->
          <div class="category-card">
            <div class="category-header">
              <h5>📰 Events & History</h5>
              <span class="data-count">{{ eventDataCount }}</span>
            </div>
            <div class="category-actions">
              <button @click="clearEvents" class="action-btn">
                🗑️ Clear All Events
              </button>
              <button @click="clearRecentEvents" class="action-btn">
                🕒 Clear Recent Events
              </button>
            </div>
          </div>

          <!-- Scenarios & Injections -->
          <div class="category-card">
            <div class="category-header">
              <h5>💫 Scenarios & Injections</h5>
              <span class="data-count">{{ injectionDataCount }}</span>
            </div>
            <div class="category-actions">
              <button @click="clearInjections" class="action-btn">
                🗑️ Clear All Injections
              </button>
              <button @click="clearPendingInjections" class="action-btn">
                ⏹️ Clear Pending Only
              </button>
              <button @click="clearProcessedInjections" class="action-btn">
                📜 Clear History Only
              </button>
            </div>
          </div>

          <!-- Custom Assets -->
          <div class="category-card">
            <div class="category-header">
              <h5>🎨 Custom Assets</h5>
              <span class="data-count">{{ assetDataCount }}</span>
            </div>
            <div class="category-actions">
              <button @click="clearCustomMap" class="action-btn">
                🗺️ Clear Custom Map
              </button>
              <button @click="clearCustomSprites" class="action-btn">
                👤 Clear Custom Sprites
              </button>
              <button @click="clearAllAssets" class="action-btn">
                🎨 Clear All Assets
              </button>
            </div>
          </div>

          <!-- Zones -->
          <div class="category-card">
            <div class="category-header">
              <h5>🗺️ Zones</h5>
              <span class="data-count">{{ zoneDataCount }}</span>
            </div>
            <div class="category-actions">
              <button @click="resetZones" class="action-btn">
                🔄 Reset to Default Zones
              </button>
              <button @click="clearAllZones" class="action-btn">
                🗑️ Clear All Zones
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- System Settings -->
      <div class="section">
        <h4>🛠️ System Settings</h4>
        <div class="system-settings">
          <div class="setting-item">
            <label>Auto-save Interval:</label>
            <select v-model="autoSaveInterval" @change="updateAutoSave" class="setting-select">
              <option value="0">Disabled</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
              <option value="600">10 minutes</option>
            </select>
          </div>

          <div class="setting-item">
            <label>Performance Mode:</label>
            <select v-model="performanceMode" @change="updatePerformance" class="setting-select">
              <option value="high">High Quality</option>
              <option value="balanced">Balanced</option>
              <option value="performance">Performance</option>
            </select>
          </div>

          <div class="setting-item">
            <label>Debug Mode:</label>
            <input 
              type="checkbox" 
              v-model="debugMode" 
              @change="updateDebugMode"
              class="setting-checkbox"
            />
          </div>
        </div>
      </div>

      <!-- Storage Information -->
      <div class="section">
        <h4>💾 Storage Information</h4>
        <div class="storage-info">
          <div class="storage-item">
            <span class="storage-label">Characters:</span>
            <span class="storage-value">{{ formatStorageSize(getStorageSize('sentient-town-characters')) }}</span>
          </div>
          <div class="storage-item">
            <span class="storage-label">Simulation:</span>
            <span class="storage-value">{{ formatStorageSize(getStorageSize('sentient-town-simulation')) }}</span>
          </div>
          <div class="storage-item">
            <span class="storage-label">Assets:</span>
            <span class="storage-value">{{ formatStorageSize(getStorageSize('sentient-town-assets')) }}</span>
          </div>
          <div class="storage-item">
            <span class="storage-label">UI:</span>
            <span class="storage-value">{{ formatStorageSize(getStorageSize('sentient-town-ui')) }}</span>
          </div>
          <div class="storage-item">
            <span class="storage-label">Zones:</span>
            <span class="storage-value">{{ formatStorageSize(getStorageSize('sentient-town-zones')) }}</span>
          </div>
          <div class="storage-item total">
            <span class="storage-label">Total Used:</span>
            <span class="storage-value">{{ formatStorageSize(totalStorageUsed) }}</span>
          </div>
        </div>
      </div>

      <!-- Import/Export -->
      <div class="section">
        <h4>📦 Import/Export</h4>
        <div class="import-export-actions">
          <button @click="exportAllData" class="tool-btn export-btn">
            📤 Export All Data
          </button>
          <button @click="triggerImport" class="tool-btn import-btn">
            📥 Import Data
          </button>
          <input 
            type="file" 
            ref="importFileRef" 
            @change="importAllData" 
            style="display: none" 
            accept=".json"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCharactersStore, useSimulationStore, useZonesStore, useUIStore, useAssetStore } from '@/stores'

const characters = useCharactersStore()
const simulation = useSimulationStore()
const zones = useZonesStore()
const ui = useUIStore()
const assets = useAssetStore()

const importFileRef = ref(null)
const autoSaveInterval = ref(0)
const performanceMode = ref('balanced')
const debugMode = ref(false)
const claudeApiKey = ref('')
const openaiApiKey = ref('')
const claudeKeyStatus = ref('none')
const openaiKeyStatus = ref('none')
const isTestingClaude = ref(false)

// Data counts for display
const characterDataCount = computed(() => {
  const memoryCount = characters.charactersList.reduce((total, char) => total + (char.memories?.length || 0), 0)
  return `${characters.charactersList.length} characters, ${memoryCount} memories`
})

const conversationDataCount = computed(() => {
  const activeCount = simulation.activeConversations.length
  const totalCount = simulation.conversations.length
  return `${totalCount} total (${activeCount} active)`
})

const eventDataCount = computed(() => {
  return `${simulation.events.length} events`
})

const injectionDataCount = computed(() => {
  const pendingCount = simulation.pendingInjections.length
  const totalCount = simulation.injections.length
  return `${totalCount} total (${pendingCount} pending)`
})

const assetDataCount = computed(() => {
  const spriteCount = Object.keys(assets.customCharacterSprites).length
  const hasMap = !!assets.customMap
  return `${spriteCount} sprites, ${hasMap ? '1' : '0'} map`
})

const zoneDataCount = computed(() => {
  return `${zones.zones.length} zones`
})

// Storage size calculations
const totalStorageUsed = computed(() => {
  return ['sentient-town-characters', 'sentient-town-simulation', 'sentient-town-assets', 'sentient-town-ui', 'sentient-town-zones']
    .reduce((total, key) => total + getStorageSize(key), 0)
})

function getStorageSize(key) {
  const item = localStorage.getItem(key)
  return item ? item.length : 0
}

function formatStorageSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// Quick reset actions
async function resetEverything() {
  if (confirm('🚨 RESET EVERYTHING\n\nThis will permanently delete ALL data:\n• Characters and memories\n• Conversations and events\n• Custom assets and zones\n• All settings\n\nThis action cannot be undone. Are you absolutely sure?')) {
    try {
      // Stop simulation first
      if (simulation.state.isRunning) {
        const { simulationEngine } = await import('@/services/simulationEngine')
        simulationEngine.stop()
      }

      // Reset all stores
      characters.resetCharacters()
      simulation.resetSimulation()
      zones.resetZones()
      assets.clearCustomAssets()
      ui.resetUI()

      // Clear all localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sentient-town-')) {
          localStorage.removeItem(key)
        }
      })

      alert('✅ Everything has been reset! The page will now reload.')
      window.location.reload()
    } catch (error) {
      console.error('❌ Error during reset:', error)
      alert('❌ Error during reset. Check console for details.')
    }
  }
}

async function resetSimulationData() {
  if (confirm('Reset all simulation data (events, conversations, injections) but keep characters and assets?')) {
    try {
      // Stop simulation
      if (simulation.state.isRunning) {
        const { simulationEngine } = await import('@/services/simulationEngine')
        simulationEngine.stop()
      }

      simulation.resetSimulation()
      alert('✅ Simulation data reset!')
    } catch (error) {
      console.error('❌ Error resetting simulation:', error)
      alert('❌ Error resetting simulation. Check console for details.')
    }
  }
}

async function resetToDefaults() {
  if (confirm('Reset to factory defaults? This keeps custom assets but resets everything else.')) {
    try {
      // Stop simulation
      if (simulation.state.isRunning) {
        const { simulationEngine } = await import('@/services/simulationEngine')
        simulationEngine.stop()
      }

      characters.resetCharacters()
      simulation.resetSimulation()
      zones.resetZones()
      ui.resetUI()

      alert('✅ Reset to factory defaults!')
    } catch (error) {
      console.error('❌ Error resetting to defaults:', error)
      alert('❌ Error resetting to defaults. Check console for details.')
    }
  }
}

// Granular reset functions
function clearMemories() {
  if (confirm('Clear all character memories? This will remove all accumulated experiences.')) {
    characters.charactersList.forEach(character => {
      character.memories = []
    })
    characters.saveCharacterChanges()
    alert('✅ All memories cleared!')
  }
}

function resetCharacters() {
  if (confirm('Reset all characters to their original state?')) {
    characters.resetCharacters()
    alert('✅ Characters reset!')
  }
}

function clearRelationships() {
  if (confirm('Clear all character relationships?')) {
    characters.charactersList.forEach(character => {
      character.relationships = []
    })
    characters.saveCharacterChanges()
    alert('✅ All relationships cleared!')
  }
}

function clearConversations() {
  if (confirm('Clear all conversations?')) {
    simulation.conversations.splice(0)
    simulation.saveToLocalStorage()
    alert('✅ All conversations cleared!')
  }
}

function clearActiveConversations() {
  if (confirm('End all active conversations?')) {
    simulation.activeConversations.forEach(conv => {
      simulation.endConversation(conv.id)
    })
    alert('✅ All active conversations ended!')
  }
}

function clearEvents() {
  if (confirm('Clear all events?')) {
    simulation.events.splice(0)
    simulation.saveToLocalStorage()
    alert('✅ All events cleared!')
  }
}

function clearRecentEvents() {
  if (confirm('Clear recent events (keep older history)?')) {
    const keepCount = Math.max(0, simulation.events.length - 50)
    simulation.events.splice(keepCount)
    simulation.saveToLocalStorage()
    alert('✅ Recent events cleared!')
  }
}

function clearInjections() {
  if (confirm('Clear all scenario injections and history?')) {
    simulation.injections.splice(0)
    simulation.saveToLocalStorage()
    alert('✅ All injections cleared!')
  }
}

function clearPendingInjections() {
  if (confirm('Clear pending injections only?')) {
    simulation.injections.forEach(injection => {
      if (!injection.processed) {
        injection.processed = true
      }
    })
    simulation.saveToLocalStorage()
    alert('✅ Pending injections cleared!')
  }
}

function clearProcessedInjections() {
  if (confirm('Clear processed injection history?')) {
    simulation.injections = simulation.injections.filter(inj => !inj.processed)
    simulation.saveToLocalStorage()
    alert('✅ Injection history cleared!')
  }
}

function clearCustomMap() {
  if (confirm('Clear custom map and revert to default?')) {
    assets.setCustomMap(null, [])
    alert('✅ Custom map cleared!')
  }
}

function clearCustomSprites() {
  if (confirm('Clear all custom character sprites?')) {
    Object.keys(assets.customCharacterSprites).forEach(characterId => {
      delete assets.customCharacterSprites[characterId]
    })
    assets.saveAssets()
    alert('✅ Custom sprites cleared!')
  }
}

function clearAllAssets() {
  if (confirm('Clear all custom assets (map and sprites)?')) {
    assets.clearCustomAssets()
    alert('✅ All custom assets cleared!')
  }
}

function resetZones() {
  if (confirm('Reset zones to default layout?')) {
    zones.resetZones()
    alert('✅ Zones reset!')
  }
}

function clearAllZones() {
  if (confirm('Clear all zones? This will remove all zone definitions.')) {
    zones.clearAllZones()
    alert('✅ All zones cleared!')
  }
}

// System settings
function updateAutoSave() {
  // Implementation for auto-save interval
  console.log('Auto-save interval:', autoSaveInterval.value)
}

function updatePerformance() {
  // Implementation for performance mode
  console.log('Performance mode:', performanceMode.value)
}

function updateDebugMode() {
  // Implementation for debug mode
  console.log('Debug mode:', debugMode.value)
}

// Import/Export
function exportAllData() {
  const allData = {
    characters: characters.characters,
    simulation: simulation.$state,
    zones: zones.zones,
    ui: ui.$state,
    assets: assets.getTownExportData(),
    exportedAt: new Date().toISOString(),
    version: '1.0'
  }

  const dataStr = JSON.stringify(allData, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sentient-town-complete-export-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  importFileRef.value.click()
}

function importAllData(event) {
  const file = event.target.files[0]
  if (!file) return

  if (confirm('Import data? This will overwrite ALL current data. Make sure you have exported your current data first!')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        
        // Import into stores
        if (data.characters) characters.characters = data.characters
        if (data.simulation) Object.assign(simulation.$state, data.simulation)
        if (data.zones) zones.zones = data.zones
        if (data.ui) Object.assign(ui.$state, data.ui)
        if (data.assets) assets.importTownData(data)

        // Save all changes
        characters.saveCharacterChanges()
        simulation.saveToLocalStorage()
        zones.saveZoneChanges()
        ui.saveToLocalStorage()

        alert('✅ Data imported successfully! The page will reload.')
        window.location.reload()
      } catch (error) {
        console.error('Import error:', error)
        alert('❌ Invalid data file format.')
      }
    }
    reader.readAsText(file)
  }
}

function updateClaudeApiKey() {
  if (claudeApiKey.value.trim()) {
    console.log('🔑 Updating Claude API key...')
    const success = ui.setClaudeApiKey(claudeApiKey.value.trim())
    if (success) {
      claudeKeyStatus.value = 'user'
      alert('✅ Claude API key updated successfully!')
    } else {
      alert('❌ Invalid Claude API key format')
      claudeApiKey.value = ''
      claudeKeyStatus.value = 'none'
    }
  } else {
    // Clear user key, check for environment key
    claudeApiKey.value = ''
    const envKey = import.meta.env.VITE_CLAUDE_API_KEY
    if (envKey && envKey.trim()) {
      claudeKeyStatus.value = 'env'
    } else {
      claudeKeyStatus.value = 'none'
    }
  }
  saveSettings()
}

function updateOpenAIApiKey() {
  if (openaiApiKey.value.trim()) {
    console.log('🔑 Updating OpenAI API key...')
    const success = ui.setOpenaiApiKey(openaiApiKey.value.trim())
    if (success) {
      openaiKeyStatus.value = 'user'
      alert('✅ OpenAI API key updated successfully!')
    } else {
      alert('❌ Invalid OpenAI API key format')
      openaiApiKey.value = ''
      openaiKeyStatus.value = 'none'
    }
  } else {
    // Clear user key, check for environment key
    openaiApiKey.value = ''
    const envKey = import.meta.env.VITE_OPENAI_API_KEY
    if (envKey && envKey.trim()) {
      openaiKeyStatus.value = 'env'
    } else {
      openaiKeyStatus.value = 'none'
    }
  }
  saveSettings()
}

async function testClaudeConnection() {
  if (!claudeApiKey.value && !import.meta.env.VITE_CLAUDE_API_KEY) {
    alert('❌ No Claude API key configured to test')
    return
  }
  
  isTestingClaude.value = true
  try {
    // Import Claude service and test a simple call
    const { callClaude } = await import('@/services/claudeApi')
    await callClaude('Reply with exactly: "API connection successful"', null)
    alert('✅ Claude API connection successful!')
  } catch (error) {
    console.error('Claude API test failed:', error)
    alert(`❌ Claude API test failed: ${error.message}`)
  } finally {
    isTestingClaude.value = false
  }
}

function clearApiKeys() {
  if (confirm('Clear all user-provided API keys? Environment keys will still be used if available.')) {
    claudeApiKey.value = ''
    openaiApiKey.value = ''
    ui.claudeApiKey = ''
    ui.openaiApiKey = ''
    
    // Check environment keys for status
    const claudeEnv = import.meta.env.VITE_CLAUDE_API_KEY
    const openaiEnv = import.meta.env.VITE_OPENAI_API_KEY
    
    claudeKeyStatus.value = claudeEnv?.trim() ? 'env' : 'none'
    openaiKeyStatus.value = openaiEnv?.trim() ? 'env' : 'none'
    
    saveSettings()
    alert('✅ User API keys cleared!')
  }
}

function checkApiKeyStatuses() {
  // Check Claude
  const claudeUser = ui.claudeApiKey
  const claudeEnv = import.meta.env.VITE_CLAUDE_API_KEY
  
  if (claudeUser && claudeUser.trim()) {
    claudeKeyStatus.value = 'user'
    claudeApiKey.value = claudeUser
  } else if (claudeEnv && claudeEnv.trim()) {
    claudeKeyStatus.value = 'env'
    claudeApiKey.value = ''
  } else {
    claudeKeyStatus.value = 'none'
    claudeApiKey.value = ''
  }
  
  // Check OpenAI
  const openaiUser = ui.openaiApiKey
  const openaiEnv = import.meta.env.VITE_OPENAI_API_KEY
  
  if (openaiUser && openaiUser.trim()) {
    openaiKeyStatus.value = 'user'
    openaiApiKey.value = openaiUser
  } else if (openaiEnv && openaiEnv.trim()) {
    openaiKeyStatus.value = 'env'
    openaiApiKey.value = ''
  } else {
    openaiKeyStatus.value = 'none'
    openaiApiKey.value = ''
  }
}

function saveSettings() {
  const settings = {
    performanceMode: performanceMode.value,
    debugMode: debugMode.value,
    claudeApiKey: claudeApiKey.value,
    openaiApiKey: openaiApiKey.value,
    claudeKeyStatus: claudeKeyStatus.value,
    openaiKeyStatus: openaiKeyStatus.value
  }
  
  localStorage.setItem('sentientTownSettings', JSON.stringify(settings))
  console.log('💾 Settings saved:', settings)
}

onMounted(() => {
  // Load settings and check statuses
  checkApiKeyStatuses()
  
  try {
    const saved = localStorage.getItem('sentientTownSettings')
    if (saved) {
      const settings = JSON.parse(saved)
      performanceMode.value = settings.performanceMode || 'balanced'
      debugMode.value = settings.debugMode || false
      // Don't load API keys from settings, check stores instead
    }
  } catch (error) {
    console.warn('Failed to load settings:', error)
  }
})
</script>

<style scoped>
.settings-panel {
  padding: 0;
  height: 100%;
  overflow-y: auto;
}

.settings-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.settings-header h3 {
  margin: 0 0 8px 0;
  color: #495057;
}

.settings-header p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.settings-content {
  padding: 20px;
}

.section {
  margin-bottom: 30px;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  background: white;
}

.section h4 {
  margin: 0 0 20px 0;
  color: #343a40;
  font-size: 16px;
}

.danger-section {
  border-color: #dc3545;
  background: linear-gradient(135deg, #fff5f5 0%, white 100%);
}

.quick-actions {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.reset-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.danger-btn {
  background: #dc3545;
  color: white;
}

.danger-btn:hover {
  background: #c82333;
  transform: translateY(-1px);
}

.warning-btn {
  background: #ffc107;
  color: #212529;
}

.warning-btn:hover {
  background: #e0a800;
  transform: translateY(-1px);
}

.info-btn {
  background: #17a2b8;
  color: white;
}

.info-btn:hover {
  background: #138496;
  transform: translateY(-1px);
}

.warning-text {
  color: #dc3545;
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

.data-categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.category-card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  background: #f8f9fa;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.category-header h5 {
  margin: 0;
  color: #495057;
  font-size: 14px;
}

.data-count {
  font-size: 12px;
  color: #6c757d;
  background: white;
  padding: 4px 8px;
  border-radius: 12px;
}

.category-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  background: white;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  text-align: left;
}

.action-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
  transform: translateY(-1px);
}

.system-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: #f8f9fa;
}

.setting-item label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.setting-select {
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
  font-size: 13px;
}

.setting-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #667eea;
}

.storage-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.storage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: #f8f9fa;
}

.storage-item.total {
  border-color: #667eea;
  background: #f8f9ff;
  font-weight: 600;
}

.storage-label {
  color: #495057;
  font-size: 14px;
}

.storage-value {
  color: #6c757d;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}

.import-export-actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.tool-btn {
  padding: 12px 20px;
  border: 1px solid #ced4da;
  border-radius: 8px;
  background: white;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.export-btn {
  border-color: #28a745;
  color: #28a745;
}

.export-btn:hover {
  background: #28a745;
  color: white;
  transform: translateY(-1px);
}

.import-btn {
  border-color: #17a2b8;
  color: #17a2b8;
}

.import-btn:hover {
  background: #17a2b8;
  color: white;
  transform: translateY(-1px);
}

.api-keys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.api-key-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.api-key-group label {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.key-input-wrapper {
  position: relative;
}

.api-key-input {
  width: 100%;
  padding: 12px 120px 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  background: #f8f9fa;
  color: #495057;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  transition: all 0.2s ease;
}

.api-key-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.key-status {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.user {
  background: #17a2b8;
  color: white;
}

.status-badge.env {
  background: #ffc107;
  color: #212529;
}

.status-badge.none {
  background: #dc3545;
  color: white;
}

.api-key-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  gap: 12px;
}

.test-btn,
.clear-btn {
  padding: 10px 18px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  background: white;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.test-btn:hover {
  background: #17a2b8;
  border-color: #17a2b8;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(23, 162, 184, 0.3);
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.clear-btn:hover {
  background: #dc3545;
  border-color: #dc3545;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
}

.help-text {
  margin: 0 0 20px 0;
  color: #6c757d;
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .data-categories {
    grid-template-columns: 1fr;
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .system-settings {
    grid-template-columns: 1fr;
  }
  
  .storage-info {
    grid-template-columns: 1fr;
  }
  
  .import-export-actions {
    flex-direction: column;
  }
}
</style> 