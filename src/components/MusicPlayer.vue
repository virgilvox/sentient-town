<template>
  <div class="music-player">
    <!-- Track Info & Controls -->
    <div class="player-main">
      <div class="track-info">
        <div class="track-name">{{ currentTrackName }}</div>
        <div class="track-status">{{ trackStatus }}</div>
      </div>
      
      <div class="player-controls">
        <button 
          @click="togglePlayPause" 
          class="play-btn" 
          :disabled="!currentTrack || allTracksUnavailable"
        >
          <span class="play-icon">{{ isPlaying ? '⏸️' : '▶️' }}</span>
        </button>
        
        <div class="volume-control">
          <span class="volume-icon">🔊</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.1" 
            v-model="volume" 
            @input="updateVolume"
            class="volume-slider"
          />
          <span class="volume-display">{{ Math.round(volume * 100) }}%</span>
        </div>
      </div>
    </div>

    <!-- Track Selection (Compact) -->
    <div class="track-selector">
      <select 
        v-model="selectedTrackIndex" 
        @change="onTrackChange" 
        class="track-dropdown"
        :disabled="allTracksUnavailable"
      >
        <option value="auto" v-if="!allTracksUnavailable">🎵 Auto</option>
        <option v-if="allTracksUnavailable" disabled>No music available</option>
        <option 
          v-for="(track, index) in musicTracks" 
          :key="index" 
          :value="index"
        >
          {{ track.name }}
        </option>
      </select>
    </div>

    <!-- Hidden audio element -->
    <audio 
      ref="audioElement" 
      @ended="handleTrackEnd" 
      @loadstart="handleLoadStart"
      @canplay="handleCanPlay"
      @error="handleError"
      preload="none"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useAssetStore } from '@/stores/assets'
import { useSimulationStore } from '@/stores/simulation'

const assets = useAssetStore()
const simulation = useSimulationStore()

// Audio state
const audioElement = ref(null)
const isPlaying = ref(false)
const volume = ref(0.3)
const selectedTrackIndex = ref('auto')
const isLoading = ref(false)
const hasError = ref(false)
const currentAutoTrack = ref(0)

// Computed properties
const musicTracks = computed(() => assets.musicTracks || [])
const allTracksUnavailable = computed(() => musicTracks.value.length === 0);

const currentTrack = computed(() => {
  if (allTracksUnavailable.value) return null;
  if (selectedTrackIndex.value === 'auto') {
    return musicTracks.value[currentAutoTrack.value] || null;
  }
  const index = parseInt(selectedTrackIndex.value, 10);
  if (!isNaN(index) && index >= 0 && index < musicTracks.value.length) {
    return musicTracks.value[index];
  }
  return null;
});

const currentTrackName = computed(() => currentTrack.value?.name || 'No music available');
const trackStatus = computed(() => {
  if (allTracksUnavailable.value) return 'Unavailable';
  if (isLoading.value) return 'Loading...';
  if (hasError.value) return 'Error';
  return isPlaying.value ? 'Playing' : 'Paused';
});

// --- Core Audio Functions ---

function loadTrack(track) {
  if (!audioElement.value || !track || !track.url) {
    console.warn('Cannot load track, invalid data', { track });
    return;
  }
  hasError.value = false;
  isLoading.value = true;
  audioElement.value.src = track.url;
  audioElement.value.volume = volume.value;
  audioElement.value.load();
}

function playMusic() {
  if (!audioElement.value || !audioElement.value.src || !currentTrack.value) {
    console.warn('Play called but no source is loaded.');
    return;
  }
  const playPromise = audioElement.value.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        isPlaying.value = true;
        hasError.value = false;
      })
      .catch(handleError);
  }
}

function pauseMusic() {
  if (audioElement.value) {
    audioElement.value.pause();
    isPlaying.value = false;
  }
}

// --- User Interaction Handlers ---

function togglePlayPause() {
  if (isPlaying.value) {
    pauseMusic();
  } else {
    if (currentTrack.value) {
      if (audioElement.value.src !== currentTrack.value.url) {
        loadTrack(currentTrack.value);
      }
      playMusic();
    } else if (musicTracks.value.length > 0) {
      // First play, load the first track
      loadTrack(musicTracks.value[0]);
      playMusic();
    } else {
      console.warn("No tracks available to play.");
    }
  }
}

function onTrackChange() {
  const wasPlaying = isPlaying.value;
  pauseMusic();
  nextTick(() => {
    if (currentTrack.value) {
      loadTrack(currentTrack.value);
      if (wasPlaying) {
        // Play will be triggered by 'canplay' event handler
        isPlaying.value = true;
      }
    }
  });
}

