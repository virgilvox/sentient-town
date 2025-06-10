<template>
  <div class="town-canvas-container">
    <canvas
      ref="canvasRef"
      :class="['town-canvas', { 'edit-mode': ui.editMode, 'zone-editor-active': ui.activeTab === 'zone-editor' }]"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
      @wheel="handleWheel"
      @click="handleClick"
    >
      <p v-if="!characters.isLoaded" class="loading-message">
        ⏳ Loading characters...
      </p>
      <p v-else-if="characters.charactersList.length === 0" class="error-message">
        ⚠️ No characters found. Check console for errors.
      </p>
    </canvas>
    
    <!-- Character Tooltip -->
    <div 
      v-if="showCharacterTooltip && hoveredCharacterId" 
      class="character-tooltip"
      :style="{ 
        left: tooltipPosition.x + 10 + 'px', 
        top: tooltipPosition.y - 10 + 'px' 
      }"
    >
      <div class="tooltip-content">
        <div class="character-name">
          {{ characters.getCharacter(hoveredCharacterId)?.name }}
        </div>
        <div class="character-emotion">
          {{ characters.getCharacter(hoveredCharacterId)?.currentEmotion }}
        </div>
        <div class="character-zone">
          {{ characters.getCharacter(hoveredCharacterId)?.position.zone || 'Unknown' }}
        </div>
      </div>
    </div>
    
    <!-- Canvas Controls - Always Visible -->
    <div class="canvas-controls">
      <div class="zoom-controls">
        <button @click="zoomIn" class="zoom-btn" title="Zoom In">+</button>
        <span class="zoom-display">{{ Math.round(canvasState.zoom * 100) }}%</span>
        <button @click="zoomOut" class="zoom-btn" title="Zoom Out">-</button>
        <button @click="resetView" class="control-btn" title="Reset View">Reset</button>
        <button @click="fitToView" class="control-btn" title="Fit to View">Fit</button>
      </div>
      
      <div class="drawing-tools" v-if="ui.editMode">
        <button 
          @click="setDrawingTool('brush')"
          :class="['tool-btn', { active: canvasState.drawingTool.type === 'brush' }]"
          title="Brush Tool"
        >
          🖌️
        </button>
        <button 
          @click="setDrawingTool('rectangle')"
          :class="['tool-btn', { active: canvasState.drawingTool.type === 'rectangle' }]"
          title="Rectangle Tool"
        >
          ⬜
        </button>
        <button @click="ui.toggleGrid()" class="tool-btn" title="Toggle Grid">
          {{ canvasState.showGrid ? '🔲' : '⬛' }}
        </button>
      </div>
    </div>
    
    <!-- Interaction Hints -->
    <div class="interaction-hints" v-if="!ui.editMode">
      <div class="hint">💬 Click characters to view their thoughts</div>
      <div class="hint">🖱️ Drag to pan, scroll to zoom</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useCharactersStore, useZonesStore, useUIStore, useSimulationStore, useAssetStore } from '@/stores'

// Store access
const characters = useCharactersStore()
const zones = useZonesStore()
const ui = useUIStore()
const simulation = useSimulationStore()
const assetStore = useAssetStore()

// Canvas reference and context
const canvasRef = ref(null)
let ctx = null

// Canvas state
const canvasState = computed(() => ui.canvasState)
const mapImage = ref(null)
const characterSprites = ref(new Map())

// Animation and interaction state
const animationFrameId = ref(null)
const isInitialized = ref(false)
let lastRenderTime = 0
const RENDER_THROTTLE = 16 // Limit to ~60 FPS maximum
const isDragging = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })

// Enhanced interaction state
const hoveredCharacterId = ref(null)
const showCharacterTooltip = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })

// Character animation state
const characterAnimations = ref(new Map())

// Zone editing state - removed local state, using UI store instead
const isDrawing = ref(false)
const drawStartTile = ref(null)
const showZoneCreator = ref(false)

// Watch for character loading
watch(() => characters.isLoaded, (newVal) => {
  if (newVal) {
    console.log('✅ Characters loaded, initializing sprites and animations...')
    loadCharacterSprites()
    initializeCharacterAnimations()
    // Force immediate render
    nextTick(() => {
      render()
      console.log('🎨 Forced render after character loading')
    })
    // Also render after a short delay to ensure sprites are processed
    setTimeout(() => {
      render()
      console.log('🎨 Secondary render for character sprites')
    }, 150)
  }
}, { immediate: true })

// Watch for character list changes 
watch(() => characters.charactersList, (newList, oldList) => {
  if (newList && newList.length > 0 && characters.isLoaded) {
    console.log('📋 Character list updated, refreshing sprites and animations...')
    loadCharacterSprites()
    initializeCharacterAnimations()
    // Force immediate render
    nextTick(() => {
      render()
      console.log('🎨 Forced render after character list update')
    })
  }
}, { immediate: true, deep: true })

// Watch for edit mode changes to trigger re-render
watch(() => ui.editMode, (newEditMode) => {
  console.log('🔧 Edit mode changed to:', newEditMode)
  // Force canvas cursor update
  updateCanvasCursor()
  render()
}, { immediate: true })

