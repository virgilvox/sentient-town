<template>
  <div class="inject-prompt">
    <div class="inject-header">
      <h3>💫 Scenario Injection</h3>
      <p>Inject events and scenarios into the simulation to influence character behavior</p>
    </div>

    <div class="inject-content">
      <!-- Quick Presets -->
      <div class="section">
        <h4>⚡ Quick Scenarios</h4>
        <div class="presets-wrapper">
          <div class="form-group">
            <label for="preset-select">Choose a preset scenario:</label>
            <select 
              id="preset-select" 
              v-model="selectedPreset" 
              @change="applySelectedPreset"
              class="preset-select"
            >
              <option value="">Select a scenario template...</option>
              <option 
                v-for="preset in presets" 
                :key="preset.name"
                :value="preset.name"
              >
                {{ preset.icon }} {{ preset.name }}
              </option>
            </select>
          </div>
          <div v-if="selectedPreset" class="preset-preview">
            <div class="preview-label">Preview:</div>
            <div class="preview-content">{{ getPresetByName(selectedPreset)?.content }}</div>
            <button @click="clearSelectedPreset" class="clear-preset-btn">
              Clear Selection
            </button>
          </div>
        </div>
      </div>

      <!-- Custom Injection -->
      <div class="section">
        <h4>✏️ Custom Scenario</h4>
        <div class="injection-form">
          <div class="form-group">
            <label for="target-select">Target:</label>
            <select id="target-select" v-model="targetCharacter" class="target-select">
              <option value="global">🌍 All Characters (Global)</option>
              <option 
                v-for="character in characters.charactersList" 
                :key="character.id" 
                :value="character.id"
              >
                {{ character.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="scenario-text">Scenario Description:</label>
            <textarea 
              id="scenario-text"
              v-model="scenarioText" 
              class="scenario-textarea"
              placeholder="Describe what happens... e.g., 'A fire breaks out in John's house' or 'A mysterious stranger arrives in town'"
              rows="4"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="intensity">Intensity:</label>
            <div class="intensity-slider">
              <input 
                type="range" 
                id="intensity"
                v-model="intensity" 
                min="1" 
                max="10" 
                class="slider"
              />
              <div class="intensity-labels">
                <span>Subtle</span>
                <span class="intensity-value">{{ intensity }}</span>
                <span>Dramatic</span>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button 
              @click="injectScenario" 
              :disabled="!scenarioText.trim() || isInjecting"
              class="inject-btn"
            >
              {{ isInjecting ? '💫 Injecting...' : '💫 Inject Scenario' }}
            </button>
            <button @click="clearForm" class="clear-btn">
              🗑️ Clear
            </button>
          </div>
        </div>
      </div>

      <!-- Active Injections -->
      <div class="section">
        <h4>📋 Active Injections</h4>
        <div v-if="activeInjections.length === 0" class="no-injections">
          <p>No active scenario injections. Create one above to see it here.</p>
        </div>
        <div v-else class="injections-list">
          <div 
            v-for="injection in activeInjections" 
            :key="injection.id"
            class="injection-item"
          >
            <div class="injection-header">
              <div class="injection-target">
                {{ injection.target === 'global' ? '🌍 Global' : getCharacterName(injection.target) }}
              </div>
              <div class="injection-time">
                {{ formatTime(injection.timestamp) }}
              </div>
              <button @click="removeInjection(injection.id)" class="remove-injection">
                ❌
              </button>
            </div>
            <div class="injection-content">{{ injection.content }}</div>
            <div class="injection-status">
              {{ injection.processed ? '✅ Processed' : '⏳ Pending' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Injection History -->
      <div class="section">
        <div class="section-header">
          <h4>📚 Recent History</h4>
          <button 
            v-if="recentInjections.length > 0" 
            @click="clearHistory" 
            class="clear-history-btn"
          >
            🗑️ Clear History
          </button>
        </div>
        <div v-if="recentInjections.length === 0" class="no-history">
          <p>No injection history yet.</p>
        </div>
        <div v-else class="history-list">
          <div 
            v-for="injection in recentInjections" 
            :key="injection.id"
            class="history-item"
          >
            <div class="history-header">
              <span class="history-target">
                {{ injection.target === 'global' ? '🌍 Global' : getCharacterName(injection.target) }}
              </span>
              <span class="history-time">{{ formatTime(injection.timestamp) }}</span>
            </div>
            <div class="history-content">{{ injection.content }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSimulationStore, useCharactersStore } from '@/stores'

const simulation = useSimulationStore()
const characters = useCharactersStore()

const targetCharacter = ref('global')
const scenarioText = ref('')
const intensity = ref(5)
const isInjecting = ref(false)
const selectedPreset = ref('')

const presets = [
  {
    name: 'Gentle Rain',
    icon: '🌧️',
    content: 'A gentle rain begins to fall, bringing the scent of petrichor and stirring memories',
    target: 'global'
  },
  {
    name: 'Unexpected Visitor',
    icon: '🚪',
    content: 'A mysterious stranger knocks on the door, bringing news from the outside world',
    target: 'global'
  },
  {
    name: 'Lost Item Found',
    icon: '🔍',
    content: 'Someone discovers a long-lost item that holds sentimental value',
    target: 'global'
  },
  {
    name: 'Letter Arrives',
    icon: '📮',
    content: 'An unexpected letter arrives, bringing news from a distant friend',
    target: 'global'
  },
  {
    name: 'Town Festival',
    icon: '🎪',
    content: 'The town is preparing for an impromptu festival, and everyone is excited',
    target: 'global'
  },
  {
    name: 'Power Outage',
    icon: '💡',
    content: 'The power goes out across town, forcing everyone to slow down and connect',
    target: 'global'
  },
  {
    name: 'Beautiful Sunset',
    icon: '🌅',
    content: 'An unusually beautiful sunset paints the sky, inspiring reflection and wonder',
    target: 'global'
  },
  {
    name: 'Shared Memory',
    icon: '💭',
    content: 'Someone mentions an old shared memory that brings back complex emotions',
    target: 'global'
  }
]

const activeInjections = computed(() => 
  simulation.pendingInjections
)

const recentInjections = computed(() => 
  simulation.injections
    .filter(inj => inj.processed)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
)

function applyPreset(preset) {
  scenarioText.value = preset.content
  targetCharacter.value = preset.target
}

async function injectScenario() {
  if (!scenarioText.value.trim()) return
  
  isInjecting.value = true
  
  try {
    // Add intensity modifier to the scenario
    let finalContent = scenarioText.value
    if (intensity.value <= 3) {
      finalContent = `Subtly, ${finalContent.toLowerCase()}`
    } else if (intensity.value >= 8) {
      finalContent = `Dramatically and urgently, ${finalContent.toLowerCase()}`
    } else if (intensity.value >= 6) {
      finalContent = `Noticeably, ${finalContent.toLowerCase()}`
    }

    console.log('💫 Creating injection:', {
      target: targetCharacter.value,
      originalContent: scenarioText.value,
      finalContent: finalContent,
      intensity: intensity.value
    })

    simulation.addInjection(targetCharacter.value, finalContent)
    
    // Check if injection was actually added
    const pendingCount = simulation.pendingInjections.length
    console.log(`✅ Injection created! Total pending injections: ${pendingCount}`)
    
    // Clear form after injection
    clearForm()
    
    // Better success feedback with injection count
    alert(`💫 Scenario injected successfully!\n\nTarget: ${targetCharacter.value === 'global' ? 'All Characters' : getCharacterName(targetCharacter.value)}\nScenario: "${finalContent}"\n\nTotal pending injections: ${pendingCount}`)
    
  } catch (error) {
    console.error('Failed to inject scenario:', error)
    alert(`❌ Failed to inject scenario: ${error.message}`)
  } finally {
    isInjecting.value = false
  }
}

function clearForm() {
  scenarioText.value = ''
  targetCharacter.value = 'global'
  intensity.value = 5
}

function removeInjection(injectionId) {
  console.log('🗑️ Manually removing injection:', injectionId)
  simulation.markInjectionProcessed(injectionId)
}

function getCharacterName(characterId) {
  const character = characters.getCharacter(characterId)
  return character?.name || characterId
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit'
  })
}

function applySelectedPreset() {
  const preset = presets.find(p => p.name === selectedPreset.value)
  if (preset) {
    scenarioText.value = preset.content
    targetCharacter.value = preset.target
  }
}

function clearSelectedPreset() {
  selectedPreset.value = ''
}

function getPresetByName(name) {
  return presets.find(p => p.name === name)
}

function clearHistory() {
  if (confirm('Clear all processed scenario history?')) {
    console.log('🗑️ Clearing history')
    simulation.clearHistory()
    alert('✅ Scenario history cleared!')
  }
}

// Add onMounted to reset loading state  
onMounted(() => {
  // Force reset loading state to prevent stuck spinners from HMR
  isInjecting.value = false
})
</script>

<style scoped>
.inject-prompt {
  padding: 0;
  height: 100%;
  overflow-y: auto;
}

.inject-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.inject-header h3 {
  margin: 0 0 8px 0;
  color: #495057;
}

.inject-header p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.inject-content {
  padding: 20px;
}

.section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f1f3f4;
}

.section:last-child {
  border-bottom: none;
}

.section h4 {
  margin: 0 0 15px 0;
  color: #343a40;
  font-size: 16px;
}

.presets-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.preset-select {
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.preset-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.preset-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.preview-content {
  color: #495057;
  font-size: 14px;
  line-height: 1.4;
}

.clear-preset-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  background: #6c757d;
  color: white;
}

.clear-preset-btn:hover {
  background: #5a6268;
}

.injection-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.target-select {
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.target-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.scenario-textarea {
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
}

.scenario-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.intensity-slider {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e9ecef;
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

.intensity-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #6c757d;
}

.intensity-value {
  font-weight: bold;
  color: #667eea;
  background: #f8f9ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  gap: 12px;
}

.inject-btn, .clear-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.inject-btn {
  background: #667eea;
  color: white;
  flex: 1;
}

.inject-btn:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.inject-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.clear-btn {
  background: #6c757d;
  color: white;
}

.clear-btn:hover {
  background: #5a6268;
}

.no-injections, .no-history {
  color: #6c757d;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.injections-list, .history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.injection-item, .history-item {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  background: white;
}

.injection-header, .history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.injection-target, .history-target {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.injection-time, .history-time {
  font-size: 12px;
  color: #6c757d;
  font-family: 'Monaco', 'Menlo', monospace;
}

.remove-injection {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.remove-injection:hover {
  opacity: 1;
}

.injection-content, .history-content {
  color: #495057;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 8px;
}

.injection-status {
  font-size: 12px;
  color: #6c757d;
}

.history-item {
  opacity: 0.8;
  border-color: #f1f3f4;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.clear-history-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  background: #6c757d;
  color: white;
}

.clear-history-btn:hover {
  background: #5a6268;
}
</style> 