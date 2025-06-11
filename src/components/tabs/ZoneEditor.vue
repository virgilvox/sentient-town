<template>
  <div class="zone-editor">
    <div class="editor-header">
      <h3>🗺️ Zone Editor</h3>
      <p class="help-text">
        {{ ui.editingZoneId 
          ? 'Click tiles to modify the selected zone.' 
          : 'Click tiles on the map to select them, then create zones below.' 
        }}
      </p>
    </div>

    <!-- Zone Creation/Editing Panel -->
    <div v-if="selectedTiles.size > 0" class="zone-creator">
      <h4>{{ ui.editingZoneId ? 'Edit Zone' : 'Create New Zone' }}</h4>
      <div class="creator-form">
        <div class="form-group">
          <label>Zone Name:</label>
          <input 
            v-model="currentZoneName" 
            type="text" 
            placeholder="Enter zone name..."
            class="zone-input"
          />
        </div>
        
        <div class="form-group">
          <label>Zone Type:</label>
          <select v-model="currentZoneType" class="zone-select">
            <option value="home">🏠 Home</option>
            <option value="shop">🏪 Shop</option>
            <option value="public">🏛️ Public</option>
            <option value="park">🌳 Park</option>
            <option value="street">🛣️ Street</option>
            <option value="solid">🧱 Solid (Unwalkable)</option>
            <option value="wall">🚧 Wall</option>
            <option value="building">🏢 Building</option>
            <option value="obstacle">⚠️ Obstacle</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="walkable-label">
            <input 
              v-model="currentZoneWalkable" 
              type="checkbox" 
              class="walkable-checkbox"
            />
            <span class="walkable-text">
              {{ currentZoneWalkable ? '✅ Walkable' : '❌ Not Walkable' }}
            </span>
          </label>
          <div class="walkable-help">
            Characters can move through walkable zones. Unwalkable zones block movement.
          </div>
        </div>
        
        <div class="form-actions">
          <button 
            @click="ui.editingZoneId ? updateZone() : createZone()" 
            :disabled="!currentZoneName.trim()"
            class="create-btn"
          >
            {{ ui.editingZoneId ? '✅ Update Zone' : '✅ Create Zone' }}
            ({{ selectedTiles.size }} tiles)
          </button>
          <button @click="cancelEdit" class="clear-btn">
            ❌ {{ ui.editingZoneId ? 'Cancel Edit' : 'Clear Selection' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Existing Zones List -->
    <div class="zones-list">
      <h4>Existing Zones</h4>
      <div class="zones-grid">
        <div 
          v-for="zone in zones.zonesList" 
          :key="zone.name"
          class="zone-card"
          :class="{ 
            selected: selectedZone === zone.name,
            editing: ui.editingZoneId === zone.id 
          }"
          @click="selectZone(zone)"
        >
          <div class="zone-header">
            <span class="zone-icon">{{ getZoneIcon(zone.type) }}</span>
            <span class="zone-name">{{ zone.name }}</span>
          </div>
          <div class="zone-details">
            <div class="zone-type">{{ zone.type }}</div>
            <div class="zone-size">{{ zone.tiles?.length || 0 }} tiles</div>
            <div class="zone-walkable" :class="{ walkable: zone.walkable !== false, unwalkable: zone.walkable === false }">
              {{ zone.walkable === false ? '🚫 Unwalkable' : '✅ Walkable' }}
            </div>
          </div>
          <div class="zone-actions">
            <button 
              @click.stop="editZone(zone)" 
              class="edit-btn"
              title="Edit zone"
            >
              ✏️
            </button>
            <button 
              @click.stop="deleteZone(zone.name)" 
              class="delete-btn"
              title="Delete zone"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Zone Tools -->
    <div class="zone-tools">
      <h4>Tools</h4>
      <div class="tools-grid">
        <button @click="startNewZone" class="tool-btn primary">
          ➕ Create New Zone
        </button>
        <button @click="clearAllZones" class="tool-btn danger">
          🗑️ Clear All Zones
        </button>
        <button @click="exportZones" class="tool-btn">
          📤 Export Zones
        </button>
        <button @click="showImportDialog = true" class="tool-btn">
          📥 Import Zones
        </button>
      </div>
    </div>

    <!-- Import Dialog -->
    <div v-if="showImportDialog" class="import-dialog">
      <div class="dialog-content">
        <h4>Import Zones JSON</h4>
        <textarea 
          v-model="importData" 
          placeholder="Paste zones JSON here..."
          class="import-textarea"
        ></textarea>
        <div class="dialog-actions">
          <button @click="importZones" class="import-btn">Import</button>
          <button @click="showImportDialog = false" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useZonesStore, useUIStore, useCharactersStore } from '@/stores'

