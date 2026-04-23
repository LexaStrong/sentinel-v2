/**
 * SENTINEL SECURITY SUITE - Enhanced Windows Main Process
 * Secure boot with login portal, MFA, process control, and advanced antivirus
 * 
 * Boot Sequence:
 * 1. Block all processes except cmd/powershell
 * 2. Show login portal with MFA
 * 3. On first-run: Show setup wizard
 * 4. Validate recovery passcode if needed
 * 5. Release process control after authentication
 */

const { app, BrowserWindow, ipcMain, Menu, dialog, session } = require('electron');
const path = require('path');
const os = require('os');
const isDev = require('electron-is-dev');

// Windows-specific imports
const EnhancedWindowsAntivirusEngine = require('./src/engines/windows-antivirus-engine');
const WindowsLoginPortal = require('./src/services/windows-login-portal');
const FirstRunSetupService = require('./src/services/windows-setup-service');
const WindowsFirewallEngine = require('./src/engines/windows-firewall-engine');
const WindowsUsbControlEngine = require('./src/engines/windows-usb-control-engine');
const WindowsIdsIpsEngine = require('./src/engines/windows-idsips-engine');
const NetworkScannerEngine = require('./src/engines/network-scanner-engine');
const WebAppScannerEngine = require('./src/engines/webapp-scanner-engine');
const WindowsAuthenticationService = require('./src/services/windows-authentication-service');
const ConfigurationManager = require('./src/services/configuration-manager');
const WindowsForensicsLogger = require('./src/services/windows-forensics-logger');

// Global references
let mainWindow;
let loginPortalWindow;
let setupWindow;
let engines = {};
let services = {};
let isAuthenticated = false;
let bootPhase = 'security-init'; // security-init → login → main

console.log('[WINDOWS-MAIN] Sentinel Security Suite v2.0 - Windows Enhanced Edition');
console.log('[WINDOWS-MAIN] Boot phase: Security initialization');

/**
 * Create enhanced secure main window
 */
function createMainWindow() {
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
    icon: path.join(__dirname, 'assets', 'sentinel-icon.png'),
    show: false // Don't show until authenticated
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

  return mainWindow;
}

/**
 * Initialize security stack with enhanced components
 */
async function initializeSecurityStack() {
  try {
    console.log('[WINDOWS-MAIN] Initializing enhanced security stack...');

    // Initialize services
    services.config = new ConfigurationManager();
    services.forensics = new WindowsForensicsLogger(services.config);
    services.auth = new WindowsAuthenticationService(services.config);

    await services.config.initialize();
    await services.forensics.initialize();
    await services.auth.initialize();

    console.log('[WINDOWS-MAIN] ✓ Core services initialized');

    // Initialize enhanced antivirus
    engines.antivirus = new EnhancedWindowsAntivirusEngine(services.config, services.forensics);
    await engines.antivirus.initialize();

    console.log('[WINDOWS-MAIN] ✓ Enhanced antivirus initialized');

    // Initialize firewall and other engines
    engines.firewall = new WindowsFirewallEngine(services.config, services.forensics);
    engines.usb = new WindowsUsbControlEngine(services.config, services.forensics);
    engines.idsips = new WindowsIdsIpsEngine(services.config, services.forensics, engines.firewall);
    engines.netscan = new NetworkScannerEngine(services.config, services.forensics);
    engines.webscan = new WebAppScannerEngine(services.config, services.forensics);

    await engines.firewall.initialize();
    await engines.usb.initialize();
    await engines.idsips.initialize();
    await engines.netscan.initialize();
    await engines.webscan.initialize();

    console.log('[WINDOWS-MAIN] ✓ All security engines initialized');

    // Initialize login portal
    services.loginPortal = new WindowsLoginPortal(services.config, services.auth, services.forensics);

    // Initialize setup service
    services.setup = new FirstRunSetupService(services.config, services.auth, services.forensics);

    console.log('[WINDOWS-MAIN] ✓ Authentication and setup services initialized');

    return true;
  } catch (err) {
    console.error(`[WINDOWS-MAIN-ERROR] Security stack initialization failed: ${err.message}`);
    services.forensics?.log('system:init-failed', { error: err.message });
    return false;
  }
}

