import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSimulationStore = defineStore('simulation', () => {
  // State
  const events = ref([])
  const conversations = ref([])
  const injections = ref([])
  const environment = ref({
    weather: 'clear',
    temperature: 20, // Celsius
    season: 'spring',
    timeOfDay: 'day',
    lastWeatherUpdate: Date.now(),
    weatherHistory: []
  })
  const state = ref({
    isRunning: false,
    timeSpeed: 1,
    currentTick: 0,
    lastUpdateTime: Date.now()
  })
  const isLoaded = ref(false)

  // Weather and environment functions
  function updateEnvironment() {
    const now = Date.now()
    const currentHour = new Date().getHours()
    
    // Update time of day based on real time
    let timeOfDay = 'day'
    if (currentHour >= 5 && currentHour < 12) timeOfDay = 'morning'
    else if (currentHour >= 12 && currentHour < 18) timeOfDay = 'day'
    else if (currentHour >= 18 && currentHour < 22) timeOfDay = 'evening'
    else timeOfDay = 'night'
    
    // Update season based on current month
    const currentMonth = new Date().getMonth() + 1
    let season = 'spring'
    if (currentMonth >= 3 && currentMonth <= 5) season = 'spring'
    else if (currentMonth >= 6 && currentMonth <= 8) season = 'summer'
    else if (currentMonth >= 9 && currentMonth <= 11) season = 'fall'
    else season = 'winter'
    
    // Weather evolution - change weather occasionally
    const timeSinceWeatherUpdate = now - environment.value.lastWeatherUpdate
    const shouldUpdateWeather = timeSinceWeatherUpdate > 300000 // 5 minutes
    
    if (shouldUpdateWeather) {
      const currentWeather = environment.value.weather
      const weatherOptions = getWeatherOptions(season, currentWeather)
      const newWeather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)]
      
      if (newWeather !== currentWeather) {
        // Store weather history
        environment.value.weatherHistory.push({
          weather: currentWeather,
          temperature: environment.value.temperature,
          timestamp: environment.value.lastWeatherUpdate,
          duration: timeSinceWeatherUpdate
        })
        
        // Keep only last 10 weather changes
        if (environment.value.weatherHistory.length > 10) {
          environment.value.weatherHistory = environment.value.weatherHistory.slice(-10)
        }
        
        environment.value.weather = newWeather
        environment.value.temperature = getTemperatureForWeather(newWeather, season)
        environment.value.lastWeatherUpdate = now
        
        console.log(`🌤️ Weather changed: ${currentWeather} → ${newWeather} (${environment.value.temperature}°C)`)
      }
    }
    
    // Update current environment
    environment.value.timeOfDay = timeOfDay
    environment.value.season = season
    
    saveToLocalStorage()
  }
  
  function getWeatherOptions(season, currentWeather) {
    const baseWeathers = ['clear', 'sunny', 'cloudy', 'overcast']
    
    // Season-specific weather additions
    if (season === 'spring') {
      return [...baseWeathers, 'rainy', 'drizzle', 'windy']
    } else if (season === 'summer') {
      return [...baseWeathers, 'hot', 'humid', 'thunderstorm']
    } else if (season === 'fall') {
      return [...baseWeathers, 'rainy', 'windy', 'foggy', 'cool']
    } else if (season === 'winter') {
      return [...baseWeathers, 'cold', 'snow', 'storm', 'freezing']
    }
    
    return baseWeathers
  }
  
  function getTemperatureForWeather(weather, season) {
    // Base temperature for season
    let baseTemp = 20
    if (season === 'spring') baseTemp = 15
    else if (season === 'summer') baseTemp = 25
    else if (season === 'fall') baseTemp = 12
    else if (season === 'winter') baseTemp = 3
    
    // Weather modifiers
    const weatherMods = {
      'sunny': 5,
      'hot': 10,
      'humid': 3,
      'clear': 2,
      'cloudy': -2,
      'overcast': -3,
      'rainy': -5,
      'drizzle': -3,
      'storm': -8,
      'thunderstorm': -6,
      'snow': -10,
      'cold': -8,
      'freezing': -15,
      'windy': -2,
      'foggy': -4,
      'cool': -5
    }
    
    const modifier = weatherMods[weather] || 0
    return Math.max(-20, Math.min(40, baseTemp + modifier + (Math.random() * 6 - 3))) // Random ±3°C
  }
  
  function setWeather(weather, temperature = null) {
    environment.value.weather = weather
    if (temperature !== null) {
      environment.value.temperature = temperature
    } else {
      environment.value.temperature = getTemperatureForWeather(weather, environment.value.season)
    }
    environment.value.lastWeatherUpdate = Date.now()
    
    console.log(`🌤️ Weather manually set: ${weather} (${environment.value.temperature}°C)`)
    saveToLocalStorage()
  }
  
  function getEnvironmentDescription() {
    const { weather, temperature, season, timeOfDay } = environment.value
    const tempDesc = temperature > 25 ? 'warm' : temperature > 15 ? 'mild' : temperature > 5 ? 'cool' : 'cold'
    
    return `${season} ${timeOfDay}, ${weather} weather, ${tempDesc} at ${Math.round(temperature)}°C`
  }

  // Getters
  const recentEvents = computed(() => {
    const sorted = [...events.value]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-50)
    
    // Debug logging
    if (events.value.length > 0) {
      console.log('📊 Recent events computed:', {
        totalEvents: events.value.length,
        recentEventsCount: sorted.length,
        latestEvent: sorted[sorted.length - 1]?.summary || 'none'
      })
    }
    
    return sorted
  })
  
  const activeConversations = computed(() => conversations.value.filter(conv => conv.isActive))
  
  const conversationsByCharacter = computed(() => (characterId) =>
    conversations.value.filter(conv => 
      conv.participants.includes(characterId)
    )
  )
  
  const pendingInjections = computed(() => injections.value.filter(inj => !inj.processed))

  const eventsByType = computed(() => (type) => events.value.filter(event => event.type === type))

  // Actions
  async function loadSimulationData() {
    try {
      // Load events
      const eventsResponse = await fetch('/simulation/events.json')
      const eventsData = await eventsResponse.json()
      events.value = eventsData.events || []

      // Load conversations
      const conversationsResponse = await fetch('/simulation/conversations.json')
      const conversationsData = await conversationsResponse.json()
      conversations.value = conversationsData.conversations || []

      // Load injections
      const injectionsResponse = await fetch('/simulation/injections.json')
      const injectionsData = await injectionsResponse.json()
      injections.value = injectionsData.injections || []

      // Load any modifications from localStorage
      loadFromLocalStorage()
      
      // Initialize environment
      updateEnvironment()
      
      isLoaded.value = true
    } catch (error) {
      console.error('Failed to load simulation data:', error)
      throw error
    }
  }

  function startSimulation() {
    state.value.isRunning = true
    state.value.lastUpdateTime = Date.now()
    updateEnvironment() // Update environment when simulation starts
    saveToLocalStorage()
  }

  function stopSimulation() {
    state.value.isRunning = false
    saveToLocalStorage()
  }

  function setTimeSpeed(speed) {
    state.value.timeSpeed = speed
    saveToLocalStorage()
  }

  function addEvent(event) {
    const newEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }
    events.value.push(newEvent)
    
    // Debug logging
    console.log('📝 Added event to simulation store:', {
      id: newEvent.id,
      type: newEvent.type,
      summary: newEvent.summary,
      totalEvents: events.value.length
    })
    
    saveToLocalStorage()
  }

  function addConversation(participants) {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newConversation = {
      id: conversationId,
      participants,
      messages: [],
      startTime: Date.now(),
      isActive: true
    }
    conversations.value.push(newConversation)
    
    // Debug logging
    console.log('💬 Added conversation to simulation store:', {
      id: conversationId,
      participants: participants,
      totalConversations: conversations.value.length,
      activeConversations: conversations.value.filter(c => c.isActive).length
    })
    
    saveToLocalStorage()
    return conversationId
  }

  function addMessage(conversationId, message) {
    const conversation = conversations.value.find(c => c.id === conversationId)
    if (conversation) {
      const newMessage = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      }
      conversation.messages.push(newMessage)
      
      // Debug logging
      console.log('📨 Added message to conversation:', {
        conversationId,
        speakerId: message.speakerId,
        messageContent: message.content?.substring(0, 50) + '...',
        totalMessages: conversation.messages.length
      })
      
      saveToLocalStorage()
    } else {
      console.error('❌ Could not find conversation to add message to:', conversationId)
    }
  }

  function endConversation(conversationId) {
    const conversation = conversations.value.find(c => c.id === conversationId)
    if (conversation && conversation.isActive) {
      conversation.isActive = false
      conversation.endTime = Date.now()
      
      // Debug logging
      console.log('🔚 Ended conversation in simulation store:', {
        id: conversationId,
        participants: conversation.participants,
        messageCount: conversation.messages.length,
        duration: Math.round((conversation.endTime - conversation.startTime) / 1000) + 's'
      })
      
      saveToLocalStorage()
    }
  }

  function addInjection(target, content) {
    const injection = {
      id: `injection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'event_injection',
      target,
      content,
      timestamp: Date.now(),
      processed: false
    }
    injections.value.push(injection)
    console.log('💫 Added injection to store:', injection)
    console.log('💫 Total injections in store:', injections.value.length)
    console.log('💫 Pending injections:', injections.value.filter(inj => !inj.processed).length)
    saveToLocalStorage()
  }

  function markInjectionProcessed(injectionId) {
    const injection = injections.value.find(inj => inj.id === injectionId)
    if (injection) {
      console.log('✅ Marking injection as processed:', {
        id: injectionId,
        target: injection.target,
        content: injection.content.substring(0, 50) + '...'
      })
      injection.processed = true
      saveToLocalStorage()
    } else {
      console.warn('❌ Could not find injection to mark as processed:', injectionId)
    }
  }

  function getNextInjectionFor(characterId) {
    const nextInjection = injections.value.find(inj => 
      !inj.processed && (inj.target === characterId || inj.target === 'global')
    ) || null
    
    if (nextInjection) {
      console.log(`🎯 Found injection for ${characterId}:`, {
        id: nextInjection.id,
        target: nextInjection.target,
        content: nextInjection.content.substring(0, 50) + '...'
      })
    }
    
    return nextInjection
  }

  function tick() {
    state.value.currentTick++
    state.value.lastUpdateTime = Date.now()
    
    // Update environment on every tick
    updateEnvironment()
    
    saveToLocalStorage()
  }

  function saveToLocalStorage() {
    const data = {
      events: events.value,
      conversations: conversations.value,
      injections: injections.value,
      environment: environment.value,
      state: state.value
    }
    localStorage.setItem('meadowloop-simulation', JSON.stringify(data))
  }

  function loadFromLocalStorage() {
    const saved = localStorage.getItem('meadowloop-simulation')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        // Replace arrays instead of merging to avoid duplicates
        if (data.events && Array.isArray(data.events)) {
          events.value = data.events
        }
        if (data.conversations && Array.isArray(data.conversations)) {
          conversations.value = data.conversations
        }
        if (data.injections && Array.isArray(data.injections)) {
          injections.value = data.injections
        }
        if (data.environment) {
          environment.value = { ...environment.value, ...data.environment }
        }
        if (data.state) {
          state.value = { ...state.value, ...data.state }
        }
      } catch (error) {
        console.error('Failed to load simulation data from localStorage:', error)
      }
    }
  }

  function resetSimulation() {
    events.value = []
    conversations.value = []
    injections.value = []
    environment.value = {
      weather: 'clear',
      temperature: 20,
      season: 'spring',
      timeOfDay: 'day',
      lastWeatherUpdate: Date.now(),
      weatherHistory: []
    }
    state.value = {
      tickCount: 0,
      isRunning: false,
      lastTickTime: null
    }
    
    console.log('🔄 Simulation data reset')
    saveToLocalStorage()
  }

  function clearHistory() {
    const beforeCount = injections.value.length
    injections.value = injections.value.filter(inj => !inj.processed)
    const afterCount = injections.value.length
    const clearedCount = beforeCount - afterCount
    
    console.log(`🗑️ Cleared ${clearedCount} processed injections from history`)
    saveToLocalStorage()
  }

  async function initializeStore() {
    await loadSimulationData()
  }

  return {
    // State
    events,
    conversations,
    injections,
    environment,
    state,
    isLoaded,

    // Getters
    recentEvents,
    activeConversations,
    conversationsByCharacter,
    pendingInjections,
    eventsByType,

    // Actions
    initializeStore,
    loadSimulationData,
    startSimulation,
    stopSimulation,
    setTimeSpeed,
    addEvent,
    addConversation,
    addMessage,
    endConversation,
    addInjection,
    markInjectionProcessed,
    getNextInjectionFor,
    tick,
    saveToLocalStorage,
    resetSimulation,
    clearHistory,
    
    // Environment actions
    updateEnvironment,
    setWeather,
    getEnvironmentDescription
  }
}) 