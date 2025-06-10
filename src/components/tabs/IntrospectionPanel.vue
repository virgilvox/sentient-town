<template>
  <div class="introspection-panel">
    <div class="introspection-header">
      <h3>💭 Character Introspection</h3>
      <div class="controls">
        <div class="character-selector">
          <label>Character:</label>
          <select v-model="selectedCharacterId" class="character-select" :disabled="!characters.isLoaded">
            <option value="">{{ characters.isLoaded ? 'Select a character...' : 'Loading characters...' }}</option>
            <option 
              v-for="character in characters.charactersList" 
              :key="character.id" 
              :value="character.id"
            >
              {{ character.name }}
            </option>
          </select>
        </div>
        <button 
          @click="refreshThoughts" 
          :disabled="!selectedCharacterId || isGenerating"
          class="refresh-btn"
        >
          {{ isGenerating ? '💭 Thinking...' : '💭 Generate Thoughts' }}
        </button>
      </div>
    </div>

    <div class="introspection-content">
      <div v-if="!selectedCharacterId" class="no-selection">
        <div class="no-selection-icon">🧠</div>
        <p>Select a character to explore their inner thoughts and psychological state.</p>
      </div>

      <div v-else-if="selectedCharacter" class="character-analysis">
        <!-- Current Psychological State -->
        <div class="section">
          <h4>🧠 Current Psychological State</h4>
          <div class="state-grid">
            <div class="state-card">
              <h5>Mental Health</h5>
              <div class="mental-health-items">
                <div 
                  v-for="(condition, index) in selectedCharacter.mentalHealth" 
                  :key="index" 
                  class="mental-health-item"
                >
                  <span class="condition-label">{{ condition }}</span>
                </div>
              </div>
            </div>

            <div class="state-card">
              <h5>Personality Traits</h5>
              <div class="trait-display">
                <div class="mbti-badge">{{ selectedCharacter.MBTI }}</div>
                <div class="big-five">
                  <div 
                    v-for="(value, trait) in selectedCharacter.bigFive" 
                    :key="trait"
                    class="trait-item"
                  >
                    <span>{{ trait }}:</span>
                    <div class="trait-bar">
                      <div 
                        class="trait-fill" 
                        :style="{ width: `${value}%` }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Thoughts -->
        <div class="section">
          <div class="section-header">
            <h4>💭 Recent Thoughts</h4>
            <button 
              v-if="thoughts.filter(t => t.characterId === selectedCharacterId).length > 10"
              @click="showAllThoughts = !showAllThoughts"
              class="show-more-btn"
            >
              {{ showAllThoughts ? 'Show Less' : `Show All (${thoughts.filter(t => t.characterId === selectedCharacterId).length})` }}
            </button>
          </div>
          <div class="thoughts-timeline">
            <div v-if="characterThoughts.length === 0" class="no-thoughts">
              <p>No recent thoughts recorded. Click "Generate Thoughts" to see what {{ selectedCharacter.name }} is thinking about.</p>
            </div>
            <div v-else class="thoughts-list">
              <div 
                v-for="thought in characterThoughts" 
                :key="thought.id"
                class="thought-item"
              >
                <div class="thought-header">
                  <span class="thought-time">{{ formatTime(thought.timestamp) }}</span>
                  <span :class="['thought-type', thought.type]">{{ thought.type }}</span>
                </div>
                <div class="thought-content">{{ thought.content }}</div>
                <div v-if="thought.triggers" class="thought-triggers">
                  <strong>Triggered by:</strong> {{ thought.triggers.join(', ') }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Memory Analysis -->
        <div class="section">
          <h4>🧭 Memory & Relationships</h4>
          <div class="memory-analysis">
            <div class="memories-section">
              <div class="section-header">
                <h5>Key Memories</h5>
                <button 
                  v-if="selectedCharacter.memories && selectedCharacter.memories.length > 5"
                  @click="showAllMemories = !showAllMemories"
                  class="show-more-btn"
                >
                  {{ showAllMemories ? 'Show Less' : `Show All (${selectedCharacter.memories.length})` }}
                </button>
              </div>
              <div class="memories-list">
                <div 
                  v-for="memory in displayedMemories" 
                  :key="memory.id"
                  class="memory-item"
                >
                  <div class="memory-content">{{ memory.content }}</div>
                  <div class="memory-meta">
                    <span class="memory-type">{{ memory.tags[0] || 'memory' }}</span>
                    <span class="memory-importance">Impact: {{ memory.emotional_weight }}/100</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="relationships-section">
              <h5>Character Relationships</h5>
              <div class="relationships-list">
                <div 
                  v-for="relationshipName in selectedCharacter.relationships" 
                  :key="relationshipName"
                  class="relationship-item"
                >
                  <div class="relationship-header">
                    <span class="character-name">{{ relationshipName }}</span>
                    <span class="affinity-badge">Known</span>
                  </div>
                  <div class="relationship-notes">{{ getRelationshipDescription(relationshipName) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Desires & Goals -->
        <div class="section">
          <h4>🎯 Current Desires & Goals</h4>
          <div class="desires-grid">
            <div 
              v-for="(desire, index) in selectedCharacter.desires" 
              :key="index"
              class="desire-card"
            >
              <div class="desire-content">{{ desire }}</div>
              <div class="desire-urgency">
                <div class="urgency-indicator"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Conversations -->
        <div class="section">
          <div class="section-header">
            <h4>💬 Recent Conversations</h4>
            <button 
              v-if="characterConversations.length > 3"
              @click="showAllConversations = !showAllConversations"
              class="show-more-btn"
            >
              {{ showAllConversations ? 'Show Less' : `Show All (${characterConversations.length})` }}
            </button>
          </div>
          <div class="conversations-section">
            <div v-if="displayedConversations.length === 0" class="no-conversations">
              <p>No recent conversations. This character hasn't talked to anyone lately.</p>
            </div>
            <div v-else class="conversations-list">
              <div 
                v-for="conversation in displayedConversations" 
                :key="conversation.id"
                class="conversation-item"
              >
                <div class="conversation-header">
                  <span class="conversation-participants">
                    With: {{ conversation.participants
                      .filter(id => id !== selectedCharacterId)
                      .map(id => getCharacterName(id))
                      .join(', ') }}
                  </span>
                  <span class="conversation-time">{{ formatTime(conversation.startTime) }}</span>
                </div>
                <div v-if="conversation.messages.length > 0" class="last-message">
                  "{{ conversation.messages[conversation.messages.length - 1].content }}"
                </div>
                <div class="conversation-status">
                  {{ conversation.isActive ? '🟢 Ongoing' : '✅ Completed' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Interaction Status -->
        <div class="section">
          <h4>🔗 Social Status</h4>
          <div class="social-status">
            <div class="status-item">
              <span class="status-label">Active Conversations:</span>
              <span class="status-value">{{ activeConversationCount }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Nearby Characters:</span>
              <span class="status-value">{{ nearbyCharacters.length }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Current Zone:</span>
              <span class="status-value">{{ selectedCharacter.position.zone || 'Unknown' }}</span>
            </div>
          </div>
          <div v-if="nearbyCharacters.length > 0" class="nearby-characters">
            <h5>👥 Nearby:</h5>
            <div class="nearby-list">
              <span 
                v-for="char in nearbyCharacters" 
                :key="char.id"
                class="nearby-character"
                @click="selectNearbyCharacter(char.id)"
              >
                {{ char.name }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useCharactersStore, useSimulationStore, useZonesStore, useUIStore } from '@/stores'
import claudeApi from '@/services/claudeApi'

const ui = useUIStore()
const characters = useCharactersStore()
const simulation = useSimulationStore()
const zones = useZonesStore()

// Use global character selection from UI store instead of local state
const selectedCharacterId = computed({
  get: () => ui.selectedCharacterId,
  set: (value) => ui.selectCharacter(value)
})
const isGenerating = ref(false)
const showAllMemories = ref(false)
const showAllConversations = ref(false)
const showAllThoughts = ref(false)

const thoughts = ref([])

const selectedCharacter = computed(() => {
  if (!selectedCharacterId.value) {
    console.log('🔍 No character selected in introspection panel')
    return null
  }
  const character = characters.getCharacter(selectedCharacterId.value)
  if (!character) {
    console.log('🔍 Character not found:', selectedCharacterId.value)
  } else {
    console.log('🔍 Selected character for introspection:', character.name)
  }
  return character
})

const displayedMemories = computed(() => {
  if (!selectedCharacter.value?.memories) {
    console.log('🔍 No memories for selected character')
    return []
  }
  const memories = showAllMemories.value 
    ? selectedCharacter.value.memories 
    : selectedCharacter.value.memories.slice(0, 5)
  console.log('🔍 Displaying memories count:', memories.length)
  return memories
})

const displayedConversations = computed(() => {
  if (!selectedCharacterId.value) {
    console.log('🔍 No character selected for conversations')
    return []
  }
  const allConversations = simulation.conversations
    .filter(conv => conv.participants.includes(selectedCharacterId.value))
    .sort((a, b) => b.startTime - a.startTime)
  
  const conversations = showAllConversations.value 
    ? allConversations 
    : allConversations.slice(0, 3)
  console.log('🔍 Displaying conversations count:', conversations.length)
  return conversations
})

const displayedThoughts = computed(() => {
  const filteredThoughts = thoughts.value.filter(t => t.characterId === selectedCharacterId.value)
  const sortedThoughts = filteredThoughts.slice().reverse() // Most recent first
  
  return showAllThoughts.value 
    ? sortedThoughts 
    : sortedThoughts.slice(0, 10)
})

const characterThoughts = computed(() => displayedThoughts.value)

// Enhanced computed properties for character interactions
const characterConversations = computed(() => {
  if (!selectedCharacterId.value) return []
  return simulation.conversations
    .filter(conv => conv.participants.includes(selectedCharacterId.value))
    .sort((a, b) => b.startTime - a.startTime)
})

const activeConversationCount = computed(() => {
  if (!selectedCharacterId.value) return 0
  return simulation.activeConversations
    .filter(conv => conv.participants.includes(selectedCharacterId.value))
    .length
})

const nearbyCharacters = computed(() => {
  if (!selectedCharacter.value || !selectedCharacter.value.position) return []
  
  return characters.charactersList.filter(char => {
    if (char.id === selectedCharacter.value.id) return false
    
    const distance = Math.abs(char.position.x - selectedCharacter.value.position.x) + 
                    Math.abs(char.position.y - selectedCharacter.value.position.y)
    return distance <= 3 // Within 3 tiles
  })
})

function getCharacterName(characterId) {
  if (!characters.isLoaded) {
    return 'Loading...'
  }
  
  const character = characters.getCharacter(characterId)
  return character ? character.name : 'Unknown'
}

function getAffinityClass(affinity) {
  if (affinity >= 7) return 'high'
  if (affinity >= 4) return 'medium'
  return 'low'
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit'
  })
}

function selectNearbyCharacter(characterId) {
  ui.selectCharacter(characterId)
}

function getRelationshipDescription(relationshipName) {
  switch (relationshipName) {
    case 'friend': return 'Close friend'
    case 'acquaintance': return 'Acquaintance'
    case 'family': return 'Family member'
    case 'romantic': return 'Romantic interest'
    case 'rival': return 'Rival'
    case 'enemy': return 'Enemy'
    default: return relationshipName
  }
}

async function refreshThoughts() {
  if (!selectedCharacterId.value) return
  const character = characters.getCharacter(selectedCharacterId.value)
  if (!character) return

  isGenerating.value = true
  try {
    // Build minimal context
    const nearby = characters.charactersList.filter(c => c.id !== character.id && Math.abs(c.position.x - character.position.x) + Math.abs(c.position.y - character.position.y) <= 3)
    const currentZone = zones.getZoneAt(character.position.x, character.position.y)
    const context = {
      character,
      nearbyCharacters: nearby,
      currentLocation: currentZone?.name || 'Unknown',
      availableZones: zones.zones.map(z => z.name),
      recentEvents: simulation.recentEvents.map(e => e.summary),
    }

    const response = await claudeApi.getCharacterAction(context)
    thoughts.value.push({
      id: `thought_${Date.now()}`,
      characterId: character.id,
      type: 'thought',
      content: response.internal_thoughts,
      timestamp: Date.now()
    })
  } catch (err) {
    console.error('Error generating thoughts:', err)
  } finally {
    isGenerating.value = false
  }
}

// Clear thoughts when character changes
watch(selectedCharacterId, () => {
  // Reset state when switching characters
  isGenerating.value = false
})

// Add onMounted to reset loading state
onMounted(() => {
  // Force reset loading state to prevent stuck spinners from HMR  
  isGenerating.value = false
})
</script>

<style scoped>
.introspection-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
}

.introspection-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.introspection-header h3 {
  margin: 0 0 15px 0;
  color: #495057;
}

.controls {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.character-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.character-selector label {
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
  white-space: nowrap;
}

.character-select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  min-width: 200px;
}

.refresh-btn {
  padding: 8px 16px;
  border: 1px solid #667eea;
  border-radius: 6px;
  background: #667eea;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.introspection-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #6c757d;
  text-align: center;
}

.no-selection-icon {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.5;
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
  margin: 0 0 20px 0;
  color: #343a40;
  font-size: 18px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h4,
.section-header h5 {
  margin: 0;
  color: #343a40;
}

.show-more-btn {
  padding: 4px 12px;
  border: 1px solid #667eea;
  border-radius: 4px;
  background: white;
  color: #667eea;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.show-more-btn:hover {
  background: #667eea;
  color: white;
  transform: translateY(-1px);
}

.state-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.state-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
}

.state-card h5 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 14px;
  font-weight: 600;
}

.mental-health-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mental-health-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.condition-label {
  min-width: 60px;
  color: #6c757d;
  text-transform: capitalize;
}

.trait-display {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.mbti-badge {
  background: #667eea;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  text-align: center;
  font-size: 16px;
}

.big-five {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trait-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.trait-item span {
  min-width: 40px;
  color: #6c757d;
  text-transform: capitalize;
}

.trait-bar {
  flex: 1;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.trait-fill {
  height: 100%;
  background: #667eea;
  transition: width 0.3s ease;
}

.thoughts-timeline {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.no-thoughts {
  color: #6c757d;
  font-style: italic;
  text-align: center;
  padding: 30px;
}

.thoughts-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.thought-item {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid #667eea;
}

.thought-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.thought-time {
  font-size: 12px;
  color: #6c757d;
  font-family: 'Monaco', 'Menlo', monospace;
}

.thought-type {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.thought-type.reflection {
  background: #e3f2fd;
  color: #1565c0;
}

.thought-type.concern {
  background: #fff3e0;
  color: #e65100;
}

.thought-type.desire {
  background: #f3e5f5;
  color: #7b1fa2;
}

.thought-type.memory {
  background: #e8f5e8;
  color: #2e7d32;
}

.thought-content {
  color: #495057;
  line-height: 1.5;
  margin-bottom: 8px;
}

.thought-triggers {
  font-size: 12px;
  color: #6c757d;
}

.memory-analysis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.memories-section h5,
.relationships-section h5 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 16px;
}

.memories-list,
.relationships-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.memory-item,
.relationship-item {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
}

.memory-content {
  color: #495057;
  font-size: 14px;
  margin-bottom: 8px;
  line-height: 1.4;
}

.memory-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.memory-type {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
  color: #6c757d;
  text-transform: uppercase;
}

.memory-importance {
  color: #667eea;
  font-weight: 500;
}

.relationship-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.character-name {
  font-weight: 500;
  color: #495057;
}

.affinity-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.affinity-badge.high {
  background: #d4edda;
  color: #155724;
}

.affinity-badge.medium {
  background: #fff3cd;
  color: #856404;
}

.affinity-badge.low {
  background: #f8d7da;
  color: #721c24;
}

.relationship-notes {
  color: #6c757d;
  font-size: 13px;
  line-height: 1.4;
}

.desires-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.desire-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.desire-content {
  color: #495057;
  font-size: 14px;
  line-height: 1.4;
}

.urgency-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #feca57;
}

.conversations-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f1f3f4;
}

.conversations-section:last-child {
  border-bottom: none;
}

.conversations-section h4 {
  margin: 0 0 20px 0;
  color: #343a40;
  font-size: 18px;
}

.conversations-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.conversation-item {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.conversation-participants {
  font-size: 12px;
  color: #6c757d;
}

.conversation-time {
  font-size: 11px;
  color: #6c757d;
}

.last-message {
  color: #495057;
  line-height: 1.5;
  margin-bottom: 8px;
}

.conversation-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.conversation-status.ongoing {
  background: #d4edda;
  color: #155724;
}

.conversation-status.completed {
  background: #f3e5f5;
  color: #7b1fa2;
}

.social-status {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-size: 12px;
  color: #6c757d;
}

.status-value {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.nearby-characters {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #f1f3f4;
}

.nearby-characters h5 {
  margin: 0 0 10px 0;
  color: #495057;
  font-size: 16px;
}

.nearby-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nearby-character {
  font-size: 14px;
  color: #667eea;
  cursor: pointer;
}

@media (max-width: 768px) {
  .state-grid,
  .memory-analysis {
    grid-template-columns: 1fr;
  }
}
</style> 