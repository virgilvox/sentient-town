# 🎬 Animated Sprite Sheet Implementation Plan

## 📋 Overview
Transform MeadowLoop from static character sprites to fully animated characters using sprite sheets with idle animations and smooth walking transitions.

## 🎯 Core Features
1. **Sprite Sheet Detection** - Auto-detect sprite sheets vs single images
2. **Idle Animations** - Characters subtly animate while stationary
3. **Walking Animations** - Smooth movement with directional walking sprites
4. **Backward Compatibility** - Single sprites still work as fallbacks

---

## 🗂️ Implementation Plan

### Phase 1: Sprite Sheet Detection & Loading
**Files to modify:** `TownCanvas.vue`, `stores/characters.js`, `stores/assets.js`

1. **Enhance character loading logic**:
   - Check for `spritesheet.png` vs `sprite.png` in character folders
   - Detect sprite sheet dimensions and frame count
   - Create sprite sheet metadata object

2. **Add sprite sheet configuration**:
```javascript
// Example sprite sheet config
const spriteConfig = {
  frameWidth: 32,
  frameHeight: 32,
  columns: 4,
  rows: 5,
  animations: {
    idle: { row: 0, frames: 4, fps: 2 },
    walkDown: { row: 1, frames: 4, fps: 8 },
    walkLeft: { row: 2, frames: 4, fps: 8 },
    walkRight: { row: 3, frames: 4, fps: 8 },
    walkUp: { row: 4, frames: 4, fps: 8 }
  }
}
```

### Phase 2: Animation System
**Files to modify:** `TownCanvas.vue`, `services/animationEngine.js` (new)

1. **Create Animation Engine**:
   - Frame tracking and timing
   - Animation state management (idle, walking, direction)
   - Smooth transitions between animations

2. **Character Animation State**:
```javascript
const characterAnimationState = {
  currentAnimation: 'idle',
  currentFrame: 0,
  lastFrameTime: 0,
  isMoving: false,
  direction: 'down', // down, left, right, up
  position: { x, y }, // current interpolated position
  targetPosition: { x, y } // destination position
}
```

### Phase 3: Rendering Updates
**Files to modify:** `TownCanvas.vue`

1. **Enhanced Rendering Loop**:
   - Use `requestAnimationFrame` for smooth 60fps animations
   - Render specific sprite sheet frames based on animation state
   - Handle sprite sheet cropping and positioning

2. **Frame Rendering Logic**:
```javascript
function renderCharacterFrame(character, animationState, spriteSheet) {
  const config = character.spriteConfig
  const anim = config.animations[animationState.currentAnimation]
  
  const sourceX = animationState.currentFrame * config.frameWidth
  const sourceY = anim.row * config.frameHeight
  
  ctx.drawImage(
    spriteSheet,
    sourceX, sourceY, config.frameWidth, config.frameHeight,
    characterX, characterY, renderWidth, renderHeight
  )
}
```

### Phase 4: Movement Integration
**Files to modify:** `TownCanvas.vue`, `stores/characters.js`

1. **Movement Detection**:
   - Detect when character position changes
   - Calculate movement direction (N, S, E, W, NE, NW, SE, SW)
   - Trigger appropriate walking animation

2. **Smooth Movement Interpolation**:
   - Characters smoothly slide between tiles over 1-2 seconds
   - Animation plays during movement
   - Return to idle when movement complete

### Phase 5: Idle Animations
**Files to modify:** `TownCanvas.vue`

1. **Subtle Idle Movement**:
   - Characters gently shift within their tile boundaries
   - Random small movements every 3-5 seconds
   - Breathing/swaying animations using idle frames

2. **Idle Behavior System**:
```javascript
const idleBehavior = {
  nextIdleTime: Date.now() + randomDelay(3000, 8000),
  idleOffset: { x: 0, y: 0 },
  maxIdleDistance: 8 // pixels within tile
}
```

---

## 🎨 Asset Creation Guide

### Sprite Sheet Format
- **Dimensions**: 128x160 pixels (4 columns × 5 rows, 32×32 per frame)
- **Layout**:
  - Row 0: Idle frames (4 frames)
  - Row 1: Walk down (4 frames)
  - Row 2: Walk left (4 frames) 
  - Row 3: Walk right (4 frames)
  - Row 4: Walk up (4 frames)

