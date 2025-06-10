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
        
        <select v-model="currentTrackIndex" @change="changeTrack" class="track-selector">
          <option v-for="(track, index) in filteredTracks" :key="index" :value="getTrackIndex(track)">
            {{ track.title }}
          </option>
        </select>
      </div>

      <div class="auto-mode">
        <label class="auto-mode-toggle">
          <input type="checkbox" v-model="autoMode" @change="toggleAutoMode" />
          <span class="toggle-text">Auto</span>
        </label>
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
const currentTrackIndex = ref(0)
const selectedCategory = ref('')
const autoMode = ref(true)
const autoModeInterval = ref(null)
const isAutoChanging = ref(false)

// Enhanced music tracks organized by categories and moods
const tracks = ref([
  // Weather - Sunny/Clear
  {
    title: "Sunny Village Theme",
    artist: "cynicmusic",
    url: "/audio/sunny-village.mp3",
    category: "sunny",
    mood: "happy",
    weather: ["clear", "sunny"]
  },
  {
    title: "Bright Morning",
    artist: "Pro Sensory",
    url: "/audio/bright-morning.mp3",
    category: "sunny",
    mood: "content",
    weather: ["clear", "sunny"]
  },
  {
    title: "Golden Hour",
    artist: "Ambient Studio",
    url: "/audio/golden-hour.mp3",
    category: "sunny",
    mood: "peaceful",
    weather: ["clear", "sunny"]
  },

  // Weather - Rainy
  {
    title: "Rain Drops",
    artist: "Nature Sounds",
    url: "/audio/rain-drops.mp3",
    category: "rainy",
    mood: "melancholy",
    weather: ["rainy", "drizzle", "storm"]
  },
  {
    title: "Cozy Indoor",
    artist: "Ambient Collective",
    url: "/audio/cozy-indoor.mp3",
    category: "rainy",
    mood: "cozy",
    weather: ["rainy", "drizzle"]
  },
  {
    title: "Storm Winds",
    artist: "Epic Weather",
    url: "/audio/storm-winds.mp3",
    category: "rainy",
    mood: "dramatic",
    weather: ["storm", "thunderstorm"]
  },

  // Weather - Cloudy/Overcast
  {
    title: "Cloudy Afternoon",
    artist: "Peaceful Moments",
    url: "/audio/cloudy-afternoon.mp3",
    category: "cloudy",
    mood: "contemplative",
    weather: ["cloudy", "overcast"]
  },
  {
    title: "Gray Skies",
    artist: "Atmospheric",
    url: "/audio/gray-skies.mp3",
    category: "cloudy",
    mood: "neutral",
    weather: ["cloudy", "overcast"]
  },

  // Weather - Snowy/Winter
  {
    title: "Winter Village",
    artist: "Seasonal Sounds",
    url: "/audio/winter-village.mp3",
    category: "winter",
    mood: "serene",
    weather: ["snow", "cold", "winter"]
  },
  {
    title: "Snowfall Quiet",
    artist: "Winter Moods",
    url: "/audio/snowfall-quiet.mp3",
    category: "winter",
    mood: "peaceful",
    weather: ["snow", "cold"]
  },

  // Mood - Happy/Upbeat
  {
    title: "Festival Day",
    artist: "Celebration Music",
    url: "/audio/festival-day.mp3",
    category: "happy",
    mood: "joyful",
    weather: []
  },
  {
    title: "Market Bustle",
    artist: "Town Life",
    url: "/audio/market-bustle.mp3",
    category: "happy",
    mood: "energetic",
    weather: []
  },
  {
    title: "Community Gathering",
    artist: "Social Harmony",
    url: "/audio/community-gathering.mp3",
    category: "happy",
    mood: "warm",
    weather: []
  },

  // Mood - Sad/Melancholic
  {
    title: "Lonely Streets",
    artist: "Melancholy Tales",
    url: "/audio/lonely-streets.mp3",
    category: "sad",
    mood: "lonely",
    weather: []
  },
  {
    title: "Memories Lost",
    artist: "Emotional Depths",
    url: "/audio/memories-lost.mp3",
    category: "sad",
    mood: "nostalgic",
    weather: []
  },
  {
    title: "Empty Town Square",
    artist: "Sorrowful Sounds",
    url: "/audio/empty-town-square.mp3",
    category: "sad",
    mood: "melancholy",
    weather: []
  },

  // Mood - Peaceful/Calm
  {
    title: "Morning Meditation",
    artist: "Zen Garden",
    url: "/audio/morning-meditation.mp3",
    category: "peaceful",
    mood: "serene",
    weather: []
  },
  {
    title: "Gentle Breeze",
    artist: "Nature's Calm",
    url: "/audio/gentle-breeze.mp3",
    category: "peaceful",
    mood: "relaxed",
    weather: []
  },
  {
    title: "Garden Sanctuary",
    artist: "Peaceful Places",
    url: "/audio/garden-sanctuary.mp3",
    category: "peaceful",
    mood: "tranquil",
    weather: []
  },

  // Time of Day - Morning
  {
    title: "Dawn Chorus",
    artist: "Morning Sounds",
    url: "/audio/dawn-chorus.mp3",
    category: "morning",
    mood: "fresh",
    weather: []
  },
  {
    title: "Sunrise Over Town",
    artist: "Day Break",
    url: "/audio/sunrise-over-town.mp3",
    category: "morning",
    mood: "hopeful",
    weather: []
  },

  // Time of Day - Evening/Night
  {
    title: "Twilight Hours",
    artist: "Evening Moods",
    url: "/audio/twilight-hours.mp3",
    category: "evening",
    mood: "calm",
    weather: []
  },
  {
    title: "Midnight Town",
    artist: "Night Sounds",
    url: "/audio/midnight-town.mp3",
    category: "night",
    mood: "mysterious",
    weather: []
  },
  {
    title: "Starlit Village",
    artist: "Nocturne",
    url: "/audio/starlit-village.mp3",
    category: "night",
    mood: "dreamy",
    weather: []
  },

  // Dramatic/Tense
  {
    title: "Tension Rising",
    artist: "Drama Music",
    url: "/audio/tension-rising.mp3",
    category: "dramatic",
    mood: "tense",
    weather: []
  },
  {
    title: "Conflict Brewing",
    artist: "Emotional Highs",
    url: "/audio/conflict-brewing.mp3",
    category: "dramatic",
    mood: "anxious",
    weather: []
  },

  // Original tracks (maintained for backwards compatibility)
  {
    title: "Town Theme RPG",
    artist: "cynicmusic",
    url: "/audio/town-theme-rpg.mp3",
    category: "general",
    mood: "neutral",
    weather: []
  },
  {
    title: "Calm Ambient",
    artist: "cynicmusic", 
    url: "/audio/calm-ambient.mp3",
    category: "peaceful",
    mood: "calm",
    weather: []
  },
  {
    title: "Peaceful Village",
    artist: "Pro Sensory",
    url: "/audio/ambience.mp3",
    category: "peaceful",
    mood: "peaceful",
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

const currentTrack = computed(() => tracks.value[currentTrackIndex.value] || tracks.value[0])

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

function getTrackIndex(track) {
  return tracks.value.findIndex(t => t === track)
}

function togglePlayPause() {
  if (audioPlayer.value) {
    if (isPlaying.value) {
      audioPlayer.value.pause()
      // isPlaying will be set by the 'pause' event listener
    } else {
      audioPlayer.value.play().catch(error => {
        console.log('🎵 Play failed:', error.message)
        isPlaying.value = false
      })
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

function changeTrack() {
  if (audioPlayer.value) {
    const wasPlaying = isPlaying.value
    if (wasPlaying) {
      audioPlayer.value.pause()
    }
    
    // Small delay to allow audio to load
    setTimeout(() => {
      if (wasPlaying) {
        audioPlayer.value.play()
      }
    }, 100)
  }
}

function nextTrack() {
  currentTrackIndex.value = (currentTrackIndex.value + 1) % tracks.value.length
  changeTrack()
}

function onCategoryChange() {
  // When category changes, select the first track in that category
  if (filteredTracks.value.length > 0) {
    currentTrackIndex.value = getTrackIndex(filteredTracks.value[0])
    changeTrack()
  }
}

function onCanPlay() {
  if (audioPlayer.value) {
    audioPlayer.value.volume = volume.value
    audioPlayer.value.muted = isMuted.value
  }
}

function onAudioLoaded() {
  // This function is called when the audio is loaded and ready to play
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
      
      currentTrackIndex.value = newIndex
      changeTrack()
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

// Watch for track changes
watch(currentTrackIndex, () => {
  changeTrack()
})

// Initialize on mount
onMounted(async () => {
  try {
    // Start with a default peaceful track
    currentTrackIndex.value = 0
    
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
      
      // Set up event listener for when audio metadata is loaded
      audioPlayer.value.addEventListener('loadedmetadata', async () => {
        console.log('🎵 Audio metadata loaded, attempting autoplay...')
        try {
          await audioPlayer.value.play()
          // isPlaying will be set by the 'play' event listener above
          console.log('🎵 Music autoplay started successfully after metadata load')
        } catch (error) {
          console.log('🎵 Autoplay blocked by browser after metadata load, user can click play button')
          isPlaying.value = false
        }
      })
      
      // Set up event listener for when audio can start playing
      audioPlayer.value.addEventListener('canplay', async () => {
        console.log('🎵 Audio can play, attempting autoplay...')
        try {
          await audioPlayer.value.play()
          // isPlaying will be set by the 'play' event listener above
          console.log('🎵 Music autoplay started successfully')
        } catch (error) {
          console.log('🎵 Autoplay blocked by browser, user can click play button')
          isPlaying.value = false
        }
      }, { once: true })
      
      // Also try to play immediately if the audio is already ready
      if (audioPlayer.value.readyState >= 3) { // HAVE_FUTURE_DATA or better
        console.log('🎵 Audio already ready, attempting immediate autoplay...')
        try {
          await audioPlayer.value.play()
          // isPlaying will be set by the 'play' event listener above
          console.log('🎵 Music autoplay started immediately')
        } catch (error) {
          console.log('🎵 Autoplay blocked by browser, user can click play button')
          isPlaying.value = false
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