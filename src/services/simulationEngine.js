import claudeApi from './claudeApi'

export class SimulationEngine {
  isRunning = false
  intervalId = null
  tickCount = 0

  // Store references (to be injected)
  charactersStore = null
  simulationStore = null
  zonesStore = null
  uiStore = null

  constructor() {
    // Constructor intentionally empty - stores will be injected
  }

  // Inject store dependencies
  setStores(stores) {
    this.charactersStore = stores.characters
    this.simulationStore = stores.simulation
    this.zonesStore = stores.zones
    this.uiStore = stores.ui
  }

  start() {
    if (this.isRunning || !this.charactersStore) {
      console.warn('⚠️ Cannot start simulation - already running or stores not set')
      return
    }
    
    console.log('🚀 Starting MeadowLoop simulation...')
    
    // Validate that all required stores are available
    if (!this.charactersStore || !this.simulationStore || !this.zonesStore || !this.uiStore) {
      console.error('❌ Cannot start simulation - missing required stores:', {
        characters: !!this.charactersStore,
        simulation: !!this.simulationStore, 
        zones: !!this.zonesStore,
        ui: !!this.uiStore
      })
      return
    }
    
    // Clean up any duplicate memories on startup
    console.log('🧹 Cleaning up duplicate memories...')
    this.cleanupDuplicateMemories()
    
    // Test Claude API connection if key is available
    this.testClaudeConnection()
    
    this.isRunning = true
    
    // Start the flexible timing loop
    this.startSimulationLoop()
    
    console.log('✅ Simulation started with configurable timing')
    console.log('🎮 Characters will move and interact based on UI speed setting')
    console.log('💬 Conversations will appear in the "Talk" tab')
    console.log('📰 Events will appear in the "Events" tab')
  }

  stop() {
    if (!this.isRunning) {
      console.warn('⚠️ Simulation is not running')
      return
    }
    
    console.log('🛑 Stopping simulation...')
    this.isRunning = false
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    
    console.log('✅ Simulation stopped')
  }

  startSimulationLoop() {
    const processNextTick = () => {
      if (!this.isRunning) return

      try {
        this.processTick()
      } catch (error) {
        console.error('❌ Error in simulation tick:', error)
        // Don't stop the simulation for individual tick errors
      }
      
      // Schedule next tick based on UI speed setting (1-60 seconds)
      const speedInSeconds = this.uiStore?.timeSpeed || 5 // Default 5 seconds
      const intervalMs = speedInSeconds * 1000
      
      console.log(`⏱️ Next tick in ${speedInSeconds} seconds`)
      setTimeout(processNextTick, intervalMs)
    }

    // Start the loop
    processNextTick()
  }

  async processTick() {
    console.log(`⏱️ Tick ${this.tickCount} processing...`)
    
    // Validate stores are available
    if (!this.charactersStore || !this.simulationStore) {
      console.error('❌ Required stores not available for simulation')
      return
    }
    
    // SYNC API KEY FROM UI STORE FIRST - BEFORE CHECKING AVAILABILITY
    if (this.uiStore?.claudeApiKey) {
      console.log('🔑 Syncing Claude API key from UI store to Claude service')
      claudeApi.setApiKey(this.uiStore.claudeApiKey)
    }
    
    // Check if Claude API is available with proper logging
    let hasValidApiKey = false
    
    // Check environment variables
    const envApiKey = import.meta.env.VITE_CLAUDE_API_KEY
    if (envApiKey && envApiKey.trim()) {
      console.log('✅ Found Claude API key in environment variables')
      hasValidApiKey = true
    }
    
    // Double-check if Claude API service has the key
    const claudeApiKey = claudeApi.getApiKey()
    if (claudeApiKey && claudeApiKey.trim()) {
      console.log('✅ Found Claude API key in Claude service')
      hasValidApiKey = true
    } else {
      console.log('❌ No Claude API key found in Claude service')
    }

    this.tickCount++
    
    console.log(`🔄 Simulation tick ${this.tickCount}`)
    
    // Update simulation store tick count and environment
    if (this.simulationStore?.tick) {
      this.simulationStore.tick()
    }
    
    // Periodic memory cleanup (every 10 ticks to prevent bloat)
    if (this.tickCount % 10 === 0) {
      console.log('🧹 Running periodic memory cleanup...')
      this.cleanupDuplicateMemories()
      
      // Check for periodic memory wipes if that strategy is enabled
      if (this.uiStore?.memorySettings?.strategy === 'periodic') {
        this.checkPeriodicMemoryWipe()
      }
    }

    // Clean up conversations every 5 ticks
    if (this.tickCount % 5 === 0) {
      console.log('💬 Running conversation cleanup...')
      this.cleanupConversations()
    }

    // ONLY PROCESS CHARACTERS IF CLAUDE API IS AVAILABLE
    if (!hasValidApiKey) {
      console.log(`⏭️ Skipping tick ${this.tickCount} - Claude API unavailable (no canned content will be generated)`)
      console.log(`💡 Add your Claude API key in the top navigation to enable AI conversations`)
      return
    }
    
    // Check for pending injections
    const pendingInjections = this.simulationStore?.pendingInjections || []
    if (pendingInjections.length > 0) {
      console.log(`💫 Found ${pendingInjections.length} pending injections:`, pendingInjections.map(inj => ({
        id: inj.id,
        target: inj.target,
        content: inj.content.substring(0, 50) + '...'
      })))
    }
    
    // Filter characters that should act this tick
    const charactersToProcess = this.charactersStore.charactersList.filter(character => 
      this.shouldCharacterAct(character)
    )
    
    console.log(`🎭 Processing ${charactersToProcess.length}/${this.charactersStore.charactersList.length} characters with Claude API`)
    
    if (charactersToProcess.length === 0) {
      console.log(`😴 No characters decided to act this tick (this is normal - they don't act every tick)`)
    }
    
    // Process each character with Claude API
    for (const character of charactersToProcess) {
      console.log(`🧠 Using Claude API for ${character.name}`)
      try {
        await this.processCharacterTick(character)
      } catch (error) {
        console.error(`❌ Error processing ${character.name}:`, error)
        // Continue with other characters even if one fails
      }
    }
    
    console.log(`✅ Completed tick ${this.tickCount}`)
  }