/**
 * Show login portal for authentication
 */
async function showLoginPortal() {
  try {
    console.log('[WINDOWS-MAIN] Showing login portal...');
    bootPhase = 'login';

    const portalResult = await services.loginPortal.initialize();

    if (portalResult.firstRun) {
      console.log('[WINDOWS-MAIN] First-run detected - showing setup wizard');
      setupWindow = services.setup.createSetupWindow();

      setupWindow.on('closed', async () => {
        // After setup, show login portal
        setupWindow = null;
        showLoginPortal();
      });

      return;
    }

    // Create and show login portal window
    loginPortalWindow = services.loginPortal.createLoginWindow();

    // Wait for authentication
    await new Promise((resolve) => {
      const checkAuth = setInterval(() => {
        if (services.loginPortal.isAuthenticated) {
          clearInterval(checkAuth);
          isAuthenticated = true;
          console.log('[WINDOWS-MAIN] ✓ Authentication successful');
          resolve();
        }
      }, 100);
    });

    // Close login portal
    if (loginPortalWindow) {
      loginPortalWindow.close();
      loginPortalWindow = null;
    }

    // Proceed to main application
    proceedToMainApplication();
  } catch (err) {
    console.error(`[WINDOWS-MAIN-ERROR] Login portal error: ${err.message}`);
    dialog.showErrorBox('Authentication Error', 'Failed to authenticate. Application will exit.');
    app.quit();
  }
}

/**
 * Proceed to main application after authentication
 */
async function proceedToMainApplication() {
  try {
    console.log('[WINDOWS-MAIN] Proceeding to main application...');
    bootPhase = 'main';

    // Release process control
    await services.loginPortal.releaseProcessControl();

    // Show main window
    if (!mainWindow) {
      createMainWindow();
    }

    mainWindow.show();

    // Send authentication success event
    mainWindow.webContents.send('security:authenticated', {
      user: services.auth.currentUser,
      role: services.auth.userRole,
      timestamp: new Date().toISOString()
    });

    services.forensics?.log('system:boot-complete', {
      bootPhase: 'main',
      timestamp: new Date().toISOString()
    });

    console.log('[WINDOWS-MAIN] ✓ Main application ready');
  } catch (err) {
    console.error(`[WINDOWS-MAIN-ERROR] Error proceeding to main app: ${err.message}`);
  }
}

/**
 * IPC HANDLERS - Portal & Authentication
 */

