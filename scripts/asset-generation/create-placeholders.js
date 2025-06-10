import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';

// Install canvas package if needed: npm install canvas

function createPlaceholderMap() {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  // Base layer: grass and paths
  ctx.fillStyle = '#a1c882'; // Light green grass
  ctx.fillRect(0, 0, 800, 600);
  
  ctx.fillStyle = '#d4b483'; // Dirt path
  ctx.fillRect(0, 280, 800, 80); // Main horizontal path
  ctx.fillRect(380, 0, 80, 600); // Main vertical path

  // Add some texture to the grass
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 800;
    const y = Math.random() * 600;
    const size = Math.random() * 2;
    ctx.fillStyle = `rgba(146, 196, 125, ${Math.random() * 0.5})`;
    ctx.fillRect(x, y, size, size);
  }

  // Buildings with more detail
  const buildings = [
    { x: 150, y: 150, w: 120, h: 90, color: '#e07a5f', roof: '#c16244', label: "Rose's Florist" },
    { x: 150, y: 400, w: 120, h: 90, color: '#f2cc8f', roof: '#d8a964', label: "Sage's Bakery" },
    { x: 550, y: 150, w: 120, h: 90, color: '#8d6e63', roof: '#6f4e37', label: "Griff's Workshop" },
    { x: 550, y: 400, w: 120, h: 90, color: '#81b29a', roof: '#6a9d80', label: "Town Hall" },
  ];

  buildings.forEach(b => {
    // Building shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(b.x + 5, b.y + 5, b.w, b.h);
    
    // Building base
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Roof
    ctx.fillStyle = b.roof;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x + b.w / 2, b.y - 30);
    ctx.lineTo(b.x + b.w, b.y);
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.fillStyle = '#3d405b';
    ctx.font = 'bold 12px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h + 15);
  });

  // Trees in an "Orchard" area
  for (let i = 0; i < 15; i++) {
    const x = 700 + Math.random() * 80;
    const y = 450 + Math.random() * 120;
    drawTree(ctx, x, y);
  }

  console.log('✅ Generated new placeholder map');
  return canvas.toBuffer('image/png');
}

function drawTree(ctx, x, y) {
  // Trunk
  ctx.fillStyle = '#6f4e37';
  ctx.fillRect(x - 5, y, 10, 20);

  // Leaves
  ctx.fillStyle = '#81b29a';
  ctx.beginPath();
  ctx.arc(x, y - 15, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6a9d80';
  ctx.beginPath();
  ctx.arc(x - 10, y - 10, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 10, y - 10, 15, 0, Math.PI * 2);
  ctx.fill();
}

function createCharacterSprite(name, color) {
  const canvas = createCanvas(64, 64);
  const ctx = canvas.getContext('2d');
  
  // Simple pixel art humanoid shape
  const headX = 24, headY = 12, headSize = 16;
  const bodyX = 20, bodyY = 28, bodyW = 24, bodyH = 24;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(32, 58, 20, 6);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

  // Head
  ctx.fillStyle = '#f2cc8f'; // Skin tone
  ctx.fillRect(headX, headY, headSize, headSize);
  
  // Eyes
  ctx.fillStyle = '#3d405b';
  ctx.fillRect(headX + 4, headY + 6, 2, 2);
  ctx.fillRect(headX + 10, headY + 6, 2, 2);

  return canvas.toBuffer('image/png');
}

async function createAllPlaceholders() {
  console.log('🎨 Creating placeholder assets...\n');

  // Ensure directories exist
  const dirs = [
    'public/map',
    'public/characters/Rose',
    'public/characters/Sage',
    'public/characters/Griff',
    'public/characters/John'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create map
  console.log('🗺️ Creating town map...');
  const mapBuffer = createPlaceholderMap();
  fs.writeFileSync('public/map/map.png', mapBuffer);
  console.log('✅ Saved: public/map/map.png');

  // Create character sprites
  const characters = [
    { name: 'Rose', color: '#FF69B4' },     // Pink for florist
    { name: 'Sage', color: '#DDA0DD' },      // Plum for baker
    { name: 'Griff', color: '#8B4513' },    // Saddle brown for woodworker
    { name: 'John', color: '#4169E1' }      // Royal blue for mayor
  ];

  for (const character of characters) {
    console.log(`👤 Creating ${character.name} sprite...`);
    const spriteBuffer = createCharacterSprite(character.name, character.color);
    fs.writeFileSync(`public/characters/${character.name}/sprite.png`, spriteBuffer);
    console.log(`✅ Saved: public/characters/${character.name}/sprite.png`);
  }

  console.log('\n🎉 Placeholder assets created!');
  console.log('📁 Files saved to:');
  console.log('   - public/map/map.png');
  console.log('   - public/characters/Rose/sprite.png');
  console.log('   - public/characters/Sage/sprite.png');
  console.log('   - public/characters/Griff/sprite.png');
  console.log('   - public/characters/John/sprite.png');
  console.log('\n💡 You can now use the in-app generation features to create AI-powered assets!');
}

createAllPlaceholders().catch(console.error); 