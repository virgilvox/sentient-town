<template>
  <div class="music-player" :class="{ 'auto-changing': isAutoChanging }">
    <div class="music-header">
      <h3>🎵 Ambient Music</h3>
    </div>
    <div class="music-controls">
      <button 
        @click="togglePlayPause" 
        class="play-button"
        :title="isPlaying ? 'Pause Music' : 'Play Music'"
      >
        <span v-if="isPlaying">⏸️</span>
        <span v-else>▶️</span>
      </button>
      
      <div class="track-info">
        <span class="track-title">{{ currentTrack.title }}</span>
        <span class="track-artist">{{ currentTrack.artist }}</span>
        <span class="track-category">{{ currentTrack.category }}</span>
      </div>

      <div class="volume-control">
        <button @click="toggleMute" class="volume-button" :title="isMuted ? 'Unmute' : 'Mute'">
          <span v-if="isMuted">🔇</span>
          <span v-else-if="volume > 0.7">🔊</span>
          <span v-else-if="volume > 0.3">🔉</span>
          <span v-else>🔈</span>
        </button>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          v-model="volume" 
          class="volume-slider"
          @input="updateVolume"
        />
      </div>

      <div class="track-selection">
        <select v-model="selectedCategory" @change="onCategoryChange" class="category-selector">
          <option value="">All Categories</option>
          <option v-for="category in categories" :key="category" :value="category">
            {{ getCategoryDisplayName(category) }}
          </option>
        </select>
        
        <select v-model="currentTrackId" @change="changeTrack" class="track-selector">
          <option v-for="(track, index) in filteredTracks" :key="index" :value="track.id">
            {{ track.title }}
          </option>
        </select>
      </div>

      <div class="auto-mode">
        <label class="auto-mode-toggle">
          <input type="checkbox" v-model="autoMode" @change="toggleAutoMode" />
          <span class="toggle-text">Auto</span>
        </label>
        <button 
          v-if="hasUserInteracted && autoMode" 
          @click="resetAutoMode" 
          class="reset-auto-button"
          title="Reset auto mode - allow AI to select music again"
        >
          🔄
        </button>
      </div>
    </div>

    <audio 
      ref="audioPlayer"
      :src="currentTrack.url"
      @ended="nextTrack"
      @canplaythrough="onCanPlay"
      @loadeddata="onAudioLoaded"
      autoplay
      loop
    ></audio>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { useSimulationStore } from '@/stores'

const simulation = useSimulationStore()

const audioPlayer = ref(null)
const isPlaying = ref(false)
const isMuted = ref(false)
const volume = ref(0.3) // Start at lower volume
const currentTrackId = ref('sunny-village') // Use track ID instead of index
const selectedCategory = ref('')
const autoMode = ref(true)
const autoModeInterval = ref(null)
const isAutoChanging = ref(false)

// NEW: User interaction tracking
const hasUserInteracted = ref(false)
const userHasPaused = ref(false)
const hasInitialAutoplayAttempted = ref(false)

