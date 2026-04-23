/**
 * Secure preload script for First-Run Setup Wizard
 * Exposes only necessary IPC channels for configuration
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('setupAPI', {
  /**
   * Set PIN during setup
   */
  setPin: (pin) => {
    return ipcRenderer.invoke('setup:set-pin', pin);
  },

  /**
   * Save security settings
   */
  saveSecurity: (settings) => {
    return ipcRenderer.invoke('setup:save-security', settings);
  },

  /**
   * Complete first-run setup
   */
  completeSetup: () => {
    return ipcRenderer.invoke('setup:complete');
  }
});