ipcMain.handle('portal:authenticate', async (event, pin, mfaToken) => {
  try {
    const result = await services.loginPortal.handleLoginAuthentication(pin, mfaToken);
    return result;
  } catch (err) {
    console.error(`[IPC-ERROR] Authentication error: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('portal:validate-recovery', async (event, passcode) => {
  try {
    const result = await services.loginPortal.handlePasswordRecovery(passcode);
    return result;
  } catch (err) {
    console.error(`[IPC-ERROR] Recovery validation error: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('portal:auth-success', async () => {
  try {
    services.loginPortal.closeLoginPortal();
    proceedToMainApplication();
    return { success: true };
  } catch (err) {
    console.error(`[IPC-ERROR] Auth success error: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('portal:get-status', () => {
  return services.loginPortal.getStatus();
});

/**
 * IPC HANDLERS - Setup
 */

ipcMain.handle('setup:set-pin', async (event, pin) => {
  try {
    services.setup.savePIN(pin);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('setup:save-security', async (event, settings) => {
  try {
    services.setup.saveSecuritySettings(settings);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('setup:complete', async () => {
  try {
    services.setup.completeSetup();
    if (setupWindow) {
      setupWindow.close();
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/**
 * IPC HANDLERS - Enhanced Antivirus
 */

ipcMain.handle('antivirus:scan-file', async (event, filePath) => {
  return await engines.antivirus.scanFile(filePath);
});

ipcMain.handle('antivirus:scan-memory', async () => {
  return await engines.antivirus.scanMemory();
});

ipcMain.handle('antivirus:scan-rootkit', async () => {
  return await engines.antivirus.scanForRootkits();
});

ipcMain.handle('antivirus:scan-ransomware', async () => {
  return await engines.antivirus.scanForRansomware();
});

ipcMain.handle('antivirus:check-reputation', async (event, filePath) => {
  return await engines.antivirus.checkFileReputation(filePath);
});

ipcMain.handle('antivirus:quarantine-file', async (event, filePath, reason) => {
  return await engines.antivirus.quarantineFile(filePath, reason);
});

ipcMain.handle('antivirus:get-statistics', async () => {
  return await engines.antivirus.getStatistics();
});

ipcMain.handle('antivirus:update-signatures', async () => {
  return await engines.antivirus.updateThreatSignatures();
});

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

/**
 * IPC HANDLERS - USB Control
 */

ipcMain.handle('usb:get-devices', () => {
  return engines.usb.getAllDevices();
});

ipcMain.handle('usb:allow-device', async (event, deviceId) => {
  return await engines.usb.allowDevice(deviceId);
});

ipcMain.handle('usb:block-device', async (event, deviceId) => {
  return await engines.usb.blockDevice(deviceId);
});

ipcMain.handle('usb:get-statistics', () => {
  return engines.usb.getUsbStatistics();
});

/**
 * IPC HANDLERS - IDS/IPS
 */

ipcMain.handle('idsips:get-events', (event, limit) => {
  return engines.idsips.getRecentEvents(limit);
});

ipcMain.handle('idsips:get-active-threats', () => {
  return engines.idsips.getActiveThreats();
});

ipcMain.handle('idsips:get-statistics', () => {
  return engines.idsips.getStatistics();
});

/**
 * IPC HANDLERS - Logging
 */

ipcMain.handle('logs:get-entries', (event, options) => {
  return services.forensics.getEntries(options);
});

ipcMain.handle('logs:get-statistics', () => {
  return services.forensics.getStatistics();
});

/**
 * IPC HANDLERS - Dashboard
 */

ipcMain.handle('dashboard:get-overview', async () => {
  return {
    platform: 'windows',
    authenticated: isAuthenticated,
    bootPhase,
    antivirus: await engines.antivirus.getStatistics(),
    firewall: await engines.firewall.getFirewallStatistics(),
    usb: engines.usb.getUsbStatistics(),
    idsips: engines.idsips.getStatistics(),
    user: services.auth.getCurrentUserInfo(),
    timestamp: new Date().toISOString()
  };
});

/**
 * App event handlers
 */

app.on('ready', async () => {
  console.log('[WINDOWS-MAIN] Application starting...');

  // Initialize security stack
  const stackReady = await initializeSecurityStack();

  if (!stackReady) {
    dialog.showErrorBox(
      'Security Initialization Failed',
      'Failed to initialize security engines. Application will exit.'
    );
    app.quit();
    return;
  }

  // Show login portal
  showLoginPortal();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Cleanup on exit
 */

process.on('exit', async () => {
  console.log('[WINDOWS-MAIN] Shutting down...');

  try {
    await engines.firewall?.shutdown();
    await engines.usb?.shutdown();
    await engines.idsips?.shutdown();
    await engines.antivirus?.shutdown?.();

    console.log('[WINDOWS-MAIN] ✓ Shutdown complete');
  } catch (err) {
    console.error(`[WINDOWS-MAIN-ERROR] Shutdown error: ${err.message}`);
  }
});

console.log('[WINDOWS-MAIN] Enhanced Windows main process initialized');
