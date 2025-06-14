<template>
  <div class="events-log-panel">
    <header class="log-header">
      <h3 class="header-title">📰 Events Log</h3>
      <div class="log-controls">
        <div class="filter-row">
          <div class="filter-group">
            <label>Type:</label>
            <select v-model="filterType" class="filter-select">
              <option value="">All</option>
              <option value="conversation">💬 Talk</option>
              <option value="movement">🚶 Move</option>
              <option value="action">⚡ Action</option>
              <option value="thought">💭 Think</option>
              <option value="injection">💫 Scenario</option>
              <option value="death">💀 Death</option>
              <option value="resurrection">✨ Resurrection</option>
              <option value="warning">⚠️ Warning</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Character:</label>
            <select v-model="filterCharacter" class="filter-select" :disabled="!characters.isLoaded">
              <option value="">{{ characters.isLoaded ? 'All' : 'Loading...' }}</option>
              <option 
                v-for="character in characters.charactersList" 
                :key="character.id" 
                :value="character.id"
              >
                {{ character.name }}
              </option>
            </select>
          </div>
          <button @click="clearEvents" class="action-button" title="Clear all events">
            🗑️
          </button>
        </div>
      </div>
    </header>

    <main class="events-content">
      <div v-if="filteredEvents.length === 0" class="no-events-placeholder">
        <div class="placeholder-icon">📭</div>
        <p>No events to display.</p>
        <span>Start the simulation to see character activities.</span>
        
        <!-- Debugging info -->
        <div style="margin-top: 20px; font-size: 12px; color: #666; background: #f0f0f0; padding: 10px; border-radius: 4px;">
          <div><strong>Debug Info:</strong></div>
          <div>Total events in store: {{ simulationStore.events.length }}</div>
          <div>Recent events count: {{ simulationStore.recentEvents.length }}</div>
          <div>Filtered events count: {{ filteredEvents.length }}</div>
          <div>Filter type: "{{ filterType }}"</div>
          <div>Filter character: "{{ filterCharacter }}"</div>
          <div>Simulation running: {{ simulationStore.state.isRunning }}</div>
          <div>Current tick: {{ simulationStore.state.currentTick }}</div>
        </div>
      </div>

      <div v-else class="events-list" ref="eventsListRef">
        <div 
          v-if="!filteredEvents || filteredEvents.length === 0" 
          class="no-events-message"
          style="text-align: center; padding: 20px; color: #666; font-style: italic;"
        >
          No events found{{ filterType || filterCharacter ? ' matching current filters' : '' }}
        </div>
        
        <div 
          v-for="(event, index) in filteredEvents" 
          :key="`${event.timestamp}-${index}`"
          :class="['event-item', `event-type-${event.type}`]"
        >
          <div class="event-icon">{{ getEventIcon(event.type) }}</div>
          <div class="event-main">
            <div class="event-header">
              <div 
                class="event-summary" 
                :class="{ 
                  'expanded': isEventExpanded(event),
                  'expandable': isEventExpandable(event)
                }"
                @click="toggleEventExpansion(event)"
                style="cursor: pointer;"
              >
                {{ getDisplaySummary(event) }}
              </div>
              <span class="event-time">{{ formatTime(event.timestamp) }}</span>
            </div>
            <div v-if="event.details" class="event-details">
              <!-- Display Action Reasoning -->
              <div v-if="event.details.reasoning" class="detail-item reasoning">
                <span class="detail-icon">🧠</span>
                <span class="detail-text"><em>{{ event.details.reasoning }}</em></span>
              </div>
              <!-- Display Movement Destination -->
              <div v-if="event.type === 'movement' && event.details.destination" class="detail-item destination">
                <span class="detail-icon">🎯</span>
                <span class="detail-text">
                  Moving to: <strong>{{ event.details.destination.zone || `(${event.details.destination.x}, ${event.details.destination.y})` }}</strong>
                </span>
              </div>
              <div v-if="event.details.injection_id || event.details.is_scenario_event" class="injection-indicator">
                <strong>💫 Scenario Event:</strong> 
                <span v-if="event.details.injection_content">{{ event.details.injection_content }}</span>
                <span v-else-if="event.details.description">{{ event.details.description }}</span>
                <span v-else>Custom injection triggered</span>
                <div v-if="event.details.injection_target" class="scenario-target">
                  Target: <em>{{ event.details.injection_target === 'global' ? '🌍 All Characters' : event.details.injection_target }}</em>
                </div>
              </div>
              <div v-if="event.details.major_event" class="major-event-indicator">
                <strong>🌟 Major Event:</strong> This event affects the entire town
              </div>
              <div v-if="event.details.participantCount" class="participant-count">
                👥 {{ event.details.participantCount }} participant{{ event.details.participantCount === 1 ? '' : 's' }}
                {{ event.details.isMonologue ? '(Monologue)' : '' }}
              </div>
            </div>
            <div class="event-footer">
              <div class="character-tags">
                <span 
                  v-for="characterId in event.involvedCharacters" 
                  :key="characterId"
                  class="character-tag"
                  @click="setCharacterFilter(characterId)"
                >
                  {{ getCharacterName(characterId) }}
                </span>
              </div>
              <span class="event-tone-badge">{{ event.tone }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="log-footer">
      <span class="event-count">
        Showing {{ filteredEvents.length }} of {{ simulationStore.events.length }} events
      </span>
      <div class="auto-scroll-toggle">
        <input type="checkbox" id="auto-scroll-checkbox" v-model="autoScroll" />
        <label for="auto-scroll-checkbox">Auto-scroll</label>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useSimulationStore, useCharactersStore } from '@/stores'

