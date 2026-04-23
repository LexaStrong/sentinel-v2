/**
 * SENTINEL SECURITY SUITE - Cross-Platform Main Process
 * Electron main process with Windows/Kali detection and platform-specific engine loading
 * 
 * This replaces the Linux-only electron-main.js with dynamic platform detection
 * All security engines are swapped based on OS platform
 */

const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const os = require('os');
const isDev = require('electron-is-dev');

// Platform detection
const PLATFORM = os.platform();
const IS_WINDOWS = PLATFORM === 'win32';
const IS_LINUX = PLATFORM === 'linux';

console.log(`[MAIN] Sentinel Security Suite v2.0 - ${PLATFORM.toUpperCase()}`);

// Load platform-specific engines and services
let FirewallEngine, UsbControlEngine, IdsIpsEngine, NetworkScannerEngine, WebAppScannerEngine;
let AuthenticationService, ConfigurationManager, ForensicsLogger;

if (IS_WINDOWS) {
  console.log('[MAIN] Loading Windows engines and services...');
  FirewallEngine = require('./src/engines/windows-firewall-engine');
  UsbControlEngine = require('./src/engines/windows-usb-control-engine');
  IdsIpsEngine = require('./src/engines/windows-idsips-engine');
  NetworkScannerEngine = require('./src/engines/network-scanner-engine'); // Cross-platform
  WebAppScannerEngine = require('./src/engines/webapp-scanner-engine'); // Cross-platform
  AuthenticationService = require('./src/services/windows-authentication-service');
  ConfigurationManager = require('./src/services/configuration-manager'); // Cross-platform
  ForensicsLogger = require('./src/services/windows-forensics-logger');
} else if (IS_LINUX) {
  console.log('[MAIN] Loading Linux/Kali engines and services...');
  FirewallEngine = require('./src/engines/firewall-engine');
  UsbControlEngine = require('./src/engines/usb-control-engine');
  IdsIpsEngine = require('./src/engines/ids-ips-engine');
  NetworkScannerEngine = require('./src/engines/network-scanner-engine');
  WebAppScannerEngine = require('./src/engines/webapp-scanner-engine');
  AuthenticationService = require('./src/services/authentication-service');
  ConfigurationManager = require('./src/services/configuration-manager');
  ForensicsLogger = require('./src/services/forensics-logger');
} else {
  console.error(`[MAIN-ERROR] Unsupported platform: ${PLATFORM}`);
  process.exit(1);
}

// Global references
let mainWindow;
let engines = {};
let services = {};

/**
 * Create main Electron window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      sandbox: true
    },
    icon: path.join(__dirname, 'assets', 'sentinel-icon.png')
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });
}

/**
 * Initialize security engines and services
 */
async function initializeSecurityStack() {
  try {
    console.log('[MAIN] Initializing security stack...');

    // Initialize services first (dependency for engines)
    services.config = new ConfigurationManager();
    services.forensics = new ForensicsLogger(services.config);
    services.auth = new AuthenticationService(services.config);

    await services.config.initialize();
    await services.forensics.initialize();
    await services.auth.initialize();

    console.log('[MAIN] ✓ Services initialized');

    // Initialize engines
    engines.firewall = new FirewallEngine(services.config, services.forensics);
    engines.usb = new UsbControlEngine(services.config, services.forensics);
    engines.idsips = new IdsIpsEngine(services.config, services.forensics, engines.firewall);
    engines.netscan = new NetworkScannerEngine(services.config, services.forensics);
    engines.webscan = new WebAppScannerEngine(services.config, services.forensics);

    await engines.firewall.initialize();
    await engines.usb.initialize();
    await engines.idsips.initialize();
    await engines.netscan.initialize();
    await engines.webscan.initialize();

    console.log('[MAIN] ✓ All engines initialized');

    // Send initialization complete to renderer
    if (mainWindow) {
      mainWindow.webContents.send('security-stack:initialized', {
        platform: PLATFORM,
        engines: Object.keys(engines),
        services: Object.keys(services)
      });
    }

    return true;
  } catch (err) {
    console.error(`[MAIN-ERROR] Security stack initialization failed: ${err.message}`);
    services.forensics?.log('system:init-failed', { error: err.message });
    return false;
  }
}

