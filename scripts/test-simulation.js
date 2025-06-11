// MeadowLoop Headless Simulation Test Script
// Run with: node scripts/test-simulation.js
// This script tests the simulation engine, character movement, conversation, and event logging without a browser.

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import path from 'path'
import { useCharactersStore } from '../src/stores/characters.js'
import { useZonesStore } from '../src/stores/zones.js'
import { useSimulationStore } from '../src/stores/simulation.js'
import { simulationEngine } from '../src/services/simulationEngine.js'

// Minimal Vue app context for Pinia
const app = createApp({})
app.use(createPinia())

// Initialize stores
const characters = useCharactersStore()
const zones = useZonesStore()
const simulation = useSimulationStore()

async function setupTestData() {
  // Add a few test zones
  zones.zones = [
    { id: 'center', name: 'Center', type: 'public', walkable: true, tiles: [{ x: 10, y: 10 }, { x: 11, y: 10 }] },
    { id: 'home', name: 'Home', type: 'home', walkable: true, tiles: [{ x: 20, y: 8 }, { x: 20, y: 9 }] }
  ]
  // Add a few test characters
  characters.characters = {
    rose: {
      id: 'rose', name: 'Rose', MBTI: 'ENFP', bigFive: { openness: 80, conscientiousness: 60, extraversion: 70, agreeableness: 90, neuroticism: 30 },
      position: { x: 10, y: 10, zone: 'center' }, currentEmotion: 'content', desires: ['make friends'], mentalHealth: [], memories: [], relationships: [], isDead: false
    },
    john: {
      id: 'john', name: 'John', MBTI: 'ISTJ', bigFive: { openness: 40, conscientiousness: 80, extraversion: 30, agreeableness: 60, neuroticism: 50 },
      position: { x: 20, y: 8, zone: 'home' }, currentEmotion: 'happy', desires: ['explore'], mentalHealth: [], memories: [], relationships: [], isDead: false
    }
  }
  // Reset events and conversations
  simulation.events = []
  simulation.conversations = []
  simulation.state.isRunning = true
}

async function runHeadlessSimulationTest() {
  await setupTestData()
  simulationEngine.setStores({ characters, simulation, zones })
  console.log('✅ Test data initialized. Running simulation for 10 ticks...')
  for (let i = 0; i < 10; i++) {
    await simulationEngine.processTick()
  }
  // Output results
  console.log('\n=== Simulation Results ===')
  console.log('Character positions:')
  Object.values(characters.characters).forEach(c => {
    console.log(`- ${c.name}: (${c.position.x},${c.position.y})`)
  })
  const moveEvents = simulation.events.filter(e => e.type === 'movement')
  const convoEvents = simulation.events.filter(e => e.type === 'conversation')
  console.log(`\nMovement events: ${moveEvents.length}`)
  moveEvents.forEach(e => console.log(`- ${e.summary}`))
  console.log(`\nConversation events: ${convoEvents.length}`)
  convoEvents.forEach(e => console.log(`- ${e.summary}`))
  console.log('\n=== End of Test ===')
}

runHeadlessSimulationTest().catch(err => {
  console.error('❌ Test failed:', err)
  process.exit(1)
}) 