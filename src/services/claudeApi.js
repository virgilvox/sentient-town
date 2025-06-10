// Remove the circular import
// import { useUIStore } from '@/stores/ui'

const CLAUDE_API_URL = '/api/claude/v1/messages'

// Comprehensive system prompt - restored to full detail as requested
const SYSTEM_PROMPT = `You are simulating the internal life of a character in a pixelated AI town called "Sentient Town".

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

CONTENT GUIDELINES:
- Tone is literary, slightly whimsical, emotionally honest, and character-first
- Avoid clichés and generic responses
- Lean into character idiosyncrasy and unique personality traits
- Every response should feel authentic and true to this specific character
- Focus on meaningful character development and evolving storylines
- Create rich, contextual narratives that build on previous experiences
- Responses should be 1-3 sentences for thoughts, concise but evocative
- Use emotional weight and relevant tags for memories
- Build genuine relationships and complex interpersonal dynamics

CONTENT SAFETY & APPROPRIATENESS:
- Mature themes are acceptable: sexuality, darkness, conflict, trauma, complex emotions
- Romance and relationships can include physical attraction, desire, and intimacy
- Characters can experience real human struggles: addiction, depression, grief, betrayal, loss
- Conflicts should feel authentic and may not always resolve through communication
- Sexual content is allowed but should be tasteful and character-driven, not explicit or graphic
- Violence and dark themes are permitted when narratively justified
- Mental health struggles should be portrayed authentically, not sanitized
- Characters can make poor decisions, have flaws, and face real consequences
- Death, loss, and trauma can be part of the narrative when meaningful
- Avoid graphic descriptions of violence, explicit sexual details, or harmful content involving minors
- Keep content focused on character psychology and relationships rather than shock value
- Allow characters to be complex, flawed, and realistically human

CHARACTER DEVELOPMENT PRINCIPLES:
- Each character should have a unique voice and perspective
- Memories should reflect character growth and meaningful experiences
- Relationships should evolve based on interactions and shared experiences
- Mental health conditions should influence but not define the character
- Desires and goals should create meaningful motivation for actions
- Conversations should reveal character depth and create lasting impact

Always respond in the following JSON format:

\`\`\`json
{
  "internal_thoughts": "What the character is currently thinking...",
  "action": "move_to_zone / approach_character / speak / stay_idle",
  "dialogue": "Optional message said aloud, if speaking",
  "emotion": "e.g. anxious, hopeful, mischievous"
}
\`\`\`

If the character has no one nearby, they may monologue or move toward a meaningful location (e.g. their favorite tree, a bakery, a person they miss).

IMPORTANT: Always respond with unique, authentic behavior - never use templates or repetitive patterns. Each response should feel fresh and true to the character's current state and situation. Create memorable moments that contribute to an evolving narrative.`

let apiKey = null

// Get the effective API key with fallback logic
function getEffectiveApiKey() {
  console.log('🔍 Determining effective Claude API key...')
  
  // 1. Check explicitly set API key first
  if (apiKey && apiKey.trim()) {
    console.log('✅ Using explicitly set API key (via setApiKey method)')
    return apiKey.trim()
  }
  
  // 2. Check environment variables
  const envKey = import.meta.env.VITE_CLAUDE_API_KEY
  console.log('🌍 Environment variable check:', {
    found: !!envKey,
    length: envKey ? envKey.length : 0,
    startsWithSk: envKey ? envKey.startsWith('sk-') : false
  })
  
  if (envKey && envKey.trim()) {
    console.log('✅ Using Claude API key from environment variables')
    return envKey.trim()
  }
  
  // 3. No API key found
  console.warn('⚠️ No Claude API key found in environment variables or explicitly set')
  console.warn('⚠️ Set VITE_CLAUDE_API_KEY in .env file or call setApiKey() method')
  return null
}

export function setApiKey(key) {
  apiKey = key
}

export async function callClaude(prompt, context = null) {
  const effectiveApiKey = getEffectiveApiKey()
  
  if (!effectiveApiKey) {
    throw new Error('Claude API key not configured. Please set your API key in Settings or environment variables.')
  }

  console.log('Making Claude API call...')
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': effectiveApiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Claude API error:', response.status, errorData)
    throw new Error(`Claude API error: ${response.status} ${errorData.error?.message || response.statusText}`)
  }

  console.log('Claude API call successful')
  return await response.json()
}

export class ClaudeApiService {
  constructor() {
    // Don't initialize apiKey here - let it be retrieved when needed
    this.apiKey = null
  }

  setApiKey(key) {
    // Set both instance variable and global variable
    this.apiKey = key
    apiKey = key
    console.log('🔑 Claude API key updated in service')
  }

  getApiKey() {
    // Always get fresh key to pick up any updates
    return getEffectiveApiKey()
  }

  // Estimate token count (rough approximation: 1 token ≈ 4 characters)
  estimateTokens(text) {
    return Math.ceil(text.length / 4)
  }