const simulationStore = useSimulationStore()
const characters = useCharactersStore()
const { events } = storeToRefs(simulationStore)

const filterType = ref('')
const filterCharacter = ref('')
const autoScroll = ref(true)
const eventsListRef = ref(null)
const expandedEventsRef = ref(new Set())

const filteredEvents = computed(() => {
  return events.value.filter(event => {
    const characterMatch = !filterCharacter.value || 
      (event.involvedCharacters && event.involvedCharacters.includes(filterCharacter.value));

    if (!filterType.value) {
      return characterMatch; // No type filter, just match character
    }

    // Handle scenario filter specifically
    if (filterType.value === 'injection') {
      const isInjectionEvent = event.type === 'injection' || event.details?.is_scenario_event;
      return isInjectionEvent && characterMatch;
    }

    // Handle all other type filters
    const typeMatch = event.type === filterType.value;
    return typeMatch && characterMatch;

  }).sort((a, b) => a.timestamp - b.timestamp);
})

function getEventIcon(type) {
  const icons = {
    conversation: '💬',
    movement: '🚶',
    action: '⚡',
    thought: '💭',
    injection: '💫',
    death: '💀',
    resurrection: '✨',
    warning: '⚠️'
  }
  return icons[type] || '📝'
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
}

function getCharacterName(characterId) {
  if (!characters.isLoaded) {
    return 'Loading...'
  }
  const character = characters.getCharacter(characterId)
  return character?.name || characterId
}

function setCharacterFilter(characterId) {
  filterCharacter.value = filterCharacter.value === characterId ? '' : characterId
}

function clearEvents() {
  if (confirm('Are you sure you want to clear all events?')) {
    simulationStore.events.splice(0)
    simulationStore.saveToLocalStorage()
  }
}

function resetSimulation() {
  if (confirm('This will clear all simulation data (events, conversations, injections). Are you sure?')) {
    try {
      simulationStore.resetSimulation()
      console.log('✅ Simulation data reset successfully')
      alert('Simulation data has been reset!')
    } catch (error) {
      console.error('❌ Failed to reset simulation:', error)
      alert('Failed to reset simulation. Check console for details.')
    }
  }
}

// Create a unique event key for expansion tracking
function getEventKey(event) {
  return event.id || `${event.timestamp}-${event.type}-${(event.summary || '').substring(0, 20)}`
}

