#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎵 Audio Optimization Script');
console.log('============================\n');

const audioDir = path.join(__dirname, '..', 'public', 'audio');

// Files to KEEP (essential tracks for good variety)
const filesToKeep = [
  // Weather variety (4 files)
  'sunny-village.mp3',      // 1.3MB - sunny weather
  'rain-drops.mp3',         // 1.3MB - rainy weather  
  'cloudy-afternoon.mp3',   // 1.3MB - cloudy weather
  'snowfall-quiet.mp3',     // 1.3MB - winter weather
  
  // Mood variety (4 files)
  'festival-day.mp3',       // 2.4MB - happy mood
  'lonely-streets.mp3',     // 2.4MB - sad mood
  'garden-sanctuary.mp3',   // 1.3MB - peaceful mood
  'tension-rising.mp3',     // 1.3MB - dramatic mood
  
  // Time of day variety (3 files)
  'dawn-chorus.mp3',        // 2.4MB - morning
  'twilight-hours.mp3',     // 1.3MB - evening
  'midnight-town.mp3',      // 2.4MB - night
  
  // Original/General tracks (3 files)
  'town-theme-rpg.mp3',     // 1.3MB - original RPG theme
  'calm-ambient.mp3',       // 2.4MB - peaceful fallback
  'ambience.mp3',           // 3.4MB - general ambience
  
  // Keep credits file
  'CREDITS.txt'
];

// Get all current audio files
const allFiles = fs.readdirSync(audioDir);
const audioFiles = allFiles.filter(file => file.endsWith('.mp3'));

console.log(`📊 Current state:`);
console.log(`   Total files: ${audioFiles.length} audio files`);

// Calculate current total size
let totalCurrentSize = 0;
audioFiles.forEach(file => {
  const filePath = path.join(audioDir, file);
  const stats = fs.statSync(filePath);
  totalCurrentSize += stats.size;
});

console.log(`   Total size: ${(totalCurrentSize / (1024 * 1024)).toFixed(1)}MB\n`);

// Files to remove
const filesToRemove = audioFiles.filter(file => !filesToKeep.includes(file));

console.log(`🗑️  Files to remove (${filesToRemove.length}):`);
let totalRemovedSize = 0;

filesToRemove.forEach(file => {
  const filePath = path.join(audioDir, file);
  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
  totalRemovedSize += stats.size;
  console.log(`   ❌ ${file} (${sizeMB}MB)`);
});

console.log(`\n📊 After optimization:`);
console.log(`   Keeping: ${filesToKeep.filter(f => f.endsWith('.mp3')).length} audio files`);
console.log(`   Removing: ${filesToRemove.length} files`);
console.log(`   Size reduction: ${(totalRemovedSize / (1024 * 1024)).toFixed(1)}MB`);
console.log(`   New total: ${((totalCurrentSize - totalRemovedSize) / (1024 * 1024)).toFixed(1)}MB`);

// Ask for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\n⚠️  Do you want to proceed with removing these files? (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log('\n🗑️  Removing files...');
    
    let removedCount = 0;
    filesToRemove.forEach(file => {
      try {
        const filePath = path.join(audioDir, file);
        fs.unlinkSync(filePath);
        console.log(`   ✅ Removed: ${file}`);
        removedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to remove ${file}: ${error.message}`);
      }
    });
    
    console.log(`\n✨ Optimization complete!`);
    console.log(`   Removed ${removedCount} files`);
    console.log(`   Saved ${(totalRemovedSize / (1024 * 1024)).toFixed(1)}MB of storage`);
    console.log(`\n🎵 Remaining tracks provide excellent variety across:`);
    console.log(`   - Weather conditions (sunny, rainy, cloudy, winter)`);
    console.log(`   - Moods (happy, sad, peaceful, dramatic)`);
    console.log(`   - Times of day (morning, evening, night)`);
    console.log(`   - General/ambient tracks`);
    
    console.log(`\n💡 Optional: Install ffmpeg for further compression:`);
    console.log(`   brew install ffmpeg  # macOS`);
    console.log(`   Then run: npm run compress-audio`);
    
  } else {
    console.log('\n❌ Operation cancelled');
  }
  
  rl.close();
}); 