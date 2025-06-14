import { reactive } from 'vue'
// import { useCharactersStore } from '../stores/characters.js'  // No longer needed here
// import { useSimulationStore } from '../stores/simulation.js' // No longer needed here
// import { useZonesStore } from '../stores/zones.js'         // No longer needed here
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
      characterRetryAttempts: new Map(),
      lastUpdateTime: Date.now(),
      environmentUpdateInterval: 30000, // 30 seconds
      lastEnvironmentUpdate: Date.now(),
      characterCooldowns: new Map() // Tracks cooldowns for characters after API errors
    })
    this.tickInterval = null
    this.stores = null
    this.running = false
    this.saveInterval = null
    this.tokenUsageInterval = null
  }

  async initialize() {
    try {
      // Stores are now set externally via setStores(). This method just loads state.
      if (!this.stores) {
        console.error('❌ Engine cannot initialize without stores. Call setStores() first.');
        return false;
      }
      this.loadState() // Load saved state on initialization
      console.log('🎮 Simulation engine initialized.')
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
      
      // Save state periodically
      this.saveInterval = setInterval(() => this.saveState(), 30000); // every 30 seconds
      // Start token usage refresh
      this.tokenUsageInterval = setInterval(() => this.refreshTokenUsage(), 5000);
      
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
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = null
    }
    if (this.tokenUsageInterval) {
      clearInterval(this.tokenUsageInterval)
      this.tokenUsageInterval = null
    }
    window.removeEventListener('character-death', this.handleCharacterDeath);
    window.removeEventListener('character-resurrection', this.handleCharacterResurrection);
    console.log('⏹️ Simulation engine stopped')
  }

  handleCharacterDeath(event) {
    const { characterId, characterName, causeOfDeath } = event.detail;
    const character = this.stores.characters.getCharacter(characterId);

    this.stores.simulation.addEvent({
      type: 'death',
      timestamp: Date.now(),
      involvedCharacters: [characterId],
      summary: `${characterName} has died: ${causeOfDeath}`,
      tone: 'tragic',
      details: {
        character_name: characterName,
        cause_of_death: causeOfDeath,
        major_event: true,
        death_timestamp: Date.now(),
        location: character.position ? `${character.position.x}, ${character.position.y}` : 'Unknown',
        zone: character.position?.zone || 'Unknown'
      }
    });

    // Add awareness memories to all other living characters
    Object.values(this.stores.characters.charactersList).forEach(otherCharacter => {
      if (otherCharacter.id !== characterId && !otherCharacter.isDead) {
        let emotionalWeight = 60;
        let relationshipContext = '';
        const relationship = otherCharacter.relationships?.find(rel => rel.name === characterName || rel.name.toLowerCase() === characterName.toLowerCase());
        if (relationship) {
          const relationshipWeights = { 'best_friend': 95, 'close_friend': 85, 'partner': 98, 'romantic_interest': 90, 'family': 95, 'friend': 75, 'neighbor': 65, 'colleague': 55, 'acquaintance': 45, 'rival': 40, 'enemy': 25 };
          emotionalWeight = relationshipWeights[relationship.type] || 60;
          relationshipContext = ` They were ${relationship.type || 'known to each other'}.`;
        }
        this.stores.characters.addMemory(otherCharacter.id, {
          id: `death_awareness_${characterId}_${otherCharacter.id}_${Date.now()}`,
          timestamp: Date.now(),
          content: `I learned that ${characterName} has died. Cause: ${causeOfDeath}.${relationshipContext} This is a tragic loss for our community.`,
          emotional_weight: emotionalWeight,
          tags: ['death', 'loss', 'community', 'tragic', characterName.toLowerCase()]
        });
      }
    });
  }

  handleCharacterResurrection(event) {
    const { characterId, characterName, resurrectionReason, previousCauseOfDeath } = event.detail;
    const character = this.stores.characters.getCharacter(characterId);

    this.stores.simulation.addEvent({
      type: 'resurrection',
      timestamp: Date.now(),
      involvedCharacters: [characterId],
      summary: `${characterName} has been resurrected: ${resurrectionReason}`,
      tone: 'miraculous',
      details: {
        character_name: characterName,
        resurrection_reason: resurrectionReason,
        previous_cause_of_death: previousCauseOfDeath,
        major_event: true,
        resurrection_timestamp: Date.now(),
        location: character.position ? `${character.position.x}, ${character.position.y}` : 'Unknown',
        zone: character.position?.zone || 'Unknown'
      }
    });

    // Add awareness memories to all other living characters
    Object.values(this.stores.characters.charactersList).forEach(otherCharacter => {
      if (otherCharacter.id !== characterId && !otherCharacter.isDead) {
        let emotionalWeight = 70;
        let relationshipContext = '';
        const relationship = otherCharacter.relationships?.find(rel => rel.name === characterName || rel.name.toLowerCase() === characterName.toLowerCase());
        if (relationship) {
          const relationshipWeights = { 'best_friend': 98, 'close_friend': 90, 'partner': 99, 'romantic_interest': 95, 'family': 98, 'friend': 85, 'neighbor': 75, 'colleague': 65, 'acquaintance': 55, 'rival': 50, 'enemy': 30 };
          emotionalWeight = relationshipWeights[relationship.type] || 70;
          relationshipContext = ` We ${relationship.type === 'enemy' ? 'were enemies' : relationship.type === 'rival' ? 'were rivals' : 'had a connection'}.`;
        }
        this.stores.characters.addMemory(otherCharacter.id, {
          id: `resurrection_awareness_${characterId}_${otherCharacter.id}_${Date.now()}`,
          timestamp: Date.now(),
          content: `Incredible news! ${characterName} has returned from the dead through ${resurrectionReason}. They previously died from ${previousCauseOfDeath}.${relationshipContext} This is miraculous and changes everything.`,
          emotional_weight: emotionalWeight,
          tags: ['resurrection', 'miracle', 'joy', 'amazement', 'second chance', characterName.toLowerCase()]
        });
      }
    });
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
            this.state.characterRetryAttempts.delete(character.id); // Clear retries on success
            characterActions.push({ character, action, context });
          }
        } catch (error) {
          console.error(`❌ Error generating action for ${character.name}:`, error);
          if (error.status === 503) {
            this.handleApiOverload(character);
          }
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

      // Update token usage in UI store periodically
      if (this.state.currentTick % 5 === 0) {
        this.refreshTokenUsage();
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
    const nearbyCharacters = this.findNearbyCharacters(character);
    const ongoingConversation = this.stores.simulation.conversations.find(conv => 
      conv.participants.includes(character.id) && 
      Date.now() - new Date(conv.lastMessageAt || conv.startTime).getTime() < 300000 // 5 minutes
    );
    const pendingInjections = this.stores.simulation.pendingInjections || [];
    const injection = pendingInjections.find(inj => 
      !inj.processed && (inj.target === 'global' || inj.target === character.id)
    );

    // Initial context build
    let context = {
      character: character,
      nearbyCharacters: nearbyCharacters.map(c => c.name).join(', '),
      currentLocation: this.getCharacterLocationName(character),
      environment: this.stores.simulation.getEnvironmentDescription(),
      injectedScenario: injection,
    };

    // Intelligent Memory Handling
    const memoryContext = await this.buildMemoryContext(character);
    Object.assign(context, memoryContext);


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

    // **FIXED: Add the injection to the context object!**
    if (injection) {
      context.injectedScenario = injection
      console.log(`[CONTEXT] Injecting scenario for ${character.name}: "${injection.content}"`)
    }

    return context
  }

  async buildMemoryContext(character) {
    // More aggressive reduction of context to prevent API overload errors.
    // Get the 5 most recent memories, sorted by timestamp.
    const memories = [...character.memories]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);

    // Get the 3 most recent events that directly involve the character.
    const recentEvents = this.stores.simulation.events
      .filter(event => event.involvedCharacters.includes(character.id))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3)
      .map(event => event.summary);

    return { memories, recentEvents };
  }

  async getCharacterAction(character, context) {
    const settings = getSettings(this.stores);
    try {
      const claudeApiModule = await import('./claudeApi.js');
      const claudeService = claudeApiModule.default;
      
      const useComplexModel = settings.simulationModel === 'sonnet' || 
        (settings.simulationModel === 'adaptive' && (
          (context.nearbyCharacters && context.nearbyCharacters.length > 1) ||
          context.ongoingConversation ||
          context.injectedScenario
        ));

      const response = await claudeService.getCharacterAction(character, context, useComplexModel);
      
      if (response && response.usage) {
        this.aggregateTokenUsage(response.usage, useComplexModel ? 'sonnet' : 'haiku');
      }

      if (response && response.action) {
        return response.action;
      } else {
        return null;
      }
    } catch (error) {
      console.error(`❌ Error getting action for ${character.name}:`, error)
      return null;
    }
  }

  aggregateTokenUsage(usage, modelType) {
    if (!this.state.tokenUsage[modelType]) {
      this.state.tokenUsage[modelType] = { input: 0, output: 0, calls: 0 };
    }
    this.state.tokenUsage[modelType].input += usage.input_tokens || 0;
    this.state.tokenUsage[modelType].output += usage.output_tokens || 0;
    this.state.tokenUsage[modelType].calls += 1;
    this.updateCostEstimate();
    this.refreshTokenUsage(); // Update UI immediately
  }

  async executeCharacterAction(character, action, context) {
    // 1. Process thoughts and emotion first, as they provide context for the action.
    if (action.internal_thoughts) {
        this.stores.simulation.addEvent({
            type: 'thought',
            summary: `${character.name} thinks: "${action.internal_thoughts}"`,
            details: { reasoning: action.action_reasoning },
            involvedCharacters: [character.id],
            location: this.getCharacterLocationName(character),
            tone: action.emotion || 'neutral'
        });
        this.addMemoryToCharacter(character, `I was thinking: ${action.internal_thoughts}`, 3);
    }
    if (action.emotion && action.emotion !== character.currentEmotion) {
        this.stores.characters.updateCharacterEmotion(character.id, action.emotion);
    }

    // 2. Log the rich, descriptive action for storytelling purposes.
    if (action.action_description) {
        this.stores.simulation.addEvent({
            type: 'action',
            summary: `${character.name} ${action.action_description}`,
            details: { reasoning: action.action_reasoning },
            involvedCharacters: [character.id],
            location: this.getCharacterLocationName(character),
            tone: action.emotion || 'neutral'
        });
    }

    // 3. Execute the specific, machine-readable movement command.
    const move = action.movement_command;
    if (move && move.command && move.command !== 'stay_idle') {
      let targetDetails = {};
      switch (move.command) {
        case 'move_to_zone':
          targetDetails = await this.handleMoveToZone(character, move.target, context);
          break;
        case 'approach_character':
          targetDetails = await this.handleApproachCharacter(character, move.target, context);
          break;
      }
      // Create a specific 'movement' event if a move occurred.
      if (targetDetails.moved) {
        this.stores.simulation.addEvent({
            type: 'movement',
            summary: `${character.name} is heading towards ${move.target}.`,
            details: {
                reasoning: action.action_reasoning,
                destination: targetDetails.destination,
            },
            involvedCharacters: [character.id],
            location: this.getCharacterLocationName(character),
            tone: 'neutral'
        });
      }
    }

    // 4. Process dialogue
    if (action.dialogue) {
      await this.processSpeech(character, action.dialogue, action.action_reasoning, context);
    }
    
    // Process scenario injection tracking
    if (context.injectedScenario) {
        const injection = context.injectedScenario;
        if (injection.target === 'global') {
            if (!injection.processedBy) injection.processedBy = [];
            if (!injection.processedBy.includes(character.id)) {
                injection.processedBy.push(character.id);
            }
            const totalCharacters = this.stores.characters.charactersList.filter(c => !c.isDead).length;
            if (injection.processedBy.length >= totalCharacters) {
                this.stores.simulation.markInjectionProcessed(injection.id);
            }
        } else {
            this.stores.simulation.markInjectionProcessed(injection.id);
        }
    }
  }

  async processSpeech(character, dialogue, reasoning, context = {}) {
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
        conv.participants.includes(character.id) &&
        nearbyCharacters.some(nc => conv.participants.includes(nc.id)) &&
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
    const eventDetails = {
      speaker: character.name,
      speakerId: character.id,
      dialogue: dialogue,
      nearbyCharacters: nearbyCharacters.map(nc => nc.name),
      location: this.getCharacterLocationName(character),
      reasoning: reasoning
    };

    if (context.injectedScenario) {
      eventDetails.injection_id = context.injectedScenario.id;
      eventDetails.injection_content = context.injectedScenario.content;
      eventDetails.is_scenario_event = true;
      eventDetails.injection_target = context.injectedScenario.target;
    }

    this.stores.simulation.addEvent({
      type: 'conversation',
      summary: `${character.name} said: "${dialogue}"`,
      details: eventDetails,
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
      this.updateRelationshipAffinity(character.id, nearby.id, this.getAffinityDelta(character.currentEmotion));
    })
  }

  async handleApproachCharacter(character, targetName, context = {}) {
    let target = this.stores.characters.charactersList.find(c => c.name.toLowerCase() === targetName.toLowerCase() && c.id !== character.id && !c.isDead);
    
    if (!target) {
        console.log(`[APPROACH] Could not find target character: ${targetName}`);
        return { moved: false };
    }

    const otherCharacters = this.stores.characters.charactersList.filter(c => c.id !== character.id);

    // Find a valid adjacent position to the target
    const targetX = target.position.x;
    const targetY = target.position.y;
    const adjacentPositions = [
        {x: targetX, y: targetY - 1}, // North
        {x: targetX, y: targetY + 1}, // South
        {x: targetX - 1, y: targetY}, // West
        {x: targetX + 1, y: targetY}, // East
    ].sort((a,b) => (Math.abs(a.x - character.position.x) + Math.abs(a.y - character.position.y)) - (Math.abs(b.x - character.position.x) + Math.abs(b.y - character.position.y))); // Sort by distance from character

    
    // Find the first walkable and unoccupied adjacent position
    const validTargetPosition = adjacentPositions.find(p => 
        this.stores.zones.isPositionWalkable(p.x, p.y, otherCharacters)
    );

    if (!validTargetPosition) {
        console.log(`[APPROACH] No valid spot to approach ${target.name} for ${character.name}`);
        return { moved: false }; // Can't approach
    }

    // Update affinity since an approach is a positive social action
    this.updateRelationshipAffinity(character.id, target.id, 5);

    // Use zone pathfinding for movement to the adjacent spot
    const newPosition = this.stores.zones.getValidMovePosition(
      character.position.x, 
      character.position.y, 
      validTargetPosition.x, // move to adjacent tile
      validTargetPosition.y, // move to adjacent tile
      7, // max distance per tick
      otherCharacters
    )
    
    if (newPosition && (newPosition.x !== character.position.x || newPosition.y !== character.position.y)) {
      this.moveCharacterToPosition(character, newPosition, null, context)
      return { moved: true, destination: newPosition };
    }
    return { moved: false };
  }

  async handleMoveToZone(character, zoneName, context = {}) {
    if (!zoneName) {
        console.warn(`[MOVE] No zoneName provided for ${character.name}`);
        return { moved: false };
    }
    const zone = this.stores.zones.zonesList.find(z => z.name.toLowerCase() === zoneName.toLowerCase());
    if (!zone || zone.tiles.length === 0) {
        console.warn(`[MOVE] Could not find or no tiles in zone: ${zoneName}`);
        return { moved: false };
    }
    const otherCharacters = this.stores.characters.charactersList.filter(c => c.id !== character.id);
    const newPosition = this.stores.zones.getValidMovePosition(
      character.position.x, 
      character.position.y, 
      zone.tiles[0].x,
      zone.tiles[0].y,
      7,
      otherCharacters
    )
    if (newPosition && (newPosition.x !== character.position.x || newPosition.y !== character.position.y)) {
      this.moveCharacterToPosition(character, newPosition, zone.name || 'Unknown', context)
      return { moved: true, destination: newPosition };
    }
    return { moved: false };
  }

  // Character movement functions
  moveCharacterToPosition(character, newPosition, zoneName = null, context = {}) {
    const oldPosition = { ...character.position }
    this.stores.characters.moveCharacter(character.id, {
      x: newPosition.x,
      y: newPosition.y,
      zone: zoneName || character.position.zone
    })
    const updated = this.stores.characters.getCharacter(character.id)
    
    const eventDetails = {
      character: character.name,
      characterId: character.id,
      fromPosition: oldPosition,
      toPosition: newPosition,
      zone: zoneName || character.position.zone
    };

    if (context.injectedScenario) {
      eventDetails.injection_id = context.injectedScenario.id;
      eventDetails.injection_content = context.injectedScenario.content;
      eventDetails.is_scenario_event = true;
      eventDetails.injection_target = context.injectedScenario.target;
    }

    this.stores.simulation.addEvent({
      type: 'movement',
      summary: `${character.name} moved from (${oldPosition.x},${oldPosition.y}) to (${newPosition.x},${newPosition.y})`,
      details: eventDetails,
      involvedCharacters: [character.id],
      location: zoneName || this.getCharacterLocationName(character),
      tone: 'neutral'
    })
  }

  findNearbyCharacters(character, maxDistance = 5) {
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
        const avgX = participants.reduce((sum, p) => sum + p.position.x, 0) / participants.length;
        const avgY = participants.reduce((sum, p) => sum + p.position.y, 0) / participants.length;

        for (const p of participants) {
          const distance = Math.abs(p.position.x - avgX) + Math.abs(p.position.y - avgY);
          if (distance > 4) { // Stricter distance check from center of group
            areParticipantsNearby = false;
            break;
          }
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
    return this.state.tokenUsage;
  }

  refreshTokenUsage() {
    if (this.stores?.ui?.updateTokenUsage) {
      const stats = this.getTokenUsageStats();
      console.log('🔄 Refreshing token usage in UI:', stats);
      this.stores.ui.updateTokenUsage(stats);
    } else {
      console.warn('⚠️ Cannot refresh token usage: UI store not available or updateTokenUsage method missing');
    }
  }

  resetTokenUsageTracking() {
    this.state.tokenUsage = {
      haiku: { input: 0, output: 0, calls: 0 },
      sonnet: { input: 0, output: 0, calls: 0 },
      estimatedCost: { haiku: 0, sonnet: 0, total: 0 }
    }
    this.updateCostEstimate()
    console.log('🔄 Token usage tracking reset via simulation engine')
  }

  // Store integration methods
  setStores(stores) {
    this.stores = stores
    // Bind event handlers
    this.handleCharacterDeath = this.handleCharacterDeath.bind(this);
    this.handleCharacterResurrection = this.handleCharacterResurrection.bind(this);
    window.addEventListener('character-death', this.handleCharacterDeath);
    window.addEventListener('character-resurrection', this.handleCharacterResurrection);
    console.log('🔗 Simulation engine stores updated and event listeners added')
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

  async getMemorySummary(character, memoriesToSummarize) {
    try {
      const { useUIStore } = window.stores;
      const ui = useUIStore ? useUIStore() : null;
      const apiKey = ui ? ui.claudeApiKey : null;

      const response = await fetch('/.netlify/functions/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memories: memoriesToSummarize,
          characterName: character.name,
          apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Summarize function failed with status ${response.status}`);
      }
      const data = await response.json();
      if (data.usage) {
        this.aggregateTokenUsage(data.usage, 'haiku');
      }
      return data.summary;
    } catch (error) {
      console.warn('Memory summarization failed:', error);
      return null;
    }
  }

  async consolidateMemoriesForCharacter(characterId) {
    const character = this.stores.characters.getCharacter(characterId);
    if (!character || !character.memories || character.memories.length < 15) {
      console.log(`[Memory] Skipping consolidation for ${character?.name}: not enough memories.`);
      return;
    }

    console.log(`[Memory] Starting consolidation for ${character.name}...`);
    
    try {
      const { useUIStore } = window.stores;
      const ui = useUIStore ? useUIStore() : null;
      const apiKey = ui ? ui.claudeApiKey : null;
      const recentMemories = character.memories.slice(-20);

      const response = await fetch('/.netlify/functions/consolidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memories: recentMemories,
          characterName: character.name,
          apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Consolidate function failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.usage) {
        this.aggregateTokenUsage(result.usage, 'haiku');
      }

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
    } catch (error) {
      console.error('Error consolidating memories:', error);
    }
  }

  saveState() {
    const simulationData = {
      tokenUsage: this.state.tokenUsage,
      lastUpdateTime: this.state.lastUpdateTime,
    }
    localStorage.setItem('meadowloop-engine-state', JSON.stringify(simulationData));
  }

  loadState() {
    const savedState = localStorage.getItem('meadowloop-engine-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        this.state.tokenUsage = parsed.tokenUsage || this.state.tokenUsage;
        this.state.lastUpdateTime = parsed.lastUpdateTime || this.state.lastUpdateTime;
      } catch(e) {
        console.error("Failed to load engine state:", e);
      }
    }
  }

  handleApiOverload(character) {
    const attempts = (this.state.characterRetryAttempts.get(character.id) || 0) + 1;
    this.stores.simulation.addEvent({
      type: 'warning',
      summary: `API rate limit hit for ${character.name}. Retrying... (Attempt ${attempts})`,
      details: {
        character: character.name,
        characterId: character.id,
        errorType: 'rate_limit',
        retryAttempt: attempts,
      },
      involvedCharacters: [character.id],
      tone: 'warning'
    });

    if (attempts > 3) {
      console.error(`[RETRY] Max retries reached for ${character.name}. Giving up for this tick.`);
      this.state.characterRetryAttempts.delete(character.id);
      return;
    }

    const delay = (2 ** attempts) * 1000; // Exponential backoff: 2s, 4s, 8s
    console.warn(`[RETRY] API Overloaded. Retrying action for ${character.name} in ${delay / 1000}s (attempt ${attempts})`);
    this.state.characterRetryAttempts.set(character.id, attempts);

    setTimeout(() => {
      console.log(`[RETRY] Re-processing action for ${character.name}`);
      this.processCharacterAction(character);
    }, delay);
  }
}

// Create singleton instance
export const simulationEngine = new ComprehensiveSimulationEngine()

// Export for compatibility