function isEventExpanded(event) {
  const key = getEventKey(event)
  return expandedEventsRef.value.has(key)
}

function isEventExpandable(event) {
  // Get the main content for this event type
  let mainContent = getMainContentForEvent(event)
  
  // Event is expandable if the main content is longer than our display limit
  return mainContent.length > 100
}

function getMainContentForEvent(event) {
  // Use specific content fields for each event type - no fallback lists
  switch (event.type) {
    case 'conversation':
    case 'dialogue':
      // For dialogue events, use full_dialogue or summary
      return event.details?.full_dialogue || event.summary || 'No dialogue content'
    
    case 'thought':
      // For thought events, use internal_thoughts
      return event.details?.internal_thoughts || event.summary || 'No thought content'
    
    case 'movement':
      // For movement events, use summary or action reasoning
      return event.summary || event.details?.reason || 'Character moved'
    
    case 'action':
      // For action events, use summary or action reasoning  
      return event.summary || event.details?.action_reasoning || 'Character performed an action'
    
    case 'injection':
      // For injection events, use the injection content
      return event.details?.content || event.summary || 'Scenario event occurred'
    
    default:
      // Default case - just use summary
      return event.summary || event.description || event.content || 'No content'
  }
}

function getDisplaySummary(event) {
  // Access the reactive ref directly (no parameter needed)
  const currentExpandedEvents = expandedEventsRef.value || new Set()
  
  // Get the main content for this event type
  let mainContent = getMainContentForEvent(event)
  
  // Check if this event is currently expanded
  const eventKey = getEventKey(event)
  const isExpanded = currentExpandedEvents.has(eventKey)
  
  if (isExpanded) {
    // Show full content when expanded
    return mainContent
  } else {
    // Show truncated content when collapsed
    if (mainContent.length > 100) {
      return mainContent.substring(0, 100) + '...'
    }
    return mainContent
  }
}

function toggleEventExpansion(event) {
  const key = getEventKey(event)
  const newSet = new Set(expandedEventsRef.value)
  
  if (newSet.has(key)) {
    newSet.delete(key)
  } else {
    newSet.add(key)
  }
  
  expandedEventsRef.value = newSet
}

// Auto-scroll to bottom when new events arrive
watch(
  () => events.value.length,
  async () => {
    if (autoScroll.value) {
      await nextTick()
      scrollToBottom()
    }
  }
)

function scrollToBottom() {
  if (eventsListRef.value) {
    eventsListRef.value.scrollTop = eventsListRef.value.scrollHeight
  }
}

// Live update simulation state
let updateInterval = null

onMounted(() => {
  scrollToBottom()
})

onUnmounted(() => {
  // No interval to clear
})
</script>

<style scoped>
/* Fixed layout structure to prevent footer cutoff */
.events-log-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 0; /* Remove padding to maximize space */
  box-sizing: border-box;
  overflow: hidden; /* Prevent any overflow from panel itself */
  max-height: 100%; /* Ensure we respect parent container height */
}

