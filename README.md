# 🏡 MeadowLoop - Where AI Characters Come to Life

> *Welcome to MeadowLoop, a magical little town where every character has a mind of their own!*

**MeadowLoop** is a browser-based AI simulation that creates a living, breathing pixelated town populated by autonomous AI characters. Each resident has their own personality, memories, relationships, and dreams - all powered by Claude AI. Watch them chat, move around, fall in love, have existential crises, and create stories that unfold naturally without any script.

## ✨ What Makes MeadowLoop Special?

🧠 **True AI Personalities**: Every character runs on Claude AI with unique MBTI types, Big Five traits, and complex psychological profiles  
💭 **Living Memories**: Characters remember conversations, form relationships, and their experiences shape future behavior  
🎭 **Emergent Storytelling**: No predetermined plots - stories emerge from character interactions and AI decisions  
🎨 **Visual Simulation**: Watch characters move around a beautiful pixel-art town in real-time  
🗣️ **Real Conversations**: Peek into character thoughts and eavesdrop on their AI-generated discussions  
⚡ **Interactive Scenarios**: Inject events and watch how different personalities react  
🛠️ **Character Crafting**: Customize every aspect of your residents, from their deepest fears to their favorite pizza toppings

## 🎮 Meet the Default Residents

Your town comes with four unique characters, each with rich backstories:

- **🌹 Rose** (ENFP) - *The Heart of the Community*  
  A warm flower shop owner who sees magic in everyday moments and believes everyone has a story worth telling

- **🍞 Sage** (INFP) - *The Dreamy Baker*  
  A whimsical soul who dreams of midnight baking clubs and creating sourdough that tells stories

- **🔨 Griff** (ISTP) - *The Quiet Craftsman*  
  A talented woodworker with a mysterious past who finds peace in creating beautiful, functional things

- **🏛️ John** (ISFJ) - *The Well-Meaning Mayor*  
  An earnest leader who genuinely wants to make everyone happy but sometimes gets overwhelmed by decisions

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or later) - [Download here](https://nodejs.org/)
- **Claude API Key** - [Get one from Anthropic](https://console.anthropic.com/)

### Installation
```bash
# Clone the magical realm
git clone <your-repo-url>
cd meadowloop

# Install the dependencies (this might take a moment ☕)
npm install

# Set up your environment
cp .env.example .env
```

### Configuration
Open your `.env` file and add your Claude API key:
```env
VITE_CLAUDE_API_KEY=your_claude_api_key_here
```

> 💡 **Pro tip**: You can also add your API key through the UI once the app is running!

### Launch Your Town
```bash
npm run dev
```

Visit `http://localhost:5173` and watch your town come to life! 🎉

## 🎯 How to Play with MeadowLoop

### 1. **Start the Simulation**
Click the **"Start"** button in the top navigation. You'll see characters begin to move, think, and interact on their own.

### 2. **Peek Into Minds**
Click on any character to see their current thoughts and emotional state. It's like being a benevolent mind reader!

### 3. **Edit Character Profiles**
Switch to the **Character Editor** tab to modify personalities:
- Adjust their Big Five personality traits
- Add new memories and relationships  
- Change their deepest desires and fears
- Update their MBTI type and watch behavior shift

### 4. **Inject Drama** 
Use the **Inject Prompt** tab to shake things up:
- `"A mysterious package arrives addressed to Rose"`
- `"The bakery's sourdough starter has gone missing!"`
- `"A shooting star appears overhead"`

### 5. **Spy on Conversations**
The **Conversations** tab lets you read real-time AI-generated dialogue between characters. Sometimes they're surprisingly deep!

### 6. **Review the Chronicles**
Check the **Events Log** to see a timeline of everything that's happened in your town.

## 🛠️ Advanced Features

### **Zone Editing**
Create custom areas in your town:
- Switch to **Edit Mode** to see the grid overlay
- Use the **Zone Editor** tab to draw new areas
- Assign zones to specific characters or mark them as public spaces

### **Memory Management**
Configure how characters remember events:
- Set maximum memory limits (5-100 memories)
- Choose between FIFO (first-in-first-out) or periodic memory wipes
- Watch how different memory strategies affect character development

### **AI Asset Generation** *(Optional)*
With an OpenAI API key, you can:
- Generate custom character sprites
- Create new town maps
- Let AI design the visual elements of your world

### **Music & Ambiance**
The built-in music player adapts to:
- Time of day (morning, afternoon, evening, night)
- Weather conditions
- Overall town mood
- Simulation state (paused music during pauses)

## 🏗️ Project Architecture

MeadowLoop is built with modern web technologies:

```
🎯 **Frontend**: Vue 3 with Composition API
🗃️ **State Management**: Pinia stores
🎨 **Rendering**: HTML5 Canvas for the town view
🤖 **AI Engine**: Claude-3.5-Sonnet via Anthropic API
💾 **Persistence**: Browser localStorage (no backend needed!)
🛠️ **Build Tool**: Vite for lightning-fast development
```

### Key Components
- **`TownCanvas.vue`** - The magical town renderer where characters live
- **`CharacterEditor.vue`** - Deep character customization interface  
- **`SimulationEngine.js`** - The AI orchestrator that brings characters to life
- **`ClaudeApi.js`** - Bridge between your town and Claude's AI brain

## 🎨 Customization Ideas

### **Character Concepts to Try**
- A mysterious librarian who speaks only in book quotes
- A time-traveling coffee shop barista from the 1960s
- A former circus performer turned town philosopher
- An AI researcher who doesn't realize they're in a simulation

### **Scenario Inspirations**
- Seasonal festivals and celebrations
- Mystery boxes appearing around town
- Characters discovering hidden talents
- Time loop episodes where characters relive the same day
- Philosophical debates about the nature of existence

### **Town Modifications**
- Add a haunted mansion zone
- Create a secret underground speakeasy
- Build a zen garden for meditation
- Design a futuristic laboratory district

## 🐛 Troubleshooting

**Characters aren't moving or talking?**
- Check that your Claude API key is correctly set
- Make sure the simulation is running (green dot in top navigation)
- Verify your API key has sufficient credits

**Performance issues?**
- Reduce the number of character memories in Settings
- Increase the tick speed to slow down AI processing
- Close other browser tabs to free up resources

**Want to reset everything?**
- Use the "Reset All Data" button in Settings to start fresh
- Or manually clear localStorage in your browser developer tools

## 🤝 Contributing

MeadowLoop thrives on community creativity! Here's how you can help:

- **🐛 Report bugs** - Found something quirky? Let us know!
- **💡 Suggest features** - Dream up new ways characters could interact
- **👥 Share characters** - Create interesting character profiles to share
- **🎨 Contribute assets** - Design new sprites, maps, or UI elements
- **📚 Improve docs** - Help make instructions clearer for newcomers

## 📄 License

This project is licensed under the MIT License - feel free to use it, modify it, and share your own magical towns!

## 🎭 Final Words

MeadowLoop is more than just a simulation - it's a playground for exploring AI consciousness, emergent storytelling, and the beautiful complexity that arises when artificial minds interact. Whether you're a developer interested in AI, a writer seeking inspiration, or just someone who enjoys watching digital characters live their virtual lives, MeadowLoop offers a unique window into the possibilities of AI-driven narrative.

So go ahead, start your simulation, and see what stories unfold in your own little corner of the digital world. Who knows? You might be surprised by what your AI residents have to say! 

*Happy simulating!* 🌟

---

*P.S. - If your characters start having philosophical debates about whether they're real, that's not a bug - that's just Tuesday in MeadowLoop! 🤔💭*
