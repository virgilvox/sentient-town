const ASSETS_API_ENDPOINT = '/.netlify/functions/assets';

export class OpenAIAssetsService {
  constructor() {
    // No-op, keys are handled server-side now
  }

  async generateCharacterSprite(character, targetSize = 128) {
    const response = await this.callAssetsApi('sprite', { character, targetSize });
    // The serverless function now returns base64 data directly
    return `data:image/webp;base64,${response.base64Data}`;
  }

  async generateTownMapWithZones(prompt, targetDisplaySize = 800) {
    const response = await this.callAssetsApi('map', { prompt, targetDisplaySize });
    // The serverless function returns the map image and zones
    return {
      mapImageUrl: `data:image/webp;base64,${response.mapImageUrl}`,
      zones: response.zones,
    };
  }

  async callAssetsApi(type, payload) {
    try {
      const { useUIStore } = window.stores;
      const ui = useUIStore ? useUIStore() : null;
      const openaiApiKey = ui ? ui.openaiApiKey : null;
      const anthropicApiKey = ui ? ui.claudeApiKey : null;

      const response = await fetch(ASSETS_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload, openaiApiKey, anthropicApiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Assets function error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error calling assets function for type ${type}:`, error);
      throw error;
    }
  }

  // The following methods are now handled by the backend and can be removed.
  /*
  updateApiKey() { ... }
  ensureApiKey() { ... }
  validateApiKey() { ... }
  callGPTImage1API(...) { ... }
  callDallE3API(...) { ... }
  callDallE2API(...) { ... }
  convertImageToBase64(...) { ... }
  resizeAndCompressImage(...) { ... }
  compressImage(...) { ... }
  analyzeMapWithClaude(...) { ... }
  // ... and so on for all the other helper methods
  */
}

export const openAIAssets = new OpenAIAssetsService(); 