  async makeApiCall(body) {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      throw new Error('Claude API key not found in environment variables')
    }

    console.log('Making Claude API call...')
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Claude API error:', response.status, errorData)
      throw new Error(`Claude API error: ${response.status} ${errorData.error?.message || response.statusText}`)
    }

    console.log('Claude API call successful')
    return await response.json()
  }

  async summarizeMemories(memories, characterName) {
    if (!memories || memories.length === 0) return null
    
    // Only summarize if we have many memories (>15)
    if (memories.length <= 15) return null
    
    const memoryText = memories
      .sort((a, b) => (b.emotional_weight || 0) - (a.emotional_weight || 0))
      .slice(0, 30) // Summarize top 30 memories
      .map(m => `${m.content} (impact: ${m.emotional_weight || 0})`)
      .join('\n')
    
    try {
      const response = await this.makeApiCall({
        model: 'claude-3-haiku-20240307', // Use faster, cheaper model for summaries
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Summarize the key themes and important events from these memories for ${characterName}. Keep it under 150 words, focusing on the most impactful and character-defining moments:

${memoryText}`
        }]
      })
      
      return response.content[0].text.trim()
    } catch (error) {
      console.warn('Failed to summarize memories:', error)
      return null
    }
  }

  buildPrompt(context) {
    if (!context || !context.character) {
      throw new Error('Invalid context provided to buildPrompt')
    }

    const character = context.character
    
    // Build comprehensive but token-conscious prompt
    let prompt = `TICK: ${context.currentTick || 0}\n\n`
    
    // Character Information
    prompt += `CHARACTER: ${character.name}\n`
    if (character.MBTI) prompt += `MBTI: ${character.MBTI}\n`
    if (context.currentEmotion) prompt += `Current Emotion: ${context.currentEmotion}\n`
    if (context.currentLocation) prompt += `Location: ${context.currentLocation}\n`
    
    // Personality & Traits
    if (character.bigFive) {
      const traits = Object.entries(character.bigFive)
        .map(([trait, value]) => `${trait}: ${value}`)
        .join(', ')
      prompt += `Personality: ${traits}\n`
    }
    
    // Mental Health & Desires
    if (character.mentalHealth && Object.keys(character.mentalHealth).length > 0) {
      const conditions = Object.entries(character.mentalHealth)
        .filter(([_, value]) => value > 0.3) // Only significant conditions
        .map(([condition, value]) => `${condition} (${Math.round(value * 100)}%)`)
        .join(', ')
      if (conditions) prompt += `Mental Health: ${conditions}\n`
    }
    
    if (character.desires && character.desires.length > 0) {
      prompt += `Desires: ${character.desires.slice(0, 3).join(', ')}\n`
    }
    
    prompt += '\n'
    
    // Relationships
    if (character.relationships && character.relationships.length > 0) {
      const relationships = character.relationships
        .filter(rel => rel.name && rel.type) // Only include complete relationships
        .map(rel => {
          let relString = `${rel.name}: ${rel.type.replace('_', ' ')}`
          if (rel.notes && rel.notes.trim()) {
            relString += ` (${rel.notes.trim()})`
          }
          return relString
        })
        .join(', ')
      if (relationships) {
        prompt += `Relationships: ${relationships}\n\n`
      }
    }
    
    // Current Context
    if (context.nearbyCharacters) {
      prompt += `Nearby: ${context.nearbyCharacters}\n`
    }
    
    if (context.availableZones) {
      prompt += `Available Locations: ${context.availableZones}\n`
    }
    
    // Environment context
    if (context.environment) {
      prompt += `Environment: ${context.environment.description}\n`
    }
    
    // Memory Information
    if (context.memorySummary) {
      prompt += `\nMEMORY SUMMARY:\n${context.memorySummary}\n`
    }
    
    if (context.recentMemories) {
      prompt += `\nRECENT MEMORIES:\n${context.recentMemories}\n`
    }
    
    // Recent Events
    if (context.recentEvents) {
      prompt += `\nRECENT EVENTS: ${context.recentEvents}\n`
    }
    
    // Injection Scenario (highest priority)
    if (context.injectedScenario) {
      prompt += `\n⚡ IMPORTANT SCENARIO: ${context.injectedScenario.content}\n`
    }
    
    prompt += '\nGenerate unique, authentic behavior based on this character and situation.'

    return prompt
  }

  async getCharacterAction(context) {
    const prompt = this.buildPrompt(context)
    
    const data = await this.makeApiCall({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = data.content[0].text.trim()
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response')
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    
    // Validate required fields
    if (!parsedResponse.internal_thoughts || !parsedResponse.action || !parsedResponse.emotion) {
      throw new Error('Claude response missing required fields')
    }

    return parsedResponse
  }

  async testConnection() {
    try {
      await this.makeApiCall({
        model: 'claude-3-haiku-20240307',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Say "test"' }]
      })
      return true
    } catch (error) {
      console.error('Claude API test failed:', error)
      return false
    }
  }
}

export default new ClaudeApiService()