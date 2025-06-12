<template>
  <div id="app-container">
    <TopNavigationBar />
    
    <main class="main-content">
      <div class="left-panel">
        <TownCanvas ref="townCanvasRef" />
      </div>
      <div class="right-panel">
        <ControlPanel />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import TopNavigationBar from '@/components/TopNavigationBar.vue'
import TownCanvas from '@/components/TownCanvas.vue'
import ControlPanel from '@/components/ControlPanel.vue'
import { useCharactersStore, useZonesStore, useUIStore, useSimulationStore } from '@/stores'
import { simulationEngine } from './services/simulationEngine'

// Template refs
const townCanvasRef = ref(null)

// Store initialization
const characters = useCharactersStore()
const zones = useZonesStore()
const ui = useUIStore()
const simulation = useSimulationStore()

// Expose stores to window for access in services
if (typeof window !== 'undefined') {
  window.stores = {
    useCharactersStore,
    useZonesStore,
    useUIStore,
    useSimulationStore
  }
}

const isLoading = ref(true)

onMounted(async () => {
  try {
    
    // Initialize stores in proper order with dependencies
    
    // Initialize zones first (dependencies for characters)
    await zones.initializeStore()
    
    // Initialize characters (depends on zones)
    await characters.initializeStore()
    
    // Initialize simulation (depends on characters and zones)
    await simulation.initializeStore()
    
    // Initialize UI store
    ui.initializeStore()
    
    // Wait for next tick to ensure all stores are ready
    await nextTick()
    
    // Initialize and configure simulation engine with all stores
    await simulationEngine.initialize()
    
    // Check if simulation should auto-start
    if (simulation.state.isRunning) {
      await simulationEngine.start()
    } else {
    }
    
    isLoading.value = false
    
  } catch (error) {
    console.error('❌ Failed to initialize app:', error)
    isLoading.value = false
    
    // Retry after a delay
    // setTimeout(() => {
    //   console.log('🔄 Retrying app initialization...')
    //   location.reload()
    // }, 3000)
  }
})
</script>

<style>
#app-container {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  display: flex;
  height: calc(100vh - 64px);
  gap: 0;
}

.left-panel {
  position: relative;
  flex: 1;
  min-width: 0;
  background: #f8f9fa;
  border-right: 1px solid #e2e8f0;
}

.right-panel {
  width: 400px;
  background: #ffffff;
  overflow: hidden;
}

/* Mobile responsive */
@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    height: calc(100vh - 64px);
  }
  
  .left-panel {
    width: 100%;
    height: 60vh;
    min-height: 400px;
    flex: none;
  }
  
  .right-panel {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    height: 40vh;
    min-height: 300px;
    flex: none;
  }
}

@media (max-width: 768px) {
  .main-content {
    gap: 8px;
    padding: 8px;
  }
  
  .left-panel {
    height: 50vh;
    min-height: 350px;
  }
  
  .right-panel {
    height: 50vh;
    min-height: 250px;
  }
}

@media (max-width: 480px) {
  .main-content {
    gap: 6px;
    padding: 6px;
  }
  
  .left-panel {
    height: 45vh;
    min-height: 300px;
  }
  
  .right-panel {
    height: 55vh;
    min-height: 200px;
  }
}

/* Global styles for better consistency */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}

html {
  overflow: hidden;
  height: 100%;
}
</style>
