import { reactive } from 'vue'
import { useCharactersStore } from '../stores/characters.js'
import { useSimulationStore } from '../stores/simulation.js'
import { useZonesStore } from '../stores/zones.js'
import { callClaude } from './claudeApi.js'
import { getSettings } from '../utils/settings.js'

// Comprehensive simulation engine with full functionality restored
class ComprehensiveSimulationEngine {
  constructor() {
    this.state = reactive({
      isRunning: false,
      currentTick: 0,
      lastActionTime: {},
      activeConversations: new Set(),
      tokenUsage: {
        haiku: { input: 0, output: 0, calls: 0 },
        sonnet: { input: 0, output: 0, calls: 0 },
        estimatedCost: { haiku: 0, sonnet: 0, total: 0 }
      },
      // Restored state tracking
      characterActionsThisTick: new Map(),
      conversationCooldowns: new Map(),
      lastSpeechTime: new Map(),
      pendingMovements: new Map(),
      lastUpdateTime: Date.now(),
      environmentUpdateInterval: 30000, // 30 seconds
      lastEnvironmentUpdate: Date.now(),
      characterCooldowns: new Map() // Tracks cooldowns for characters after API errors
    })
    this.tickInterval = null
    this.stores = null
    this.running = false
  }

  async initialize() {
    try {
      this.stores = {
        characters: useCharactersStore(),
        simulation: useSimulationStore(),
        zones: useZonesStore()
      }
      console.log('🎮 Simulation engine initialized with stores')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize simulation engine:', error)
      return false
    }
  }

  async start() {
    if (this.state.isRunning) {
      console.log('⚠️ Simulation already running')
      return
    }
    if (!this.stores) {
      const success = await this.initialize()
      if (!success) {
        throw new Error('Failed to initialize simulation engine')
      }
    }
    try {
      this.state.isRunning = true
      // Also update store state if not already running
      if (!this.stores.simulation.state.isRunning) {
        this.stores.simulation.startSimulation()
      }
      this.running = true
      console.log('🚀 Starting comprehensive simulation engine...')
      
      // Clean up any duplicate memories on startup
      this.cleanupDuplicateMemories()
      
      // Start main simulation loop
      const settings = getSettings(this.stores)
      const tickSpeedInSeconds = this.stores.simulation.state.timeSpeed || 5 // 5 second default - controlled by UI slider
      const tickSpeedInMs = tickSpeedInSeconds * 1000 // Convert seconds to milliseconds
      
      this.tickInterval = setInterval(() => this.processTick(), tickSpeedInMs)
      this.processTick() // Initial tick
      
      // Update simulation store
      this.stores.simulation.startSimulation()
      
      console.log(`✅ Simulation engine started with ${tickSpeedInSeconds}s tick rate (${tickSpeedInMs}ms interval)`)
      
    } catch (error) {
      console.error('❌ Failed to start simulation:', error)
      this.state.isRunning = false
      this.running = false
      throw error
    }
  }

  stop() {
    this.state.isRunning = false
    // Also update store state if not already stopped
    if (this.stores?.simulation?.state.isRunning) {
      this.stores.simulation.stopSimulation()
    }
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
    console.log('⏹️ Simulation engine stopped')
  }