// Watch for active tab changes
watch(() => ui.activeTab, (newTab) => {
  console.log('🔧 Active tab changed to:', newTab)
  if (newTab === 'zone-editor') {
    canvasState.value.showGrid = true
    ui.editMode = true
  }
  updateCanvasCursor()
  render()
}, { immediate: true })

// Watch for zone editing changes to trigger re-render
watch(() => ui.editingZoneId, (newEditingZoneId) => {
  console.log('🔧 Editing zone changed to:', newEditingZoneId)
  render()
}, { immediate: true })

// Watch for selected tiles changes to trigger re-render
watch(() => ui.selectedTiles.size, (newSize) => {
  console.log('🔧 Selected tiles count changed to:', newSize)
  render()
}, { immediate: true })

// Initialize canvas
onMounted(async () => {
  console.log('🏗️ TownCanvas mounting...')
  
  // Set up canvas
  ctx = canvasRef.value.getContext('2d')
  ctx.imageSmoothingEnabled = false
  
  // Initialize rendering state
  console.log('🎯 Initializing canvas state...')
  updateCanvasSize()
  
  // Load all assets immediately
  console.log('🎨 Loading initial assets...')
  await loadMapBackground()
  
  // Force immediate character loading and rendering
  if (characters.isLoaded) {
    console.log('✅ Characters already loaded, initializing sprites...')
    loadCharacterSprites()
    initializeCharacterAnimations()
    // Force render after short delay to ensure sprites are processed
    setTimeout(() => {
      render()
      console.log('🎨 Initial render complete with characters')
    }, 100)
  } else {
    console.log('⏳ Characters not loaded yet, will render when ready...')
  }
  
  // Set up event listeners
  console.log('👂 Setting up event listeners...')
  window.addEventListener('resize', updateCanvasSize)
  
  // Set up rendering loop for smooth animations
  let animationId
  const renderLoop = () => {
    render()
    animationId = requestAnimationFrame(renderLoop)
  }
  renderLoop()
  
  onUnmounted(() => {
    console.log('🧹 TownCanvas unmounting...')
    window.removeEventListener('resize', updateCanvasSize)
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
  })
  
  console.log('✅ TownCanvas mounted successfully')
})

onUnmounted(() => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
})

// Canvas setup functions
function updateCanvasSize() {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  const container = canvas.parentElement
  if (!container) return
  
  // Set canvas size to match container
  const rect = container.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  
  // Set CSS size
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'
  
  console.log(`📐 Canvas sized to ${canvas.width}x${canvas.height}`)
}

function setupCanvasSize() {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  const container = canvas.parentElement
  if (!container) return
  
  // Set canvas size to match container
  const rect = container.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  
  // Set CSS size
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'
  
  console.log(`📐 Canvas sized to ${canvas.width}x${canvas.height}`)
}

function setupResizeObserver() {
  if (!canvasRef.value) return
  
  const resizeObserver = new ResizeObserver(() => {
    setupCanvasSize()
    render()
  })
  
  if (canvasRef.value.parentElement) resizeObserver.observe(canvasRef.value.parentElement)
}

async function loadMapBackground() {
  try {
    const customMapDataUrl = assetStore.customMap
    if (customMapDataUrl) {
      console.log('🗺️ Loading custom map background from asset store...')
      mapImage.value = new Image()
      mapImage.value.onload = () => {
        console.log('✅ Custom map loaded successfully')
        render()
      }
      mapImage.value.onerror = () => {
        console.warn('❌ Failed to load custom map, falling back to default')
        loadDefaultMap()
      }
      mapImage.value.src = customMapDataUrl
      return
    }
    
    loadDefaultMap()
    
  } catch (error) {
    console.error('Failed to load map:', error)
    createFallbackMap()
  }
}

function loadDefaultMap() {
  console.log('🗺️ Loading static map background...')
  mapImage.value = new Image()
  mapImage.value.crossOrigin = 'anonymous'
  mapImage.value.onload = () => {
    console.log('✅ Static map background loaded successfully')
    render()
  }
  mapImage.value.onerror = () => {
    console.warn('❌ Failed to load static map, creating fallback')
    createFallbackMap()
  }
  mapImage.value.src = import.meta.env.BASE_URL + 'map/map.png'
}

function createFallbackMap() {
  if (!ctx) return
  
  console.log('🎨 Creating fallback map...')
  
  // Store reference to avoid repeated null checks
  const context = ctx
  
  // Create fallback map directly on canvas
  const { width, height } = zones.mapData
  
  // Clear canvas
  context.fillStyle = '#90EE90' // Light green background
  context.fillRect(0, 0, width, height)
  
  // Draw streets
  context.fillStyle = '#D3D3D3'
  context.fillRect(width * 0.4, 0, width * 0.2, height) // Vertical street
  context.fillRect(0, height * 0.4, width, height * 0.2) // Horizontal street
  
  // Draw zone areas with colors
  zones.zones.forEach(zone => {
    const colors = {
      home: '#FFB6C1',
      shop: '#DEB887', 
      public: '#4169E1',
      park: '#228B22',
      street: '#D3D3D3',
      temple: '#DDA0DD'
    }
    
    context.fillStyle = colors[zone.type] || '#F0F0F0'
    
    // Draw zone boundaries
    zone.tiles.forEach(tile => {
      context.fillRect(
        tile.x * zones.mapData.tileSize,
        tile.y * zones.mapData.tileSize,
        zones.mapData.tileSize,
        zones.mapData.tileSize
      )
    })
    
    // Draw zone labels
    if (zone.tiles.length > 0) {
      const centerTile = zone.tiles[Math.floor(zone.tiles.length / 2)]
      context.fillStyle = '#000'
      context.font = '14px Arial'
      context.textAlign = 'center'
      context.fillText(
        zone.name,
        centerTile.x * zones.mapData.tileSize + zones.mapData.tileSize / 2,
        centerTile.y * zones.mapData.tileSize + zones.mapData.tileSize / 2
      )
    }
  })
  
  console.log('✅ Fallback map created')
}

