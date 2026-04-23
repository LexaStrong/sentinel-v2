/**
 * Secure preload script for Login Portal
 * Exposes only necessary IPC channels for authentication
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('portalAPI', {
  /**
   * Authenticate with PIN and optional MFA
   */
  authenticate: (pin, mfaToken) => {
    return ipcRenderer.invoke('portal:authenticate', pin, mfaToken);
  },

  /**
   * Validate password recovery code
   */
  validateRecoveryCode: (code) => {
    return ipcRenderer.invoke('portal:validate-recovery', code);
  },

  /**
   * Signal successful authentication
   */
  authSuccess: () => {
    return ipcRenderer.invoke('portal:auth-success');
  },

  /**
   * Get authentication status
   */
  getStatus: () => {
    return ipcRenderer.invoke('portal:get-status');
  }
});
