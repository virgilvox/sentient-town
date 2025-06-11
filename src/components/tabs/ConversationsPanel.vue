<template>
  <div class="conversations-panel">
    <div class="conversations-header">
      <h3>💬 Conversations</h3>
      <div class="controls">
        <div class="filter-group">
          <label>Status:</label>
          <select v-model="statusFilter" class="filter-select">
            <option value="">All Conversations</option>
            <option value="active">🟢 Active</option>
            <option value="ended">✅ Ended</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Character:</label>
          <select v-model="characterFilter" class="filter-select" :disabled="!characters.isLoaded">
            <option value="">{{ characters.isLoaded ? 'All Characters' : 'Loading...' }}</option>
            <option 
              v-for="character in characters.charactersList" 
              :key="character.id" 
              :value="character.id"
            >
              {{ character.name }}
            </option>
          </select>
        </div>
        <div class="action-buttons">
          <button @click="debugConversations" class="debug-button" title="Debug conversation state">
            🐛 Debug
          </button>
          <button @click="createTestConversation" class="test-button" title="Create test conversation">
            🧪 Test
          </button>
          <button @click="groupCharactersTogether" class="group-button" title="Gather characters together">
            👥 Group
          </button>
        </div>
      </div>
    </div>

    <!-- Conversation Tuning Controls -->
    <div class="conversation-controls">
      <h5>💬 Conversation Settings</h5>
      <div class="control-group">
        <label>Base Conversation Chance:</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          v-model="conversationProbability"
          @input="updateConversationSettings"
          class="probability-slider"
        />
        <span class="probability-value">{{ conversationProbability }}%</span>
      </div>
      <div class="control-group">
        <label>Join Conversation Chance:</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          v-model="joinProbability"
          @input="updateConversationSettings"
          class="probability-slider"
        />
        <span class="probability-value">{{ joinProbability }}%</span>
      </div>
    </div>

    <div class="conversations-content">
      <div v-if="filteredConversations.length === 0" class="no-conversations">
        <div class="no-conversations-icon">💬</div>
        <p>No conversations yet. Characters will start talking when the simulation runs!</p>
        
        <!-- Debugging info -->
        <div style="margin-top: 20px; font-size: 12px; color: #666; background: #f0f0f0; padding: 10px; border-radius: 4px;">
          <div><strong>Debug Info:</strong></div>
          <div>Total conversations in store: {{ simulationStore.conversations.length }}</div>
          <div>Active conversations: {{ activeConversations.length }}</div>
          <div>Filtered conversations count: {{ filteredConversations.length }}</div>
          <div>Status filter: "{{ statusFilter }}"</div>
          <div>Character filter: "{{ characterFilter }}"</div>
          <div>Characters loaded: {{ characters.isLoaded }}</div>
        </div>
      </div>

      <div v-else class="conversations-list">
        <div 
          v-for="conversation in filteredConversations" 
          :key="conversation.id" 
          class="conversation-item"
          :class="{ active: selectedConversation?.id === conversation.id }"
          @click="selectConversation(conversation)"
        >
          <div class="conversation-header">
            <div class="conversation-info">
              <span class="conversation-status">
                {{ conversation.isActive ? '🟢' : '🔴' }}
              </span>
              <span class="conversation-participants">
                {{ getParticipantNames(conversation) }}
              </span>
              <span class="conversation-meta">
                ({{ conversation.messages.length }} message{{ conversation.messages.length === 1 ? '' : 's' }})
              </span>
            </div>
            <div class="conversation-timing">
              <span class="conversation-time">
                {{ getConversationDuration(conversation) }}
              </span>
              <span class="conversation-status-text">
                {{ conversation.isActive ? 'Active' : 'Ended' }}
              </span>
            </div>
          </div>
          <div class="conversation-preview">
            {{ getPreviewText(conversation) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Conversation Detail Modal -->
    <div v-if="selectedConversationId" class="conversation-modal" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h4>💬 Conversation Details</h4>
          <button @click="closeModal" class="close-btn">❌</button>
        </div>
        
        <div v-if="selectedConversation" class="modal-body">
          <div class="conversation-info">
            <div class="info-row">
              <strong>Participants:</strong>
              <span class="participants-list">
                {{ getParticipantNames(selectedConversation) }}
              </span>
            </div>
            <div class="info-row">
              <strong>Status:</strong>
              <span :class="['status-badge', selectedConversation.isActive ? 'ongoing' : 'completed']">
                {{ getStatusIcon(selectedConversation.isActive ? 'ongoing' : 'completed') }} {{ selectedConversation.isActive ? 'ongoing' : 'completed' }}
              </span>
            </div>
            <div class="info-row">
              <strong>Started:</strong>
              <span>{{ formatDetailedTime(selectedConversation.startTime) }}</span>
            </div>
            <div v-if="selectedConversation.endTime" class="info-row">
              <strong>Ended:</strong>
              <span>{{ formatDetailedTime(selectedConversation.endTime) }}</span>
            </div>
          </div>

          <div class="messages-section">
            <h5>💭 Messages</h5>
            <div v-if="selectedConversation.messages.length === 0" class="no-messages">
              No messages in this conversation yet.
            </div>
            <div v-else ref="messagesListRef" class="messages-list">
              <div 
                v-for="(message, index) in selectedConversation.messages" 
                :key="`${message.speakerId}-${index}`"
                class="message-item"
              >
                <div class="message-header">
                  <span class="speaker">{{ getCharacterName(message.speakerId) }}</span>
                  <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                </div>
                <div class="message-content">
                  <div 
                    @click="toggleMessageExpansion(selectedConversation.id, index)"
                    :class="{ 'expandable': message.content.length > 100, 'expanded': expandedMessages.has(`${selectedConversation.id}-${index}`) }"
                    style="cursor: pointer;"
                  >
                    {{ getDisplayContent(message.content, selectedConversation.id, index) }}
                  </div>
                </div>
                <div v-if="message.emotion" class="message-tone">
                  Tone: {{ message.emotion }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimulationStore, useCharactersStore, useZonesStore } from '@/stores'

const simulationStore = useSimulationStore()
const characters = useCharactersStore()
const zones = useZonesStore()
const { conversations, activeConversations } = storeToRefs(simulationStore)

const statusFilter = ref('')
const characterFilter = ref('')
const selectedConversationId = ref(null)
const messagesListRef = ref(null)
const expandedMessages = ref(new Set())

// Conversation tuning controls
const conversationProbability = ref(25) // Base chance for characters to start conversations
const joinProbability = ref(35) // Chance for characters to join ongoing conversations

const filteredConversations = computed(() => {
  return conversations.value.filter(conv => {
    const statusMatch = !statusFilter.value || (statusFilter.value === 'active' ? conv.isActive : !conv.isActive)
    const characterMatch = !characterFilter.value || conv.participants.includes(characterFilter.value)
    return statusMatch && characterMatch
  }).sort((a, b) => b.startTime - a.startTime)
})

const selectedConversation = computed(() => {
  if (!selectedConversationId.value) return null
  return conversations.value.find(conv => conv.id === selectedConversationId.value)
})

// Auto-scroll to bottom when new messages arrive in selected conversation
watch(
  () => selectedConversation.value?.messages.length,
  async () => {
    if (selectedConversation.value && messagesListRef.value) {
      await nextTick()
      scrollToBottom()
    }
  }
)

function scrollToBottom() {
  if (messagesListRef.value) {
    messagesListRef.value.scrollTop = messagesListRef.value.scrollHeight
  }
}

function getCharacterName(characterId) {
  if (!characters.isLoaded) {
    return 'Loading...'
  }
  
  const character = characters.getCharacter(characterId)
  return character ? character.name : 'Unknown'
}

function getStatusIcon(status) {
  switch (status) {
    case 'ongoing': return '🟢'
    case 'completed': return '🔴' 
    default: return '⚫'
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDetailedTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function selectConversation(conversation) {
  selectedConversationId.value = conversation.id
}

function closeModal() {
  selectedConversationId.value = null
}

function debugConversations() {
  console.log('=== COMPREHENSIVE CONVERSATION DEBUG ===')
  console.log('1. SIMULATION STORE STATE:')
  console.log('   All conversations:', simulationStore.conversations)
  console.log('   Active conversations:', activeConversations.value)
  console.log('   Conversation count:', simulationStore.conversations.length)
  console.log('   Active conversation count:', activeConversations.value.length)
  
  console.log('2. RAW CONVERSATION DATA:')
  console.log('   Conversations array:', simulationStore.conversations.map(c => ({
    id: c.id,
    participants: c.participants,
    participantCount: c.participants.length,
    messageCount: c.messages.length,
    isActive: c.isActive,
    startTime: new Date(c.startTime).toLocaleString(),
    endTime: c.endTime ? new Date(c.endTime).toLocaleString() : 'N/A',
    messages: c.messages.map(m => ({
      id: m.id,
      speakerId: m.speakerId,
      content: m.content.substring(0, 50) + '...',
      timestamp: new Date(m.timestamp).toLocaleString()
    }))
  })))
  
  console.log('3. CHARACTERS STATE:')
  console.log('   Characters loaded:', characters.isLoaded)
  console.log('   Character list:', characters.charactersList.map(c => ({ 
    id: c.id, 
    name: c.name,
    position: c.position,
    isDead: c.isDead 
  })))
  console.log('   Total characters:', characters.charactersList.length)
  
  console.log('4. FILTER STATE:')
  console.log('   Status filter:', statusFilter.value)
  console.log('   Character filter:', characterFilter.value)
  console.log('   Filtered conversations result:', filteredConversations.value.length)
  
  console.log('5. COMPUTED PROPERTIES:')
  console.log('   filteredConversations.value:', filteredConversations.value)
  
  console.log('6. LOCALSTORAGE STATE:')
  const saved = localStorage.getItem('meadowloop-simulation')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      console.log('   LocalStorage conversations:', data.conversations?.length || 0)
      console.log('   LocalStorage events:', data.events?.length || 0)
      console.log('   LocalStorage data size:', Math.round(saved.length / 1024) + 'KB')
      console.log('   LocalStorage conversation details:', data.conversations?.map(c => ({
        id: c.id,
        participants: c.participants,
        messageCount: c.messages?.length || 0,
        isActive: c.isActive
      })))
    } catch (e) {
      console.log('   LocalStorage parse error:', e)
    }
  } else {
    console.log('   No LocalStorage data found')
  }
  
  console.log('7. RECENT EVENTS CHECK:')
  const recentEvents = simulationStore.recentEvents || simulationStore.events || []
  const talkEvents = recentEvents.filter(e => e.type === 'conversation' || e.summary?.includes('talk') || e.summary?.includes(':'))
  console.log('   Total events:', recentEvents.length)
  console.log('   Talk/conversation events:', talkEvents.length)
  console.log('   Recent talk events:', talkEvents.slice(-5).map(e => ({
    type: e.type,
    summary: e.summary,
    details: e.details,
    timestamp: new Date(e.timestamp).toLocaleString()
  })))
  
  console.log('8. SIMULATION ENGINE STATE:')
  console.log('   Simulation running:', simulationStore.state?.isRunning)
  console.log('   Current tick:', simulationStore.state?.currentTick)
  console.log('   Last update:', simulationStore.state?.lastUpdateTime ? new Date(simulationStore.state.lastUpdateTime).toLocaleString() : 'N/A')
  
  console.log('9. DEBUGGING RECOMMENDATIONS:')
  if (simulationStore.conversations.length === 0) {
    console.log('   🔍 NO CONVERSATIONS FOUND - Possible issues:')
    console.log('      - Characters may not be speaking during simulation')
    console.log('      - Speech processing may have errors')
    console.log('      - Conversation creation may be failing')
    console.log('      - LocalStorage may be getting cleared')
  }
  
  if (talkEvents.length > 0 && simulationStore.conversations.length === 0) {
    console.log('   🚨 CRITICAL: Talk events exist but no conversations!')
    console.log('      - This suggests conversation creation is failing')
    console.log('      - Check processSpeech method in simulation engine')
    console.log('      - Check addConversation method in simulation store')
  }
  
  if (simulationStore.conversations.length > 0 && filteredConversations.value.length === 0) {
    console.log('   🔍 CONVERSATIONS EXIST BUT FILTERED OUT:')
    console.log('      - Check filter logic in computed property')
    console.log('      - Check character name matching')
    console.log('      - Check status filter logic')
  }
  
}

function createTestConversation() {
  if (characters.charactersList.length >= 2) {
    const char1 = characters.charactersList[0]
    const char2 = characters.charactersList[1]
    
    console.log('🧪 STARTING MANUAL CONVERSATION TEST')
    console.log('   Testing between:', char1.name, 'and', char2.name)
    console.log('   Before test - conversation count:', simulationStore.conversations.length)
    
    try {
      console.log('   Step 1: Creating conversation...')
      const conversationId = simulationStore.addConversation([char1.id, char2.id])
      console.log('   Step 1 result - conversation ID:', conversationId)
      console.log('   Step 1 result - conversation count after creation:', simulationStore.conversations.length)
      
      console.log('   Step 2: Adding first message...')
      simulationStore.addMessage(conversationId, {
        speakerId: char1.id,
        content: `Hello ${char2.name}! This is a test message to verify conversation functionality.`,
        emotion: 'friendly'
      })
      console.log('   Step 2 complete - added message from', char1.name)
      
      console.log('   Step 3: Adding second message...')
      simulationStore.addMessage(conversationId, {
        speakerId: char2.id,
        content: `Hi ${char1.name}! Great to talk to you. This conversation system test is working!`,
        emotion: 'happy'
      })
      console.log('   Step 3 complete - added message from', char2.name)
      
      console.log('   Step 4: Verifying conversation state...')
      const createdConversation = simulationStore.conversations.find(c => c.id === conversationId)
      if (createdConversation) {
        console.log('   ✅ CONVERSATION SUCCESSFULLY CREATED:', {
          id: createdConversation.id,
          participants: createdConversation.participants,
          messageCount: createdConversation.messages.length,
          isActive: createdConversation.isActive,
          messages: createdConversation.messages.map(m => ({
            speaker: characters.getCharacter(m.speakerId)?.name,
            content: m.content.substring(0, 50) + '...'
          }))
        })
        
        console.log('   Step 5: Checking localStorage persistence...')
        const saved = localStorage.getItem('meadowloop-simulation')
        if (saved) {
          const data = JSON.parse(saved)
          const savedConversation = data.conversations?.find(c => c.id === conversationId)
          if (savedConversation) {
            console.log('   ✅ CONVERSATION SUCCESSFULLY SAVED TO LOCALSTORAGE')
          } else {
            console.error('   ❌ CONVERSATION NOT FOUND IN LOCALSTORAGE')
          }
        }
        
        console.log('🧪 MANUAL TEST COMPLETED SUCCESSFULLY!')
        alert(`✅ Test conversation created successfully!\n\nConversation ID: ${conversationId}\nParticipants: ${char1.name} and ${char2.name}\nMessages: ${createdConversation.messages.length}\n\nCheck the console for detailed logs and refresh the conversation list.`)
        
      } else {
        console.error('   ❌ CONVERSATION NOT FOUND AFTER CREATION!')
        alert('❌ Test failed: Conversation was not found after creation. Check console for details.')
      }
      
    } catch (error) {
      console.error('🧪 MANUAL TEST FAILED:', error)
      console.error('   Error stack:', error.stack)
      alert(`❌ Test conversation creation failed!\n\nError: ${error.message}\n\nCheck console for full details.`)
    }
  } else {
    console.log('🧪 Cannot run test - need at least 2 characters')
    alert('❌ Cannot run test: Need at least 2 characters to create a test conversation')
  }
}

// Helper to get participant names
function getParticipantNames(conversation) {
  return conversation.participants
    .map(id => characters.charactersList.find(c => c.id === id)?.name || `Character ${id}`)
    .join(', ')
}

// Helper to get conversation duration
function getConversationDuration(conversation) {
  const endTime = conversation.endTime || Date.now()
  const duration = Math.round((endTime - conversation.startTime) / 1000)
  
  if (duration < 60) {
    return `${duration}s`
  } else {
    return `${Math.round(duration / 60)}m`
  }
}

function toggleMessageExpansion(conversationId, messageIndex) {
  const key = `${conversationId}-${messageIndex}`
  const newSet = new Set(expandedMessages.value)
  if (newSet.has(key)) {
    newSet.delete(key)
  } else {
    newSet.add(key)
  }
  expandedMessages.value = newSet
}

function getDisplayContent(content, conversationId, messageIndex) {
  const key = `${conversationId}-${messageIndex}`
  const maxLength = 100
  
  if (expandedMessages.value.has(key)) {
    return content // Show full text when expanded
  }
  
  if (content.length <= maxLength) {
    return content
  }
  
  return content.substring(0, maxLength) + '... (click to expand)'
}

function getPreviewText(conversation) {
  if (conversation.messages.length === 0) return 'No messages yet'
  
  const lastMessage = conversation.messages[conversation.messages.length - 1]
  const maxLength = 80
  
  if (lastMessage.content.length <= maxLength) {
    return `"${lastMessage.content}"`
  }
  
  return `"${lastMessage.content.substring(0, maxLength)}..." (click conversation to see full)`
}

function groupCharactersTogether() {
  try {
    console.log('👥 Grouping characters together...')
    
    if (characters.charactersList.length === 0) {
      console.warn('⚠️ No characters available to group')
      return
    }
    
    // Find a central location (center of map)
    const centralX = 25 // Center of 50-wide map
    const centralY = 18 // Center of 37-tall map
    
    // Group all living characters near the center
    const livingCharacters = characters.charactersList.filter(c => !c.isDead)
    
    livingCharacters.forEach((character, index) => {
      // Arrange characters in a rough circle around center
      const angle = (index / livingCharacters.length) * 2 * Math.PI
      const radius = 2 + Math.floor(index / 8) // Expand radius for more characters
      
      const newX = Math.max(1, Math.min(48, Math.round(centralX + Math.cos(angle) * radius)))
      const newY = Math.max(1, Math.min(35, Math.round(centralY + Math.sin(angle) * radius)))
      
      characters.moveCharacter(character.id, {
        x: newX,
        y: newY,
        zone: character.position.zone // Keep their current zone
      })
      
      console.log(`👥 Moved ${character.name} to (${newX}, ${newY}) for group gathering`)
    })
    
    console.log(`✅ Grouped ${livingCharacters.length} characters together at town center`)
    
    // Add a memory to each character about this gathering
    livingCharacters.forEach(character => {
      const gatheringMemory = {
        id: `gathering_${Date.now()}_${character.id}`,
        timestamp: Date.now(),
        content: `Everyone gathered together at the town center. There were ${livingCharacters.length} of us present: ${livingCharacters.map(c => c.name).join(', ')}.`,
        emotional_weight: 45,
        tags: ['gathering', 'social', 'community']
      }
      
      characters.addMemory(character.id, gatheringMemory)
    })
    
    // Create a simulation event for this gathering
    if (simulationStore.addEvent) {
      simulationStore.addEvent({
        type: 'gathering',
        involvedCharacters: livingCharacters.map(c => c.id),
        summary: `${livingCharacters.length} characters gathered together at the town center`,
        tone: 'social',
        details: {
          event_type: 'manual_gathering',
          participant_count: livingCharacters.length,
          participants: livingCharacters.map(c => c.name).join(', '),
          location: `${centralX}, ${centralY}`,
          initiated_by: 'user'
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Error grouping characters:', error)
  }
}

function updateConversationSettings() {
  try {
    console.log('⚙️ Updating conversation settings:', {
      baseProbability: conversationProbability.value,
      joinProbability: joinProbability.value
    })
    
    // Store settings in localStorage for persistence
    const conversationSettings = {
      baseProbability: conversationProbability.value,
      joinProbability: joinProbability.value,
      lastUpdated: Date.now()
    }
    
    localStorage.setItem('meadowloop-conversation-settings', JSON.stringify(conversationSettings))
    
    // You could emit an event here or call a store method to update global settings
    // For now, we'll just log that the settings have been updated
    console.log('💾 Conversation settings saved to localStorage')
    
  } catch (error) {
    console.error('❌ Error updating conversation settings:', error)
  }
}

// Load conversation settings from localStorage on component mount
onMounted(() => {
  try {
    const stored = localStorage.getItem('meadowloop-conversation-settings')
    if (stored) {
      const settings = JSON.parse(stored)
      conversationProbability.value = settings.baseProbability || 25
      joinProbability.value = settings.joinProbability || 35
      console.log('💾 Loaded conversation settings:', settings)
    }
  } catch (error) {
    console.warn('⚠️ Error loading conversation settings:', error)
  }
})

// Watch for conversation updates and auto-scroll
watch(
  () => conversations.value?.length,
  () => {
    nextTick(() => {
      if (messagesListRef.value) {
        messagesListRef.value.scrollTop = messagesListRef.value.scrollHeight
      }
    })
  }
)
</script>

<style scoped>
.conversations-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  box-sizing: border-box;
}

.conversations-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.conversations-header h3 {
  margin: 0 0 15px 0;
  color: #495057;
}

.controls {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
  white-space: nowrap;
}

.filter-select {
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.debug-button, .test-button {
  padding: 6px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.debug-button:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.test-button:hover {
  background: #e7f3ff;
  border-color: #667eea;
}

.conversations-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.no-conversations {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6c757d;
  text-align: center;
}

.no-conversations-icon {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.5;
}

.conversations-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.conversation-item {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.conversation-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.conversation-item.active {
  border-color: #667eea;
  background: #f8f9ff;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.1);
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.conversation-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.conversation-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.conversation-participants {
  font-size: 12px;
  color: #6c757d;
}

.conversation-meta {
  font-size: 12px;
  color: #6c757d;
}

.conversation-timing {
  display: flex;
  align-items: center;
  gap: 10px;
}

.conversation-time {
  font-size: 12px;
  color: #6c757d;
  font-family: 'Monaco', 'Menlo', monospace;
}

.conversation-status-text {
  font-size: 12px;
  color: #6c757d;
}

.conversation-preview {
  margin-bottom: 12px;
}

.topic {
  font-weight: 500;
  color: #495057;
  margin-bottom: 6px;
}

.last-message {
  color: #6c757d;
  font-size: 14px;
  font-style: italic;
  line-height: 1.4;
}

.conversation-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #6c757d;
}

.message-count {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.mood {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Modal Styles */
.conversation-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 800px;
  max-height: 90vh;
  width: 90%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

.modal-header h4 {
  margin: 0;
  color: #495057;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.conversation-info {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e9ecef;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
  align-items: center;
}

.info-row strong {
  min-width: 100px;
  color: #495057;
  font-size: 14px;
}

.participants-list {
  display: flex;
  gap: 6px;
}

.messages-section h5 {
  margin: 0 0 15px 0;
  color: #495057;
}

.no-messages {
  color: #6c757d;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.message-item {
  padding: 12px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: #f8f9fa;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.speaker {
  font-weight: 500;
  color: #667eea;
}

.message-time {
  font-size: 11px;
  color: #6c757d;
  font-family: 'Monaco', 'Menlo', monospace;
}

.message-content {
  color: #495057;
  line-height: 1.4;
  margin-bottom: 4px;
}

.message-content .expandable {
  transition: all 0.2s ease;
  border-radius: 4px;
  padding: 2px 4px;
}

.message-content .expandable:hover {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.message-content .expanded {
  font-weight: 500;
}

.message-tone {
  font-size: 11px;
  color: #6c757d;
}

/* Conversation Tuning Controls */
.conversation-controls {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.conversation-controls h5 {
  margin: 0 0 15px 0;
  color: #495057;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
}

.control-group label {
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
  white-space: nowrap;
}

.probability-slider {
  width: 100%;
  height: 10px;
  background: #e9ecef;
  border-radius: 5px;
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.probability-slider:hover {
  opacity: 1;
}

.probability-value {
  font-size: 12px;
  font-weight: 500;
  color: #495057;
}
</style> 