// Enhanced music tracks organized by categories and moods - CORRECTED TO MATCH ACTUAL FILES
const tracks = ref([
  // Existing files that match the actual audio directory
  {
    id: "sunny-village",
    title: "Sunny Village Theme",
    artist: "cynicmusic",
    url: "/audio/sunny-village.mp3",
    category: "sunny",
    mood: "happy",
    weather: ["clear", "sunny"]
  },
  {
    id: "ambience",
    title: "Peaceful Village",
    artist: "Pro Sensory",
    url: "/audio/ambience.mp3",
    category: "peaceful",
    mood: "peaceful",
    weather: []
  },
  {
    id: "calm-ambient",
    title: "Gentle Calm",
    artist: "Ambient Sounds",
    url: "/audio/calm-ambient.mp3",
    category: "peaceful",
    mood: "calm",
    weather: ["clear"]
  },
  {
    id: "cloudy-afternoon",
    title: "Cloudy Afternoon",
    artist: "Peaceful Moments",
    url: "/audio/cloudy-afternoon.mp3",
    category: "cloudy",
    mood: "contemplative",
    weather: ["cloudy", "overcast"]
  },
  {
    id: "dawn-chorus",
    title: "Dawn Chorus",
    artist: "Morning Sounds",
    url: "/audio/dawn-chorus.mp3",
    category: "morning",
    mood: "fresh",
    weather: []
  },
  {
    id: "festival-day",
    title: "Festival Day",
    artist: "Celebration Music",
    url: "/audio/festival-day.mp3",
    category: "happy",
    mood: "joyful",
    weather: []
  },
  {
    id: "garden-sanctuary",
    title: "Garden Sanctuary",
    artist: "Nature's Peace",
    url: "/audio/garden-sanctuary.mp3",
    category: "peaceful",
    mood: "serene",
    weather: []
  },
  {
    id: "lonely-street",
    title: "Lonely Street",
    artist: "Melancholy Moods",
    url: "/audio/lonely-street.mp3",
    category: "sad",
    mood: "melancholy",
    weather: []
  },
  {
    id: "midnight-town",
    title: "Midnight Town",
    artist: "Night Sounds",
    url: "/audio/midnight-town.mp3",
    category: "night",
    mood: "mysterious",
    weather: []
  },
  {
    id: "rain-drops",
    title: "Rain Drops",
    artist: "Nature Sounds",
    url: "/audio/rain-drops.mp3",
    category: "rainy",
    mood: "melancholy",
    weather: ["rainy", "drizzle", "storm"]
  },
  {
    id: "snowfall-quiet",
    title: "Snowfall Quiet",
    artist: "Winter Sounds",
    url: "/audio/snowfall-quiet.mp3",
    category: "winter",
    mood: "serene",
    weather: ["snow", "cold", "winter"]
  },
  {
    id: "tension-rising",
    title: "Tension Rising",
    artist: "Dramatic Moods",
    url: "/audio/tension-rising.mp3",
    category: "dramatic",
    mood: "tense",
    weather: []
  },
  {
    id: "town-theme-rpg",
    title: "Town Theme RPG",
    artist: "cynicmusic",
    url: "/audio/town-theme-rpg.mp3",
    category: "general",
    mood: "neutral",
    weather: []
  },
  {
    id: "twilight-hours",
    title: "Twilight Hours",
    artist: "Evening Moods",
    url: "/audio/twilight-hours.mp3",
    category: "evening",
    mood: "calm",
    weather: []
  }
])

const categories = computed(() => {
  return [...new Set(tracks.value.map(track => track.category))].sort()
})

const filteredTracks = computed(() => {
  if (!selectedCategory.value) {
    return tracks.value
  }
  return tracks.value.filter(track => track.category === selectedCategory.value)
})

// FIXED: Get current track by ID instead of index
const currentTrack = computed(() => {
  const track = tracks.value.find(t => t.id === currentTrackId.value)
  return track || tracks.value[0]
})

function getCategoryDisplayName(category) {
  const displayNames = {
    sunny: '☀️ Sunny',
    rainy: '🌧️ Rainy',
    cloudy: '☁️ Cloudy',
    winter: '❄️ Winter',
    happy: '😊 Happy',
    sad: '😢 Sad',
    peaceful: '🕊️ Peaceful',
    morning: '🌅 Morning',
    evening: '🌆 Evening',
    night: '🌙 Night',
    dramatic: '🎭 Dramatic',
    general: '🎵 General'
  }
  return displayNames[category] || category
}

function togglePlayPause() {
  // Mark that user has interacted with the player
  hasUserInteracted.value = true
  
  if (audioPlayer.value) {
    if (isPlaying.value) {
      audioPlayer.value.pause()
      userHasPaused.value = true // Track that user explicitly paused
      // isPlaying will be set by the 'pause' event listener
    } else {
      audioPlayer.value.play().catch(error => {
        console.log('🎵 Play failed:', error.message)
        isPlaying.value = false
      })
      userHasPaused.value = false // User is playing again
      // isPlaying will be set by the 'play' event listener
    }
  }
}

function toggleMute() {
  if (audioPlayer.value) {
    isMuted.value = !isMuted.value
    audioPlayer.value.muted = isMuted.value
  }
}

function updateVolume() {
  if (audioPlayer.value) {
    audioPlayer.value.volume = volume.value
    if (isMuted.value && volume.value > 0) {
      isMuted.value = false
      audioPlayer.value.muted = false
    }
  }
}

// FIXED: Simple track change function that directly sets the track
function changeTrack() {
  hasUserInteracted.value = true
  console.log(`🎵 User selected track: ${currentTrack.value.title}`)
  loadTrack()
}

