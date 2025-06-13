This file will be used for jotting down notes, reminders, and important details during the refactoring process.

**Initial Notes:**
- The primary goal is to move all direct API calls to Netlify Functions.
- This will protect API keys by moving them to secure environment variables on Netlify.
- We need to ensure the local development environment can correctly proxy requests to these functions.
- The official `anthropic` and `openai` SDKs should be used in the serverless functions for better reliability and security.
- System prompts need to be externalized into a `prompts` directory for easier management.
- The frontend services (`claudeApi.js`, `openAiAssets.js`) will be refactored into clients for the new Netlify functions.
- We must be careful to handle all interdependencies between the frontend and the new backend functions.
- Final cleanup of old code should only happen after thorough testing and confirmation. 