  async processTick() {
    // Sync isRunning state from store at each tick
    this.state.isRunning = this.stores.simulation.state.isRunning
    if (!this.state.isRunning || !this.stores) {
      return
    }
    this.state.currentTick++
    this.state.lastUpdateTime = Date.now()
    console.log(`[TICK] Processing tick ${this.state.currentTick}`)

    try {
      this.state.characterActionsThisTick.clear();
      
      // Get alive characters
      const characters = this.stores.characters.charactersList.filter(char => !char.isDead)
      
      if (characters.length === 0) {
        console.warn('📭 No characters available for actions')
        return
      }

      console.log(`👥 Processing ${characters.length} characters for potential actions...`)

      // Filter characters that should act this tick
      const activeCharacters = characters.filter(character => this.shouldCharacterAct(character))
      .filter(character => {
        const cooldown = this.state.characterCooldowns.get(character.id);
        if (cooldown && cooldown > this.state.currentTick) {
          return false;
        }
        return true;
      });
      
      console.log(`🎭 ${activeCharacters.length} characters selected for actions this tick`)
      
      if (activeCharacters.length === 0) {
        return
      }

      // Stage 1: Generate all character actions for the current tick
      const characterActions = [];
      for (const character of activeCharacters) {
        try {
          const context = await this.buildCharacterContext(character);
          const action = await this.getCharacterAction(character, context);
          if (action) {
            characterActions.push({ character, action, context });
          }
        } catch (error) {
          console.error(`❌ Error generating action for ${character.name}:`, error);
        }
      }

      // Stage 2: Execute all generated actions
      for (const { character, action, context } of characterActions) {
        try {
          await this.executeCharacterAction(character, action, context);
        } catch (error) {
          console.error(`❌ Error executing action for ${character.name}:`, error);
        }
      }

      // Clean up memories periodically (every 10 ticks)
      if (this.state.currentTick % 10 === 0) {
        this.cleanupDuplicateMemories()
        this.manageCharacterMemories()
      }

      // Cleanup conversations every tick to ensure timely updates
      this.cleanupConversations()

      // Check for periodic memory wipe (every 100 ticks)
      if (this.state.currentTick % 100 === 0) {
        this.checkPeriodicMemoryWipe()
      }

      // Automatically consolidate memories if enabled
      if (this.state.currentTick > 0 && this.state.currentTick % 50 === 0) {
        const settings = getSettings(this.stores);
        if (settings.enableGlobalMemoryManagement) {
          console.log('🧠 Triggering global automatic memory consolidation...');
          for (const character of this.stores.characters.charactersList) {
            if (!character.isDead) {
              await this.consolidateMemoriesForCharacter(character.id);
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Critical error in simulation tick:', error)
    }
  }

  // RESTORED: Sophisticated character action probability calculation
  shouldCharacterAct(character) {
    if (typeof window !== 'undefined' && window.HEADLESS_TEST) {
      return true
    }
    const settings = getSettings(this.stores)
    let probability = 0.30 // Default 30%
    try {
      if (typeof window !== 'undefined' && window.meadowLoopSettings?.conversationSettings) {
        let conversationSettings = window.meadowLoopSettings.conversationSettings
        if (conversationSettings?.baseProbability) {
          probability = conversationSettings.baseProbability / 100
        } else if (conversationSettings?.frequency) {
          probability = Math.max(0.05, Math.min(0.5, conversationSettings.frequency * 0.05))
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not read conversation probability from UI:', e)
    }

    // Personality influences from Big Five traits
    if (character.bigFive) {
      probability += (character.bigFive.extraversion || 50) / 500
      probability += (character.bigFive.openness || 50) / 500
      probability += (character.bigFive.neuroticism || 50) / 1000
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
    
    // Enhanced probability for characters with nearby others
    const nearbyCharacters = this.findNearbyCharacters(character)
    if (nearbyCharacters.length > 0) {
      probability *= 1.4
    }
    
    const timeSinceLastAction = Date.now() - (this.state.lastActionTime[character.id] || 0)
    if (timeSinceLastAction < 20000) {
      probability *= 0.6
    }
    
    const finalProbability = Math.min(probability, 0.8)
    const willAct = Math.random() < finalProbability
    
    if (willAct) {
      this.state.lastActionTime[character.id] = Date.now()
    }
    
    return willAct
  }

  async processCharacterAction(character) {
    if (this.state.characterActionsThisTick.has(character.id)) return
    try {
      this.state.characterActionsThisTick.set(character.id, true)
      this.state.lastActionTime[character.id] = Date.now()
      console.log(`🎭 Processing action for ${character.name}`)
      const context = await this.buildCharacterContext(character)
      if (!context || typeof context !== 'object') {
        console.error(`❌ [${character.name}] Failed to build valid context:`, context)
        return
      }
      const action = await this.getCharacterAction(character, context)
      if (action) {
        await this.executeCharacterAction(character, action, context)
      } else {
        console.warn(`[PROCESS] No action generated for ${character.name}`)
      }
    } catch (error) {
      console.error(`❌ Error processing character action for ${character.name}:`, error)
      if (error.message.includes('529')) {
        const cooldownTicks = 5; // Cooldown for 5 ticks
        const cooldownUntil = this.state.currentTick + cooldownTicks;
        this.state.characterCooldowns.set(character.id, cooldownUntil);
        console.warn(`RATE-LIMIT: Imposing a ${cooldownTicks}-tick cooldown on ${character.name} due to API overload.`);
      }
    }
  }

  // RESTORED: Sophisticated context building from original
  async buildCharacterContext(character) {
    const nearbyCharacters = this.findNearbyCharacters(character)
    
    // Find ongoing conversation if any
    const ongoingConversation = this.stores.simulation.conversations.find(conv => 
      conv.participants.includes(character.id) && 
      Date.now() - new Date(conv.lastMessageAt || conv.startTime).getTime() < 300000 // 5 minutes
    )

    // Check for pending injections
    const pendingInjections = this.stores.simulation.pendingInjections || []
    const injection = pendingInjections.find(inj => 
      !inj.processed && (inj.target === 'global' || inj.target === character.id)
    )

    // Build recent events context
    const recentEvents = this.stores.simulation.events
      .filter(event => Date.now() - new Date(event.timestamp).getTime() < 3600000) // Last hour
      .slice(-5)
      .map(event => event.description || event.summary)

    // Build comprehensive context object
    const context = {
      character: character,
      nearbyCharacters: nearbyCharacters,
      currentLocation: this.getCharacterLocationName(character),
      environment: this.stores.simulation.getEnvironmentDescription(),
      recentEvents: recentEvents,
      memorySummary: await this.getMemorySummary(character)
    }

    // Add conversation response priority if someone nearby spoke recently
    if (nearbyCharacters.length > 0) {
      const recentSpeaker = nearbyCharacters.find(nc => {
        const lastSpeech = this.state.lastSpeechTime.get(nc.id)
        return lastSpeech && Date.now() - lastSpeech < 30000 // 30 seconds
      })
      
      if (recentSpeaker) {
        context.conversationResponsePriority = `CONVERSATION PRIORITY: ${recentSpeaker.name} spoke recently nearby. You should strongly consider responding to them or acknowledging what they said.`
      }
    }

    // Add ongoing conversation context
    if (ongoingConversation) {
      const recentMessages = ongoingConversation.messages.slice(-4)
      context.ongoingConversation = `ONGOING CONVERSATION:\n${recentMessages.map(msg => `${this.stores.characters.getCharacter(msg.speakerId)?.name || 'Someone'}: ${msg.content}`).join('\n')}`
    }

    let dynamicPrompt = '';
    // Add scenario injection if present
    if (context.injectedScenario) {
      dynamicPrompt += `\n\n🎬 SCENARIO EVENT: ${context.injectedScenario.content}`
      
      dynamicPrompt += `\n\nRespond authentically as ${character.name} to this scenario. Show realistic emotional reactions and make decisions that reflect your personality.`
    }

    // Add recent events - FIXED: Handle both array and string formats
    if (context.recentEvents) {
      dynamicPrompt += `\n\nRECENT EVENTS:\n${context.recentEvents.join('\n')}`
    }

    // Add available zones for movement
    const walkableZones = this.stores.zones.zones.filter(zone => 
      zone.walkable !== false && !['wall', 'building', 'obstacle', 'solid'].includes(zone.type)
    )
    context.availableZones = walkableZones.map(zone => zone.name || zone.type).join(', ')

    return context
  }

  async getCharacterAction(character, context) {
    // Restore natural AI-driven action selection
    const settings = getSettings(this.stores)
    try {
      const claudeApiModule = await import('./claudeApi.js')
      const claudeService = claudeApiModule.default
      const useComplexModel = settings.simulationModel === 'sonnet' || 
        (settings.simulationModel === 'adaptive' && Math.random() < 0.2)
      
      const action = await claudeService.getCharacterAction(context, useComplexModel)
      
      if (action) {
        return action
      } else {
        return null // No action on error
      }
    } catch (error) {
      console.error(`❌ Error getting action for ${character.name}:`, error)
      return null // No action on error
    }
  }

  async executeCharacterAction(character, action, context) {
    console.log(`[EXECUTE] ${character.name}: action=${action.action} dialogue=${action.dialogue}`)
    
    // Always create a thought event for the character's internal monologue
    if (action.internal_thoughts) {
      this.stores.simulation.addEvent({
        type: 'thought',
        summary: `${character.name} thinks: "${action.internal_thoughts}"`,
        details: {
          character: character.name,
          characterId: character.id,
          thought: action.internal_thoughts,
          reasoning: action.action_reasoning,
          location: this.getCharacterLocationName(character)
        },
        involvedCharacters: [character.id],
        location: this.getCharacterLocationName(character),
        tone: action.emotion || 'neutral'
      });
    }

    if (!action || !action.action) {
      console.warn(`[EXECUTE] Aborting: no action for ${character.name}`)
      return
    }
    switch (action.action) {
      case 'speak':
        await this.processSpeech(character, action.dialogue, action.action_reasoning)
        break
      case 'approach_character':
        await this.handleApproachCharacter(character, action)
        break
      case 'move_to_zone':
        await this.handleMoveToZone(character, action)
        break
      case 'stay_idle':
        await this.handleStayIdle(character, action)
        break
      default:
        console.log(`📝 ${character.name}: ${action.internal_thoughts}`)
        break
    }

    // Update character emotion and add memory
    if (action.emotion && action.emotion !== character.currentEmotion) {
      this.stores.characters.updateCharacterEmotion(character.id, action.emotion)
    }

    if (action.internal_thoughts) {
      this.addMemoryToCharacter(character, `I was thinking: ${action.internal_thoughts}`, 3)
    }
    
    // Process injection if there was one
    if (context && context.injectedScenario && typeof context.injectedScenario === 'object' && context.injectedScenario.id) {
      const injection = context.injectedScenario
      if (injection.target === 'global') {
        // For global injections, track which characters have processed it
        if (!injection.processedBy) {
          injection.processedBy = []
        }
        if (!injection.processedBy.includes(character.id)) {
          injection.processedBy.push(character.id)
        }
        
        // Check if all characters have processed this injection
        const totalCharacters = this.stores.characters.charactersList.filter(c => !c.isDead).length
        if (injection.processedBy.length >= totalCharacters) {
          this.stores.simulation.markInjectionProcessed(injection.id)
        }
      } else {
        // Single character injection
        this.stores.simulation.markInjectionProcessed(injection.id)
      }
    }
  }

  async processSpeech(character, dialogue, reasoning) {
    if (!dialogue || dialogue.trim() === '') {
      console.warn(`💬 [${character.name}] Tried to speak but dialogue was empty`)
      return
    }

    console.log(`💬 ${character.name}: "${dialogue}"`)
    this.state.lastSpeechTime.set(character.id, Date.now())
    const nearbyCharacters = this.findNearbyCharacters(character)
    let conversationId = null

    // Find an active, relevant conversation to continue
    if (nearbyCharacters.length > 0) {
      const existingConversation = this.stores.simulation.conversations.find(conv => 
        conv.isActive &&
        [character.id, ...nearbyCharacters.map(nc => nc.id)].some(id => conv.participants.includes(id)) &&
        (Date.now() - (conv.lastMessageAt || conv.startTime) < 120000) // 2-minute activity window
      );

      if (existingConversation) {
        conversationId = existingConversation.id;
        // Add any new nearby characters to the conversation
        const newParticipants = nearbyCharacters.filter(nc => !existingConversation.participants.includes(nc.id));
        if (newParticipants.length > 0) {
          this.stores.simulation.addParticipants(conversationId, newParticipants.map(nc => nc.id));
        }
      } else {
        // If no suitable conversation, start a new one with all nearby characters
        const participants = [character.id, ...nearbyCharacters.map(nc => nc.id)];
        conversationId = this.stores.simulation.addConversation(participants);
      }
    } else {
      // Handle monologues: create a temporary, single-person conversation
      conversationId = this.stores.simulation.addConversation([character.id]);
    }

    // Always log a conversation event, even if conversationId is null
    this.stores.simulation.addEvent({
      type: 'conversation',
      summary: `${character.name} said: "${dialogue}"`,
      details: {
        speaker: character.name,
        speakerId: character.id,
        dialogue: dialogue,
        nearbyCharacters: nearbyCharacters.map(nc => nc.name),
        location: this.getCharacterLocationName(character),
        reasoning: reasoning
      },
      involvedCharacters: [character.id, ...nearbyCharacters.map(nc => nc.id)],
      location: this.getCharacterLocationName(character),
      tone: character.currentEmotion || 'neutral'
    })
    if (conversationId) {
      this.stores.simulation.addMessage(conversationId, {
        speakerId: character.id,
        content: dialogue,
        emotion: character.currentEmotion || 'neutral',
        action: reasoning || ''
      })
    }
    this.addMemoryToCharacter(character, `I said: "${dialogue}"`, 4)
    nearbyCharacters.forEach(nearby => {
      this.addMemoryToCharacter(nearby, `${character.name} said: "${dialogue}"`, 5)
      // Update affinity based on conversation
      this.updateRelationshipAffinity(character.id, nearby.id, this.getAffinityDelta(action.emotion));
    })
  }

  async handleApproachCharacter(character, action) {
    let target = null;
    if (action.targetCharacterName) {
      target = this.stores.characters.charactersList.find(c => c.name === action.targetCharacterName && c.id !== character.id && !c.isDead);
    }
    
    // If no specific target from AI, or target not found, find a random nearby character
    if (!target) {
      const nearbyCharacters = this.findNearbyCharacters(character, 8); // Wider search
      if (nearbyCharacters.length === 0) return; // No one to approach
      target = nearbyCharacters[Math.floor(Math.random() * nearbyCharacters.length)];
    }

    if (!target) return; // Still no target, abort

    // Update affinity since an approach is a positive social action
    this.updateRelationshipAffinity(character.id, target.id, 5);

    // Use zone pathfinding for movement
    const newPosition = this.stores.zones.getValidMovePosition(
      character.position.x, 
      character.position.y, 
      target.position.x, 
      target.position.y, 
      7 // max distance per tick
    )
    
    if (newPosition && (newPosition.x !== character.position.x || newPosition.y !== character.position.y)) {
      this.moveCharacterToPosition(character, newPosition)
    }
  }

  async handleMoveToZone(character, action) {
    if (!action.targetX || !action.targetY) {
      return
    }
    const newPosition = this.stores.zones.getValidMovePosition(
      character.position.x, 
      character.position.y, 
      action.targetX,
      action.targetY,
      7
    )
    if (newPosition && (newPosition.x !== character.position.x || newPosition.y !== character.position.y)) {
      this.moveCharacterToPosition(character, newPosition, action.targetZone || 'Unknown')
    }
  }

  async handleStayIdle(character, action) {
    this.addMemoryToCharacter(character, action.action_reasoning || 'I decided to stay where I am', 2)
  }

  // Character movement functions
  moveCharacterToPosition(character, newPosition, zoneName = null) {
    const oldPosition = { ...character.position }
    this.stores.characters.moveCharacter(character.id, {
      x: newPosition.x,
      y: newPosition.y,
      zone: zoneName || character.position.zone
    })
    const updated = this.stores.characters.getCharacter(character.id)
    this.stores.simulation.addEvent({
      type: 'movement',
      summary: `${character.name} moved from (${oldPosition.x},${oldPosition.y}) to (${newPosition.x},${newPosition.y})`,
      details: {
        character: character.name,
        characterId: character.id,
        fromPosition: oldPosition,
        toPosition: newPosition,
        zone: zoneName || character.position.zone
      },
      involvedCharacters: [character.id],
      location: zoneName || this.getCharacterLocationName(character),
      tone: 'neutral'
    })
  }

  findNearbyCharacters(character, maxDistance = 3) {
    return this.stores.characters.charactersList.filter(other => {
      if (other.id === character.id || other.isDead) return false
      const distance = Math.abs(other.position.x - character.position.x) + Math.abs(other.position.y - character.position.y)
      return distance <= maxDistance
    })
  }

  getCharacterLocationName(character) {
    // Find zone at character's position
    const zone = this.stores.zones.zones.find(zone =>
      zone.tiles && zone.tiles.some(tile => tile.x === character.position.x && tile.y === character.position.y)
    )
    
    return zone ? (zone.name || zone.type) : `(${character.position.x}, ${character.position.y})`
  }

  addMemoryToCharacter(character, content, importance = 5) {
    const memory = {
      id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      timestamp: Date.now(),
      importance,
      emotional_weight: importance * 10, // Convert to 0-100 scale
      tags: ['simulation']
    }

    this.stores.characters.addMemory(character.id, memory)
  }

  // RESTORED: Sophisticated memory management from original
  cleanupDuplicateMemories() {
    const characters = this.stores.characters.charactersList
    
    characters.forEach(character => {
      if (!character.memories || character.memories.length <= 1) return
      
      const uniqueMemories = []
      const seenContent = new Set()
      
      // Keep memories in reverse chronological order (newest first)
      const sortedMemories = [...character.memories].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      
      sortedMemories.forEach(memory => {
        const content = memory.content?.toLowerCase().trim()
        if (content && !seenContent.has(content)) {
          seenContent.add(content)
          uniqueMemories.push(memory)
        }
      })
      
      if (uniqueMemories.length !== character.memories.length) {
        console.log(`🧹 [${character.name}] Removed ${character.memories.length - uniqueMemories.length} duplicate memories`)
        character.memories = uniqueMemories.reverse() // Back to chronological order
        this.stores.characters.updateCharacter(character.id, { memories: character.memories })
      }
    })
  }

  // RESTORED: Character memory management from original
  manageCharacterMemories(memories) {
    if (!memories || memories.length === 0) return []
    
    // Get UI memory settings
    const ui = this.stores.ui || (typeof useUIStore === 'function' ? useUIStore() : null)
    const maxMemories = ui?.memorySettings?.maxMemories || 50
    
    if (memories.length <= maxMemories) return memories
    
    // Sort by emotional weight and timestamp
    const sortedMemories = [...memories].sort((a, b) => {
      const weightDiff = (b.emotional_weight || 0) - (a.emotional_weight || 0)
      if (weightDiff !== 0) return weightDiff
      return (b.timestamp || 0) - (a.timestamp || 0)
    })
    
    // Keep the most important memories up to the limit
    return sortedMemories.slice(0, maxMemories)
  }

  // RESTORED: Periodic memory wipe functionality from original
  checkPeriodicMemoryWipe() {
    const ui = this.stores.ui || (typeof useUIStore === 'function' ? useUIStore() : null)
    const memorySettings = ui?.memorySettings
    
    if (!memorySettings || memorySettings.strategy !== 'periodic') return
    
    const currentTime = Date.now()
    const timeSinceWipe = currentTime - (memorySettings.lastWipeTime || 0)
    const wipeIntervalMs = memorySettings.wipeInterval * 5000 // Convert ticks to milliseconds (assuming 5s ticks)
    
    if (timeSinceWipe >= wipeIntervalMs) {
      console.log(`🧹 Global periodic memory wipe triggered`)
      
      // Trigger memory cleanup for all characters
      this.cleanupDuplicateMemories()
      
      // Update last wipe time
      if (ui?.updateLastWipeTime) {
        ui.updateLastWipeTime(currentTime)
      }
    }
  }

  // RESTORED: Sophisticated conversation cleanup from original
  cleanupConversations() {
    if (!this.stores.simulation?.activeConversations) return;

    const conversationsToEnd = new Set();
    const now = Date.now();

    this.stores.simulation.activeConversations.forEach(conversation => {
      // Rule 1: End monologue after 30 seconds
      if (conversation.participants.length === 1) {
        if (now - (conversation.lastMessageAt || conversation.startTime) > 30000) {
          conversationsToEnd.add(conversation.id);
          return;
        }
      }

      // Rule 2: End conversation if participants are too far apart
      const participants = conversation.participants
        .map(id => this.stores.characters?.charactersList?.find(c => c.id === id))
        .filter(char => char && !char.isDead);

      if (participants.length < 2 && conversation.participants.length > 1) {
        conversationsToEnd.add(conversation.id);
        return;
      }

      let areParticipantsNearby = true;
      if (participants.length > 1) {
        for (let i = 0; i < participants.length - 1; i++) {
          for (let j = i + 1; j < participants.length; j++) {
            const char1 = participants[i];
            const char2 = participants[j];
            const distance = Math.abs(char1.position.x - char2.position.x) + Math.abs(char1.position.y - char2.position.y);
            if (distance > 5) { // Increased distance threshold
              areParticipantsNearby = false;
              break;
            }
          }
          if (!areParticipantsNearby) break;
        }
      }

      if (!areParticipantsNearby) {
        conversationsToEnd.add(conversation.id);
        return;
      }
      
      // Rule 3: End conversation after 2 minutes of inactivity
      if (now - (conversation.lastMessageAt || conversation.startTime) > 120000) {
        conversationsToEnd.add(conversation.id);
      }
    });

    // End all conversations marked for cleanup
    if (conversationsToEnd.size > 0) {
      conversationsToEnd.forEach(id => this.stores.simulation.endConversation(id));
      console.log(`🧹 Ended ${conversationsToEnd.size} conversations.`);
    }
  }

  // Environment and scenario processing
  updateEnvironment() {
    const now = Date.now()
    if (now - this.state.lastEnvironmentUpdate > this.state.environmentUpdateInterval) {
      this.stores.simulation.updateEnvironment()
      this.state.lastEnvironmentUpdate = now
    }
  }

  async processInjectedScenarios() {
    // Process pending injections using simulation store
    const pendingInjections = this.stores.simulation.pendingInjections
    
    for (const injection of pendingInjections) {
      if (!injection.processed) {
        // Add scenario event
        this.stores.simulation.addEvent({
          type: 'injection',
          summary: `Scenario: ${injection.content}`,
          details: {
            injection_id: injection.id,
            injection_content: injection.content,
            injection_target: injection.target,
            is_scenario_event: true
          },
          involvedCharacters: injection.target === 'global' 
            ? this.stores.characters.charactersList.filter(c => !c.isDead).map(c => c.id)
            : [injection.target],
          location: 'Global',
          tone: 'dramatic'
        })

        console.log(`💫 Processed injection: ${injection.content}`)
      }
    }
  }

  processPendingMovements() {
    // Process any pending character movements
    this.state.pendingMovements.forEach((movement, characterId) => {
      const character = this.stores.characters.getCharacter(characterId)
      if (character && !character.isDead) {
        this.moveCharacterToPosition(character, movement.target, movement.zone)
      }
      this.state.pendingMovements.delete(characterId)
    })
  }

  cleanupOldData() {
    // Clean up old conversations and events periodically
    if (this.state.currentTick % 100 === 0) { // Every 100 ticks
      this.stores.simulation.cleanupOldConversations()
      
      // Clean up very old events (keep last 500)
      const events = this.stores.simulation.events
      if (events.length > 500) {
        events.splice(0, events.length - 500)
      }
    }
  }

  // RESTORED: Token usage and cost management from original
  updateCostEstimate() {
    const costs = {
      haiku: { input: 0.25, output: 1.25 }, // per million tokens
      sonnet: { input: 3.0, output: 15.0 }
    }

    this.state.tokenUsage.estimatedCost.haiku = 
      (this.state.tokenUsage.haiku.input * costs.haiku.input + 
       this.state.tokenUsage.haiku.output * costs.haiku.output) / 1000000

    this.state.tokenUsage.estimatedCost.sonnet = 
      (this.state.tokenUsage.sonnet.input * costs.sonnet.input + 
       this.state.tokenUsage.sonnet.output * costs.sonnet.output) / 1000000

    this.state.tokenUsage.estimatedCost.total = 
      this.state.tokenUsage.estimatedCost.haiku + this.state.tokenUsage.estimatedCost.sonnet
  }

  getTokenUsageStats() {
    return {
      haiku: { ...this.state.tokenUsage.haiku },
      sonnet: { ...this.state.tokenUsage.sonnet },
      estimatedCost: { ...this.state.tokenUsage.estimatedCost }
    }
  }

  resetTokenUsageTracking() {
    this.state.tokenUsage = {
      haiku: { input: 0, output: 0, calls: 0 },
      sonnet: { input: 0, output: 0, calls: 0 },
      estimatedCost: { haiku: 0, sonnet: 0, total: 0 }
    }
    console.log('🔄 Token usage tracking reset via simulation engine')
  }

  // Store integration methods
  setStores(stores) {
    this.stores = stores
    console.log('🔗 Simulation engine stores updated')
  }

  async testClaudeConnection() {
    try {
      // Sync API key from UI store to Claude API service
      const ui = this.stores.ui || (typeof useUIStore === 'function' ? useUIStore() : null)
      if (ui?.claudeApiKey) {
        const claudeApiModule = await import('./claudeApi.js')
        if (claudeApiModule.setApiKey) {
          claudeApiModule.setApiKey(ui.claudeApiKey)
        }
      }
      
      const claudeService = new (await import('./claudeApi.js')).ClaudeApiService()
      const isConnected = await claudeService.testConnection()
      
      if (isConnected) {
        console.log('✅ Claude API connection successful')
        return true
      } else {
        console.warn('❌ Claude API connection failed - characters will not generate AI conversations')
        return false
      }
    } catch (error) {
      console.error('❌ Claude API connection test failed:', error)
      return false
    }
  }

  // Debugging and testing methods
  getDebugInfo() {
    return {
      isRunning: this.state.isRunning,
      currentTick: this.state.currentTick,
      lastUpdateTime: new Date(this.state.lastUpdateTime).toLocaleString(),
      characterCount: this.stores?.characters?.charactersList?.length || 0,
      conversationCount: this.stores?.simulation?.conversations?.length || 0,
      eventCount: this.stores?.simulation?.events?.length || 0,
      tokenUsage: this.getTokenUsageStats()
    }
  }

  // Time management
  updateTickSpeed(newSpeedInSeconds) {
    const newSpeedInMs = newSpeedInSeconds * 1000 // Convert seconds to milliseconds
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = setInterval(() => this.processTick(), newSpeedInMs)
      console.log(`⏱️ Updated tick speed to ${newSpeedInSeconds}s (${newSpeedInMs}ms interval)`)
    }
  }

  getAffinityDelta(emotion) {
    const affinityMap = {
      happy: 5,
      friendly: 7,
      grateful: 8,
      sad: -2,
      angry: -10,
      annoyed: -5,
      neutral: 1,
      curious: 3,
    };
    return affinityMap[emotion] || 0;
  }

  updateRelationshipAffinity(char1Id, char2Id, delta) {
    const char1 = this.stores.characters.getCharacter(char1Id);
    if (!char1 || !char1.relationships) return;
    const relationship = char1.relationships.find(r => r.name.toLowerCase() === this.stores.characters.getCharacter(char2Id)?.name.toLowerCase());
    if (relationship) {
      relationship.affinity = Math.max(-100, Math.min(100, (relationship.affinity || 0) + delta));
      this.stores.characters.updateCharacter(char1Id, { relationships: char1.relationships });
    }
  }

  async getMemorySummary(character) {
    if (character.memories.length > 10 && (this.state.currentTick % 20 === 0)) {
      const claudeApiModule = await import('./claudeApi.js');
      return await claudeApiModule.default.summarizeMemories(character.memories.slice(-15), character.name);
    }
    return null;
  }

  async consolidateMemoriesForCharacter(characterId) {
    const character = this.stores.characters.getCharacter(characterId);
    if (!character || !character.memories || character.memories.length < 15) {
      console.log(`[Memory] Skipping consolidation for ${character?.name}: not enough memories.`);
      return;
    }

    console.log(`[Memory] Starting consolidation for ${character.name}...`);
    const claudeApiModule = await import('./claudeApi.js');
    const recentMemories = character.memories.slice(-20); // Consolidate last 20 memories

    const result = await claudeApiModule.default.consolidateMemories(recentMemories, character.name);

    if (result && result.consolidated_memory) {
      const newMemory = {
        id: `consolidated_${Date.now()}`,
        timestamp: Date.now(),
        content: result.consolidated_memory,
        emotional_weight: 85, // Consolidated memories are highly important
        tags: ['consolidated', ...result.tags],
        isConsolidated: true,
        originalMemoryCount: recentMemories.length
      };

      // Replace old memories with the new consolidated one
      const olderMemories = character.memories.slice(0, -20);
      const updatedMemories = [...olderMemories, newMemory];
      
      this.stores.characters.updateCharacter(character.id, { memories: updatedMemories });
      console.log(`[Memory] Consolidated ${recentMemories.length} memories into 1 for ${character.name}.`);
    } else {
      console.warn(`[Memory] Consolidation failed for ${character.name}.`);
    }
  }
}

// Create singleton instance
export const simulationEngine = new ComprehensiveSimulationEngine()

// Export for compatibility