// FIXED: Centralized track loading function
function loadTrack() {
  if (!audioPlayer.value || !currentTrack.value) return
  
  const wasPlaying = isPlaying.value
  
  console.log(`🎵 Loading track: ${currentTrack.value.title}`)
  
  // Stop current audio completely
  audioPlayer.value.pause()
  audioPlayer.value.currentTime = 0
  
  // Force reload of the new source (Vue's reactivity will update the src)
  setTimeout(() => {
    audioPlayer.value.load()
    
    // If music was playing before, start the new track after loading
    if (wasPlaying && !userHasPaused.value) {
      const playWhenReady = () => {
        audioPlayer.value.play().catch(error => {
          console.log('🎵 Play failed after track change:', error.message)
          isPlaying.value = false
        })
      }
      
      // Wait for track to be ready
      audioPlayer.value.addEventListener('canplay', playWhenReady, { once: true })
      
      // Fallback timeout
      setTimeout(() => {
        if (!isPlaying.value && wasPlaying && !userHasPaused.value) {
          playWhenReady()
        }
      }, 500)
    }
  }, 100)
}

function nextTrack() {
  const currentIndex = tracks.value.findIndex(t => t.id === currentTrackId.value)
  const nextIndex = (currentIndex + 1) % tracks.value.length
  currentTrackId.value = tracks.value[nextIndex].id
  loadTrack()
}

function onCategoryChange() {
  // When category changes, select the first track in that category
  if (filteredTracks.value.length > 0) {
    currentTrackId.value = filteredTracks.value[0].id
    loadTrack()
  }
}

function onCanPlay() {
  if (audioPlayer.value) {
    audioPlayer.value.volume = volume.value
    audioPlayer.value.muted = isMuted.value
  }
}

function onAudioLoaded() {
  console.log('🎵 Audio loaded and ready to play')
}

// Auto mode functions
function toggleAutoMode() {
  if (autoMode.value) {
    startAutoMode()
  } else {
    stopAutoMode()
  }
}

function resetAutoMode() {
  // Reset user interaction flags to allow auto mode to work again
  hasUserInteracted.value = false
  userHasPaused.value = false
  console.log('🎵 Auto mode reset - AI can now select music automatically')
}

function startAutoMode() {
  console.log('🎵 Starting auto music mode...')
  // Check every 2 minutes for music changes (reduced frequency)
  autoModeInterval.value = setInterval(() => {
    // Only change music if simulation is running
    if (simulation.state.isRunning) {
      selectMusicBasedOnSimulation()
    } else {
      console.log('🎵 Skipping auto music selection - simulation is paused')
    }
  }, 120000) // Changed from 30000 (30s) to 120000 (2 minutes)
  
  // Immediately select appropriate music if simulation is running
  if (simulation.state.isRunning) {
    selectMusicBasedOnSimulation()
  }
}

function stopAutoMode() {
  console.log('🎵 Stopping auto music mode...')
  if (autoModeInterval.value) {
    clearInterval(autoModeInterval.value)
    autoModeInterval.value = null
  }
}

function selectMusicBasedOnSimulation() {
  if (!autoMode.value || !simulation.state.isRunning) return
  
  // Don't override if user has manually interacted with music selection recently
  if (hasUserInteracted.value) {
    console.log('🎵 Skipping auto music selection - user has manually selected music')
    return
  }
  
  // Get current simulation state
  const environment = simulation.environment || {}
  const weather = environment.weather || 'clear'
  const temperature = environment.temperature || 20
  const season = environment.season || 'spring'
  const timeOfDay = getTimeOfDay()
  
  // Determine overall mood from characters
  const characters = simulation.characters || []
  const overallMood = determineOverallMood(characters)
  
  console.log('🎵 Auto music selection - Weather:', weather, 'Mood:', overallMood, 'Time:', timeOfDay)
  
  // Find appropriate tracks based on current conditions
  let suitableTracks = tracks.value.filter(track => {
    // Weather matching
    const weatherMatch = track.weather.length === 0 || track.weather.includes(weather.toLowerCase())
    
    // Mood matching  
    const moodMatch = track.mood === overallMood || 
                     (overallMood === 'neutral' && ['calm', 'peaceful', 'content'].includes(track.mood))
    
    // Time of day matching
    const timeMatch = track.category === timeOfDay || 
                     !['morning', 'evening', 'night'].includes(track.category)
    
    // Season matching (for winter specifically)
    const seasonMatch = season !== 'winter' || track.category === 'winter' || 
                       !['winter'].includes(track.category)
    
    return weatherMatch && (moodMatch || timeMatch) && seasonMatch
  })
  
  // If no suitable tracks found, use peaceful as fallback
  if (suitableTracks.length === 0) {
    suitableTracks = tracks.value.filter(track => track.category === 'peaceful')
  }
  
  // Check if current track is already suitable - don't change if it's good
  const currentTrackObj = tracks.value[currentTrackIndex.value]
  if (currentTrackObj && suitableTracks.includes(currentTrackObj)) {
    console.log('🎵 Current track is still suitable, keeping it:', currentTrackObj.title)
    return
  }
  
  // Select a random track from suitable ones
  if (suitableTracks.length > 0) {
    const randomTrack = suitableTracks[Math.floor(Math.random() * suitableTracks.length)]
    const newIndex = tracks.value.findIndex(t => t === randomTrack)
    
    if (newIndex !== currentTrackIndex.value) {
      console.log(`🎵 Auto-switching to: ${randomTrack.title} (${randomTrack.category})`)
      
      // Trigger animation for auto-change
      isAutoChanging.value = true
      setTimeout(() => {
        isAutoChanging.value = false
      }, 2000) // Animation lasts 2 seconds
      
      // Change track without marking as user interaction
      currentTrackIndex.value = newIndex
      
      // The watch function will handle the actual audio loading
    }
  }
}