function loadCharacterSprites() {
  console.log('👥 Loading character sprites...')
  
  if (!characters.isLoaded || characters.charactersList.length === 0) {
    console.log('⏳ Waiting for characters to load before loading sprites...')
    return
  }
  
  characters.charactersList.forEach(character => {
    // Prioritize custom sprite from asset store
    const customSpriteDataUrl = assetStore.customCharacterSprites[character.id]
    if (customSpriteDataUrl) {
      const sprite = new Image()
      sprite.onload = () => {
        characterSprites.value.set(character.id, sprite)
        console.log(`✅ Loaded custom sprite for ${character.name} from asset store`)
        if (animationFrameId.value === null) startRenderLoop()
      }
      sprite.onerror = () => {
        console.warn(`⚠️ Failed to load custom sprite for ${character.name}, trying default`)
        loadDefaultSprite(character)
      }
      sprite.src = customSpriteDataUrl
    } else {
      // Fallback to default sprite
      loadDefaultSprite(character)
    }
  })
}

function loadDefaultSprite(character) {
  if (!characterSprites.value.has(character.id)) {
    const sprite = new Image()
    sprite.onload = () => {
      characterSprites.value.set(character.id, sprite)
      console.log(`✅ Loaded default sprite for ${character.name}`)
      if (animationFrameId.value === null) startRenderLoop()
    }
    sprite.onerror = () => {
      console.warn(`⚠️ Failed to load default sprite for ${character.name}, using null`)
      characterSprites.value.set(character.id, null)
    }
    const spritePath = character.sprite || `/characters/${character.name}/sprite.png`
    sprite.src = spritePath
    console.log(`🔄 Loading default sprite for ${character.name} from: ${spritePath}`)
  }
}

// Animation and movement functions
function initializeCharacterAnimations() {
  // Only initialize if characters are loaded
  if (!characters.isLoaded || characters.charactersList.length === 0) {
    console.log('⏳ Skipping character animation initialization - characters not loaded yet')
    return
  }
  
  characters.charactersList.forEach(character => {
    if (character && character.position) {
      characterAnimations.value.set(character.id, {
        currentPos: { x: character.position.x, y: character.position.y },
        targetPos: { x: character.position.x, y: character.position.y },
        isMoving: false,
        moveStartTime: Date.now(),
        moveDuration: 1000
      })
    }
  })
  console.log('🎬 Character animations initialized for', characterAnimations.value.size, 'characters')
}

function updateCharacterAnimations() {
  const now = Date.now()
  let needsUpdate = false
  
  characters.charactersList.forEach(character => {
    let animation = characterAnimations.value.get(character.id)
    
    if (!animation) {
      // Initialize animation state for new characters
      animation = {
        currentPos: { x: character.position.x, y: character.position.y },
        targetPos: { x: character.position.x, y: character.position.y },
        isMoving: false,
        moveStartTime: now,
        moveDuration: 1000
      }
      characterAnimations.value.set(character.id, animation)
      needsUpdate = true
      return
    }
    
    // Check if character has moved to a new target position
    if (character.position.x !== animation.targetPos.x || character.position.y !== animation.targetPos.y) {
      animation.targetPos = { x: character.position.x, y: character.position.y }
      animation.isMoving = true
      animation.moveStartTime = now
      animation.moveDuration = 1500 // 1.5 seconds for movement
      needsUpdate = true
      console.log(`🚶 ${character.name} starting move to (${character.position.x}, ${character.position.y})`)
    }
    
    // Update movement animation
    if (animation.isMoving) {
      const elapsed = now - animation.moveStartTime
      const progress = Math.min(elapsed / animation.moveDuration, 1)
      
      // Smooth easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      
      // Interpolate position
      const startX = animation.currentPos.x
      const startY = animation.currentPos.y
      const deltaX = animation.targetPos.x - startX
      const deltaY = animation.targetPos.y - startY
      
      animation.currentPos.x = startX + deltaX * easedProgress
      animation.currentPos.y = startY + deltaY * easedProgress
      
      if (progress >= 1) {
        animation.currentPos = { ...animation.targetPos }
        animation.isMoving = false
        console.log(`✅ ${character.name} completed move to destination`)
      }
      
      needsUpdate = true
    }
  })
  
  return needsUpdate
}

function startRenderLoop() {
  function animate() {
    const needsUpdate = updateCharacterAnimations()
    
    // Only render when there are actual updates and throttle renders
    const now = Date.now()
    if (needsUpdate && (now - lastRenderTime > RENDER_THROTTLE)) {
      render()
      lastRenderTime = now
    }
    
    animationFrameId.value = requestAnimationFrame(animate)
  }
  animate()
}