### AI Generation Prompt
```
Create a pixel art character sprite sheet for [CHARACTER_NAME] who is [DESCRIPTION].

TECHNICAL SPECIFICATIONS:
- Image size: 128x160 pixels (32x32 per frame)
- Layout: 4 columns x 5 rows grid
- Transparent background
- Pixel art style, clean edges, no blur
- Consistent character size across all frames

SPRITE LAYOUT (exact order required):
Row 0: Idle animation (4 frames) - subtle breathing/swaying
Row 1: Walk cycle facing down (4 frames)
Row 2: Walk cycle facing left (4 frames) 
Row 3: Walk cycle facing right (4 frames)
Row 4: Walk cycle facing up (4 frames)

CRITICAL REQUIREMENTS TO PREVENT CUTOFF:
- Character must be CENTERED in each 32x32 frame with 4-6 pixel margins on all sides
- Feet should align consistently across all frames at the same Y position
- NO parts of character should touch frame edges - leave safety margins
- Character size must be 20x26 pixels maximum within the 32x32 frame
- Head should never be higher than 6 pixels from top of frame
- Feet should never be lower than 6 pixels from bottom of frame
- Arms/weapons should never extend beyond 6 pixels from sides

ANIMATION DETAILS:
- Idle: gentle sway, blink, small movements (2 fps)
- Walk: classic 4-frame walk cycle with foot alternation (8 fps)
- Ensure smooth transitions between idle and walk states
- Character should face the correct direction for each row
- Walking frames should show clear foot movement and body rhythm

CHARACTER STYLE: [CHARACTER_DESCRIPTION] with [PERSONALITY_TRAITS], wearing [CLOTHING].

FINAL CHECK: Verify every frame shows complete character with no cutoff edges.
```

---

## 🛠️ Technical Implementation Details

### File Structure Changes
```
public/characters/[name]/
  ├── profile.json
  ├── sprite.png (fallback single sprite)
  ├── spritesheet.png (new animated sprite sheet)
  └── animation.json (sprite configuration)
```

### Animation Configuration File
```json
{
  "type": "spritesheet",
  "frameWidth": 32,
  "frameHeight": 32,
  "columns": 4,
  "rows": 5,
  "animations": {
    "idle": {
      "row": 0,
      "frames": 4,
      "fps": 2,
      "loop": true
    },
    "walkDown": {
      "row": 1,
      "frames": 4,
      "fps": 8,
      "loop": true
    },
    "walkLeft": {
      "row": 2,
      "frames": 4,
      "fps": 8,
      "loop": true
    },
    "walkRight": {
      "row": 3,
      "frames": 4,
      "fps": 8,
      "loop": true
    },
    "walkUp": {
      "row": 4,
      "frames": 4,
      "fps": 8,
      "loop": true
    }
  }
}
```

### Performance Considerations
1. **Efficient Rendering**: Only update animations when characters are visible
2. **Memory Management**: Load sprite sheets once and reuse
3. **Frame Rate Control**: Independent animation timing per character
4. **Culling**: Skip animation updates for off-screen characters

---

## 🎯 Implementation Priority

### MVP Phase (Core Animation):
1. Sprite sheet detection and loading
2. Basic idle animation (frame cycling)
3. Simple walk animation during movement
4. Fallback to single sprites for non-animated characters

### Enhanced Phase (Polish):
1. Directional walking animations
2. Smooth movement interpolation
3. Idle behavior system with random movements
4. Animation blending and transitions

### Advanced Phase (Future):
1. Emotional state animations (happy, sad, angry poses)
2. Action-specific animations (talking, working, sleeping)
3. Weather-responsive animations (shivering in cold, etc.)
4. Character interaction animations

---

## 🧪 Testing Strategy

1. **Sprite Sheet Validation**: Verify all frames load correctly
2. **Animation Timing**: Test different FPS settings for smooth motion
3. **Performance Testing**: Monitor frame rate with multiple animated characters
4. **Fallback Testing**: Ensure single sprites still work correctly
5. **Movement Testing**: Verify directional animations trigger properly

This plan provides a comprehensive roadmap for implementing rich sprite animations while maintaining backward compatibility and good performance. 