function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'day'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

function determineOverallMood(characters) {
  if (!characters || characters.length === 0) return 'neutral'
  
  const emotions = characters.map(char => char.currentEmotion || 'neutral')
  const emotionCounts = emotions.reduce((acc, emotion) => {
    acc[emotion] = (acc[emotion] || 0) + 1
    return acc
  }, {})
  
  // Map character emotions to music moods
  const emotionToMood = {
    'happy': 'joyful',
    'joyful': 'joyful',
    'content': 'content',
    'excited': 'energetic',
    'sad': 'melancholy',
    'melancholy': 'melancholy',
    'lonely': 'lonely',
    'angry': 'tense',
    'anxious': 'anxious',
    'worried': 'tense',
    'peaceful': 'peaceful',
    'calm': 'calm',
    'neutral': 'neutral'
  }
  
  // Find the most common emotion
  const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) => 
    emotionCounts[a] > emotionCounts[b] ? a : b
  )
  
  return emotionToMood[dominantEmotion] || 'neutral'
}

// Initialize on mount
onMounted(async () => {
  try {
    // Start with a default peaceful track
    currentTrackId.value = 'sunny-village'
    
    // Wait for the component to be fully mounted, then start autoplay
    await nextTick()
    
    if (audioPlayer.value) {
      audioPlayer.value.volume = volume.value
      
      // Set up event listeners for audio state changes
      audioPlayer.value.addEventListener('play', () => {
        isPlaying.value = true
        console.log('🎵 Audio started playing - button state updated')
      })
      
      audioPlayer.value.addEventListener('pause', () => {
        isPlaying.value = false
        console.log('🎵 Audio paused - button state updated')
      })
      
      audioPlayer.value.addEventListener('ended', () => {
        isPlaying.value = false
        console.log('🎵 Audio ended - button state updated')
      })
      
      // Only attempt autoplay once when the component mounts
      if (!hasInitialAutoplayAttempted.value) {
        hasInitialAutoplayAttempted.value = true
        
        // Set up event listener for when audio metadata is loaded
        audioPlayer.value.addEventListener('loadedmetadata', async () => {
          if (!hasUserInteracted.value && !userHasPaused.value) {
            console.log('🎵 Audio metadata loaded, attempting initial autoplay...')
            try {
              await audioPlayer.value.play()
              console.log('🎵 Initial autoplay started successfully after metadata load')
            } catch (error) {
              console.log('🎵 Initial autoplay blocked by browser, user can click play button')
              isPlaying.value = false
            }
          }
        })
        
        // Set up event listener for when audio can start playing
        audioPlayer.value.addEventListener('canplay', async () => {
          if (!hasUserInteracted.value && !userHasPaused.value) {
            console.log('🎵 Audio can play, attempting initial autoplay...')
            try {
              await audioPlayer.value.play()
              console.log('🎵 Initial autoplay started successfully')
            } catch (error) {
              console.log('🎵 Initial autoplay blocked by browser, user can click play button')
              isPlaying.value = false
            }
          }
        }, { once: true })
        
        // Also try to play immediately if the audio is already ready
        if (audioPlayer.value.readyState >= 3) { // HAVE_FUTURE_DATA or better
          if (!hasUserInteracted.value && !userHasPaused.value) {
            console.log('🎵 Audio already ready, attempting immediate initial autoplay...')
            try {
              await audioPlayer.value.play()
              console.log('🎵 Initial autoplay started immediately')
            } catch (error) {
              console.log('🎵 Initial autoplay blocked by browser, user can click play button')
              isPlaying.value = false
            }
          }
        }
      }
      
      // Check current playing state and sync button
      // This handles cases where audio might already be playing
      setTimeout(() => {
        if (audioPlayer.value && !audioPlayer.value.paused) {
          isPlaying.value = true
          console.log('🎵 Detected audio already playing, syncing button state')
        }
      }, 100)
    }
    
    startAutoMode()
  } catch (error) {
    console.error('Error initializing music player:', error)
  }
})

