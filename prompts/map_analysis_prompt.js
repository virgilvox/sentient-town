export const buildMapAnalysisPrompt = (originalPrompt) => {
  return `You are analyzing a generated town map image to identify distinct zones and areas. 

Original generation prompt: "${originalPrompt}"

Please analyze this image and identify 6-10 distinct, non-overlapping zones. Focus on DIFFERENT VISUAL AREAS with unique characteristics. Avoid creating duplicate zones or zones that are too similar.

For each unique zone you identify, provide:
1. A descriptive name for the zone (avoid generic terms like "Area 1")
2. The type of zone (home, shop, public, park, street)
3. SPECIFIC GRID COORDINATES (x,y) for the zone boundaries
4. Visual characteristics that make this zone unique

IMPORTANT GRID SYSTEM:
- Map is 50 tiles wide (X: 0-49) by 37 tiles tall (Y: 0-36)
- Provide rectangular coordinates: startX, startY, width, height
- Ensure zones don't overlap significantly
- Zones should be meaningful sized areas (minimum 6 tiles, maximum 80 tiles)

ZONE TYPES TO IDENTIFY:
- shops: Buildings with distinct architecture, awnings, commercial appearance
- homes: Residential buildings with different roof styles/colors
- public: Town squares, halls, large central buildings
- park: Green spaces, trees, gardens, open areas
- street: Pathways, roads, connecting areas

Respond ONLY in valid JSON format:
{
  "zones": [
    {
      "name": "Descriptive Zone Name",
      "type": "shop|home|public|park|street",
      "coordinates": {
        "startX": 10,
        "startY": 5,
        "width": 8,
        "height": 6
      },
      "visualDescription": "what makes this zone visually distinct"
    }
  ]
}`;
}; 