/**
 * IPC HANDLERS - Firewall
 */
ipcMain.handle('firewall:initialize', async () => {
  return await engines.firewall.initialize();
});

ipcMain.handle('firewall:get-rules', () => {
  return engines.firewall.getRules();
});

ipcMain.handle('firewall:add-rule', async (event, ruleData) => {
  return await engines.firewall.addRule(ruleData);
});

ipcMain.handle('firewall:toggle-rule', async (event, ruleId) => {
  return await engines.firewall.toggleRule(ruleId);
});

ipcMain.handle('firewall:delete-rule', async (event, ruleId) => {
  return await engines.firewall.deleteRule(ruleId);
});

ipcMain.handle('firewall:get-statistics', async () => {
  return await engines.firewall.getFirewallStatistics();
});

ipcMain.handle('firewall:reset', async () => {
  return await engines.firewall.resetFirewall();
});

/**
 * IPC HANDLERS - USB Control
 */
ipcMain.handle('usb:initialize', async () => {
  return await engines.usb.initialize();
});

ipcMain.handle('usb:get-devices', () => {
  return engines.usb.getAllDevices();
});

ipcMain.handle('usb:get-device-status', (event, deviceId) => {
  return engines.usb.getDeviceStatus(deviceId);
});

ipcMain.handle('usb:allow-device', async (event, deviceId) => {
  return await engines.usb.allowDevice(deviceId);
});

ipcMain.handle('usb:block-device', async (event, deviceId) => {
  return await engines.usb.blockDevice(deviceId);
});

ipcMain.handle('usb:untrust-device', (event, deviceId) => {
  return engines.usb.untrustedDevice(deviceId);
});

ipcMain.handle('usb:set-policy', async (event, policy) => {
  return await engines.usb.setGlobalPolicy(policy);
});

ipcMain.handle('usb:scan-devices', async () => {
  return await engines.usb.scanConnectedDevices();
});

ipcMain.handle('usb:get-statistics', () => {
  return engines.usb.getUsbStatistics();
});

/**
 * IPC HANDLERS - IDS/IPS
 */
ipcMain.handle('idsips:initialize', async () => {
  return await engines.idsips.initialize();
});

ipcMain.handle('idsips:get-events', (event, limit) => {
  return engines.idsips.getRecentEvents(limit);
});

ipcMain.handle('idsips:get-active-threats', () => {
  return engines.idsips.getActiveThreats();
});

ipcMain.handle('idsips:scan-file', async (event, filePath) => {
  return await engines.idsips.scanFile(filePath);
});

ipcMain.handle('idsips:update-signatures', async () => {
  return await engines.idsips.updateThreatSignatures();
});

ipcMain.handle('idsips:get-statistics', () => {
  return engines.idsips.getStatistics();
});

/**
 * IPC HANDLERS - Network Scanner
 */
ipcMain.handle('netscan:start-scan', async (event, targets) => {
  return await engines.netscan.startScan(targets);
});

ipcMain.handle('netscan:get-results', async (event, scanId) => {
  return await engines.netscan.getScanResults(scanId);
});

ipcMain.handle('netscan:cancel-scan', async (event, scanId) => {
  return await engines.netscan.cancelScan(scanId);
});

ipcMain.handle('netscan:get-network-health', async () => {
  return await engines.netscan.getNetworkHealth();
});

/**
 * IPC HANDLERS - Web/App Scanner
 */
ipcMain.handle('webscan:start-scan', async (event, url) => {
  return await engines.webscan.startScan(url);
});

