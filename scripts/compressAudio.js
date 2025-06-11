#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎵 Audio Compression Script');
console.log('============================\n');

// Check if ffmpeg is available
try {
  execSync('which ffmpeg', { stdio: 'ignore' });
} catch (error) {
  console.log('❌ FFmpeg not found! Install it first:');
  console.log('   macOS: brew install ffmpeg');
  console.log('   Ubuntu: sudo apt install ffmpeg');
  console.log('   Windows: Download from https://ffmpeg.org/\n');
  process.exit(1);
}

const audioDir = path.join(__dirname, '..', 'public', 'audio');
const tempDir = path.join(audioDir, 'temp');

// Create temp directory
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Get all MP3 files
const audioFiles = fs.readdirSync(audioDir).filter(file => 
  file.endsWith('.mp3') && fs.statSync(path.join(audioDir, file)).isFile()
);

console.log(`📊 Found ${audioFiles.length} audio files to compress\n`);

let totalOriginalSize = 0;
let totalCompressedSize = 0;
let successCount = 0;

audioFiles.forEach((file, index) => {
  const inputPath = path.join(audioDir, file);
  const tempPath = path.join(tempDir, file);
  
  try {
    const originalStats = fs.statSync(inputPath);
    totalOriginalSize += originalStats.size;
    
    console.log(`[${index + 1}/${audioFiles.length}] Processing: ${file}`);
    console.log(`   Original size: ${(originalStats.size / (1024 * 1024)).toFixed(2)}MB`);
    
    // FFmpeg compression command optimized for background music
    // - Convert to 64kbps (good quality for ambient/background music)
    // - Use libmp3lame encoder
    // - Optimize for small file size while maintaining acceptable quality
    execSync(`ffmpeg -i "${inputPath}" -b:a 64k -ac 2 -ar 44100 "${tempPath}" -y`, {
      stdio: 'ignore'
    });
    
    const compressedStats = fs.statSync(tempPath);
    totalCompressedSize += compressedStats.size;
    
    const compressionRatio = ((originalStats.size - compressedStats.size) / originalStats.size * 100);
    
    console.log(`   Compressed size: ${(compressedStats.size / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`   Compression: ${compressionRatio.toFixed(1)}% reduction\n`);
    
    successCount++;
    
  } catch (error) {
    console.log(`   ❌ Failed to compress: ${error.message}\n`);
  }
});

if (successCount > 0) {
  console.log(`📊 Compression Summary:`);
  console.log(`   Files processed: ${successCount}/${audioFiles.length}`);
  console.log(`   Original total: ${(totalOriginalSize / (1024 * 1024)).toFixed(2)}MB`);
  console.log(`   Compressed total: ${(totalCompressedSize / (1024 * 1024)).toFixed(2)}MB`);
  console.log(`   Total saved: ${((totalOriginalSize - totalCompressedSize) / (1024 * 1024)).toFixed(2)}MB`);
  console.log(`   Overall compression: ${((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100).toFixed(1)}%\n`);
  
  // Ask for confirmation to replace files
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('🔄 Replace original files with compressed versions? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\n🔄 Replacing files...');
      
      let replacedCount = 0;
      audioFiles.forEach(file => {
        const originalPath = path.join(audioDir, file);
        const compressedPath = path.join(tempDir, file);
        
        if (fs.existsSync(compressedPath)) {
          try {
            fs.copyFileSync(compressedPath, originalPath);
            console.log(`   ✅ Replaced: ${file}`);
            replacedCount++;
          } catch (error) {
            console.log(`   ❌ Failed to replace ${file}: ${error.message}`);
          }
        }
      });
      
      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      console.log(`\n✨ Compression complete!`);
      console.log(`   Replaced ${replacedCount} files`);
      console.log(`   Saved ${((totalOriginalSize - totalCompressedSize) / (1024 * 1024)).toFixed(2)}MB total`);
      console.log(`\n🎵 Audio quality optimized for background music while maintaining clarity!`);
      
    } else {
      console.log('\n❌ Keeping original files, cleaning up temp directory');
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    rl.close();
  });
  
} else {
  console.log('❌ No files were successfully compressed');
  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
} 