<template>
  <div class="control-panel">
    <div class="tab-navigation">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="ui.setActiveTab(tab.id)"
        :class="['tab-button', { active: ui.activeTab === tab.id }]"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>
    
    <div class="tab-content-wrapper">
      <div class="tab-content">
        <!-- Components are now rendered dynamically -->
        <keep-alive>
          <component :is="activeTabComponent" />
        </keep-alive>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUIStore, useSimulationStore } from '@/stores'

import CharacterEditor from '@/components/tabs/CharacterEditor.vue'
import EventsLog from '@/components/tabs/EventsLog.vue'
import InjectPrompt from '@/components/tabs/InjectPrompt.vue'
import ConversationsPanel from '@/components/tabs/ConversationsPanel.vue'
import IntrospectionPanel from '@/components/tabs/IntrospectionPanel.vue'
import ZoneEditor from '@/components/tabs/ZoneEditor.vue'
import AssetGenerator from '@/components/tabs/AssetGenerator.vue'
import SettingsPanel from '@/components/tabs/SettingsPanel.vue'

// Store access
const ui = useUIStore()
const simulation = useSimulationStore()

// Tab configuration
const tabs = [
  { id: 'character-editor', label: 'Characters', icon: '👥' },
  { id: 'events', label: 'Events', icon: '📰' },
  { id: 'inject-prompt', label: 'Scenarios', icon: '✨' },
  { id: 'conversations', label: 'Talk', icon: '💬' },
  { id: 'introspection', label: 'Thoughts', icon: '🧠' },
  { id: 'zone-editor', label: 'Zones', icon: '🗺️' },
  { id: 'asset-generator', label: 'Assets', icon: '🎨' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
]

const tabComponents = {
  'character-editor': CharacterEditor,
  'events': EventsLog,
  'inject-prompt': InjectPrompt,
  'conversations': ConversationsPanel,
  'introspection': IntrospectionPanel,
  'zone-editor': ZoneEditor,
  'asset-generator': AssetGenerator,
  'settings': SettingsPanel
}

const activeTabComponent = computed(() => tabComponents[ui.activeTab])

// Computed properties for tab indicators
const hasActiveConversations = computed(() => simulation.activeConversations.length > 0)
const hasRecentEvents = computed(() => simulation.recentEvents.length > 0)
const isCharacterSelected = computed(() => ui.selectedCharacterId !== undefined)
</script>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 320px;
  max-width: 100%;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.tab-navigation {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 8px;
  background-color: #e9ecef;
  border-bottom: 1px solid #dee2e6;
  flex-shrink: 0;
}

.tab-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #495057;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  min-height: 50px;
  text-align: center;
}

.tab-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.tab-button.active {
  background-color: white;
  color: #4299e1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-icon {
  font-size: 16px;
  line-height: 1;
}

.tab-label {
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.tab-content-wrapper {
  flex: 1;
  background-color: #ffffff;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tab-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Activity indicators */
.tab-button[data-has-activity]::after {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  background: #28a745;
  border-radius: 50%;
  border: 1px solid white;
}

/* Responsive design for smaller screens */
@media (max-width: 1200px) {
  .tab-navigation {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .tab-label {
    font-size: 9px;
  }
}

@media (max-width: 900px) {
  .control-panel {
    min-width: 280px;
  }
  
  .tab-navigation {
    grid-template-columns: repeat(4, 1fr);
    gap: 3px;
    padding: 6px;
  }
  
  .tab-button {
    padding: 6px 2px;
    min-height: 45px;
    gap: 2px;
  }
  
  .tab-icon {
    font-size: 14px;
  }
  
  .tab-label {
    font-size: 8px;
  }
}

@media (max-width: 480px) {
  .control-panel {
    min-width: 250px;
  }
  
  .tab-navigation {
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    padding: 4px;
  }
  
  .tab-button {
    padding: 4px 1px;
    min-height: 40px;
    gap: 1px;
  }
  
  .tab-icon {
    font-size: 12px;
  }
  
  .tab-label {
    font-size: 7px;
  }
}

/* Very small screens - stack tabs in 2 rows */
@media (max-width: 380px) {
  .tab-navigation {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style> 