const zones = useZonesStore()
const ui = useUIStore()

// Zone creation state - use UI store
const currentZoneName = computed({
  get: () => ui.currentZoneName,
  set: (value) => ui.setCurrentZoneName(value)
})

const currentZoneType = computed({
  get: () => ui.currentZoneType,
  set: (value) => ui.setCurrentZoneType(value)
})

const currentZoneWalkable = ref(true)

// Watch zone type to auto-set walkable property
watch(currentZoneType, (newType) => {
  const unwalkableTypes = ['solid', 'wall', 'building', 'obstacle']
  currentZoneWalkable.value = !unwalkableTypes.includes(newType)
}, { immediate: true })

const selectedZone = ref(null)
const showImportDialog = ref(false)
const importData = ref('')

// Get selected tiles from UI store
const selectedTiles = computed(() => ui.selectedTiles)

// Watch for zone selection from canvas
watch(() => ui.canvasState.selectedZone, (newSelectedZoneId) => {
  if (newSelectedZoneId) {
    const zone = zones.zones.find(z => z.id === newSelectedZoneId)
    if (zone) {
      selectedZone.value = zone.name
      console.log('🎯 Zone selected from canvas:', zone.name)
    }
  }
}, { immediate: true })

function getZoneIcon(type) {
  const icons = {
    home: '🏠',
    shop: '🏪', 
    public: '🏛️',
    park: '🌳',
    street: '🛣️',
    solid: '🧱',
    wall: '🚧',
    building: '🏢',
    obstacle: '⚠️'
  }
  return icons[type] || '📍'
}

function createZone() {
  if (selectedTiles.value.size === 0 || !currentZoneName.value.trim()) {
    console.warn('Cannot create zone: no tiles selected or no name provided')
    return
  }

  const tiles = Array.from(selectedTiles.value).map(key => {
    const [x, y] = key.split(',').map(Number)
    return { x, y }
  })

  const newZone = {
    id: `zone-${Date.now()}`,
    name: currentZoneName.value.trim(),
    type: currentZoneType.value,
    tiles,
    walkable: currentZoneWalkable.value
  }

  zones.addZone(newZone)
  ui.clearSelectedTiles()
  console.log('Zone created:', newZone)
}

function updateZone() {
  if (!ui.editingZoneId || selectedTiles.value.size === 0) {
    console.warn('Cannot update zone: no zone being edited or no tiles selected')
    return
  }

  const tiles = Array.from(selectedTiles.value).map(key => {
    const [x, y] = key.split(',').map(Number)
    return { x, y }
  })

  zones.updateZone(ui.editingZoneId, {
    name: currentZoneName.value.trim(),
    type: currentZoneType.value,
    tiles,
    walkable: currentZoneWalkable.value
  })

  ui.stopEditingZone()
  console.log('Zone updated:', ui.editingZoneId)
}

function editZone(zone) {
  // Load zone tiles into selection
  ui.clearSelectedTiles()
  zone.tiles.forEach(tile => {
    ui.addSelectedTile(tile.x, tile.y)
  })
  
  // Load zone properties
  currentZoneWalkable.value = zone.walkable !== undefined ? zone.walkable : true
  
  // Start editing mode
  ui.startEditingZone(zone.id, zone.name, zone.type)
  selectedZone.value = zone.name
}

