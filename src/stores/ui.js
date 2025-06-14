import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { setApiKey as setClaudeApiKeyInService } from '../services/claudeApi.js'

export const useUIStore = defineStore('ui', () => {
  // State
  const selectedCharacterId = ref(undefined)
  const activeTab = ref('character-editor')
  const editMode = ref(false)
  const claudeApiKey = ref(localStorage.getItem('ui_claudeApiKey') || '')
  const openaiApiKey = ref(localStorage.getItem('ui_openaiApiKey') || '')
  const claudeKeyStatus = ref('none') // 'user', 'env', 'none'
  const openaiKeyStatus = ref('none') // 'user', 'env', 'none'
  const timeSpeed = ref(parseInt(localStorage.getItem('ui_timeSpeed') || '5'))
  const showZoneOverlay = ref(false)
  const isSimulationRunning = ref(false)
  const tokenUsage = ref({
    haiku: { input: 0, output: 0, calls: 0 },
    sonnet: { input: 0, output: 0, calls: 0 },
    estimatedCost: { haiku: 0, sonnet: 0, total: 0 }
  })
  
  const canvasState = ref({
    zoom: 1,
    panX: 0,
    panY: 0,
    showGrid: false,
    gridSize: 16,
    drawingTool: {
      type: 'brush',
      size: 1,
      isActive: false
    },
    selectedZone: undefined
  })

  // Zone editing state
  const selectedTiles = ref(new Set())
  const currentZoneName = ref('')
  const currentZoneType = ref('home')
  const editingZoneId = ref(null) // Track which zone is being edited

  // Memory management settings
  const memorySettings = ref({
    maxMemories: 20,
    strategy: 'fifo', // 'fifo' (oldest deleted) or 'periodic' (wipe every X ticks)
    wipeInterval: 50, // ticks before wiping all memories (for periodic strategy)
    lastWipeTime: 0, // track last wipe time for periodic strategy
    enablePromptCaching: true, // Default to true for cost savings
    model: 'adaptive' // Default model
  })

  // Getters
  const isCharacterSelected = computed(() => selectedCharacterId.value !== undefined)
  const shouldShowIntrospection = computed(() => 
    activeTab.value === 'introspection' && isCharacterSelected.value
  )
  const isDrawingActive = computed(() => canvasState.value.drawingTool.isActive)
  const currentZoom = computed(() => canvasState.value.zoom)

  // Actions
  function selectCharacter(characterId) {
    selectedCharacterId.value = characterId
    saveToLocalStorage()
  }

  function setActiveTab(tab) {
    const previousTab = activeTab.value
    activeTab.value = tab
    
    // Handle zone editor state
    if (tab === 'zone-editor') {
      editMode.value = true
      canvasState.value.showGrid = true
    } else if (previousTab === 'zone-editor') {
      // Exit zone editing mode when leaving zone editor
      editMode.value = false
      canvasState.value.showGrid = false
      clearSelectedTiles()
      editingZoneId.value = null
    }
    
    saveToLocalStorage()
  }

  function toggleEditMode() {
    editMode.value = !editMode.value
    canvasState.value.showGrid = editMode.value
    showZoneOverlay.value = editMode.value
    
    // Deactivate drawing tool when exiting edit mode
    if (!editMode.value) {
      canvasState.value.drawingTool.isActive = false
    }
    
    saveToLocalStorage()
  }

  function setClaudeApiKey(key) {
    if (key && typeof key === 'string' && key.trim()) {
      const cleanKey = key.trim()
      
      claudeApiKey.value = cleanKey
      claudeKeyStatus.value = 'user'
      console.log('✅ Claude API key updated in UI store')
      
      // Also set the key in the Claude API service
      setClaudeApiKeyInService(cleanKey)
      console.log('🔑 Claude API key also set in service')
      
      saveToLocalStorage()
      return true
    } else {
      // Clear the key
      claudeApiKey.value = ''
      claudeKeyStatus.value = import.meta.env.VITE_CLAUDE_API_KEY ? 'env' : 'none'
      console.log('🗑️ Claude API key cleared')
      
      // Also clear the key in the Claude API service
      setClaudeApiKeyInService('')
      console.log('🗑️ Claude API key also cleared in service')
      
      saveToLocalStorage()
      return false
    }
  }

  function setOpenaiApiKey(key) {
    // Check if environment variable is set first
    const envApiKey = import.meta.env.VITE_OPENAI_API_KEY
    if (envApiKey && envApiKey.trim()) {
      console.log('🔑 Environment API key detected, using that instead of UI input')
      openaiApiKey.value = envApiKey.trim()
      saveToLocalStorage()
      openaiKeyStatus.value = 'env'
      return true
    }

    if (!key || typeof key !== 'string' || !key.trim()) {
      console.error('❌ Invalid OpenAI API key provided')
      openaiApiKey.value = undefined
      openaiKeyStatus.value = 'none'
      return false
    }

    const trimmedKey = key.trim()
    if (!trimmedKey.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API key format - must start with sk-')
      openaiApiKey.value = undefined
      openaiKeyStatus.value = 'none'
      return false
    }

    openaiApiKey.value = trimmedKey
    openaiKeyStatus.value = 'user'
    console.log('🔑 OpenAI API key updated:', trimmedKey.substring(0, 10) + '...')
    
    // Save to localStorage
    saveToLocalStorage()
    return true
  }

  function setTimeSpeed(speed) {
    timeSpeed.value = speed
    saveToLocalStorage()
  }

  function setSimulationRunning(running) {
    isSimulationRunning.value = running
    saveToLocalStorage()
  }

  function toggleZoneOverlay() {
    showZoneOverlay.value = !showZoneOverlay.value
    saveToLocalStorage()
  }

  // Canvas actions
  function setZoom(zoom) {
    canvasState.value.zoom = Math.max(0.25, Math.min(4, zoom))
    saveToLocalStorage()
  }

  function setCanvasOffset(x, y) {
    canvasState.value.panX = x
    canvasState.value.panY = y
    saveToLocalStorage()
  }

  function toggleGrid() {
    canvasState.value.showGrid = !canvasState.value.showGrid
    saveToLocalStorage()
  }

  function setDrawingTool(tool, size) {
    canvasState.value.drawingTool = {
      type: tool,
      size: size || canvasState.value.drawingTool.size || 1,
      isActive: true
    }
    saveToLocalStorage()
  }

  function activateDrawingTool() {
    canvasState.value.drawingTool.isActive = true
    saveToLocalStorage()
  }

  function deactivateDrawingTool() {
    canvasState.value.drawingTool.isActive = false
    saveToLocalStorage()
  }

  function selectZone(zoneId) {
    canvasState.value.selectedZone = zoneId
    saveToLocalStorage()
  }

  function resetCanvas() {
    canvasState.value = {
      zoom: 1,
      panX: 0,
      panY: 0,
      showGrid: editMode.value,
      gridSize: 16,
      drawingTool: {
        type: 'brush',
        size: 1,
        isActive: false
      },
      selectedZone: undefined
    }
    saveToLocalStorage()
  }

  // Zone editing actions
  function addSelectedTile(x, y) {
    const key = `${x},${y}`
    selectedTiles.value.add(key)
    saveToLocalStorage()
  }

  function removeSelectedTile(x, y) {
    const key = `${x},${y}`
    selectedTiles.value.delete(key)
    saveToLocalStorage()
  }

  function clearSelectedTiles() {
    selectedTiles.value.clear()
    currentZoneName.value = ''
    editingZoneId.value = null
    saveToLocalStorage()
  }

  function setCurrentZoneName(name) {
    currentZoneName.value = name
    saveToLocalStorage()
  }

  function setCurrentZoneType(type) {
    currentZoneType.value = type
    saveToLocalStorage()
  }

  function startEditingZone(zoneId, name, type) {
    editingZoneId.value = zoneId
    currentZoneName.value = name
    currentZoneType.value = type
    saveToLocalStorage()
  }

  function stopEditingZone() {
    editingZoneId.value = null
    currentZoneName.value = ''
    currentZoneType.value = 'home'
    clearSelectedTiles()
    saveToLocalStorage()
  }

  // Memory management actions
  function setMaxMemories(max) {
    memorySettings.value.maxMemories = Math.max(5, Math.min(100, max))
    saveToLocalStorage()
  }

  function setMemoryStrategy(strategy) {
    memorySettings.value.strategy = strategy
    saveToLocalStorage()
  }

  function setMemoryWipeInterval(interval) {
    memorySettings.value.wipeInterval = Math.max(10, Math.min(200, interval))
    saveToLocalStorage()
  }

  function updateLastWipeTime(time) {
    memorySettings.value.lastWipeTime = time
    saveToLocalStorage()
  }

  // Token usage actions
  function updateTokenUsage(newTokenUsage) {
    tokenUsage.value = { ...tokenUsage.value, ...newTokenUsage }
    saveToLocalStorage()
  }

  function checkApiKeyStatuses() {
    // Check Claude
    const claudeUser = claudeApiKey.value
    const claudeEnv = import.meta.env.VITE_CLAUDE_API_KEY
    
    if (claudeUser && claudeUser.trim()) {
      claudeKeyStatus.value = 'user'
    } else if (claudeEnv && claudeEnv.trim()) {
      claudeKeyStatus.value = 'env'
    } else {
      claudeKeyStatus.value = 'none'
    }
    
    // Check OpenAI
    const openaiUser = openaiApiKey.value
    const openaiEnv = import.meta.env.VITE_OPENAI_API_KEY
    
    if (openaiUser && openaiUser.trim()) {
      openaiKeyStatus.value = 'user'
    } else if (openaiEnv && openaiEnv.trim()) {
      openaiKeyStatus.value = 'env'
    } else {
      openaiKeyStatus.value = 'none'
    }
  }

  // Persistence
  function saveToLocalStorage() {
    const data = {
      activeTab: activeTab.value,
      editMode: editMode.value,
      timeSpeed: timeSpeed.value,
      claudeApiKey: claudeApiKey.value,
      openaiApiKey: openaiApiKey.value,
      canvasState: canvasState.value,
      memorySettings: memorySettings.value,
      tokenUsage: tokenUsage.value
    }
    localStorage.setItem('meadowloop-ui', JSON.stringify(data))
    checkApiKeyStatuses()
  }

  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('meadowloop-ui')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.activeTab) activeTab.value = data.activeTab
        if (data.editMode !== undefined) editMode.value = data.editMode
        if (data.timeSpeed) timeSpeed.value = data.timeSpeed
        if (data.claudeApiKey) claudeApiKey.value = data.claudeApiKey
        if (data.openaiApiKey) openaiApiKey.value = data.openaiApiKey
        if (data.canvasState) {
          canvasState.value = { ...canvasState.value, ...data.canvasState }
        }
        if (data.memorySettings) {
          memorySettings.value = { ...memorySettings.value, ...data.memorySettings }
        }
        if (data.tokenUsage) {
          tokenUsage.value = { ...tokenUsage.value, ...data.tokenUsage }
        }
      }
    } catch (error) {
      console.error('Failed to load UI state from localStorage:', error)
    }
  }

  function resetUI() {
    selectedCharacterId.value = undefined
    activeTab.value = 'character-editor'
    editMode.value = false
    claudeApiKey.value = undefined
    openaiApiKey.value = undefined
    claudeKeyStatus.value = 'none'
    openaiKeyStatus.value = 'none'
    timeSpeed.value = 5
    showZoneOverlay.value = false
    isSimulationRunning.value = false
    memorySettings.value = {
      maxMemories: 20,
      strategy: 'fifo',
      wipeInterval: 50,
      lastWipeTime: 0,
      enablePromptCaching: true,
      model: 'adaptive'
    }
    tokenUsage.value = {
      haiku: { input: 0, output: 0, calls: 0 },
      sonnet: { input: 0, output: 0, calls: 0 },
      estimatedCost: { haiku: 0, sonnet: 0, total: 0 }
    }
    resetCanvas()
    localStorage.removeItem('meadowloop-ui')
  }

  function initializeStore() {
    // Load any saved UI state from localStorage
    loadFromLocalStorage()
    checkApiKeyStatuses()
  }

  return {
    // State
    selectedCharacterId,
    activeTab,
    editMode,
    claudeApiKey,
    openaiApiKey,
    claudeKeyStatus,
    openaiKeyStatus,
    timeSpeed,
    showZoneOverlay,
    isSimulationRunning,
    canvasState,
    tokenUsage,

    // Zone editing state
    selectedTiles,
    currentZoneName,
    currentZoneType,
    editingZoneId,

    // Memory management state
    memorySettings,

    // Getters
    isCharacterSelected,
    shouldShowIntrospection,
    isDrawingActive,
    currentZoom,

    // Actions
    selectCharacter,
    setActiveTab,
    toggleEditMode,
    setClaudeApiKey,
    setOpenaiApiKey,
    setTimeSpeed,
    setSimulationRunning,
    toggleZoneOverlay,
    
    // Canvas actions
    setZoom,
    setCanvasOffset,
    toggleGrid,
    setDrawingTool,
    activateDrawingTool,
    deactivateDrawingTool,
    selectZone,
    resetCanvas,
    
    // Zone editing actions
    addSelectedTile,
    removeSelectedTile,
    clearSelectedTiles,
    setCurrentZoneName,
    setCurrentZoneType,
    startEditingZone,
    stopEditingZone,
    
    // Memory management actions
    setMaxMemories,
    setMemoryStrategy,
    setMemoryWipeInterval,
    updateLastWipeTime,
    
    // Token usage actions
    updateTokenUsage,
    
    // Persistence
    saveToLocalStorage,
    loadFromLocalStorage,
    resetUI,
    initializeStore
  }
}) 