// Rendering functions
function render() {
  if (!ctx || !canvasRef.value) return
  
  const now = Date.now()
  if (now - lastRenderTime < RENDER_THROTTLE) return
  lastRenderTime = now
  
  // Clear canvas
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  
  // Save context state
  ctx.save()
  
  // Apply zoom and pan transformations
  ctx.setTransform(
    canvasState.value.zoom, 0, 0, canvasState.value.zoom,
    canvasState.value.panX, canvasState.value.panY
  )
  
  // Render map background
  renderMapBackground()
  
  // Render zones
  renderZones()
  
  // Render characters (including dead ones with special rendering)
  renderCharacters()
  
  // Render grid if in edit mode
  if (canvasState.value.showGrid || ui.editMode) {
    renderGrid()
  }
  
  // Render zone editing elements
  if (ui.activeTab === 'zone-editor') {
    renderZoneEditingElements()
  }
  
  // Restore context
  ctx.restore()
}

function renderMapBackground() {
  if (!mapImage.value) return
  
  try {
    // Draw the map background image
    ctx.drawImage(mapImage.value, 0, 0, zones.mapData.width, zones.mapData.height)
  } catch (error) {
    console.warn('Failed to render map background:', error)
    // Fallback to solid color background
    ctx.fillStyle = '#90EE90'
    ctx.fillRect(0, 0, zones.mapData.width, zones.mapData.height)
  }
}

function renderZones() {
  if (!ctx) return
  
  const context = ctx // Store reference to avoid repeated null checks
  const { tileSize } = zones.mapData
  const { zoom } = canvasState.value
  
  zones.zones.forEach(zone => {
    // When editing a specific zone, only show that zone prominently
    if (ui.editingZoneId) {
      const isEditingZone = ui.editingZoneId === zone.id
      if (isEditingZone) {
        // Show the zone being edited with bright yellow highlighting
        context.fillStyle = 'rgba(255, 255, 0, 0.8)'
        zone.tiles.forEach(tile => {
          context.fillRect(
            tile.x * tileSize,
            tile.y * tileSize,
            tileSize,
            tileSize
          )
          
          // Add bright yellow border
          context.strokeStyle = 'rgba(255, 255, 0, 1.0)'
          context.lineWidth = 3 * zoom
          context.strokeRect(
            tile.x * tileSize,
            tile.y * tileSize,
            tileSize,
            tileSize
          )
        })
      } else {
        // Hide other zones completely when editing a specific zone
        return
      }
    } else {
      // Normal zone rendering when not editing a specific zone
      // More vibrant and visible colors for edit mode
      const editModeColors = {
        home: 'rgba(255, 180, 50, 0.7)',      // Bright orange
        shop: 'rgba(50, 255, 80, 0.7)',       // Bright green
        public: 'rgba(50, 120, 255, 0.7)',    // Bright blue
        park: 'rgba(120, 255, 120, 0.7)',     // Light green
        street: 'rgba(200, 200, 200, 0.7)',   // Gray
        temple: 'rgba(255, 100, 255, 0.7)',   // Magenta
        private: 'rgba(255, 80, 80, 0.7)'     // Bright red
      }
      
      // Normal mode colors (very subtle - barely visible hints)
      const normalColors = {
        home: 'rgba(255, 200, 100, 0.08)',      // Much more subtle
        shop: 'rgba(100, 255, 100, 0.08)',
        public: 'rgba(100, 150, 255, 0.08)',
        park: 'rgba(150, 255, 150, 0.08)',
        street: 'rgba(200, 200, 200, 0.05)',    // Almost invisible for streets
        temple: 'rgba(255, 150, 255, 0.08)',
        private: 'rgba(255, 100, 100, 0.08)'
      }
      
      // Use more vibrant colors in edit mode
      const colors = (ui.editMode || ui.activeTab === 'zone-editor') ? editModeColors : normalColors
      const baseColor = colors[zone.type] || 'rgba(128, 128, 128, 0.5)'
      
      context.fillStyle = baseColor
      
      zone.tiles.forEach(tile => {
        // Fill the tile
        context.fillRect(
          tile.x * tileSize,
          tile.y * tileSize,
          tileSize,
          tileSize
        )
        
        // Add borders in edit mode for better visibility
        if (ui.editMode || ui.activeTab === 'zone-editor') {
          context.strokeStyle = 'rgba(0, 0, 0, 0.6)'
          context.lineWidth = 1 * zoom
          context.strokeRect(
            tile.x * tileSize,
            tile.y * tileSize,
            tileSize,
            tileSize
          )
        }
      })
    }
    
    // Add zone labels in edit mode for better visibility (but not when editing a specific zone)
    if ((ui.editMode || ui.activeTab === 'zone-editor') && !ui.editingZoneId && zone.tiles.length > 0) {
      // Find center of zone
      const centerX = zone.tiles.reduce((sum, tile) => sum + tile.x, 0) / zone.tiles.length
      const centerY = zone.tiles.reduce((sum, tile) => sum + tile.y, 0) / zone.tiles.length
      
      // Draw zone label
      context.fillStyle = 'rgba(255, 255, 255, 0.9)'
      context.strokeStyle = 'rgba(0, 0, 0, 0.8)'
      context.lineWidth = 2 * zoom
      context.font = `bold ${12 * zoom}px Arial`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      
      const labelX = centerX * tileSize + tileSize / 2
      const labelY = centerY * tileSize + tileSize / 2
      
      // Draw text with outline for better readability
      context.strokeText(zone.name, labelX, labelY)
      context.fillText(zone.name, labelX, labelY)
    }
  })
}

