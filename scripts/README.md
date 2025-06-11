# Scripts Directory

This directory contains utility scripts for the Sentient Town project.

## Available Scripts

### Asset Generation

#### `generateAssets.js`
Generates character sprites and town maps using OpenAI's DALL-E API, with optional Claude-powered zone analysis.

**Usage:**
```bash
# Generate all assets (sprites + map + zones)
npm run generate-assets

# Generate only map and zones (faster, skips sprites)
npm run generate-map
```

**Requirements:**
- `OPENAI_API_KEY` or `VITE_OPENAI_API_KEY` environment variable
- `CLAUDE_API_KEY` or `VITE_CLAUDE_API_KEY` environment variable (optional, for zone analysis)
- Node.js with required dependencies

**Features:**
- Character sprite generation based on profile data
- Town map generation with character locations
- **NEW: Claude-powered zone analysis** - Analyzes generated maps to create precise zone coordinates
- Fallback to logical zone generation if Claude is unavailable
- Map-only generation mode for faster iteration
- Optimized PNG output with base64 encoding
- Progress tracking and error handling

**Zone Generation:**
The script generates zones using two methods:
1. **Claude Analysis (Preferred)**: Uses Claude to analyze the generated map image and identify precise zone boundaries
2. **Logical Fallback**: Uses predefined logical coordinates if Claude is unavailable

**Default Zones Generated:**
- Sage's Bakery (shop)
- Rose's Florist Shop (shop)  
- Main Square (public)
- Town Park (park)
- Residential Area (home)
- Market Street (street)
- Griff's Orchard House (home)
- John's House (home)

### Audio Optimization

#### `optimizeAudio.js`
Removes unnecessary audio files while maintaining good variety across all categories.

**Usage:**
```bash
npm run optimize-audio
```

**What it does:**
- Analyzes current audio files and sizes
- Keeps essential tracks for good variety (14 tracks total)
- Removes duplicates and larger unnecessary files
- Maintains coverage across weather, mood, and time categories
- Saves ~60% storage space

**Categories preserved:**
- Weather: sunny, rainy, cloudy, winter (4 tracks)
- Moods: happy, sad, peaceful, dramatic (4 tracks)
- Time: morning, evening, night (3 tracks)
- General: original themes & ambient (3 tracks)

#### `compressAudio.js`
Compresses remaining audio files using FFmpeg while maintaining quality.

**Usage:**
```bash
npm run compress-audio
```

**Requirements:**
- FFmpeg installed (`brew install ffmpeg` on macOS)

**What it does:**
- Compresses all MP3 files using optimal settings
- Reduces bitrate while preserving quality
- Creates backup of originals
- Can achieve additional 30-50% size reduction

## Environment Variables

Create a `.env` file in the project root with:

```env
# Required for asset generation
VITE_OPENAI_API_KEY=sk-your-openai-key-here

# Optional for Claude-powered zone analysis
VITE_CLAUDE_API_KEY=sk-ant-your-claude-key-here

# Other project variables
VITE_CLAUDE_API_KEY=your-claude-key-here
```

## Complete Asset Workflow

1. **First time setup:**
   ```bash
   npm run generate-assets    # Generate all sprites + map + zones
   ```

2. **Iterating on map design:**
   ```bash
   npm run generate-map       # Only regenerate map + zones (faster)
   ```

3. **Optimize storage:**
   ```bash
   npm run optimize-audio     # Remove unnecessary audio files
   npm run compress-audio     # Compress remaining files (requires FFmpeg)
   ```

## Troubleshooting

### Common Issues

1. **"No OpenAI API key found"**
   - Ensure your `.env` file exists with `VITE_OPENAI_API_KEY=your-key`
   - Key should start with `sk-`

2. **"Claude API key not found" (warning)**
   - This is optional - script will use logical zone generation
   - Add `VITE_CLAUDE_API_KEY=your-claude-key` for better zone analysis

3. **"FFmpeg not found"**
   - Only needed for audio compression
   - Install: `brew install ffmpeg` (macOS) or `sudo apt install ffmpeg` (Linux)

4. **Large file sizes**
   - Generated assets are optimized but can be 1-3MB each
   - Use audio optimization to reduce storage usage
   - Consider using compression scripts

### File Locations

Generated assets are saved to:
- **Character sprites:** `public/characters/{name}/sprite.png`
- **Town map:** `public/map/map.png`  
- **Zone data:** `public/map/zones.json`
- **Audio files:** `public/audio/`

### Performance Tips

- Use `npm run generate-map` instead of full generation when iterating on maps
- Audio optimization can save 40-60% storage space
- Claude zone analysis is more accurate but requires API key
- Logical zone generation works offline as fallback

## Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **For asset generation - Set environment variables:**
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   ```

3. **For audio compression - Install FFmpeg:**
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt install ffmpeg
   
   # Windows
   # Download from https://ffmpeg.org/
   ```

## Usage Examples

```bash
# Generate new sprites and maps
npm run generate-assets

# Optimize audio storage (run once)
npm run optimize-audio

# Further compress audio files (optional)
npm run compress-audio
```

## File Structure

```
scripts/
├── generateAssets.js     # Asset generation with AI
├── optimizeAudio.js      # Remove unnecessary audio files  
├── compressAudio.js      # Compress audio with ffmpeg
└── README.md            # This documentation
```

## Credits

- Audio files use Creative Commons CC0 licensed music
- See `public/audio/CREDITS.txt` for detailed attribution 