.log-header {
  flex-shrink: 0;
  padding: 16px;
  border-bottom: 1px solid #dee2e6;
  background: white;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.log-controls {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-row {
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

.action-button {
  padding: 6px 12px;
  border: 1px solid #6c757d;
  border-radius: 4px;
  background: white;
  color: #6c757d;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.action-button:hover {
  background: #f0f0f0;
}

.events-content {
  flex: 1;
  min-height: 0; /* Important for flex children with overflow */
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent content from escaping container */
}

.no-events-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #6c757d;
  text-align: center;
  padding: 20px;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.5;
}

.events-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
  box-sizing: border-box;
  min-height: 0;
  /* Remove the max-height - let flex handle the sizing */
}

.event-item {
  display: flex;
  gap: 12px;
  padding: 15px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: white;
  border-left: 4px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.event-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.event-conversation {
  border-left-color: #667eea;
}

.event-movement {
  border-left-color: #51cf66;
}

.event-action {
  border-left-color: #ffa726;
}

.event-thought {
  border-left-color: #ab47bc;
}

.event-injection {
  border-left-color: #ff6b6b;
}

.event-icon {
  font-size: 20px;
  line-height: 1;
  margin-top: 2px;
  flex-shrink: 0;
}

.event-main {
  flex: 1;
  min-width: 0;
}

.event-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 8px;
}

.event-summary {
  flex: 1;
  font-size: 14px;
  color: #495057;
  line-height: 1.5;
  cursor: pointer;
  transition: all 0.2s ease;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap; /* Preserve line breaks */
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
}

.event-summary:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.event-summary.expandable {
  border: 1px dashed rgba(102, 126, 234, 0.4);
  background: rgba(102, 126, 234, 0.03);
  position: relative;
}

.event-summary.expandable::after {
  content: "▼ Click to expand";
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 10px;
  color: #667eea;
  opacity: 0.7;
  font-weight: 500;
}

.event-summary.expandable:hover {
  border-color: rgba(102, 126, 234, 0.7);
  background: rgba(102, 126, 234, 0.08);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.event-summary.expanded {
  font-weight: 500;
  color: #495057;
  background: rgba(102, 126, 234, 0.08);
  border: 1px solid rgba(102, 126, 234, 0.4);
  box-shadow: 0 1px 4px rgba(102, 126, 234, 0.1);
}

.event-summary.expanded::after {
  content: "▲ Click to collapse";
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 10px;
  color: #667eea;
  opacity: 0.8;
  font-weight: 500;
}

.event-time {
  flex-shrink: 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #6c757d;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 2px;
}

.event-details {
  font-size: 13px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f1f3f4;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8f9fa;
  padding: 6px 10px;
  border-radius: 4px;
}

.detail-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.detail-text {
  color: #495057;
  line-height: 1.4;
}

.detail-text em {
  color: #6c757d;
}

.detail-text strong {
  color: #343a40;
}

.event-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  gap: 10px;
}

.character-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}

.character-tag {
  font-size: 12px;
  background: #667eea;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.character-tag:hover {
  background: #5a67d8;
}

.event-tone-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  flex-shrink: 0;
}

.log-footer {
  flex-shrink: 0;
  padding: 15px 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 50px; /* Ensure footer has minimum height */
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.event-count {
  font-size: 13px;
  color: #6c757d;
}

.auto-scroll-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auto-scroll-toggle input[type="checkbox"] {
  accent-color: #667eea;
}

.auto-scroll-toggle label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6c757d;
  cursor: pointer;
  user-select: none;
}

/* Scrollbar styling */
.events-list::-webkit-scrollbar {
  width: 6px;
}

.events-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.events-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.events-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.injection-indicator {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 8px;
  border-left: 4px solid #4c63d2;
}

.injection-indicator strong {
  display: block;
  margin-bottom: 4px;
}

.scenario-target {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.9;
}

.major-event-indicator {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 8px;
  border-left: 4px solid #e91e63;
}

.event-type-death {
  border-left-color: #8b0000;
  background: linear-gradient(135deg, #fff 0%, #ffebee 100%);
}

.event-type-resurrection {
  border-left-color: #ffd700;
  background: linear-gradient(135deg, #fff 0%, #fffef7 100%);
}

.participant-count {
  font-size: 12px;
  color: #6c757d;
  margin-top: 8px;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .log-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .filter-group {
    justify-content: space-between;
  }
  
  .events-list {
    padding: 15px 15px 10px 15px;
  }
  
  .event-item {
    padding: 12px;
  }
  
  .event-header {
    flex-direction: column;
    gap: 8px;
  }
  
  .event-time {
    align-self: flex-start;
  }
  
  .event-summary {
    padding: 10px 14px;
  }
  
  .event-summary.expandable::after,
  .event-summary.expanded::after {
    position: static;
    display: block;
    text-align: center;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed rgba(102, 126, 234, 0.3);
    font-size: 11px;
  }
}
</style> 