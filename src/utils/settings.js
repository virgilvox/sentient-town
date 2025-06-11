export function getSettings(stores) {
  if (typeof window !== 'undefined' && window.meadowLoopSettings) {
    return window.meadowLoopSettings
  }
  if (stores?.ui?.settings) {
    return stores.ui.settings
  }
  try {
    const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem('meadowloop-conversation-settings') : null;
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // ignore
  }
  return {
    simulationModel: 'adaptive',
    conversationSettings: {
      frequency: 5,
      contextMode: 'standard',
      enablePromptCaching: true
    }
  }
} 