function renderGrid() {
  if (!ctx) return
  
  // Store reference to avoid repeated null checks
  const context = ctx
  const { width, height, tileSize } = zones.mapData
  const { zoom } = canvasState.value
  
  // Always show grid in edit mode or zone editor
  context.strokeStyle = 'rgba(0, 0, 0, 0.4)'
  context.lineWidth = 1 * zoom // FIXED: multiply by zoom for proper scaling
  
  // Vertical lines
  for (let x = 0; x <= width; x += tileSize) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, height)
    context.stroke()
  }
  
  // Horizontal lines
  for (let y = 0; y <= height; y += tileSize) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }
  
  // Render selected tiles for zone editing
  if (ui.activeTab === 'zone-editor' && ui.selectedTiles.size > 0) {
    context.fillStyle = 'rgba(102, 126, 234, 0.5)'
    context.strokeStyle = 'rgba(102, 126, 234, 1)'
    context.lineWidth = 2 * zoom // FIXED: multiply by zoom
    
    ui.selectedTiles.forEach(tileKey => {
      const [x, y] = tileKey.split(',').map(Number)
      const screenX = x * tileSize
      const screenY = y * tileSize
      
      context.fillRect(screenX, screenY, tileSize, tileSize)
      context.strokeRect(screenX, screenY, tileSize, tileSize)
    })
  }
}

