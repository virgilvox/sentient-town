export const buildSpritePrompt = (character) => {
  const characterDescription = character.description || `${character.MBTI} personality character`;
  
  return `Full body front facing pixel art of ${character.name}, a ${characterDescription}. Centered, for use in a pixel art HTML5 game, transparent background.`;
}; 