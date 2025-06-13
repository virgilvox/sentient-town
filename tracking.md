This file will be used to track the refactoring process of moving the AI logic to Netlify Functions.

**Phase 1: Planning and Scaffolding**
- [x] Create `tracking.md` and `note.md`
- [x] Create `netlify/functions` directory
- [x] Create `prompts` directory

**Phase 2: Building the Simulation API**
- [x] Create `netlify/functions/simulation.js`
- [x] Move system prompt to `prompts/simulation_system_prompt.js`
- [x] Refactor `claudeApi.js` logic into the new serverless function
- [x] Install `anthropic` and `openai` SDKs

**Phase 3: Building the Asset Generation API**
- [x] Create `netlify/functions/assets.js`
- [x] Move asset generation prompts to the `prompts` directory
- [x] Refactor `openAiAssets.js` logic into the new serverless function

**Phase 4: Integration and Replacement**
- [x] Update frontend services to call Netlify functions
- [ ] Test local development environment
- [ ] Test deployed environment
- [ ] Cleanup old code (with approval) 