function updateVolume() {
  if (audioElement.value) {
    audioElement.value.volume = volume.value;
  }
}

// --- Audio Element Event Handlers ---

function handleTrackEnd() {
  isPlaying.value = false;
  if (selectedTrackIndex.value === 'auto' && musicTracks.value.length > 1) {
    currentAutoTrack.value = (currentAutoTrack.value + 1) % musicTracks.value.length;
    nextTick(() => {
      if (currentTrack.value) {
        loadTrack(currentTrack.value);
        playMusic();
      }
    });
  }
}

function handleLoadStart() {
  isLoading.value = true;
  hasError.value = false;
}

function handleCanPlay() {
  isLoading.value = false;
  if (isPlaying.value) {
    playMusic();
  }
}

function handleError(error) {
  console.warn('🎵 Audio error:', { track: currentTrack.value?.name, error });
  isLoading.value = false;
  hasError.value = true;
  isPlaying.value = false;
}

// --- Lifecycle and Theme Sync ---
let themeCheckInterval = null;

function updateAutoTrackBasedOnTheme() {
  if (selectedTrackIndex.value !== 'auto' || musicTracks.value.length <= 1) return

  const now = Date.now()
  if (now - (themeCheckInterval?.lastCheck || 0) < 30000) return
  if(themeCheckInterval) themeCheckInterval.lastCheck = now
  
  const environment = simulation.environment || {}
  const timeOfDay = environment.timeOfDay || 'day'
  const weather = environment.weather || 'sunny'
  
  let targetTrackIndex = 0;
  if (timeOfDay === 'night' || timeOfDay === 'evening') {
    targetTrackIndex = Math.floor(musicTracks.value.length * 0.7);
  } else if (timeOfDay === 'dawn' || timeOfDay === 'morning') {
    targetTrackIndex = 0;
  } else {
    targetTrackIndex = Math.floor(musicTracks.value.length * 0.3);
  }
  
  if (weather === 'rainy' && targetTrackIndex < musicTracks.value.length - 1) {
    targetTrackIndex += 1;
  }

  if (currentAutoTrack.value !== targetTrackIndex) {
    currentAutoTrack.value = targetTrackIndex
    if (isPlaying.value) {
      nextTick(() => loadTrack(currentTrack.value));
    }
  }
}

onMounted(() => {
  themeCheckInterval = setInterval(updateAutoTrackBasedOnTheme, 30000);
});

onUnmounted(() => {
  pauseMusic();
  if (themeCheckInterval) {
    clearInterval(themeCheckInterval);
  }
});
</script>

<style scoped>
.music-player {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-width: 320px;
}

.player-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.track-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
}

.track-name {
  font-size: 13px;
  font-weight: 600;
  color: #2d3748;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.track-status {
  font-size: 11px;
  color: #718096;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.play-btn {
  background: #4299e1;
  border: none;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.play-btn:hover:not(:disabled) {
  background: #3182ce;
  transform: scale(1.05);
}

.play-btn:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
  transform: none;
}

.play-icon {
  font-size: 14px;
  color: white;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.volume-icon {
  font-size: 12px;
  color: #718096;
}

.volume-slider {
  width: 60px;
  height: 3px;
  border-radius: 2px;
  background: #e2e8f0;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4299e1;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4299e1;
  border: none;
  cursor: pointer;
}

.volume-display {
  font-size: 10px;
  color: #718096;
  min-width: 28px;
  text-align: right;
}

.track-selector {
  flex-shrink: 0;
}

.track-dropdown {
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #2d3748;
  font-size: 12px;
  cursor: pointer;
  min-width: 100px;
  max-width: 120px;
}

.track-dropdown:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .music-player {
    min-width: 280px;
    padding: 6px 10px;
  }
  
  .track-info {
    min-width: 100px;
  }
  
  .track-name {
    max-width: 100px;
    font-size: 12px;
  }
  
  .volume-slider {
    width: 50px;
  }
  
  .track-dropdown {
    min-width: 80px;
    max-width: 100px;
  }
}

@media (max-width: 480px) {
  .music-player {
    flex-direction: column;
    gap: 8px;
    min-width: 250px;
  }
  
  .player-main {
    width: 100%;
  }
  
  .track-selector {
    width: 100%;
  }
  
  .track-dropdown {
    width: 100%;
    max-width: none;
  }
}
</style> 