  async processCharacterTick(character) {
    // Validate character input
    if (!character || !character.id || !character.name) {
      console.error(`❌ processCharacterTick called with invalid character:`, character)
      return
    }
    
    console.log(`🎭 Processing tick for ${character.name}`)
    
    // Clean up and manage character memories before processing
    if (character.memories && character.memories.length > 0) {
      const originalCount = character.memories.length
      const managedMemories = this.manageCharacterMemories(character.memories)
      if (originalCount !== managedMemories.length) {
        console.log(`🧹 [${character.name}] Memory management: ${originalCount} → ${managedMemories.length} memories`)
        character.memories = managedMemories
      }
    }

    try {
      const context = await this.buildCharacterContext(character)
      
      // Validate context was built properly
      if (!context || typeof context !== 'object') {
        console.error(`❌ [${character.name}] Failed to build valid context:`, context)
        return
      }
      
      console.log(`📊 [${character.name}] Context built:`, {
        nearbyCharacters: context.nearbyCharacters?.length || 0,
        recentEvents: context.recentEvents?.length || 0,
        memories: context.memorySummary ? context.memorySummary.length : 0,
        hasInjection: !!(context.injectedScenario && context.injectedScenario.id)
      })
      
      // Check if Claude API is available
      if (!claudeApi.getApiKey()) {
        console.warn(`⚠️ [${character.name}] Claude API key not available, skipping tick`)
        return
      }

      // Make Claude API call with additional validation
      console.log(`🤖 [${character.name}] Calling Claude API...`)
      const response = await claudeApi.getCharacterAction(context)
      
      // Validate Claude response
      if (!response || typeof response !== 'object') {
        console.error(`❌ [${character.name}] Invalid Claude response:`, response)
        return
      }
      
      console.log(`✅ [${character.name}] Claude response:`, {
        thoughts: response.internal_thoughts?.substring(0, 50) + '...',
        action: response.action,
        emotion: response.emotion,
        hasDialogue: !!response.dialogue
      })

      // Process the response
      await this.processClaudeResponse(character, response, context)

      // Mark injection as processed if there was one - COMPREHENSIVE NULL CHECKS
      if (context && 
          context.injectedScenario && 
          typeof context.injectedScenario === 'object' &&
          context.injectedScenario.id &&
          this.simulationStore &&
          typeof this.simulationStore.markInjectionProcessed === 'function') {
        
        console.log(`✅ [${character.name}] Marking injection ${context.injectedScenario.id} as processed`)
        try {
          this.simulationStore.markInjectionProcessed(context.injectedScenario.id)
        } catch (injectionError) {
          console.error(`❌ [${character.name}] Failed to mark injection as processed:`, injectionError)
        }
      }

    } catch (error) {
      console.error(`❌ [${character.name}] Error during character processing:`, error)
      console.error(`❌ [${character.name}] Error stack:`, error.stack)
      
      // Just log the error and skip this tick - no fallback behavior
      console.log(`⏭️ [${character.name}] Skipping tick due to error`)
    }
  }

