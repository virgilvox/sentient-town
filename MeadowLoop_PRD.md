# PRD: MeadowLoop

## Overview
**MeadowLoop** is a single-page, browser-based AI simulation where each character in a pixel-art town is driven by a persistent, personality-rich AI. The app is powered by **Claude Haiku**, and every character has a complete internal life, history, psychology, and emotional context stored in individual JSON profiles.

Users can observe, interact with, and shape the unfolding narrative through:
- **Live conversation monitoring**
- **Internal thought inspection**
- **Zone-based behavioral influence**
- **Real-time scenario injection**
- **Character editing**

No backend is required. All state changes are saved to `localStorage` and are diffed from the original character JSON and zone files.

## Architecture Summary

- **Frontend Framework:** Vue 3 (Composition API + Pinia)
- **Rendering:** Canvas-based grid on `map.png`
- **State Storage:** `localStorage` (diffed vs starter JSON)
- **Data Structure:** JSON files for characters, zones, history
- **AI:** Claude Haiku via browser-side proxy

## Layout

### Top Bar
```
[Claude Haiku API Key] [Edit Town Toggle] [Time Speed: 1x ▼] [Save All]
```

### Main Panel
```
Left:   Canvas town view with sprite movement, conversations, zone overlays (in Edit Mode)

Right:  Tabbed control panel:
  ┌────────────────────────────────────────────┐
  │ Tabs:                                       │
  │ [Character Editor] [Events] [Inject Prompt] │
  │ [Conversations] [Introspection]             │
  └────────────────────────────────────────────┘
```

## Features

### 1. Town Simulation Canvas
- 2D grid-based world using `map.png`
- Characters move, talk, and behave based on AI decisions
- Clickable characters open their details in the side panel
- In "Edit Mode", grid overlays appear and zone drawing tools activate

### 2. Character Editor (Tab 1)
- Character selector dropdown
- Editable fields:
  - Name, MBTI, traits (Big Five sliders), sexuality, desires, mental health
  - Memories (editable log)
  - Relationships (tag-based connection to others)
- Save updates `localStorage` diff

#### Example:
```json
{
  "id": "sage",
  "name": "Sage",
  "personality": "INFP",
  "occupation": "Baker",
  "traits": ["Whimsical", "Creative", "Introverted", "Mysterious"],
  "backstory": "A whimsical and creative baker who dreams of starting a midnight baking club and creating sourdough that tells stories.",
  "goals": ["Open a magical bakery", "Master sourdough artistry", "Connect with fellow introverts"],
  "location": { "x": 30, "y": 20 },
  "relationships": ["Rose", "Griff"]
}
```

### 3. Events Log (Tab 2)
- Real-time scrollable feed of Claude-generated simulation ticks
- Includes time, involved characters, event summary, tone

#### Example:
```
[15:22] Sage approached Rose and confessed they felt like their sourdough starter was lonely. Tone: whimsical
```

### 4. Inject Prompt (Tab 3)
- Field to input scenario prompt:
  - "A fire breaks out in John's house."
  - "A shadow passes over the town, and people feel uneasy."
- Target selector:
  - Global or specific character(s)
- Takes effect on the **next Claude call** during the simulation loop

#### Stored Format:
```json
{
  "type": "event_injection",
  "target": "John",
  "content": "A fire has broken out in John's house."
}
```

### 5. Conversations (Tab 4)
- Shows active and recent dialogues between characters
- Expandable log view per pair
- Filterable by participant

### 6. Introspection (Tab 5)
- Only shown if a character is selected
- Shows the **most recent internal thoughts** Claude generated for them

#### Example:
```
I'm scared I'll never connect with Griff again. Maybe he's changed. Maybe I haven't. But I still remember that night in the orchard.
```

## Zone Editing (Edit Mode On)
- Map grid overlay appears (e.g. 64x64 tiles)
- User can draw areas using:
  - Brush
  - Polygon
  - Rectangle
- Each zone has:
  - Name
  - Type (e.g. home, shop, temple)
  - Assigned character (optional)

### zones.json example:
```json
{
  "zones": [
    {
      "name": "Florist",
      "type": "shop",
      "owner": "Rose",
      "tiles": [[10,12], [10,13], [11,12], [11,13]]
    }
  ]
}
```

## Simulation Loop
- Runs every X milliseconds depending on time speed
- Each character evaluated via Claude using:
  - Location
  - Nearby characters
  - Current needs/emotions/memory state
  - Any injected event

## Data Files
```
/characters/
  └── Rose/
      ├── profile.json
      └── sprite.png

/map/
  ├── map.png
  └── zones.json

/simulation/
  ├── events.json      ← updated in-memory and localStorage
  ├── injections.json
  └── conversations.json
```

## Claude Haiku Prompt (System Instruction)
```txt
You are simulating the internal life of a character in a pixelated AI town called "MeadowLoop".

Your job is to embody a unique character in this world with personality, memory, trauma, desire, political and emotional beliefs, and deep relationships.

Each tick, simulate:
1. The character's current thoughts
2. Their mood and goals
3. A decision about what they do next (move, speak, act)
4. Any conversation they initiate or respond to

You must reflect the character's:
- MBTI and Big Five traits
- Mental health state (e.g., forgetfulness, anxiety, narcissism)
- Memories and past relationships
- Desires and unmet needs
- Relationship dynamics with others nearby

If there is an injected scenario (e.g., "a fire starts"), fold it seamlessly into their reasoning. Be subtle or dramatic depending on their personality.

Always respond in the following JSON format:

```json
{
  "internal_thoughts": "What the character is currently thinking...",
  "action": "move_to_zone / approach_character / speak / stay_idle",
  "dialogue": "Optional message said aloud, if speaking",
  "emotion": "e.g. anxious, hopeful, mischievous"
}
```

Tone is literary, slightly whimsical, emotionally honest, and character-first. Avoid clichés. Lean into idiosyncrasy.

If the character has no one nearby, they may monologue or move toward a meaningful location (e.g. their favorite tree, a bakery, a person they miss).