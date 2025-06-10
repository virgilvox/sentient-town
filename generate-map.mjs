import { openAIAssets } from './src/services/openAiAssets.ts';

console.log('🗺️  Generating new town map with DALL-E...');

openAIAssets.generateTownMap()
  .then(url => {
    console.log('✅ Map generated successfully!');
    console.log('🔗 URL:', url);
    console.log('\n📋 Please save this image to public/map/map.png');
  })
  .catch(error => {
    console.error('❌ Failed to generate map:', error);
  }); 