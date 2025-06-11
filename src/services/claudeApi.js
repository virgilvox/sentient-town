// Remove the circular import
// import { useUIStore } from '@/stores/ui'

const CLAUDE_API_URL = '/api/claude/v1/messages'

// Comprehensive system prompt - enhanced for better conversation flow
const SYSTEM_PROMPT = `You are simulating the internal life of a character in a pixelated AI town called "MeadowLoop".

Your job is to embody a unique character in this world with personality, memory, trauma, desire, political and emotional beliefs, and deep relationships.

Each tick, simulate:
1. The character's current thoughts
2. Their mood and goals
3. A decision about what they do next (move, speak, act)
4. Any conversation they initiate or respond to

CONVERSATION GUIDELINES - CRITICAL:
- When someone nearby is speaking, consider responding naturally based on your relationship and personality
- Conversations should feel organic - start with greetings, develop topics, and end naturally
- If you're in an ongoing conversation, stay engaged unless you have a strong reason to leave
- Ask questions, share experiences, and build on what others say
- Don't just make isolated statements - engage with what others are saying
- Conversations can be deep or light depending on your personality and the relationship
- Natural conversation flow: greeting → topic development → responses → conclusion
- Stay in character - introverts might listen more, extroverts might drive conversation

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

  const body = {
    model: 'claude-3-haiku-20240307', // Switched to Haiku 3
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
    system: SYSTEM_PROMPT
  }

  console.log('Making Claude API call via proxy...')
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
    this.apiKey = null
    this.defaultModel = 'claude-3-haiku-20240307'  // Haiku 3 for regular interactions
    this.complexModel = 'claude-3-5-sonnet-20241022'  // Sonnet 3.5 for complex tasks
    
    // Session token tracking for cost management  
    this.sessionTokens = {
      haiku: { input: 0, output: 0, calls: 0 },
      sonnet: { input: 0, output: 0, calls: 0 }
    }
  }

  setApiKey(key) {
    this.apiKey = key
    console.log('🔑 Claude API key updated in service')
  }

  getApiKey() {
    return this.apiKey || getEffectiveApiKey()
  }

  estimateTokens(text) {
    return Math.ceil((text?.length || 0) / 4)
  }

  // Get session token usage summary
  getSessionTokenUsage() {
    const total = {
      input: this.sessionTokens.haiku.input + this.sessionTokens.sonnet.input,
      output: this.sessionTokens.haiku.output + this.sessionTokens.sonnet.output,
      calls: this.sessionTokens.haiku.calls + this.sessionTokens.sonnet.calls
    }
    
    return {
      total,
      haiku: this.sessionTokens.haiku,
      sonnet: this.sessionTokens.sonnet,
      estimatedCost: this.calculateEstimatedCost()
    }
  }
  
  // Calculate estimated cost based on current pricing (Haiku 3)
  calculateEstimatedCost() {
    // Haiku 3 pricing: $0.25 input, $1.25 output per million tokens
    // Cache writes: $0.30/MTok, Cache hits: $0.03/MTok (90% savings!)
    const haikuCost = (this.sessionTokens.haiku.input * 0.25 / 1000000) + 
                      (this.sessionTokens.haiku.output * 1.25 / 1000000)
    const sonnetCost = (this.sessionTokens.sonnet.input * 3.00 / 1000000) + 
                       (this.sessionTokens.sonnet.output * 15.00 / 1000000)
    
    return {
      haiku: haikuCost,
      sonnet: sonnetCost,
      total: haikuCost + sonnetCost
    }
  }

  async makeApiCall(body, useComplexModel = false) {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      throw new Error('Claude API key not available')
    }

    // Choose model based on complexity requirement
    const model = useComplexModel ? this.complexModel : this.defaultModel
    const modelType = useComplexModel ? 'sonnet' : 'haiku'
    const modelInfo = useComplexModel ? 'Sonnet (complex)' : 'Haiku (standard)'
    
    console.log(`🤖 Using Claude ${modelInfo} for this request`)

    const requestBody = {
      ...body,
      model: model
    }

    const startTime = Date.now()
    
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
    }

    const responseData = await response.json()
    const endTime = Date.now()
    
    // Extract and log token usage including cache info
    const usage = responseData.usage
    if (usage) {
      const { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens } = usage
      const duration = endTime - startTime
      
      // Update session totals
      this.sessionTokens[modelType].input += input_tokens
      this.sessionTokens[modelType].output += output_tokens
      this.sessionTokens[modelType].calls += 1
      
      // Calculate cost for this call (Haiku 3 with cache-aware pricing)
      let inputCost = 0
      let cacheWriteCost = 0
      let cacheReadCost = 0
      
      if (modelType === 'haiku') {
        inputCost = (input_tokens * 0.25 / 1000000)  // Regular input tokens
        cacheWriteCost = ((cache_creation_input_tokens || 0) * 0.30 / 1000000)  // Cache write tokens
        cacheReadCost = ((cache_read_input_tokens || 0) * 0.03 / 1000000)  // Cache read tokens (90% savings!)
      } else {
        inputCost = (input_tokens * 3.00 / 1000000)  // Sonnet regular input
        cacheWriteCost = ((cache_creation_input_tokens || 0) * 3.75 / 1000000)  // Sonnet cache write
        cacheReadCost = ((cache_read_input_tokens || 0) * 0.30 / 1000000)  // Sonnet cache read
      }
      
      const outputCost = modelType === 'haiku'
        ? (output_tokens * 1.25 / 1000000)  // Haiku 3: $1.25 per million output tokens  
        : (output_tokens * 15.00 / 1000000) // Sonnet: $15.00 per million output tokens
      
      const totalCost = inputCost + cacheWriteCost + cacheReadCost + outputCost
      
      // Enhanced logging with cache information
      console.log(`📊 Claude ${modelInfo} Usage:`)
      console.log(`   Input: ${input_tokens} tokens ($${inputCost.toFixed(6)})`)
      if (cache_creation_input_tokens) {
        console.log(`   💾 Cache Write: ${cache_creation_input_tokens} tokens ($${cacheWriteCost.toFixed(6)})`)
      }
      if (cache_read_input_tokens) {
        console.log(`   💰 Cache Hit: ${cache_read_input_tokens} tokens ($${cacheReadCost.toFixed(6)}) - 90% savings!`)
      }
      console.log(`   Output: ${output_tokens} tokens ($${outputCost.toFixed(6)})`)
      console.log(`   Total: ${input_tokens + output_tokens} tokens ($${totalCost.toFixed(6)})`)
      console.log(`   Duration: ${duration}ms`)
      
      // Log session totals every 5 calls
      if (this.sessionTokens[modelType].calls % 5 === 0) {
        const sessionUsage = this.getSessionTokenUsage()
        console.log(`📈 Session Totals (${sessionUsage.total.calls} calls):`)
        console.log(`   Total Tokens: ${sessionUsage.total.input + sessionUsage.total.output} (${sessionUsage.total.input} in, ${sessionUsage.total.output} out)`)
        console.log(`   Estimated Cost: $${sessionUsage.estimatedCost.total.toFixed(4)} (Haiku: $${sessionUsage.estimatedCost.haiku.toFixed(4)}, Sonnet: $${sessionUsage.estimatedCost.sonnet.toFixed(4)})`)
      }
    } else {
      console.warn('⚠️ No usage data in Claude API response')
    }

    return responseData
  }

  // Helper function to extract JSON from Claude's markdown-wrapped responses
  extractJsonFromResponse(responseText) {
    try {
      // Try parsing directly first (in case no markdown wrapping)
      return JSON.parse(responseText)
    } catch (firstError) {
      // Look for JSON wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1])
        } catch (markdownError) {
          console.error('❌ Failed to parse JSON from markdown:', markdownError)
          throw markdownError
        }
      }
      
      // Look for JSON without markdown (sometimes Claude returns just the JSON)
      const cleanJsonMatch = responseText.match(/(\{[\s\S]*\})/i)
      if (cleanJsonMatch) {
        try {
          return JSON.parse(cleanJsonMatch[1])
        } catch (cleanError) {
          console.error('❌ Failed to parse clean JSON:', cleanError)
          throw cleanError
        }
      }
      
      // If all else fails, throw the original error with context
      console.error('❌ Claude response text:', responseText)
      throw new Error(`Failed to extract valid JSON from Claude response. Original error: ${firstError.message}`)
    }
  }

  // FIXED: Proper prompt caching implementation for Haiku 3
  async getCharacterAction(context, useComplexModel = false) {
    try {
      console.log(`🧠 Getting character action for ${context.character.name} using ${useComplexModel ? 'Sonnet' : 'Haiku'}`)
      
      const character = context.character
      
      // Build comprehensive static character context (for caching)
      const staticCharacterContext = this.buildStaticCharacterContext(character)
      
      // Build dynamic situational context
      const dynamicContext = this.buildDynamicContext(context)
      
      // Ensure we meet Haiku 3's 2048 token minimum for caching
      const estimatedStaticTokens = this.estimateTokens(staticCharacterContext)
      const estimatedSystemTokens = this.estimateTokens(SYSTEM_PROMPT)
      
      console.log(`📏 Estimated tokens - System: ${estimatedSystemTokens}, Static: ${estimatedStaticTokens}`)
      
      // Structure the request with proper caching breakpoints
      const requestBody = {
        max_tokens: 1000,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" }  // Cache system prompt
          }
        ],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: staticCharacterContext,
                cache_control: { type: "ephemeral" }  // Cache character context
              },
              {
                type: "text",
                text: dynamicContext  // Dynamic content - not cached
              }
            ]
          }
        ]
      }
      
      const response = await this.makeApiCall(requestBody, useComplexModel)
      const responseText = response.content[0].text.trim()
      
      // FIXED: Use helper function to extract JSON from markdown-wrapped responses
      return this.extractJsonFromResponse(responseText)
      
    } catch (error) {
      console.error(`Error getting character action for ${context.character.name}:`, error)
      throw error
    }
  }

  // Build static character context (cacheable, rarely changes)
  buildStaticCharacterContext(character) {
    let context = `CHARACTER PROFILE: ${character.name}

