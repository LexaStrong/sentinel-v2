/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SENTINEL SECURITY SUITE | ELECTRON PRELOAD SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Secure bridge between renderer (React UI) and main process
 * - Exposes only necessary IPC channels
 * - No direct Node.js API access
 * - Context isolation enabled
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { contextBridge, ipcRenderer } = require('electron');

// Whitelist of allowed IPC channels
const allowedChannels = {
  // Firewall
  'firewall:get-rules': true,
  'firewall:add-rule': true,
  'firewall:delete-rule': true,
  'firewall:toggle-rule': true,
  'firewall:get-statistics': true,

  // USB Control
  'usb:get-devices': true,
  'usb:authenticate-device': true,
  'usb:block-device': true,
  'usb:trust-device': true,
  'usb:set-global-policy': true,

  // IDS/IPS
  'idsips:get-events': true,
  'idsips:get-threats': true,
  'idsips:get-statistics': true,

  // Network Scanner
  'netscan:start-scan': true,
  'netscan:get-results': true,

  // Web/App Scanner
  'webscan:scan-target': true,
  'webscan:get-results': true,

  // Logging
  'logs:get-entries': true,
  'logs:export': true,

  // Authentication
  'auth:validate-pin': true,
  'auth:validate-mfa': true,
  'auth:get-user-role': true,

  // Dashboard
  'dashboard:get-status': true,
};

// Expose secure IPC interface
contextBridge.exposeInMainWorld('sentinelAPI', {
  // Invoke (request-response)
  invoke: (channel, ...args) => {
    if (!allowedChannels[channel]) {
      throw new Error(`❌ IPC channel not allowed: ${channel}`);
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  // Send (one-way, no response)
  send: (channel, ...args) => {
    if (!allowedChannels[channel]) {
      throw new Error(`❌ IPC channel not allowed: ${channel}`);
    }
    return ipcRenderer.send(channel, ...args);
  },

  // On (listen for main process messages)
  on: (channel, callback) => {
    // Only allow listening on specific event channels
    const eventChannels = [
      'firewall:rule-added',
      'firewall:rule-deleted',
      'usb:device-allowed',
      'usb:device-blocked',
      'usb:device-trusted',
      'usb:policy-changed',
      'netscan:scan-started',
      'webscan:scan-started',
    ];

    if (!eventChannels.includes(channel)) {
      throw new Error(`❌ Event channel not allowed: ${channel}`);
    }

    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  // Once (listen one time)
  once: (channel, callback) => {
    const eventChannels = [
      'firewall:rule-added',
      'firewall:rule-deleted',
      'usb:device-allowed',
      'usb:device-blocked',
      'usb:device-trusted',
      'usb:policy-changed',
    ];

    if (!eventChannels.includes(channel)) {
      throw new Error(`❌ Event channel not allowed: ${channel}`);
    }

    ipcRenderer.once(channel, (event, ...args) => {
      callback(...args);
    });
  },
});

console.log('✓ Electron preload script loaded with sandboxed IPC');