  async buildCharacterContext(character) {
    const currentTick = this.tickCount
    
    // TOKEN BUDGET CALCULATION
    // Reserve ~2k tokens for system prompt, ~2k for response, leaves ~36k for context
    const MAX_CONTEXT_TOKENS = 36000
    let estimatedTokens = 0
    
    // Token estimation function (rough: 4 chars = 1 token)
    const estimateTokens = (text) => Math.ceil((text?.length || 0) / 4)
    
    // Build context in priority order, checking tokens
    let context = {
      character: character,
      currentTick: currentTick
    }
    
    // 1. ESSENTIAL: Character basics (always include)
    const characterInfo = `${character.name} (${character.MBTI || 'Unknown'})`
    estimatedTokens += estimateTokens(characterInfo)
    
    // 2. ESSENTIAL: Environment information (always include)
    if (this.simulationStore?.environment) {
      const environment = this.simulationStore.environment
      const environmentDesc = this.simulationStore.getEnvironmentDescription?.() || 
        `${environment.season} ${environment.timeOfDay}, ${environment.weather} weather, ${Math.round(environment.temperature)}°C`
      
      context.environment = {
        weather: environment.weather,
        temperature: environment.temperature,
        season: environment.season,
        timeOfDay: environment.timeOfDay,
        description: environmentDesc
      }
      
      estimatedTokens += estimateTokens(environmentDesc)
      console.log(`🌤️ [${character.name}] Environment context: ${environmentDesc}`)
    }
    
    // 3. ESSENTIAL: Current location and emotion
    const currentZone = this.zonesStore?.zones?.find(z => z.id === character.currentZone)
    context.currentLocation = currentZone?.name || 'Unknown Location'
    estimatedTokens += estimateTokens(context.currentLocation)
    
    if (character.currentEmotion) {
      context.currentEmotion = character.currentEmotion
      estimatedTokens += estimateTokens(character.currentEmotion)
    }
    
    // 4. HIGH PRIORITY: Injection scenarios (always include if present)
    let injection = null
    try {
      injection = this.simulationStore?.getNextInjectionFor?.(character.id)
      if (injection) {
        context.injectedScenario = injection
        estimatedTokens += estimateTokens(injection.content)
        console.log(`🎬 [${character.name}] Processing injection: ${injection.content.substring(0, 50)}...`)
      }
    } catch (error) {
      console.warn(`⚠️ [${character.name}] Error getting injection:`, error)
    }
    
    // 5. MEMORIES: Include as many as token budget allows
    if (character.memories && character.memories.length > 0) {
      // Use memory summarization if we have many memories
      if (character.memories.length > 15) {
        try {
          const summary = await claudeApi.summarizeMemories(character.memories, character.name)
          if (summary) {
            const summaryTokens = estimateTokens(summary)
            if (estimatedTokens + summaryTokens < MAX_CONTEXT_TOKENS) {
              context.memorySummary = summary
              estimatedTokens += summaryTokens
            }
          }
        } catch (error) {
          console.warn(`⚠️ [${character.name}] Memory summarization failed:`, error)
        }
      }
      
      // Add individual recent/important memories if we have token budget
      if (!context.memorySummary || estimatedTokens < MAX_CONTEXT_TOKENS * 0.8) {
        const importantMemories = character.memories
          .sort((a, b) => {
            const emotionalWeight = (b.emotional_weight || 0) - (a.emotional_weight || 0)
            const recency = (b.timestamp || 0) - (a.timestamp || 0)
            return emotionalWeight * 0.7 + recency * 0.3
          })
          .slice(0, context.memorySummary ? 5 : 12) // Fewer if we have summary
        
        let memoryText = ''
        for (const memory of importantMemories) {
          const memoryLine = `${memory.content}\n`
          const memoryTokens = estimateTokens(memoryLine)
          
          if (estimatedTokens + memoryTokens < MAX_CONTEXT_TOKENS) {
            memoryText += memoryLine
            estimatedTokens += memoryTokens
          } else {
            break // Stop adding memories if we'd exceed token limit
          }
        }
        
        if (memoryText) {
          context.recentMemories = memoryText.trim()
        }
      }
    }
    
    // 6. NEARBY CHARACTERS: Include if token budget allows
    if (estimatedTokens < MAX_CONTEXT_TOKENS * 0.85) {
      const allCharacters = this.charactersStore?.charactersList || []
      const currentCharacterZone = character.currentZone || character.position?.zone
      
      console.log(`🔍 [${character.name}] Detecting nearby characters:`, {
        currentZone: currentCharacterZone,
        allCharactersCount: allCharacters.length,
        allCharacterZones: allCharacters.map(c => ({ name: c.name, zone: c.currentZone || c.position?.zone }))
      })
      
      const nearbyCharacters = allCharacters.filter(c => {
        if (!c || c.id === character.id) return false
        
        const otherCharacterZone = c.currentZone || c.position?.zone
        const inSameZone = otherCharacterZone === currentCharacterZone
        
        console.log(`  👥 [${c.name}] Zone: ${otherCharacterZone}, Same zone: ${inSameZone}`)
        return inSameZone
      }).slice(0, 3)
      
      console.log(`📍 [${character.name}] Found ${nearbyCharacters.length} nearby characters:`, 
        nearbyCharacters.map(c => c.name))
      
      if (nearbyCharacters.length > 0) {
        const nearbyText = nearbyCharacters.map(c => 
          `${c.name} (${c.currentEmotion || 'neutral'})`
        ).join(', ')
        
        const nearbyTokens = estimateTokens(nearbyText)
        if (estimatedTokens + nearbyTokens < MAX_CONTEXT_TOKENS) {
          // Store both the character objects (for processing) and text (for prompts)
          context.nearbyCharactersList = nearbyCharacters
          context.nearbyCharacters = nearbyText
          estimatedTokens += nearbyTokens
          
          console.log(`✅ [${character.name}] Added nearby characters to context: ${nearbyText}`)
        } else {
          console.log(`⚠️ [${character.name}] Skipped nearby characters - would exceed token limit`)
        }
      } else {
        console.log(`😔 [${character.name}] No nearby characters found`)
      }
    }
    
    // 7. RECENT EVENTS: Include if token budget allows
    if (estimatedTokens < MAX_CONTEXT_TOKENS * 0.9) {
      const recentEvents = this.simulationStore?.events
        ?.slice(-3)
        ?.map(event => event.summary || 'Unknown event')
        ?.join('; ') || ''
      
      if (recentEvents) {
        const eventsTokens = estimateTokens(recentEvents)
        if (estimatedTokens + eventsTokens < MAX_CONTEXT_TOKENS) {
          context.recentEvents = recentEvents
          estimatedTokens += eventsTokens
        }
      }
    }
    
    // 8. AVAILABLE ZONES: Include if we still have budget
    if (estimatedTokens < MAX_CONTEXT_TOKENS * 0.95) {
      const availableZones = this.zonesStore?.zones
        ?.slice(0, 8)
        ?.map(zone => zone.name)
        ?.join(', ') || ''
      
      if (availableZones) {
        const zonesTokens = estimateTokens(availableZones)
        if (estimatedTokens + zonesTokens < MAX_CONTEXT_TOKENS) {
          context.availableZones = availableZones
          estimatedTokens += zonesTokens
        }
      }
    }
    
    console.log(`📊 [${character.name}] Context tokens: ~${estimatedTokens}/${MAX_CONTEXT_TOKENS}`)
    
    return context
  }