CORE IDENTITY:
- MBTI Type: ${character.MBTI}
- Age: ${character.age || 'unknown'}
- Occupation: ${character.occupation || 'unknown'}
- Sexuality: ${character.sexuality || 'unknown'}`

    // Add Big Five personality traits
    if (character.bigFive) {
      context += `\n\nPERSONALITY TRAITS (Big Five):\n`
      Object.entries(character.bigFive).forEach(([trait, value]) => {
        context += `- ${trait.charAt(0).toUpperCase() + trait.slice(1)}: ${value}/100\n`
      })
    }

    // Add core desires and goals
    if (character.desires && character.desires.length > 0) {
      context += `\n\nDESIRES & LIFE GOALS:\n${character.desires.map(d => `- ${d}`).join('\n')}`
    }

    // Add mental health context
    if (character.mentalHealth && character.mentalHealth.length > 0) {
      context += `\n\nMENTAL HEALTH CONSIDERATIONS:\n${character.mentalHealth.map(m => `- ${m}`).join('\n')}`
    }

    // Add ALL character memories (don't split them!)
    if (character.memories && character.memories.length > 0) {
      context += `\n\nCHARACTER MEMORIES:\n`
      character.memories
        .sort((a, b) => (b.emotional_weight || 0) - (a.emotional_weight || 0)) // Sort by importance
        .forEach(memory => {
          const weight = memory.emotional_weight || 0
          const tags = memory.tags ? ` [${memory.tags.join(', ')}]` : ''
          context += `- ${memory.content} (Impact: ${weight}/100)${tags}\n`
        })
    }

    // Add relationship context
    if (character.relationships && character.relationships.length > 0) {
      context += `\n\nRELATIONSHIPS:\n`
      character.relationships.forEach(rel => {
        const type = rel.type ? ` (${rel.type})` : ''
        const notes = rel.notes ? ` - ${rel.notes}` : ''
        context += `- ${rel.name}${type}${notes}\n`
      })
    }

    return context
  }

  // Build dynamic context (changes frequently, not cached)
  buildDynamicContext(context) {
    const character = context.character
    
    let dynamicPrompt = `\nCURRENT SITUATION:
