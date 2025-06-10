# Characters Directory

This directory contains all the character definitions for Sentient Town. Characters are automatically loaded from their individual folders.

## Adding New Characters

To add a new character to the game:

1. **Create a new folder** with your character's name (e.g., `/characters/Alice/`)

2. **Copy the template**: Use `template_character.json` as your starting point
   ```bash
   cp template_character.json Alice/profile.json
   ```

3. **Edit the profile.json** file with your character's details:
   - Remove the `_instructions` and `_note` fields
   - Fill in all the character information
   - Make sure the `id` field is unique
   - Set the `sprite` path to point to your character's sprite image

4. **Add a sprite image** (optional but recommended):
   - Place a `sprite.png` file in your character's folder
   - Recommended size: 32x32 pixels for pixelart style
   - Update the `sprite` field in profile.json to match

5. **Restart the application** - characters are loaded on startup

## Character Profile Fields

### Required Fields
- `id`: Unique identifier (lowercase, no spaces)
- `name`: Display name
- `age`: Character's age
- `location`: Where they live/work
- `occupation`: Their job or role
- `description`: Brief character background
- `personality`: Key traits

### Character Data
- `MBTI`: Myers-Briggs personality type
- `bigFive`: Five-factor personality scores (0-100)
- `sexuality`: Character's sexuality
- `desires`: Array of goals and aspirations
- `mentalHealth`: Array of conditions or quirks
- `memories`: Array of significant memories
- `relationships`: Array of relationships with other characters

### Game State
- `position`: Starting location (x, y, zone)
- `currentEmotion`: Current emotional state
- `sprite`: Path to character sprite image
- `isDead`: Whether character is deceased
- `causeOfDeath`: How they died (if applicable)
- `deathTimestamp`: When they died (if applicable)

## Memory Format

```json
{
  "id": "unique_memory_id",
  "timestamp": 1672531200000,
  "content": "Description of what happened",
  "emotional_weight": 75,
  "tags": ["relevant", "keywords"]
}
```

## Relationship Format

```json
{
  "name": "Other Character Name",
  "type": "friend|close_friend|family|romantic_interest|rival|enemy|acquaintance",
  "notes": "Additional context about the relationship"
}
```

## Tips

- Characters will be automatically discovered and loaded
- All fields have sensible defaults if omitted
- The character list UI will display all loaded characters
- Character data is saved/restored automatically
- You can edit characters in-game via the Character Editor tab

## Examples

See the existing character folders (Rose, Sage, Griff, John) for complete examples. 