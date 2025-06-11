<template>
  <div class="character-editor">
    <!-- Character List View -->
    <div v-if="!localSelectedCharacterId" class="character-list">
      <div class="header-section">
        <h3>Character Management</h3>
        <button 
          @click="createCharacter"
          class="create-button"
          :disabled="isCreating"
        >
          <span v-if="isCreating">Creating...</span>
          <span v-else>+ Create New Character</span>
        </button>
      </div>
      
      <!-- Character Status Overview -->
      <div class="character-overview">
        <div class="overview-stats">
          <span class="stat">
            👥 Total: {{ characters.charactersList.length }}
          </span>
          <span class="stat alive">
            ❤️ Alive: {{ aliveCharacters.length }}
          </span>
          <span class="stat dead" v-if="deadCharacters.length > 0">
            💀 Dead: {{ deadCharacters.length }}
          </span>
        </div>
      </div>

      <!-- Character Filter -->
      <div class="filter-section">
        <select v-model="relationshipFilter" class="filter-select">
          <option value="all">All Characters</option>
          <option value="alive">Alive Only</option>
          <option value="dead">Dead Only</option>
        </select>
      </div>

      <!-- Character Cards -->
      <div class="character-grid">
        <div 
          v-for="character in filteredCharacters" 
          :key="character.id"
          class="character-card"
          :class="{ 
            'selected': character.id === localSelectedCharacterId,
            'dead': character.isDead 
          }"
          @click="selectCharacter(character.id)"
        >
          <div class="character-header">
            <h4 class="character-name">{{ character.name }}</h4>
            <div class="character-status">
              <span class="status-badge" :class="character.isDead ? 'dead' : 'alive'">
                {{ character.isDead ? '💀 Dead' : '❤️ Alive' }}
              </span>
            </div>
          </div>

          <div class="character-info">
            <div class="info-item">
              <span class="info-label">Age</span>
              <span class="info-value">{{ character.age || 'Unknown' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Location</span>
              <span class="info-value">{{ character.location || 'Unknown' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Occupation</span>
              <span class="info-value">{{ character.occupation || 'Unknown' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Emotion</span>
              <span class="info-value">{{ character.currentEmotion || 'neutral' }}</span>
            </div>
          </div>

          <div class="character-description">
            {{ character.description || 'No description available.' }}
          </div>

          <div class="character-stats">
            <div class="character-emotions">
              <span class="emotion-tag">{{ character.currentEmotion || 'neutral' }}</span>
              <span v-if="character.personality" class="emotion-tag">{{ character.personality.split(' ')[0] }}</span>
            </div>
            
            <div class="character-actions">
              <button 
                @click.stop="duplicateCharacter(character.id)" 
                class="action-btn" 
                title="Duplicate Character"
              >
                🔄
              </button>
              <button 
                v-if="!character.isDead"
                @click.stop="killCharacter(character.id)" 
                class="action-btn" 
                title="Kill Character"
              >
                💀
              </button>
              <button 
                v-else
                @click.stop="resurrectCharacter(character.id)" 
                class="action-btn" 
                title="Resurrect Character"
              >
                ❤️
              </button>
              <button 
                @click.stop="deleteCharacter(character.id)" 
                class="action-btn" 
                title="Delete Character"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Character Detail View -->
    <div v-else class="character-detail" ref="characterDetailRef">
      <div class="detail-header">
        <button @click="backToList" class="back-button">
          ← Back to Character List
        </button>
        <h3>Editing: {{ selectedCharacter?.name || 'Unknown Character' }}</h3>
        <div class="character-quick-actions" v-if="selectedCharacter">
          <button @click="duplicateCharacter(selectedCharacter.id)" class="action-button duplicate">
            🔄 Duplicate
          </button>
          <button v-if="!selectedCharacter.isDead" @click="killCharacter(selectedCharacter.id)" class="action-button kill">
            💀 Kill
          </button>
          <button v-else @click="resurrectCharacter(selectedCharacter.id)" class="action-button resurrect">
            ❤️ Resurrect
          </button>
          <button @click="deleteCharacter(selectedCharacter.id)" class="action-button delete">
            🗑️ Delete
          </button>
        </div>
      </div>

      <!-- Character Editor Form -->
      <div class="character-form" v-if="selectedCharacter">
        <div class="editor-content">
          <!-- Basic Info -->
          <div class="section">
            <h4>🔖 Basic Information</h4>
            <div class="form-grid">
              <div class="field-group">
                <label>Name</label>
                <input 
                  v-model="currentCharacter.name" 
                  @input="saveChanges"
                  class="text-field"
                  placeholder="Character name"
                />
              </div>
              <div class="field-group">
                <label>Age</label>
                <input 
                  v-model="currentCharacter.age" 
                  @input="saveChanges"
                  class="text-field"
                  type="number"
                  min="1"
                  max="150"
                  placeholder="Age in years"
                />
              </div>
              <div class="field-group">
                <label>Location</label>
                <input 
                  v-model="currentCharacter.location" 
                  @input="saveChanges"
                  class="text-field"
                  placeholder="e.g., Town Center, North District"
                />
              </div>
              <div class="field-group">
                <label>Occupation</label>
                <input 
                  v-model="currentCharacter.occupation" 
                  @input="saveChanges"
                  class="text-field"
                  placeholder="e.g., Baker, Teacher, Artist"
                />
              </div>
              <div class="field-group">
                <label>MBTI Type</label>
                <select 
                  v-model="currentCharacter.MBTI" 
                  @change="saveChanges"
                  class="select-field"
                >
                  <option v-for="type in mbtiTypes" :key="type" :value="type">{{ type }}</option>
                </select>
              </div>
              <div class="field-group">
                <label>Sexuality</label>
                <input 
                  v-model="currentCharacter.sexuality" 
                  @input="saveChanges"
                  class="text-field"
                  placeholder="e.g., heterosexual, pansexual"
                />
              </div>
              <div class="field-group">
                <label>Current Emotion</label>
                <select 
                  v-model="currentCharacter.currentEmotion" 
                  @change="saveChanges"
                  class="select-field"
                >
                  <option v-for="emotion in emotions" :key="emotion" :value="emotion">{{ emotion }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Big Five Traits -->
          <div class="section">
            <h4>🧠 Personality Traits (Big Five)</h4>
            <div class="traits-grid">
              <div v-for="(value, trait) in currentCharacter.bigFive" :key="trait" class="trait-slider">
                <label>{{ formatTraitName(trait) }}</label>
                <div class="slider-container">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    :value="value"
                    @input="updateTrait(trait, $event)"
                    class="slider"
                  />
                  <span class="slider-value">{{ value }}</span>
                </div>
                <div class="trait-description">{{ getTraitDescription(trait, value) }}</div>
              </div>
            </div>
          </div>

          <!-- Desires -->
          <div class="section">
            <h4>💫 Desires & Goals</h4>
            <div class="list-editor">
              <div v-for="(desire, index) in currentCharacter.desires" :key="index" class="list-item">
                <input 
                  v-model="currentCharacter.desires[index]" 
                  @input="saveChanges"
                  class="text-field"
                  placeholder="Enter a desire or goal..."
                />
                <button @click="removeDesire(index)" class="remove-btn">❌</button>
              </div>
              <button @click="addDesire" class="add-btn">+ Add Desire</button>
            </div>
          </div>

          <!-- Mental Health -->
          <div class="section">
            <h4>🧘 Mental Health</h4>
            <div class="list-editor">
              <div v-for="(condition, index) in currentCharacter.mentalHealth" :key="index" class="list-item">
                <input 
                  v-model="currentCharacter.mentalHealth[index]" 
                  @input="saveChanges"
                  class="text-field"
                  placeholder="e.g., anxiety, forgetfulness..."
                />
                <button @click="removeMentalHealth(index)" class="remove-btn">❌</button>
              </div>
              <button @click="addMentalHealth" class="add-btn">+ Add Condition</button>
            </div>
          </div>

          <!-- Relationships -->
          <div class="section">
            <h4>💝 Relationships</h4>
            <div class="list-editor">
              <div v-for="(relationship, index) in filteredRelationships" :key="index" class="relationship-item">
                <div class="relationship-row">
                  <select 
                    v-model="relationship.name" 
                    @change="saveChanges"
                    class="relationship-select"
                  >
                    <option value="">Select character...</option>
                    <option 
                      v-for="char in characters.charactersList.filter(c => c.id !== currentCharacter?.id)" 
                      :key="char.id" 
                      :value="char.name"
                    >
                      {{ char.name }}
                    </option>
                  </select>
                  <select 
                    v-model="relationship.type" 
                    @change="saveChanges"
                    class="relationship-type-select"
                  >
                    <option value="">Relationship type...</option>
                    <option value="friend">Friend</option>
                    <option value="close_friend">Close Friend</option>
                    <option value="best_friend">Best Friend</option>
                    <option value="acquaintance">Acquaintance</option>
                    <option value="neighbor">Neighbor</option>
                    <option value="colleague">Colleague</option>
                    <option value="mentor">Mentor</option>
                    <option value="student">Student</option>
                    <option value="family">Family</option>
                    <option value="romantic_interest">Romantic Interest</option>
                    <option value="partner">Partner</option>
                    <option value="rival">Rival</option>
                    <option value="enemy">Enemy</option>
                    <option value="complicated">It's Complicated</option>
                  </select>
                  <button @click="removeRelationship(index)" class="remove-btn">❌</button>
                </div>
                <div class="relationship-notes">
                  <input 
                    v-model="relationship.notes" 
                    @input="saveChanges"
                    class="relationship-notes-input"
                    placeholder="Optional notes about this relationship..."
                  />
                </div>
              </div>
              <button @click="addRelationship" class="add-btn">+ Add Relationship</button>
            </div>
          </div>

          <!-- Memories -->
          <div class="section">
            <div class="section-header">
              <h4>📚 Memories</h4>
              <div class="memory-controls">
                <div class="memory-stats">
                  <span class="memory-count">{{ currentCharacter.memories.length }}/{{ ui.memorySettings.maxMemories }}</span>
                  <span class="memory-strategy">{{ ui.memorySettings.strategy === 'fifo' ? 'FIFO' : 'Periodic' }}</span>
                </div>
              </div>
            </div>
            
            <div class="memory-management">
              <div class="management-controls">
                <div class="control-group">
                  <label>Max Memories:</label>
                  <input 
                    type="range" 
                    min="5" 
                    max="100" 
                    :value="ui.memorySettings.maxMemories"
                    @input="ui.setMaxMemories(parseInt($event.target.value))"
                    class="memory-slider"
                  />
                  <span class="slider-value">{{ ui.memorySettings.maxMemories }}</span>
                </div>
                
                <div class="control-group">
                  <label>Strategy:</label>
                  <select 
                    :value="ui.memorySettings.strategy"
                    @change="ui.setMemoryStrategy($event.target.value)"
                    class="strategy-select"
                  >
                    <option value="fifo">FIFO (Oldest deleted when limit exceeded)</option>
                    <option value="periodic">Periodic (Wipe every X ticks)</option>
                  </select>
                </div>
                
                <div v-if="ui.memorySettings.strategy === 'periodic'" class="control-group">
                  <label>Wipe Interval (ticks):</label>
                  <input 
                    type="range" 
                    min="10" 
                    max="200" 
                    :value="ui.memorySettings.wipeInterval"
                    @input="ui.setMemoryWipeInterval(parseInt($event.target.value))"
                    class="memory-slider"
                  />
                  <span class="slider-value">{{ ui.memorySettings.wipeInterval }}</span>
                </div>
              </div>
            </div>

            <div class="memories-container">
              <div class="memories-grid">
                <div 
                  v-for="(memory, index) in sortedMemories" 
                  :key="memory.id"
                  class="memory-card"
                  :class="getMemoryCardClass(memory)"
                >
                  <div class="memory-header">
                    <div class="memory-meta">
                      <span class="memory-index">#{{ index + 1 }}</span>
                      <span class="memory-time">{{ formatMemoryTime(memory.timestamp) }}</span>
                      <div class="memory-tags">
                        <span 
                          v-for="tag in memory.tags" 
                          :key="tag" 
                          class="memory-tag"
                          :class="`tag-${tag}`"
                        >
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                    <button @click="removeMemory(index)" class="remove-memory-btn">
                      ❌
                    </button>
                  </div>
                  
                  <div class="memory-content-area">
                    <textarea 
                      v-model="memory.content" 
                      @input="saveChanges"
                      class="memory-text"
                      placeholder="Describe this memory..."
                      rows="3"
                    ></textarea>
                  </div>
                  
                  <div class="memory-footer">
                    <div class="emotional-weight">
                      <label>Impact:</label>
                      <div class="weight-display">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          v-model="memory.emotional_weight"
                          @input="saveChanges"
                          class="weight-slider"
                        />
                        <span class="weight-value" :class="getWeightClass(memory.emotional_weight)">
                          {{ memory.emotional_weight }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="memory-actions">
                <button @click="addMemory" class="add-memory-btn">
                  + Add Memory
                </button>
                <button @click="sortMemoriesByImpact" class="sort-btn">
                  📊 Sort by Impact
                </button>
                <button @click="sortMemoriesByTime" class="sort-btn">
                  🕒 Sort by Time
                </button>
              </div>
            </div>
          </div>

          <!-- Position -->
          <div class="section">
            <h4>📍 Position</h4>
            <div class="form-grid">
              <div class="field-group">
                <label>X Coordinate</label>
                <input 
                  type="number" 
                  v-model="currentCharacter.position.x" 
                  @input="saveChanges"
                  class="text-field"
                />
              </div>
              <div class="field-group">
                <label>Y Coordinate</label>
                <input 
                  type="number" 
                  v-model="currentCharacter.position.y" 
                  @input="saveChanges"
                  class="text-field"
                />
              </div>
              <div class="field-group">
                <label>Current Zone</label>
                <select 
                  v-model="currentCharacter.position.zone" 
                  @change="saveChanges"
                  class="select-field"
                >
                  <option value="">No zone</option>
                  <option v-for="zone in zones.zones" :key="zone.id" :value="zone.id">
                    {{ zone.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="actions">
            <button @click="generateSprite" class="action-btn generate-btn" :disabled="isGenerating">
              {{ isGenerating ? '🎨 Generating...' : '🎨 Generate AI Sprite' }}
            </button>
            <button @click="resetCharacter" class="action-btn reset-btn">
              🔄 Reset to Original
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Character Dialog -->
    <div v-if="showCreateDialog" class="modal-overlay" @click="showCreateDialog = false">
      <div class="modal-content" @click.stop>
        <h3>Create New Character</h3>
        <form @submit.prevent="createNewCharacter">
          <div class="form-group">
            <label>Name:</label>
            <input v-model="newCharacterData.name" type="text" required>
          </div>
          <div class="form-group">
            <label>Age:</label>
            <input v-model="newCharacterData.age" type="number" min="1" max="150" placeholder="25">
          </div>
          <div class="form-group">
            <label>Location:</label>
            <input v-model="newCharacterData.location" type="text" placeholder="e.g., Town Center, North District">
          </div>
          <div class="form-group">
            <label>Occupation:</label>
            <input v-model="newCharacterData.occupation" type="text" placeholder="e.g., Baker, Teacher, Artist">
          </div>
          <div class="form-group">
            <label>MBTI Type:</label>
            <select v-model="newCharacterData.MBTI">
              <option value="ENFP">ENFP - The Campaigner</option>
              <option value="INFP">INFP - The Mediator</option>
              <option value="ENFJ">ENFJ - The Protagonist</option>
              <option value="INFJ">INFJ - The Advocate</option>
              <option value="ENTP">ENTP - The Debater</option>
              <option value="INTP">INTP - The Thinker</option>
              <option value="ENTJ">ENTJ - The Commander</option>
              <option value="INTJ">INTJ - The Architect</option>
              <option value="ESFP">ESFP - The Entertainer</option>
              <option value="ISFP">ISFP - The Adventurer</option>
              <option value="ESFJ">ESFJ - The Consul</option>
              <option value="ISFJ">ISFJ - The Protector</option>
              <option value="ESTP">ESTP - The Entrepreneur</option>
              <option value="ISTP">ISTP - The Virtuoso</option>
              <option value="ESTJ">ESTJ - The Executive</option>
              <option value="ISTJ">ISTJ - The Logistician</option>
            </select>
          </div>
          <div class="form-group">
            <label>Initial Emotion:</label>
            <select v-model="newCharacterData.currentEmotion">
              <option value="happy">Happy</option>
              <option value="sad">Sad</option>
              <option value="excited">Excited</option>
              <option value="angry">Angry</option>
              <option value="contemplative">Contemplative</option>
              <option value="anxious">Anxious</option>
              <option value="content">Content</option>
              <option value="confused">Confused</option>
              <option value="determined">Determined</option>
              <option value="nostalgic">Nostalgic</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" class="create-btn">Create Character</button>
            <button type="button" @click="showCreateDialog = false" class="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Death Dialog -->
    <div v-if="showDeathDialog" class="modal-overlay" @click="showDeathDialog = false">
      <div class="modal-content" @click.stop>
        <h3>Character Death</h3>
        <p>How did <strong>{{ getCharacterName(characterToKill) }}</strong> die?</p>
        <form @submit.prevent="confirmKill">
          <div class="form-group">
            <label>Cause of Death:</label>
            <input v-model="causeOfDeath" type="text" required 
                   placeholder="e.g., Dragon attack, Old age, Accident...">
          </div>
          <div class="form-actions">
            <button type="submit" class="kill-btn">💀 Confirm Death</button>
            <button type="button" @click="showDeathDialog = false" class="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Resurrection Dialog -->
    <div v-if="showResurrectionDialog" class="modal-overlay" @click="showResurrectionDialog = false">
      <div class="modal-content" @click.stop>
        <h3>Character Resurrection</h3>
        <p>How was <strong>{{ getCharacterName(characterToResurrect) }}</strong> brought back to life?</p>
        <form @submit.prevent="confirmResurrection">
          <div class="form-group">
            <label>Resurrection Method:</label>
            <input v-model="resurrectionReason" type="text" required 
                   placeholder="e.g., Magic ritual, Divine intervention, Science...">
          </div>
          <div class="form-actions">
            <button type="submit" class="resurrect-btn">✨ Resurrect</button>
            <button type="button" @click="showResurrectionDialog = false" class="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useCharactersStore, useZonesStore, useSimulationStore } from '@/stores'
import { useUIStore } from '@/stores'
import { openAIAssets } from '@/services/openAiAssets'

const characters = useCharactersStore()
const zones = useZonesStore()
const ui = useUIStore()

// Use GLOBAL character selection from UI store (not local state)
const localSelectedCharacterId = computed({
  get: () => ui.selectedCharacterId,
  set: (value) => ui.selectCharacter(value)
})
const currentCharacter = ref(null)
const isGenerating = ref(false)
const isCreating = ref(false)
const memorySortMode = ref('time') // 'time', 'impact'
const relationshipFilter = ref('all')

const mbtiTypes = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
]

const emotions = [
  'content', 'happy', 'sad', 'angry', 'anxious', 'excited',
  'melancholic', 'contemplative', 'hopeful', 'lonely', 'peaceful',
  'determined', 'nostalgic', 'whimsical', 'mischievous'
]

const showCreateDialog = ref(false)
const showDeathDialog = ref(false)
const showResurrectionDialog = ref(false)
const characterToKill = ref(null)
const characterToResurrect = ref(null)
const causeOfDeath = ref('')
const resurrectionReason = ref('')

const newCharacterData = ref({
  name: '',
  age: '',
  location: '',
  occupation: '',
  MBTI: 'ENFP',
  currentEmotion: 'content'
})

const selectedCharacter = computed(() => 
  localSelectedCharacterId.value ? characters.getCharacter(localSelectedCharacterId.value) : null
)

const characterDetailRef = ref(null)

// Update the currentCharacter ref when GLOBAL selection changes
watch(() => ui.selectedCharacterId, (newId) => {
  if (newId && characters.getCharacter(newId)) {
    currentCharacter.value = { ...characters.getCharacter(newId) }
  } else {
    currentCharacter.value = null
  }
}, { immediate: true })

function loadCharacter() {
  if (localSelectedCharacterId.value) {
    const character = characters.getCharacter(localSelectedCharacterId.value)
    if (character) {
      currentCharacter.value = JSON.parse(JSON.stringify(character))
    }
  } else {
    currentCharacter.value = null
  }
}

function saveChanges() {
  if (currentCharacter.value) {
    characters.updateCharacter(currentCharacter.value.id, currentCharacter.value)
  }
}

function updateTrait(trait, event) {
  if (currentCharacter.value) {
    const value = parseInt(event.target.value)
    currentCharacter.value.bigFive[trait] = value
    saveChanges()
  }
}

function formatTraitName(trait) {
  return trait.charAt(0).toUpperCase() + trait.slice(1)
}

function getTraitDescription(trait, value) {
  const descriptions = {
    openness: {
      low: 'Prefers routine and familiar',
      high: 'Creative and open to new experiences'
    },
    conscientiousness: {
      low: 'Spontaneous and flexible',
      high: 'Organized and disciplined'
    },
    extraversion: {
      low: 'Quiet and reserved',
      high: 'Outgoing and energetic'
    },
    agreeableness: {
      low: 'Direct and competitive',
      high: 'Cooperative and trusting'
    },
    neuroticism: {
      low: 'Calm and emotionally stable',
      high: 'Sensitive and prone to stress'
    }
  }
  
  const level = value > 70 ? 'high' : value < 30 ? 'low' : 'moderate'
  return descriptions[trait]?.[level] || 'Balanced'
}

function addDesire() {
  if (currentCharacter.value) {
    currentCharacter.value.desires.push('')
  }
}

function removeDesire(index) {
  if (currentCharacter.value) {
    currentCharacter.value.desires.splice(index, 1)
    saveChanges()
  }
}

function addMentalHealth() {
  if (currentCharacter.value) {
    currentCharacter.value.mentalHealth.push('')
  }
}

function removeMentalHealth(index) {
  if (currentCharacter.value) {
    currentCharacter.value.mentalHealth.splice(index, 1)
    saveChanges()
  }
}

function addRelationship() {
  if (currentCharacter.value) {
    currentCharacter.value.relationships.push({ name: '', type: '', notes: '' })
  }
}

function removeRelationship(index) {
  if (currentCharacter.value) {
    currentCharacter.value.relationships.splice(index, 1)
    saveChanges()
  }
}

function addMemory() {
  if (currentCharacter.value) {
    const newMemory = {
      id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      content: '',
      emotional_weight: 50,
      tags: ['custom']
    }
    currentCharacter.value.memories.push(newMemory)
  }
}

function removeMemory(index) {
  if (currentCharacter.value) {
    currentCharacter.value.memories.splice(index, 1)
    saveChanges()
  }
}

async function generateSprite() {
  if (!currentCharacter.value) return
  
  isGenerating.value = true
  try {
    console.log(`🎨 Generating new sprite for ${currentCharacter.value.name}...`)
    
    // Check if OpenAI API key is available
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    if (!apiKey) {
      alert('⚠️ OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.')
      return
    }
    
    const spriteUrl = await openAIAssets.generateCharacterSprite({
      name: currentCharacter.value.name,
      MBTI: currentCharacter.value.MBTI,
      description: `${currentCharacter.value.desires.join(', ')}. Mental health: ${currentCharacter.value.mentalHealth.join(', ')}`,
      mentalHealth: currentCharacter.value.mentalHealth,
      desires: currentCharacter.value.desires
    })
    
    console.log(`✅ Generated sprite for ${currentCharacter.value.name}:`, spriteUrl)
    
    // Update character with new sprite URL
    currentCharacter.value.sprite = spriteUrl
    saveChanges()
    
    alert(`🎨 New sprite generated for ${currentCharacter.value.name}! The AI-generated image will be used in the simulation.`)
    
  } catch (error) {
    console.error('Failed to generate sprite:', error)
    alert(`❌ Failed to generate sprite: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    isGenerating.value = false
  }
}

function resetCharacter() {
  if (localSelectedCharacterId.value) {
    characters.resetCharacters()
    loadCharacter()
  }
}

onMounted(() => {
  // Force reset loading state to prevent stuck spinners from HMR
  isGenerating.value = false
  
  // Don't auto-select a character - let the global UI store handle selection
  // The character will be selected when clicked on the canvas or in the character list
})

const nearbyCharacters = computed(() => {
  if (!selectedCharacter.value) return []
  
  return characters.charactersList.filter(char => {
    // Filter logic here
  })
})

const sortedMemories = computed(() => {
  if (!currentCharacter.value?.memories) return []
  
  const memories = [...currentCharacter.value.memories]
  
  if (memorySortMode.value === 'impact') {
    return memories.sort((a, b) => (b.emotional_weight || 0) - (a.emotional_weight || 0))
  } else {
    return memories.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  }
})

function formatMemoryTime(timestamp) {
  if (!timestamp) return 'Unknown time'
  const date = new Date(timestamp)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getMemoryCardClass(memory) {
  const weight = memory.emotional_weight || 0
  if (weight >= 80) return 'memory-high'
  if (weight >= 60) return 'memory-medium-high'
  if (weight >= 40) return 'memory-medium'
  if (weight >= 20) return 'memory-low-medium'
  return 'memory-low'
}

function getWeightClass(weight) {
  if (weight >= 80) return 'weight-high'
  if (weight >= 60) return 'weight-medium-high'
  if (weight >= 40) return 'weight-medium'
  if (weight >= 20) return 'weight-low-medium'
  return 'weight-low'
}

function sortMemoriesByImpact() {
  memorySortMode.value = 'impact'
}

function sortMemoriesByTime() {
  memorySortMode.value = 'time'
}

function selectCharacter(characterId) {
  ui.selectCharacter(characterId)
}

function createNewCharacter() {
  const newChar = characters.createCharacter(newCharacterData.value)
  ui.selectCharacter(newChar.id)
  showCreateDialog.value = false
  
  // Reset form
  newCharacterData.value = {
    name: '',
    age: '',
    location: '',
    occupation: '',
    MBTI: 'ENFP',
    currentEmotion: 'content'
  }
}

function duplicateCharacter(characterId) {
  const duplicate = characters.duplicateCharacter(characterId)
  if (duplicate) {
    ui.selectCharacter(duplicate.id)
  }
}

function deleteCharacter(characterId) {
  if (confirm(`Are you sure you want to delete this character? This action cannot be undone.`)) {
    characters.deleteCharacter(characterId)
    
    // If the deleted character was selected, select another one or clear selection
    if (ui.selectedCharacterId === characterId) {
      const remainingCharacters = characters.charactersList
      if (remainingCharacters.length > 0) {
        ui.selectCharacter(remainingCharacters[0].id)
      } else {
        ui.selectCharacter(undefined)
      }
    }
  }
}

function killCharacter(characterId) {
  characterToKill.value = characterId
  causeOfDeath.value = ''
  showDeathDialog.value = true
}

function confirmKill() {
  characters.setCharacterDead(characterToKill.value, causeOfDeath.value)
  showDeathDialog.value = false
  characterToKill.value = null
  causeOfDeath.value = ''
}

function resurrectCharacter(characterId) {
  characterToResurrect.value = characterId
  resurrectionReason.value = ''
  showResurrectionDialog.value = true
}

function confirmResurrection() {
  characters.resurrectCharacter(characterToResurrect.value, resurrectionReason.value)
  showResurrectionDialog.value = false
  characterToResurrect.value = null
  resurrectionReason.value = ''
}

function resetAllCharacters() {
  if (confirm('Are you sure you want to reset all characters to their original state? This will remove all modifications.')) {
    characters.resetCharacters()
    localSelectedCharacterId.value = characters.charactersList[0]?.id || null
  }
}

function getCharacterName(characterId) {
  return characters.getCharacter(characterId)?.name || 'Unknown'
}

const filteredRelationships = computed(() => {
  if (!currentCharacter.value) return []
  return (currentCharacter.value.relationships || []).filter(rel => 
    relationshipFilter.value === '' || 
    rel.name.toLowerCase().includes(relationshipFilter.value.toLowerCase()) ||
    rel.type.toLowerCase().includes(relationshipFilter.value.toLowerCase())
  )
})

const aliveCharacters = computed(() => 
  characters.charactersList.filter(char => !char.isDead)
)

const deadCharacters = computed(() => 
  characters.charactersList.filter(char => char.isDead)
)

function backToList() {
  ui.selectCharacter(undefined)
}

// Scroll to top when character selection changes
watch(() => ui.selectedCharacterId, async (newId) => {
  if (newId && characterDetailRef.value) {
    await nextTick()
    characterDetailRef.value.scrollTop = 0
  }
})

const filteredCharacters = computed(() => {
  if (relationshipFilter.value === 'all') {
    return characters.charactersList
  } else if (relationshipFilter.value === 'alive') {
    return characters.charactersList.filter(char => !char.isDead)
  } else if (relationshipFilter.value === 'dead') {
    return characters.charactersList.filter(char => char.isDead)
  }
  return characters.charactersList
})

async function createCharacter() {
  isCreating.value = true
  try {
    const newChar = await characters.createCharacter({
      name: `Character ${characters.charactersList.length + 1}`,
      MBTI: 'ENFP',
      currentEmotion: 'content'
    })
    ui.selectCharacter(newChar.id)
  } catch (error) {
    console.error('Failed to create character:', error)
    alert('Failed to create character. Please try again.')
  } finally {
    isCreating.value = false
  }
}
</script>

<style scoped>
.character-editor {
  padding: 0;
  height: 100%;
  overflow-y: auto;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.editor-header h3 {
  margin: 0;
  color: #495057;
}

.character-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.character-selector label {
  font-weight: 500;
  color: #6c757d;
}

.editor-content {
  padding: 20px;
}

.section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f1f3f4;
}

.section h4 {
  margin: 0 0 15px 0;
  color: #343a40;
  font-size: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.memory-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.memory-stats {
  display: flex;
  gap: 10px;
  align-items: center;
}

.memory-count {
  background: #e3f2fd;
  color: #1565c0;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.memory-strategy {
  background: #f3e5f5;
  color: #7b1fa2;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.memory-management {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid #e9ecef;
}

.management-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.memory-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e9ecef;
  outline: none;
  -webkit-appearance: none;
}

.memory-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

.strategy-select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.slider-value {
  font-weight: bold;
  color: #667eea;
  background: #f8f9ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  align-self: flex-start;
}

.memories-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.no-memories {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
  font-style: italic;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px dashed #dee2e6;
}

.memories-grid {
  display: grid;
  gap: 16px;
}

.memory-card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  background: white;
  transition: all 0.2s ease;
  border-left: 4px solid #e9ecef;
}

.memory-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.memory-high {
  border-left-color: #dc3545;
  background: linear-gradient(135deg, #fff5f5 0%, white 100%);
}

.memory-medium-high {
  border-left-color: #fd7e14;
  background: linear-gradient(135deg, #fff8f0 0%, white 100%);
}

.memory-medium {
  border-left-color: #ffc107;
  background: linear-gradient(135deg, #fffef7 0%, white 100%);
}

.memory-low-medium {
  border-left-color: #28a745;
  background: linear-gradient(135deg, #f8fff8 0%, white 100%);
}

.memory-low {
  border-left-color: #6c757d;
  background: linear-gradient(135deg, #f8f9fa 0%, white 100%);
}

.memory-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.memory-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.memory-index {
  font-weight: bold;
  color: #495057;
  font-size: 14px;
}

.memory-time {
  font-size: 11px;
  color: #6c757d;
  font-family: 'Monaco', 'Menlo', monospace;
}

.memory-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.memory-tag {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
}

.tag-conversation {
  background: #e3f2fd;
  color: #1565c0;
}

.tag-action {
  background: #e8f5e8;
  color: #2e7d32;
}

.tag-thought {
  background: #f3e5f5;
  color: #7b1fa2;
}

.tag-simulation {
  background: #fff3e0;
  color: #e65100;
}

.tag-custom {
  background: #f0f4f8;
  color: #374151;
}

.remove-memory-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.7;
  transition: opacity 0.2s;
  padding: 2px;
}

.remove-memory-btn:hover {
  opacity: 1;
}

.memory-content-area {
  margin-bottom: 12px;
}

.memory-text {
  width: 100%;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
}

.memory-text:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.memory-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.emotional-weight {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.emotional-weight label {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
}

.weight-display {
  display: flex;
  align-items: center;
  gap: 10px;
}

.weight-slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #e9ecef;
  outline: none;
  -webkit-appearance: none;
}

.weight-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

.weight-value {
  font-weight: bold;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 24px;
  text-align: center;
}

.weight-high {
  background: #ffebee;
  color: #c62828;
}

.weight-medium-high {
  background: #fff3e0;
  color: #ef6c00;
}

.weight-medium {
  background: #fffef7;
  color: #f57f17;
}

.weight-low-medium {
  background: #f1f8e9;
  color: #558b2f;
}

.weight-low {
  background: #f5f5f5;
  color: #616161;
}

.memory-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.add-memory-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-memory-btn:hover {
  background: #5a67d8;
  transform: translateY(-1px);
}

.sort-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.sort-btn:hover {
  background: #5a6268;
  transform: translateY(-1px);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-group label {
  font-weight: 500;
  color: #495057;
  font-size: 14px;
}

.text-field, .select-field {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
}

.text-field:focus, .select-field:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.traits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.trait-slider {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trait-slider label {
  font-weight: 500;
  color: #495057;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #e9ecef;
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
}

.slider-value {
  font-weight: bold;
  color: #667eea;
  min-width: 30px;
  text-align: center;
}

.trait-description {
  font-size: 12px;
  color: #6c757d;
  font-style: italic;
}

.list-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.list-item .text-field, .list-item .select-field {
  flex: 1;
}

.remove-btn, .add-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.remove-btn {
  background: #ff6b6b;
  color: white;
}

.add-btn {
  background: #51cf66;
  color: white;
  align-self: flex-start;
}

.remove-btn:hover, .add-btn:hover {
  opacity: 0.8;
}

.actions {
  display: flex;
  gap: 15px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.action-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.generate-btn {
  background: #667eea;
  color: white;
}

.reset-btn {
  background: #ff6b6b;
  color: white;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-character {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6c757d;
  font-style: italic;
}

.relationship-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: #f8f9fa;
}

.relationship-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.relationship-select {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.relationship-type-select {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.relationship-notes {
  margin-top: 4px;
}

.relationship-notes-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 13px;
  font-style: italic;
  background: white;
}

.relationship-notes-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.character-management {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.management-section {
  margin-bottom: 20px;
}

.management-controls {
  display: flex;
  gap: 10px;
}

.create-btn, .reset-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-btn {
  background: #667eea;
  color: white;
}

.reset-btn {
  background: #ff6b6b;
  color: white;
}

.character-overview {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.overview-stats {
  display: flex;
  gap: 10px;
  align-items: center;
}

.stat {
  background: #e3f2fd;
  color: #1565c0;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.alive {
  background: #e8f5e8;
  color: #2e7d32;
}

.dead {
  background: #fff5f5;
  color: #c62828;
}

.character-list {
  padding: 20px;
}

.character-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.character-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: #007bff;
}

.character-card.selected {
  border-color: #007bff;
  background: linear-gradient(135deg, #e7f3ff 0%, #f0f8ff 100%);
  box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
}

.character-card.dead {
  background: linear-gradient(135deg, #f8f8f8 0%, #e9e9e9 100%);
  border-color: #dc3545;
  opacity: 0.8;
}

.character-card.dead:hover {
  border-color: #dc3545;
  box-shadow: 0 4px 15px rgba(220, 53, 69, 0.2);
}

.character-card.dead.selected {
  background: linear-gradient(135deg, #ffe6e9 0%, #fff0f1 100%);
  border-color: #dc3545;
}

.character-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.character-name {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  flex: 1;
}

.character-status {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.alive {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-badge.dead {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.character-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.character-description {
  font-size: 13px;
  color: #6c757d;
  line-height: 1.4;
  margin-bottom: 15px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.character-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}

.character-emotions {
  display: flex;
  gap: 6px;
}

.emotion-tag {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 11px;
  color: #495057;
  font-weight: 500;
}

.character-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.character-card:hover .character-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 300px;
  max-width: 100%;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #495057;
}

.form-group input, .form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 6px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.create-btn, .cancel-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-btn {
  background: #667eea;
  color: white;
}

.cancel-btn {
  background: #ff6b6b;
  color: white;
}

.create-btn:hover, .cancel-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.back-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.back-button:hover {
  opacity: 1;
}

.character-quick-actions {
  display: flex;
  gap: 8px;
}

.character-quick-actions .action-button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.character-quick-actions .action-button.duplicate {
  background: #e3f2fd;
  color: #1976d2;
}

.character-quick-actions .action-button.kill {
  background: #ffebee;
  color: #d32f2f;
}

.character-quick-actions .action-button.resurrect {
  background: #e8f5e8;
  color: #388e3c;
}

.character-quick-actions .action-button.delete {
  background: #fce4ec;
  color: #c2185b;
}

.character-quick-actions .action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.create-button {
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.create-button:hover:not(:disabled) {
  background: #45a049;
}

.create-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.filter-section {
  padding: 0 20px 20px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}
</style> 