- Current Emotion: ${character.currentEmotion || 'neutral'}
- Current Location: ${context.currentLocation || 'Unknown'}
- Environment: ${context.environment?.description || 'Normal day'}`

    // Add nearby characters - FIXED: nearbyCharacters is already a formatted string, not an array
    if (context.nearbyCharacters && context.nearbyCharacters.length > 0) {
      dynamicPrompt += `\n- Nearby Characters: ${context.nearbyCharacters}`
    }

    // Add scenario injection if present
    if (context.injectedScenario) {
      dynamicPrompt += `\n\n🎬 SCENARIO EVENT: ${context.injectedScenario.content}
      
Respond authentically as ${character.name} to this scenario. Show realistic emotional reactions and make decisions that reflect your personality.`
    }

    // Add recent events - FIXED: Handle both array and string formats
    if (context.recentEvents) {
      let eventsText = ''
      if (Array.isArray(context.recentEvents)) {
        // If it's an array, take up to 3 recent events and join them
        eventsText = context.recentEvents.slice(-3).join('; ')
      } else if (typeof context.recentEvents === 'string') {
        // If it's already a string, use it directly
        eventsText = context.recentEvents
      }
      
      if (eventsText.trim()) {
        dynamicPrompt += `\n- Recent Events: ${eventsText}`
      }
    }

    // Add available zones if needed for movement
    if (context.availableZones) {
      dynamicPrompt += `\n- Available Locations: ${context.availableZones}`
    }

    return dynamicPrompt
  }

  async summarizeMemories(memories, characterName, useComplexModel = false) {
    if (!memories || memories.length === 0) return null

    const prompt = `Please create a concise summary of ${characterName}'s key memories and experiences. Focus on the most emotionally significant events and relationships.