function renderCharacters() {
  if (!characters.isLoaded || !characterAnimations.value.size) return
  
  updateCharacterAnimations()
  
  characters.charactersList.forEach(character => {
    if (!character || !character.position) return
    
    const animation = characterAnimations.value.get(character.id)
    if (!animation) return
    
    const sprite = characterSprites.value.get(character.id)
    const tileSize = zones.mapData.tileSize
    
    // Make characters much larger and more visible - use a proper character size
    const characterSize = Math.max(tileSize * 3, 48) // At least 48px, or 3x tileSize
    
    // Use animated position for tile center
    const tileX = animation.currentPos.x * tileSize
    const tileY = animation.currentPos.y * tileSize
    
    // Center the larger character sprite on the tile
    const x = tileX - (characterSize - tileSize) / 2
    const y = tileY - (characterSize - tileSize) / 2
    
    ctx.save()
    
    if (character.isDead) {
      // Render dead characters differently
      ctx.globalAlpha = 0.3
      ctx.filter = 'grayscale(100%) brightness(0.7)'
    }
    
    if (sprite) {
      // Draw character sprite at the larger size
      ctx.drawImage(sprite, x, y, characterSize, characterSize)
    } else {
      // Draw fallback representation at larger size
      ctx.fillStyle = character.isDead ? '#666666' : '#FF6B6B'
      const fallbackSize = characterSize * 0.8 // Slightly smaller than full size
      const fallbackOffset = (characterSize - fallbackSize) / 2
      ctx.fillRect(x + fallbackOffset, y + fallbackOffset, fallbackSize, fallbackSize)
      
      // Draw character name
      ctx.fillStyle = character.isDead ? '#333333' : '#FFFFFF'
      ctx.font = `${Math.max(10, characterSize * 0.2)}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText(character.name, x + characterSize/2, y + characterSize/2 + 3)
    }
    
    // Add death indicator for dead characters
    if (character.isDead) {
      ctx.fillStyle = '#FFFFFF'
      ctx.font = `bold ${Math.max(16, characterSize * 0.33)}px Arial`
      ctx.textAlign = 'center'
      ctx.fillText('💀', x + characterSize/2, y - 5)
    }
    
    // Draw character emotion indicator
    if (!character.isDead) {
      const emotionColor = getEmotionColor(character.currentEmotion)
      ctx.fillStyle = emotionColor
      const emotionSize = Math.max(4, characterSize * 0.15)
      ctx.beginPath()
      ctx.arc(x + characterSize - emotionSize - 2, y + emotionSize + 2, emotionSize, 0, 2 * Math.PI)
      ctx.fill()
    }
    
    // Highlight hovered character
    if (hoveredCharacterId.value === character.id) {
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 3
      ctx.strokeRect(x - 2, y - 2, characterSize + 4, characterSize + 4)
    }
    
    ctx.restore()
  })
}

function getCharacterColor(name) {
  const characterColors = {
    'Rose': '#FFB6C1',   // Light Pink
    'Sage': '#DDA0DD',   // Plum (formerly Thistle's color)
    'Griff': '#CD853F',  // Peru  
    'John': '#87CEEB'    // Sky Blue
  }
  return characterColors[name] || '#4A90E2'
}

function getEmotionColor(emotion) {
  const emotionColors = {
    'Happy': '#FFD700',
    'Sad': '#FF6B6B',
    'Angry': '#FF4500',
    'Surprised': '#00FFFF',
    'Neutral': '#808080'
  }
  return emotionColors[emotion] || '#808080'
}

// Update canvas cursor based on mode
function updateCanvasCursor() {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  
  if (ui.editMode || ui.activeTab === 'zone-editor') {
    canvas.style.cursor = 'crosshair'
    console.log('🎯 Set cursor to crosshair for edit mode')
  } else {
    canvas.style.cursor = isDragging.value ? 'grabbing' : 'grab'
  }
}

// Interaction handlers
function handleMouseDown(event) {
  console.log('🖱️ Mouse down in edit mode:', ui.editMode, 'active tab:', ui.activeTab)
  
  if (ui.activeTab === 'zone-editor' || ui.editMode) {
    const rect = canvasRef.value?.getBoundingClientRect()
    if (!rect) return
    
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const tile = getTileFromScreen(x, y)
    
    isDrawing.value = true
    drawStartTile.value = tile
    
    console.log('🎯 Zone editing: selecting tile', tile)
    return
  }
  
  // Existing pan functionality
  isDragging.value = true
  lastMousePos.value = { x: event.clientX, y: event.clientY }
  updateCanvasCursor()
}

function handleMouseMove(event) {
  if (isDragging.value && !ui.editMode) {
    const deltaX = event.clientX - lastMousePos.value.x
    const deltaY = event.clientY - lastMousePos.value.y
    
    ui.setCanvasOffset(
      canvasState.value.panX + deltaX,
      canvasState.value.panY + deltaY
    )
    
    lastMousePos.value = { x: event.clientX, y: event.clientY }
  } else {
    // Handle character hover detection
    updateCharacterHover(event)
  }
}

function updateCharacterHover(event) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  
  const screenX = event.clientX - rect.left
  const screenY = event.clientY - rect.top
  
  const worldX = (screenX - canvasState.value.panX) / canvasState.value.zoom
  const worldY = (screenY - canvasState.value.panY) / canvasState.value.zoom
  
  const tileSize = zones.mapData.tileSize
  const characterSize = Math.max(tileSize * 3, 48) // Same calculation as in renderCharacters
  
  const hoveredCharacter = characters.charactersList.find(char => {
    const animation = characterAnimations.value.get(char.id)
    const pos = animation?.currentPos || char.position
    
    // Calculate character's actual rendered position (centered on tile)
    const tileX = pos.x * tileSize
    const tileY = pos.y * tileSize
    const charX = tileX - (characterSize - tileSize) / 2
    const charY = tileY - (characterSize - tileSize) / 2
    
    // Check if mouse is within the character's larger sprite bounds
    return worldX >= charX && worldX <= charX + characterSize &&
           worldY >= charY && worldY <= charY + characterSize
  })
  
  if (hoveredCharacter) {
    hoveredCharacterId.value = hoveredCharacter.id
  } else {
    hoveredCharacterId.value = null
  }
}

function handleMouseUp() {
  isDragging.value = false
  isDrawing.value = false
  updateCanvasCursor()
}

function handleMouseLeave() {
  isDragging.value = false
  isDrawing.value = false
  hoveredCharacterId.value = null
  showCharacterTooltip.value = false
  updateCanvasCursor()
}

function handleWheel(event) {
  event.preventDefault()
  
  // More aggressive zoom delta for better responsiveness
  const delta = event.deltaY > 0 ? 0.85 : 1.15
  const newZoom = Math.max(0.1, Math.min(5, canvasState.value.zoom * delta))
  
  // Center zoom on mouse position
  const rect = canvasRef.value?.getBoundingClientRect()
  if (rect) {
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    
    // Calculate zoom point in world coordinates
    const worldX = (mouseX - canvasState.value.panX) / canvasState.value.zoom
    const worldY = (mouseY - canvasState.value.panY) / canvasState.value.zoom
    
    // Calculate new offset to keep zoom centered on mouse
    const newOffsetX = mouseX - worldX * newZoom
    const newOffsetY = mouseY - worldY * newZoom
    
    ui.setZoom(newZoom)
    ui.setCanvasOffset(newOffsetX, newOffsetY)
  } else {
    ui.setZoom(newZoom)
  }
  
  render()
}

function handleClick(event) {
  console.log('🖱️ Click - Edit mode:', ui.editMode, 'Active tab:', ui.activeTab)
  
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return

  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const tile = getTileFromScreen(x, y)
  
  if (ui.activeTab === 'zone-editor' || ui.editMode) {
    // Zone editing mode
    const key = tileKey(tile.x, tile.y)
    
    // Check if this tile belongs to an existing zone
    const existingZone = zones.zones.find(zone => 
      zone.tiles && zone.tiles.some(zoneTile => zoneTile.x === tile.x && zoneTile.y === tile.y)
    )
    
    if (existingZone && !ui.editingZoneId) {
      // If clicking on an existing zone and not currently editing, highlight it in the side menu
      console.log('🎯 Clicked on existing zone:', existingZone.name)
      // Set the selected zone in UI state so ZoneEditor can react to it
      ui.selectZone(existingZone.id)
      // Clear current selection and select all tiles for this zone
      ui.clearSelectedTiles()
      existingZone.tiles.forEach(zoneTile => {
        ui.addSelectedTile(zoneTile.x, zoneTile.y)
      })
      render()
      return
    }
    
    // When editing a specific zone, allow clicking on any tile to add/remove it
    if (ui.editingZoneId) {
      console.log('🖱️ Editing zone:', ui.editingZoneId, 'Clicked tile:', tile.x, tile.y)
      // Allow any tile to be selected when editing a zone
      // The zone editor will handle adding/removing tiles from the zone
    }
    
    // Toggle tile selection
    if (ui.selectedTiles.has(key)) {
      ui.removeSelectedTile(tile.x, tile.y)
      console.log('➖ Deselected tile:', tile.x, tile.y)
    } else {
      ui.addSelectedTile(tile.x, tile.y)
      console.log('➕ Selected tile:', tile.x, tile.y)
    }
    
    console.log(`Selected tiles: ${ui.selectedTiles.size}`)
    render()
    return
  }
  
  // Character interaction mode
  const clickedCharacter = characters.charactersList.find(char => {
    const animation = characterAnimations.value.get(char.id)
    const pos = animation?.currentPos || char.position
    
    // Calculate character's actual rendered position (centered on tile)
    const tileSize = zones.mapData.tileSize
    const characterSize = Math.max(tileSize * 3, 48) // Same calculation as in renderCharacters
    const tileX = pos.x * tileSize
    const tileY = pos.y * tileSize
    const charX = tileX - (characterSize - tileSize) / 2
    const charY = tileY - (characterSize - tileSize) / 2
    
    // Check if click is within the character's larger sprite bounds
    const worldX = (x - canvasState.value.panX) / canvasState.value.zoom
    const worldY = (y - canvasState.value.panY) / canvasState.value.zoom
    
    return worldX >= charX && worldX <= charX + characterSize &&
           worldY >= charY && worldY <= charY + characterSize
  })
  
  if (clickedCharacter) {
    ui.selectCharacter(clickedCharacter.id)
    // Switch to character editor tab when a character is clicked
    ui.setActiveTab('character-editor')
    console.log(`Selected character: ${clickedCharacter.name}`)
  } else {
    // Normal click mode - place characters
    characters.moveSelectedCharacterTo(tile.x, tile.y)
    ui.selectCharacter(undefined)
  }
  
  render()
}

// Control functions
function setDrawingTool(tool) {
  ui.setDrawingTool(tool)
}

function zoomIn() {
  const newZoom = Math.min(canvasState.value.zoom * 1.4, 5) // More aggressive zoom
  ui.setZoom(newZoom)
  render()
}

function zoomOut() {
  const newZoom = Math.max(canvasState.value.zoom / 1.4, 0.1) // More aggressive zoom
  ui.setZoom(newZoom)
  render()
}

function resetView() {
  ui.setZoom(1)
  ui.setCanvasOffset(0, 0)
  render() // Force re-render
}

function fitToView() {
  if (!canvasRef.value) return
  
  const canvas = canvasRef.value
  const canvasWidth = canvas.width
  const canvasHeight = canvas.height
  
  const { width: mapWidth, height: mapHeight } = zones.mapData
  
  // Add padding (10% of canvas size on each side)
  const padding = Math.min(canvasWidth, canvasHeight) * 0.1
  const availableWidth = canvasWidth - padding * 2
  const availableHeight = canvasHeight - padding * 2
  
  // Calculate zoom to fit the map within the available space
  const zoomX = availableWidth / mapWidth
  const zoomY = availableHeight / mapHeight
  const optimalZoom = Math.min(zoomX, zoomY, 2) // Cap at 2x zoom max
  
  // Calculate offset to center the map
  const scaledMapWidth = mapWidth * optimalZoom
  const scaledMapHeight = mapHeight * optimalZoom
  const offsetX = (canvasWidth - scaledMapWidth) / 2
  const offsetY = (canvasHeight - scaledMapHeight) / 2
  
  // Apply the calculated zoom and offset
  ui.setZoom(optimalZoom)
  ui.setCanvasOffset(offsetX, offsetY)
  
  console.log(`🎯 Fit to view: zoom=${optimalZoom.toFixed(2)}, offset=(${offsetX.toFixed(0)}, ${offsetY.toFixed(0)})`)
  
  render() // Force re-render
}

// Helper functions for tile management
function tileKey(x, y) {
  return `${x},${y}`
}

function getTileFromScreen(screenX, screenY) {
  const worldX = (screenX - canvasState.value.panX) / canvasState.value.zoom
  const worldY = (screenY - canvasState.value.panY) / canvasState.value.zoom
  
  const tileX = Math.floor(worldX / zones.mapData.tileSize)
  const tileY = Math.floor(worldY / zones.mapData.tileSize)
  
  return { x: tileX, y: tileY }
}

// Force character movement for testing
function testCharacterMovement() {
  console.log('🧪 Testing character movement...')
  characters.charactersList.forEach(character => {
    const newX = Math.floor(Math.random() * 50)
    const newY = Math.floor(Math.random() * 37)
    characters.moveCharacter(character.id, {
      x: newX,
      y: newY,
      zone: character.position.zone
    })
    console.log(`Moved ${character.name} to (${newX}, ${newY})`)
  })
}

// Expose for debugging
window.testMovement = testCharacterMovement
window.debugCanvas = {
  characters: characters.charactersList,
  animations: characterAnimations.value,
  ui: ui,
  render
}

function renderZoneEditingElements() {
  if (ui.activeTab !== 'zone-editor') return
  
  // Render selected tiles
  if (ui.selectedTiles.size > 0) {
    ctx.fillStyle = 'rgba(102, 126, 234, 0.3)'
    ctx.strokeStyle = '#667eea'
    ctx.lineWidth = 2
    
    ui.selectedTiles.forEach(tileKey => {
      const [x, y] = tileKey.split(',').map(Number)
      const tileSize = zones.mapData.tileSize
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize)
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize)
    })
  }
  
  // Render zone being edited
  if (ui.editingZoneId) {
    const zone = zones.zones.find(z => z.id === ui.editingZoneId)
    if (zone) {
      ctx.fillStyle = 'rgba(255, 165, 0, 0.4)'
      ctx.strokeStyle = '#ff6b35'
      ctx.lineWidth = 3
      
      zone.tiles.forEach(tile => {
        const tileSize = zones.mapData.tileSize
        ctx.fillRect(tile.x * tileSize, tile.y * tileSize, tileSize, tileSize)
        ctx.strokeRect(tile.x * tileSize, tile.y * tileSize, tileSize, tileSize)
      })
    }
  }
}

// Expose functions for parent component to use
defineExpose({
  zoomIn,
  zoomOut,
  fitToView,
  resetView,
  render
})
</script>

<style scoped>
.town-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f0f0f0;
  border-radius: 8px;
}

.town-canvas {
  width: 100%;
  height: 100%;
  border: 2px solid #ddd;
  background: #f8f9fa;
  display: block;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  cursor: default;
  border-radius: 6px;
}

.town-canvas.edit-mode {
  cursor: crosshair !important;
  border-color: #007bff;
  box-shadow: 0 0 10px rgba(0, 123, 255, 0.3);
}

.town-canvas.zone-editor-active {
  cursor: crosshair !important;
  border-color: #28a745;
  box-shadow: 0 0 15px rgba(40, 167, 69, 0.4);
}

.town-canvas:hover {
  border-color: #aaa;
}

.canvas-controls {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 20;
  pointer-events: auto;
}

.zoom-controls,
.drawing-tools {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.97);
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
}

.zoom-btn,
.control-btn,
.tool-btn {
  padding: 6px 10px;
  border: 1px solid #d0d7de;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #24292f;
  transition: all 0.2s ease;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-btn {
  font-size: 16px;
  font-weight: bold;
  min-width: 28px;
  height: 28px;
}

.zoom-btn:hover,
.control-btn:hover,
.tool-btn:hover {
  background: #f6f8fa;
  border-color: #8c959f;
  transform: translateY(-1px);
}

.zoom-btn:active,
.control-btn:active,
.tool-btn:active {
  transform: translateY(0);
  background: #e1e8ed;
}

.tool-btn.active {
  background: #0969da;
  color: white;
  border-color: #0969da;
  box-shadow: 0 2px 4px rgba(9, 105, 218, 0.3);
}

.zoom-display {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #24292f;
  background: #f6f8fa;
  border-radius: 4px;
  min-width: 45px;
  justify-content: center;
  border: 1px solid #d0d7de;
}

.character-tooltip {
  position: absolute;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid #d0d7de;
  padding: 10px 12px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 30;
  backdrop-filter: blur(8px);
  max-width: 200px;
}

.tooltip-content {
  text-align: left;
}

.character-name {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 4px;
  color: #24292f;
}

.character-emotion {
  font-size: 12px;
  color: #656d76;
  margin-bottom: 2px;
}

.character-zone {
  font-size: 11px;
  color: #8c959f;
}

.interaction-hints {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
  z-index: 15;
  max-width: 200px;
}

.hint {
  background: rgba(255, 255, 255, 0.95);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  color: #24292f;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.loading-message,
.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  text-align: center;
  z-index: 10;
}

.loading-message {
  color: #656d76;
}

.error-message {
  color: #d1242f;
  border-color: rgba(209, 36, 47, 0.3);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .canvas-controls {
    top: 8px;
    left: 8px;
    gap: 6px;
  }
  
  .zoom-controls,
  .drawing-tools {
    padding: 4px 6px;
    gap: 3px;
  }
  
  .zoom-btn,
  .control-btn,
  .tool-btn {
    padding: 4px 6px;
    font-size: 11px;
    min-width: 24px;
  }
  
  .zoom-btn {
    font-size: 14px;
    height: 24px;
    min-width: 24px;
  }
  
  .zoom-display {
    padding: 3px 6px;
    font-size: 10px;
    min-width: 35px;
  }
  
  .interaction-hints {
    top: 8px;
    right: 8px;
    max-width: 150px;
  }
  
  .hint {
    padding: 4px 8px;
    font-size: 10px;
  }
  
  .character-tooltip {
    padding: 8px 10px;
    max-width: 150px;
  }
  
  .character-name {
    font-size: 12px;
  }
  
  .character-emotion {
    font-size: 11px;
  }
  
  .character-zone {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .canvas-controls {
    top: 6px;
    left: 6px;
    gap: 4px;
  }
  
  .control-btn {
    padding: 3px 5px;
    font-size: 10px;
  }
  
  .interaction-hints {
    display: none; /* Hide hints on very small screens */
  }
}
</style> 