function cancelEdit() {
  if (ui.editingZoneId) {
    ui.stopEditingZone()
    selectedZone.value = null
  } else {
    ui.clearSelectedTiles()
  }
}

function selectZone(zone) {
  selectedZone.value = selectedZone.value === zone.name ? null : zone.name
}

function startNewZone() {
  // Clear any current zone editing and selection
  ui.stopEditingZone()
  ui.clearSelectedTiles()
  selectedZone.value = null
  
  // Reset form
  ui.setCurrentZoneName('')
  ui.setCurrentZoneType('home')
  currentZoneWalkable.value = true
  
  console.log('🆕 Started creating new zone')
}

function deleteZone(zoneName) {
  if (confirm(`Delete zone "${zoneName}"?`)) {
    zones.removeZone(zoneName)
    if (selectedZone.value === zoneName) {
      selectedZone.value = null
    }
  }
}

function clearAllZones() {
  if (confirm('Clear all zones? This cannot be undone.')) {
    zones.clearAllZones()
    selectedZone.value = null
  }
}

function exportZones() {
  const data = JSON.stringify(zones.zonesList, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'zones.json'
  a.click()
  URL.revokeObjectURL(url)
}

function importZones() {
  try {
    const data = JSON.parse(importData.value)
    if (Array.isArray(data)) {
      zones.importZones(data)
      importData.value = ''
      showImportDialog.value = false
      alert('✅ Zones imported successfully!')
    } else {
      alert('❌ Invalid JSON format. Expected an array of zones.')
    }
  } catch (error) {
    alert('❌ Invalid JSON format.')
  }
}
</script>

<style scoped>
.zone-editor {
  padding: 1rem;
  max-height: 100%;
  overflow-y: auto;
}

.editor-header h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.help-text {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.zone-creator {
  background: #f8f9fa;
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.zone-creator h4 {
  margin: 0 0 1rem 0;
  color: #28a745;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: bold;
  color: #333;
}

.zone-input, .zone-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
}

.create-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.create-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.clear-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.zones-list h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.zones-grid {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.zone-card {
  position: relative;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.zone-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.zone-card.selected {
  border-color: #4299e1;
  background: #ebf8ff;
}

.zone-card.editing {
  border-color: #48bb78;
  background: #f0fff4;
  box-shadow: 0 0 0 2px #48bb78;
}

.zone-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.zone-icon {
  font-size: 1.2rem;
}

.zone-name {
  font-weight: bold;
  color: #333;
}

.zone-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #666;
}

.zone-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.edit-btn,
.delete-btn {
  padding: 4px;
  border: none;
  background: none;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.edit-btn:hover,
.delete-btn:hover {
  opacity: 1;
}

.zone-tools h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.tool-btn {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: #f8f9fa;
}

.tool-btn.danger {
  color: #dc3545;
  border-color: #dc3545;
}

.tool-btn.danger:hover {
  background: #dc3545;
  color: white;
}

.tool-btn.primary {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.tool-btn.primary:hover {
  background: #218838;
}

.import-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}

.dialog-content h4 {
  margin: 0 0 1rem 0;
}

.import-textarea {
  width: 100%;
  height: 200px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  margin-bottom: 1rem;
}

.dialog-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.import-btn, .cancel-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.import-btn {
  background: #28a745;
  color: white;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.walkable-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.walkable-checkbox {
  margin: 0;
}

.walkable-text {
  font-weight: bold;
  color: #333;
}

.walkable-help {
  font-size: 0.8rem;
  color: #666;
}

.zone-walkable {
  font-size: 0.75rem;
  font-weight: bold;
}

.zone-walkable.walkable {
  color: #28a745;
}

.zone-walkable.unwalkable {
  color: #dc3545;
}
</style> 