  // Method to clean up duplicate memories for all characters
  cleanupDuplicateMemories() {
    if (!this.charactersStore?.characters) return
    
    let totalRemoved = 0
    let totalMemoriesAfter = 0
    // Characters are stored as an object with IDs as keys
    for (const [characterId, character] of Object.entries(this.charactersStore.characters)) {
      if (character.memories && character.memories.length > 0) {
        const originalCount = character.memories.length
        const managedMemories = this.manageCharacterMemories(character.memories)
        const removed = originalCount - managedMemories.length
        totalRemoved += removed
        totalMemoriesAfter += managedMemories.length
        
        if (removed > 0) {
          console.log(`🧹 [${character.name}] Memory optimization: ${originalCount} → ${managedMemories.length} memories (removed ${removed} duplicates/low-impact)`)
          // Update the character with managed memories
          this.charactersStore.updateCharacter(characterId, { memories: managedMemories })
        }
      }
    }
    
    if (totalRemoved > 0) {
      console.log(`🧹 Memory cleanup complete: Removed ${totalRemoved} memories, ${totalMemoriesAfter} high-quality memories retained`)
      console.log(`✨ Enhanced narrative quality: All remaining memories are unique, contextual, and AI-generated`)
    } else {
      console.log(`🧹 Memory system healthy: No cleanup needed, all memories are optimal`)
    }
  }

  // Enhanced memory management with sophisticated deduplication and size limits
  manageCharacterMemories(memories) {
    if (!memories || memories.length === 0) return []

    // Get memory settings from UI store
    const memorySettings = this.uiStore?.memorySettings || {
      maxMemories: 20,
      strategy: 'fifo',
      wipeInterval: 50,
      lastWipeTime: 0
    }

    // Step 1: Remove duplicates using multiple criteria
    const uniqueMemories = this.removeDuplicateMemoriesAdvanced(memories)
    
    // Step 2: Sort by importance (emotional weight and recency)
    const sortedMemories = uniqueMemories.sort((a, b) => {
      const weightA = (a.emotional_weight || 0) * 0.7 + (this.getMemoryRecencyScore(a) * 0.3)
      const weightB = (b.emotional_weight || 0) * 0.7 + (this.getMemoryRecencyScore(b) * 0.3)
      return weightB - weightA
    })

    // Step 3: Apply memory management strategy
    let finalMemories = sortedMemories
    
    if (memorySettings.strategy === 'periodic') {
      // Periodic strategy: check if it's time to wipe memories
      const currentTime = Date.now()
      const timeSinceWipe = currentTime - (memorySettings.lastWipeTime || 0)
      const wipeIntervalMs = memorySettings.wipeInterval * 3000 // convert ticks to milliseconds (3s per tick)
      
      if (timeSinceWipe >= wipeIntervalMs) {
        console.log(`🧹 Periodic memory wipe triggered (${memorySettings.wipeInterval} ticks elapsed)`)
        // Keep only the most important memories (25% of max)
        const keepCount = Math.max(1, Math.floor(memorySettings.maxMemories * 0.25))
        finalMemories = sortedMemories.slice(0, keepCount)
        
        // Update last wipe time
        if (this.uiStore?.updateLastWipeTime) {
          this.uiStore.updateLastWipeTime(currentTime)
        }
      } else {
        // Not time to wipe yet, just limit to max
        finalMemories = sortedMemories.slice(0, memorySettings.maxMemories)
      }
    } else {
      // FIFO strategy: limit total memories and remove oldest when exceeding limit
      finalMemories = sortedMemories.slice(0, memorySettings.maxMemories)
    }

    // Step 4: Ensure we keep a mix of high-impact and recent memories (only for FIFO)
    if (memorySettings.strategy === 'fifo') {
      finalMemories = this.balanceMemoryTypes(finalMemories, memorySettings.maxMemories)
    }

    return finalMemories
  }

  // Advanced duplicate detection using semantic similarity
  removeDuplicateMemoriesAdvanced(memories) {
    const unique = []
    
    for (const memory of memories) {
      const isDuplicate = unique.some(existingMemory => 
        this.areMemoriesSimilar(memory, existingMemory)
      )
      
      if (!isDuplicate) {
        unique.push(memory)
      }
    }
    
    return unique
  }

  // Check if two memories are similar enough to be considered duplicates
  areMemoriesSimilar(memory1, memory2) {
    if (!memory1.content || !memory2.content) return false

    // Exact content match
    if (memory1.content === memory2.content) return true

    // Similar timestamp (within 5 minutes) and similar content
    const timeDiff = Math.abs((memory1.timestamp || 0) - (memory2.timestamp || 0))
    if (timeDiff < 300000) { // 5 minutes
      const similarity = this.calculateTextSimilarity(memory1.content, memory2.content)
      if (similarity > 0.8) return true
    }

    // Check for repeated patterns (e.g., "I feel content" variations)
    if (this.areMemoryPatternsRepeated(memory1.content, memory2.content)) {
      return true
    }

    return false
  }

