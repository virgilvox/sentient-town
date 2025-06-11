#!/usr/bin/env node
import 'dotenv/config'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useCharactersStore } from '../src/stores/characters.js'
import { useZonesStore } from '../src/stores/zones.js'
import { useSimulationStore } from '../src/stores/simulation.js'
import { useUIStore } from '../src/stores/ui.js'
import { simulationEngine } from '../src/services/simulationEngine.js'

// Mock localStorage for Node.js
import { LocalStorage } from 'node-localstorage';
global.localStorage = new LocalStorage('./scratch');

// Inject the full API URL for Node.js environment
const originalFetch = global.fetch;
global.fetch = (url, options) => {
  if (typeof url === 'string' && url.startsWith('/api/')) {
    const fullUrl = `https://api.anthropic.com${url.replace('/api/claude', '')}`;
    return originalFetch(fullUrl, options);
  }
  return originalFetch(url, options);
};

async function runSimulation() {
  console.log('--- MeadowLoop End-to-End Simulation Test ---');

  // 1. Initialize Vue/Pinia App
  const app = createApp({})
  app.use(createPinia())

  // 2. Initialize Stores
  console.log('\n--- Initializing Stores ---');
  const characters = useCharactersStore()
  const zones = useZonesStore()
  const simulation = useSimulationStore()
  const ui = useUIStore()
  await characters.initializeStore()
  await zones.initializeStore()
  await simulation.initializeStore()
  console.log(`✅ Stores initialized: ${characters.charactersList.length} chars, ${zones.zones.length} zones`);

  // 3. Setup Simulation Engine
  console.log('\n--- Setting up Simulation Engine ---');
  simulationEngine.setStores({ characters, zones, simulation, ui })
  simulationEngine.stores.ui.settings = {
    isTestMode: true,
    simulationModel: 'adaptive',
    conversationSettings: {
      frequency: 10,
      contextMode: 'rich',
      enablePromptCaching: false
    }
  }
  await simulationEngine.start()
  assert(simulationEngine.running, 'Simulation engine should be running')

  // 4. Run Simulation for a Number of Ticks
  const numTicks = 20
  console.log(`\n--- Running Simulation for ${numTicks} Ticks ---`)
  for (let i = 0; i < numTicks; i++) {
    await simulationEngine.processTick()
  }
  simulationEngine.stop()

  // 5. Assert Results
  console.log('\n--- Verifying Results ---')
  const moveEvents = simulation.events.filter(e => e.type === 'movement')
  const convoEvents = simulation.events.filter(e => e.type === 'conversation')
  
  console.log(`- Movement events found: ${moveEvents.length}`)
  console.log(`- Conversation events found: ${convoEvents.length}`)
  assert(moveEvents.length > 0, 'Should have generated at least one movement event')
  assert(convoEvents.length > 0, 'Should have generated at least one conversation event')

  console.log('\n\n🎉 --- END-TO-END SIMULATION TEST PASSED --- 🎉')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ASSERTION PASSED: ${message}`);
}

runSimulation().catch(err => {
  console.error('\n\n❌ --- SIMULATION TEST FAILED --- ❌');
  console.error(err);
  process.exit(1);
}); 