#!/usr/bin/env node

import { createCanvas } from 'canvas'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createSimpleMap() {
  console.log('🎨 Creating simple placeholder map...')
  
  const width = 800
  const height = 600
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // Background - grass color
  ctx.fillStyle = '#7cb342'
  ctx.fillRect(0, 0, width, height)

  // Draw zones with different colors
  const zones = [
    // Flower shop (NW)
    { x: 50, y: 50, w: 120, h: 100, color: '#e91e63', label: 'Florist' },
    // Bakery (SW)  
    { x: 50, y: 450, w: 120, h: 100, color: '#ff9800', label: 'Bakery' },
    // Workshop (NE)
    { x: 630, y: 50, w: 120, h: 100, color: '#795548', label: 'Workshop' },
    // Town hall (center)
    { x: 340, y: 250, w: 120, h: 100, color: '#2196f3', label: 'Town Hall' },
    // Orchard (SE)
    { x: 630, y: 450, w: 120, h: 100, color: '#4caf50', label: 'Orchard' }
  ]

  // Draw main street (horizontal)
  ctx.fillStyle = '#9e9e9e'
  ctx.fillRect(0, 290, width, 20)

  // Draw zones
  zones.forEach(zone => {
    // Zone building
    ctx.fillStyle = zone.color
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h)
    
    // Zone border
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 2
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h)
    
    // Zone label
    ctx.fillStyle = '#ffffff'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(zone.label, zone.x + zone.w/2, zone.y + zone.h/2 + 6)
  })

  // Draw paths connecting zones to main street
  ctx.fillStyle = '#bcaaa4'
  // Flower shop path
  ctx.fillRect(110, 150, 10, 140)
  // Bakery path  
  ctx.fillRect(110, 310, 10, 140)
  // Workshop path
  ctx.fillRect(690, 150, 10, 140)
  // Orchard path
  ctx.fillRect(690, 310, 10, 140)

  // Add some decorative elements
  // Trees around the map
  ctx.fillStyle = '#2e7d32'
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    // Don't place trees on buildings or roads
    const onBuilding = zones.some(zone => 
      x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h
    )
    const onRoad = (y >= 285 && y <= 315)
    
    if (!onBuilding && !onRoad) {
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Save the image
  const mapPath = path.join(__dirname, 'public', 'map', 'map.png')
  const mapDir = path.dirname(mapPath)
  
  if (!fs.existsSync(mapDir)) {
    fs.mkdirSync(mapDir, { recursive: true })
  }

  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(mapPath, buffer)

  console.log('✅ Simple map created at:', mapPath)
}

createSimpleMap() 