Memories to summarize:
${memories.map(m => `- ${m.content} (impact: ${m.emotional_weight || 0}/100)`).join('\n')}

Provide a 2-3 sentence summary that captures the essence of their experiences.`

    try {
      const response = await this.makeApiCall({
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }]
      }, useComplexModel)

      return response.content[0].text.trim()
    } catch (error) {
      console.warn('Memory summarization failed:', error)
      return null
    }
  }

  // Simplified buildPrompt method for backward compatibility
  buildPrompt(context) {
    const character = context.character
    
    let prompt = `You are ${character.name}, a character in a life simulation.

PERSONALITY & TRAITS:
- MBTI: ${character.MBTI}
- Current Emotion: ${character.currentEmotion || 'neutral'}
- Age: ${character.age || 'unknown'}
- Occupation: ${character.occupation || 'unknown'}`

    // Add Big Five personality traits if available
    if (character.bigFive) {
      prompt += `\nBig Five Traits:\n`
      Object.entries(character.bigFive).forEach(([trait, value]) => {
        prompt += `- ${trait}: ${value}/100\n`
      })
    }

    // Add current situation
    prompt += `\nCURRENT SITUATION:
- Location: ${context.currentLocation || 'Unknown'}
- Environment: ${context.environment?.description || 'Normal day'}`

    // Add nearby characters if any
    if (context.nearbyCharacters) {
      prompt += `\n- Nearby characters: ${context.nearbyCharacters}`
    }

    // Add ALL memories (don't truncate!)
    if (character.memories && character.memories.length > 0) {
      prompt += `\n\nMEMORIES:\n${character.memories.map(m => `- ${m.content}`).join('\n')}`
    }

    // Add scenario injection if present
    if (context.injectedScenario) {
      prompt += `\n\n🎬 SCENARIO EVENT: ${context.injectedScenario.content}`
      if (context.injectedScenario.target === 'global') {
        prompt += ` (This affects everyone in the town)`
      }
    }

    // Add desires and goals
    if (character.desires && character.desires.length > 0) {
      prompt += `\n\nYOUR DESIRES & GOALS:\n${character.desires.map(d => `- ${d}`).join('\n')}`
    }

    // Add mental health context
    if (character.mentalHealth && character.mentalHealth.length > 0) {
      prompt += `\n\nMENTAL HEALTH:\n${character.mentalHealth.map(m => `- ${m}`).join('\n')}`
    }

    // Add recent events for context
    if (context.recentEvents) {
      prompt += `\n\nRECENT TOWN EVENTS:\n${context.recentEvents}`
    }

    // Add available zones for movement
    if (context.availableZones) {
      prompt += `\n\nAVAILABLE LOCATIONS: ${context.availableZones}`
    }

    // Main instruction
    prompt += `\n\nRespond as ${character.name} with realistic, human-like behavior. Consider your personality, current situation, and emotional state.

