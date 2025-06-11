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
          <button @click="groupCharactersTogether" class="group-button" title="Move all characters to same zone">
            🏠 Group
          </button>
        </div>
      </div>
    </div>

    <div class="conversations-content">
      <div v-if="filteredConversations.length === 0" class="no-conversations">
        <div class="no-conversations-icon">💬</div>
        <p>No conversations yet. Characters will start talking when the simulation runs!</p>
        
        <!-- Debugging info -->
        <div style="margin-top: 20px; font-size: 12px; color: #666; background: #f0f0f0; padding: 10px; border-radius: 4px;">
          <div><strong>Debug Info:</strong></div>
          <div>Total conversations in store: {{ simulation.conversations.length }}</div>
          <div>Active conversations: {{ simulation.activeConversations.length }}</div>
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
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useSimulationStore, useCharactersStore, useZonesStore } from '@/stores'

const simulation = useSimulationStore()
const characters = useCharactersStore()
const zones = useZonesStore()

const statusFilter = ref('')
const characterFilter = ref('')
const selectedConversationId = ref(null)
const messagesListRef = ref(null)
const expandedMessages = ref(new Set())

const filteredConversations = computed(() => {
  let conversations = [...simulation.conversations]
  
  // Filter by status - correctly detect active/ended conversations
  if (statusFilter.value) {
    conversations = conversations.filter(conversation => {
      if (statusFilter.value === 'active') {
        return conversation.isActive === true
      } else if (statusFilter.value === 'ended') {
        return conversation.isActive === false
      }
      return true
    })
  }
  
  // Filter by character
  if (characterFilter.value) {
    conversations = conversations.filter(conversation => 
      conversation.participants.includes(characterFilter.value)
    )
  }
  
  // Sort by most recent activity
  return conversations.sort((a, b) => {
    const aTime = a.messages.length > 0 ? a.messages[a.messages.length - 1].timestamp : a.startTime
    const bTime = b.messages.length > 0 ? b.messages[b.messages.length - 1].timestamp : b.startTime
    return bTime - aTime
  })
})

const selectedConversation = computed(() => {
  if (!selectedConversationId.value) return null
  return simulation.conversations.find(conv => conv.id === selectedConversationId.value)
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
  console.log('   All conversations:', simulation.conversations)
  console.log('   Active conversations:', simulation.activeConversations)
  console.log('   Conversation count:', simulation.conversations.length)
  console.log('   Active conversation count:', simulation.activeConversations.length)
  
  console.log('2. RAW CONVERSATION DATA:')
  console.log('   Conversations array:', simulation.conversations.map(c => ({
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
  console.log('   displayedConversations.value:', displayedConversations.value)
  
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
  const recentEvents = simulation.recentEvents || simulation.events || []
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
  console.log('   Simulation running:', simulation.state?.isRunning)
  console.log('   Current tick:', simulation.state?.currentTick)
  console.log('   Last update:', simulation.state?.lastUpdateTime ? new Date(simulation.state.lastUpdateTime).toLocaleString() : 'N/A')
  
  console.log('9. DEBUGGING RECOMMENDATIONS:')
  if (simulation.conversations.length === 0) {
    console.log('   🔍 NO CONVERSATIONS FOUND - Possible issues:')
    console.log('      - Characters may not be speaking during simulation')
    console.log('      - Speech processing may have errors')
    console.log('      - Conversation creation may be failing')
    console.log('      - LocalStorage may be getting cleared')
  }
  
  if (talkEvents.length > 0 && simulation.conversations.length === 0) {
    console.log('   🚨 CRITICAL: Talk events exist but no conversations!')
    console.log('      - This suggests conversation creation is failing')
    console.log('      - Check processSpeech method in simulation engine')
    console.log('      - Check addConversation method in simulation store')
  }
  
  if (simulation.conversations.length > 0 && filteredConversations.value.length === 0) {
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
    console.log('   Before test - conversation count:', simulation.conversations.length)
    
    try {
      console.log('   Step 1: Creating conversation...')
      const conversationId = simulation.addConversation([char1.id, char2.id])
      console.log('   Step 1 result - conversation ID:', conversationId)
      console.log('   Step 1 result - conversation count after creation:', simulation.conversations.length)
      
      console.log('   Step 2: Adding first message...')
      simulation.addMessage(conversationId, {
        speakerId: char1.id,
        content: `Hello ${char2.name}! This is a test message to verify conversation functionality.`,
        emotion: 'friendly'
      })
      console.log('   Step 2 complete - added message from', char1.name)
      
      console.log('   Step 3: Adding second message...')
      simulation.addMessage(conversationId, {
        speakerId: char2.id,
        content: `Hi ${char1.name}! Great to talk to you. This conversation system test is working!`,
        emotion: 'happy'
      })
      console.log('   Step 3 complete - added message from', char2.name)
      
      console.log('   Step 4: Verifying conversation state...')
      const createdConversation = simulation.conversations.find(c => c.id === conversationId)
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

function groupCharactersTogether() {
  if (characters.charactersList.length < 2) {
    alert('Need at least 2 characters to group together')
    return
  }
  
  try {
    // Get the first available zone or default to a safe center zone
    const availableZones = zones?.zones || []
    let targetZone = availableZones.length > 0 ? availableZones[0].id : 'town_center'
    
    console.log(`🏠 Grouping all characters in zone: ${targetZone}`)
    
    // Define safe center area of the map (assuming 50x37 tile map)
    const mapWidth = 50
    const mapHeight = 37
    const centerX = Math.floor(mapWidth / 2)  // Around x=25
    const centerY = Math.floor(mapHeight / 2) // Around y=18
    
    // Create a small cluster around the center, ensuring we stay within bounds
    const maxRadius = Math.min(5, Math.floor(Math.sqrt(characters.charactersList.length)))
    
    characters.charactersList.forEach((character, index) => {
      // Arrange characters in a small spiral pattern around center
      const angle = (index * 2 * Math.PI) / Math.max(characters.charactersList.length, 6)
      const radius = Math.min(maxRadius, 1 + Math.floor(index / 6))
      
      const offsetX = Math.round(radius * Math.cos(angle))
      const offsetY = Math.round(radius * Math.sin(angle))
      
      // Calculate final position, ensuring it stays within map bounds
      const finalX = Math.max(2, Math.min(mapWidth - 3, centerX + offsetX))
      const finalY = Math.max(2, Math.min(mapHeight - 3, centerY + offsetY))
      
      const groupPosition = {
        x: finalX,
        y: finalY,
        zone: targetZone
      }
      
      console.log(`📍 Moving ${character.name} to safe position (${finalX}, ${finalY}) in zone ${targetZone}`)
      characters.moveCharacter(character.id, groupPosition)
    })
    
    alert(`Grouped ${characters.charactersList.length} characters together at map center (${centerX}, ${centerY})! They should now be able to interact.`)
    
  } catch (error) {
    console.error('Failed to group characters:', error)
    alert('Failed to group characters. Check console for details.')
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

.debug-button, .test-button, .group-button {
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

.group-button:hover {
  background: #f0f9ff;
  border-color: #22c55e;
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
</style> 