  // Calculate text similarity using word overlap
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))
    
    const intersection = new Set([...words1].filter(word => words2.has(word)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size
  }

  // Detect repeated patterns in memory content
  areMemoryPatternsRepeated(content1, content2) {
    // Check for repeated emotional statements
    const emotionalPatterns = [
      /I feel (content|peaceful|contemplative|happy|sad)/i,
      /I am (feeling|thinking about|reflecting on)/i,
      /The (atmosphere|day|moment) (feels|seems)/i
    ]

    for (const pattern of emotionalPatterns) {
      if (pattern.test(content1) && pattern.test(content2)) {
        // Both match the same emotional pattern - likely similar thoughts
        const similarity = this.calculateTextSimilarity(content1, content2)
        if (similarity > 0.5) return true
      }
    }

    return false
  }

  // Calculate recency score for memory sorting (0-1, higher = more recent)
  getMemoryRecencyScore(memory) {
    if (!memory.timestamp) return 0
    
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    const age = now - memory.timestamp
    
    return Math.max(0, 1 - (age / maxAge))
  }

  // Balance memory types to ensure narrative diversity
  balanceMemoryTypes(memories, maxMemories) {
    // Categorize memories by type and emotional weight
    const categories = {
      highImpact: memories.filter(m => (m.emotional_weight || 0) >= 70),
      mediumImpact: memories.filter(m => (m.emotional_weight || 0) >= 40 && (m.emotional_weight || 0) < 70),
      recentThoughts: memories.filter(m => this.getMemoryRecencyScore(m) > 0.8),
      conversations: memories.filter(m => m.tags?.includes('conversation')),
      actions: memories.filter(m => m.tags?.includes('action'))
    }

    // Ensure we have a good mix (at least some from each category if available)
    const balanced = []
    
    // Prioritize high-impact memories (40% of limit)
    const highImpactLimit = Math.floor(maxMemories * 0.4)
    balanced.push(...categories.highImpact.slice(0, highImpactLimit))
    
    // Add recent thoughts (25% of remaining slots)
    const recentNotInBalanced = categories.recentThoughts.filter(m => !balanced.includes(m))
    const recentLimit = Math.floor((maxMemories - balanced.length) * 0.25)
    balanced.push(...recentNotInBalanced.slice(0, recentLimit))
    
    // Add some medium-impact and conversation memories (fill remaining slots)
    const mediumNotInBalanced = categories.mediumImpact.filter(m => !balanced.includes(m))
    const mediumLimit = Math.floor((maxMemories - balanced.length) * 0.5)
    balanced.push(...mediumNotInBalanced.slice(0, mediumLimit))
    
    const conversationNotInBalanced = categories.conversations.filter(m => !balanced.includes(m))
    const conversationLimit = Math.floor((maxMemories - balanced.length) * 0.5)
    balanced.push(...conversationNotInBalanced.slice(0, conversationLimit))

    // Fill remaining slots with any other memories up to limit
    const remaining = memories.filter(m => !balanced.includes(m))
    const finalCount = Math.min(maxMemories, balanced.length + remaining.length)
    balanced.push(...remaining.slice(0, finalCount - balanced.length))

    return balanced.slice(0, maxMemories) // Final safety limit
  }

  removeDuplicateMemories(memories) {
    // Legacy method - now redirects to advanced version
    return this.removeDuplicateMemoriesAdvanced(memories)
  }

  async processClaudeResponse(character, response, context) {
    // Validate inputs
    if (!character || !response || !context) {
      console.error('❌ processClaudeResponse called with invalid parameters:', { character: !!character, response: !!response, context: !!context })
      return
    }

    // Update character emotion with null check
    if (response.emotion && character.id) {
      this.charactersStore.updateCharacterEmotion(character.id, response.emotion)
    }

    // Add memory of this thought with null checks (concise)
    if (response.internal_thoughts && character.id) {
      this.charactersStore.addMemory(character.id, {
        id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        content: response.internal_thoughts.substring(0, 120), // Reasonable limit
        emotional_weight: this.calculateEmotionalWeight(response.emotion || 'neutral'),
        tags: ['thought']
      })
      
      // Create a separate thought event for internal thoughts
      this.simulationStore.addEvent({
        type: 'thought',
        involvedCharacters: [character.id],
        summary: `${character.name} thinks: "${response.internal_thoughts.length > 50 ? response.internal_thoughts.substring(0, 50) + '...' : response.internal_thoughts}"`,
        tone: response.emotion || 'neutral',
        details: {
          character_name: character.name,
          internal_thoughts: response.internal_thoughts,
          emotion: response.emotion || 'neutral',
          action_context: response.action || 'idle',
          location: `${character.position.x}, ${character.position.y}`,
          zone: character.position.zone
        }
      })
    }

    // Process the action
    await this.processAction(character, response, context)

    // Create detailed simulation event (only if there's an actual action/dialogue)
    if (response.action && response.action !== 'stay_idle') {
      let eventSummary = ''
      let fullDialogue = response.dialogue || ''
      
      if (response.dialogue) {
        // Keep full dialogue for expansion, show preview in summary
        const dialoguePreview = response.dialogue.length > 50 ? 
          response.dialogue.substring(0, 50) + '...' : response.dialogue
        eventSummary = `${character.name}: "${dialoguePreview}"`
      } else {
        eventSummary = `${character.name} ${this.getActionDescription(response.action, response.emotion)}`
      }

      // Enhanced event details with more information for expansion
      let eventDetails = {
        action: response.action || 'idle',
        emotion: response.emotion || 'neutral',
        // Add full content for expansion
        full_dialogue: fullDialogue,
        internal_thoughts: response.internal_thoughts,
        action_reasoning: response.action_reasoning,
        character_name: character.name,
        location: `${character.position.x}, ${character.position.y}`,
        zone: character.position.zone
      }

      // Add injection info only if present
      if (context?.injectedScenario?.id) {
        eventDetails.injection_id = context.injectedScenario.id
        eventDetails.injection_prompt = context.injectedScenario.prompt
      }

      // Add nearby characters context if available
      if (context?.nearbyCharactersList && context.nearbyCharactersList.length > 0) {
        eventDetails.nearby_characters = context.nearbyCharactersList.map(c => c.name).join(', ')
      }

      // Add the event to simulation store with enhanced details
      if (this.simulationStore && typeof this.simulationStore.addEvent === 'function') {
        this.simulationStore.addEvent({
          type: response.dialogue ? 'conversation' : 'action',
          involvedCharacters: [character.id || 'unknown'],
          summary: eventSummary,
          tone: response.emotion || 'neutral',
          details: eventDetails
        })
      }
    }
  }

  async processAction(character, response, context) {
    switch (response.action) {
      case 'move_to_zone':
        await this.processMovement(character, response)
        break
        
      case 'approach_character':
        await this.processApproach(character, response, context)
        break
        
      case 'speak':
        await this.processSpeech(character, response, context)
        break
        
      case 'stay_idle':
        // Character stays in place, no additional action needed
        break
        
      default:
        console.warn(`Unknown action: ${response.action}`)
    }
  }

  async processMovement(character, response) {
    const zones = this.zonesStore?.zones || []
    let targetZone = null
    
    // Try to find zone mentioned in dialogue or action reasoning
    const searchText = `${response.dialogue || ''} ${response.action_reasoning || ''}`.toLowerCase()
    targetZone = zones.find(zone => searchText.includes(zone.name.toLowerCase()))
    
    if (!targetZone && zones.length > 0) {
      targetZone = zones[Math.floor(Math.random() * zones.length)]
    }
    
    let fromZone = character.position.zone
    let toZone = targetZone ? targetZone.id : fromZone
    let newX = character.position.x
    let newY = character.position.y
    
    if (targetZone && targetZone.tiles.length > 0) {
      const randomTile = targetZone.tiles[Math.floor(Math.random() * targetZone.tiles.length)]
      newX = randomTile.x
      newY = randomTile.y
      this.charactersStore.moveCharacter(character.id, {
        x: newX,
        y: newY,
        zone: toZone
      })
    }
    
    this.simulationStore.addEvent({
      type: 'movement',
      involvedCharacters: [character.id],
      summary: `${character.name} moved to ${targetZone?.name || 'a new location'}`,
      tone: response.emotion,
      details: {
        from: fromZone,
        to: toZone,
        reason: response.action_reasoning || `Decided to move to ${targetZone?.name || 'a different area'}`,
        // Enhanced details for expansion
        character_name: character.name,
        from_zone_name: this.zonesStore?.zones?.find(z => z.id === fromZone)?.name || 'unknown',
        to_zone_name: targetZone?.name || 'unknown',
        from_coordinates: `${character.position.x}, ${character.position.y}`,
        to_coordinates: `${newX}, ${newY}`,
        internal_thoughts: response.internal_thoughts,
        full_dialogue: response.dialogue,
        emotion: response.emotion || 'neutral'
      }
    })
  }

  async processApproach(character, response, context) {
    // Find target character to approach - use the character objects array
    const nearbyCharactersList = context.nearbyCharactersList || []
    const targetCharacter = nearbyCharactersList.find(char => 
      response.dialogue?.toLowerCase().includes(char.name.toLowerCase()) ||
      response.action_reasoning?.toLowerCase().includes(char.name.toLowerCase())
    )
    
    if (targetCharacter) {
      // Move closer to target character
      const midX = Math.floor((character.position.x + targetCharacter.position.x) / 2)
      const midY = Math.floor((character.position.y + targetCharacter.position.y) / 2)
      
      this.charactersStore.moveCharacter(character.id, {
        x: midX,
        y: midY,
        zone: character.position.zone
      })
      
      this.simulationStore.addEvent({
        type: 'movement',
        involvedCharacters: [character.id, targetCharacter.id],
        summary: `${character.name} approached ${targetCharacter.name}`,
        tone: response.emotion,
        details: {
          approachReason: response.action_reasoning || `Wanted to get closer to ${targetCharacter.name}`,
          // Enhanced details for expansion
          character_name: character.name,
          target_character: targetCharacter.name,
          from_coordinates: `${character.position.x}, ${character.position.y}`,
          to_coordinates: `${midX}, ${midY}`,
          distance_moved: Math.abs(character.position.x - midX) + Math.abs(character.position.y - midY),
          internal_thoughts: response.internal_thoughts,
          action_reasoning: response.action_reasoning,
          full_dialogue: response.dialogue,
          emotion: response.emotion || 'neutral'
        }
      })
    }
  }

  async processSpeech(character, response, context) {
    if (!response.dialogue) {
      console.log(`⚠️ [${character.name}] processSpeech called but no dialogue provided`)
      return
    }

    console.log(`💬 [${character.name}] Processing speech: "${response.dialogue.substring(0, 50)}${response.dialogue.length > 50 ? '...' : ''}"`)

    // Find conversation partners (nearby characters) - use the character objects array
    const nearbyCharactersList = context.nearbyCharactersList || []
    
    console.log(`👥 [${character.name}] Nearby characters for conversation:`, {
      nearbyCharacters: nearbyCharactersList.map(c => c.name),
      distances: nearbyCharactersList.map(c => ({
        name: c.name,
        distance: Math.abs(c.position.x - character.position.x) + Math.abs(c.position.y - character.position.y)
      }))
    })
    
    // Only include characters that are actually close (within 2 tiles)
    const actualConversationPartners = nearbyCharactersList.filter(char => {
      const distance = Math.abs(char.position.x - character.position.x) + Math.abs(char.position.y - character.position.y)
      return distance <= 2
    })
    
    const conversationPartnerIds = actualConversationPartners.map(char => char.id)
    
    console.log(`💬 [${character.name}] Actual conversation partners:`, {
      partners: actualConversationPartners.map(c => c.name),
      partnerIds: conversationPartnerIds,
      isMonologue: conversationPartnerIds.length === 0
    })
    
    let conversationId
    
    if (conversationPartnerIds.length > 0) {
      // Check for existing conversation with any of these participants
      const existingConversation = this.simulationStore.activeConversations.find((conv) =>
        conv.participants.includes(character.id) || 
        conv.participants.some((id) => conversationPartnerIds.includes(id))
      )
      
      if (existingConversation) {
        conversationId = existingConversation.id
        console.log(`🔄 [${character.name}] Joining existing conversation: ${conversationId}`)
        
        // Add any missing participants to the existing conversation
        const allParticipants = new Set([...existingConversation.participants, character.id, ...conversationPartnerIds])
        if (allParticipants.size > existingConversation.participants.length) {
          existingConversation.participants = Array.from(allParticipants)
          console.log(`👥 [${character.name}] Updated conversation participants:`, existingConversation.participants.map(id => this.charactersStore.getCharacter(id)?.name || id))
        }
      } else {
        // Create new conversation with only actual nearby participants
        const allParticipants = [character.id, ...conversationPartnerIds]
        conversationId = this.simulationStore.addConversation(allParticipants)
        console.log(`🆕 [${character.name}] Created new conversation: ${conversationId} with participants:`, allParticipants.map(id => this.charactersStore.getCharacter(id)?.name || id))
      }
    } else {
      // Monologue - speaking to themselves or no one in particular
      conversationId = this.simulationStore.addConversation([character.id])
      console.log(`🗣️ [${character.name}] Creating monologue conversation: ${conversationId}`)
    }

    // Add message to conversation
    console.log(`📨 [${character.name}] Adding message to conversation ${conversationId}`)
    this.simulationStore.addMessage(conversationId, {
      speakerId: character.id,
      content: response.dialogue,
      emotion: response.emotion
    })

    // Create conversation event with accurate participant list
    console.log(`📝 [${character.name}] Creating conversation event`)
    this.simulationStore.addEvent({
      type: 'conversation',
      involvedCharacters: [character.id, ...conversationPartnerIds],
      summary: `${character.name}: "${response.dialogue.substring(0, 50)}${response.dialogue.length > 50 ? '...' : ''}"`,
      tone: response.emotion,
      details: {
        conversationId,
        isMonologue: conversationPartnerIds.length === 0,
        participantCount: conversationPartnerIds.length + 1,
        // Enhanced details for expansion
        character_name: character.name,
        full_dialogue: response.dialogue,
        internal_thoughts: response.internal_thoughts,
        action_reasoning: response.action_reasoning,
        participants: actualConversationPartners.map(c => c.name).join(', '),
        location: `${character.position.x}, ${character.position.y}`,
        zone: character.position.zone,
        emotion: response.emotion || 'neutral'
      }
    })
    
    console.log(`✅ [${character.name}] Speech processing completed`)
  }

  calculateEmotionalWeight(emotion) {
    // Basic emotional intensity mapping
    const emotionWeights = {
      ecstatic: 95, joyful: 85, happy: 75, excited: 80,
      content: 60, peaceful: 60, calm: 55,
      neutral: 50,
      contemplative: 55, nostalgic: 65, melancholic: 40,
      sad: 30, lonely: 35, depressed: 20,
      anxious: 70, worried: 65, angry: 80, frustrated: 70
    }
    
    return emotionWeights[emotion.toLowerCase()] || 50
  }

  getActionDescription(action, emotion) {
    // More concise action descriptions
    const descriptions = {
      'move_to_zone': 'moved',
      'approach_character': 'approached someone',
      'speak': 'spoke',
      'stay_idle': 'stayed put'
    }
    
    const baseAction = descriptions[action] || 'acted'
    return `${baseAction} (${emotion})`
  }

  shouldCharacterAct(character) {
    // PRIORITY: Always process characters with pending injections
    let hasPendingInjection = false
    try {
      hasPendingInjection = this.simulationStore?.getNextInjectionFor?.(character.id) || false
    } catch (error) {
      console.warn(`⚠️ [${character.name}] Error checking for pending injection:`, error)
      hasPendingInjection = false
    }
    
    if (hasPendingInjection) {
      console.log(`🚨 [${character.name}] Has pending injection - forcing processing`)
      return true
    }

    // Personality-based probability with more meaningful factors
    let probability = 0.35 // Base probability (increased from 0.25)
    
    // Personality influences
    if (character.bigFive) {
      probability += (character.bigFive.extraversion || 50) / 500 // Max +20%
      probability += (character.bigFive.openness || 50) / 500     // Max +20%
      probability += (character.bigFive.neuroticism || 50) / 1000 // Max +10%
    }
    
    // Current emotion influences
    const emotionMultipliers = {
      'excited': 1.8,
      'angry': 1.6,
      'anxious': 1.4,
      'happy': 1.3,
      'sad': 0.7,
      'content': 1.0,
      'melancholic': 0.8
    }
    
    const emotionMultiplier = emotionMultipliers[character.currentEmotion] || 1.0
    probability *= emotionMultiplier
    
    // Reduce activity if character just acted (prevents spam)
    const lastEventTime = character.lastActionTime || 0
    const timeSinceLastAction = Date.now() - lastEventTime
    if (timeSinceLastAction < 30000) { // Less than 30 seconds ago
      probability *= 0.4 // Significantly reduce probability
    }
    
    // Cap maximum probability
    const finalProbability = Math.min(probability, 0.7)
    const willAct = Math.random() < finalProbability
    
    if (willAct) {
      // Update last action time to prevent immediate re-activation
      character.lastActionTime = Date.now()
    }
    
    return willAct
  }

  // Public getters
  get running() {
    return this.isRunning
  }

  get currentTick() {
    return this.tickCount
  }

  async testClaudeConnection() {
    // Sync API key from UI store to Claude API service
    if (this.uiStore?.claudeApiKey && !claudeApi.getApiKey()) {
      console.log(`🔑 Setting Claude API key from UI store for connection test`)
      claudeApi.setApiKey(this.uiStore.claudeApiKey)
    }
    
    if (claudeApi.getApiKey()) {
      console.log('🔍 Testing Claude API connection...')
      const isConnected = await claudeApi.testConnection()
      if (isConnected) {
        console.log('✅ Claude API connection successful')
        return true
      } else {
        console.warn('❌ Claude API connection failed - characters will not generate AI conversations')
        return false
      }
    } else {
      console.warn('⚠️ No Claude API key available - characters will not generate AI conversations')
      return false
    }
  }

  checkPeriodicMemoryWipe() {
    const memorySettings = this.uiStore?.memorySettings
    if (!memorySettings || memorySettings.strategy !== 'periodic') return

    const currentTime = Date.now()
    const timeSinceWipe = currentTime - (memorySettings.lastWipeTime || 0)
    const wipeIntervalMs = memorySettings.wipeInterval * 3000 // convert ticks to milliseconds

    if (timeSinceWipe >= wipeIntervalMs) {
      console.log(`🧹 Global periodic memory wipe triggered`)
      
      // Trigger memory cleanup for all characters
      this.cleanupDuplicateMemories()
      
      // Update last wipe time
      if (this.uiStore?.updateLastWipeTime) {
        this.uiStore.updateLastWipeTime(currentTime)
      }
    }
  }

  cleanupConversations() {
    if (!this.simulationStore?.activeConversations) return
    
    const conversationsToEnd = []
    
    this.simulationStore.activeConversations.forEach(conversation => {
      // Check if all participants are still nearby each other
      const participants = conversation.participants
        .map(id => this.charactersStore?.charactersList?.find(c => c.id === id))
        .filter(char => char !== undefined)
      
      if (participants.length < 2) {
        // Conversation has less than 2 valid participants
        conversationsToEnd.push(conversation.id)
        console.log(`💬 Ending conversation ${conversation.id} - insufficient participants`)
        return
      }
      
      // Check if any participants are too far apart (more than 3 tiles)
      let shouldEndConversation = false
      for (let i = 0; i < participants.length - 1; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          const char1 = participants[i]
          const char2 = participants[j]
          
          const distance = Math.abs(char1.position.x - char2.position.x) + 
                          Math.abs(char1.position.y - char2.position.y)
          
          if (distance > 3) {
            shouldEndConversation = true
            console.log(`💬 Ending conversation ${conversation.id} - ${char1.name} and ${char2.name} are ${distance} tiles apart`)
            break
          }
        }
        if (shouldEndConversation) break
      }
      
      if (shouldEndConversation) {
        conversationsToEnd.push(conversation.id)
      }
      
      // Also end conversations that have been inactive for too long (no messages in last 10 ticks)
      const timeSinceLastMessage = Date.now() - (conversation.messages[conversation.messages.length - 1]?.timestamp || conversation.startTime)
      const inactiveTimeLimit = 30000 // 30 seconds
      
      if (timeSinceLastMessage > inactiveTimeLimit) {
        conversationsToEnd.push(conversation.id)
        console.log(`💬 Ending conversation ${conversation.id} - inactive for ${Math.round(timeSinceLastMessage/1000)}s`)
      }
    })
    
    // End the conversations that need to be ended
    conversationsToEnd.forEach(conversationId => {
      this.simulationStore.endConversation(conversationId)
    })
    
    if (conversationsToEnd.length > 0) {
      console.log(`💬 Ended ${conversationsToEnd.length} conversations due to distance/inactivity`)
    }
  }
}

// Export singleton instance
export const simulationEngine = new SimulationEngine() 