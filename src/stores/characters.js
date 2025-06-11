import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCharactersStore = defineStore('characters', () => {
  // State
  const characters = ref({})
  const originalCharacters = ref({})
  const isLoaded = ref(false)

  // Getters
  const charactersList = computed(() => Object.values(characters.value))
  const getCharacter = computed(() => (id) => characters.value[id])
  const getCharactersByZone = computed(() => (zoneId) => 
    charactersList.value.filter(char => char.position.zone === zoneId)
  )

  // Actions
  async function loadCharacters() {
    try {
      if (typeof process !== 'undefined') {
        const fs = await import('fs/promises');
        const path = await import('path');
        const dataPath = path.join(process.cwd(), 'public', 'characters');
        const characterDirs = await fs.readdir(dataPath, { withFileTypes: true });
        const characterPromises = characterDirs
          .filter(dirent => dirent.isDirectory())
          .map(async (dir) => {
            const profilePath = path.join(dataPath, dir.name, 'profile.json');
            try {
              const data = await fs.readFile(profilePath, 'utf-8');
              return JSON.parse(data);
            } catch (e) {
              return null; // Ignore if profile.json is missing
            }
          });
        const charactersData = (await Promise.all(characterPromises)).filter(Boolean);
        const charactersMap = {};
        charactersData.forEach(c => { charactersMap[c.id] = c; });
        characters.value = charactersMap;
        originalCharacters.value = { ...charactersMap };
      } else {
        // Browser-based fetch logic
        
        // Try to get character list from multiple sources
        const availableCharacters = await discoverAvailableCharacters()
        
        if (availableCharacters.length === 0) {
          console.warn('⚠️ No character folders found!')
          console.warn('⚠️ Expected characters in /public/characters/[name]/profile.json')
          characters.value = {}
          originalCharacters.value = {}
          isLoaded.value = true
          return
        }
        
        // Load character profiles from all available folders
        const loadPromises = availableCharacters.map(async (name) => {
          try {
            const response = await fetch(`/characters/${name}/profile.json`)
            if (!response.ok) {
              throw new Error(`Failed to load ${name}: ${response.status} ${response.statusText}`)
            }
            const character = await response.json()
            
            // Validate required fields
            if (!character.name || !character.id) {
              throw new Error(`Character ${name} missing required fields (name or id)`)
            }
            
            // Ensure all required fields exist with defaults
            const completeCharacter = {
              id: character.id || name.toLowerCase(),
              name: character.name || name,
              age: character.age || 'Unknown',
              location: character.location || 'Unknown',
              occupation: character.occupation || 'Unknown',
              description: character.description || 'No description available.',
              personality: character.personality || 'Unknown',
              MBTI: character.MBTI || 'ENFP',
              bigFive: character.bigFive || {
                openness: 50,
                conscientiousness: 50,
                extraversion: 50,
                agreeableness: 50,
                neuroticism: 50
              },
              sexuality: character.sexuality || 'heterosexual',
              desires: character.desires || [],
              mentalHealth: character.mentalHealth || [],
              memories: character.memories || [],
              relationships: character.relationships || [],
              position: character.position || {
                x: Math.floor(Math.random() * 50),
                y: Math.floor(Math.random() * 37),
                zone: 'unknown'
              },
              currentEmotion: character.currentEmotion || 'neutral',
              sprite: character.sprite || `/characters/${name}/sprite.png`,
              isDead: character.isDead || false,
              causeOfDeath: character.causeOfDeath || null,
              deathTimestamp: character.deathTimestamp || null
            }
            
            // Fix currentZone reference - ensure it uses position.zone for consistency
            completeCharacter.currentZone = completeCharacter.position.zone
            
            return [completeCharacter.id, completeCharacter]
          } catch (error) {
            console.error(`❌ Failed to load character ${name}:`, error)
            throw error
          }
        })

        const characterPairs = await Promise.all(loadPromises)
        const originalData = Object.fromEntries(characterPairs)
        
        // Apply migration to original data to ensure proper relationship format
        for (const character of Object.values(originalData)) {
          migrateRelationshipFormat(character)
          // Ensure currentZone is synced with position.zone
          character.currentZone = character.position.zone
        }
        
        originalCharacters.value = originalData
        
        // Load any modifications from localStorage
        const savedChanges = localStorage.getItem('meadowloop-characters')
        if (savedChanges) {
          try {
            const parsedChanges = JSON.parse(savedChanges)
            // **FIXED**: Use the existing helper to correctly deep-merge character data
            characters.value = mergeCharacterChanges(originalData, parsedChanges)
          } catch (error) {
            console.error('Failed to parse saved character changes:', error)
            characters.value = originalData
          }
        } else {
          characters.value = originalData
        }
        
        // Fix any currentZone mismatches after loading
        Object.values(characters.value).forEach(character => {
          if (character.position && character.position.zone) {
            character.currentZone = character.position.zone
          }
        })
        
        // Set loaded flag to true on success
        isLoaded.value = true
        
      }
    } catch (error) {
      console.error('❌ Failed to load characters:', error)
      console.error('❌ Stack trace:', error.stack)
      // Set empty state on error but still mark as "loaded" to prevent infinite loops
      characters.value = {}
      originalCharacters.value = {}
      isLoaded.value = true // Mark as loaded even on failure to prevent retry loops
    }
  }

  // New function to discover available characters dynamically
  async function discoverAvailableCharacters() {
    const availableCharacters = []
    
    // Method 1: Try to load a manifest file that lists characters
    try {
      const manifestResponse = await fetch('/characters/manifest.json')
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json()
        if (manifest.characters && Array.isArray(manifest.characters)) {
          
          // Verify each character in the manifest actually exists
          for (const characterName of manifest.characters) {
            try {
              const response = await fetch(`/characters/${characterName}/profile.json`, { method: 'HEAD' })
              if (response.ok) {
                availableCharacters.push(characterName)
              } else {
                console.warn(`⚠️ Character in manifest not found: ${characterName}`)
              }
            } catch (error) {
              console.warn(`⚠️ Error checking character from manifest ${characterName}:`, error.message)
            }
          }
          
          if (availableCharacters.length > 0) {
            return availableCharacters
          }
        }
      }
    } catch (error) {
    }
    
    // Method 2: Try common character names (expanded list)
    const commonCharacterNames = [
      // Original characters
      'Rose', 'Sage', 'Griff', 'John', 'Alice',
      // Common character names that might be used
      'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Sophia', 'Elijah',
      'Charlotte', 'William', 'Amelia', 'James', 'Isabella', 'Benjamin', 'Mia',
      'Lucas', 'Harper', 'Henry', 'Evelyn', 'Theodore', 'Abigail', 'Jack',
      'Emily', 'Owen', 'Elizabeth', 'Jacob', 'Mila', 'Michael', 'Ella',
      // Character archetypes
      'Blacksmith', 'Baker', 'Farmer', 'Merchant', 'Guard', 'Healer', 'Scholar',
      'Artist', 'Musician', 'Cook', 'Librarian', 'Mayor', 'Priest', 'Hunter',
      // Fantasy names
      'Aria', 'Damon', 'Luna', 'Felix', 'Iris', 'Atlas', 'Sage', 'River',
      'Phoenix', 'Skylar', 'Rowan', 'Hazel', 'Aspen', 'Brynn', 'Cora',
      // Previously mentioned characters
      'Thistle'
    ]
    
    for (const name of commonCharacterNames) {
      try {
        const response = await fetch(`/characters/${name}/profile.json`, { method: 'HEAD' })
        if (response.ok) {
          availableCharacters.push(name)
        }
      } catch (error) {
        // Silently continue - we expect many to fail
      }
    }
    
    return availableCharacters
  }

  function updateCharacter(id, updates) {
    if (characters.value[id]) {
      characters.value[id] = { ...characters.value[id], ...updates }
      
      // Sync currentZone with position.zone if position is updated
      if (updates.position && updates.position.zone) {
        characters.value[id].currentZone = updates.position.zone
      }
      
      saveCharacterChanges()
    }
  }

  function moveCharacter(id, position) {
    const character = characters.value[id]
    if (character) {
      const oldPosition = { ...character.position }
      character.position = { ...position }
      
      // ENHANCED: Track manual movements
      // Check if this is a significant movement (not just small AI movements)
      const oldX = oldPosition.x || 0
      const oldY = oldPosition.y || 0
      const newX = position.x || 0
      const newY = position.y || 0
      const distance = Math.sqrt((newX - oldX) ** 2 + (newY - oldY) ** 2)
      
      // If movement is significant (>2 tiles), likely manual - create tracking events
      if (distance > 2) {
        // FIXED: Get human-readable zone names instead of raw IDs
        const oldZoneName = getHumanReadableZoneName(oldPosition.zone, oldX, oldY)
        const newZoneName = getHumanReadableZoneName(position.zone, newX, newY)
        const zoneChanged = oldZoneName !== newZoneName
        
        // Add movement memory to character
        const movementReason = zoneChanged ? 
          `Moved from ${oldZoneName} to ${newZoneName}` : 
          `Relocated within ${newZoneName}`
          
        const movementMemory = {
          id: `movement_${id}_${Date.now()}`,
          timestamp: Date.now(),
          content: `I ${movementReason} from (${oldX}, ${oldY}) to (${newX}, ${newY}). ${zoneChanged ? 'This is a new environment for me.' : 'I\'ve moved to a different area.'}`,
          emotional_weight: zoneChanged ? 45 : 25,
          tags: ['movement', 'location_change', zoneChanged ? 'zone_change' : 'relocation']
        }
        
        character.memories.push(movementMemory)
        
        // Create simulation event for significant movements
        try {
          // Dynamic import to avoid circular dependencies
          import('./simulation.js').then(({ useSimulationStore }) => {
            const simulationStore = useSimulationStore()
            
            if (simulationStore && typeof simulationStore.addEvent === 'function') {
              const movementEvent = {
                type: 'movement',
                involvedCharacters: [id],
                summary: `${character.name} ${movementReason.toLowerCase()}`,
                tone: zoneChanged ? 'exploratory' : 'casual',
                details: {
                  character_name: character.name,
                  movement_type: distance > 5 ? 'teleportation' : 'relocation',
                  old_position: `${oldX}, ${oldY}`,
                  new_position: `${newX}, ${newY}`,
                  old_zone: oldZoneName,
                  new_zone: newZoneName,
                  zone_changed: zoneChanged,
                  distance_moved: Math.round(distance * 10) / 10,
                  manual_movement: true
                }
              }
              
              simulationStore.addEvent(movementEvent)
            }
          }).catch(error => {
            console.warn('Could not create movement event - simulation store not available:', error)
          })
        } catch (error) {
          console.warn('Could not create movement event - simulation store not available:', error)
        }
        
        console.log(`📍 ${character.name} moved significantly: (${oldX}, ${oldY}) → (${newX}, ${newY}) [${Math.round(distance * 10) / 10} tiles]`)
      }
      
      saveCharacterChanges()
    }
  }

  // ADDED: Helper function to convert zone IDs to human-readable names
  function getHumanReadableZoneName(zoneId, x, y) {
    // Try to get zone store to look up actual zone names
    try {
      const { useZonesStore } = require('./zones.js')
      const zonesStore = useZonesStore()
      
      if (zonesStore && zonesStore.zones) {
        const zone = zonesStore.zones.find(z => z.id === zoneId)
        if (zone && zone.name) {
          return zone.name
        }
      }
    } catch (error) {
      // Ignore import errors - zones store might not be available
    }
    
    // If zone ID is auto-generated (contains timestamps/numbers) or not found, create readable description
    if (!zoneId || zoneId === 'Unknown' || zoneId.includes('_') || /\d{10,}/.test(zoneId)) {
      // Create location description based on coordinates
      return getLocationDescription(x, y)
    }
    
    // If it's a short, meaningful ID, use it as-is
    return zoneId
  }

  // ADDED: Helper function to generate readable location descriptions from coordinates
  function getLocationDescription(x, y) {
    // Map coordinates to general areas (assuming 50x37 map)
    const mapWidth = 50
    const mapHeight = 37
    
    // Determine general compass direction
    let location = ''
    
    // North/South
    if (y < mapHeight * 0.25) {
      location += 'northern '
    } else if (y > mapHeight * 0.75) {
      location += 'southern '
    } else {
      location += 'central '
    }
    
    // East/West
    if (x < mapWidth * 0.25) {
      location += 'western area'
    } else if (x > mapWidth * 0.75) {
      location += 'eastern area'
    } else {
      location += 'area'
    }
    
    // Add specific coordinate hint for precision
    return `${location} (${x}, ${y})`
  }

  function updateCharacterEmotion(id, emotion) {
    updateCharacter(id, { currentEmotion: emotion })
  }

  function addMemory(characterId, memory) {
    const character = characters.value[characterId]
    if (character) {
      character.memories.push(memory)
      saveCharacterChanges()
    }
  }

  // Autonomous movement functions
  function moveCharacterToRandomPosition(characterId, availableZones = []) {
    const character = characters.value[characterId]
    if (!character) return

    // Simple random movement within a small area
    const currentX = character.position.x
    const currentY = character.position.y
    
    // Move 1-3 tiles in a random direction
    const moveDistance = Math.floor(Math.random() * 3) + 1
    const angle = Math.random() * 2 * Math.PI
    
    const newX = Math.max(0, Math.min(49, Math.round(currentX + Math.cos(angle) * moveDistance)))
    const newY = Math.max(0, Math.min(37, Math.round(currentY + Math.sin(angle) * moveDistance)))
    
    // Find appropriate zone for new position
    let newZone = character.position.zone
    if (availableZones.length > 0) {
      const nearbyZone = availableZones.find(zone => 
        zone.tiles.some((tile) => 
          Math.abs(tile.x - newX) <= 2 && Math.abs(tile.y - newY) <= 2
        )
      )
      if (nearbyZone) {
        newZone = nearbyZone.id
      }
    }

    moveCharacter(characterId, {
      x: newX,
      y: newY,
      zone: newZone
    })

    console.log(`${character.name} moved to (${newX}, ${newY}) in ${newZone}`)
  }

  function moveCharacterToZone(characterId, targetZoneId, availableZones = []) {
    const character = characters.value[characterId]
    if (!character) return

    const targetZone = availableZones.find(zone => zone.id === targetZoneId)
    if (!targetZone || targetZone.tiles.length === 0) {
      // Fallback to random movement
      moveCharacterToRandomPosition(characterId, availableZones)
      return
    }

    // Choose a random tile within the target zone
    const randomTile = targetZone.tiles[Math.floor(Math.random() * targetZone.tiles.length)]
    
    moveCharacter(characterId, {
      x: randomTile.x,
      y: randomTile.y,
      zone: targetZoneId
    })

    console.log(`${character.name} moved to ${targetZone.name} at (${randomTile.x}, ${randomTile.y})`)
  }

  function simulateCharacterMovement(availableZones = []) {
    // Move each character with a small probability
    charactersList.value.forEach(character => {
      // 10% chance each character moves per simulation tick
      if (Math.random() < 0.1) {
        // 70% chance of random movement, 30% chance of moving to a specific zone
        if (Math.random() < 0.7) {
          moveCharacterToRandomPosition(character.id, availableZones)
        } else {
          // Choose a random zone to visit
          if (availableZones.length > 0) {
            const randomZone = availableZones[Math.floor(Math.random() * availableZones.length)]
            moveCharacterToZone(character.id, randomZone.id, availableZones)
          } else {
            moveCharacterToRandomPosition(character.id, availableZones)
          }
        }
      }
    })
  }

  function saveCharacterChanges() {
    // Calculate diff from original data
    const changes = {}
    
    for (const [id, character] of Object.entries(characters.value)) {
      const original = originalCharacters.value[id]
      if (original) {
        const diff = calculateCharacterDiff(original, character)
        if (Object.keys(diff).length > 0) {
          changes[id] = diff
        }
      }
    }
    
    localStorage.setItem('meadowloop-characters', JSON.stringify(changes))
  }

  function resetCharacters() {
    characters.value = { ...originalCharacters.value }
    localStorage.removeItem('meadowloop-characters')
  }

  // Helper functions
  function migrateRelationshipFormat(character) {
    // Convert old relationship format (string array) to new format (object array)
    if (character.relationships && Array.isArray(character.relationships)) {
      character.relationships = character.relationships.map(rel => {
        // If it's already in new format (object), keep it
        if (typeof rel === 'object' && rel.name !== undefined) {
          return {
            name: rel.name || '',
            type: rel.type || '',
            notes: rel.notes || ''
          }
        }
        // If it's old format (string), convert to new format
        if (typeof rel === 'string') {
          return {
            name: rel,
            type: '',
            notes: ''
          }
        }
        // Fallback for any other format
        return { name: '', type: '', notes: '' }
      })
    } else if (!character.relationships) {
      // Initialize empty relationships array if missing
      character.relationships = []
    }
    
    return character
  }

  function mergeCharacterChanges(original, changes) {
    const result = { ...original }
    
    for (const [id, characterChanges] of Object.entries(changes)) {
      if (result[id]) {
        result[id] = { ...result[id], ...characterChanges }
        // Apply migration to merged character
        result[id] = migrateRelationshipFormat(result[id])
      }
    }
    
    return result
  }

  function calculateCharacterDiff(original, current) {
    const diff = {}
    
    // Compare each field and add to diff if different
    if (original.name !== current.name) diff.name = current.name
    if (original.age !== current.age) diff.age = current.age
    if (original.location !== current.location) diff.location = current.location
    if (original.occupation !== current.occupation) diff.occupation = current.occupation
    if (original.description !== current.description) diff.description = current.description
    if (original.personality !== current.personality) diff.personality = current.personality
    if (original.MBTI !== current.MBTI) diff.MBTI = current.MBTI
    if (JSON.stringify(original.bigFive) !== JSON.stringify(current.bigFive)) diff.bigFive = current.bigFive
    if (original.sexuality !== current.sexuality) diff.sexuality = current.sexuality
    if (JSON.stringify(original.desires) !== JSON.stringify(current.desires)) diff.desires = current.desires
    if (JSON.stringify(original.mentalHealth) !== JSON.stringify(current.mentalHealth)) diff.mentalHealth = current.mentalHealth
    if (JSON.stringify(original.memories) !== JSON.stringify(current.memories)) diff.memories = current.memories
    if (JSON.stringify(original.relationships) !== JSON.stringify(current.relationships)) diff.relationships = current.relationships
    if (JSON.stringify(original.position) !== JSON.stringify(current.position)) diff.position = current.position
    if (original.currentEmotion !== current.currentEmotion) diff.currentEmotion = current.currentEmotion
    
    return diff
  }

  // Character Management Functions
  function createCharacter(characterData) {
    const newCharacter = {
      id: characterData.id || `char_${Date.now()}`,
      name: characterData.name || 'New Character',
      age: characterData.age || '',
      location: characterData.location || '',
      occupation: characterData.occupation || '',
      description: characterData.description || 'No description available.',
      personality: characterData.personality || 'Unknown',
      MBTI: characterData.MBTI || 'ENFP',
      bigFive: characterData.bigFive || {
        openness: 50,
        conscientiousness: 50,
        extraversion: 50,
        agreeableness: 50,
        neuroticism: 50
      },
      sexuality: characterData.sexuality || 'heterosexual',
      desires: characterData.desires || [],
      mentalHealth: characterData.mentalHealth || [],
      memories: characterData.memories || [],
      relationships: characterData.relationships || [],
      position: characterData.position || {
        x: Math.floor(Math.random() * 50),
        y: Math.floor(Math.random() * 37),
        zone: 'unknown'
      },
      currentEmotion: characterData.currentEmotion || 'neutral',
      sprite: characterData.sprite || '/characters/default/sprite.png',
      isDead: false,
      causeOfDeath: null,
      deathTimestamp: null
    }

    characters.value[newCharacter.id] = newCharacter
    saveCharacterChanges()
    
    return newCharacter
  }

  function deleteCharacter(characterId) {
    if (characters.value[characterId]) {
      const characterName = characters.value[characterId].name
      delete characters.value[characterId]
      
      // Also remove from original characters if it exists there
      if (originalCharacters.value[characterId]) {
        delete originalCharacters.value[characterId]
      }
      
      saveCharacterChanges()
      
      return true
    }
    return false
  }

  function setCharacterDead(characterId, causeOfDeath = 'Unknown') {
    const character = characters.value[characterId]
    if (character) {
      character.isDead = true
      character.causeOfDeath = causeOfDeath
      character.deathTimestamp = Date.now()
      character.currentEmotion = 'dead'
      
      // Add death memory to the dying character
      const deathMemory = {
        id: `${characterId}_death_${Date.now()}`,
        timestamp: Date.now(),
        content: `Death: ${causeOfDeath}`,
        emotional_weight: 100,
        tags: ['death', 'tragic', causeOfDeath.toLowerCase()]
      }
      character.memories.push(deathMemory)
      
      // ENHANCED: Make other characters aware of the death
      const characterName = character.name
      
      // Create simulation event for the death
      const deathEvent = {
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
      }
      
      // Add the death event to simulation (if simulation store is available)
      try {
        const simulationStore = useSimulationStore?.()
        if (simulationStore && typeof simulationStore.addEvent === 'function') {
          simulationStore.addEvent(deathEvent)
        }
      } catch (error) {
        console.warn('Could not create death event - simulation store not available:', error)
      }
      
      // Add death awareness memories to other characters
      Object.values(characters.value).forEach(otherCharacter => {
        if (otherCharacter.id !== characterId && !otherCharacter.isDead) {
          // Determine emotional weight based on relationship
          let emotionalWeight = 60 // Base weight for community member death
          let relationshipContext = ''
          
          // Check if they had a relationship
          const relationship = otherCharacter.relationships?.find(rel => 
            rel.name === characterName || rel.name.toLowerCase() === characterName.toLowerCase()
          )
          
          if (relationship) {
            // Adjust weight based on relationship type
            const relationshipWeights = {
              'best_friend': 95,
              'close_friend': 85, 
              'partner': 98,
              'romantic_interest': 90,
              'family': 95,
              'friend': 75,
              'neighbor': 65,
              'colleague': 55,
              'acquaintance': 45,
              'rival': 40,
              'enemy': 25
            }
            
            emotionalWeight = relationshipWeights[relationship.type] || 60
            relationshipContext = ` They were ${relationship.type || 'known to each other'}.`
          }
          
          // Create death awareness memory
          const deathAwarenessMemory = {
            id: `death_awareness_${characterId}_${otherCharacter.id}_${Date.now()}`,
            timestamp: Date.now(),
            content: `I learned that ${characterName} has died. Cause: ${causeOfDeath}.${relationshipContext} This is a tragic loss for our community.`,
            emotional_weight: emotionalWeight,
            tags: ['death', 'loss', 'community', 'tragic', characterName.toLowerCase()]
          }
          
          otherCharacter.memories.push(deathAwarenessMemory)
        }
      })
      
      saveCharacterChanges()
      
      return true
    }
    return false
  }

  function resurrectCharacter(characterId, resurrectionReason = 'Miraculous revival') {
    const character = characters.value[characterId]
    if (character && character.isDead) {
      character.isDead = false
      const previousCause = character.causeOfDeath
      character.causeOfDeath = null
      character.deathTimestamp = null
      character.currentEmotion = 'confused'
      
      // Add resurrection memory to the resurrected character
      const resurrectionMemory = {
        id: `${characterId}_resurrection_${Date.now()}`,
        timestamp: Date.now(),
        content: `Resurrected: ${resurrectionReason}. Previous death: ${previousCause}`,
        emotional_weight: 95,
        tags: ['resurrection', 'miracle', 'second chance', resurrectionReason.toLowerCase()]
      }
      character.memories.push(resurrectionMemory)
      
      // ENHANCED: Make other characters aware of the resurrection
      const characterName = character.name
      
      // Create simulation event for the resurrection
      const resurrectionEvent = {
        type: 'resurrection',
        timestamp: Date.now(),
        involvedCharacters: [characterId],
        summary: `${characterName} has been resurrected: ${resurrectionReason}`,
        tone: 'miraculous',
        details: {
          character_name: characterName,
          resurrection_reason: resurrectionReason,
          previous_cause_of_death: previousCause,
          major_event: true,
          resurrection_timestamp: Date.now(),
          location: character.position ? `${character.position.x}, ${character.position.y}` : 'Unknown',
          zone: character.position?.zone || 'Unknown'
        }
      }
      
      // Add the resurrection event to simulation (if simulation store is available)
      try {
        const simulationStore = useSimulationStore?.()
        if (simulationStore && typeof simulationStore.addEvent === 'function') {
          simulationStore.addEvent(resurrectionEvent)
        }
      } catch (error) {
        console.warn('Could not create resurrection event - simulation store not available:', error)
      }
      
      // Add resurrection awareness memories to other characters
      Object.values(characters.value).forEach(otherCharacter => {
        if (otherCharacter.id !== characterId && !otherCharacter.isDead) {
          // Determine emotional weight based on relationship
          let emotionalWeight = 70 // Base weight for community member resurrection
          let relationshipContext = ''
          
          // Check if they had a relationship
          const relationship = otherCharacter.relationships?.find(rel => 
            rel.name === characterName || rel.name.toLowerCase() === characterName.toLowerCase()
          )
          
          if (relationship) {
            // Adjust weight based on relationship type (resurrections are generally more positive)
            const relationshipWeights = {
              'best_friend': 98,
              'close_friend': 90, 
              'partner': 99,
              'romantic_interest': 95,
              'family': 98,
              'friend': 85,
              'neighbor': 75,
              'colleague': 65,
              'acquaintance': 55,
              'rival': 50, // Even rivals might be surprised/impressed
              'enemy': 30  // Enemies might be disappointed
            }
            
            emotionalWeight = relationshipWeights[relationship.type] || 70
            relationshipContext = ` We ${relationship.type === 'enemy' ? 'were enemies' : relationship.type === 'rival' ? 'were rivals' : 'had a connection'}.`
          }
          
          // Create resurrection awareness memory
          const resurrectionAwarenessMemory = {
            id: `resurrection_awareness_${characterId}_${otherCharacter.id}_${Date.now()}`,
            timestamp: Date.now(),
            content: `Incredible news! ${characterName} has returned from the dead through ${resurrectionReason}. They previously died from ${previousCause}.${relationshipContext} This is miraculous and changes everything.`,
            emotional_weight: emotionalWeight,
            tags: ['resurrection', 'miracle', 'joy', 'amazement', 'second chance', characterName.toLowerCase()]
          }
          
          otherCharacter.memories.push(resurrectionAwarenessMemory)
        }
      })
      
      saveCharacterChanges()
      
      return true
    }
    return false
  }

  function duplicateCharacter(characterId, newName = null) {
    const original = characters.value[characterId]
    if (!original) return null

    const duplicate = {
      ...JSON.parse(JSON.stringify(original)), // Deep clone
      id: `${characterId}_copy_${Date.now()}`,
      name: newName || `${original.name} (Copy)`,
      position: {
        ...original.position,
        x: Math.min(49, original.position.x + 2),
        y: Math.min(36, original.position.y + 1)
      },
      memories: [], // Start with empty memories
      isDead: false,
      causeOfDeath: null,
      deathTimestamp: null
    }

    characters.value[duplicate.id] = duplicate
    saveCharacterChanges()
    
    return duplicate
  }

  async function initializeStore() {
    await loadCharacters()
  }

  return {
    // State
    characters,
    isLoaded,
    
    // Getters
    charactersList,
    getCharacter,
    getCharactersByZone,
    
    // Actions
    initializeStore,
    loadCharacters,
    updateCharacter,
    moveCharacter,
    updateCharacterEmotion,
    addMemory,
    moveCharacterToRandomPosition,
    moveCharacterToZone,
    simulateCharacterMovement,
    saveCharacterChanges,
    resetCharacters,
    createCharacter,
    deleteCharacter,
    setCharacterDead,
    resurrectCharacter,
    duplicateCharacter
  }
}) 