ipcMain.handle('webscan:get-results', async (event, scanId) => {
  return await engines.webscan.getScanResults(scanId);
});

/**
 * IPC HANDLERS - Authentication
 */
ipcMain.handle('auth:authenticate', async (event, pin, mfaToken) => {
  return await services.auth.authenticate(pin, mfaToken);
});

ipcMain.handle('auth:validate-session', (event, sessionId) => {
  return services.auth.validateSession(sessionId);
});

ipcMain.handle('auth:get-user-info', () => {
  return services.auth.getCurrentUserInfo();
});

ipcMain.handle('auth:enable-mfa', () => {
  return services.auth.enableMFA();
});

ipcMain.handle('auth:disable-mfa', () => {
  return services.auth.disableMFA();
});

ipcMain.handle('auth:change-pin', async (event, oldPin, newPin) => {
  return services.auth.changePIN(oldPin, newPin);
});

ipcMain.handle('auth:logout', (event, sessionId) => {
  return services.auth.logout(sessionId);
});

/**
 * IPC HANDLERS - Configuration
 */
ipcMain.handle('config:get', (event, key) => {
  return services.config.getConfig(key);
});

ipcMain.handle('config:set', (event, key, value) => {
  return services.config.setConfig(key, value);
});

ipcMain.handle('config:export', async () => {
  return await services.config.exportConfig();
});

ipcMain.handle('config:import', async (event, configData) => {
  return await services.config.importConfig(configData);
});

ipcMain.handle('config:get-all', () => {
  return services.config.getAllConfig();
});

/**
 * IPC HANDLERS - Forensics & Logging
 */
ipcMain.handle('logs:get-entries', (event, options) => {
  return services.forensics.getEntries(options);
});

ipcMain.handle('logs:get-statistics', () => {
  return services.forensics.getStatistics();
});

ipcMain.handle('logs:export', async (event, format, filename) => {
  return await services.forensics.exportLogs(format, filename);
});

ipcMain.handle('logs:search', async (event, filter) => {
  return await services.forensics.searchEventLog(filter);
});

/**
 * IPC HANDLERS - Dashboard
 */
ipcMain.handle('dashboard:get-overview', async () => {
  return {
    platform: PLATFORM,
    firewall: {
      stats: await engines.firewall.getFirewallStatistics(),
      rules: engines.firewall.getRules()
    },
    usb: {
      stats: engines.usb.getUsbStatistics(),
      devices: engines.usb.getAllDevices()
    },
    idsips: {
      stats: engines.idsips.getStatistics(),
      recentThreats: engines.idsips.getRecentEvents(10)
    },
    user: services.auth.getCurrentUserInfo(),
    logs: services.forensics.getStatistics()
  };
});

/**
 * IPC HANDLERS - System
 */
ipcMain.handle('system:get-info', () => {
  return {
    platform: PLATFORM,
    arch: os.arch(),
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    uptime: os.uptime(),
    hostname: os.hostname(),
    version: app.getVersion()
  };
});

ipcMain.handle('system:shutdown', async () => {
  // Cleanup
  await engines.firewall.shutdown();
  await engines.usb.shutdown();
  await engines.idsips.shutdown();
  
  app.quit();
  return { success: true };
});

/**
 * App event handlers
 */
app.on('ready', async () => {
  createWindow();
  
  // Initialize security stack
  const stackReady = await initializeSecurityStack();
  
  if (!stackReady) {
    dialog.showErrorBox(
      'Security Stack Error',
      'Failed to initialize security engines. The application will now exit.'
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Cleanup on exit
 */
process.on('exit', async () => {
  console.log('[MAIN] Shutting down...');
  await engines.firewall?.shutdown();
  await engines.usb?.shutdown();
  await engines.idsips?.shutdown();
  console.log('[MAIN] Sentinel shutdown complete');
});

console.log('[MAIN] Electron app initialized');
