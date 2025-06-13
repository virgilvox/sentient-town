export function extractJsonFromResponse(responseText) {
  try {
    return JSON.parse(responseText);
  } catch (firstError) {
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (markdownError) {
        console.error('❌ Failed to parse JSON from markdown:', markdownError);
        throw markdownError;
      }
    }
    const cleanJsonMatch = responseText.match(/(\{[\s\S]*\})/i);
    if (cleanJsonMatch) {
      try {
        return JSON.parse(cleanJsonMatch[1]);
      } catch (cleanError) {
        console.error('❌ Failed to parse clean JSON:', cleanError);
        throw cleanError;
      }
    }
    console.error('❌ Claude response text:', responseText);
    throw new Error(`Failed to extract valid JSON from Claude response. Original error: ${firstError.message}`);
  }
}

export function buildStaticCharacterContext(character) {
    let coreIdentity = `Core: ${character.MBTI}, ${character.age || 'N/A'}, ${character.occupation || 'N/A'}, ${character.sexuality || 'N/A'}.`;
    
    let traits = '';
    if (character.bigFive) {
      traits = 'Traits: ' + Object.entries(character.bigFive).map(([trait, value]) => 
        `${trait.charAt(0).toUpperCase()}${value}`
      ).join(',');
    }

    let desires = '';
    if (character.desires && character.desires.length > 0) {
      desires = `Desires: ${character.desires.join(', ')}.`;
    }

    let mentalHealth = '';
    if (character.mentalHealth && character.mentalHealth.length > 0) {
      mentalHealth = `MentalHealth: ${character.mentalHealth.join(', ')}.`;
    }

    // Memories and relationships will be handled by the summarization function.
    
    return [coreIdentity, traits, desires, mentalHealth].filter(Boolean).join(' ');
}

export function buildDynamicContext(context, character) {
    let dynamicPrompt = `\nCURRENT SITUATION:\n- Current Emotion: ${character.currentEmotion || 'neutral'}\n- Current Location: ${context.currentLocation || 'Unknown'}\n- Environment: ${context.environment?.description || 'Normal day'}`
    if (context.conversationResponsePriority) {
      dynamicPrompt += `\n${context.conversationResponsePriority}`
    }
    if (context.nearbyCharacters && context.nearbyCharacters.length > 0) {
      dynamicPrompt += `\n- Nearby Characters: ${context.nearbyCharacters}`
    }
    if (context.ongoingConversation) {
      dynamicPrompt += `\n${context.ongoingConversation}`
    }
    if (context.injectedScenario) {
      dynamicPrompt += `\n\n🎬 SCENARIO EVENT: ${context.injectedScenario.content}\n\nRespond authentically as ${character.name} to this scenario. Show realistic emotional reactions and make decisions that reflect your personality.`
    }
    // Add memories if they exist and are not summarized
    if (context.memories && context.memories.length > 0) {
      dynamicPrompt += `\n\nCHARACTER MEMORIES:\n` + context.memories.map(m => `- ${m.content} (Impact: ${m.emotional_weight || 0}/100)`).join('\n');
    }

    if (context.memorySummary) {
      dynamicPrompt += `\n\nRECENT EXPERIENCE SUMMARY:\n${context.memorySummary}\n`
    }
    if (context.recentEvents && context.recentEvents.length > 0) {
      dynamicPrompt += `\n- Recent Events: ${context.recentEvents.join('; ')}`
    }
    if (context.availableZones) {
      dynamicPrompt += `\n- Available Locations: ${context.availableZones}`
    }
    return dynamicPrompt
} 