// Cleanup when component unmounts
onUnmounted(() => {
  stopAutoMode()
})

// Music control functions
async function startMusic() {
  if (audioPlayer.value) {
    try {
      await audioPlayer.value.play()
      isPlaying.value = true
      console.log('🎵 Music started successfully')
    } catch (error) {
      console.log('🎵 Could not start music automatically:', error.message)
      throw error
    }
  }
}

// Listen for autoplay events when user is not interacting
watch(autoMode, (newVal) => {
  clearInterval(autoModeInterval.value)
  
  if (newVal) {
    // Start auto mode with 3-4 minute intervals
    autoModeInterval.value = setInterval(() => {
      if (!hasUserInteracted.value || (!isPlaying.value && !userHasPaused.value)) {
        console.log('🎵 Auto-changing track...')
        isAutoChanging.value = true
        nextTrack()
        
        setTimeout(() => {
          isAutoChanging.value = false
        }, 1000)
      }
    }, 180000 + Math.random() * 60000) // 3-4 minutes
  }
})
</script>

<style scoped>
.music-player {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
  backdrop-filter: blur(10px);
}

.music-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.play-button {
  background: linear-gradient(135deg, #007bff, #0056b3);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
  color: white;
}

.play-button:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.track-info {
  display: flex;
  flex-direction: column;
  min-width: 120px;
  max-width: 160px;
}

.track-title {
  font-size: 12px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 10px;
  color: #6c757d;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-category {
  font-size: 9px;
  color: #28a745;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.volume-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.volume-button:hover {
  opacity: 1;
}

.volume-slider {
  width: 60px;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #007bff;
  border-radius: 50%;
  border: none;
  cursor: pointer;
}

.track-selection {
  display: flex;
  gap: 4px;
}

.category-selector,
.track-selector {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  color: #495057;
  cursor: pointer;
}

.category-selector {
  min-width: 100px;
}

.track-selector {
  min-width: 120px;
}

.category-selector:focus,
.track-selector:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
}

.auto-mode {
  display: flex;
  align-items: center;
}

.auto-mode-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 11px;
  color: #495057;
}

.auto-mode-toggle input[type="checkbox"] {
  width: 12px;
  height: 12px;
}

.toggle-text {
  user-select: none;
}

.reset-auto-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.reset-auto-button:hover {
  opacity: 1;
}

/* Responsive design */
@media (max-width: 1024px) {
  .track-info {
    min-width: 100px;
    max-width: 120px;
  }
  
  .category-selector {
    min-width: 80px;
  }
  
  .track-selector {
    min-width: 100px;
  }
}

@media (max-width: 768px) {
  .track-info {
    display: none;
  }
  
  .volume-control {
    display: none;
  }
  
  .category-selector,
  .track-selector {
    min-width: 70px;
    font-size: 10px;
  }
}

/* Auto-changing animation */
.music-player.auto-changing {
  animation: musicChange 2s ease-in-out;
  border-color: #28a745;
  box-shadow: 0 4px 16px rgba(40, 167, 69, 0.3);
}

@keyframes musicChange {
  0% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  25% {
    transform: scale(1.02);
    box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
  }
  50% {
    transform: scale(1.01);
    box-shadow: 0 8px 24px rgba(40, 167, 69, 0.5);
  }
  75% {
    transform: scale(1.02);
    box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 4px 16px rgba(40, 167, 69, 0.3);
  }
}

/* Music header styling */
.music-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 12px;
}

.music-header h3 {
  margin: 0;
  font-size: 14px;
  color: #2c3e50;
  font-weight: 600;
}
</style> 