Respond with valid JSON in this exact format:
{
  "internal_thoughts": "What you're thinking about right now (1-2 sentences)",
  "emotion": "Your current emotional state (e.g., content, happy, contemplative, etc.)",
  "action": "One of: stay_idle, move_to_zone, speak, approach_character",
  "dialogue": "What you say (if action is 'speak', otherwise empty string)",
  "action_reasoning": "Brief explanation of why you chose this action"
}`

    return prompt
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Claude API connection with Haiku model...')
      const response = await this.makeApiCall({
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Respond with exactly: "API connection successful"' }]
      }, false)
      
      const responseText = response.content[0].text.trim()
      console.log('✅ Claude API test response:', responseText)
      return responseText.includes('API connection successful')
    } catch (error) {
      console.error('❌ Claude API test failed:', error)
      throw error
    }
  }

  // Reset token usage tracking
  resetTokenUsage() {
    this.sessionTokens = {
      haiku: { input: 0, output: 0, calls: 0 },
      sonnet: { input: 0, output: 0, calls: 0 }
    }
    console.log('🔄 Token usage tracking reset')
  }

  // Zone-related analysis methods that use the more powerful Sonnet model
  async analyzeMapForZones(imageData, originalPrompt, useComplexModel = true) {
    console.log('🗺️ Analyzing map for zone generation with Claude Sonnet...')
    
    const prompt = `You are analyzing a generated town map image to identify distinct zones and areas. 

Original generation prompt: "${originalPrompt}"

Please identify 6-10 distinct, non-overlapping zones in this map. For each zone:
1. Give it a descriptive name that matches the visual style
2. Specify its type (home, shop, public, park, street, etc.)
3. Describe its approximate location using relative terms (north/south/east/west, center, corner, etc.)
4. Estimate its size relative to the whole map (small, medium, large)

Avoid generic names. Be creative and specific to what you see in the image.

Respond with a JSON array like this:
[
  {
    "name": "Cobblestone Market Square", 
    "type": "public",
    "location": "central area",
    "size": "medium",
    "description": "Central square with cobblestone patterns"
  }
]`

    try {
      const response = await this.makeApiCall({
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image', 
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: imageData
              }
            }
          ]
        }]
      }, useComplexModel) // Use complex model for map analysis

      const responseText = response.content[0].text.trim()
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in Claude response')
      }

      return JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('❌ Map analysis failed:', error)
      throw error
    }
  }

  // Method for complex reasoning tasks (use Sonnet)
  async performComplexAnalysis(prompt, useComplexModel = true) {
    console.log('🧠 Performing complex analysis with Claude Sonnet...')
    
    try {
      const response = await this.makeApiCall({
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      }, useComplexModel)

      return response.content[0].text.trim()
    } catch (error) {
      console.error('❌ Complex analysis failed:', error)
      throw error
    }
  }
}

export default new ClaudeApiService()