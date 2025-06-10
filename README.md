# Sentient Town - AI Character Simulation

Sentient Town is a single-page, browser-based AI simulation where each character in a pixel-art town is driven by a persistent, personality-rich AI. The app is powered by **Claude-3.5-Sonnet**, and every character has a complete internal life, history, psychology, and emotional context stored in individual JSON profiles.

Users can observe, interact with, and shape the unfolding narrative through live conversation monitoring, internal thought inspection, real-time scenario injection, and character editing.

## 🎮 Features

- **Dynamic AI Characters**: Each character is powered by a large language model, giving them unique personalities, memories, and relationships that evolve over time.
- **Real-time Simulation**: Characters think, move, and interact with each other and their environment autonomously.
- **Interactive Canvas**: A zoomable, pannable 2D canvas visualizes the town, with character sprites moving and interacting.
- **Character Editor**: Modify every aspect of a character, from their core personality traits (MBTI, Big Five) to their memories, desires, and relationships.
- **Scenario Injection**: Globally or individually inject events and scenarios to influence character behavior and observe their reactions.
- **Conversation & Thought Monitoring**: Peek into the inner lives of characters by reading their real-time thoughts and conversations.
- **Responsive UI**: The layout is designed to work on a variety of screen sizes, from desktop to mobile.
- **Browser-Based**: No backend required. All state is managed in the browser and saved to `localStorage`.

## 🚀 Quick Start

Follow these steps to get the Sentient Town simulation running on your local machine.

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### 2. Installation
Clone the repository and install the dependencies.
```sh
git clone <repository-url>
cd sentient-town
npm install
```

### 3. Environment Variables
You need an API key from Anthropic to power the character AI.

1.  Create a new file named `.env` in the root of the `sentient-town` directory.
2.  Open the `.env` file and add your API key, like so:

```env
VITE_ANTHROPIC_API_KEY=your_claude_api_key_here
```

Your key will be loaded automatically when you start the development server.

### 4. Run the Development Server
```sh
npm run dev
```

### 5. Open Your Browser
Navigate to the local URL provided in your terminal (usually `http://localhost:5173`).

## 🎨 Asset Generation

The project includes pre-built placeholder assets (map and character sprites) that work out of the box.

### Regenerating Placeholder Assets
If the placeholder assets are missing or you want to restore them, you can regenerate them using the included script.
```sh
node scripts/asset-generation/create-placeholders.js
```
This will create a new `map.png` and regenerate the simple pixel-art sprites for the four main characters.

*Note: AI-powered asset generation using DALL-E was a feature in a previous version and has been removed in favor of focusing on the core simulation.*

## 🏘️ Characters

The simulation comes with four pre-defined characters, each with a rich backstory and personality.

-   **Rose** (ENFP): A warm, motherly flower shop owner who believes in the magic of community and always sees the best in everyone.
-   **Sage** (INFP): A whimsical and creative baker who dreams of starting a midnight baking club and creating sourdough that tells stories.
-   **Griff** (ISTP): A quiet, talented woodworker with a haunted past who finds solace in creating beautiful, functional things.
-   **John** (ISFJ): The town's earnest and slightly overwhelmed mayor who genuinely wants to make everyone happy but struggles with decision-making.

## 🎯 Usage

1. **Add API Keys**: Enter your Claude API key in the top navigation
2. **Start Simulation**: Click "Start" to begin AI character behaviors
3. **Interact**: Click characters on the map to view their thoughts
4. **Edit Characters**: Use the Character Editor tab to modify personalities
5. **Inject Scenarios**: Add events in the Scenarios tab to influence the story
6. **Generate Assets**: Create custom sprites and maps with AI generation

## 🛠️ Development

This section provides an overview of the project structure and scripts for developers.

### Project Structure
The project is built with Vue 3 and Pinia, using JavaScript.

```
sentient-town/
├── public/                # Static assets
│   ├── characters/        # Character JSON profiles and sprites
│   └── map/               # Map image and zones.json
├── scripts/
│   └── asset-generation/  # Scripts for asset creation
├── src/
│   ├── components/        # Vue components (UI elements)
│   │   └── tabs/          # Components for the control panel tabs
│   ├── services/          # Core logic and API services
│   │   ├── claudeApi.js   # Service for Anthropic Claude API
│   │   └── simulationEngine.js # The main simulation loop logic
│   ├── stores/            # Pinia stores for state management
│   │   ├── characters.js
│   │   ├── simulation.js
│   │   ├── ui.js
│   │   └── zones.js
│   ├── App.vue            # Main application component
│   └── main.js            # Application entry point
├── .env.example           # Example environment file
├── package.json           # Project dependencies and scripts
└── vite.config.js         # Vite configuration (including proxy)
```

### Key Technologies
-   **Framework**: [Vue 3](https://vuejs.org/) (Composition API)
-   **State Management**: [Pinia](https://pinia.vuejs.org/)
-   **Language**: JavaScript
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Character AI**: [Anthropic Claude API](https://www.anthropic.com/claude)
-   **Rendering**: HTML5 Canvas API for the 2D town view

### Available Scripts

-   **`npm run dev`**: Starts the development server with hot-reloading.
-   **`npm run preview`**: Builds the project and serves it locally to preview the production build.
-   **`npm run build-only`**: Compiles and minifies the project for production.
-   **`npm run lint`**: Lints the codebase to find and fix problems.
-   **`npm run format`**: Formats the code using Prettier.

## 📝 License

This project is licensed under the MIT License.
